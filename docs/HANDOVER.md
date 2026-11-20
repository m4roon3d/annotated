# annotated — Hand-over (v2)

Formerly TubeDistill. The name is always written in lowercase, including at the start of a sentence (rephrase the sentence if that reads badly).

## What it is
Turns a YouTube tutorial into a study guide organised around three jobs:
- **Understand:** core thesis, before → after shifts, key insights, frameworks, verified quotes.
- **Act:** playbook checklist, code and commands, every link (tagged by where it came from), what's changed since recording (with sources), read next, learning path.
- **Retain:** flashcards on a spaced-repetition schedule (SM-2), with one daily review queue across the whole library, plus a quiz.
Also: Ask (chat grounded in the transcript), searchable transcript, timestamped notes, library search, multi-video compare, exports (Markdown, Obsidian, Anki CSV, JSON, print).

Removed in v2: knowledge graph, clips and highlight reel, audio brief, lens callout.

## Files
- `index.html`: the whole app. Plain HTML, CSS and JS (no Tailwind). Uses Lucide (pinned), plus Google Fonts (Literata, Schibsted Grotesk, JetBrains Mono).
- `landing.html`: marketing page. Set `APP_URL` and `WAITLIST_ENDPOINT` at the bottom.
- `extension/`: MV3 extension. Set `APP_BASE` in `content.js` and `popup.js`.

## Layout and shortcuts
- **Left:** the library (thumbnails, search, delete with Undo). Hide it with the button in its header or `[`. On phones it's a drawer that closes with its button, a tap outside, or Esc.
- **Centre:** the reading column. The sticky top bar shows the video title once you scroll. Tabs show live counts: insights, playbook progress, cards due.
- **Right:** player, notes and chapters. Hide it with `]`; clicking any timestamp brings it back. Under 1180px it moves into the column above the title.
- **Other shortcuts:** Ctrl/Cmd+K opens the command palette. In review, Space reveals the answer and 1–4 grade the card.
- Panel state is remembered in `td_rail_off` and `td_side_off`.

## Analysis pipeline (`analyzeVideo`)
1. Metadata comes from YouTube oEmbed, with noembed as a fallback.
2. **Extraction pass.** The transcript is sent if one was given; otherwise the video URL goes in as `file_data`. Output is JSON mode with a fixed schema, plus `researchTopics`. On a parse failure it retries once. No web access in this pass.
3. Post-processing:
   - Links are merged from the description (regex), the AI output and the transcript, deduplicated by normalised URL, and limited to `http`/`https`.
   - Quotes are kept only if they appear word for word in the transcript.
   - Insight and code timestamps snap to the best-matching transcript line within ±90 seconds.
4. **Web check pass.** Uses `google_search`, without JSON mode, so Gemini returns `groundingMetadata`. The model replies in line format (`CAVEAT|…`, `READ|…`, `PREREQ|…`, `NEXT|…`). Each line's sources come from `groundingSupports` → `groundingChunks`. Items without a source are shown as **No source found**.
5. `normalizeVideo()` validates and coerces everything, and also reads the v1 schema.

## Ask
Two source modes, remembered per browser (`td_ask_mode`, default `web`):
- **This video:** answers only from the transcript and analysis; says so when the video doesn't cover something.
- **Video + web:** adds `tools: [{ google_search: {} }]`. The video is context, not a limit. Sources come from `groundingMetadata.groundingChunks` and are shown under each answer.

Answers are Markdown, rendered by `renderMarkdown()`. It escapes everything first, then handles headings, bold and italics, lists, inline code, fenced code blocks (with Copy buttons), http(s) links and `[MM:SS]` timestamps.

The API key is sent in the `x-goog-api-key` header. The available model list is loaded from `GET /v1beta/models`.

## Storage
IndexedDB database `annotated`, store `kv`. Keys: `library`, `notes`, `checks`, `stars`, `srs`, `chats`, `quiz`, `reviewLog`, `seeded`.

localStorage holds only settings: `td_api_key`, `td_model`, `td_models`, `td_dark`, `td_last`. v1 localStorage data is migrated once, on first load.

The URL params `?url=` or `?v=` open the analyze dialog, and run it straight away when a key is set.

## Video schema (v2)
`id, url, title, channel, topic, lens, sourceLabel, analyzedAt, model, notesOnSource[], coreThesis, summary,
shifts[{before,after,timestamp,seconds}], insights[{id,category,title,body,timestamp,seconds}],
playbook[{id,when,do,priority:High|Normal,timestamp,seconds}], frameworks[{name,desc}],
code[{id,label,lang,snippet,timestamp,seconds}], links[{title,url,type,context,origin:description|spoken|video|web}],
caveats[{type,text,sources[{title,url}]}], furtherReading[{title,why,sources[],suggestedUrl}], webQueries[],
learningPath{prerequisites[],nextSteps[]}, quotes[{text,verified:true|null,timestamp,seconds}], chapters[], transcript[],
flashcards[{q,a,timestamp,seconds}], quiz[{q,options[],answer,explain}]`

SRS records are keyed `${videoId}:${hash(question)}`, so re-analysing a video keeps review history for any card whose question is unchanged.

## Next milestones
1. Thin backend (Cloudflare Worker or Supabase Edge Function): transcript and description auto-fetch, Gemini calls server-side, cache the neutral analysis per video ID, HEAD-check links.
2. Auth and sync (Supabase), then public share pages `/s/{slug}`, then Stripe.
3. Playlist / course mode.
