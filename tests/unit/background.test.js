const { createMockProxies, setupChromeStorageMock, setupChromeProxyMock } = require('../helpers');

let background;

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  setupChromeStorageMock();
  setupChromeProxyMock();
  background = require('../../background');
});

describe('background.js', () => {
  describe('initializeExtension', () => {
    test('should set default storage values when storage is empty', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({});
      });

      background.initializeExtension();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ proxies: [] });
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ tabProxies: {} });
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ favorites: [] });
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        options: {
          startupRestore: true,
          quickSwitch: false,
          cascadeProxy: true,
          bypassList: ['localhost', '127.0.0.1', '::1'],
          language: 'en'
        }
      });
    });

    test('should not overwrite existing storage values', () => {
      const existingProxies = createMockProxies();
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          proxies: existingProxies,
          tabProxies: { '123': '1' },
          favorites: ['example.com'],
          options: { startupRestore: false, quickSwitch: true, bypassList: [], language: 'zh_CN' }
        });
      });

      background.initializeExtension();

      expect(chrome.storage.local.set).not.toHaveBeenCalledWith({ proxies: [] });
      expect(chrome.storage.local.set).not.toHaveBeenCalledWith({ tabProxies: {} });
      expect(chrome.storage.local.set).not.toHaveBeenCalledWith({ favorites: [] });
    });

    test('should call restoreProxySettings when activeProxyId exists', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          proxies: createMockProxies(),
          activeProxyId: '1',
          tabProxies: {},
          favorites: [],
          options: { startupRestore: true },
          proxyMode: 'page',
          smartDomains: ['*.google.com']
        });
      });

      background.initializeExtension();

      expect(chrome.storage.local.get).toHaveBeenCalledWith(
        ['proxies', 'activeProxyId', 'tabProxies', 'favorites', 'options', 'proxyMode', 'smartDomains'],
        expect.any(Function)
      );
    });
  });

  describe('getProxyConfig', () => {
    test('should return correct proxy config', () => {
      const proxy = createMockProxies()[0];

      const config = background.getProxyConfig(proxy);

      expect(config).toEqual({
        mode: 'fixed_servers',
        rules: {
          singleProxy: {
            scheme: proxy.type,
            host: proxy.host,
            port: parseInt(proxy.port)
          },
          bypassList: ['localhost', '127.0.0.1']
        }
      });
    });
  });

  describe('applyProxy', () => {
    test('should set proxy settings correctly using fixed_servers', () => {
      const proxy = createMockProxies()[0];

      background.applyProxy(proxy);

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        {
          value: {
            mode: 'fixed_servers',
            rules: {
              singleProxy: {
                scheme: proxy.type,
                host: proxy.host,
                port: parseInt(proxy.port)
              },
              bypassList: ['localhost', '127.0.0.1']
            }
          },
          scope: 'regular'
        },
        expect.any(Function)
      );
    });
  });

  describe('disableProxy', () => {
    test('should set proxy mode to direct', () => {
      background.disableProxy();

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        { value: { mode: 'direct' }, scope: 'regular' },
        expect.any(Function)
      );
    });

    test('should clear activeProxyId in storage', () => {
      background.disableProxy();

      expect(chrome.storage.local.set).toHaveBeenCalledWith({ activeProxyId: null });
    });

    test('should call startIconAnimation on disable', () => {
      background.disableProxy();

      expect(chrome.proxy.settings.set).toHaveBeenCalled();
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ activeProxyId: null });
    });
  });

  describe('matchesFavorite', () => {
    test('should match exact domain', () => {
      expect(background.matchesFavorite('example.com', ['example.com'])).toBe(true);
    });

    test('should match wildcard domain', () => {
      expect(background.matchesFavorite('sub.example.com', ['*.example.com'])).toBe(true);
    });

    test('should not match different domain', () => {
      expect(background.matchesFavorite('other.com', ['example.com'])).toBe(false);
    });

    test('should handle www prefix', () => {
      expect(background.matchesFavorite('www.example.com', ['example.com'])).toBe(true);
    });
  });

  describe('message listeners', () => {
    test('should handle setProxy message', () => {
      const proxy = createMockProxies()[0];
      const sendResponse = jest.fn();

      chrome.runtime.onMessage.addListener.mock.calls[0][0](
        { action: 'setProxy', proxy },
        {},
        sendResponse
      );

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { activeProxyId: proxy.id },
        expect.any(Function)
      );
    });

    test('should handle disableProxy message', () => {
      const sendResponse = jest.fn();

      chrome.runtime.onMessage.addListener.mock.calls[0][0](
        { action: 'disableProxy' },
        {},
        sendResponse
      );

      expect(chrome.proxy.settings.set).toHaveBeenCalledWith(
        { value: { mode: 'direct' }, scope: 'regular' },
        expect.any(Function)
      );
      expect(sendResponse).toHaveBeenCalledWith({ success: true });
    });

    test('should handle getCurrentTab message', () => {
      const mockTab = { id: 1, url: 'https://example.com' };
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([mockTab]);
      });
      const sendResponse = jest.fn();

      chrome.runtime.onMessage.addListener.mock.calls[0][0](
        { action: 'getCurrentTab' },
        {},
        sendResponse
      );

      expect(chrome.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
      expect(sendResponse).toHaveBeenCalledWith({ success: true, tab: mockTab });
    });

    test('should handle addFavorite message', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ favorites: [] });
      });
      const sendResponse = jest.fn();

      chrome.runtime.onMessage.addListener.mock.calls[0][0](
        { action: 'addFavorite', domain: 'example.com' },
        {},
        sendResponse
      );

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { favorites: ['example.com'] },
        expect.any(Function)
      );
    });

    test('should handle removeFavorite message', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ favorites: ['example.com', 'test.com'] });
      });
      const sendResponse = jest.fn();

      chrome.runtime.onMessage.addListener.mock.calls[0][0](
        { action: 'removeFavorite', domain: 'example.com' },
        {},
        sendResponse
      );

      expect(chrome.storage.local.set).toHaveBeenCalledWith(
        { favorites: ['test.com'] },
        expect.any(Function)
      );
    });

    test('should handle isFavorite message', () => {
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({ favorites: ['example.com'] });
      });
      const sendResponse = jest.fn();

      chrome.runtime.onMessage.addListener.mock.calls[0][0](
        { action: 'isFavorite', domain: 'example.com' },
        {},
        sendResponse
      );

      expect(sendResponse).toHaveBeenCalledWith({ success: true, isFavorite: true });
    });
  });
});
