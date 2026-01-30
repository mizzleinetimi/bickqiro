import SwiftUI
import WebKit

/// WebView that loads bickqr.com for browsing and favoriting bicks
struct BrowseView: View {
    @State private var isLoading = true
    @State private var favoritesCount = 0
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationView {
            ZStack {
                BickqrWebView(
                    isLoading: $isLoading,
                    onFavoritesChanged: { count in
                        favoritesCount = count
                    }
                )
                
                if isLoading {
                    ProgressView()
                        .scaleEffect(1.5)
                        .progressViewStyle(CircularProgressViewStyle(tint: Color(red: 0.98, green: 0.83, blue: 0.30)))
                }
            }
            .navigationTitle("Browse Bicks")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }
                
                ToolbarItem(placement: .navigationBarTrailing) {
                    HStack(spacing: 4) {
                        Image(systemName: "heart.fill")
                            .foregroundColor(Color(red: 0.98, green: 0.83, blue: 0.30))
                        Text("\(favoritesCount)")
                            .fontWeight(.medium)
                    }
                }
            }
        }
        .onAppear {
            favoritesCount = FavoritesManager.shared.getFavorites().count
        }
    }
}

/// WKWebView wrapper for SwiftUI
struct BickqrWebView: UIViewRepresentable {
    @Binding var isLoading: Bool
    var onFavoritesChanged: (Int) -> Void
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        
        // Add message handler for favorites sync
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "favoritesHandler")
        config.userContentController = contentController
        
        // Inject JavaScript to intercept favorite actions
        let script = WKUserScript(
            source: """
            // Listen for favorite button clicks and notify native app
            document.addEventListener('click', function(e) {
                const btn = e.target.closest('[data-favorite-bick]');
                if (btn) {
                    const bickData = btn.getAttribute('data-favorite-bick');
                    if (bickData) {
                        window.webkit.messageHandlers.favoritesHandler.postMessage({
                            action: 'toggle',
                            bick: JSON.parse(bickData)
                        });
                    }
                }
            }, true);
            
            // Notify when page loads
            window.webkit.messageHandlers.favoritesHandler.postMessage({ action: 'pageLoaded' });
            """,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        contentController.addUserScript(script)
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        
        // Set device ID cookie before loading
        let deviceId = FavoritesManager.shared.deviceId
        let cookie = HTTPCookie(properties: [
            .domain: URL(string: Config.apiBaseURL)?.host ?? "bickqr.com",
            .path: "/",
            .name: "bickqr_device_id",
            .value: deviceId,
            .secure: "TRUE",
            .expires: Date(timeIntervalSinceNow: 365 * 24 * 60 * 60)
        ])
        
        if let cookie = cookie {
            webView.configuration.websiteDataStore.httpCookieStore.setCookie(cookie)
        }
        
        // Load the site
        if let url = URL(string: Config.apiBaseURL) {
            webView.load(URLRequest(url: url))
        }
        
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {}
    
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: BickqrWebView
        
        init(_ parent: BickqrWebView) {
            self.parent = parent
        }
        
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.isLoading = true
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
            
            // Sync favorites from server after page loads
            Task {
                try? await FavoritesManager.shared.syncFromServer()
                await MainActor.run {
                    parent.onFavoritesChanged(FavoritesManager.shared.getFavorites().count)
                }
            }
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
        }
        
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            guard let body = message.body as? [String: Any],
                  let action = body["action"] as? String else { return }
            
            switch action {
            case "toggle":
                if let bickData = body["bick"] as? [String: Any],
                   let bick = try? JSONSerialization.data(withJSONObject: bickData),
                   let decodedBick = try? JSONDecoder().decode(Bick.self, from: bick) {
                    
                    if FavoritesManager.shared.isFavorite(id: decodedBick.id) {
                        FavoritesManager.shared.removeFavorite(id: decodedBick.id)
                    } else {
                        FavoritesManager.shared.addFavorite(decodedBick)
                    }
                    
                    parent.onFavoritesChanged(FavoritesManager.shared.getFavorites().count)
                }
                
            case "pageLoaded":
                // Refresh favorites count
                parent.onFavoritesChanged(FavoritesManager.shared.getFavorites().count)
                
            default:
                break
            }
        }
    }
}

#Preview {
    BrowseView()
}
