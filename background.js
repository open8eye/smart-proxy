// ============================================================
// background.js — 扩展后台脚本（Service Worker / Background Page）
// 职责：代理控制、标签页监听、图标动画、消息通信、流量统计
// ============================================================

// --- 浏览器检测 ---
var IS_FIREFOX = typeof browser !== 'undefined' && typeof browser.proxy !== 'undefined';
var firefoxProxyInfo = null;

// --- 图标动画状态 ---
var iconAnimationTimer = null;  // 动画定时器
var iconFrameIndex = 0;         // 当前动画帧
var totalFrames = 24;           // 总帧数

// --- 定时检测状态 ---
var pendingCheckTimer = null;   // pending状态检测定时器

// --- 流量统计状态 ---
var trafficStats = {};          // 流量统计数据 { host: { download, upload, connections, totalTime, type, ... } }
var activeConnections = {};     // 活跃连接 { requestId: { startTime, host, ... } }

// --- 默认智能代理域名列表 ---
var DEFAULT_SMART_DOMAINS = [
  '*.google.com',
  '*.youtube.com',
  '*.twitter.com',
  '*.facebook.com',
  '*.instagram.com',
  '*.github.com',
  '*.wikipedia.org'
];

// 获取浏览器默认语言，匹配扩展支持的语言列表
function getDefaultLanguage() {
  var available = ['zh_CN', 'zh_TW', 'en', 'ja', 'ko', 'fr', 'de', 'es'];
  var browserLang = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) ? chrome.i18n.getUILanguage() : 'en';
  var normalized = browserLang.replace('-', '_');
  if (available.indexOf(normalized) !== -1) return normalized;
  var short = normalized.split('_')[0];
  if (available.indexOf(short) !== -1) return short;
  return 'en';
}

// ============================================================
// 扩展生命周期事件
// ============================================================

// 扩展安装或更新时触发，初始化默认配置
chrome.runtime.onInstalled.addListener(function() {
  initializeExtension();
  // 重新加载扩展时也恢复代理设置
  restoreProxySettings();
});

// 浏览器启动时触发，恢复上次的代理设置
chrome.runtime.onStartup.addListener(function() {
  restoreProxySettings();
});

// ============================================================
// 流量统计功能
// ============================================================

// 加载流量统计数据
function loadTrafficStats() {
  chrome.storage.local.get(['trafficStats'], function(result) {
    if (result.trafficStats) {
      trafficStats = result.trafficStats;
    }
  });
}

// 保存流量统计数据
function saveTrafficStats() {
  chrome.storage.local.set({ trafficStats: trafficStats });
}

// 记录网络请求开始
function onRequestStarted(details) {
  var url = details.url;
  var host = '';
  try {
    host = new URL(url).hostname;
  } catch (e) {
    return;
  }
  if (!host) return;

  activeConnections[details.requestId] = {
    startTime: Date.now(),
    host: host,
    url: url,
    type: details.type,
    tabId: details.tabId
  };
}

// 记录网络请求完成
function onRequestCompleted(details) {
  var conn = activeConnections[details.requestId];
  if (!conn) return;

  var host = conn.host;
  var duration = Date.now() - conn.startTime;
  var responseHeaders = details.responseHeaders || [];
  var contentLength = 0;

  // 从响应头获取内容长度
  for (var i = 0; i < responseHeaders.length; i++) {
    if (responseHeaders[i].name.toLowerCase() === 'content-length') {
      contentLength = parseInt(responseHeaders[i].value, 10) || 0;
      break;
    }
  }

  // 初始化主机统计数据
  if (!trafficStats[host]) {
    trafficStats[host] = {
      download: 0,
      upload: 0,
      connections: 0,
      totalTime: 0,
      type: conn.type,
      timestamps: []
    };
  }

  var stats = trafficStats[host];
  stats.download += contentLength;
  stats.connections += 1;
  stats.totalTime += duration;
  stats.type = conn.type;
  stats.timestamps.push({
    time: conn.startTime,
    download: contentLength,
    upload: 0
  });

  // 清理旧数据（保留最近90天）
  var cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  stats.timestamps = stats.timestamps.filter(function(t) {
    return t.time > cutoff;
  });

  delete activeConnections[details.requestId];

  // 定期保存（每10个请求保存一次）
  if (Object.keys(activeConnections).length % 10 === 0) {
    saveTrafficStats();
  }
}

