export const DEFAULTS = {
  baseUrl: 'https://text.pollinations.ai',
  defaultModel: 'gpt-5-nano',
  temperature: 0.5,
  maxTokens: 700
};

export const PLATFORM_LIMITS = {
  twitter: 256,
  linkedin: 3000,
  reddit: 40000
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
    '- Max length 40000 characters. Community-first, conversational, and specific.\n' +
    '- Provide full context and avoid self-promotion; no hashtags.\n' +
    '- Keep formatting simple (basic markdown acceptable), no clickbait.\n' +
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
    'Each key maps to an object: { "text": string }.\n' +
    'No extra commentary. Example format:\n' +
    '{"twitter": {"text": "..."}, "linkedin": {"text": "..."}, "reddit": {"text": "..."}}'
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

function normalizeDrafts(drafts) {
  return {
    twitter: { text: (drafts?.twitter?.text || '').trim() },
    linkedin: { text: (drafts?.linkedin?.text || '').trim() },
    reddit: { text: (drafts?.reddit?.text || '').trim() }
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
    return normalizeDrafts(data);
  } catch (_) {
    const shared = content;
    return normalizeDrafts({ twitter: { text: shared }, linkedin: { text: shared }, reddit: { text: shared } });
  }
}

async function callSimpleTextEndpoint(baseUrl, prompt) {
  const url = `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(prompt)}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Text endpoint failed: ${res.status}`);
  const text = (await res.text()).trim();
  return normalizeDrafts({ twitter: { text }, linkedin: { text }, reddit: { text } });
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
  drafts.reddit.text = truncateToLimit(drafts.reddit.text, PLATFORM_LIMITS.reddit);

  return drafts;
}


