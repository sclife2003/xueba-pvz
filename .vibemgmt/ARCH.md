# Architecture: xueba

This project currently uses a no-build, single-file architecture:

- Runtime: browser HTML5 Canvas
- Entry point: `index.html`
- Assets: inline or local `assets/`
- Deployment: GitHub Pages

## Boundaries

- Project management state belongs under `.vibemgmt/`.
- Public runtime files stay at the repository root or under `assets/`.
- No framework or build step is introduced without a new decision record.

## Canonical References

- Current design source: `.vibemgmt/GDD_ADDENDUM_2026-06-13_strategy-depth.md`
- Research backlog: `.vibemgmt/RESEARCH_2026-06-14_kid-friendly-enrichment.md`
- QA and balance reviews: `.vibemgmt/reviews/`
