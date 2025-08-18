import { fetchAvailableModels, generatePlatformDrafts, PLATFORM_LIMITS } from './services/ai.js';
import { suggestCommunities } from './services/suggester.js';

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
const fillTwitter = document.getElementById('fillTwitter');
const fillLinkedIn = document.getElementById('fillLinkedIn');
const fillReddit = document.getElementById('fillReddit');

const navTwitter = document.getElementById('navTwitter');
const navLinkedIn = document.getElementById('navLinkedIn');
const navReddit = document.getElementById('navReddit');

const findBtn = document.getElementById('findBtn');
const suggestionsSection = document.getElementById('suggestionsSection');
const suggestionsList = document.getElementById('suggestionsList');

const historySection = document.getElementById('historySection');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistory');

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
  const len = (el.textContent || '').length;
  countEl.textContent = `${len}/${limit}`;
  countEl.style.color = len > limit ? '#dc2626' : '';
}

function updateRedditCounts() {
  if (!redditTitleEl || !redditBodyEl || !redditCounts) return;
  const titleLen = (redditTitleEl.textContent || '').length;
  const bodyLen = (redditBodyEl.textContent || '').length;
  redditCounts.textContent = `title ${titleLen}/${PLATFORM_LIMITS.redditTitle} • body ${bodyLen}/${PLATFORM_LIMITS.redditBody}`;
  redditCounts.style.color = (titleLen > PLATFORM_LIMITS.redditTitle || bodyLen > PLATFORM_LIMITS.redditBody) ? '#dc2626' : '';
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
      </div>
    `;
    li.querySelector('[data-action="restore"]').addEventListener('click', (e) => {
      e.preventDefault();
      thoughtInput.value = item.raw;
      twitterTextEl.textContent = item.drafts.twitter.text;
      linkedinTextEl.textContent = item.drafts.linkedin.text;
      redditTitleEl.textContent = item.drafts.reddit.title;
      redditBodyEl.textContent = item.drafts.reddit.body;
      updateCounter(twitterTextEl, twitterCount, PLATFORM_LIMITS.twitter);
      updateCounter(linkedinTextEl, linkedinCount, PLATFORM_LIMITS.linkedin);
      updateRedditCounts();
      platformDrafts.classList.remove('hidden');
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
    const drafts = await generatePlatformDrafts(raw, { model });

    twitterTextEl.textContent = drafts.twitter.text || '';
    linkedinTextEl.textContent = drafts.linkedin.text || '';
    redditTitleEl.textContent = drafts.reddit.title || '';
    redditBodyEl.textContent = drafts.reddit.body || '';

    updateCounter(twitterTextEl, twitterCount, PLATFORM_LIMITS.twitter);
    updateCounter(linkedinTextEl, linkedinCount, PLATFORM_LIMITS.linkedin);
    updateRedditCounts();

    platformDrafts.classList.remove('hidden');

    await saveHistory({
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      timestamp: Date.now(),
      model,
      raw,
      drafts
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
  const t = twitterTextEl.textContent.trim();
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
  const t = linkedinTextEl.textContent.trim();
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
  const title = redditTitleEl.textContent.trim();
  const body = redditBodyEl.textContent.trim();
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

// Fill handlers (DOM injection)
fillTwitter.addEventListener('click', async () => {
  const text = twitterTextEl.textContent.trim();
  if (!text) return;
  try {
    if (chrome?.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({ type: 'fillTwitter', text });
      fillTwitter.textContent = 'Filled!';
      setTimeout(() => (fillTwitter.textContent = 'Fill X'), 1200);
    } else {
      console.warn('Chrome runtime not available');
    }
  } catch (e) {
    console.error('Fill Twitter failed:', e);
    fillTwitter.textContent = 'Failed';
    setTimeout(() => (fillTwitter.textContent = 'Fill X'), 1200);
  }
});

fillLinkedIn.addEventListener('click', async () => {
  const text = linkedinTextEl.textContent.trim();
  if (!text) return;
  try {
    if (chrome?.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({ type: 'fillLinkedIn', text });
      fillLinkedIn.textContent = 'Filled!';
      setTimeout(() => (fillLinkedIn.textContent = 'Fill LinkedIn'), 1200);
    } else {
      console.warn('Chrome runtime not available');
    }
  } catch (e) {
    console.error('Fill LinkedIn failed:', e);
    fillLinkedIn.textContent = 'Failed';
    setTimeout(() => (fillLinkedIn.textContent = 'Fill LinkedIn'), 1200);
  }
});

fillReddit.addEventListener('click', async () => {
  const title = redditTitleEl.textContent.trim();
  const body = redditBodyEl.textContent.trim();
  if (!title && !body) return;
  try {
    if (chrome?.runtime?.sendMessage) {
      await chrome.runtime.sendMessage({ type: 'fillReddit', title, body });
      fillReddit.textContent = 'Filled!';
      setTimeout(() => (fillReddit.textContent = 'Fill Reddit'), 1200);
    } else {
      console.warn('Chrome runtime not available');
    }
  } catch (e) {
    console.error('Fill Reddit failed:', e);
    fillReddit.textContent = 'Failed';
    setTimeout(() => (fillReddit.textContent = 'Fill Reddit'), 1200);
  }
});

// Navigation handlers
navTwitter.addEventListener('click', () => {
  if (chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'navigate', url: 'https://x.com/compose/tweet' });
  }
});

navLinkedIn.addEventListener('click', () => {
  if (chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'navigate', url: 'https://www.linkedin.com/feed/' });
  }
});

navReddit.addEventListener('click', () => {
  if (chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'navigate', url: 'https://www.reddit.com/submit' });
  }
});

// Close sidebar
sidebarClose.addEventListener('click', () => {
  if (chrome?.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'closeSidebar' });
  }
});

findBtn.addEventListener('click', async () => {
  const combined = [twitterTextEl.textContent, linkedinTextEl.textContent, redditTitleEl.textContent, redditBodyEl.textContent]
    .filter(Boolean)
    .join(' ')
    .trim() || thoughtInput.value.trim();
  if (!combined) return;
  setLoading(findBtn, true);
  try {
    const suggestions = suggestCommunities(combined, 8);
    suggestionsList.innerHTML = '';
    for (const s of suggestions) {
      const li = document.createElement('li');
      li.innerHTML = `
        <div>
          <strong>${s.platform}</strong>: <a href="${s.url}" target="_blank" rel="noopener noreferrer">${s.display}</a>
          <div class="muted" style="margin-top:4px; font-size:12px;">${s.reason}</div>
        </div>
      `;
      suggestionsList.appendChild(li);
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
