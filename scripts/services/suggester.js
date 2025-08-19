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

export async function suggestCommunitiesAI(text, opts = {}) {
  if (!text) return { hashtags: [], subreddits: [] };
  const baseUrl = (opts.baseUrl || 'https://text.pollinations.ai').replace(/\/$/, '');
  const model = opts.model || 'gpt-5-nano';
  const system = `You suggest highly relevant X hashtags and Reddit subreddits for a given content idea. Return strict JSON with two arrays: 
  - hashtags: items like {"tag": "#3DPrinting", "score": 0.91, "reason": "why"}
  - subreddits: items like {"name": "r/3Dprinting", "score": 0.88, "reason": "why"}
Rank by score descending. Prefer specificity over generic. Include 3-6 items per array if possible.`;
  const user = `Content:\n${text}\n\nReturn only JSON.`;

  try {
    const res = await fetch(`${baseUrl}/openai/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    });
    if (!res.ok) throw new Error(`pollinations failed: ${res.status}`);
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content?.trim();
    if (!content) throw new Error('empty content');
    const data = JSON.parse(content);
    const hashtags = Array.isArray(data.hashtags) ? data.hashtags : [];
    const subreddits = Array.isArray(data.subreddits) ? data.subreddits : [];
    // Normalize fields
    const normHash = hashtags
      .map(h => ({
        tag: (h.tag || h.hashtag || h.name || '').toString().startsWith('#') ? (h.tag || h.hashtag || h.name) : `#${h.tag || h.hashtag || h.name}`,
        score: typeof h.score === 'number' ? h.score : 0.5,
        reason: h.reason || ''
      }))
      .filter(h => h.tag && h.tag.length <= 40)
      .slice(0, 8);
    const normSubs = subreddits
      .map(s => ({
        name: (s.name || s.subreddit || '').toString().startsWith('r/') ? (s.name || s.subreddit) : `r/${s.name || s.subreddit}`,
        score: typeof s.score === 'number' ? s.score : 0.5,
        reason: s.reason || ''
      }))
      .filter(s => s.name && s.name.length <= 50)
      .slice(0, 8);
    // Sort by score
    normHash.sort((a, b) => b.score - a.score);
    normSubs.sort((a, b) => b.score - a.score);
    return { hashtags: normHash, subreddits: normSubs };
  } catch (e) {
    console.warn('suggestCommunitiesAI fallback due to error:', e);
    // Graceful fallback to static
    return { hashtags: [], subreddits: [] };
  }
}

// Backward-compat exported name (no longer used in UI)
export function suggestCommunities() { return []; }
