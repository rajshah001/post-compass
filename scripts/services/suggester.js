function norm(text) {
  return (text || '').toLowerCase();
}

function anyKeywordIn(text, keywords) {
  const t = norm(text);
  return keywords.some(k => t.includes(norm(k)));
}

const TOPIC_MAP = [
  {
    topic: 'ai',
    keywords: ['ai', 'artificial intelligence', 'gpt', 'llm', 'machine learning', 'deep learning', 'neural'],
    suggestions: [
      { platform: 'Reddit', type: 'subreddit', display: 'r/MachineLearning', url: 'https://www.reddit.com/r/MachineLearning/', reason: 'ML research and engineering audience' },
      { platform: 'Reddit', type: 'subreddit', display: 'r/singularity', url: 'https://www.reddit.com/r/singularity/', reason: 'AI progress and future trends' },
      { platform: 'X', type: 'hashtag', display: '#AI', url: 'https://x.com/hashtag/AI', reason: 'General AI hashtag for discovery' },
      { platform: 'X', type: 'hashtag', display: '#MachineLearning', url: 'https://x.com/hashtag/MachineLearning', reason: 'ML practitioners and researchers' }
    ]
  },
  {
    topic: 'startups',
    keywords: ['startup', 'founder', 'bootstrapped', 'saas', 'indie', 'micro-saas', 'funding'],
    suggestions: [
      { platform: 'Reddit', type: 'subreddit', display: 'r/startups', url: 'https://www.reddit.com/r/startups/', reason: 'Feedback and founder stories' },
      { platform: 'Reddit', type: 'subreddit', display: 'r/Entrepreneur', url: 'https://www.reddit.com/r/Entrepreneur/', reason: 'Business building and growth' },
      { platform: 'X', type: 'hashtag', display: '#buildinpublic', url: 'https://x.com/hashtag/buildinpublic', reason: 'Indie hacker audience' },
      { platform: 'X', type: 'hashtag', display: '#SaaS', url: 'https://x.com/hashtag/SaaS', reason: 'SaaS founders and operators' }
    ]
  },
  {
    topic: 'programming',
    keywords: ['code', 'coding', 'programming', 'javascript', 'typescript', 'python', 'react', 'nextjs', 'webdev', 'api'],
    suggestions: [
      { platform: 'Reddit', type: 'subreddit', display: 'r/programming', url: 'https://www.reddit.com/r/programming/', reason: 'General programming topics' },
      { platform: 'Reddit', type: 'subreddit', display: 'r/webdev', url: 'https://www.reddit.com/r/webdev/', reason: 'Web development community' },
      { platform: 'X', type: 'hashtag', display: '#DevCommunity', url: 'https://x.com/hashtag/DevCommunity', reason: 'Developer conversations' },
      { platform: 'X', type: 'hashtag', display: '#JavaScript', url: 'https://x.com/hashtag/JavaScript', reason: 'JS ecosystem audience' }
    ]
  },
  {
    topic: 'productivity',
    keywords: ['productivity', 'workflow', 'habit', 'focus', 'time management', 'deep work'],
    suggestions: [
      { platform: 'Reddit', type: 'subreddit', display: 'r/productivity', url: 'https://www.reddit.com/r/productivity/', reason: 'Systems and routines' },
      { platform: 'Reddit', type: 'subreddit', display: 'r/GetDisciplined', url: 'https://www.reddit.com/r/GetDisciplined/', reason: 'Accountability and habits' },
      { platform: 'X', type: 'hashtag', display: '#productivity', url: 'https://x.com/hashtag/productivity', reason: 'Productivity enthusiasts' },
      { platform: 'X', type: 'hashtag', display: '#TimeManagement', url: 'https://x.com/hashtag/TimeManagement', reason: 'Tips and discussions' }
    ]
  },
  {
    topic: 'design',
    keywords: ['design', 'ui', 'ux', 'user experience', 'interface', 'product design'],
    suggestions: [
      { platform: 'Reddit', type: 'subreddit', display: 'r/design', url: 'https://www.reddit.com/r/design/', reason: 'Design critiques and inspiration' },
      { platform: 'Reddit', type: 'subreddit', display: 'r/userexperience', url: 'https://www.reddit.com/r/userexperience/', reason: 'UX research and practice' },
      { platform: 'X', type: 'hashtag', display: '#ux', url: 'https://x.com/hashtag/ux', reason: 'UX conversations' },
      { platform: 'X', type: 'hashtag', display: '#Design', url: 'https://x.com/hashtag/Design', reason: 'Design news and showcases' }
    ]
  },
  {
    topic: 'science',
    keywords: ['science', 'research', 'biology', 'physics', 'chemistry', 'astronomy'],
    suggestions: [
      { platform: 'Reddit', type: 'subreddit', display: 'r/science', url: 'https://www.reddit.com/r/science/', reason: 'General science news' },
      { platform: 'Reddit', type: 'subreddit', display: 'r/askscience', url: 'https://www.reddit.com/r/askscience/', reason: 'Q&A and explanations' },
      { platform: 'X', type: 'hashtag', display: '#Science', url: 'https://x.com/hashtag/Science', reason: 'Science audience on X' },
      { platform: 'X', type: 'hashtag', display: '#SciComm', url: 'https://x.com/hashtag/SciComm', reason: 'Science communication' }
    ]
  }
];

export function suggestCommunities(text, max = 8) {
  if (!text) return [];
  const results = [];
  for (const entry of TOPIC_MAP) {
    if (anyKeywordIn(text, entry.keywords)) {
      results.push(...entry.suggestions);
    }
  }
  if (results.length === 0) {
    results.push(
      { platform: 'Reddit', type: 'subreddit', display: 'r/findareddit', url: 'https://www.reddit.com/r/findareddit/', reason: 'Ask for niche subreddit recommendations' },
      { platform: 'Reddit', type: 'subreddit', display: 'r/CasualConversation', url: 'https://www.reddit.com/r/CasualConversation/', reason: 'General audience feedback' },
      { platform: 'X', type: 'hashtag', display: '#AskTwitter', url: 'https://x.com/hashtag/AskTwitter', reason: 'Gather broad feedback on X' }
    );
  }
  // Deduplicate by URL and cap
  const seen = new Set();
  const unique = [];
  for (const s of results) {
    if (seen.has(s.url)) continue;
    seen.add(s.url);
    unique.push(s);
    if (unique.length >= max) break;
  }
  return unique;
}
