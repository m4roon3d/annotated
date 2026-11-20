# annotated — Commercial SaaS Architecture & Pricing Blueprint

## 1. Positioning & Value Proposition
- **Category**: Technical Learning & Verification Engine (not a generic "YouTube summarizer").
- **Target Buyers**: Software & Data Engineers, Technical Founders/PMs, CS/Engineering Students, and Engineering Teams (onboarding playlists).
- **Core Differentiators**:
  1. **Beyond the Video**: Live web grounding adds official docs, caveats, and what has changed since the video was recorded.
  2. **Zero Missed Links**: Automatically strips GitHub repos, papers, and tools from the video description and spoken content.
  3. **Retention Loop**: Converts passive watching into *Before → After* mental shifts, *When → Do* rules, and SM-2 spaced-repetition flashcards.

## 2. Recommended SaaS Architecture
- **Frontend**: Next.js (App Router) + Tailwind CSS (deployable on Vercel/Cloudflare Pages) reusing the annotated study UI.
- **Chrome Extension (Acquisition Wedge)**: Manifest V3 extension injecting a **"Study in annotated"** button on `youtube.com/watch` pages that opens `annotated.app/?url={videoUrl}`.
- **Backend API & Auth**:
  - **Auth & Database**: Supabase (Google OAuth + Postgres for `users`, `videos`, `insights`, `flashcards`, `collections`, `shared_pages`).
  - **YouTube Metadata & Transcript Worker**: Serverless function (Node/Python) fetching video metadata, chapters, description, and captions via YouTube Data API v3 + transcript extractor.
  - **AI & Web Enrichment**: Server-side Gemini (model list loaded from the `models` endpoint) in two passes: structured extraction from the video, then a Google Search–grounded web check whose citations back every caveat + Redis/DB caching by `video_id` so popular tutorials are served instantaneously at near-zero marginal cost.
- **Viral Growth Loop**:
  - Public read-only study URLs (`annotated.app/s/{slug}`) with OpenGraph preview cards and a *"Annotate your own video"* CTA.

## 3. Pricing & Packaging
| Tier | Price | Limits & Features | Target User |
| :--- | :--- | :--- | :--- |
| **Free** | $0 / mo | 3 videos/month, Insights, Link Stripping, Markdown Export | Trial & casual learners |
| **Pro** | $12 / mo | Unlimited videos, Live Web Docs & Caveats, Daily flashcard review, Obsidian/Anki Export, Cloud Sync | Engineers & students |
| **Team** | $29 / seat / mo | Shared topic collections, onboarding playlists, team annotations, SSO | Engineering & product teams |

## 4. Launch Checklist
1. Deploy landing page (`landing.html`) with waitlist/signup.
2. Publish Chrome Extension (`annotated-extension.zip`) to Chrome Web Store.
3. Seed 20 public study hubs for high-traffic engineering talks (GCP, Kubernetes, System Design, LLMs) for SEO & social sharing.