// 设置webRequest监听器
function setupTrafficMonitoring() {
  if (chrome.webRequest) {
    chrome.webRequest.onBeforeRequest.addListener(
      onRequestStarted,
      { urls: ['<all_urls>'] }
    );

    chrome.webRequest.onCompleted.addListener(
      onRequestCompleted,
      { urls: ['<all_urls>'] },
      ['responseHeaders']
    );
  }
}

// 清除流量统计数据
function clearTrafficStats() {
  trafficStats = {};
  chrome.storage.local.remove('trafficStats');
}

// 设置 Firefox 代理请求监听器
function setupFirefoxProxy() {
  if (!IS_FIREFOX) return;
  browser.proxy.onRequest.addListener(
    function(requestInfo) {
      if (firefoxProxyInfo) {
        return firefoxProxyInfo;
      }
      return { type: 'direct' };
    },
    { urls: ['<all_urls>'] }
  );
  browser.proxy.onError.addListener(function(error) {
    console.error('[代理错误]', error.message);
  });
}

// 初始化扩展：为所有存储项设置默认值（仅在不存在时）
function initializeExtension() {
  chrome.storage.local.get(['proxies', 'activeProxyId', 'tabProxies', 'favorites', 'options', 'proxyMode', 'smartDomains'], function(result) {
    if (!result.proxies) {
      chrome.storage.local.set({ proxies: [] });
    }
    if (!result.tabProxies) {
      chrome.storage.local.set({ tabProxies: {} });
    }
    if (!result.favorites) {
      chrome.storage.local.set({ favorites: [] });
    }
    if (!result.options) {
      chrome.storage.local.set({
        options: {
          startupRestore: true,   // 启动时恢复代理
          quickSwitch: false,     // 快捷键切换
          cascadeProxy: true,     // 级联代理（新标签页继承代理）
          bypassList: ['localhost', '127.0.0.1', '::1'],
          language: getDefaultLanguage()
        }
      });
    }
    if (!result.proxyMode) {
      chrome.storage.local.set({ proxyMode: 'page' });  // 默认页面模式
    }
    if (!result.smartDomains) {
      chrome.storage.local.set({ smartDomains: DEFAULT_SMART_DOMAINS });
    }
    // 如果有上次活跃的代理，立即恢复
    if (result.activeProxyId) {
      restoreProxySettings();
    }
  });

  // 初始化流量统计
  loadTrafficStats();
  setupTrafficMonitoring();

  // 初始化 Firefox 代理监听
  setupFirefoxProxy();
}

// 恢复代理设置：浏览器启动时自动应用上次使用的代理
function restoreProxySettings() {
  chrome.storage.local.get(['proxies', 'activeProxyId', 'options', 'proxyMode'], function(result) {
    var options = result.options || {};
    if (!options.startupRestore) return;  // 未开启启动恢复则跳过

    if (result.activeProxyId && result.proxies) {
      var activeProxy = result.proxies.find(function(p) { return p.id === result.activeProxyId; });
      if (activeProxy) {
        console.log('[恢复] 正在恢复代理: ' + activeProxy.name);
        applyProxy(activeProxy);
      }
    }
  });
}

// ============================================================
// 代理核心功能
// ============================================================

// 生成 fixed_servers 模式的代理配置对象（Chrome 专用）
function getProxyConfig(proxy) {
  return {
    mode: 'fixed_servers',
    rules: {
      singleProxy: {
        scheme: proxy.type,        // http / https / socks5
        host: proxy.host,
        port: parseInt(proxy.port)
      },
      bypassList: ['localhost', '127.0.0.1']
    }
  };
}

