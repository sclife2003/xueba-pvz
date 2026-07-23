#!/usr/bin/env python3
"""Browser regression for the non-disruptive release-update dialog."""

from __future__ import annotations

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
    errors: list[str] = []
    with sync_playwright() as playwright:
        browser = launch_browser(playwright)
        page = browser.new_page(viewport={"width": 1280, "height": 720})
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.route(
            "**/version.json",
            lambda route: route.fulfill(
                status=200,
                content_type="application/json",
                body='{"buildId":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}',
            ),
        )
        page.goto(f"{base_url}/index.html", wait_until="networkidle")

        dialog = page.get_by_role("dialog")
        dialog.wait_for(state="visible")
        dismiss = dialog.get_by_role("button", name="稍後")
        confirm = dialog.get_by_role("button", name="立即更新")
        dismiss.wait_for(state="visible")
        assert dismiss.evaluate("element => document.activeElement === element")
        canvas_state = page.locator("#gameCanvas").evaluate(
            "element => ({ inert: element.inert, hidden: element.getAttribute('aria-hidden') })"
        )
        assert canvas_state == {"inert": True, "hidden": "true"}

        page.keyboard.press("Tab")
        assert confirm.evaluate("element => document.activeElement === element")
        page.keyboard.press("Tab")
        assert dismiss.evaluate("element => document.activeElement === element")
        page.keyboard.press("Shift+Tab")
        assert confirm.evaluate("element => document.activeElement === element")

        page.keyboard.press("Escape")
        dialog.wait_for(state="hidden")
        assert page.locator("#gameCanvas").evaluate(
            "element => !element.inert && element.getAttribute('aria-hidden') === null && document.activeElement === element"
        )
        assert not errors, "unexpected browser errors: " + " | ".join(errors)
        browser.close()

    print("Update modal accessibility browser regression verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
