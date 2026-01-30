import UIKit

class KeyboardViewController: UIInputViewController {
    
    // MARK: - UI Components
    private var collectionView: UICollectionView!
    private var loadingIndicator: UIActivityIndicatorView!
    private var emptyLabel: UILabel!
    private var feedbackLabel: UILabel!
    private var globeButton: UIButton!
    private var titleLabel: UILabel!
    
    // MARK: - State
    private var bicks: [Bick] = []
    private var playingBickId: String?
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        setupAudioCallbacks()
        loadFavorites()
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        loadFavorites() // Refresh on appear
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        AudioManager.shared.stop()
    }
    
    // MARK: - UI Setup
    
    private func setupUI() {
        view.backgroundColor = UIColor(white: 0.08, alpha: 1)
        
        // Set keyboard height
        let heightConstraint = view.heightAnchor.constraint(equalToConstant: Config.keyboardHeight)
        heightConstraint.priority = .required
        heightConstraint.isActive = true
        
        setupHeader()
        setupCollectionView()
        setupLoadingIndicator()
        setupEmptyLabel()
        setupFeedbackLabel()
        setupConstraints()
    }
    
    private func setupHeader() {
        // Globe button (switch keyboard)
        globeButton = UIButton(type: .system)
        globeButton.setImage(UIImage(systemName: "globe"), for: .normal)
        globeButton.tintColor = UIColor(white: 0.6, alpha: 1)
        globeButton.addTarget(self, action: #selector(switchKeyboard), for: .touchUpInside)
        globeButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(globeButton)
        
        // Title
        titleLabel = UILabel()
        titleLabel.text = "My Bicks"
        titleLabel.textColor = .white
        titleLabel.font = .systemFont(ofSize: 15, weight: .semibold)
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(titleLabel)
    }
    
    private func setupCollectionView() {
        let layout = UICollectionViewFlowLayout()
        layout.itemSize = CGSize(width: Config.cellSize, height: Config.cellSize + 20)
        layout.minimumInteritemSpacing = 8
        layout.minimumLineSpacing = 8
        layout.sectionInset = UIEdgeInsets(top: 8, left: 12, bottom: 8, right: 12)
        layout.scrollDirection = .horizontal
        
        collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
        collectionView.backgroundColor = .clear
        collectionView.delegate = self
        collectionView.dataSource = self
        collectionView.register(BickCell.self, forCellWithReuseIdentifier: BickCell.reuseId)
        collectionView.showsHorizontalScrollIndicator = false
        collectionView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(collectionView)
    }
    
    private func setupLoadingIndicator() {
        loadingIndicator = UIActivityIndicatorView(style: .medium)
        loadingIndicator.color = .white
        loadingIndicator.hidesWhenStopped = true
        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(loadingIndicator)
    }
    
    private func setupEmptyLabel() {
        emptyLabel = UILabel()
        emptyLabel.text = "No favorites yet\nOpen the Bickqr app to add some!"
        emptyLabel.textColor = UIColor(white: 0.4, alpha: 1)
        emptyLabel.font = .systemFont(ofSize: 14)
        emptyLabel.textAlignment = .center
        emptyLabel.numberOfLines = 0
        emptyLabel.isHidden = true
        emptyLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(emptyLabel)
    }
    
    private func setupFeedbackLabel() {
        feedbackLabel = UILabel()
        feedbackLabel.textColor = .white
        feedbackLabel.font = .systemFont(ofSize: 13, weight: .medium)
        feedbackLabel.textAlignment = .center
        feedbackLabel.backgroundColor = UIColor(red: 0.2, green: 0.78, blue: 0.35, alpha: 1)
        feedbackLabel.layer.cornerRadius = 16
        feedbackLabel.clipsToBounds = true
        feedbackLabel.alpha = 0
        feedbackLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(feedbackLabel)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Globe button
            globeButton.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            globeButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 8),
            globeButton.widthAnchor.constraint(equalToConstant: 32),
            globeButton.heightAnchor.constraint(equalToConstant: 32),
            
            // Title
            titleLabel.centerYAnchor.constraint(equalTo: globeButton.centerYAnchor),
            titleLabel.leadingAnchor.constraint(equalTo: globeButton.trailingAnchor, constant: 8),
            
            // Collection view
            collectionView.topAnchor.constraint(equalTo: globeButton.bottomAnchor, constant: 8),
            collectionView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            collectionView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            // Loading indicator
            loadingIndicator.centerXAnchor.constraint(equalTo: collectionView.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: collectionView.centerYAnchor),
            
            // Empty label
            emptyLabel.centerXAnchor.constraint(equalTo: collectionView.centerXAnchor),
            emptyLabel.centerYAnchor.constraint(equalTo: collectionView.centerYAnchor),
            emptyLabel.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 20),
            emptyLabel.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -20),
            
            // Feedback label
            feedbackLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            feedbackLabel.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -16),
            feedbackLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 160),
            feedbackLabel.heightAnchor.constraint(equalToConstant: 32),
        ])
    }
    
    // MARK: - Load Favorites
    
    private func loadFavorites() {
        bicks = FavoritesManager.shared.getFavorites()
        collectionView.reloadData()
        emptyLabel.isHidden = !bicks.isEmpty
        
        // Update title with count
        if bicks.isEmpty {
            titleLabel.text = "My Bicks"
        } else {
            titleLabel.text = "My Bicks (\(bicks.count))"
        }
    }
    
    // MARK: - Audio Callbacks
    
    private func setupAudioCallbacks() {
        AudioManager.shared.onPlaybackStarted = { [weak self] bickId in
            self?.playingBickId = bickId
            self?.updatePlayingState()
        }
        
        AudioManager.shared.onPlaybackStopped = { [weak self] bickId in
            if self?.playingBickId == bickId {
                self?.playingBickId = nil
                self?.updatePlayingState()
            }
        }
        
        AudioManager.shared.onPlaybackError = { [weak self] bickId, error in
            self?.playingBickId = nil
            self?.updatePlayingState()
            self?.showFeedback("Playback failed", isError: true)
        }
    }
    
    private func updatePlayingState() {
        for cell in collectionView.visibleCells {
            guard let bickCell = cell as? BickCell,
                  let indexPath = collectionView.indexPath(for: cell) else { continue }
            let bick = bicks[indexPath.item]
            bickCell.setPlaying(bick.id == playingBickId)
        }
    }
    
    // MARK: - Actions
    
    @objc private func switchKeyboard() {
        advanceToNextInputMode()
    }
    
    // MARK: - Copy to Pasteboard
    
    private func copyToPasteboard(bick: Bick) {
        guard let teaserURL = bick.teaserURL else {
            showFeedback("No video available", isError: true)
            return
        }
        
        showFeedback("Copying...", isError: false)
        
        Task {
            do {
                let data = try await BickAPI.shared.fetchMediaData(from: teaserURL)
                await MainActor.run {
                    UIPasteboard.general.setData(data, forPasteboardType: "public.mpeg-4")
                    self.showFeedback("Copied! Paste in chat ✓", isError: false)
                    
                    let generator = UINotificationFeedbackGenerator()
                    generator.notificationOccurred(.success)
                }
            } catch {
                await MainActor.run {
                    self.showFeedback("Copy failed", isError: true)
                }
            }
        }
    }
    
    // MARK: - Feedback
    
    private func showFeedback(_ message: String, isError: Bool) {
        feedbackLabel.text = "  \(message)  "
        feedbackLabel.backgroundColor = isError 
            ? UIColor(red: 0.9, green: 0.3, blue: 0.3, alpha: 1)
            : UIColor(red: 0.2, green: 0.78, blue: 0.35, alpha: 1)
        
        UIView.animate(withDuration: 0.2) {
            self.feedbackLabel.alpha = 1
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            UIView.animate(withDuration: 0.3) {
                self.feedbackLabel.alpha = 0
            }
        }
    }
}

