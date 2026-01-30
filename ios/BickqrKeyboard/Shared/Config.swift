import Foundation

enum Config {
    // MARK: - API Configuration
    // Update this to your production URL before submission
    #if DEBUG
    static let apiBaseURL = "http://localhost:3000"
    #else
    static let apiBaseURL = "https://bickqr.com"
    #endif
    
    // MARK: - App Group (for sharing data between app and extension)
    static let appGroup = "group.com.bickqr.keyboard"
    
    // MARK: - Keyboard Settings
    static let searchDebounceMs: UInt64 = 300_000_000 // 300ms in nanoseconds
    static let maxSearchResults = 20
    static let gridColumns = 4
    static let cellSize: CGFloat = 72
    static let keyboardHeight: CGFloat = 260
}
