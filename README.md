# annotated

Turns a YouTube tutorial into a study guide you keep. You get the core idea, what to do differently, every link and command from the video, and flashcards that come back for review.

## What's here

| Path | What it is |
| --- | --- |
| `index.html` | The app: one self-contained page. Open it in a browser or host it on any static site. |
| `landing.html` | Marketing page with a waitlist form. |
| `extension/` | Chrome extension (Manifest V3) that adds a "Study in annotated" button under YouTube videos. |
| `docs/HANDOVER.md` | Architecture, data schema, analysis pipeline and roadmap. |
| `docs/saas_blueprint.md` | Commercial plan and pricing. |

## Live

- App: https://m4roon3d.github.io/annotated/
- Landing page: https://m4roon3d.github.io/annotated/landing.html
- Extension download: https://m4roon3d.github.io/annotated/annotated-extension.zip

Every push to `main` redeploys the site through `.github/workflows/pages.yml`.

## Run it

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Add a Gemini API key from [Google AI Studio](https://aistudio.google.com) under the settings at the bottom left. The key is stored only in your browser. Without a key, you can still paste a transcript for a basic extraction.

## Configuration

- `APP_BASE` in `extension/content.js` and `extension/popup.js` points at the GitHub Pages app. Change both if you move to your own domain.
- `WAITLIST_ENDPOINT` in `landing.html` is empty until you connect a form service.

## Load the extension locally

1. Go to `chrome://extensions` and turn on Developer mode.
2. Click **Load unpacked** and choose the `extension` folder.
