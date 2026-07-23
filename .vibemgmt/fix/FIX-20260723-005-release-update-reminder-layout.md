---
type: fix
status: done
owner: DEV
created: 2026-07-23
ticket: TICKET-20260723-002
findings:
  - QA-20260723-003
  - UX-20260723-001
  - UX-20260723-002
  - UX-20260724-001
resolution: completed
closed: 2026-07-24
---

# Fix: Rearm and clarify the release update prompt

## RCA

### Reproduce

Dismiss only clears UI state, the monitor never rearms the same build, and the bottom overlay covers safe-phase controls on narrow screens. The confirm CTA contrast is below WCAG AA.

### Localize

`createReleaseMonitor()`, runtime update wiring, and `renderUpdatePrompt()` in `index.html`.

### Deduce

The monitor has no snooze lifecycle and the prompt is visually non-modal while intercepting controls like a modal.

## Fix Plan

- Add a timed dismiss/snooze API and re-prompt after the polling interval.
- Present the prompt as an explicit accessible modal in safe phases.
- Raise CTA contrast to at least 4.5:1.
- Add executable lifecycle, semantics, and contrast regressions.

## Verification

- `node scripts/verify_release_contracts.js`
- `node scripts/verify_mobile_interactions.js`

## Resolution

- The safe-phase update dialog now owns focus, traps Tab / Shift+Tab, marks all UI and the game canvas inert, supports Escape dismissal, and restores focus after closing.
- The release monitor keeps its existing snooze/rearm and safe-phase protections; no storage/auth/save key is cleared.
- Fresh evidence: `node scripts/verify_release_contracts.js` and `python scripts/verify_update_modal_a11y.py` pass, including a real Chromium focus-cycle regression.
