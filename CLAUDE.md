# annotated

Single-file web app (`index.html`), landing page and Chrome extension. See `docs/HANDOVER.md` for architecture.
The product name is always lowercase: annotated.

## Ship
target: github-pages
merge: on-"Merge"
checks: node -e "const h=require('fs').readFileSync('index.html','utf8');new Function(h.match(/<script>([\s\S]*)<\/script>/)[1])"
release:
preview: none (Pages deploys from main only)
