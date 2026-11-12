# Linear to-do nudge

Chrome extension. While linear.app is open, it checks your to-do (unstarted) Linear tickets every 10 minutes and offers to work on the ones you haven't addressed yet. **Open in Claude** starts a new Claude Code desktop session that runs the `tickets` skill on them.

## Install

1. Open `chrome://extensions` and turn on **Developer mode**.
2. Click **Load unpacked** and pick this folder.
3. Click the extension's toolbar icon to open its settings.
4. Paste a Linear personal API key (Linear: Settings → Account → Security & access → Personal API keys) and save.
5. Reload linear.app.

## How it works

- **Open in Claude** opens `claude://code/new?q=…&folder=…` and marks the tickets as addressed.
- **Not now** only closes the popover. It shows again on the next check.
- **Reset** (popover header, or settings) clears the addressed list, so every to-do ticket is offered again.
- The API key, folder and addressed list are kept in the extension's Chrome storage.
