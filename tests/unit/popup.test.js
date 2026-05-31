const { createMockProxies, setupChromeStorageMock, setupChromeProxyMock } = require('../helpers');

const translations = {
  extName: { message: 'Smart Proxy' },
  connected: { message: 'Connected' },
  disconnected: { message: 'Disconnected' },
  latency: { message: 'Latency: $1ms' },
  selectProxy: { message: 'Select Proxy' },
  edit: { message: 'Edit' },
  delete: { message: 'Delete' },
  favorite: { message: 'Favorite' },
  addProxy: { message: 'Add Proxy' },
  help: { message: 'Help' },
  settings: { message: 'Settings' },
  deleteConfirm: { message: 'Confirm delete?' },
  favoriteConfirm: { message: 'Confirm favorite?' },
  proxyMode: { message: 'Mode' },
  modePage: { message: 'Page' },
  modeGlobal: { message: 'Global' },
  modeSmart: { message: 'Smart' },
  creditText: { message: 'Credit' },
  proxyName: { message: 'Name' },
  proxyType: { message: 'Type' },
  proxyHost: { message: 'Host' },
  proxyPort: { message: 'Port' },
  proxyUsername: { message: 'Username' },
  proxyPassword: { message: 'Password' },
  save: { message: 'Save' },
  cancel: { message: 'Cancel' },
  standby: { message: 'Standby' }
};

function setupPopupDOM() {
  document.body.innerHTML = '';

  const statusBar = document.createElement('div');
  statusBar.id = 'statusBar';
  statusBar.className = 'status-bar';
  document.body.appendChild(statusBar);

  const statusValue = document.createElement('span');
  statusValue.id = 'statusValue';
  document.body.appendChild(statusValue);

  const statusLatency = document.createElement('span');
  statusLatency.id = 'statusLatency';
  document.body.appendChild(statusLatency);

  const proxySelect = document.createElement('select');
  proxySelect.id = 'proxySelect';
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select Proxy';
  proxySelect.appendChild(defaultOption);
  document.body.appendChild(proxySelect);

  const proxyToggle = document.createElement('input');
  proxyToggle.id = 'proxyToggle';
  proxyToggle.type = 'checkbox';
  document.body.appendChild(proxyToggle);

  const proxyModeSelect = document.createElement('select');
  proxyModeSelect.id = 'proxyModeSelect';
  const modePage = document.createElement('option');
  modePage.value = 'page';
  modePage.textContent = 'Page';
  proxyModeSelect.appendChild(modePage);
  const modeGlobal = document.createElement('option');
  modeGlobal.value = 'global';
  modeGlobal.textContent = 'Global';
  proxyModeSelect.appendChild(modeGlobal);
  const modeSmart = document.createElement('option');
  modeSmart.value = 'smart';
  modeSmart.textContent = 'Smart';
  proxyModeSelect.appendChild(modeSmart);
  document.body.appendChild(proxyModeSelect);

  const actionButtons = document.createElement('div');
  actionButtons.id = 'actionButtons';
  document.body.appendChild(actionButtons);

  const editBtn = document.createElement('button');
  editBtn.id = 'editBtn';
  editBtn.disabled = true;
  document.body.appendChild(editBtn);

  const deleteBtn = document.createElement('button');
  deleteBtn.id = 'deleteBtn';
  deleteBtn.disabled = true;
  document.body.appendChild(deleteBtn);

  const currentUrlText = document.createElement('span');
  currentUrlText.id = 'currentUrlText';
  document.body.appendChild(currentUrlText);

  const currentUrlFavBtn = document.createElement('button');
  currentUrlFavBtn.id = 'currentUrlFavBtn';
  document.body.appendChild(currentUrlFavBtn);

  const currentUrlFavImg = document.createElement('img');
  currentUrlFavImg.id = 'currentUrlFavImg';
  document.body.appendChild(currentUrlFavImg);

  const favScopeDropdown = document.createElement('div');
  favScopeDropdown.id = 'favScopeDropdown';
  document.body.appendChild(favScopeDropdown);

  const favScopeAll = document.createElement('button');
  favScopeAll.id = 'favScopeAll';
  favScopeAll.setAttribute('data-scope', 'all');
  document.body.appendChild(favScopeAll);

  const favScopeCurrent = document.createElement('button');
  favScopeCurrent.id = 'favScopeCurrent';
  favScopeCurrent.setAttribute('data-scope', 'specific');
  document.body.appendChild(favScopeCurrent);

  const addProxyBtn = document.createElement('button');
  addProxyBtn.id = 'addProxyBtn';
  document.body.appendChild(addProxyBtn);

  const settingsBtn = document.createElement('button');
  settingsBtn.id = 'settingsBtn';
  document.body.appendChild(settingsBtn);

  const helpBtn = document.createElement('button');
  helpBtn.id = 'helpBtn';
  document.body.appendChild(helpBtn);

  const dialogOverlay = document.createElement('div');
  dialogOverlay.id = 'dialogOverlay';
  document.body.appendChild(dialogOverlay);

  const dialog = document.createElement('div');
  dialog.id = 'dialog';
  document.body.appendChild(dialog);

  const dialogTitle = document.createElement('span');
  dialogTitle.id = 'dialogTitle';
  document.body.appendChild(dialogTitle);

  const dialogClose = document.createElement('button');
  dialogClose.id = 'dialogClose';
  document.body.appendChild(dialogClose);

  const dialogCancel = document.createElement('button');
  dialogCancel.id = 'dialogCancel';
  document.body.appendChild(dialogCancel);

  const proxyForm = document.createElement('form');
  proxyForm.id = 'proxyForm';
  document.body.appendChild(proxyForm);

  const proxyName = document.createElement('input');
  proxyName.id = 'proxyName';
  document.body.appendChild(proxyName);

  const proxyType = document.createElement('select');
  proxyType.id = 'proxyType';
  document.body.appendChild(proxyType);

  const proxyHost = document.createElement('input');
  proxyHost.id = 'proxyHost';
  document.body.appendChild(proxyHost);

  const proxyPort = document.createElement('input');
  proxyPort.id = 'proxyPort';
  document.body.appendChild(proxyPort);

  const proxyUsername = document.createElement('input');
  proxyUsername.id = 'proxyUsername';
  document.body.appendChild(proxyUsername);

  const proxyPassword = document.createElement('input');
  proxyPassword.id = 'proxyPassword';
  proxyPassword.type = 'password';
  document.body.appendChild(proxyPassword);
}

