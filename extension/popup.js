/**
 * Focus Gate — popup.js
 * Handles the toolbar popup UI: site list management, category tagging,
 * the manual on/off toggle (with reason gate), schedule controls, and
 * live streak/stats display.
 *
 * Copyright (c) 2026 Lady Alana
 * GitHub: @ladyalana808
 * Licensed under the MIT License. See LICENSE for details.
 */

const siteInput = document.getElementById('siteInput');
const addBtn = document.getElementById('addBtn');
const quickAddBtn = document.getElementById('quickAddBtn');
const categorySelect = document.getElementById('categorySelect');
const siteList = document.getElementById('siteList');
const emptyMsg = document.getElementById('emptyMsg');
const masterToggle = document.getElementById('masterToggle');
const statusLabel = document.getElementById('statusLabel');
const statusSub = document.getElementById('statusSub');
const scheduleToggle = document.getElementById('scheduleToggle');
const scheduleSub = document.getElementById('scheduleSub');
const scheduleFields = document.getElementById('scheduleFields');
const startTime = document.getElementById('startTime');
const endTime = document.getElementById('endTime');
const dayButtons = document.querySelectorAll('.day-btn');
const streakNum = document.getElementById('streakNum');
const bestNum = document.getElementById('bestNum');
const totalNum = document.getElementById('totalNum');
const reasonOverlay = document.getElementById('reasonOverlay');
const reasonInput = document.getElementById('reasonInput');
const reasonError = document.getElementById('reasonError');
const reasonCancel = document.getElementById('reasonCancel');
const reasonConfirm = document.getElementById('reasonConfirm');

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DEFAULT_SCHEDULE = {
  enabled: false,
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 2, 3, 4, 5]
};

const CATEGORY_LABELS = {
  social: 'Social',
  shopping: 'Shopping',
  news: 'News',
  entertainment: 'Video',
  other: 'Other'
};

// Normalizes old-format entries (plain domain strings) into {domain, category} objects
function normalizeSiteEntry(entry) {
  if (typeof entry === 'string') {
    return { domain: entry, category: 'other' };
  }
  return entry;
}

function normalizeDomain(raw) {
  let d = raw.trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '');
  d = d.replace(/^www\./, '');
  d = d.split('/')[0];
  return d;
}

function isWithinSchedule(schedule) {
  if (!schedule.enabled) return false;
  const now = new Date();
  const day = now.getDay();
  if (!schedule.days.includes(day)) return false;

  const [startH, startM] = schedule.startTime.split(':').map(Number);
  const [endH, endM] = schedule.endTime.split(':').map(Number);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  }
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

function summarizeSchedule(schedule) {
  if (!schedule.enabled) return 'Off';
  const dayLabels = schedule.days
    .slice()
    .sort((a, b) => a - b)
    .map((d) => DAY_NAMES[d])
    .join(', ');
  const dayText = dayLabels || 'no days selected';
  return `${schedule.startTime}\u2013${schedule.endTime}, ${dayText}`;
}

function render() {
  chrome.storage.sync.get(['sites', 'enabled', 'schedule', 'stats'], (data) => {
    const sites = (data.sites || []).map(normalizeSiteEntry);
    const enabled = !!data.enabled;
    const schedule = Object.assign({}, DEFAULT_SCHEDULE, data.schedule || {});
    const stats = Object.assign({ total: 0, currentStreak: 0, longestStreak: 0 }, data.stats || {});

    streakNum.textContent = stats.currentStreak;
    bestNum.textContent = stats.longestStreak;
    totalNum.textContent = stats.total;

    masterToggle.checked = enabled;
    statusLabel.textContent = enabled ? 'Blocking is on' : 'Blocking is off';
    statusSub.textContent = enabled
      ? 'Listed sites will redirect to your reminder page'
      : 'Sites on your list load normally';

    scheduleToggle.checked = schedule.enabled;
    scheduleSub.textContent = summarizeSchedule(schedule);
    scheduleFields.classList.toggle('disabled', !schedule.enabled);
    startTime.value = schedule.startTime;
    endTime.value = schedule.endTime;
    dayButtons.forEach((btn) => {
      const day = parseInt(btn.dataset.day, 10);
      btn.classList.toggle('active', schedule.days.includes(day));
    });

    siteList.innerHTML = '';
    emptyMsg.style.display = sites.length ? 'none' : 'block';

    sites.forEach((site) => {
      const li = document.createElement('li');

      const info = document.createElement('div');
      info.className = 'site-info';

      const name = document.createElement('span');
      name.className = 'site-name';
      name.textContent = site.domain;

      const tag = document.createElement('span');
      tag.className = 'cat-tag';
      tag.textContent = CATEGORY_LABELS[site.category] || 'Other';

      info.appendChild(name);
      info.appendChild(tag);

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.onclick = () => {
        const updated = sites.filter((s) => s.domain !== site.domain);
        chrome.storage.sync.set({ sites: updated }, () => {
          chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
          render();
        });
      };

      li.appendChild(info);
      li.appendChild(removeBtn);
      siteList.appendChild(li);
    });
  });
}

