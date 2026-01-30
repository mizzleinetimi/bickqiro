# Bickqr Keyboard Extension

iOS keyboard extension for searching and sharing Bicks directly from any app.

## Features
- Search bicks from the keyboard
- Preview audio with tap
- Copy MP4 teaser to pasteboard for sharing
- Works in any app with text input

## Setup

1. Open `BickqrKeyboard.xcodeproj` in Xcode
2. Update the Team in Signing & Capabilities for both targets
3. Update `API_BASE_URL` in `Shared/Config.swift` to your server URL
4. Build and run on a real device (simulator keyboard extensions are unreliable)

## Enabling the Keyboard

1. Go to Settings > General > Keyboard > Keyboards
2. Tap "Add New Keyboard"
3. Select "BickqrKeyboard"
4. Tap "BickqrKeyboard" again and enable "Allow Full Access" (required for network + audio)

## Architecture

```
BickqrKeyboard/
├── App/                    # Container app (required for App Store)
│   └── ContentView.swift   # Setup instructions UI
├── Keyboard/               # Keyboard extension
│   ├── KeyboardViewController.swift
│   ├── Views/
│   │   ├── SearchBar.swift
│   │   ├── BickGrid.swift
│   │   └── BickCell.swift
│   └── Info.plist
└── Shared/                 # Shared code between targets
    ├── Config.swift
    ├── Models.swift
    ├── BickAPI.swift
    └── AudioManager.swift
```

## Requirements
- iOS 15.0+
- Xcode 15+
- Real device for testing (keyboard extensions don't work reliably in simulator)
