# Rebuilding the README graphics

Wording lives in `content.mjs`; the drawings live in `build.mjs`. `lib.mjs` and `fonts/` are copied unchanged from github.com/janiyax35/janiyax35 (`scripts/`). Node 18+, no npm packages.

```bash
node .github/readme/build.mjs              # redraw .github/readme/assets/*.svg
python -m http.server 8091                 # from the repo root, then open:
# http://127.0.0.1:8091/.github/readme/preview.html
```

The build fails if an SVG goes over budget (60 KB, hero 40 KB) or uses a character the embedded fonts don't contain (ASCII plus `· – — ’ …` only). Screenshots in `screenshots/` are 1280×800 PNGs of the live platform. Never put flags, solutions or answer hints in any of these files.
