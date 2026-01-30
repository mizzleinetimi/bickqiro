import AVFoundation
import UIKit

/// Manages audio playback for bick previews in the keyboard extension
class AudioManager: NSObject {
    static let shared = AudioManager()
    
    private var audioPlayer: AVAudioPlayer?
    private var currentBickId: String?
    private var downloadTask: URLSessionDataTask?
    
    // Callbacks
    var onPlaybackStarted: ((String) -> Void)?
    var onPlaybackStopped: ((String) -> Void)?
    var onPlaybackError: ((String, Error) -> Void)?
    
    private override init() {
        super.init()
        setupAudioSession()
    }
    
    // MARK: - Audio Session Setup
    
    private func setupAudioSession() {
        do {
            // Use playback category to play audio even when ringer is silent
            try AVAudioSession.sharedInstance().setCategory(
                .playback,
                mode: .default,
                options: [.mixWithOthers]
            )
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("[AudioManager] Failed to setup audio session: \(error)")
        }
    }
    
    // MARK: - Playback Control
    
    /// Check if a specific bick is currently playing
    func isPlaying(bickId: String) -> Bool {
        return currentBickId == bickId && (audioPlayer?.isPlaying ?? false)
    }
    
    /// Check if any audio is currently playing
    var isPlayingAny: Bool {
        return audioPlayer?.isPlaying ?? false
    }
    
    /// Play audio from a URL (streams/downloads and plays)
    func play(bick: Bick) {
        // If same bick is playing, stop it (toggle behavior)
        if currentBickId == bick.id && audioPlayer?.isPlaying == true {
            stop()
            return
        }
        
        // Stop any current playback
        stop()
        
        guard let audioURL = bick.audioURL else {
            print("[AudioManager] No audio URL for bick: \(bick.id)")
            return
        }
        
        currentBickId = bick.id
        
        // Download and play
        Task {
            do {
                let data = try await BickAPI.shared.fetchMediaData(from: audioURL)
                await MainActor.run {
                    self.playAudioData(data, bickId: bick.id)
                }
            } catch {
                await MainActor.run {
                    self.onPlaybackError?(bick.id, error)
                    self.currentBickId = nil
                }
            }
        }
    }
    
    private func playAudioData(_ data: Data, bickId: String) {
        do {
            // Re-activate audio session
            try AVAudioSession.sharedInstance().setActive(true)
            
            audioPlayer = try AVAudioPlayer(data: data)
            audioPlayer?.delegate = self
            audioPlayer?.prepareToPlay()
            audioPlayer?.play()
            
            onPlaybackStarted?(bickId)
        } catch {
            print("[AudioManager] Playback error: \(error)")
            onPlaybackError?(bickId, error)
            currentBickId = nil
        }
    }
    
    /// Stop current playback
    func stop() {
        downloadTask?.cancel()
        downloadTask = nil
        
        if let bickId = currentBickId {
            audioPlayer?.stop()
            onPlaybackStopped?(bickId)
        }
        
        audioPlayer = nil
        currentBickId = nil
    }
}

// MARK: - AVAudioPlayerDelegate

extension AudioManager: AVAudioPlayerDelegate {
    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        if let bickId = currentBickId {
            onPlaybackStopped?(bickId)
        }
        currentBickId = nil
    }
    
    func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        if let bickId = currentBickId, let error = error {
            onPlaybackError?(bickId, error)
        }
        currentBickId = nil
    }
}