function saveSchedule(patch) {
  chrome.storage.sync.get(['schedule'], (data) => {
    const schedule = Object.assign({}, DEFAULT_SCHEDULE, data.schedule || {}, patch);
    chrome.storage.sync.set({ schedule }, () => {
      chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
      render();
    });
  });
}

scheduleToggle.addEventListener('change', () => {
  saveSchedule({ enabled: scheduleToggle.checked });
});

startTime.addEventListener('change', () => {
  saveSchedule({ startTime: startTime.value });
});

endTime.addEventListener('change', () => {
  saveSchedule({ endTime: endTime.value });
});

dayButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    chrome.storage.sync.get(['schedule'], (data) => {
      const schedule = Object.assign({}, DEFAULT_SCHEDULE, data.schedule || {});
      const day = parseInt(btn.dataset.day, 10);
      const days = schedule.days.includes(day)
        ? schedule.days.filter((d) => d !== day)
        : schedule.days.concat([day]);
      saveSchedule({ days });
    });
  });
});

addBtn.addEventListener('click', () => {
  const domain = normalizeDomain(siteInput.value);
  if (!domain) return;
  const category = categorySelect.value;
  chrome.storage.sync.get(['sites'], (data) => {
    const sites = (data.sites || []).map(normalizeSiteEntry);
    if (!sites.some((s) => s.domain === domain)) {
      const updated = sites.concat([{ domain, category }]);
      chrome.storage.sync.set({ sites: updated }, () => {
        chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
        siteInput.value = '';
        render();
      });
    } else {
      siteInput.value = '';
    }
  });
});

siteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addBtn.click();
});

quickAddBtn.addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url) return;
    try {
      const url = new URL(tab.url);
      if (!url.protocol.startsWith('http')) {
        siteInput.placeholder = "Can't grab this kind of page";
        return;
      }
      siteInput.value = normalizeDomain(url.hostname);
      siteInput.focus();
    } catch (e) {
      siteInput.placeholder = "Couldn't read this tab";
    }
  });
});

masterToggle.addEventListener('change', () => {
  if (masterToggle.checked) {
    // Turning on always allowed, no friction needed
    chrome.storage.sync.set({ enabled: true }, () => {
      chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
      render();
    });
    return;
  }

  // Trying to turn off
  chrome.storage.sync.get(['schedule'], (data) => {
    const schedule = Object.assign({}, DEFAULT_SCHEDULE, data.schedule || {});
    if (isWithinSchedule(schedule)) {
      // Outside these hours the schedule is not active, so turning off inside
      // an active window doesn't unblock anything, no need to gate it
      chrome.storage.sync.set({ enabled: false }, () => {
        chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
        render();
      });
      return;
    }

    // Revert the visible toggle until they clear the reason gate
    masterToggle.checked = true;
    reasonInput.value = '';
    reasonError.classList.remove('visible');
    reasonOverlay.classList.add('visible');
    reasonInput.focus();
  });
});

reasonCancel.addEventListener('click', () => {
  reasonOverlay.classList.remove('visible');
  masterToggle.checked = true;
  render();
});

reasonInput.addEventListener('input', () => {
  reasonError.classList.remove('visible');
});

reasonConfirm.addEventListener('click', () => {
  const reason = reasonInput.value.trim();
  if (reason.length < 8 || reason.split(/\s+/).length < 3) {
    reasonError.classList.add('visible');
    return;
  }

  chrome.storage.sync.get(['reasonLog'], (data) => {
    const reasonLog = data.reasonLog || [];
    reasonLog.push({ reason, date: new Date().toISOString() });
    // Keep the log from growing forever
    const trimmed = reasonLog.slice(-50);
    chrome.storage.sync.set({ enabled: false, reasonLog: trimmed }, () => {
      chrome.runtime.sendMessage({ type: 'RULES_UPDATED' });
      reasonOverlay.classList.remove('visible');
      render();
    });
  });
});

render();
