const { createMockProxies, setupChromeStorageMock, setupChromeProxyMock } = require('../helpers');

const translations = {
  extName: { message: 'extName' },
  connected: { message: 'connected' },
  disconnected: { message: 'disconnected' },
  latency: { message: 'latency' },
  selectProxy: { message: 'selectProxy' },
  edit: { message: 'edit' },
  delete: { message: 'delete' },
  favorite: { message: 'favorite' },
  addProxy: { message: 'addProxy' },
  help: { message: 'help' },
  settings: { message: 'settings' },
  deleteConfirm: { message: 'deleteConfirm' },
  favoriteConfirm: { message: 'favoriteConfirm' },
  proxyMode: { message: 'proxyMode' },
  modePage: { message: 'modePage' },
  modeGlobal: { message: 'modeGlobal' },
  modeSmart: { message: 'modeSmart' },
  creditText: { message: 'creditText' },
  proxyName: { message: 'proxyName' },
  proxyType: { message: 'proxyType' },
  proxyHost: { message: 'proxyHost' },
  proxyPort: { message: 'proxyPort' },
  proxyUsername: { message: 'proxyUsername' },
  proxyPassword: { message: 'proxyPassword' },
  save: { message: 'save' },
  cancel: { message: 'cancel' },
  editBtn: { message: 'editBtn' },
  deleteBtn: { message: 'deleteBtn' },
  removeFavorite: { message: 'removeFavorite' },
  confirmDeleteProxy: { message: 'confirmDeleteProxy' },
  confirmRemoveFavorite: { message: 'confirmRemoveFavorite' },
  importEmpty: { message: 'importEmpty' },
  importFormatError: { message: 'importFormatError' },
  importSuccess: { message: 'importSuccess' },
  exportEmpty: { message: 'exportEmpty' },
  exportSuccess: { message: 'exportSuccess' },
  nameRequired: { message: 'nameRequired' },
  hostRequired: { message: 'hostRequired' },
  portInvalid: { message: 'portInvalid' },
  optionsSaved: { message: 'optionsSaved' },
  optionsReset: { message: 'optionsReset' },
  proxySaved: { message: 'proxySaved' },
  proxyDeleted: { message: 'proxyDeleted' },
  favoriteRemoved: { message: 'favoriteRemoved' },
  languageSaved: { message: 'languageSaved' },
  pacSaved: { message: 'pacSaved' },
  confirmReset: { message: 'confirmReset' },
  optionsTitle: { message: 'optionsTitle' },
  syncedSmartDomains: { message: 'syncedSmartDomains' },
  syncedFavorites: { message: 'syncedFavorites' }
};

function addOptions(selectEl, values) {
  values.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    selectEl.appendChild(opt);
  });
}

function setupOptionsDOM() {
  document.body.innerHTML = '';

  const elements = {
    'startup-restore': { type: 'checkbox', tag: 'input' },
    'quick-switch': { type: 'checkbox', tag: 'input' },
    'bypass-list': { tag: 'textarea' },
    'language-select': { tag: 'select', options: ['en', 'zh_CN', 'zh_TW', 'ja', 'ko', 'de', 'fr', 'es'] },
    'save-btn': { tag: 'button' },
    'reset-btn': { tag: 'button' },
    'import-btn': { tag: 'button' },
    'export-btn': { tag: 'button' },
    'save-proxy-btn': { tag: 'button' },
    'cancel-edit-btn': { tag: 'button' },
    'modal-close-btn': { tag: 'button' },
    'edit-proxy-modal': { tag: 'div' },
    'edit-proxy-id': { type: 'hidden', tag: 'input' },
    'proxy-name': { tag: 'input' },
    'proxy-type': { tag: 'select', options: ['http', 'https', 'socks4', 'socks5'] },
    'proxy-host': { tag: 'input' },
    'proxy-port': { tag: 'input' },
    'proxy-username': { tag: 'input' },
    'proxy-password': { type: 'password', tag: 'input' },
    'proxies-tbody': { tag: 'tbody' },
    'proxies-table': { tag: 'table' },
    'no-proxies': { tag: 'div' },
    'favorites-list': { tag: 'div' },
    'no-favorites': { tag: 'div' },
    'status-message': { tag: 'div' },
    'import-export-data': { tag: 'textarea' },
    'smart-domains': { tag: 'textarea' },
    'pac-script': { tag: 'textarea' },
    'save-pac-btn': { tag: 'button' },
    'cascade-proxy': { tag: 'input', type: 'checkbox' }
  };

  for (const [id, config] of Object.entries(elements)) {
    const el = document.createElement(config.tag);
    el.id = id;
    if (config.type) el.type = config.type;
    if (config.options && config.tag === 'select') {
      addOptions(el, config.options);
    }
    document.body.appendChild(el);
  }

  document.title = '';
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

  global.fetch = jest.fn(() => Promise.resolve({
    json: () => Promise.resolve(translations)
  }));

  setupOptionsDOM();
});

