import { fetchAvailableModels, generatePlatformDrafts, PLATFORM_LIMITS, refinePlatformDraft, generateFromResearch } from './services/ai.js';
import { researchTopic } from './services/researcher.js';
import { suggestCommunitiesAI } from './services/suggester.js';

const thoughtInput = document.getElementById('thoughtInput');
const modelSelect = document.getElementById('modelSelect');
const rewriteBtn = document.getElementById('rewriteBtn');
const sidebarClose = document.getElementById('sidebarClose');

const platformDrafts = document.getElementById('platformDrafts');
const twitterTextEl = document.getElementById('twitterText');
const linkedinTextEl = document.getElementById('linkedinText');
const redditTitleEl = document.getElementById('redditTitle');
const redditBodyEl = document.getElementById('redditBody');
const twitterCount = document.getElementById('twitterCount');
const linkedinCount = document.getElementById('linkedinCount');
const redditCounts = document.getElementById('redditCounts');

const copyTwitter = document.getElementById('copyTwitter');
const copyLinkedIn = document.getElementById('copyLinkedIn');
const copyReddit = document.getElementById('copyReddit');
const twitterRefine = document.getElementById('twitterRefine');
const twitterRefineBtn = document.getElementById('twitterRefineBtn');
const twitterPrev = document.getElementById('twitterPrev');
const twitterNext = document.getElementById('twitterNext');
const linkedinRefine = document.getElementById('linkedinRefine');
const linkedinRefineBtn = document.getElementById('linkedinRefineBtn');
const linkedinPrev = document.getElementById('linkedinPrev');
const linkedinNext = document.getElementById('linkedinNext');
const redditRefine = document.getElementById('redditRefine');
const redditRefineBtn = document.getElementById('redditRefineBtn');
const redditPrev = document.getElementById('redditPrev');
const redditNext = document.getElementById('redditNext');

const navTwitter = document.getElementById('navTwitter');
const navLinkedIn = document.getElementById('navLinkedIn');
const navReddit = document.getElementById('navReddit');

const findBtn = document.getElementById('findBtn');
const suggestionsSection = document.getElementById('suggestionsSection');
const suggestionsList = document.getElementById('suggestionsList');
const researchCard = document.getElementById('researchCard');
const researchList = document.getElementById('researchList');

const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');
const composeView = document.getElementById('composeView');
const historyView = document.getElementById('historyView');
const tabCompose = document.getElementById('tabCompose');
const tabHistory = document.getElementById('tabHistory');
const toneSelect = document.getElementById('toneSelect');
let currentTone = 'Auto';
const versions = { twitter: [], linkedin: [], reddit: [] };
let versionIndex = { twitter: -1, linkedin: -1, reddit: -1 };
let currentSessionId = null;

function setLoading(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.dataset.label = button.textContent;
    button.textContent = 'Working…';
  } else {
    button.disabled = false;
    if (button.dataset.label) button.textContent = button.dataset.label;
  }
}

function updateCounter(el, countEl, limit) {
  if (!el || !countEl) return;
  const len = ('value' in el ? (el.value || '') : (el.textContent || '')).length;
  countEl.textContent = `${len}/${limit}`;
  if (len > limit) {
    countEl.style.color = '#dc2626';
  } else if (len > Math.floor(limit * 0.9)) {
    countEl.style.color = '#b45309';
  } else {
    countEl.style.color = '';
  }
}

function updateRedditCounts() {
  if (!redditTitleEl || !redditBodyEl || !redditCounts) return;
  const titleLen = (redditTitleEl.value || '').length;
  const bodyLen = (redditBodyEl.value || '').length;
  redditCounts.textContent = `title ${titleLen}/${PLATFORM_LIMITS.redditTitle} • body ${bodyLen}/${PLATFORM_LIMITS.redditBody}`;
  if (titleLen > PLATFORM_LIMITS.redditTitle || bodyLen > PLATFORM_LIMITS.redditBody) {
    redditCounts.style.color = '#dc2626';
  } else if (titleLen > Math.floor(PLATFORM_LIMITS.redditTitle * 0.9) || bodyLen > Math.floor(PLATFORM_LIMITS.redditBody * 0.9)) {
    redditCounts.style.color = '#b45309';
  } else {
    redditCounts.style.color = '';
  }
}

async function getStoredModel() {
  return new Promise(resolve => {
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.get(['pc_model'], data => resolve(data.pc_model));
      } else {
        resolve(undefined);
      }
    } catch (_) {
      resolve(undefined);
    }
  });
}

