# YouTubeRedux for Safari

A Safari Web Extension port of [YouTubeRedux](https://github.com/omnidevZero/YouTubeRedux) — a browser extension that restores YouTube's classic pre-2022 UI with ~60 toggleable tweaks.

## What It Does

YouTubeRedux gives you back the YouTube you remember:

- **Old logos** — choose from 7 classic logo variants (2005, 2013, 2015, 2017, XL, and more)
- **Classic icons** — restored like/dislike buttons, player controls, and sidebar icons
- **Likes bar** — brings back the dislike count bar (integrates with Return YouTube Dislike)
- **Squared corners** — removes the rounded-corner redesign from every element
- **Small player mode** — set a custom player width
- **Old video info layout** — rearranges title, channel, and metadata to the classic order
- **No Shorts** — redirect Shorts to regular videos; hide Shorts from search results
- **Disable infinite scroll** — replace endless feeds with a "Show More" button
- **Classic subscribe button** — old-style subscribe button appearance
- **Grid density control** — set 1–10 items per row on the home feed
- **Hide AI panels** — removes the AI summary/topic panel
- **Old verified badge**, **darker red**, **custom scrollbars**, **cinematic mode control**, and ~40 more

All settings are toggle-based and persist across sessions via `browser.storage.sync`.

## What We Built

This project ports the Chrome extension to Safari from scratch, replacing all Chrome-specific APIs with their Safari/WebExtensions equivalents and resolving Safari-specific quirks discovered during the port.

### Chrome → Safari API Migration

Every `chrome.*` call was replaced with the native `browser.*` WebExtensions API that Safari supports:

| Chrome | Safari |
|--------|--------|
| `chrome.storage.sync` | `browser.storage.sync` |
| `chrome.runtime.getURL()` | `browser.runtime.getURL()` |
| `chrome.runtime.sendMessage()` | `browser.runtime.sendMessage()` |
| `chrome.tabs.create()` | `browser.tabs.create()` |
| `chrome.scripting.executeScript()` | `browser.scripting.executeScript()` |

The `let browser = chrome \|\| browser` shim pattern used by the original was removed entirely — Safari has no `chrome` global.

### Safari-Specific Fixes

**Favicon replacement** — Safari silently ignores `safari-web-extension://` URLs set as favicon hrefs. The fix: embed the favicon as a `data:image/x-icon;base64,...` URL directly, and trigger a reload with `history.replaceState(null, '', location.href)` (Safari only re-evaluates favicons on navigation events).

**CSS `d:` path overrides** — The Chrome extension overrides SVG icon shapes with `d: path(...)` in CSS, which Safari doesn't support. The Safari port replaces these with JS: `path.setAttribute('d', newPathData)` applied via MutationObserver so icons stay replaced as YouTube re-renders them.

**Extension asset URLs in CSS** — Hardcoded `chrome-extension://` scheme strings in `styles.css` were moved to dynamic injection in `initial-setup.js`, using `browser.runtime.getURL()` to build correct `safari-web-extension://` URLs at runtime.

### Project Structure

```
YouTubeRedux Safari/
├── YouTubeRedux Safari/              ← macOS host app (required by Apple)
│   └── AppDelegate.swift
└── YouTubeRedux Safari Extension/    ← The web extension
    ├── manifest.json                 ← MV3 manifest
    ├── background.js                 ← Service worker
    ├── initial-setup.js              ← document_start: loads settings, injects CSS
    ├── main.js                       ← document_idle: all DOM manipulation
    ├── styles.css                    ← Static CSS
    ├── popup.html / popup.js         ← Settings UI
    ├── helpers/
    │   ├── logger.js
    │   ├── enums.js
    │   ├── states.js
    │   └── resize.js                 ← Page-context script for player resize
    └── images/                       ← SVGs, PNGs, favicon
```

## Requirements

- macOS 12+ (Monterey or later)
- Safari 16+
- Xcode 14+ (to build from source)

## Building & Installing

1. Clone this repo
2. Open `YouTubeRedux Safari/YouTubeRedux Safari.xcodeproj` in Xcode
3. Build and run the app target (⌘R)
4. In Safari: **Settings → Extensions → YouTubeRedux** → enable it
5. Grant permission for `youtube.com` when prompted
6. Visit YouTube — the extension activates automatically

## Credits

- Original Chrome extension: [omnidevZero/YouTubeRedux](https://github.com/omnidevZero/YouTubeRedux)
- Safari port by [aikios](https://github.com/aikios)
