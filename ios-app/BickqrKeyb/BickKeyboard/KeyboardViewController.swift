//
//  KeyboardViewController.swift
//  BickKeyboard
//

import UIKit
import AVFoundation

class KeyboardViewController: UIInputViewController {
    
    private var collectionView: UICollectionView!
    private var nextKeyboardButton: UIButton!
    private var emptyLabel: UILabel!
    private var favorites: [Bick] = []
    private var audioPlayer: AVPlayer?
    
    private let appGroupId = "group.com.bickqr.BickqrKeyb"
    private let favoritesKey = "favorites_data"
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        loadFavorites()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadFavorites()
    }
    
    private func setupUI() {
        view.backgroundColor = UIColor(white: 0.12, alpha: 1)
        
        let layout = UICollectionViewFlowLayout()
        layout.scrollDirection = .horizontal
        layout.minimumInteritemSpacing = 8
        layout.minimumLineSpacing = 8
        layout.sectionInset = UIEdgeInsets(top: 8, left: 8, bottom: 8, right: 8)
        
        collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
        collectionView.backgroundColor = .clear
        collectionView.delegate = self
        collectionView.dataSource = self
        collectionView.register(BickCell.self, forCellWithReuseIdentifier: "BickCell")
        collectionView.translatesAutoresizingMaskIntoConstraints = false
        collectionView.showsHorizontalScrollIndicator = false
        view.addSubview(collectionView)
        
        emptyLabel = UILabel()
        emptyLabel.text = "No favorites yet!\nOpen the app to add sounds."
        emptyLabel.textColor = .gray
        emptyLabel.textAlignment = .center
        emptyLabel.numberOfLines = 0
        emptyLabel.font = .systemFont(ofSize: 14)
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(emptyLabel)
        
        nextKeyboardButton = UIButton(type: .system)
        nextKeyboardButton.setImage(UIImage(systemName: "globe"), for: .normal)
        nextKeyboardButton.tintColor = .white
        nextKeyboardButton.translatesAutoresizingMaskIntoConstraints = false
        nextKeyboardButton.addTarget(self, action: #selector(handleInputModeList(from:with:)), for: .allTouchEvents)
        view.addSubview(nextKeyboardButton)
        
        NSLayoutConstraint.activate([
            collectionView.topAnchor.constraint(equalTo: view.topAnchor),
            collectionView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            collectionView.bottomAnchor.constraint(equalTo: nextKeyboardButton.topAnchor, constant: -4),
            
            emptyLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            emptyLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -16),
            
            nextKeyboardButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            nextKeyboardButton.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -4),
            nextKeyboardButton.widthAnchor.constraint(equalToConstant: 44),
            nextKeyboardButton.heightAnchor.constraint(equalToConstant: 32),
        ])
        
        let heightConstraint = view.heightAnchor.constraint(equalToConstant: 180)
        heightConstraint.priority = .defaultHigh
        heightConstraint.isActive = true
    }
    
    override func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()
        nextKeyboardButton.isHidden = !needsInputModeSwitchKey
    }
    
    private func loadFavorites() {
        let defaults = UserDefaults(suiteName: appGroupId) ?? UserDefaults.standard
        guard let data = defaults.data(forKey: favoritesKey) else {
            favorites = []
            updateUI()
            return
        }
        
        favorites = (try? JSONDecoder().decode([Bick].self, from: data)) ?? []
        updateUI()
    }
    
    private func updateUI() {
        emptyLabel.isHidden = !favorites.isEmpty
        collectionView.isHidden = favorites.isEmpty
        collectionView.reloadData()
    }
    
    private func playSound(_ bick: Bick) {
        guard let urlString = bick.audioUrl, let url = URL(string: urlString) else { return }
        
        do {
            try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("Audio session error: \(error)")
        }
        
        audioPlayer = AVPlayer(url: url)
        audioPlayer?.play()
    }
}

// MARK: - UICollectionView
extension KeyboardViewController: UICollectionViewDataSource, UICollectionViewDelegate, UICollectionViewDelegateFlowLayout {
    
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        favorites.count
    }
    
    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: "BickCell", for: indexPath) as! BickCell
        cell.configure(with: favorites[indexPath.item])
        return cell
    }
    
    func collectionView(_ collectionView: UICollectionView, layout collectionViewLayout: UICollectionViewLayout, sizeForItemAt indexPath: IndexPath) -> CGSize {
        CGSize(width: 100, height: 120)
    }
    
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        let bick = favorites[indexPath.item]
        playSound(bick)
        
        if let cell = collectionView.cellForItem(at: indexPath) {
            UIView.animate(withDuration: 0.1, animations: {
                cell.transform = CGAffineTransform(scaleX: 0.95, y: 0.95)
            }) { _ in
                UIView.animate(withDuration: 0.1) {
                    cell.transform = .identity
                }
            }
        }
    }
}

// MARK: - BickCell
class BickCell: UICollectionViewCell {
    
    private let imageView = UIImageView()
    private let titleLabel = UILabel()
    private let playIcon = UIImageView()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    private func setupUI() {
        contentView.backgroundColor = UIColor(white: 0.2, alpha: 1)
        contentView.layer.cornerRadius = 8
        contentView.clipsToBounds = true
        
        imageView.contentMode = .scaleAspectFill
        imageView.backgroundColor = UIColor(white: 0.15, alpha: 1)
        imageView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(imageView)
        
        playIcon.image = UIImage(systemName: "play.circle.fill")
        playIcon.tintColor = .white
        playIcon.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(playIcon)
        
        titleLabel.font = .systemFont(ofSize: 11, weight: .medium)
        titleLabel.textColor = .white
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 2
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(titleLabel)
        
        NSLayoutConstraint.activate([
            imageView.topAnchor.constraint(equalTo: contentView.topAnchor),
            imageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            imageView.heightAnchor.constraint(equalToConstant: 80),
            
            playIcon.centerXAnchor.constraint(equalTo: imageView.centerXAnchor),
            playIcon.centerYAnchor.constraint(equalTo: imageView.centerYAnchor),
            playIcon.widthAnchor.constraint(equalToConstant: 30),
            playIcon.heightAnchor.constraint(equalToConstant: 30),
            
            titleLabel.topAnchor.constraint(equalTo: imageView.bottomAnchor, constant: 4),
            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 4),
            titleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -4),
        ])
    }
    
    func configure(with bick: Bick) {
        titleLabel.text = bick.title
        
        if let urlString = bick.thumbnailUrl, let url = URL(string: urlString) {
            URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
                if let data = data, let image = UIImage(data: data) {
                    DispatchQueue.main.async {
                        self?.imageView.image = image
                    }
                }
            }.resume()
        }
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        imageView.image = nil
        titleLabel.text = nil
    }
}

// MARK: - Bick Model (shared with main app)
struct Bick: Codable, Identifiable {
    let id: String
    let slug: String
    let title: String
    let description: String?
    let duration_ms: Int?
    let play_count: Int?
    let assets: [BickAsset]?
    
    var audioUrl: String? {
        assets?.first(where: { $0.asset_type == "audio" || $0.asset_type == "original" })?.cdn_url
    }
    
    var thumbnailUrl: String? {
        assets?.first(where: { $0.asset_type == "thumbnail" })?.cdn_url ??
        assets?.first(where: { $0.asset_type == "og_image" })?.cdn_url
    }
}

struct BickAsset: Codable {
    let id: String
    let bick_id: String
    let asset_type: String
    let cdn_url: String
    let mime_type: String?
    let size_bytes: Int?
}
