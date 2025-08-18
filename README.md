# Post Compass (Chrome Extension)

Rewrite raw thoughts with AI and discover the best places to post them (Reddit subreddits and X/Twitter communities/hashtags).

## What it does

- Rewrite any rough thought with Pollinations AI for clarity and tone while keeping meaning intact.
- Generate uniquely crafted drafts per platform (X, LinkedIn, Reddit) with platform-aware style and limits.
- Recommend relevant communities to post to (X hashtags/communities and Reddit subreddits) based on the content.

## Install (Load Unpacked)

1. Open Chrome and go to `chrome://extensions/`.
2. Toggle on Developer mode.
3. Click "Load unpacked" and select this folder.
4. Pin the extension and click it to open the popup.

## Usage

- Select an AI model (fetched from Pollinations) in the dropdown.
- Type or paste your raw thought.
- Click "Rewrite with AI" to generate platform-specific drafts (X, LinkedIn, Reddit). Character counters show length vs limits.
- Click "Find Communities" to get suggested subreddits and X hashtags to reach the right audience.

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
The system prompt is tuned for virality and norms per platform:
- X: strong hook, <=256 chars, minimal hashtags, readable line breaks, engagement nudge.
- LinkedIn: professional, value-led, short paragraphs/bullets, 1–5 hashtags.
- Reddit: community-first, full context, no hashtags, minimal markdown, no clickbait.

## Platform limits
- X (Twitter): 256 characters
- LinkedIn: 3000 characters
- Reddit: 40000 characters

Limits are enforced after generation as a safeguard; prompts also instruct the model to comply.

## Communities suggestions
Static keyword→community mapping suggests relevant subreddits and X hashtags. See `scripts/services/suggester.js` and extend as needed.

## Environment variables / API keys

If you prefer OpenAI or another OpenAI-compatible provider:
- Update `scripts/services/ai.js` to pass `{ baseUrl, model, apiKey }` to `generatePlatformDrafts()` or replace the defaults.
- For OpenAI specifically:
  - baseUrl: `https://api.openai.com/v1`
  - model: e.g. `gpt-4o-mini`
  - apiKey: your OpenAI API key
- To store the key safely in the extension, add an Options page and persist to `chrome.storage.local` (not implemented in this MVP).

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

## Contributing / Git
After finishing a task, commit and push:

```bash
cd /Users/rajshah/Projects/pollinations-ai/post-compass
git add .
git commit -m "feat: model selection, per-platform drafts with limits, and community suggestions"
git push origin main
```

If you need to validate JSON with Python locally, create a benv first:

```bash
python3 -m venv /Users/rajshah/Projects/pollinations-ai/post-compass/benv
/Users/rajshah/Projects/pollinations-ai/post-compass/benv/bin/python - <<'PY'
import json, sys
json.load(open('manifest.json'))
print('manifest ok')
PY
```

