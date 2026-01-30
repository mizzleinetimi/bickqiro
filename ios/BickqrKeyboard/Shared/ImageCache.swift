import UIKit

/// Simple in-memory image cache for thumbnails
/// Keyboard extensions have ~30MB memory limit, so we keep this small
actor ImageCache {
    static let shared = ImageCache()
    
    private var cache: [URL: UIImage] = [:]
    private let maxCacheSize = 50 // Max number of images to cache
    private var accessOrder: [URL] = [] // LRU tracking
    
    private init() {}
    
    /// Get cached image or fetch from URL
    func image(for url: URL) async -> UIImage? {
        // Check cache first
        if let cached = cache[url] {
            // Move to end of access order (most recently used)
            if let index = accessOrder.firstIndex(of: url) {
                accessOrder.remove(at: index)
                accessOrder.append(url)
            }
            return cached
        }
        
        // Fetch from network
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            guard let image = UIImage(data: data) else { return nil }
            
            // Store in cache
            store(image: image, for: url)
            return image
        } catch {
            return nil
        }
    }
    
    private func store(image: UIImage, for url: URL) {
        // Evict oldest if at capacity
        if cache.count >= maxCacheSize, let oldest = accessOrder.first {
            cache.removeValue(forKey: oldest)
            accessOrder.removeFirst()
        }
        
        cache[url] = image
        accessOrder.append(url)
    }
    
    /// Clear all cached images
    func clear() {
        cache.removeAll()
        accessOrder.removeAll()
    }
}
