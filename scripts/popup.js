import { fetchAvailableModels, generatePlatformDrafts, PLATFORM_LIMITS } from './services/ai.js';
import { suggestCommunities } from './services/suggester.js';

// Wait for DOM to be ready
function waitForElement(id, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.getElementById(id);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver((mutations, obs) => {
      const element = document.getElementById(id);
      if (element) {
        obs.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element with id '${id}' not found within ${timeout}ms`));
    }, timeout);
  });
}

// Initialize elements safely
let thoughtInput, modelSelect, rewriteBtn;
let platformDrafts, twitterTextEl, linkedinTextEl, redditTitleEl, redditBodyEl;
let twitterCount, linkedinCount, redditCounts;
let copyTwitter, copyLinkedIn, copyReddit;
let openTwitter, openLinkedIn, openReddit;
let findBtn, suggestionsSection, suggestionsList;
let historySection, historyList, clearHistoryBtn;

async function initializeElements() {
  try {
    thoughtInput = document.getElementById('thoughtInput');
    modelSelect = document.getElementById('modelSelect');
    rewriteBtn = document.getElementById('rewriteBtn');

    platformDrafts = document.getElementById('platformDrafts');
    twitterTextEl = document.getElementById('twitterText');
    linkedinTextEl = document.getElementById('linkedinText');
    redditTitleEl = document.getElementById('redditTitle');
    redditBodyEl = document.getElementById('redditBody');
    twitterCount = document.getElementById('twitterCount');
    linkedinCount = document.getElementById('linkedinCount');
    redditCounts = document.getElementById('redditCounts');

    copyTwitter = document.getElementById('copyTwitter');
    copyLinkedIn = document.getElementById('copyLinkedIn');
    copyReddit = document.getElementById('copyReddit');
    openTwitter = document.getElementById('openTwitter');
    openLinkedIn = document.getElementById('openLinkedIn');
    openReddit = document.getElementById('openReddit');

    findBtn = document.getElementById('findBtn');
    suggestionsSection = document.getElementById('suggestionsSection');
    suggestionsList = document.getElementById('suggestionsList');

    historySection = document.getElementById('historySection');
    historyList = document.getElementById('historyList');
    clearHistoryBtn = document.getElementById('clearHistory');

    // Verify critical elements exist
    if (!thoughtInput || !modelSelect || !rewriteBtn) {
      throw new Error('Critical UI elements not found');
    }
  } catch (error) {
    console.error('Failed to initialize elements:', error);
    throw error;
  }
}

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
      chrome.storage.local.get(['pc_model'], data => resolve(data.pc_model));
    } catch (_) {
      resolve(undefined);
    }
  });
}

async function setStoredModel(model) {
  return new Promise(resolve => {
    try {
      chrome.storage.local.set({ pc_model: model }, () => resolve());
    } catch (_) {
      resolve();
    }
  });
}

async function loadHistory() {
  return new Promise(resolve => {
    try {
      chrome.storage.local.get(['pc_history'], data => {
        const list = Array.isArray(data.pc_history) ? data.pc_history : [];
        resolve(list);
      });
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
      chrome.storage.local.set({ pc_history: list }, () => resolve());
    } catch (_) {
      resolve();
    }
  });
}

async function clearHistory() {
  return new Promise(resolve => {
    try {
      chrome.storage.local.set({ pc_history: [] }, () => resolve());
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
    // Add fallback option
    if (modelSelect) {
      modelSelect.innerHTML = '<option value="gpt-5-nano">gpt-5-nano</option>';
    }
  }
}



async function initHistory() {
  const history = await loadHistory();
  renderHistory(history);
}

// Initialize everything when DOM is ready
async function initialize() {
  try {
    await initializeElements();
    setupEventListeners();
    await initModels();
    await initHistory();
  } catch (error) {
    console.error('Failed to initialize popup:', error);
  }
}

function setupEventListeners() {
  if (!thoughtInput || !rewriteBtn) return;
  
  rewriteBtn.addEventListener('click', async () => {
    const raw = thoughtInput.value.trim();
    if (!raw) return;
    setLoading(rewriteBtn, true);
    try {
      const model = modelSelect?.value || 'gpt-5-nano';
      const drafts = await generatePlatformDrafts(raw, { model });

      if (twitterTextEl) twitterTextEl.textContent = drafts.twitter.text || '';
      if (linkedinTextEl) linkedinTextEl.textContent = drafts.linkedin.text || '';
      if (redditTitleEl) redditTitleEl.textContent = drafts.reddit.title || '';
      if (redditBodyEl) redditBodyEl.textContent = drafts.reddit.body || '';

      updateCounter(twitterTextEl, twitterCount, PLATFORM_LIMITS.twitter);
      updateCounter(linkedinTextEl, linkedinCount, PLATFORM_LIMITS.linkedin);
      updateRedditCounts();

      if (platformDrafts) platformDrafts.classList.remove('hidden');

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
      if (platformDrafts) platformDrafts.classList.add('hidden');
    } finally {
      setLoading(rewriteBtn, false);
    }
  });

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', async () => {
      await clearHistory();
      renderHistory([]);
    });
  }

  // Copy handlers
  if (copyTwitter) {
    copyTwitter.addEventListener('click', async () => {
      const t = twitterTextEl?.textContent?.trim();
      if (!t) return;
      await navigator.clipboard.writeText(t);
      copyTwitter.textContent = 'Copied!';
      setTimeout(() => (copyTwitter.textContent = 'Copy'), 1200);
    });
  }

  if (copyLinkedIn) {
    copyLinkedIn.addEventListener('click', async () => {
      const t = linkedinTextEl?.textContent?.trim();
      if (!t) return;
      await navigator.clipboard.writeText(t);
      copyLinkedIn.textContent = 'Copied!';
      setTimeout(() => (copyLinkedIn.textContent = 'Copy'), 1200);
    });
  }

  if (copyReddit) {
    copyReddit.addEventListener('click', async () => {
      const title = redditTitleEl?.textContent?.trim();
      const body = redditBodyEl?.textContent?.trim();
      const content = title ? `${title}\n\n${body}` : body;
      if (!content) return;
      await navigator.clipboard.writeText(content);
      copyReddit.textContent = 'Copied!';
      setTimeout(() => (copyReddit.textContent = 'Copy'), 1200);
    });
  }

  // Open handlers
  if (openTwitter) {
    openTwitter.addEventListener('click', async () => {
      const t = twitterTextEl?.textContent?.trim();
      if (!t) return;
      try { await navigator.clipboard.writeText(t); } catch (_) {}
      const url = `https://x.com/intent/tweet?text=${encodeURIComponent(t)}`;
      window.open(url, '_blank');
    });
  }

  if (openLinkedIn) {
    openLinkedIn.addEventListener('click', async () => {
      const t = linkedinTextEl?.textContent?.trim();
      if (!t) return;
      try { await navigator.clipboard.writeText(t); } catch (_) {}
      const url = `https://www.linkedin.com/shareArticle?mini=true&summary=${encodeURIComponent(t)}`;
      window.open(url, '_blank');
    });
  }

  if (openReddit) {
    openReddit.addEventListener('click', async () => {
      const title = redditTitleEl?.textContent?.trim();
      const body = redditBodyEl?.textContent?.trim();
      if (!title && !body) return;
      try { await navigator.clipboard.writeText(title ? `${title}\n\n${body}` : body); } catch (_) {}
      const url = `https://www.reddit.com/submit?selftext=true&title=${encodeURIComponent(title)}&text=${encodeURIComponent(body)}`;
      window.open(url, '_blank');
    });
  }

  if (findBtn) {
    findBtn.addEventListener('click', async () => {
      const combined = [twitterTextEl?.textContent, linkedinTextEl?.textContent, redditTitleEl?.textContent, redditBodyEl?.textContent]
        .filter(Boolean)
        .join(' ')
        .trim() || thoughtInput.value.trim();
      if (!combined) return;
      setLoading(findBtn, true);
      try {
        const suggestions = suggestCommunities(combined, 8);
        if (suggestionsList) {
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
        }
        if (suggestionsSection) suggestionsSection.classList.remove('hidden');
      } finally {
        setLoading(findBtn, false);
      }
    });
  }

  if (modelSelect) {
    modelSelect.addEventListener('change', async () => {
      const m = modelSelect.value;
      await setStoredModel(m);
    });
  }
}

async function initHistory() {
  const history = await loadHistory();
  renderHistory(history);
}

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}


