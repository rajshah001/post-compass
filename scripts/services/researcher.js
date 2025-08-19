function safeFetchJson(url) {
  return fetch(url, { method: 'GET' })
    .then(res => (res.ok ? res.json() : Promise.reject(new Error(`fetch failed ${res.status}`))))
    .catch(() => null);
}

function normalizeUrl(url) {
  try { return new URL(url).toString(); } catch { return url; }
}

export async function researchTopic(topic, opts = {}) {
  const query = encodeURIComponent(topic.trim());
  const days = opts.days || 7;
  const maxPerSource = opts.maxPerSource || 6;
  const sinceUnix = Math.floor(Date.now() / 1000) - days * 86400;

  const hnUrl = `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=${maxPerSource}&numericFilters=created_at_i>${sinceUnix}`;
  const redditUrl = `https://www.reddit.com/search.json?q=${query}&sort=hot&t=week&limit=${Math.min(maxPerSource, 10)}`;

  const [hnJson, redditJson] = await Promise.all([
    safeFetchJson(hnUrl),
    safeFetchJson(redditUrl)
  ]);

  const items = [];

  if (hnJson && Array.isArray(hnJson.hits)) {
    for (const h of hnJson.hits) {
      items.push({
        source: 'HackerNews',
        title: h.title || '',
        url: normalizeUrl(h.url || `https://news.ycombinator.com/item?id=${h.objectID}`),
        score: Number(h.points || 0),
        createdAt: Number(new Date(h.created_at).getTime() || Date.now())
      });
    }
  }

  if (redditJson && redditJson.data && Array.isArray(redditJson.data.children)) {
    for (const c of redditJson.data.children) {
      const d = c.data || {};
      if (d.is_self && !d.url) continue;
      items.push({
        source: 'Reddit',
        title: d.title || '',
        url: normalizeUrl(d.url || `https://www.reddit.com${d.permalink || ''}`),
        score: Number(d.ups || d.score || 0),
        createdAt: Number((d.created_utc || 0) * 1000)
      });
    }
  }

  // Deduplicate by URL
  const seen = new Set();
  const unique = [];
  for (const it of items) {
    const key = it.url.split('?')[0];
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(it);
  }

  // Sort by recency and score combined
  unique.sort((a, b) => (b.score + b.createdAt / 1e11) - (a.score + a.createdAt / 1e11));

  return unique.slice(0, maxPerSource * 2);
}


