import Foundation

enum Config {
    // MARK: - API Configuration
    static let apiBaseURL = "https://bickqiro.vercel.app"
    
    // MARK: - App Group (for sharing data between app and extension)
    static let appGroup = "group.com.bickqr.keyboard"
    
    // MARK: - Keyboard Settings
    static let searchDebounceMs: UInt64 = 300_000_000 // 300ms in nanoseconds
    static let maxSearchResults = 20
    static let gridColumns = 4
    static let cellSize: CGFloat = 72
    static let keyboardHeight: CGFloat = 260
}
