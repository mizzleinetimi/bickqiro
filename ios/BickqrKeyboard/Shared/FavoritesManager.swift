import Foundation

/// Manages favorites storage via App Groups (shared between app and keyboard extension)
class FavoritesManager {
    static let shared = FavoritesManager()
    
    private let userDefaults: UserDefaults?
    private let favoritesKey = "favorites"
    private let deviceIdKey = "deviceId"
    
    private init() {
        userDefaults = UserDefaults(suiteName: Config.appGroup)
    }
    
    // MARK: - Device ID
    
    var deviceId: String {
        get {
            if let existing = userDefaults?.string(forKey: deviceIdKey) {
                return existing
            }
            let newId = UUID().uuidString
            userDefaults?.set(newId, forKey: deviceIdKey)
            return newId
        }
        set {
            userDefaults?.set(newValue, forKey: deviceIdKey)
        }
    }
    
    // MARK: - Favorites CRUD
    
    func getFavorites() -> [Bick] {
        guard let data = userDefaults?.data(forKey: favoritesKey),
              let favorites = try? JSONDecoder().decode([Bick].self, from: data) else {
            return []
        }
        return favorites
    }
    
    func saveFavorites(_ favorites: [Bick]) {
        guard let data = try? JSONEncoder().encode(favorites) else { return }
        userDefaults?.set(data, forKey: favoritesKey)
    }
    
    func addFavorite(_ bick: Bick) {
        var favorites = getFavorites()
        // Don't add duplicates
        guard !favorites.contains(where: { $0.id == bick.id }) else { return }
        favorites.insert(bick, at: 0)
        saveFavorites(favorites)
    }
    
    func removeFavorite(id: String) {
        var favorites = getFavorites()
        favorites.removeAll { $0.id == id }
        saveFavorites(favorites)
    }
    
    func isFavorite(id: String) -> Bool {
        getFavorites().contains { $0.id == id }
    }
    
    func clearAll() {
        userDefaults?.removeObject(forKey: favoritesKey)
    }
    
    // MARK: - Sync with Server
    
    /// Fetch favorites from server and update local storage
    func syncFromServer() async throws {
        guard let url = URL(string: "\(Config.apiBaseURL)/api/favorites") else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-ID")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        struct FavoritesResponse: Codable {
            let bicks: [Bick]
            let deviceId: String?
        }
        
        let result = try JSONDecoder().decode(FavoritesResponse.self, from: data)
        
        // Update device ID if server assigned one
        if let serverDeviceId = result.deviceId {
            self.deviceId = serverDeviceId
        }
        
        saveFavorites(result.bicks)
    }
}
