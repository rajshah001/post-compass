# Post Compass (Chrome Extension)

Rewrite raw thoughts with AI and discover the best places to post them (Reddit subreddits and X/Twitter communities/hashtags).

## What it does

- Rewrite any rough thought with Pollinations AI for clarity and tone while keeping meaning intact.
- Generate uniquely crafted drafts per platform (X, LinkedIn, Reddit) with platform-aware style and limits.
- Reddit output includes a separate Title (<=300 chars) and Body (<=40000 chars), shown with counters.
- Recommend relevant communities to post to (X hashtags/communities and Reddit subreddits) based on the content.
- One-click open to compose screens on X, LinkedIn, and Reddit with your finalized text prefilled for quick manual posting.
- Keeps a local history (last 50) of your inputs and generated drafts.
- On X/LinkedIn/Reddit pages, shows a floating "PC" button in the bottom-right to open the extension quickly.

## Usage

- Select a model → write a thought → "Rewrite with AI".
- Review X/LinkedIn drafts and Reddit Title/Body with live counters.
- Click "Open X", "Open LinkedIn", or "Open Reddit" to prefill compose; on Reddit, both title and body are passed.
- Use History to restore past items; use "Find Communities" for suggestions.

## Platform limits
- X (Twitter): 256 characters
- LinkedIn: 3000 characters
- Reddit: Title 300, Body 40000

Notes
- LinkedIn prefill is limited; full text is copied to clipboard as fallback.
- History stored in `chrome.storage.local`.
