export const DEFAULTS = {
  baseUrl: 'https://text.pollinations.ai',
  defaultModel: 'gpt-5-nano',
  temperature: 0.5,
  maxTokens: 900
};

export const PLATFORM_LIMITS = {
  twitter: 256,
  linkedin: 3000,
  redditTitle: 300,
  redditBody: 40000
};

function buildSystemPrompt() {
  return (
    'You are an expert social media writing assistant for X (Twitter), LinkedIn, and Reddit. ' +
    'You know each platform\'s virality mechanics and ranking algorithms and will shape content accordingly.\n' +
    '\n' +
    'General principles:\n' +
    '- Preserve the original meaning and factual claims.\n' +
    '- Be engaging and natural. Avoid clickbait and false claims.\n' +
    '- Use plain language and strong hooks.\n' +
    '\n' +
    'Platform guidance:\n' +
    'X (Twitter):\n' +
    '- Max length 256 characters. Lead with a strong hook in the first line.\n' +
    '- Use short sentences and line breaks for scannability.\n' +
    '- Use 0–2 highly relevant hashtags. Avoid excessive emojis and links up front.\n' +
    '- Invite engagement with a concise question or call to action if appropriate.\n' +
    '\n' +
    'LinkedIn:\n' +
    '- Max length 3000 characters. Professional, value-led tone with concrete insights.\n' +
    '- Start with a punchy 1–2 line hook, then 2–6 short lines/paragraphs, optionally bullets.\n' +
    '- Use 1–5 relevant hashtags at the end. Avoid overly casual slang or excessive emojis.\n' +
    '- Encourage comments with a thoughtful question.\n' +
    '\n' +
    'Reddit:\n' +
    '- Title max length 300 characters. Make it descriptive, specific, and honest; avoid clickbait.\n' +
    '- Body max length 40000 characters. Provide context, avoid self-promotion; no hashtags.\n' +
    '- Write in a community-first, conversational tone; simple formatting (basic markdown OK).\n' +
    '\n' +
    'Return outputs that are platform-optimized and adhere to the above constraints.'
  );
}

function buildUserPrompt(rawText) {
  return (
    'Rewrite the following text into platform-specific drafts for X (Twitter), LinkedIn, and Reddit. ' +
    'Keep meaning intact and tailor for each platform\'s algorithm and norms.\n' +
    `Original text:\n${rawText}\n\n` +
    'Output STRICT JSON with keys "twitter", "linkedin", "reddit".\n' +
    '- twitter: { "text": string }\n' +
    '- linkedin: { "text": string }\n' +
    '- reddit: { "title": string, "body": string }\n' +
    'No extra commentary. Example format:\n' +
    '{"twitter": {"text": "..."}, "linkedin": {"text": "..."}, "reddit": {"title": "...", "body": "..."}}'
  );
}

function truncateToLimit(text, limit) {
  if (!text) return '';
  if (text.length <= limit) return text;
  const slice = text.slice(0, Math.max(0, limit - 1));
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return trimmed + '…';
}

function splitIntoRedditTitleBody(text) {
  const raw = (text || '').trim();
  if (!raw) return { title: '', body: '' };
  const firstLine = raw.split(/\n|[.!?]/)[0].trim();
  let title = firstLine || raw.slice(0, 120);
  let body = raw;
  if (raw.startsWith(firstLine)) {
    body = raw.slice(firstLine.length).trim();
  }
  title = truncateToLimit(title, PLATFORM_LIMITS.redditTitle);
  body = truncateToLimit(body, PLATFORM_LIMITS.redditBody);
  return { title, body };
}

function normalizeDrafts(drafts) {
  const twitterText = (drafts?.twitter?.text || '').trim();
  const linkedinText = (drafts?.linkedin?.text || '').trim();
  const redditTitle = (drafts?.reddit?.title || '').trim();
  const redditBody = (drafts?.reddit?.body || '').trim();
  return {
    twitter: { text: twitterText },
    linkedin: { text: linkedinText },
    reddit: { title: redditTitle, body: redditBody }
  };
}

async function callOpenAICompatible(baseUrl, model, userPrompt, systemPrompt, apiKey) {
  const url = `${baseUrl.replace(/\/$/, '')}/openai/chat/completions`;
  const body = {
    model,
    temperature: DEFAULTS.temperature,
    max_tokens: DEFAULTS.maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]
  };

  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`OpenAI-compatible endpoint failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty completion');

  try {
    const data = JSON.parse(content);
    const normalized = normalizeDrafts(data);
    // If reddit fields missing, derive from any text fallback
    if (!normalized.reddit.title && !normalized.reddit.body) {
      const derived = splitIntoRedditTitleBody(normalized.twitter.text || normalized.linkedin.text || content);
      normalized.reddit = derived;
    }
    return normalized;
  } catch (_) {
    const derived = splitIntoRedditTitleBody(content);
    return normalizeDrafts({ twitter: { text: content }, linkedin: { text: content }, reddit: derived });
  }
}

async function callSimpleTextEndpoint(baseUrl, prompt) {
  const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(prompt)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Text endpoint failed: ${res.status}`);
  const text = (await res.text()).trim();
  const reddit = splitIntoRedditTitleBody(text);
  return normalizeDrafts({ twitter: { text }, linkedin: { text }, reddit });
}

export async function fetchAvailableModels() {
  try {
    const res = await fetch(`${DEFAULTS.baseUrl.replace(/\/$/, '')}/models`);
    if (!res.ok) throw new Error(`models failed: ${res.status}`);
    const data = await res.json();
    if (Array.isArray(data)) {
      const names = data
        .filter(m => Array.isArray(m.output_modalities) ? m.output_modalities.includes('text') : true)
        .map(m => m?.name || m?.aliases || m?.original_name)
        .filter(Boolean);
      if (names.length) return names;
    }
    return [DEFAULTS.defaultModel];
  } catch (e) {
    console.warn('fetchAvailableModels error:', e);
    return [DEFAULTS.defaultModel];
  }
}

export async function generatePlatformDrafts(rawText, opts = {}) {
  const baseUrl = opts.baseUrl || DEFAULTS.baseUrl;
  const model = opts.model || DEFAULTS.defaultModel;
  const apiKey = opts.apiKey || undefined;

  const systemPrompt = buildSystemPrompt();
  const userPrompt = buildUserPrompt(rawText);

  let drafts;
  try {
    drafts = await callOpenAICompatible(baseUrl, model, userPrompt, systemPrompt, apiKey);
  } catch (_) {
    drafts = await callSimpleTextEndpoint(baseUrl, `${systemPrompt}\n\n${userPrompt}\n\nReturn only text.`);
  }

  drafts.twitter.text = truncateToLimit(drafts.twitter.text, PLATFORM_LIMITS.twitter);
  drafts.linkedin.text = truncateToLimit(drafts.linkedin.text, PLATFORM_LIMITS.linkedin);
  drafts.reddit.title = truncateToLimit(drafts.reddit.title, PLATFORM_LIMITS.redditTitle);
  drafts.reddit.body = truncateToLimit(drafts.reddit.body, PLATFORM_LIMITS.redditBody);

  return drafts;
}


