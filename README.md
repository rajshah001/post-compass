# Post Compass (Chrome Extension)

Rewrite raw thoughts with AI and discover the best places to post them (Reddit subreddits and X/Twitter communities/hashtags).

## What it does

- Rewrite any rough thought with Pollinations AI for clarity and tone while keeping meaning intact.
- Generate uniquely crafted drafts per platform (X, LinkedIn, Reddit) with platform-aware style and limits.
- Recommend relevant communities to post to (X hashtags/communities and Reddit subreddits) based on the content.
- One-click open to compose screens on X, LinkedIn, and Reddit with your finalized text prefilled for quick manual posting.

## Install (Load Unpacked)

1. Open Chrome and go to `chrome://extensions/`.
2. Toggle on Developer mode.
3. Click "Load unpacked" and select this folder.
4. Pin the extension and click it to open the popup.

## Usage

- Select an AI model (fetched from Pollinations) in the dropdown.
- Paste your raw thought and click "Rewrite with AI" to generate platform-specific drafts (X, LinkedIn, Reddit). Character counters are shown.
- Click "Find Communities" for suggested subreddits and X hashtags.
- When ready, click "Open X", "Open LinkedIn", or "Open Reddit" to open the corresponding compose page with the text prefilled. Review and click Post on the site.

### Prefill details
- X (Twitter): uses `https://x.com/intent/tweet?text=...`.
- LinkedIn: uses the share interface. LinkedIn has limited official support for text-only prefill; we provide a best-effort share URL so you can paste/review as needed.
- Reddit: uses `https://www.reddit.com/submit?selftext=...` (choose subreddit on the site).

## Tech

- Manifest V3 (service worker background)
- HTML/CSS/Vanilla JS (no build step)
- Modular services: `scripts/services/ai.js` (AI), `scripts/services/suggester.js` (communities)

## AI Integration (Pollinations)

- Base URL: `https://text.pollinations.ai`
- Chat Completions endpoint: `/openai/chat/completions`
- Models list endpoint: `/models` (used for the model dropdown)
- Default model: `gpt-4o-mini-uncensored`
- No API key is required for Pollinations at the time of writing.

If the OpenAI-compatible endpoint is unavailable, the extension falls back to a simple text endpoint at `https://text.pollinations.ai/{prompt}` and applies local adjustments.

### System prompt
Tuned per platform:
- X: strong hook, <=256 chars, minimal hashtags, readable line breaks, engagement nudge.
- LinkedIn: professional, value-led, short paragraphs/bullets, 1–5 hashtags.
- Reddit: community-first, full context, no hashtags, minimal markdown, no clickbait.

## Platform limits
- X (Twitter): 256 characters
- LinkedIn: 3000 characters
- Reddit: 40000 characters

## Communities suggestions
Static keyword→community mapping suggests relevant subreddits and X hashtags. See `scripts/services/suggester.js` and extend as needed.

## Environment variables / API keys
If you prefer OpenAI or another OpenAI-compatible provider, adjust `scripts/services/ai.js` to pass `{ baseUrl, model, apiKey }` to `generatePlatformDrafts()`.

## File layout
```
post-compass/
├─ manifest.json
├─ popup.html
├─ styles/
│  └─ popup.css
├─ scripts/
│  ├─ popup.js
│  ├─ background.js
│  ├─ content.js
│  └─ services/
│     ├─ ai.js
│     └─ suggester.js
└─ README.md
```

## Permissions
- `host_permissions`: `https://text.pollinations.ai/*` — allow AI calls and model listing
- `storage`, `activeTab`, `scripting` — baseline MV3 permissions