// 设置代理配置（内部函数，处理 Chrome/Firefox 差异）
function setProxyConfig(proxy) {
  if (IS_FIREFOX) {
    firefoxProxyInfo = {
      type: proxy.type,
      host: proxy.host,
      port: parseInt(proxy.port)
    };
    if (proxy.type === 'socks5' || proxy.type === 'socks4') {
      firefoxProxyInfo.proxyDNS = true;
    }
  } else {
    var config = getProxyConfig(proxy);
    chrome.proxy.settings.set({ value: config, scope: 'regular' }, function() {
      if (chrome.runtime.lastError) {
        console.error('代理错误:', chrome.runtime.lastError);
      }
    });
  }
}

// 切换为直连模式（内部函数）
function setDirectConnection() {
  if (IS_FIREFOX) {
    firefoxProxyInfo = null;
  } else {
    chrome.proxy.settings.set({ value: { mode: 'direct' }, scope: 'regular' }, function() {});
  }
}

// 应用代理：将代理设置写入代理 API，并启动图标动画
function applyProxy(proxy) {
  setProxyConfig(proxy);
  startIconAnimation('on');
}

// 禁用代理：切换为直连模式，清除活跃代理 ID
function disableProxy() {
  setDirectConnection();
  chrome.storage.local.set({ activeProxyId: null });
  startIconAnimation('off');
}

// ============================================================
// 图标动画系统
// ============================================================

// 创建 Canvas（兼容 Chrome OffscreenCanvas 和 Firefox DOM Canvas）
function createCanvas(width, height) {
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  var canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

// 设置扩展图标（兼容 Chrome action 和 Firefox browserAction）
function setExtensionIcon(details) {
  if (IS_FIREFOX) {
    browser.browserAction.setIcon(details);
  } else {
    chrome.action.setIcon(details);
  }
}

// 生成单帧图标：在基础图标上绘制状态环（绿色=已连接，红色=断开，黄色=待机）
function generateIconFrame(size, status, frame) {
  var canvas = createCanvas(size, size);
  var ctx = canvas.getContext('2d');

  return createImageBitmap(self.iconImageData || new ImageData(size, size)).then(function(img) {
    var centerX = size / 2;
    var centerY = size / 2;
    var outerRadius = size / 2 - 1;
    var lineWidth = size * 0.1;

    // 状态颜色配置
    var colors = {
      on:      { arc: 'rgba(76, 175, 80, 0.9)',  ring: 'rgba(76, 175, 80, 0.3)' },   // 绿色
      standby: { arc: 'rgba(245, 158, 11, 0.9)', ring: 'rgba(245, 158, 11, 0.3)' },  // 黄色
      off:     { arc: 'rgba(244, 67, 54, 0.9)',  ring: 'rgba(244, 67, 54, 0.4)' }    // 红色
    };
    var c = colors[status] || colors.off;

    // 绘制基础图标
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(img, 0, 0, size, size);
    ctx.restore();

    if (status === 'on' || status === 'standby') {
      // 已连接/待机状态：绘制旋转弧线 + 外环
      var startAngle = (frame / totalFrames) * Math.PI * 2 - Math.PI / 2;
      var endAngle = startAngle + Math.PI * 1.5;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius - lineWidth * 0.3, startAngle, endAngle);
      ctx.strokeStyle = c.arc;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = c.ring;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
    } else {
      // 断开状态：绘制静态双环
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = c.arc;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius - lineWidth * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = c.ring;
      ctx.lineWidth = lineWidth * 0.3;
      ctx.stroke();
    }

    return ctx.getImageData(0, 0, size, size);
  });
}

// 加载基础图标（earth.png）并缓存为 ImageData
function loadBaseIcon() {
  return fetch(chrome.runtime.getURL('icons/earth.png'))
    .then(function(response) { return response.blob(); })
    .then(function(blob) { return createImageBitmap(blob); })
    .then(function(bitmap) {
      var size = 32;
      var canvas = createCanvas(size, size);
      var ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, size, size);
      self.iconImageData = ctx.getImageData(0, 0, size, size);
    });
}

