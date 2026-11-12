const DEFAULT_FOLDER = '/Users/adi.mintz/Documents/Projects/v4';
const apiKeyInput = document.getElementById('apiKey');
const folderInput = document.getElementById('folder');
const status = document.getElementById('status');

chrome.storage.local.get(['apiKey', 'folder']).then(({ apiKey = '', folder = DEFAULT_FOLDER }) => {
  apiKeyInput.value = apiKey;
  folderInput.value = folder;
});

document.getElementById('save').addEventListener('click', async () => {
  await chrome.storage.local.set({ apiKey: apiKeyInput.value.trim(), folder: folderInput.value.trim() || DEFAULT_FOLDER });
  status.textContent = 'Saved. Reload linear.app to check now.';
});

document.getElementById('reset').addEventListener('click', async () => {
  await chrome.storage.local.set({ addressed: [] });
  status.textContent = 'Every to-do ticket will be offered again on the next check.';
});
