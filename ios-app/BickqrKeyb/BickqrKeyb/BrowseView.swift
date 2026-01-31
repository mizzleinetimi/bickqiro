//
//  BrowseView.swift
//  BickqrKeyb
//

import SwiftUI
import WebKit

struct BrowseView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var isLoading = true
    @State private var savedCount = 0
    
    var body: some View {
        NavigationView {
            ZStack {
                WebView(
                    url: URL(string: "https://bickqiro.vercel.app")!,
                    isLoading: $isLoading,
                    onFavorite: handleFavorite
                )
                
                if isLoading {
                    ProgressView()
                        .scaleEffect(1.5)
                }
            }
            .navigationTitle("Browse Sounds")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    if savedCount > 0 {
                        Text("\(savedCount) saved")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .onAppear {
            savedCount = FavoritesStore.shared.getFavorites().count
        }
    }
    
    private func handleFavorite(_ bickData: [String: Any]) {
        guard let id = bickData["id"] as? String else { return }
        
        if FavoritesStore.shared.isFavorite(id: id) {
            FavoritesStore.shared.removeFavorite(id: id)
        } else {
            FavoritesStore.shared.addFavorite(bickData)
        }
        
        savedCount = FavoritesStore.shared.getFavorites().count
    }
}

// MARK: - FavoritesStore
class FavoritesStore {
    static let shared = FavoritesStore()
    
    private let appGroupId = "group.com.bickqr.BickqrKeyb"
    private let favoritesKey = "favorites"
    
    private var defaults: UserDefaults {
        // Try App Group first, fall back to standard
        return UserDefaults(suiteName: appGroupId) ?? UserDefaults.standard
    }
    
    func getFavorites() -> [[String: Any]] {
        return defaults.array(forKey: favoritesKey) as? [[String: Any]] ?? []
    }
    
    func addFavorite(_ bick: [String: Any]) {
        var favorites = getFavorites()
        favorites.append(bick)
        defaults.set(favorites, forKey: favoritesKey)
    }
    
    func removeFavorite(id: String) {
        var favorites = getFavorites()
        favorites.removeAll { ($0["id"] as? String) == id }
        defaults.set(favorites, forKey: favoritesKey)
    }
    
    func isFavorite(id: String) -> Bool {
        return getFavorites().contains { ($0["id"] as? String) == id }
    }
}

// MARK: - WebView
struct WebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    let onFavorite: ([String: Any]) -> Void
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let contentController = WKUserContentController()
        contentController.add(context.coordinator, name: "favoriteHandler")
        
        let script = WKUserScript(
            source: Self.favoriteInterceptScript,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: false
        )
        contentController.addUserScript(script)
        config.userContentController = contentController
        
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.load(URLRequest(url: url))
        return webView
    }
    
    func updateUIView(_ webView: WKWebView, context: Context) {}
    
    static let favoriteInterceptScript = """
    (function() {
        document.addEventListener('click', function(e) {
            let target = e.target;
            while (target && target !== document) {
                if (target.hasAttribute && target.hasAttribute('data-favorite-bick')) {
                    try {
                        const bickData = JSON.parse(target.getAttribute('data-favorite-bick'));
                        window.webkit.messageHandlers.favoriteHandler.postMessage(bickData);
                    } catch (err) {
                        console.error('Failed to parse bick data:', err);
                    }
                    break;
                }
                target = target.parentElement;
            }
        }, true);
    })();
    """
    
    class Coordinator: NSObject, WKNavigationDelegate, WKScriptMessageHandler {
        var parent: WebView
        
        init(_ parent: WebView) {
            self.parent = parent
        }
        
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.isLoading = true
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
        }
        
        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
            if message.name == "favoriteHandler",
               let bickData = message.body as? [String: Any] {
                DispatchQueue.main.async {
                    self.parent.onFavorite(bickData)
                }
            }
        }
    }
}

#Preview {
    BrowseView()
}