// 更新图标为当前帧
function updateIconFrame(status) {
  var size = 32;
  if (!self.iconImageData) {
    loadBaseIcon().then(function() {
      return generateIconFrame(size, status, iconFrameIndex);
    }).then(function(imageData) {
      setExtensionIcon({ imageData: { 32: imageData } });
    });
    return;
  }
  generateIconFrame(size, status, iconFrameIndex).then(function(imageData) {
    setExtensionIcon({ imageData: { 32: imageData } });
  });
}

// 启动图标动画：on/standby 为旋转动画，off 为静态
function startIconAnimation(status) {
  stopIconAnimation();

  if (!self.iconImageData) {
    loadBaseIcon().then(function() {
      startIconAnimation(status);
    });
    return;
  }

  iconFrameIndex = 0;

  if (status === 'on' || status === 'standby') {
    iconAnimationTimer = setInterval(function() {
      iconFrameIndex = (iconFrameIndex + 1) % totalFrames;
      updateIconFrame(status);
    }, 100);
    updateIconFrame(status);
  } else {
    updateIconFrame('off');
  }
}

// 停止图标动画
function stopIconAnimation() {
  if (iconAnimationTimer) {
    clearInterval(iconAnimationTimer);
    iconAnimationTimer = null;
  }
}

// ============================================================
// 延迟测试
// ============================================================

// 测试代理延迟：依次尝试 gstatic 和 cloudflare，每个请求 5 秒超时
function testProxyLatency(proxy) {
  return new Promise(function(resolve) {
    var startTime = Date.now();
    var timeout = setTimeout(function() { resolve(-1); }, 5000);
    fetch('https://www.gstatic.com/generate_204', { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
      .then(function() {
        clearTimeout(timeout);
        resolve(Date.now() - startTime);
      })
      .catch(function() {
        clearTimeout(timeout);
        var startTime2 = Date.now();
        var timeout2 = setTimeout(function() { resolve(-1); }, 5000);
        fetch('https://cp.cloudflare.com/generate_204', { method: 'HEAD', mode: 'no-cors', cache: 'no-store' })
          .then(function() {
            clearTimeout(timeout2);
            resolve(Date.now() - startTime2);
          })
          .catch(function() {
            clearTimeout(timeout2);
            resolve(-1);
          });
      });
  });
}

// ============================================================
// 标签页事件监听
// ============================================================

// 标签页切换事件由定时任务统一处理，此处仅保留日志记录
chrome.tabs.onActivated.addListener(function(activeInfo) {
  var tabId = activeInfo.tabId;
  console.log('[标签页切换] 标签页=' + tabId);
});

// 域名匹配函数：检查 hostname 是否在域名列表中（支持通配符 *.example.com）
function isDomainInList(hostname, list) {
  var host = hostname.toLowerCase();
  var hostNoWww = host.indexOf('www.') === 0 ? host.substring(4) : host;
  for (var i = 0; i < list.length; i++) {
    var item = list[i].toLowerCase().trim();
    if (!item) continue;
    if (item.indexOf('*.') === 0) {
      // 通配符匹配：*.example.com 匹配 sub.example.com
      var base = item.substring(2);
      if (hostNoWww === base || hostNoWww.endsWith('.' + base)) return true;
    } else {
      // 精确匹配：example.com 匹配 www.example.com
      var itemNoWww = item.indexOf('www.') === 0 ? item.substring(4) : item;
      if (hostNoWww === itemNoWww || hostNoWww.endsWith('.' + itemNoWww)) return true;
    }
  }
  return false;
}

// 监听标签页 URL 变化：仅用于日志记录，代理检测由定时任务统一处理
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
  var status = changeInfo.status || 'complete';
  var url = changeInfo.url || (status === 'loading' ? (tab.pendingUrl || tab.url) : null);
  if (!url) return;
  if (url.indexOf('http://') !== 0 && url.indexOf('https://') !== 0) return;

  if (status === 'loading') {
    if (tab.pendingUrl) {
      console.log('[URL更新] 标签页=' + tabId, '状态=pending', 'pending地址=' + tab.pendingUrl, '当前URL=' + url);
    } else {
      console.log('[URL更新] 标签页=' + tabId, '状态=loading', '网址=' + url);
    }
  } else {
    console.log('[URL更新] 标签页=' + tabId, '状态=' + status, '网址=' + url);
  }
});

