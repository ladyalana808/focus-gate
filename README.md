# 🚫 Focus Gate

A Chrome extension that blocks the sites you know are stealing your time, on your terms. You control the list, you control the schedule, and if you ever want to turn it off outside your scheduled hours, you have to actually tell yourself why.

## Why this exists

Most site blockers are all-or-nothing lockouts. Focus Gate is built differently: it's a friction tool, not a cage. You decide what's blocked and when. The goal is killing the mindless autopilot click, not fighting you.

## Features

- **Manual toggle** — flip blocking on or off whenever you want
- **Scheduled blocking** — set a recurring time window (e.g. 9am–5pm, weekdays) where your list blocks automatically, no need to remember to turn it on
- **Reason gate** — trying to turn blocking off outside your scheduled hours? You'll be asked to actually write down why, in a real sentence, not a one-word excuse. Turning it back on is always instant, no friction
- **Message categories** — tag each site as Social, Shopping, News, Video, or Other, and get a suggestion matched to why you're avoiding it (budget check for shopping, texting a friend for social, grounding for news, etc.)
- **Quick-add current site** — one click grabs whatever tab you're on and drops it straight into the add field
- **Streak tracking** — see your current streak, your best streak, and total times resisted, right in the popup and on the block page itself
- **Local, private data** — everything (site list, schedule, stats) is stored via `chrome.storage.sync`, tied to your own Chrome profile. Nothing is sent to any external server

## Installation (unpacked / developer mode)

This extension isn't on the Chrome Web Store yet, so you'll need to load it manually:

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the project folder
5. Pin the extension to your toolbar for easy access

## How to use it

1. Click the Focus Gate icon in your toolbar
2. Type in a domain (like `x.com` or `youtube.com`) or hit the 📍 button to grab the site you're currently on
3. Pick a category so the block page can nudge you with something relevant
4. Hit **Add**
5. Flip the master toggle on, or set up a recurring schedule below it

Once a listed site is blocked and you try to visit it, you'll be redirected to a reminder page with a suggestion for something better to do, and your streak count front and center.

## Project structure

```
focus-gate/
├── manifest.json      # Extension config (Manifest V3)
├── popup.html/.js      # The toolbar popup UI
├── background.js       # Service worker: builds blocking rules, tracks stats
├── block.html/.js      # The page shown when a blocked site is visited
└── icons/               # Extension icons
```

## Tech notes

- Built on **Manifest V3** using the `declarativeNetRequest` API for blocking (no `webRequest` blocking, which is deprecated for this use case)
- Scheduled blocking is checked via `chrome.alarms` on a 1-minute interval, so there can be up to a 60-second lag between a scheduled window starting and blocking kicking in
- Site list migrations are handled automatically, so older data formats won't break on update

## Roadmap ideas

- Delay screen (wait X seconds) instead of a hard block, for sites you want friction on but not a full lockout
- Per-site scheduling instead of one global schedule
- A reflection view showing your logged reasons for turning blocking off over time

## License

Feel free to fork and adapt this for your own use.
