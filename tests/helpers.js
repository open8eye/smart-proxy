const createMockProxies = () => [
  { id: '1', name: 'Test Proxy 1', type: 'http', host: 'proxy1.example.com', port: '8080', username: 'user1', password: 'pass1' },
  { id: '2', name: 'Test Proxy 2', type: 'socks5', host: 'proxy2.example.com', port: '1080', username: '', password: '' }
];

const setupChromeStorageMock = (data = {}) => {
  const storageData = {
    proxies: createMockProxies(),
    activeProxyId: '1',
    favorites: [],
    options: { startupRestore: true, quickSwitch: false, bypassList: ['localhost', '127.0.0.1'], language: 'en' },
    proxyMode: 'page',
    smartDomains: ['*.google.com', '*.youtube.com'],
    ...data
  };
  chrome.storage.local.get.mockImplementation((keys, callback) => {
    if (typeof keys === 'string') { callback({ [keys]: storageData[keys] }); }
    else if (Array.isArray(keys)) {
      const result = {};
      keys.forEach(key => { if (key in storageData) result[key] = storageData[key]; });
      callback(result);
    } else { callback(storageData); }
  });
  chrome.storage.local.set.mockImplementation((data, callback) => {
    Object.assign(storageData, data);
    if (callback) callback();
  });
  return storageData;
};

const setupChromeProxyMock = () => {
  chrome.proxy.settings.set.mockImplementation((details, callback) => { if (callback) callback(); });
};

module.exports = { createMockProxies, setupChromeStorageMock, setupChromeProxyMock };
