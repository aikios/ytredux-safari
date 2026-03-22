# YouTubeRedux for Safari — SPEC.md

## Project Overview

A Safari Web Extension port of [YouTubeRedux](https://github.com/omnidevZero/YouTubeRedux), a browser extension that restores YouTube's classic UI (pre-2022 aesthetic): old logo variants, squared corners, old icons, rearranged video info layout, likes bar, small player mode, and ~60 other toggleable tweaks.

The Chrome extension is already well-structured for porting. All `chrome.*` API calls **must** be replaced with Safari-native equivalents — either the WebExtensions `browser.*` API (which Safari supports natively) or Swift/Objective-C native code where no JS equivalent exists. There is **no** Chrome runtime to fall back on in Safari.

---

## Architecture

### Extension Type

Safari Web Extension (Xcode project wrapping a standard Web Extensions API bundle).

- **Xcode project**: hosts the extension target
- **Web extension bundle** (inside the Xcode project): standard `manifest.json` + HTML/CSS/JS content
- **Swift app wrapper**: minimal host app required by Apple; handles permissions prompts

### Manifest Version

Manifest V3 (same as Chrome original). Safari 15+ supports MV3 service workers.

### Injection Phases

| Phase | Script | Timing | Purpose |
|---|---|---|---|
| 1 | `initial-setup.js` + helpers | `document_start` | Load settings, build and inject dynamic CSS before DOM exists |
| 2 | `main.js` + `styles.css` | `document_idle` | All DOM manipulation, SPA navigation polling |

---

## File Structure

```
YouTubeRedux Safari/          ← Xcode project root
├── YouTubeRedux Safari/      ← macOS host app (minimal Swift UI wrapper)
│   └── AppDelegate.swift
├── YouTubeRedux Safari Extension/   ← The actual web extension
│   ├── manifest.json
│   ├── background.js         ← Service worker
│   ├── initial-setup.js      ← document_start: loads settings, injects dynamic CSS
│   ├── main.js               ← document_idle: all DOM manipulation
│   ├── styles.css            ← Static CSS (always injected)
│   ├── popup.html            ← Settings UI
│   ├── popup.js              ← Settings UI logic
│   ├── changelog.html/js     ← Shown on install/update
│   ├── config.html/js        ← Export/import settings
│   ├── helpers/
│   │   ├── logger.js         ← Console logging with branded style
│   │   ├── enums.js          ← Constants (PAGE_LOCATION, modes, themes)
│   │   ├── states.js         ← Runtime state (page location, observer refs)
│   │   └── resize.js         ← Injected into page context for player resize
│   └── images/               ← All SVG/PNG assets
└── Shared (Extension)/       ← Xcode shared resources if needed
```

---

## Core Features (all ported 1:1 from Chrome extension)

### 1. Dynamic CSS Injection (`initial-setup.js`)
- ~60 named CSS blocks in `allStyles` object, each tied to a settings flag
- Merged into a single `<style id="redux-style">` on `document.documentElement` before DOM is ready
- Settings loaded from storage (see Storage section below)

### 2. SPA Navigation Detection (`main.js`)
- YouTube is a Single Page Application; no full page reloads
- Polling loop every 100ms comparing `location.pathname + location.search`
- On URL change: disconnect all observers, clear intervals, re-run `main()`
- **No** `yt-navigate-finish` event listener — pure polling

### 3. `waitForElement` Pattern
- Polling `setInterval` until a CSS selector matches, then fires callback
- Used for nearly every feature because YouTube's Polymer components load asynchronously
- Each interval tracked and cleared on navigation change

### 4. MutationObserver Usage
Six active observers in `main.js`:
- `homeObserver` — home page grid rendering
- `observerComments` — new comment thread elements (infinite scroll control)
- `observerRelated` — new related video elements (infinite scroll control)
- `observerLikes` — `#top-level-buttons-computed` like button changes
- `observerPlaylistItems` — new playlist items for home page sorting
- `cinematicsObserver` — ambient mode backdrop changes
- `viewsObserver` — view count element for trimmed display

### 5. Page Context Script Injection (`resize.js`)
- Injected as a `<script src="...">` DOM element (not as content script) to access YouTube's `player.setInternalSize()` which is only accessible in page JS context, not extension context
- Data passed via `data-width` / `data-height` attributes on `document.body`
- Requires entry in `web_accessible_resources`

---

## Feature List (all ~60 settings)

| Setting | Implementation method |
|---|---|
| Small player (custom width) | CSS + `resize.js` page-context injection |
| Video info rearrangement | DOM node moves + CSS flexbox `order:` |
| Likes bar restoration | DOM injection + RYD extension integration |
| Logo variants (7 options) | CSS `content: url(...)` on masthead selectors |
| Old icons (SVG path override) | CSS `d:` path attribute override (see Notes) |
| Classic like/dislike icons | CSS `content: url(...)` on `yt-icon` |
| Autoplay toggle (old position) | DOM clone + proxy click |
| Disable infinite scroll | MutationObserver + custom "SHOW MORE" button |
| Shorts redirect | `window.location.replace()` |
| Hide shorts in search | MutationObserver on search results |
| Playlist sort first on home | CSS `order: -N` + MutationObserver |
| Remove `start_radio` param | `url.searchParams.delete()` + `location.replace()` |
| Subscriber count trim | DOM injection + custom pill UI |
| True fullscreen | `wheel` + `keydown` event listeners with `preventDefault()` |
| My Channel sidebar link | Extract channel ID from Studio URL + inject entry |
| Grid items per row (1-10) | CSS custom property `--ytd-rich-grid-items-per-row` |
| Border radius: 0 on all elements | Static `styles.css` |
| Masthead height 50px | CSS custom property override |
| Dark/light theme detection | `html[dark]` attribute selector |
| Old subscribe button style | CSS on `ytd-subscribe-button-renderer` |
| Hide AI summary panel | CSS `display: none` on `#expandable-metadata` |
| Hide filter chips | CSS on home/video page chip bars |
| Darker classic red | CSS `#cc181e` override |
| Extra layout (card shadows) | CSS box-shadow + white backgrounds |
| Immersive fullscreen | CSS hiding all controls except exit button |
| Cinematic mode control | MutationObserver on `#cinematics` |
| Comment style changes | CSS removing threadlines |
| Custom scrollbars | CSS `::webkit-scrollbar` 8px square |
| Old verified badge | CSS `content: url(...)` on verified icon |
| Favicon replacement | `<link rel="icon">` DOM manipulation |
| ... (remaining ~35 toggles) | Various CSS / DOM combinations |

---

## Chrome API → Safari Replacement Map

> **CRITICAL RULE**: Wherever the Chrome extension uses `chrome.*`, the Safari port uses `browser.*` (WebExtensions API). Safari has full WebExtensions API support. There is no `chrome` global in Safari — do **not** use it, do **not** polyfill it. Use `browser.*` natively throughout.

| Chrome API | Safari Replacement | Notes |
|---|---|---|
| `chrome.storage.sync` | `browser.storage.sync` | Direct 1:1 replacement |
| `chrome.storage.local` | `browser.storage.local` | Direct 1:1 replacement |
| `chrome.runtime.getURL()` | `browser.runtime.getURL()` | Direct 1:1 replacement — **never** use `chrome.runtime.getURL` |
| `chrome.runtime.sendMessage()` | `browser.runtime.sendMessage()` | Direct 1:1 replacement |
| `chrome.runtime.onMessage` | `browser.runtime.onMessage` | Direct 1:1 replacement |
| `chrome.runtime.onInstalled` | `browser.runtime.onInstalled` | Direct 1:1 replacement |
| `chrome.tabs.create()` | `browser.tabs.create()` | Direct 1:1 replacement |
| `chrome.scripting.executeScript()` | `browser.scripting.executeScript()` | Supported in Safari 16+ (MV3) |
| `chrome.downloads` | `browser.downloads` | Supported; fallback: use `<a download>` trick |
| `chrome-extension://` URL scheme | `safari-web-extension://` | Must be rewritten at runtime — see below |

### The `let browser = chrome || browser` Pattern
The Chrome extension uses this in `background.js`. **Remove it entirely.** In Safari, `browser` is the global — `chrome` does not exist. Simply use `browser` directly.

### `chrome-extension://` URLs in CSS (Lesson from OldTwitter Port)
The static `styles.css` has one hard-coded `chrome-extension://` URL for the autoplay checkbox toggle image. **Do not rely on a static scheme string.** Instead:
1. Move this rule to dynamic injection in `initial-setup.js`
2. Derive the correct scheme at runtime: `browser.runtime.getURL("").split("://")[0]` → `"safari-web-extension"`
3. Build the full URL with `browser.runtime.getURL("images/...")` which resolves correctly on all platforms

Any CSS blocks in `allStyles` that reference extension images must use `browser.runtime.getURL()` to build the URL string dynamically — never hardcode the scheme.

### Favicon Replacement (Lesson from OldTwitter Port)
The Chrome extension manipulates `<link rel="icon">` hrefs to swap YouTube's favicon. In Safari:
- **Safari ignores `safari-web-extension://` URLs set as favicon hrefs** — this will silently fail
- **Use a `data:image/x-icon;base64,...` URL** embedded directly in the `href`
- **Trigger favicon reload** with `history.replaceState(null, '', location.href)` after setting the href — Safari only picks up favicon changes on navigation events. Use `null` as state (not `history.state`) to avoid non-serializable data errors

---

## CSS Compatibility Notes

### SVG Path `d:` Override (Critical Risk)
The Chrome extension overrides SVG icon shapes using:
```css
path[d="<old-path-data>"] {
    d: path("<new-path-data>") !important;
}
```
This is a **non-standard CSS property**. Chrome supports it; **Safari support is limited and inconsistent**.

**Safari approach**: Use JS in `main.js` to directly set `path.setAttribute('d', newPathData)` after matching by the old `d` value. A MutationObserver on the document can re-apply on dynamic icon changes.

### WebKit Prefixes
Safari may require `-webkit-` prefixes for some CSS properties. Audit each property in `styles.css` and add prefixes where needed. Key ones:
- `-webkit-scrollbar` (already webkit-only)
- `-webkit-line-clamp`

### `content: url()` for Images
Safari fully supports `content: url(...)` for replaced elements — no changes needed here.

---

## Storage

Settings key: `reduxSettings` (object, stored via `browser.storage.sync`).

~60 boolean flags plus a few string/number values:
- `smallPlayer`: boolean
- `playerSize`: number (px width, default 853)
- `classicLogoChoice`: string (`"2017"`, `"2015"`, `"2013"`, `"2005"`, `"2005alt"`, `"XL"`)
- `gridItems`: number (1-10)
- `infiniteScrollingMode`: enum (`"disabled"`, `"comments"`, `"related"`, `"both"`)
- ... (all others are booleans)

Default settings are defined in `initial-setup.js` and merged with stored values on load.

---

## Xcode Project Configuration

### Required Xcode Settings
- Deployment target: macOS 12+ (Safari 15.4+ for full MV3 support; Safari 16+ for `scripting` API)
- Extension type: Safari Web Extension
- Bundle identifier: e.g. `com.yourname.YouTubeReduxSafari`
- Entitlements: standard web extension entitlements (Xcode generates these)

### Permissions in manifest.json
```json
{
  "permissions": ["activeTab", "storage", "scripting"],
  "optional_permissions": ["downloads"],
  "host_permissions": ["*://*.youtube.com/*"]
}
```
Note: In MV3, `host_permissions` is separate from `permissions`.

### web_accessible_resources
```json
{
  "web_accessible_resources": [{
    "resources": ["images/*", "helpers/resize.js"],
    "matches": ["*://*.youtube.com/*"]
  }]
}
```

---

## Implementation Plan

### Phase 0: Xcode Scaffolding
1. Create new Xcode project: File → New → Project → Safari Extension App
2. Copy all Chrome extension JS/CSS/HTML/image files into the Extension target
3. Update `manifest.json`: split `permissions` + `host_permissions`, verify MV3 structure
4. Build and verify extension loads in Safari (empty/no-op state)

### Phase 1: API Surface Port
1. Remove all `chrome` references; replace with `browser`
2. Remove `let browser = chrome || browser` pattern
3. Fix `chrome-extension://` URL in `styles.css` → move to dynamic injection
4. Verify `browser.storage.sync`, `browser.runtime.*`, `browser.tabs.*` all work

### Phase 2: CSS Icon Fix (SVG `d:` Property)
1. Audit all `d: path(...)` CSS rules in `initial-setup.js`
2. Move each to a JS-based approach in `main.js`: `matchAndReplaceIconPaths()`
3. Set up a MutationObserver on `document.body` to re-apply after YouTube re-renders icons

### Phase 3: Feature Verification (one by one)
Test each feature in Safari with the YouTube live site:
1. Dynamic CSS injection (settings toggle → CSS changes)
2. SPA navigation detection (navigate between pages)
3. Small player + `resize.js` injection
4. Video info rearrangement
5. Likes bar
6. Logo replacement
7. Infinite scroll disable
8. Shorts redirect
9. ... (all remaining features)

### Phase 4: Popup & Settings UI
1. Port `popup.js`: replace `chrome.scripting.executeScript` with `browser.scripting.executeScript`
2. Port `config.js`: replace downloads API if needed
3. Test settings persist and apply correctly

### Phase 5: Polish
1. Extension icon set (16, 32, 48, 128px PNGs)
2. Install/update changelog flow
3. App Store submission preparation (if desired)

---

## Testing Strategy

- **Primary validation**: Claude controls Safari via AppleScript (`osascript`) to navigate to YouTube, take screenshots, and run JS to inspect the DOM
- **No automated test framework**: DOM testing is live against real YouTube
- **Validation checkpoints**: After each Phase, take a screenshot of YouTube home, video page, and sidebar to confirm visual changes match the Chrome extension behavior
- **Safari DevTools**: Use the Develop menu (requires "Show features for web developers" in Safari Settings → Advanced) to inspect injected CSS and JS errors

---

## Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| SVG `d:` CSS property not supported in Safari | Use JS `setAttribute('d', ...)` instead |
| YouTube Polymer component selectors change | Extension is inherently fragile to YouTube updates; same risk as Chrome version |
| `browser.scripting.executeScript` requires Safari 16+ | Target macOS 12+ / Safari 16+ as minimum |
| Private browsing windows cannot be controlled by extensions | Known limitation; document in UI |
| `player.setInternalSize()` API may behave differently in Safari's YouTube | Test and add fallback CSS-only resize if needed |
| App Store review may reject if functionality breaks | Test thoroughly before submission |
| `chrome-extension://` URLs in CSS silently produce broken images | Always use `browser.runtime.getURL()` for all extension asset URLs; never hardcode scheme |
| Favicon set via extension URL silently ignored by Safari | Use `data:` URL for favicon; trigger reload with `history.replaceState(null, '', location.href)` |
| DNR redirects don't intercept cached requests | When debugging asset replacement, always test with `Develop → Empty Caches` in Safari |

---

## Debugging Guidelines (Lessons from OldTwitter Port)

- **Prefix all debug logs**: Use `[YTRedux DEBUG]` prefix on all temporary `console.log` lines — makes grepping and bulk-removal easy before shipping
- **Test cache-sensitive fixes with a visually obvious asset first**: When debugging image/favicon replacement, swap in a solid black square first to confirm the mechanism works before using the real asset. Separates "mechanism broken" from "asset too subtle to notice"
- **Clear cache before concluding a fix doesn't work**: Safari caches aggressively. `Develop → Empty Caches` before every test of resource replacement (images, icons, favicons). A working fix can look broken due to stale cache

---

## Reference

- Original extension: https://github.com/omnidevZero/YouTubeRedux
- Safari Web Extensions docs: https://developer.apple.com/documentation/safariservices/safari-web-extensions
- WebExtensions API compatibility: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Browser_support_for_JavaScript_APIs
- Converting Chrome extension to Safari: `xcrun safari-web-extension-converter` CLI tool (can scaffold the Xcode project from the Chrome extension directory)