describe('options.js', () => {
  describe('loadOptions', () => {
    test('should load options from storage and populate form', async () => {
      const options = {
        startupRestore: true,
        quickSwitch: false,
        bypassList: ['localhost', '127.0.0.1'],
        language: 'en'
      };
      setupChromeStorageMock({ options });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      expect(document.getElementById('startup-restore').checked).toBe(true);
      expect(document.getElementById('quick-switch').checked).toBe(false);
      expect(document.getElementById('bypass-list').value).toBe('localhost\n127.0.0.1');
      expect(document.getElementById('language-select').value).toBe('en');
    });

    test('should use default values when options is empty', async () => {
      setupChromeStorageMock({ options: null });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      expect(document.getElementById('startup-restore').checked).toBe(false);
      expect(document.getElementById('quick-switch').checked).toBe(false);
      expect(document.getElementById('bypass-list').value).toBe('');
    });
  });

  describe('loadProxies', () => {
    test('should render proxy table with proxies', async () => {
      const proxies = createMockProxies();
      setupChromeStorageMock({ proxies });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      const tbody = document.getElementById('proxies-tbody');
      expect(tbody.children.length).toBe(proxies.length);
    });

    test('should hide table and show no-proxies message when empty', async () => {
      setupChromeStorageMock({ proxies: [] });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      const table = document.getElementById('proxies-table');
      const noProxies = document.getElementById('no-proxies');
      expect(table.style.display).toBe('none');
      expect(noProxies.style.display).toBe('block');
    });

    test('should show table and hide no-proxies when proxies exist', async () => {
      setupChromeStorageMock({ proxies: createMockProxies() });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      const table = document.getElementById('proxies-table');
      const noProxies = document.getElementById('no-proxies');
      expect(table.style.display).toBe('table');
      expect(noProxies.style.display).toBe('none');
    });
  });

  describe('loadFavorites', () => {
    test('should render favorite items', async () => {
      setupChromeStorageMock({ favorites: ['example.com', 'test.com'] });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      const container = document.getElementById('favorites-list');
      expect(container.children.length).toBe(2);
    });

    test('should show no-favorites message when empty', async () => {
      setupChromeStorageMock({ favorites: [] });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      const noFavorites = document.getElementById('no-favorites');
      const container = document.getElementById('favorites-list');
      expect(noFavorites.style.display).toBe('block');
      expect(container.style.display).toBe('none');
    });
  });

  describe('saveOptions', () => {
    test('should save options to storage', async () => {
      setupChromeStorageMock({ options: { startupRestore: false, quickSwitch: false, bypassList: [], language: 'en' } });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('startup-restore').checked = true;
      document.getElementById('quick-switch').checked = true;
      document.getElementById('bypass-list').value = 'localhost\n192.168.1.1';
      document.getElementById('language-select').value = 'zh_CN';

      document.getElementById('save-btn').click();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            startupRestore: true,
            quickSwitch: true,
            language: 'zh_CN'
          })
        }),
        expect.any(Function)
      );
    });
  });

  describe('importData', () => {
    test('should import valid proxy data', async () => {
      const existingProxies = [createMockProxies()[0]];
      setupChromeStorageMock({ proxies: existingProxies });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      const importData = JSON.stringify([
        { name: 'Imported Proxy', type: 'http', host: 'import.example.com', port: '3128' }
      ]);
      document.getElementById('import-export-data').value = importData;

      document.getElementById('import-btn').click();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          proxies: expect.arrayContaining([
            expect.objectContaining({ name: 'Imported Proxy' })
          ])
        }),
        expect.any(Function)
      );
    });

    test('should show error for empty import data', async () => {
      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('import-export-data').value = '';
      document.getElementById('import-btn').click();

      const statusEl = document.getElementById('status-message');
      expect(statusEl.textContent).toBe('importEmpty');
    });

    test('should show error for invalid JSON', async () => {
      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('import-export-data').value = 'invalid json';
      document.getElementById('import-btn').click();

      const statusEl = document.getElementById('status-message');
      expect(statusEl.textContent).toBe('importFormatError');
    });

    test('should show error for non-array data', async () => {
      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('import-export-data').value = JSON.stringify({ not: 'array' });
      document.getElementById('import-btn').click();

      const statusEl = document.getElementById('status-message');
      expect(statusEl.textContent).toBe('importFormatError');
    });

    test('should show error for invalid proxy structure', async () => {
      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('import-export-data').value = JSON.stringify([{ name: 'test' }]);
      document.getElementById('import-btn').click();

      const statusEl = document.getElementById('status-message');
      expect(statusEl.textContent).toBe('importFormatError');
    });
  });

  describe('exportData', () => {
    test('should export proxies to textarea', async () => {
      const proxies = createMockProxies();
      setupChromeStorageMock({ proxies });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('export-btn').click();

      const textarea = document.getElementById('import-export-data');
      const exported = JSON.parse(textarea.value);
      expect(exported.length).toBe(proxies.length);
    });

    test('should show error when no proxies to export', async () => {
      setupChromeStorageMock({ proxies: [] });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('export-btn').click();

      const statusEl = document.getElementById('status-message');
      expect(statusEl.textContent).toBe('exportEmpty');
    });
  });

  describe('saveProxy', () => {
    test('should save new proxy', async () => {
      setupChromeStorageMock({ proxies: [] });

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('proxy-name').value = 'New Proxy';
      document.getElementById('proxy-type').value = 'http';
      document.getElementById('proxy-host').value = 'proxy.new.com';
      document.getElementById('proxy-port').value = '8080';
      document.getElementById('proxy-username').value = 'user';
      document.getElementById('proxy-password').value = 'pass';

      document.getElementById('save-proxy-btn').click();

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          proxies: expect.arrayContaining([
            expect.objectContaining({
              name: 'New Proxy',
              type: 'http',
              host: 'proxy.new.com',
              port: 8080
            })
          ])
        }),
        expect.any(Function)
      );
    });

    test('should show error when proxy name is empty', async () => {
      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('proxy-name').value = '';
      document.getElementById('proxy-host').value = 'proxy.example.com';
      document.getElementById('proxy-port').value = '8080';

      document.getElementById('save-proxy-btn').click();

      const statusEl = document.getElementById('status-message');
      expect(statusEl.textContent).toBe('nameRequired');
    });

    test('should show error when proxy host is empty', async () => {
      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('proxy-name').value = 'Test';
      document.getElementById('proxy-host').value = '';
      document.getElementById('proxy-port').value = '8080';

      document.getElementById('save-proxy-btn').click();

      const statusEl = document.getElementById('status-message');
      expect(statusEl.textContent).toBe('hostRequired');
    });

    test('should show error when port is invalid', async () => {
      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('proxy-name').value = 'Test';
      document.getElementById('proxy-host').value = 'proxy.example.com';
      document.getElementById('proxy-port').value = '0';

      document.getElementById('save-proxy-btn').click();

      const statusEl = document.getElementById('status-message');
      expect(statusEl.textContent).toBe('portInvalid');
    });
  });

  describe('resetOptions', () => {
    test('should clear storage and reset proxy settings', async () => {
      chrome.storage.local.clear.mockImplementation((callback) => {
        if (callback) callback();
      });
      setupChromeProxyMock();

      require('../../options');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      await flushPromises();

      document.getElementById('reset-btn').click();

      expect(chrome.storage.local.clear).toHaveBeenCalled();
      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        { value: { mode: 'direct' }, scope: 'regular' },
        expect.any(Function)
      );
    });
  });
});
