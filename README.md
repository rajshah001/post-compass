# Post Compass (Chrome Extension)

AI-powered content creation for X, LinkedIn, and Reddit with native Chrome sidebar interface and direct DOM injection.

## What it does

- **Native Sidebar**: Click the extension icon to open Chrome's built-in sidebar with full functionality
- **AI Rewriting**: Generate platform-specific drafts optimized for each platform's algorithms and character limits
- **Direct Fill**: DOM injection to autofill composers on X, LinkedIn, and Reddit without opening new tabs
- **Smart Navigation**: "Go to" buttons navigate to compose pages while keeping the sidebar open
- **Community Discovery**: Find relevant X hashtags and Reddit subreddits based on your content
- **History**: Local storage of all past thoughts and generated drafts with restore functionality

## Features

### Native Chrome Sidebar
- Uses Chrome's sidePanel API for seamless integration
- Opens by clicking the extension icon in the toolbar
- Stays open while browsing and navigating between sites
- Native Chrome UI with proper window management

### Platform-Specific Content
- **X (Twitter)**: 256 chars, engagement-focused with hashtags
- **LinkedIn**: 3000 chars, professional tone with value-driven content  
- **Reddit**: Separate title (300 chars) and body (40000 chars), community-first approach

### Direct Autofill
- **Fill X**: Injects text directly into X's tweet composer
- **Fill LinkedIn**: Clicks "Start a post" and fills the editor
- **Fill Reddit**: Fills both title and body fields on submit pages

## Usage

1. Click the Post Compass extension icon in Chrome's toolbar
2. The sidebar opens with the full interface
3. Write your thought and click "Rewrite with AI"
4. Use "Fill [Platform]" buttons to inject content directly into composers
5. Or use "Go to [Platform]" to navigate to compose pages
6. Review and post manually

## Technical Implementation

- **Chrome sidePanel API**: Native sidebar integration (Chrome 114+)
- **DOM Injection**: Multiple selector fallbacks for robust field detection
- **Cross-Platform**: Works on X, LinkedIn, and Reddit
- **Storage**: History and preferences in `chrome.storage.local`