async function setStoredModel(model) {
  return new Promise(resolve => {
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.set({ pc_model: model }, () => resolve());
      } else {
        resolve();
      }
    } catch (_) {
      resolve();
    }
  });
}

async function loadHistory() {
  return new Promise(resolve => {
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.get(['pc_history'], data => {
          const list = Array.isArray(data.pc_history) ? data.pc_history : [];
          resolve(list);
        });
      } else {
        resolve([]);
      }
    } catch (_) {
      resolve([]);
    }
  });
}

async function saveHistory(entry) {
  const list = await loadHistory();
  list.unshift(entry);
  while (list.length > 50) list.pop();
  return new Promise(resolve => {
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.set({ pc_history: list }, () => resolve());
      } else {
        resolve();
      }
    } catch (_) {
      resolve();
    }
  });
}

async function updateHistoryEntryById(id, patch) {
  if (!id) return;
  try {
    if (!chrome?.storage?.local) return;
    chrome.storage.local.get(['pc_history'], data => {
      const list = Array.isArray(data.pc_history) ? data.pc_history : [];
      const idx = list.findIndex(it => it.id === id);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...patch };
        chrome.storage.local.set({ pc_history: list }, () => {});
      }
    });
  } catch (_) {
    // ignore
  }
}

function getDraftsFromUI() {
  return {
    twitter: { text: (twitterTextEl.value || '').trim() },
    linkedin: { text: (linkedinTextEl.value || '').trim() },
    reddit: { title: (redditTitleEl.value || '').trim(), body: (redditBodyEl.value || '').trim() }
  };
}

function serializeVersions() {
  return {
    twitter: [...versions.twitter],
    linkedin: [...versions.linkedin],
    reddit: versions.reddit.map(v => ({ title: v.title, body: v.body }))
  };
}

async function clearHistory() {
  return new Promise(resolve => {
    try {
      if (chrome?.storage?.local) {
        chrome.storage.local.set({ pc_history: [] }, () => resolve());
      } else {
        resolve();
      }
    } catch (_) {
      resolve();
    }
  });
}

function renderHistory(items) {
  historyList.innerHTML = '';
  if (!items.length) {
    historySection.classList.add('hidden');
    return;
  }
  for (const item of items) {
    const li = document.createElement('li');
    const date = new Date(item.timestamp).toLocaleString();
    li.innerHTML = `
      <div style="font-size:12px;" class="muted">${date} • ${item.model}</div>
      <div style="margin-top:4px; white-space:pre-wrap;">${item.raw}</div>
      <div style="margin-top:6px;">
        <a href="#" data-action="restore" class="muted" style="font-size:12px;">Restore drafts</a>
        ${item?.versions ? '<span class="muted" style="font-size:12px; margin-left:8px;">with refinements</span>' : ''}
      </div>
    `;
    li.querySelector('[data-action="restore"]').addEventListener('click', (e) => {
      e.preventDefault();
      thoughtInput.value = item.raw;
      twitterTextEl.value = item.drafts.twitter.text;
      linkedinTextEl.value = item.drafts.linkedin.text;
      redditTitleEl.value = item.drafts.reddit.title;
      redditBodyEl.value = item.drafts.reddit.body;
      updateCounter(twitterTextEl, twitterCount, PLATFORM_LIMITS.twitter);
      updateCounter(linkedinTextEl, linkedinCount, PLATFORM_LIMITS.linkedin);
      updateRedditCounts();
      platformDrafts.classList.remove('hidden');
      if (item.versions && item.versions.twitter && item.versions.linkedin && item.versions.reddit) {
        versions.twitter = [...item.versions.twitter];
        versions.linkedin = [...item.versions.linkedin];
        versions.reddit = item.versions.reddit.map(v => ({ title: v.title, body: v.body }));
        versionIndex.twitter = versions.twitter.length ? versions.twitter.length - 1 : -1;
        versionIndex.linkedin = versions.linkedin.length ? versions.linkedin.length - 1 : -1;
        versionIndex.reddit = versions.reddit.length ? versions.reddit.length - 1 : -1;
        updateVersionButtons();
      } else {
        setInitialVersions(item.drafts);
        updateVersionButtons();
      }
      currentSessionId = item.id || null;
      switchToCompose();
    });
    historyList.appendChild(li);
  }
  historySection.classList.remove('hidden');
}

