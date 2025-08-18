# Post Compass (Chrome Extension)

AI-powered content creation for X, LinkedIn, and Reddit with persistent sidebar interface and direct DOM injection.

## What it does

- **Persistent Sidebar**: Click the floating "PC" button on X/LinkedIn/Reddit to open a sidebar that stays open while navigating.
- **AI Rewriting**: Generate platform-specific drafts optimized for each platform's algorithms and character limits.
- **Direct Fill**: DOM injection to autofill composers on X, LinkedIn, and Reddit without opening new tabs.
- **Smart Navigation**: "Go to" buttons navigate to compose pages in the same tab while keeping the sidebar open.
- **Community Discovery**: Find relevant X hashtags and Reddit subreddits based on your content.
- **History**: Local storage of all past thoughts and generated drafts with restore functionality.

## Features

### Sidebar Interface
- Persistent UI that stays open while browsing X/LinkedIn/Reddit
- Toggle visibility with the floating "PC" button (top-right corner)
- Navigate between platforms without losing your drafts

### Platform-Specific Content
- **X (Twitter)**: 256 chars, engagement-focused with hashtags
- **LinkedIn**: 3000 chars, professional tone with value-driven content  
- **Reddit**: Separate title (300 chars) and body (40000 chars), community-first approach

### Direct Autofill
- **Fill X**: Injects text directly into X's tweet composer
- **Fill LinkedIn**: Clicks "Start a post" and fills the editor
- **Fill Reddit**: Fills both title and body fields on submit pages

## Usage

1. Visit X, LinkedIn, or Reddit
2. Click the floating "PC" button to open the sidebar
3. Write your thought and click "Rewrite with AI"
4. Use "Fill [Platform]" buttons to inject content directly into composers
5. Or use "Go to [Platform]" to navigate to compose pages
6. Review and post manually

## Technical Implementation

- **Sidebar**: Injected iframe with full extension UI
- **DOM Injection**: Multiple selector fallbacks for robust field detection
- **Cross-Platform**: Unified interface works across all target sites
- **Storage**: History and preferences in `chrome.storage.local`
