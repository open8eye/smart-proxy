const { createMockProxies, setupChromeStorageMock, setupChromeProxyMock } = require('../helpers');

let background;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  setupChromeStorageMock();
  setupChromeProxyMock();

  chrome.i18n = {
    getMessage: jest.fn((key, subs) => key)
  };

  background = require('../../background');
});

describe('Proxy Workflow Integration', () => {
  describe('full proxy lifecycle', () => {
    test('should add proxy, enable it, then disable it', () => {
      const newProxy = {
        id: '3',
        name: 'New Proxy',
        type: 'http',
        host: 'new.proxy.com',
        port: '3128',
        username: '',
        password: ''
      };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        if (typeof keys === 'string') {
          callback({ [keys]: [] });
        } else if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(key => { result[key] = key === 'proxies' ? [] : null; });
          callback(result);
        } else {
          callback({ proxies: [], activeProxyId: null, favorites: [] });
        }
      });

      chrome.storage.local.set.mockImplementation((data, callback) => {
        if (callback) callback();
      });

      background.applyProxy(newProxy, 'global');

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            mode: 'fixed_servers',
            rules: expect.objectContaining({
              singleProxy: expect.objectContaining({
                scheme: 'http',
                host: 'new.proxy.com',
                port: 3128
              })
            })
          })
        }),
        expect.any(Function)
      );

      background.disableProxy();

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        { value: { mode: 'direct' }, scope: 'regular' },
        expect.any(Function)
      );

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ activeProxyId: null });
    });

    test('should switch between different proxies', () => {
      const proxies = createMockProxies();
      const proxy1 = proxies[0];
      const proxy2 = proxies[1];

      background.applyProxy(proxy1, 'global');

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            rules: expect.objectContaining({
              singleProxy: expect.objectContaining({
                host: 'proxy1.example.com',
                port: 8080
              })
            })
          })
        }),
        expect.any(Function)
      );

      background.applyProxy(proxy2, 'global');

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.objectContaining({
            rules: expect.objectContaining({
              singleProxy: expect.objectContaining({
                scheme: 'socks5',
                host: 'proxy2.example.com',
                port: 1080
              })
            })
          })
        }),
        expect.any(Function)
      );
    });
  });

  describe('setProxy message workflow', () => {
    test('should handle setProxy message and enable proxy', () => {
      const proxy = createMockProxies()[0];
      const sendResponse = jest.fn();

      const listeners = chrome.runtime.onMessage.addListener.mock.calls;
      const messageHandler = listeners[listeners.length - 1][0];

      messageHandler({ action: 'setProxy', proxy }, {}, sendResponse);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { activeProxyId: proxy.id },
        expect.any(Function)
      );
    });

    test('should handle disableProxy message after setProxy', () => {
      const proxy = createMockProxies()[0];
      const sendResponse = jest.fn();

      const listeners = chrome.runtime.onMessage.addListener.mock.calls;
      const messageHandler = listeners[listeners.length - 1][0];

      messageHandler({ action: 'setProxy', proxy }, {}, sendResponse);
      messageHandler({ action: 'disableProxy' }, {}, sendResponse);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        { value: { mode: 'direct' }, scope: 'regular' },
        expect.any(Function)
      );
      expect(sendResponse).toHaveBeenLastCalledWith({ success: true });
    });
  });

  describe('favorites workflow', () => {
    test('should add and check favorites', () => {
      const sendResponse = jest.fn();
      let storageData = { favorites: [] };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        if (typeof keys === 'string') {
          callback({ [keys]: storageData[keys] });
        } else if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(key => { result[key] = storageData[key]; });
          callback(result);
        } else {
          callback(storageData);
        }
      });

      chrome.storage.local.set.mockImplementation((data, callback) => {
        Object.assign(storageData, data);
        if (callback) callback();
      });

      const listeners = chrome.runtime.onMessage.addListener.mock.calls;
      const messageHandler = listeners[listeners.length - 1][0];

      messageHandler({ action: 'addFavorite', domain: 'example.com' }, {}, sendResponse);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { favorites: [{ domain: 'example.com', scope: 'all', proxyIds: [] }] },
        expect.any(Function)
      );

      messageHandler({ action: 'isFavorite', domain: 'example.com' }, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith({ success: true, isFavorite: true });
    });

    test('should remove favorites', () => {
      const sendResponse = jest.fn();
      let storageData = { favorites: [{ domain: 'example.com', scope: 'all', proxyIds: [] }, { domain: 'test.com', scope: 'all', proxyIds: [] }] };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        if (typeof keys === 'string') {
          callback({ [keys]: storageData[keys] });
        } else if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(key => { result[key] = storageData[key]; });
          callback(result);
        } else {
          callback(storageData);
        }
      });

      chrome.storage.local.set.mockImplementation((data, callback) => {
        Object.assign(storageData, data);
        if (callback) callback();
      });

      const listeners = chrome.runtime.onMessage.addListener.mock.calls;
      const messageHandler = listeners[listeners.length - 1][0];

      messageHandler({ action: 'removeFavorite', domain: 'example.com' }, {}, sendResponse);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { favorites: [{ domain: 'test.com', scope: 'all', proxyIds: [] }] },
        expect.any(Function)
      );
    });
  });

  describe('proxy mode workflow', () => {
    test('should handle setProxyMode message and update proxy', () => {
      const sendResponse = jest.fn();

      const listeners = chrome.runtime.onMessage.addListener.mock.calls;
      const messageHandler = listeners[listeners.length - 1][0];

      messageHandler({ action: 'setProxyMode', mode: 'global' }, {}, sendResponse);

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { proxyMode: 'global' },
        expect.any(Function)
      );
    });

    test('should handle getProxyMode message', () => {
      const sendResponse = jest.fn();

      const listeners = chrome.runtime.onMessage.addListener.mock.calls;
      const messageHandler = listeners[listeners.length - 1][0];

      messageHandler({ action: 'getProxyMode' }, {}, sendResponse);

      expect(sendResponse).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, mode: expect.any(String) })
      );
    });
  });

  describe('tab proxy management', () => {
    test('should clean up tab proxies on tab removal', () => {
      let storageData = { tabProxies: { '123': '1', '456': '2' } };

      chrome.storage.local.get.mockImplementation((keys, callback) => {
        if (typeof keys === 'string') {
          callback({ [keys]: storageData[keys] });
        } else if (Array.isArray(keys)) {
          const result = {};
          keys.forEach(key => { result[key] = storageData[key]; });
          callback(result);
        } else {
          callback(storageData);
        }
      });

      chrome.storage.local.set.mockImplementation((data, callback) => {
        Object.assign(storageData, data);
        if (callback) callback();
      });

      const listeners = chrome.tabs.onRemoved.addListener.mock.calls;
      const removeHandler = listeners[listeners.length - 1][0];

      removeHandler(123);

      expect(storageData.tabProxies).toEqual({ '456': '2' });
    });
  });
});