async function initModels() {
  if (!modelSelect) return;
  try {
    const models = await fetchAvailableModels();
    const stored = await getStoredModel();
    modelSelect.innerHTML = '';
    for (const m of models) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      modelSelect.appendChild(opt);
    }
    const initial = stored && models.includes(stored) ? stored : models[0];
    if (initial) modelSelect.value = initial;
    if (initial && initial !== stored) await setStoredModel(initial);
  } catch (error) {
    console.error('Failed to initialize models:', error);
    if (modelSelect) {
      modelSelect.innerHTML = '<option value="gpt-5-nano">gpt-5-nano</option>';
    }
  }
}

rewriteBtn.addEventListener('click', async () => {
  const raw = thoughtInput.value.trim();
  if (!raw) return;
  setLoading(rewriteBtn, true);
  try {
    const model = modelSelect.value;
    // Step 1: research
    const research = await researchTopic(raw, { maxPerSource: 6 });
    researchList.innerHTML = '';
    for (const it of research) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="${it.url}" target="_blank" rel="noopener noreferrer">[${it.source}] ${it.title}</a>`;
      researchList.appendChild(li);
    }
    if (research.length) researchCard.classList.remove('hidden'); else researchCard.classList.add('hidden');

    // Step 2: generate using research + topic
    const drafts = await generateFromResearch(raw, research, { model, tone: currentTone });

    const toText = (v) => (typeof v === 'string' ? v : (v && typeof v.text === 'string' ? v.text : ''));
    const toReddit = (v) => ({
      title: (v && typeof v.title === 'string') ? v.title : '',
      body: (v && typeof v.body === 'string') ? v.body : ''
    });

    // Defensive normalization in case model returns raw JSON string
    const coerceText = (val) => {
      if (typeof val === 'string') {
        // Strip obvious JSON-like wrappers
        if (val.trim().startsWith('{') || val.trim().startsWith('[')) {
          try {
            const obj = JSON.parse(val);
            return toText(obj.twitter || obj.linkedin || obj) || val;
          } catch { /* leave as-is */ }
        }
        return val;
      }
      return toText(val);
    };
    const coerceReddit = (val) => {
      if (typeof val === 'string') {
        try { const obj = JSON.parse(val); return toReddit(obj.reddit || obj); } catch { return { title: '', body: val }; }
      }
      return toReddit(val);
    };

    const twitterDraft = coerceText(drafts.twitter);
    const linkedinDraft = coerceText(drafts.linkedin);
    const redditDraft = coerceReddit(drafts.reddit);

    twitterTextEl.value = twitterDraft;
    linkedinTextEl.value = linkedinDraft;
    redditTitleEl.value = redditDraft.title;
    redditBodyEl.value = redditDraft.body;

    updateCounter(twitterTextEl, twitterCount, PLATFORM_LIMITS.twitter);
    updateCounter(linkedinTextEl, linkedinCount, PLATFORM_LIMITS.linkedin);
    updateRedditCounts();

    platformDrafts.classList.remove('hidden');

    // initialize version stacks on first generate
    setInitialVersions(drafts);
    updateVersionButtons();

    currentSessionId = crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
    await saveHistory({
      id: currentSessionId,
      timestamp: Date.now(),
      model,
      raw,
      drafts,
      versions: serializeVersions()
    });

    const history = await loadHistory();
    renderHistory(history);
  } catch (err) {
    console.error('Rewrite failed', err);
    platformDrafts.classList.add('hidden');
  } finally {
    setLoading(rewriteBtn, false);
  }
});

clearHistoryBtn.addEventListener('click', async () => {
  await clearHistory();
  renderHistory([]);
});

// Copy handlers
copyTwitter.addEventListener('click', async () => {
  const t = (twitterTextEl.value || '').trim();
  if (!t) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(t);
  } else {
    console.warn('Clipboard API not available');
  }
  copyTwitter.textContent = 'Copied!';
  setTimeout(() => (copyTwitter.textContent = 'Copy'), 1200);
});

copyLinkedIn.addEventListener('click', async () => {
  const t = (linkedinTextEl.value || '').trim();
  if (!t) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(t);
  } else {
    console.warn('Clipboard API not available');
  }
  copyLinkedIn.textContent = 'Copied!';
  setTimeout(() => (copyLinkedIn.textContent = 'Copy'), 1200);
});

copyReddit.addEventListener('click', async () => {
  const title = (redditTitleEl.value || '').trim();
  const body = (redditBodyEl.value || '').trim();
  const content = title ? `${title}\n\n${body}` : body;
  if (!content) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(content);
  } else {
    console.warn('Clipboard API not available');
  }
  copyReddit.textContent = 'Copied!';
  setTimeout(() => (copyReddit.textContent = 'Copy'), 1200);
});

// Versioning helpers
function setInitialVersions(drafts){
  versions.twitter = [drafts.twitter.text]; versionIndex.twitter = 0;
  versions.linkedin = [drafts.linkedin.text]; versionIndex.linkedin = 0;
  versions.reddit = [{title: drafts.reddit.title, body: drafts.reddit.body}]; versionIndex.reddit = 0;
}
function pushVersion(platform, value){
  const stack = versions[platform];
  stack.push(value); while (stack.length>10) stack.shift();
  versionIndex[platform] = stack.length-1;
  updateVersionButtons();
}
function showVersion(platform, delta){
  const stack = versions[platform]; if(!stack.length) return;
  versionIndex[platform] = Math.max(0, Math.min(stack.length-1, versionIndex[platform]+delta));
  const v = stack[versionIndex[platform]];
  if(platform==='twitter'){ twitterTextEl.value = v; updateCounter(twitterTextEl, twitterCount, PLATFORM_LIMITS.twitter); }
  else if(platform==='linkedin'){ linkedinTextEl.value = v; updateCounter(linkedinTextEl, linkedinCount, PLATFORM_LIMITS.linkedin); }
  else { redditTitleEl.value = v.title; redditBodyEl.value = v.body; updateRedditCounts(); }
  updateVersionButtons();
}

function updateVersionButtons(){
  const setState = (platform, prevBtn, nextBtn) => {
    const stack = versions[platform];
    const idx = versionIndex[platform];
    const has = stack.length > 0;
    if (!has) {
      prevBtn.disabled = true; nextBtn.disabled = true; return;
    }
    prevBtn.disabled = idx <= 0;
    nextBtn.disabled = idx >= stack.length - 1;
  };
  if (twitterPrev && twitterNext) setState('twitter', twitterPrev, twitterNext);
  if (linkedinPrev && linkedinNext) setState('linkedin', linkedinPrev, linkedinNext);
  if (redditPrev && redditNext) setState('reddit', redditPrev, redditNext);
}

// Refine handlers
twitterRefineBtn.addEventListener('click', async () => {
  const current = (twitterTextEl.value||'').trim(); if(!current) return;
  setLoading(twitterRefineBtn,true);
  try{
    const model = modelSelect.value;
    const refined = await refinePlatformDraft('twitter', current, (twitterRefine.value||'').trim(), thoughtInput.value.trim(), { model, tone: currentTone });
    twitterTextEl.value = refined.text || current; updateCounter(twitterTextEl, twitterCount, PLATFORM_LIMITS.twitter); pushVersion('twitter', twitterTextEl.value);
    await updateHistoryEntryById(currentSessionId, { drafts: getDraftsFromUI(), versions: serializeVersions() });
  } finally { setLoading(twitterRefineBtn,false);} 
});
linkedinRefineBtn.addEventListener('click', async () => {
  const current = (linkedinTextEl.value||'').trim(); if(!current) return;
  setLoading(linkedinRefineBtn,true);
  try{
    const model = modelSelect.value;
    const refined = await refinePlatformDraft('linkedin', current, (linkedinRefine.value||'').trim(), thoughtInput.value.trim(), { model, tone: currentTone });
    linkedinTextEl.value = refined.text || current; updateCounter(linkedinTextEl, linkedinCount, PLATFORM_LIMITS.linkedin); pushVersion('linkedin', linkedinTextEl.value);
    await updateHistoryEntryById(currentSessionId, { drafts: getDraftsFromUI(), versions: serializeVersions() });
  } finally { setLoading(linkedinRefineBtn,false);} 
});
redditRefineBtn.addEventListener('click', async () => {
  const current = { title: (redditTitleEl.value||'').trim(), body: (redditBodyEl.value||'').trim() }; if(!current.title && !current.body) return;
  setLoading(redditRefineBtn,true);
  try{
    const model = modelSelect.value;
    const refined = await refinePlatformDraft('reddit', current, (redditRefine.value||'').trim(), thoughtInput.value.trim(), { model, tone: currentTone });
    redditTitleEl.value = refined.title || current.title; redditBodyEl.value = refined.body || current.body; updateRedditCounts(); pushVersion('reddit', {title: redditTitleEl.value, body: redditBodyEl.value});
    await updateHistoryEntryById(currentSessionId, { drafts: getDraftsFromUI(), versions: serializeVersions() });
  } finally { setLoading(redditRefineBtn,false);} 
});
twitterPrev.addEventListener('click', ()=>showVersion('twitter',-1));
twitterNext.addEventListener('click', ()=>showVersion('twitter',+1));
linkedinPrev.addEventListener('click', ()=>showVersion('linkedin',-1));
linkedinNext.addEventListener('click', ()=>showVersion('linkedin',+1));
redditPrev.addEventListener('click', ()=>showVersion('reddit',-1));
redditNext.addEventListener('click', ()=>showVersion('reddit',+1));

// Navigation handlers - open URLs in current tab
navTwitter.addEventListener('click', () => {
  if (chrome?.tabs?.query && chrome?.tabs?.update) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { url: 'https://x.com/compose/tweet' });
      }
    });
  }
});

navLinkedIn.addEventListener('click', () => {
  if (chrome?.tabs?.query && chrome?.tabs?.update) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { url: 'https://www.linkedin.com/feed/' });
      }
    });
  }
});

navReddit.addEventListener('click', () => {
  if (chrome?.tabs?.query && chrome?.tabs?.update) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { url: 'https://www.reddit.com/submit' });
      }
    });
  }
});

// Close sidebar (Chrome will handle this natively)
sidebarClose.addEventListener('click', () => {
  window.close();
});

findBtn.addEventListener('click', async () => {
  const combined = [twitterTextEl.value, linkedinTextEl.value, redditTitleEl.value, redditBodyEl.value]
    .filter(Boolean)
    .join(' ')
    .trim() || thoughtInput.value.trim();
  if (!combined) return;
  setLoading(findBtn, true);
  try {
    const model = modelSelect.value;
    const ai = await suggestCommunitiesAI(combined, { model });
    suggestionsList.innerHTML = '';
    if ((ai.hashtags || []).length) {
      const h = document.createElement('li');
      h.innerHTML = `<div><strong>X Hashtags</strong></div>`;
      const ul = document.createElement('ul');
      for (const tag of ai.hashtags) {
        const li = document.createElement('li');
        const url = `https://x.com/hashtag/${encodeURIComponent(tag.tag.replace('#',''))}`;
        li.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${tag.tag}</a> <span class="muted">${Math.round((tag.score||0)*100)}%</span><div class="muted" style="font-size:12px;">${tag.reason||''}</div>`;
        ul.appendChild(li);
      }
      h.appendChild(ul);
      suggestionsList.appendChild(h);
    }
    if ((ai.subreddits || []).length) {
      const h = document.createElement('li');
      h.innerHTML = `<div><strong>Reddit Subreddits</strong></div>`;
      const ul = document.createElement('ul');
      for (const sr of ai.subreddits) {
        const li = document.createElement('li');
        const url = `https://www.reddit.com/${sr.name.replace(/^\/?/, '')}`;
        li.innerHTML = `<a href="${url}" target="_blank" rel="noopener noreferrer">${sr.name}</a> <span class="muted">${Math.round((sr.score||0)*100)}%</span><div class="muted" style="font-size:12px;">${sr.reason||''}</div>`;
        ul.appendChild(li);
      }
      h.appendChild(ul);
      suggestionsList.appendChild(h);
    }
    suggestionsSection.classList.remove('hidden');
  } finally {
    setLoading(findBtn, false);
  }
});

