function safeFetchJson(url) {
  return fetch(url, { method: 'GET' })
    .then(res => (res.ok ? res.json() : Promise.reject(new Error(`fetch failed ${res.status}`))))
    .catch(() => null);
}

function safeFetchText(url) {
  return fetch(url, { method: 'GET' })
    .then(res => (res.ok ? res.text() : Promise.reject(new Error(`fetch failed ${res.status}`))))
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
  // Use proxy for Reddit to avoid CORS
  const redditUrl = `https://r.jina.ai/http://www.reddit.com/search.json?q=${query}&sort=hot&t=week&limit=${Math.min(maxPerSource, 10)}`;
  // Use r.jina.ai as a permissive proxy to avoid CORS for Google News and X
  const gnewsUrl = `https://r.jina.ai/http://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
  const xSearchUrl = `https://r.jina.ai/http://x.com/search?q=${query}&src=typed_query&f=live`;

  const [hnJson, redditText, gnewsText, xText] = await Promise.all([
    safeFetchJson(hnUrl),
    safeFetchText(redditUrl),
    safeFetchText(gnewsUrl),
    safeFetchText(xSearchUrl)
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

  let redditJson = null;
  if (redditText) {
    try { redditJson = JSON.parse(redditText); } catch (_) { redditJson = null; }
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

  // Parse Google News RSS via proxy (XML text)
  if (gnewsText) {
    try {
      const doc = new DOMParser().parseFromString(gnewsText, 'text/xml');
      const nodes = Array.from(doc.querySelectorAll('item')).slice(0, maxPerSource);
      for (const it of nodes) {
        const title = (it.querySelector('title')?.textContent || '').trim();
        const link = (it.querySelector('link')?.textContent || '').trim();
        const pubDate = (it.querySelector('pubDate')?.textContent || '').trim();
        const ts = pubDate ? Date.parse(pubDate) : Date.now();
        if (title && link) {
          items.push({ source: 'GoogleNews', title, url: normalizeUrl(link), score: 0.6, createdAt: ts });
        }
      }
    } catch (_) { /* ignore */ }
  }

  // Heuristic parse of X search page text via proxy; extract frequent hashtags
  if (xText) {
    const tags = {};
    const regex = /#([a-zA-Z0-9_]{2,30})/g;
    let m;
    while ((m = regex.exec(xText)) !== null) {
      const tag = `#${m[1]}`;
      tags[tag] = (tags[tag] || 0) + 1;
    }
    const topTags = Object.entries(tags)
      .sort((a,b) => b[1]-a[1])
      .slice(0, Math.min(5, maxPerSource))
      .map(([t,c]) => t);
    if (topTags.length) {
      items.push({
        source: 'X',
        title: `Trending hashtags: ${topTags.join(' ')}`,
        url: normalizeUrl(`https://x.com/search?q=${query}`),
        score: 0.5,
        createdAt: Date.now()
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


