// Runs on linear.app: checks for to-do tickets and shows a popover offering to work on them.
const CHECK_EVERY_MS = 10 * 60 * 1000;
const DEFAULT_FOLDER = '/Users/adi.mintz/Documents/Projects/v4';
const HOST_ID = 'linear-todo-nudge';

// Linear's look: Inter, compact 13px rows, hairline borders, indigo accent, dashed circle for "Todo".
const STYLE = `
  .card {
    --bg: #ffffff; --fg: #282a30; --muted: #6b6f76; --border: #e4e5e9; --hover: #f4f5f8;
    --btn: #ffffff; --btn-border: #dfe1e4; --accent: #5e6ad2; --accent-hover: #4e5ac0; --error: #eb5757;
    position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; width: 360px; max-width: calc(100vw - 32px);
    box-sizing: border-box; font: 400 13px/1.45 "Inter", "Inter UI", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    -webkit-font-smoothing: antialiased; color: var(--fg); background: var(--bg);
    border: 1px solid var(--border); border-radius: 8px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, .12), 0 1px 2px rgba(0, 0, 0, .06);
    animation: rise .18s ease-out;
  }
  .card.dark {
    --bg: #1c1d21; --fg: #e3e4e8; --muted: #8a8f98; --border: #2c2d33; --hover: #26272c;
    --btn: #26272c; --btn-border: #35363c; --accent-hover: #6d79e0;
    box-shadow: 0 8px 32px rgba(0, 0, 0, .5), 0 0 0 1px rgba(255, 255, 255, .02);
  }
  @keyframes rise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  .header { display: flex; align-items: center; gap: 8px; padding: 12px 12px 8px 14px; }
  .title { flex: 1; font-weight: 500; font-size: 13px; }
  .count { color: var(--muted); font-weight: 400; margin-left: 4px; }
  .close { all: unset; cursor: pointer; color: var(--muted); width: 22px; height: 22px; border-radius: 4px;
    display: grid; place-items: center; font-size: 15px; line-height: 1; }
  .close:hover { background: var(--hover); color: var(--fg); }
  .message { margin: 0; padding: 0 14px 12px; color: var(--muted); }
  .message.error { color: var(--error); }
  ul { margin: 0; padding: 0 6px 6px; list-style: none; max-height: 220px; overflow: auto; }
  li a { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 4px;
    color: var(--fg); text-decoration: none; min-width: 0; }
  li a:hover { background: var(--hover); }
  .status { flex: none; width: 10px; height: 10px; border-radius: 50%; border: 1.5px dashed var(--muted); box-sizing: border-box; }
  .id { flex: none; color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; min-width: 64px; }
  .name { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .actions { display: flex; gap: 8px; justify-content: flex-end; padding: 10px 12px; border-top: 1px solid var(--border); }
  button.action { font: 500 12px/1 inherit; font-family: inherit; height: 28px; padding: 0 12px; border-radius: 5px; cursor: pointer; }
  .secondary { color: var(--fg); background: var(--btn); border: 1px solid var(--btn-border); }
  .secondary:hover { background: var(--hover); }
  .primary { color: #fff; background: var(--accent); border: 1px solid var(--accent); }
  .primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
`;

// Linear has its own light/dark setting, so match the page's background rather than the OS setting.
function isDarkPage() {
  // Skip transparent backgrounds (rgba(0, 0, 0, 0)); with none set, the page is white.
  const color = [document.body, document.documentElement]
    .map((node) => getComputedStyle(node).backgroundColor.match(/[\d.]+/g)?.map(Number))
    .find((channels) => channels && (channels[3] ?? 1) > 0);
  const [red, green, blue] = color ?? [255, 255, 255];
  return 0.299 * red + 0.587 * green + 0.114 * blue < 128;
}

function removePopover() {
  document.getElementById(HOST_ID)?.remove();
}

function element(tag, props = {}, children = []) {
  const node = Object.assign(document.createElement(tag), props);
  node.append(...children);
  return node;
}

function showPopover(title, bodyNodes, buttons) {
  removePopover();
  const host = element('div', { id: HOST_ID });
  const root = host.attachShadow({ mode: 'open' });
  const close = element('button', { className: 'close', textContent: '×', title: 'Close' });
  close.setAttribute('aria-label', 'Close');
  close.addEventListener('click', removePopover);
  root.append(
    element('style', { textContent: STYLE }),
    element('div', { className: isDarkPage() ? 'card dark' : 'card', role: 'dialog' }, [
      element('div', { className: 'header' }, [element('div', { className: 'title' }, title), close]),
      ...bodyNodes,
      element('div', { className: 'actions' }, buttons)
    ])
  );
  document.body.append(host);
}

function button(label, variant, onClick) {
  const node = element('button', { textContent: label, className: `action ${variant}` });
  node.addEventListener('click', onClick);
  return node;
}

function openClaudeSession(tickets, folder) {
  const ids = tickets.map((ticket) => ticket.identifier).join(' ');
  const params = new URLSearchParams({ q: `Use the tickets skill on these tickets: ${ids}`, folder });
  // Navigating the page to the claude:// URL makes Chrome hand it to the Claude app (with an "Open Claude?" prompt).
  window.location.href = `claude://code/new?${params}`;
}

async function check() {
  if (document.getElementById(HOST_ID)) return;
  const result = await chrome.runtime.sendMessage({ type: 'fetch-todo' });
  if (result.error === 'no-key') {
    showPopover(['To-do nudge'], [element('p', { className: 'message', textContent: 'Add your Linear API key to start.' })], [
      button('Not now', 'secondary', removePopover),
      button('Open settings', 'primary', () => { chrome.runtime.sendMessage({ type: 'open-options' }); removePopover(); })
    ]);
    return;
  }
  if (result.error) {
    showPopover(['To-do nudge'], [element('p', { className: 'message error', textContent: result.error })], [button('Close', 'secondary', removePopover)]);
    return;
  }
  // Only tickets not yet addressed: "Open in Claude" marks them as addressed, "Not now" only closes the popover.
  const { addressed = [], folder = DEFAULT_FOLDER } = await chrome.storage.local.get(['addressed', 'folder']);
  const tickets = result.tickets.filter((ticket) => !addressed.includes(ticket.identifier));
  if (tickets.length) {
    const markAddressed = () => chrome.storage.local.set({ addressed: [...addressed, ...tickets.map((ticket) => ticket.identifier)] });
    const list = element('ul', {}, tickets.map((ticket) =>
      element('li', {}, [element('a', { href: ticket.url, title: ticket.title }, [
        element('span', { className: 'status' }),
        element('span', { className: 'id', textContent: ticket.identifier }),
        element('span', { className: 'name', textContent: ticket.title })
      ])])
    ));
    showPopover(['Work on your to-do tickets?', element('span', { className: 'count', textContent: tickets.length })], [list], [
      button('Not now', 'secondary', removePopover),
      button('Open in Claude', 'primary', () => { markAddressed(); removePopover(); openClaudeSession(tickets, folder); })
    ]);
  }
}

check();
setInterval(check, CHECK_EVERY_MS);