function loadPopupModule() {
  return require('../../popup');
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  setupChromeStorageMock();
  setupChromeProxyMock();

  chrome.tabs = {
    ...chrome.tabs,
    query: jest.fn((query, callback) => {
      if (callback) callback([{ id: 123, url: 'https://example.com' }]);
    }),
    get: jest.fn((tabId, callback) => {
      if (callback) callback({ id: tabId, url: 'https://example.com' });
    }),
    create: jest.fn()
  };

  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve(translations)
  }));

  chrome.runtime.sendMessage = jest.fn();

  setupPopupDOM();
});

describe('popup.js', () => {
  test('should load proxies from storage on DOMContentLoaded', async () => {
    const proxies = createMockProxies();
    setupChromeStorageMock({ proxies, activeProxyId: '1' });

    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    expect(chrome.storage.local.get).toHaveBeenCalledWith(
      ['proxies', 'activeProxyId', 'proxyMode', 'favorites', 'smartDomains'],
      expect.any(Function)
    );
  });

  test('should populate proxy select with available proxies', async () => {
    const proxies = createMockProxies();
    setupChromeStorageMock({ proxies, activeProxyId: '1' });

    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const proxySelect = document.getElementById('proxySelect');
    expect(proxySelect.options.length).toBe(proxies.length + 1);
  });

  test('should set active proxy in select when activeProxyId exists', async () => {
    const proxies = createMockProxies();
    setupChromeStorageMock({ proxies, activeProxyId: '2' });

    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const proxySelect = document.getElementById('proxySelect');
    expect(proxySelect.value).toBe('2');
  });

  test('should enable toggle when activeProxyId exists', async () => {
    const proxies = createMockProxies();
    setupChromeStorageMock({ proxies, activeProxyId: '1', favorites: ['example.com'] });

    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const proxyToggle = document.getElementById('proxyToggle');
    expect(proxyToggle.checked).toBe(true);
  });

  test('should disable toggle when no activeProxyId', async () => {
    const proxies = createMockProxies();
    setupChromeStorageMock({ proxies, activeProxyId: null });

    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const proxyToggle = document.getElementById('proxyToggle');
    expect(proxyToggle.checked).toBe(false);
  });

  test('should enable action buttons when a proxy is selected', async () => {
    const proxies = createMockProxies();
    setupChromeStorageMock({ proxies, activeProxyId: '1' });

    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    expect(editBtn.disabled).toBe(false);
    expect(deleteBtn.disabled).toBe(false);
  });

  test('should show connected status when proxy is active', async () => {
    const proxies = createMockProxies();
    setupChromeStorageMock({ proxies, activeProxyId: '1', favorites: ['example.com'] });

    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const statusBar = document.getElementById('statusBar');
    expect(statusBar.className).toBe('status-bar connected');
  });

  test('should show disconnected status when no proxy is active', async () => {
    const proxies = createMockProxies();
    setupChromeStorageMock({ proxies, activeProxyId: null });

    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const statusBar = document.getElementById('statusBar');
    expect(statusBar.className).toBe('status-bar disconnected');
  });

  test('should send setProxy message when toggle is checked', async () => {
    const proxies = createMockProxies();
    setupChromeStorageMock({ proxies, activeProxyId: null });
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (callback) callback({ success: true });
    });

    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const proxyToggle = document.getElementById('proxyToggle');
    proxyToggle.checked = true;
    proxyToggle.dispatchEvent(new Event('change'));

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'setProxy',
        proxy: expect.objectContaining({ id: proxies[0].id })
      }),
      expect.any(Function)
    );
  });

  test('should send disableProxy message when toggle is unchecked', async () => {
    const proxies = createMockProxies();
    setupChromeStorageMock({ proxies, activeProxyId: '1' });
    chrome.runtime.sendMessage.mockImplementation((msg, callback) => {
      if (callback) callback({ success: true });
    });

    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const proxyToggle = document.getElementById('proxyToggle');
    proxyToggle.checked = false;
    proxyToggle.dispatchEvent(new Event('change'));

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'disableProxy' }),
      expect.any(Function)
    );
  });

  test('should open help page when help button clicked', async () => {
    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const helpBtn = document.getElementById('helpBtn');
    helpBtn.click();

    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'help.html' });
  });

  test('should show add dialog when addProxyBtn clicked', async () => {
    loadPopupModule();
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await flushPromises();

    const addProxyBtn = document.getElementById('addProxyBtn');
    addProxyBtn.click();

    const dialogOverlay = document.getElementById('dialogOverlay');
    expect(dialogOverlay.classList.contains('active')).toBe(true);
  });
});
