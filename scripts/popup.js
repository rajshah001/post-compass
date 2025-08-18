import { fetchAvailableModels, generatePlatformDrafts, PLATFORM_LIMITS } from './services/ai.js';
import { suggestCommunities } from './services/suggester.js';

const thoughtInput = document.getElementById('thoughtInput');
const modelSelect = document.getElementById('modelSelect');
const rewriteBtn = document.getElementById('rewriteBtn');

const platformDrafts = document.getElementById('platformDrafts');
const twitterTextEl = document.getElementById('twitterText');
const linkedinTextEl = document.getElementById('linkedinText');
const redditTextEl = document.getElementById('redditText');
const twitterCount = document.getElementById('twitterCount');
const linkedinCount = document.getElementById('linkedinCount');
const redditCount = document.getElementById('redditCount');

const copyTwitter = document.getElementById('copyTwitter');
const copyLinkedIn = document.getElementById('copyLinkedIn');
const copyReddit = document.getElementById('copyReddit');

const findBtn = document.getElementById('findBtn');
const suggestionsSection = document.getElementById('suggestionsSection');
const suggestionsList = document.getElementById('suggestionsList');

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
  const len = (el.textContent || '').length;
  countEl.textContent = `${len}/${limit}`;
  countEl.style.color = len > limit ? '#dc2626' : '';
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

async function initModels() {
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
    redditTextEl.textContent = drafts.reddit.text || '';

    updateCounter(twitterTextEl, twitterCount, PLATFORM_LIMITS.twitter);
    updateCounter(linkedinTextEl, linkedinCount, PLATFORM_LIMITS.linkedin);
    updateCounter(redditTextEl, redditCount, PLATFORM_LIMITS.reddit);

    platformDrafts.classList.remove('hidden');
  } catch (err) {
    console.error('Rewrite failed', err);
    platformDrafts.classList.add('hidden');
  } finally {
    setLoading(rewriteBtn, false);
  }
});

copyTwitter.addEventListener('click', async () => {
  const t = twitterTextEl.textContent.trim();
  if (!t) return;
  await navigator.clipboard.writeText(t);
  copyTwitter.textContent = 'Copied!';
  setTimeout(() => (copyTwitter.textContent = 'Copy'), 1200);
});

copyLinkedIn.addEventListener('click', async () => {
  const t = linkedinTextEl.textContent.trim();
  if (!t) return;
  await navigator.clipboard.writeText(t);
  copyLinkedIn.textContent = 'Copied!';
  setTimeout(() => (copyLinkedIn.textContent = 'Copy'), 1200);
});

copyReddit.addEventListener('click', async () => {
  const t = redditTextEl.textContent.trim();
  if (!t) return;
  await navigator.clipboard.writeText(t);
  copyReddit.textContent = 'Copied!';
  setTimeout(() => (copyReddit.textContent = 'Copy'), 1200);
});

findBtn.addEventListener('click', async () => {
  const combined = [twitterTextEl.textContent, linkedinTextEl.textContent, redditTextEl.textContent]
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


