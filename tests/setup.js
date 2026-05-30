const chrome = require('jest-chrome');
global.chrome = chrome;

if (!chrome.storage) chrome.storage = {};
if (!chrome.storage.local) {
  chrome.storage.local = { get: jest.fn(), set: jest.fn(), remove: jest.fn(), clear: jest.fn() };
}
if (!chrome.storage.onChanged) {
  chrome.storage.onChanged = { addListener: jest.fn(), callListeners: jest.fn() };
}
if (!chrome.proxy) chrome.proxy = {};
if (!chrome.proxy.settings) {
  chrome.proxy.settings = { get: jest.fn(), set: jest.fn(), clear: jest.fn() };
}
if (!chrome.action) {
  chrome.action = { setBadgeText: jest.fn(), setBadgeBackgroundColor: jest.fn(), setIcon: jest.fn() };
}
if (!chrome.runtime) {
  chrome.runtime = {
    onMessage: { addListener: jest.fn(), callListeners: jest.fn() },
    onInstalled: { addListener: jest.fn(), callListeners: jest.fn() },
    onStartup: { addListener: jest.fn(), callListeners: jest.fn() },
    sendMessage: jest.fn(),
    openOptionsPage: jest.fn(),
    getURL: jest.fn(path => 'chrome-extension://test/' + path)
  };
}
if (!chrome.commands) {
  chrome.commands = { onCommand: { addListener: jest.fn(), callListeners: jest.fn() } };
}
if (!chrome.tabs) {
  chrome.tabs = {
    query: jest.fn(),
    get: jest.fn(),
    onActivated: { addListener: jest.fn() },
    onUpdated: { addListener: jest.fn() },
    onRemoved: { addListener: jest.fn() },
    onCreated: { addListener: jest.fn() },
    create: jest.fn()
  };
}

global.alert = jest.fn();
global.confirm = jest.fn(() => true);
global.fetch = jest.fn(() => Promise.resolve({
  ok: true,
  blob: () => Promise.resolve(new Blob()),
  json: () => Promise.resolve({})
}));
global.OffscreenCanvas = jest.fn((w, h) => ({
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    getImageData: jest.fn(() => ({ data: new Uint8ClampedArray(w * h * 4) })),
    beginPath: jest.fn(),
    arc: jest.fn(),
    clip: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    stroke: jest.fn(),
    fill: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    strokeStyle: '',
    fillStyle: '',
    lineWidth: 0,
    lineCap: ''
  })),
  width: w,
  height: h
}));
global.createImageBitmap = jest.fn(() => Promise.resolve({}));
global.ImageData = jest.fn((data, w, h) => ({ data, width: w, height: h }));
global.Blob = jest.fn(() => ({}));
jest.useFakeTimers();
