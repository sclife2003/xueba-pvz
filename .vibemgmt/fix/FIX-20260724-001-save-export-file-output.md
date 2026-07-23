---
type: fix
status: done
owner: DEV
created: 2026-07-24
resolution: completed
closed: 2026-07-24
---

# Fix: Create a real portable save file

## RCA

`exportSave()` only opened `window.prompt()` with an `XBPVZ1:` code. It did not create a Blob, download URL, or download anchor, so browsers had no file-output operation to perform.

## Resolution

- Added `downloadSaveFile(save)`, which produces `xueba-pvz-save-YYYYMMDD.json` containing a versioned portable payload and the complete schema v3 save.
- Retained the existing prompt code for backward-compatible copy/paste import.
- The blob URL is revoked after the download click.

## Verification

- `node scripts/verify_save_export.js`
- `python scripts/verify_save_export_browser.py`
- The Chromium browser regression received the download and parsed its JSON payload successfully.
