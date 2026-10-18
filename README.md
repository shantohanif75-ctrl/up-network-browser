# Up Network Browser

A Windows desktop browser starter focused on privacy-friendly defaults.

## Requirements
- Node.js 20 or newer
- Windows 10/11 (recommended for packaging)

## Run locally
```powershell
npm install
npm run dev
```

## Build Windows installer
```powershell
npm install
npm run dist:win
```
The installer output is written to `release/`.

## Current status
This is an early development starter. The dashboard and secure Electron shell are included.
Profile management, per-profile proxy configuration, tracker filtering, history/bookmarks and download management are planned follow-up features and are not yet implemented.

## Security notes
- Renderer Node integration is disabled.
- Context isolation and renderer sandboxing are enabled.
- External links opened by `window.open` are sent to the system browser only for HTTP(S).
- This starter is not a full Chromium browser replacement. Do not use it as a security boundary for sensitive activity until it has been audited.
