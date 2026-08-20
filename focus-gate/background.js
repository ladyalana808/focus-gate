const RULE_ID_START = 1000;
const CHECK_ALARM = 'focus-gate-schedule-check';

const DEFAULT_SCHEDULE = {
  enabled: false,
  startTime: '09:00',
  endTime: '17:00',
  days: [1, 2, 3, 4, 5]
};

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
  // window crosses midnight
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

async function rebuildRules() {
  const data = await chrome.storage.sync.get(['sites', 'enabled', 'schedule']);
  const sites = (data.sites || []).map((s) => (typeof s === 'string' ? { domain: s, category: 'other' } : s));
  const manualEnabled = !!data.enabled;
  const schedule = Object.assign({}, DEFAULT_SCHEDULE, data.schedule || {});
  const scheduleActive = isWithinSchedule(schedule);
  const effectiveEnabled = manualEnabled || scheduleActive;

  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);

  let addRules = [];
  if (effectiveEnabled && sites.length) {
    addRules = sites.map((site, i) => ({
      id: RULE_ID_START + i,
      priority: 1,
      action: {
        type: 'redirect',
        redirect: {
          extensionPath: '/block.html?site=' + encodeURIComponent(site.domain) + '&category=' + encodeURIComponent(site.category || 'other')
        }
      },
      condition: {
        requestDomains: [site.domain],
        resourceTypes: ['main_frame']
      }
    }));
  }

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });
}

function ensureAlarm() {
  chrome.alarms.get(CHECK_ALARM, (alarm) => {
    if (!alarm) {
      chrome.alarms.create(CHECK_ALARM, { periodInMinutes: 1 });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureAlarm();
  rebuildRules();
});
chrome.runtime.onStartup.addListener(() => {
  ensureAlarm();
  rebuildRules();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CHECK_ALARM) {
    rebuildRules();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'RULES_UPDATED') {
    rebuildRules();
  }
  if (message.type === 'BLOCK_EVENT') {
    recordBlockEvent().then((stats) => {
      sendResponse({ streak: stats.currentStreak, total: stats.total });
    });
    return true; // keep the message channel open for async sendResponse
  }
});

function todayKey() {
  const now = new Date();
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
}

function isYesterday(dateKey, todayKeyStr) {
  const [ty, tm, td] = todayKeyStr.split('-').map(Number);
  const today = new Date(ty, tm - 1, td);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yKey = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
  return dateKey === yKey;
}

async function recordBlockEvent() {
  const data = await chrome.storage.sync.get(['stats']);
  const stats = Object.assign(
    { total: 0, byDate: {}, currentStreak: 0, longestStreak: 0, lastActiveDate: null },
    data.stats || {}
  );

  const today = todayKey();
  stats.total += 1;
  stats.byDate[today] = (stats.byDate[today] || 0) + 1;

  if (stats.lastActiveDate !== today) {
    if (stats.lastActiveDate && isYesterday(stats.lastActiveDate, today)) {
      stats.currentStreak += 1;
    } else {
      stats.currentStreak = 1;
    }
    stats.lastActiveDate = today;
  }

  if (stats.currentStreak > stats.longestStreak) {
    stats.longestStreak = stats.currentStreak;
  }

  await chrome.storage.sync.set({ stats });
  return stats;
}
