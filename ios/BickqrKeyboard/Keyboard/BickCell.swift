import UIKit

/// Collection view cell for displaying a bick in the keyboard grid
class BickCell: UICollectionViewCell {
    static let reuseId = "BickCell"
    
    // MARK: - UI Components
    private let thumbnailView = UIImageView()
    private let playOverlay = UIView()
    private let playIcon = UIImageView()
    private let titleLabel = UILabel()
    private let durationBadge = UILabel()
    private let loadingIndicator = UIActivityIndicatorView(style: .medium)
    
    // MARK: - State
    private var currentBickId: String?
    private var imageLoadTask: Task<Void, Never>?
    
    // MARK: - Init
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        imageLoadTask?.cancel()
        thumbnailView.image = nil
        currentBickId = nil
        setPlaying(false)
    }
    
    // MARK: - Setup
    
    private func setupUI() {
        contentView.backgroundColor = UIColor(white: 0.15, alpha: 1)
        contentView.layer.cornerRadius = 8
        contentView.clipsToBounds = true
        
        // Thumbnail
        thumbnailView.contentMode = UIView.ContentMode.scaleAspectFill
        thumbnailView.clipsToBounds = true
        thumbnailView.backgroundColor = UIColor(white: 0.2, alpha: 1)
        thumbnailView.layer.cornerRadius = 6
        thumbnailView.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(thumbnailView)
        
        // Play overlay (shown when playing)
        playOverlay.backgroundColor = UIColor(red: 0.98, green: 0.83, blue: 0.30, alpha: 0.9)
        playOverlay.layer.cornerRadius = 6
        playOverlay.alpha = 0
        playOverlay.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(playOverlay)
        
        // Play icon
        playIcon.image = UIImage(systemName: "waveform")
        playIcon.tintColor = UIColor(white: 0.1, alpha: 1)
        playIcon.contentMode = .scaleAspectFit
        playIcon.translatesAutoresizingMaskIntoConstraints = false
        playOverlay.addSubview(playIcon)
        
        // Duration badge
        durationBadge.font = .systemFont(ofSize: 9, weight: .medium)
        durationBadge.textColor = .white
        durationBadge.backgroundColor = UIColor(white: 0, alpha: 0.6)
        durationBadge.textAlignment = .center
        durationBadge.layer.cornerRadius = 4
        durationBadge.clipsToBounds = true
        durationBadge.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(durationBadge)
        
        // Title
        titleLabel.font = .systemFont(ofSize: 10)
        titleLabel.textColor = UIColor(white: 0.8, alpha: 1)
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 1
        titleLabel.lineBreakMode = .byTruncatingTail
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(titleLabel)
        
        // Loading indicator
        loadingIndicator.color = UIColor(white: 0.6, alpha: 1)
        loadingIndicator.hidesWhenStopped = true
        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        contentView.addSubview(loadingIndicator)
        
        setupConstraints()
    }
    
    private func setupConstraints() {
        let thumbnailSize = Config.cellSize - 8
        
        NSLayoutConstraint.activate([
            // Thumbnail
            thumbnailView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 4),
            thumbnailView.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            thumbnailView.widthAnchor.constraint(equalToConstant: thumbnailSize),
            thumbnailView.heightAnchor.constraint(equalToConstant: thumbnailSize),
            
            // Play overlay
            playOverlay.topAnchor.constraint(equalTo: thumbnailView.topAnchor),
            playOverlay.leadingAnchor.constraint(equalTo: thumbnailView.leadingAnchor),
            playOverlay.trailingAnchor.constraint(equalTo: thumbnailView.trailingAnchor),
            playOverlay.bottomAnchor.constraint(equalTo: thumbnailView.bottomAnchor),
            
            // Play icon
            playIcon.centerXAnchor.constraint(equalTo: playOverlay.centerXAnchor),
            playIcon.centerYAnchor.constraint(equalTo: playOverlay.centerYAnchor),
            playIcon.widthAnchor.constraint(equalToConstant: 28),
            playIcon.heightAnchor.constraint(equalToConstant: 28),
            
            // Duration badge
            durationBadge.trailingAnchor.constraint(equalTo: thumbnailView.trailingAnchor, constant: -2),
            durationBadge.bottomAnchor.constraint(equalTo: thumbnailView.bottomAnchor, constant: -2),
            durationBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: 24),
            durationBadge.heightAnchor.constraint(equalToConstant: 14),
            
            // Title
            titleLabel.topAnchor.constraint(equalTo: thumbnailView.bottomAnchor, constant: 2),
            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 2),
            titleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -2),
            
            // Loading indicator
            loadingIndicator.centerXAnchor.constraint(equalTo: thumbnailView.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: thumbnailView.centerYAnchor),
        ])
    }
    
    // MARK: - Configure
    
    func configure(with bick: Bick) {
        currentBickId = bick.id
        titleLabel.text = bick.title
        
        // Duration badge
        if let duration = bick.formattedDuration {
            durationBadge.text = " \(duration) "
            durationBadge.isHidden = false
        } else {
            durationBadge.isHidden = true
        }
        
        // Load thumbnail
        loadThumbnail(for: bick)
    }
    
    private func loadThumbnail(for bick: Bick) {
        guard let thumbnailURL = bick.thumbnailURL ?? bick.ogImageURL else {
            thumbnailView.backgroundColor = UIColor(white: 0.2, alpha: 1)
            return
        }
        
        loadingIndicator.startAnimating()
        
        imageLoadTask = Task {
            let image = await ImageCache.shared.image(for: thumbnailURL)
            
            await MainActor.run {
                guard self.currentBickId == bick.id else { return }
                self.loadingIndicator.stopAnimating()
                
                if let image = image {
                    UIView.transition(with: self.thumbnailView, duration: 0.2, options: .transitionCrossDissolve) {
                        self.thumbnailView.image = image
                    }
                }
            }
        }
    }
    
    // MARK: - Playing State
    
    func setPlaying(_ playing: Bool) {
        UIView.animate(withDuration: 0.2) {
            self.playOverlay.alpha = playing ? 1 : 0
        }
        
        if playing {
            // Animate waveform icon
            let animation = CABasicAnimation(keyPath: "transform.scale")
            animation.fromValue = 0.9
            animation.toValue = 1.1
            animation.duration = 0.3
            animation.autoreverses = true
            animation.repeatCount = .infinity
            playIcon.layer.add(animation, forKey: "pulse")
        } else {
            playIcon.layer.removeAllAnimations()
        }
    }
    
    // MARK: - Touch Feedback
    
    override var isHighlighted: Bool {
        didSet {
            UIView.animate(withDuration: 0.1) {
                self.contentView.transform = self.isHighlighted 
                    ? CGAffineTransform(scaleX: 0.95, y: 0.95)
                    : .identity
            }
        }
    }
}