// 监听标签页关闭：清理已关闭标签页的代理记录
chrome.tabs.onRemoved.addListener(function(tabId) {
  chrome.storage.local.get(['tabProxies'], function(result) {
    var tabProxies = result.tabProxies || {};
    if (tabProxies[tabId]) {
      delete tabProxies[tabId];
      chrome.storage.local.set({ tabProxies: tabProxies });
    }
  });
});

// 监听新标签页创建：级联代理功能
// 如果开启级联代理，从已代理标签页打开的新标签页也会自动代理
chrome.tabs.onCreated.addListener(function(tab) {
  if (!tab.openerTabId) return;  // 没有父标签页则跳过
  chrome.storage.local.get(['options', 'tabProxies', 'proxies', 'proxyMode'], function(result) {
    var options = result.options || {};
    if (options.cascadeProxy === false) return;  // 级联代理已关闭
    var mode = result.proxyMode || 'page';
    if (mode === 'global') return;  // 全局模式下无需级联

    // 检查父标签页是否有代理设置
    var tabProxies = result.tabProxies || {};
    var openerProxyId = tabProxies[tab.openerTabId];
    if (!openerProxyId) return;  // 父标签页没有代理

    var proxies = result.proxies || [];
    var proxy = proxies.find(function(p) { return p.id === openerProxyId; });
    if (!proxy) return;

    // 将父标签页的代理设置继承给新标签页
    tabProxies[tab.id] = openerProxyId;
    chrome.storage.local.set({ tabProxies: tabProxies });
    applyProxy(proxy);
    chrome.storage.local.set({ activeProxyId: openerProxyId });
  });
});

