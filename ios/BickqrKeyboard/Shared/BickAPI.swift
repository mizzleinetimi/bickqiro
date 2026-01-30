import Foundation

/// API client for Bickqr backend
actor BickAPI {
    static let shared = BickAPI()
    
    private let session: URLSession
    private let decoder: JSONDecoder
    
    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 30
        self.session = URLSession(configuration: config)
        
        self.decoder = JSONDecoder()
    }
    
    // MARK: - Search
    
    /// Search for bicks matching the query
    func search(query: String, limit: Int = Config.maxSearchResults) async throws -> [Bick] {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            return []
        }
        
        guard let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(Config.apiBaseURL)/api/search?q=\(encoded)&limit=\(limit)") else {
            throw APIError.invalidURL
        }
        
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard httpResponse.statusCode == 200 else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }
        
        let searchResponse = try decoder.decode(SearchResponse.self, from: data)
        return searchResponse.bicks
    }
    
    // MARK: - Fetch Media Data
    
    /// Download media data from URL (for copying to pasteboard)
    func fetchMediaData(from url: URL) async throws -> Data {
        let (data, response) = try await session.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.invalidResponse
        }
        
        return data
    }
}

// MARK: - Errors

enum APIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int)
    case decodingError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let code):
            return "Server error: \(code)"
        case .decodingError(let error):
            return "Failed to parse response: \(error.localizedDescription)"
        }
    }
}
