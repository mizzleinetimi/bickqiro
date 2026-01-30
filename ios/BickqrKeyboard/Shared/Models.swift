import Foundation

// MARK: - API Response Models

struct SearchResponse: Codable {
    let bicks: [Bick]
    let nextCursor: String?
}

struct Bick: Codable, Identifiable {
    let id: String
    let slug: String
    let title: String
    let description: String?
    let durationMs: Int?
    let playCount: Int?
    let assets: [BickAsset]
    
    enum CodingKeys: String, CodingKey {
        case id, slug, title, description, assets
        case durationMs = "duration_ms"
        case playCount = "play_count"
    }
    
    // MARK: - Computed Asset URLs
    
    var audioURL: URL? {
        assets.first { $0.assetType == "audio" }
            .flatMap { $0.cdnUrl }
            .flatMap { URL(string: $0) }
    }
    
    var teaserURL: URL? {
        assets.first { $0.assetType == "teaser_mp4" }
            .flatMap { $0.cdnUrl }
            .flatMap { URL(string: $0) }
    }
    
    var thumbnailURL: URL? {
        assets.first { $0.assetType == "thumbnail" }
            .flatMap { $0.cdnUrl }
            .flatMap { URL(string: $0) }
    }
    
    var ogImageURL: URL? {
        assets.first { $0.assetType == "og_image" }
            .flatMap { $0.cdnUrl }
            .flatMap { URL(string: $0) }
    }
    
    /// Formatted duration string (e.g., "0:05")
    var formattedDuration: String? {
        guard let ms = durationMs else { return nil }
        let seconds = ms / 1000
        let mins = seconds / 60
        let secs = seconds % 60
        return String(format: "%d:%02d", mins, secs)
    }
}

struct BickAsset: Codable {
    let id: String
    let bickId: String?
    let assetType: String
    let cdnUrl: String?
    let mimeType: String?
    let sizeBytes: Int?
    
    enum CodingKeys: String, CodingKey {
        case id
        case bickId = "bick_id"
        case assetType = "asset_type"
        case cdnUrl = "cdn_url"
        case mimeType = "mime_type"
        case sizeBytes = "size_bytes"
    }
}