// MARK: - UICollectionViewDataSource

extension KeyboardViewController: UICollectionViewDataSource {
    func collectionView(_ collectionView: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        return bicks.count
    }
    
    func collectionView(_ collectionView: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = collectionView.dequeueReusableCell(withReuseIdentifier: BickCell.reuseId, for: indexPath) as! BickCell
        let bick = bicks[indexPath.item]
        cell.configure(with: bick)
        cell.setPlaying(bick.id == playingBickId)
        return cell
    }
}

// MARK: - UICollectionViewDelegate

extension KeyboardViewController: UICollectionViewDelegate {
    func collectionView(_ collectionView: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        let bick = bicks[indexPath.item]
        AudioManager.shared.play(bick: bick)
        
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }
}

// MARK: - Context Menu (Long Press to Copy)

extension KeyboardViewController {
    func collectionView(_ collectionView: UICollectionView, contextMenuConfigurationForItemAt indexPath: IndexPath, point: CGPoint) -> UIContextMenuConfiguration? {
        let bick = bicks[indexPath.item]
        
        return UIContextMenuConfiguration(identifier: nil, previewProvider: nil) { _ in
            let copyAction = UIAction(
                title: "Copy Video",
                image: UIImage(systemName: "doc.on.doc")
            ) { [weak self] _ in
                self?.copyToPasteboard(bick: bick)
            }
            
            return UIMenu(title: bick.title, children: [copyAction])
        }
    }
}
