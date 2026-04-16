# OmniSnap - Chrome Extension Plan

## Project Overview
A Manifest V3 Chrome extension that combines multiple small tools (screenshot, full page capture, color picker) into one unified extension, eliminating the need to install multiple separate extensions.

## Features

| Tool | Description | Implementation |
|------|-------------|----------------|
| **Screenshot** | Capture visible viewport | `chrome.tabs.captureVisibleTab` |
| **Full Page Capture** | Auto-scroll + stitch entire page | `chrome.scripting.executeScript`, OffscreenCanvas |
| **Color Picker** | Pick colors from any webpage | Native EyeDropper API (Chrome 95+) |

## Architecture

```
OmniSnap/
├── manifest.json          # MV3 manifest
├── background.js          # Service worker (capture logic)
├── popup.html             # Toolbox UI
├── popup.js               # Popup interactions
├── popup.css              # Styling
├── icons/                 # Extension icons
├── LICENSE
└── README.md
```

## Implementation Details

### Permissions
- `activeTab` - Access current tab for capture
- `scripting` - Inject scripts for scrolling/metrics
- `storage` - Save user preferences

### Full Page Capture Strategy
1. Get page scroll height and viewport dimensions via `chrome.scripting.executeScript`
2. Iteratively scroll and capture each segment
3. Stitch images using OffscreenCanvas
4. Crop overshoot and export as PNG

### Color Picker
- Uses native browser `EyeDropper` API
- Returns HEX color value
- One-click copy to clipboard
- Works fully offline

## UI Design
- Toolbox popup with tool buttons
- Each tool activates its own mode/overlay
- Dark/light theme support (emerald accent, no blue/purple)
- Keyboard shortcuts support

## Tech Stack
- Chrome Extension (Manifest V3)
- Vanilla JavaScript (no frameworks)
- HTML/CSS for UI
- No external dependencies

## Status
- [x] Set up project structure
- [x] Create manifest.json
- [x] Implement popup UI
- [x] Implement screenshot capture
- [ ] Implement full page capture
- [ ] Implement color picker
- [ ] Add keyboard shortcuts
- [ ] Test and verify