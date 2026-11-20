# annotated — Hand-over (v2)

Formerly TubeDistill. The name is always written in lowercase, including at the start of a sentence (rephrase the sentence if that reads badly).

## What it is
Turns a YouTube tutorial into a study guide organised around three jobs:
- **Understand:** core thesis, before → after shifts, key insights, frameworks, verified quotes.
- **Act:** playbook checklist, code and commands, every link (tagged by where it came from), what's changed since recording (with sources), read next, learning path.
- **Retain:** flashcards on a spaced-repetition schedule (SM-2), with one daily review queue across the whole library, plus a quiz.
Also: Ask (chat grounded in the transcript), searchable transcript, timestamped notes, library search, multi-video compare, exports (Markdown, Obsidian, Anki CSV, JSON, print).

Removed in v2: knowledge graph, clips and highlight reel, audio brief, lens callout, and the reader personas (replaced by automatic content-type detection).
Combine: select videos in the library, then **Combine** writes one Markdown cheat sheet (Gemini, or a local merge without a key).

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

## Extension hand-off
- The extension fetches YouTube's watch page (same origin) and reads `ytInitialPlayerResponse`: title, channel, full description, length and caption tracks. It then fetches the caption track as VTT; this is best effort, and YouTube sometimes returns nothing.
- It opens the app with `#td=` + URI-encoded JSON `{ v: 1, items: [{ id, title, channel, description, lengthSeconds, isShort, transcript }] }`. The fragment never reaches a server.
- One item opens the analyze dialog and starts straight away when a key is set. Several items go into the **Saved to analyze** list (IndexedDB `queue`) for one-click batch analysis.
- On watch pages the buttons are **Study in annotated** and **Save**; on Shorts they sit in a floating bar. The popup can study or save the current video and send the whole saved list.
- `?url=` still works for links from the landing page.

## Content types
There are no personas. The extraction pass sets `contentType` (Tutorial, Talk, Podcast, Interview, Explainer, Review, News, Short tip, Other), `topic` (used as the collection) and `speakers`, and shapes its output to match.
- Videos of 3 minutes or less, or any `/shorts/` link, get a compact result.
- Videos over 20 minutes without a transcript are read at `MEDIA_RESOLUTION_LOW`. If a video of unknown length turns out too long, the call is retried at low detail.

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

Suggested questions are specific to each video:
- **New analyses** store `questions.video` and `questions.web` from the extraction pass.
- **Older videos** get them from one small Gemini call the first time the Ask tab opens; they're then saved.
- **Without a key**, questions are built from the video's insights, commands and links (`localQuestions`).
- **After each answer**, Gemini adds a "Follow-ups:" line, which is removed from the answer text and shown as chips (`splitFollowups`).

Answers are Markdown, rendered by `renderMarkdown()`. It escapes everything first, then handles headings, bold and italics, lists, inline code, fenced code blocks (with Copy buttons), http(s) links and `[MM:SS]` timestamps.

The API key is sent in the `x-goog-api-key` header. The available model list is loaded from `GET /v1beta/models`.

## Retain and library organisation
- **Card kinds:** flashcards carry a `kind`: `fact` (tutorials), `idea` and `who` (podcasts and talks), or `apply` (a prompt to use the idea, whose answer is a suggestion). How many cards depends on content type: news gets at most 1, Shorts 1.
- **Pruning:**
  - "Don't show this card again" sets `srs[key].suspended`, with Undo; it can also be said aloud in hands-free mode.
  - The Retain tab has an "Include in Today's review" switch (`retainOff[videoId]`, stored in IndexedDB) and a per-card keep list.
  - New cards per day defaults to 10 (`td_new_per_day`).
- **Collections:**
  - Extraction is given the existing collection names and asked to reuse one.
  - **Organize** (sparkles icon) re-sorts every video whose collection you didn't set yourself, with Undo.
  - Editing or renaming a collection marks it as yours (`topicByUser`).
  - The library can be grouped by collection, by type or by recent; collapsed groups are remembered in `td_collapsed`.

## Voice
- **Spoken recap (Understand tab):** Gemini writes a script for listening, then text-to-speech records it.
  - Model `gemini-3.8-flash-tts` with `speechConfig.voiceConfig.voice`. The older `prebuiltVoiceConfig` format is the fallback, then any `*tts*` model the key lists.
  - Raw PCM output is wrapped as WAV. The script is cached on the video (`recapScript`) and the audio in IndexedDB (`audio:<id>`).
  - With the browser voice, `speechSynthesis` reads the script instead.
- **Hands-free review (Today and Retain):** reads the question, pauses 6 seconds, reads the answer, then listens for "again", "hard", "good" or "easy" (also "say that again" and "stop"). Tapping a grade also continues. Esc stops. The next card's audio is fetched ahead of time.
- **Dictation:** mic buttons in Ask (one phrase, sent automatically, answer read aloud) and Notes (continuous, captures the player time). Uses the browser's speech recognition. Hidden where unsupported, which includes Firefox.
- **Settings:** `td_voice` (`gemini` or `browser`) and `td_voice_name` (Kore, Puck, Charon, Aoede, Fenrir, Leda, Orus, Zephyr).

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