modelSelect.addEventListener('change', async () => {
  const m = modelSelect.value;
  await setStoredModel(m);
});

// Initialize
initModels();
loadHistory().then(renderHistory);

// Live counters on edit and tone control
twitterTextEl.addEventListener('input', () => updateCounter(twitterTextEl, twitterCount, PLATFORM_LIMITS.twitter));
linkedinTextEl.addEventListener('input', () => updateCounter(linkedinTextEl, linkedinCount, PLATFORM_LIMITS.linkedin));
redditTitleEl.addEventListener('input', updateRedditCounts);
redditBodyEl.addEventListener('input', updateRedditCounts);
if (toneSelect) toneSelect.addEventListener('change', () => { currentTone = toneSelect.value; });

function switchToCompose(){ composeView.classList.remove('hidden'); historyView.classList.add('hidden'); }
function switchToHistory(){ composeView.classList.add('hidden'); historyView.classList.remove('hidden'); }
if (tabCompose) tabCompose.addEventListener('click', () => { switchToCompose(); tabCompose.setAttribute('aria-selected','true'); tabHistory.setAttribute('aria-selected','false'); });
if (tabHistory) tabHistory.addEventListener('click', async () => { const history = await loadHistory(); renderHistory(history); switchToHistory(); tabHistory.setAttribute('aria-selected','true'); tabCompose.setAttribute('aria-selected','false'); });