// ============================================================
// 消息通信：接收 popup/options 页面的消息
// ============================================================

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  // 设置代理（来自 popup 的开关操作）
  if (message.action === 'setProxy') {
    var proxy = message.proxy;
    chrome.storage.local.set({ activeProxyId: proxy.id }, function() {
      applyProxy(proxy);
      // 开启代理后刷新当前活动标签页，让代理立即生效
      chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
        if (tabs.length > 0) {
          var tab = tabs[0];
          // 如果标签页处于pending状态，使用tabs.update保持URL
          if (tab.status === 'loading' && tab.pendingUrl) {
            chrome.tabs.update(tab.id, { url: tab.pendingUrl });
          } else if (tab.url && tab.url.indexOf('http') === 0) {
            chrome.tabs.reload(tab.id);
          }
        }
      });
      sendResponse({ success: true });
    });
    return true;
  }

  // 禁用代理
  if (message.action === 'disableProxy') {
    disableProxy();
    sendResponse({ success: true });
    return true;
  }

  // 测试代理延迟
  if (message.action === 'testLatency') {
    var proxy = message.proxy;
    testProxyLatency(proxy).then(function(latency) {
      sendResponse({ success: true, latency: latency });
    });
    return true;
  }

  // 获取当前活动标签页信息
  if (message.action === 'getCurrentTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      if (tabs.length > 0) {
        sendResponse({ success: true, tab: tabs[0] });
      } else {
        sendResponse({ success: false });
      }
    });
    return true;
  }

  // 添加收藏域名
  if (message.action === 'addFavorite') {
    chrome.storage.local.get(['favorites', 'activeProxyId', 'proxies'], function(result) {
      var favorites = result.favorites || [];
      if (!favorites.includes(message.domain)) {
        favorites.push(message.domain);
        chrome.storage.local.set({ favorites: favorites }, function() {
          // 收藏添加后，如果有活跃代理则重新应用
          if (result.activeProxyId && result.proxies) {
            var proxy = result.proxies.find(function(p) { return p.id === result.activeProxyId; });
            if (proxy) {
              applyProxy(proxy);
            }
          }
          sendResponse({ success: true });
        });
      } else {
        sendResponse({ success: true, alreadyExists: true });
      }
    });
    return true;
  }

  // 移除收藏域名
  if (message.action === 'removeFavorite') {
    chrome.storage.local.get(['favorites'], function(result) {
      var favorites = (result.favorites || []).filter(function(f) { return f !== message.domain; });
      chrome.storage.local.set({ favorites: favorites }, function() {
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // 检查域名是否已收藏
  if (message.action === 'isFavorite') {
    chrome.storage.local.get(['favorites'], function(result) {
      var favorites = result.favorites || [];
      sendResponse({ success: true, isFavorite: favorites.includes(message.domain) });
    });
    return true;
  }

  // 设置代理模式（页面/全局/智能）
  if (message.action === 'setProxyMode') {
    console.log('[模式切换] 切换到模式: ' + message.mode);
    chrome.storage.local.set({ proxyMode: message.mode }, function() {
      chrome.storage.local.get(['proxies', 'activeProxyId'], function(result) {
        if (result.activeProxyId && result.proxies) {
          var activeProxy = result.proxies.find(function(p) { return p.id === result.activeProxyId; });
          if (activeProxy) {
            console.log('[模式切换] 应用代理: ' + activeProxy.name);
            applyProxy(activeProxy);
            // 切换模式后刷新当前活动标签页，让代理立即生效
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
              if (tabs.length > 0) {
                var tab = tabs[0];
                // 如果标签页处于pending状态，使用tabs.update保持URL
                if (tab.status === 'loading' && tab.pendingUrl) {
                  console.log('[模式切换] 标签页pending中，重定向: ' + tab.pendingUrl);
                  chrome.tabs.update(tab.id, { url: tab.pendingUrl });
                } else if (tab.url && tab.url.indexOf('http') === 0) {
                  console.log('[模式切换] 刷新标签页: ' + tab.id);
                  chrome.tabs.reload(tab.id);
                }
              }
            });
          } else {
            console.log('[模式切换] 未找到活跃代理');
          }
        } else {
          console.log('[模式切换] 没有设置活跃代理');
        }
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // 获取当前代理模式
  if (message.action === 'getProxyMode') {
    chrome.storage.local.get(['proxyMode'], function(result) {
      sendResponse({ success: true, mode: result.proxyMode || 'page' });
    });
    return true;
  }

  // 获取智能域名列表
  if (message.action === 'getSmartDomains') {
    chrome.storage.local.get(['smartDomains'], function(result) {
      sendResponse({ success: true, domains: result.smartDomains || DEFAULT_SMART_DOMAINS });
    });
    return true;
  }

  // 保存智能域名列表
  if (message.action === 'setSmartDomains') {
    chrome.storage.local.set({ smartDomains: message.domains }, function() {
      chrome.storage.local.get(['proxies', 'activeProxyId'], function(result) {
        if (result.activeProxyId && result.proxies) {
          var activeProxy = result.proxies.find(function(p) { return p.id === result.activeProxyId; });
          if (activeProxy) {
            applyProxy(activeProxy);
          }
        }
        sendResponse({ success: true });
      });
    });
    return true;
  }

  // 刷新延迟测试（点击延迟数字时触发）
  if (message.action === 'refreshLatency') {
    chrome.storage.local.get(['proxies', 'activeProxyId'], function(result) {
      if (result.activeProxyId && result.proxies) {
        var activeProxy = result.proxies.find(function(p) { return p.id === result.activeProxyId; });
        if (activeProxy) {
          testProxyLatency(activeProxy).then(function(latency) {
            sendResponse({ success: true, latency: latency });
          });
          return true;
        }
      }
      sendResponse({ success: false, latency: -1 });
    });
    return true;
  }

  // 清除流量统计数据
  if (message.action === 'clearTrafficStats') {
    clearTrafficStats();
    sendResponse({ success: true });
    return true;
  }
});

// ============================================================
// 快捷键命令
// ============================================================

// 监听快捷键命令：快速切换代理开关
chrome.commands.onCommand.addListener(function(command) {
  if (command === 'toggle-proxy') {
    chrome.storage.local.get(['options', 'proxies', 'activeProxyId'], function(data) {
      var options = data.options || {};
      if (!options.quickSwitch) return;  // 未开启快捷键切换

      if (data.activeProxyId) {
        disableProxy();  // 已有代理则关闭
      } else if (data.proxies && data.proxies.length > 0) {
        var proxy = data.proxies[0];
        chrome.storage.local.set({ activeProxyId: proxy.id }, function() {
          applyProxy(proxy);  // 无代理则开启第一个
        });
      }
    });
  }
});

// ============================================================
// 启动初始化
// ============================================================

// 加载基础图标并根据当前状态设置图标动画
loadBaseIcon().then(function() {
  chrome.storage.local.get(['activeProxyId'], function(result) {
    startIconAnimation(result.activeProxyId ? 'on' : 'off');
  });
});

// ============================================================
// 定时检测pending状态
// ============================================================

// 定时检测所有标签页状态，统一处理代理逻辑
function checkAllTabs() {
  chrome.tabs.query({}, function(tabs) {
    chrome.storage.local.get(['favorites', 'smartDomains', 'tabProxies', 'proxies', 'activeProxyId', 'proxyMode', 'options'], function(result) {
      var mode = result.proxyMode || 'page';
      if (mode === 'global') { return; }  // 全局模式下跳过

      var options = result.options || {};
      var favoriteQuickProxy = options.favoriteQuickProxy !== false;  // 默认开启

      var tabProxies = result.tabProxies || {};
      var favorites = result.favorites || [];
      var smartDomains = result.smartDomains || DEFAULT_SMART_DOMAINS;
      var proxies = result.proxies || [];
      var activeProxyId = result.activeProxyId;
      var hasActiveProxy = false;

      console.log('[定时检测] 开始检测，共', tabs.length, '个标签页，模式=' + mode);

      for (var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        var tabId = tab.id;

        // 获取当前URL（pending状态下优先使用pendingUrl）
        var url = tab.url;
        var pendingUrl = tab.pendingUrl;
        var currentUrl = pendingUrl || url;
        
        if (!currentUrl) continue;
        if (currentUrl.indexOf('http://') !== 0 && currentUrl.indexOf('https://') !== 0) continue;

        // 打印每个标签页的状态
        var statusInfo = tab.status;
        if (tab.status === 'loading' && pendingUrl) {
          statusInfo = 'pending';
          console.log('[定时检测] 标签页=' + tabId, '状态=pending', 'pending地址=' + pendingUrl, '活动=' + tab.active);
        } else {
          console.log('[定时检测] 标签页=' + tabId, '状态=' + statusInfo, '网址=' + currentUrl, '活动=' + tab.active);
        }

        // 如果标签页已有代理设置，检查是否是活动标签页
        if (tabProxies[tabId]) {
          if (tab.active) {
            hasActiveProxy = true;
            // 确保代理配置正确应用
            var proxy = proxies.find(function(p) { return p.id === tabProxies[tabId]; });
            if (proxy) {
              console.log('[定时检测] 活动标签页有代理，应用代理: ' + proxy.name);
              setProxyConfig(proxy);
              chrome.storage.local.set({ activeProxyId: tabProxies[tabId] });
              startIconAnimation('on');

              // pending状态下重定向到代理
              if (tab.status === 'loading' && pendingUrl) {
                console.log('[定时检测] 已有代理的标签页pending中，重定向到代理: ' + pendingUrl);
                chrome.tabs.update(tabId, { url: pendingUrl });
              }
            }
          }
          continue;
        }

        try {
          var hostname = new URL(currentUrl).hostname;
          if (!hostname || hostname.indexOf('.') === -1) continue;

          // 检查域名是否匹配收藏列表或智能域名列表
          var inFav = favoriteQuickProxy && isDomainInList(hostname, favorites);
          var inSmart = mode === 'smart' && isDomainInList(hostname, smartDomains);

          console.log('[定时检测] 标签页=' + tabId, '主机名=' + hostname, '收藏=' + inFav, '规则=' + inSmart);

          if (!inFav && !inSmart) continue;  // 不匹配任何列表，跳过

          // 获取要使用的代理服务器
          var proxyId = activeProxyId;
          var proxy = null;

          if (proxyId) {
            proxy = proxies.find(function(p) { return p.id === proxyId; });
          }
          if (!proxy && proxies.length > 0) {
            proxy = proxies[0];
            proxyId = proxy.id;
          }
          if (!proxy) {
            console.log('[定时检测] 标签页=' + tabId, '匹配成功但无可用代理');
            continue;
          }

          // 匹配成功：标记标签页、应用代理
          console.log('[定时检测] 匹配成功! 标签页=' + tabId, '主机名=' + hostname, '代理=' + proxy.name);
          tabProxies[tabId] = proxyId;
          
          // 如果是当前活动标签页，立即应用代理
          if (tab.active) {
            hasActiveProxy = true;
            setProxyConfig(proxy);
            chrome.storage.local.set({ activeProxyId: proxyId, tabProxies: tabProxies });
            startIconAnimation('on');

            if (tab.status === 'loading' && pendingUrl) {
              // pending状态下，使用tabs.update重定向到同一URL，取消当前pending请求
              console.log('[定时检测] 页面pending中，重定向到代理: ' + pendingUrl);
              chrome.tabs.update(tabId, { url: pendingUrl });
            } else if (tab.status === 'complete') {
              // 页面加载完成，reload让代理生效
              console.log('[定时检测] 页面加载完成，重新加载让代理生效');
              chrome.tabs.reload(tabId);
            }
          } else {
            // 非活动标签页，只记录设置，不立即应用
            chrome.storage.local.set({ tabProxies: tabProxies });
          }
        } catch (e) {
          console.error('[定时检测] 错误:', e);
        }
      }

      // 如果当前活动标签页没有代理，设置为直连模式
      if (!hasActiveProxy) {
        console.log('[定时检测] 活动标签页无代理，设置直连模式');
        setDirectConnection();
        startIconAnimation('off');
      } else {
        console.log('[定时检测] 活动标签页有代理，保持代理状态');
      }
    });
  });
}

// 启动定时检测
function startPendingCheck() {
  if (pendingCheckTimer) {
    clearInterval(pendingCheckTimer);
  }
  pendingCheckTimer = setInterval(checkAllTabs, 2000); // 每2秒检测一次
}

// 停止定时检测
function stopPendingCheck() {
  if (pendingCheckTimer) {
    clearInterval(pendingCheckTimer);
    pendingCheckTimer = null;
  }
}

// 启动定时检测
startPendingCheck();

// ============================================================
// 模块导出（仅用于测试环境）
// ============================================================

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeExtension: initializeExtension,
    restoreProxySettings: restoreProxySettings,
    applyProxy: applyProxy,
    disableProxy: disableProxy,
    setProxyConfig: setProxyConfig,
    setDirectConnection: setDirectConnection,
    startIconAnimation: startIconAnimation,
    stopIconAnimation: stopIconAnimation,
    generateIconFrame: generateIconFrame,
    testProxyLatency: testProxyLatency,
    matchesFavorite: isDomainInList,
    getProxyConfig: getProxyConfig,
    DEFAULT_SMART_DOMAINS: DEFAULT_SMART_DOMAINS,
    checkAllTabs: checkAllTabs,
    startPendingCheck: startPendingCheck,
    stopPendingCheck: stopPendingCheck,
    IS_FIREFOX: IS_FIREFOX
  };
}
