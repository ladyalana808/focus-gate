/**
 * Focus Gate — block.js
 * Logic for the reminder page shown when a blocked site is visited.
 * Picks a category-matched suggestion and reports the block event back
 * to the background worker to update streak/stat tracking.
 *
 * Copyright (c) 2026 Lady Alana
 * GitHub: @ladyalana808
 * Licensed under the MIT License. See LICENSE for details.
 */

const params = new URLSearchParams(window.location.search);
const site = params.get('site') || 'This site';
const category = params.get('category') || 'other';
document.getElementById('site').textContent = site;

const suggestionsByCategory = {
  social: [
    'Text someone you actually care about',
    'Sit still and meditate for a few minutes',
    'Take a moment to pray',
    'Write down what you are grateful for',
    'Step outside and get some fresh air',
    'Call someone instead of scrolling'
  ],
  shopping: [
    'Check your budget before you check the cart',
    'Make a list and revisit it in 24 hours',
    'Tidy up something you already own',
    'Sell or donate one thing you no longer need',
    'Go for a walk instead of a browse'
  ],
  news: [
    'Step outside and get some fresh air',
    'Take five deep breaths',
    'Sit still and meditate for a few minutes',
    'Write down one thing going right today',
    'Stretch it out'
  ],
  entertainment: [
    'Do 10 minutes of exercise',
    'Tidy up one corner of your space',
    'Read a page of something good',
    'Go for a short walk',
    'Drink a glass of water'
  ],
  other: [
    'Tidy up one corner of your space',
    'Step outside and get some fresh air',
    'Do 10 minutes of exercise',
    'Sit still and meditate for a few minutes',
    'Take a moment to pray',
    'Stretch it out',
    'Drink a glass of water',
    'Write down what you are grateful for',
    'Text someone you care about',
    'Read a page of something good',
    'Take five deep breaths',
    'Go for a short walk'
  ]
};

const pool = suggestionsByCategory[category] || suggestionsByCategory.other;
const pick = pool[Math.floor(Math.random() * pool.length)];
document.getElementById('suggestion').textContent = pick;

chrome.runtime.sendMessage({ type: 'BLOCK_EVENT', site }, (response) => {
  if (response && response.streak) {
    const streakEl = document.getElementById('streakNote');
    if (streakEl) {
      streakEl.textContent = `${response.streak} day streak. ${response.total} resisted total.`;
    }
  }
});
