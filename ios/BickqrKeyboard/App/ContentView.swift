import SwiftUI

struct ContentView: View {
    @State private var keyboardEnabled = false
    @State private var fullAccessEnabled = false
    
    var body: some View {
        NavigationView {
            ScrollView {
                VStack(spacing: 32) {
                    // Hero
                    VStack(spacing: 16) {
                        Image(systemName: "keyboard")
                            .font(.system(size: 60))
                            .foregroundColor(Color(red: 0.98, green: 0.83, blue: 0.30))
                        
                        Text("Bickqr Keyboard")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        
                        Text("Search and share audio clips from any app")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 40)
                    
                    // Setup Steps
                    VStack(alignment: .leading, spacing: 24) {
                        Text("Setup Instructions")
                            .font(.headline)
                        
                        SetupStep(
                            number: 1,
                            title: "Add Keyboard",
                            description: "Go to Settings → General → Keyboard → Keyboards → Add New Keyboard → Bickqr",
                            isComplete: keyboardEnabled
                        )
                        
                        SetupStep(
                            number: 2,
                            title: "Enable Full Access",
                            description: "Tap Bickqr in your keyboards list and enable \"Allow Full Access\" for search and audio playback",
                            isComplete: fullAccessEnabled
                        )
                        
                        SetupStep(
                            number: 3,
                            title: "Start Using",
                            description: "Open any app, tap the globe 🌐 to switch to Bickqr, search for clips, tap to preview, long-press to copy",
                            isComplete: false
                        )
                    }
                    .padding(.horizontal)
                    
                    // Open Settings Button
                    Button(action: openSettings) {
                        HStack {
                            Image(systemName: "gear")
                            Text("Open Keyboard Settings")
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(red: 0.98, green: 0.83, blue: 0.30))
                        .foregroundColor(.black)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    
                    // How to Use
                    VStack(alignment: .leading, spacing: 16) {
                        Text("How to Use")
                            .font(.headline)
                        
                        FeatureRow(
                            icon: "magnifyingglass",
                            title: "Search",
                            description: "Type to search for audio clips"
                        )
                        
                        FeatureRow(
                            icon: "play.circle",
                            title: "Preview",
                            description: "Tap any result to play audio preview"
                        )
                        
                        FeatureRow(
                            icon: "doc.on.doc",
                            title: "Copy",
                            description: "Long-press to copy video to clipboard"
                        )
                        
                        FeatureRow(
                            icon: "square.and.arrow.up",
                            title: "Share",
                            description: "Paste the video into any chat or app"
                        )
                    }
                    .padding(.horizontal)
                    
                    Spacer(minLength: 40)
                }
            }
            .navigationBarHidden(true)
            .background(Color(UIColor.systemBackground))
        }
        .onAppear(perform: checkKeyboardStatus)
    }
    
    private func openSettings() {
        if let url = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(url)
        }
    }
    
    private func checkKeyboardStatus() {
        // Check if keyboard is enabled (simplified check)
        // In production, you'd use App Groups to share state
        let keyboards = UserDefaults.standard.object(forKey: "AppleKeyboards") as? [String] ?? []
        keyboardEnabled = keyboards.contains { $0.contains("BickqrKeyboard") }
    }
}

// MARK: - Setup Step View

struct SetupStep: View {
    let number: Int
    let title: String
    let description: String
    let isComplete: Bool
    
    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            ZStack {
                Circle()
                    .fill(isComplete ? Color.green : Color(red: 0.98, green: 0.83, blue: 0.30))
                    .frame(width: 32, height: 32)
                
                if isComplete {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                } else {
                    Text("\(number)")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.black)
                }
            }
            
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Feature Row View

struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(Color(red: 0.98, green: 0.83, blue: 0.30))
                .frame(width: 32)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    ContentView()
}
