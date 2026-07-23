#!/usr/bin/env python3
"""Browser regression proving save export creates a downloadable JSON file."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


def launch_browser(playwright):
    candidates = (
        {"channel": "chrome"},
        {"channel": "msedge"},
        {"executable_path": r"C:\Program Files\Google\Chrome\Application\chrome.exe"},
        {"executable_path": r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"},
    )
    errors = []
    for options in candidates:
        executable = options.get("executable_path")
        if executable and not Path(executable).exists():
            continue
        try:
            return playwright.chromium.launch(headless=True, **options)
        except PlaywrightError as error:
            errors.append(str(error).splitlines()[0])
    raise RuntimeError("unable to launch Chromium: " + " | ".join(errors))


def main() -> int:
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4185"
    with sync_playwright() as playwright:
        browser = launch_browser(playwright)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.on("dialog", lambda dialog: dialog.accept())
        page.goto(f"{base_url}/index.html", wait_until="networkidle")
        with page.expect_download(timeout=10_000) as download_info:
            page.evaluate("exportSave()")
        download = download_info.value
        assert download.suggested_filename.startswith("xueba-pvz-save-")
        assert download.suggested_filename.endswith(".json")
        download_path = download.path()
        assert download_path is not None
        payload = json.loads(Path(download_path).read_text(encoding="utf-8"))
        assert payload["format"] == "xueba-pvz-save"
        assert payload["version"] == 1
        assert payload["save"]["schemaVersion"] == 3
        browser.close()

    print("Save export browser download regression verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
