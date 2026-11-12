// Fetches the viewer's to-do (unstarted) Linear tickets with the personal API key from the options page.
const QUERY = `query {
  viewer {
    assignedIssues(first: 100, filter: { state: { type: { eq: "unstarted" } } }) {
      nodes { identifier title url state { name } }
    }
  }
}`;

async function fetchTodoTickets() {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  if (!apiKey) return { error: 'no-key' };
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: apiKey },
    body: JSON.stringify({ query: QUERY })
  });
  const body = await response.json();
  if (!response.ok || body.errors) return { error: body.errors?.[0]?.message ?? `HTTP ${response.status}` };
  return { tickets: body.data.viewer.assignedIssues.nodes };
}

// Clicking the toolbar icon opens the settings page (API key, folder, reset).
chrome.action.onClicked.addListener(() => chrome.runtime.openOptionsPage());

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'fetch-todo') {
    fetchTodoTickets().then(sendResponse, (error) => sendResponse({ error: error.message }));
    return true;
  }
  if (message.type === 'open-options') chrome.runtime.openOptionsPage();
});
