// ============================================================
// popup.js — 弹窗页面脚本
// 职责：代理开关控制、代理选择、延迟显示、收藏管理、UI 更新
// ============================================================

var IS_FIREFOX = typeof browser !== 'undefined' && typeof browser.proxy !== 'undefined' && typeof browser.proxy.onRequest !== 'undefined';

// 获取浏览器默认语言
function getDefaultLanguage() {
  const available = ['zh_CN', 'zh_TW', 'en', 'ja', 'ko', 'fr', 'de', 'es'];
  const browserLang = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) ? chrome.i18n.getUILanguage() : 'en';
  const normalized = browserLang.replace('-', '_');
  if (available.includes(normalized)) return normalized;
  const short = normalized.split('_')[0];
  if (available.includes(short)) return short;
  return 'en';
}

document.addEventListener('DOMContentLoaded', () => {
  // ============================================================
  // DOM 元素引用
  // ============================================================
  const elements = {
    statusBar: document.getElementById('statusBar'),
    statusValue: document.getElementById('statusValue'),
    statusLatency: document.getElementById('statusLatency'),
    proxySelect: document.getElementById('proxySelect'),
    proxyToggle: document.getElementById('proxyToggle'),
    proxyModeSelect: document.getElementById('proxyModeSelect'),
    actionButtons: document.getElementById('actionButtons'),
    editBtn: document.getElementById('editBtn'),
    deleteBtn: document.getElementById('deleteBtn'),
    currentUrlText: document.getElementById('currentUrlText'),
    currentUrlFavBtn: document.getElementById('currentUrlFavBtn'),
    currentUrlFavImg: document.getElementById('currentUrlFavImg'),
    favScopeDropdown: document.getElementById('favScopeDropdown'),
    favScopeAll: document.getElementById('favScopeAll'),
    favScopeCurrent: document.getElementById('favScopeCurrent'),
    addProxyBtn: document.getElementById('addProxyBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    helpBtn: document.getElementById('helpBtn'),
    dialogOverlay: document.getElementById('dialogOverlay'),
    dialog: document.getElementById('dialog'),
    dialogTitle: document.getElementById('dialogTitle'),
    dialogClose: document.getElementById('dialogClose'),
    dialogCancel: document.getElementById('dialogCancel'),
    proxyForm: document.getElementById('proxyForm'),
    proxyName: document.getElementById('proxyName'),
    proxyType: document.getElementById('proxyType'),
    proxyHost: document.getElementById('proxyHost'),
    proxyPort: document.getElementById('proxyPort'),
    proxyUsername: document.getElementById('proxyUsername'),
    proxyPassword: document.getElementById('proxyPassword')
  };

  // ============================================================
  // 状态变量
  // ============================================================
  let proxies = [];                // 所有代理服务器列表
  let activeProxyId = null;        // 当前活跃的代理 ID
  let editingProxyId = null;       // 正在编辑的代理 ID
  let proxyMode = 'page';          // 代理模式：page / global / smart
  let translations = {};           // 国际化翻译文本
  let currentTabHostname = '';     // 当前标签页的域名
  let currentTabProxied = false;   // 当前标签页是否已代理
  let tabExplicitlyProxied = false; // 当前标签页是否被手动开启代理
  let favoritesList = [];          // 收藏域名列表

  init();

  // ============================================================
  // 初始化
  // ============================================================
  function init() {
    loadTranslations(() => {
      localizeUI();       // 应用翻译文本到 UI
      localizeTitles();   // 应用翻译文本到 title 属性
      loadState();        // 从 storage 加载状态
      setupEventListeners(); // 绑定事件监听
    });
  }

  // 加载国际化翻译文件
  function loadTranslations(callback) {
    chrome.storage.local.get(['options'], (result) => {
      const lang = (result.options && result.options.language) || getDefaultLanguage();
      const url = chrome.runtime.getURL('_locales/' + lang + '/messages.json');
      fetch(url)
        .then(res => res.json())
        .then(data => {
          translations = data;
          callback();
        })
        .catch(() => {
          // 加载失败时回退到英文
          const fallbackUrl = chrome.runtime.getURL('_locales/en/messages.json');
          fetch(fallbackUrl)
            .then(res => res.json())
            .then(data => {
              translations = data;
              callback();
            });
        });
    });
  }

  // 获取翻译文本，支持占位符替换（如 $MS$ → 120）
  function getMessage(key, substitutions) {
    const msg = translations[key];
    if (!msg) return key;
    let text = msg.message || key;
    if (substitutions && msg.placeholders) {
      for (const placeholder in msg.placeholders) {
        const index = parseInt(msg.placeholders[placeholder].content.replace('$', '')) - 1;
        if (index >= 0 && index < substitutions.length) {
          text = text.replace(new RegExp('\\$' + placeholder.toUpperCase() + '\\$', 'gi'), substitutions[index]);
        }
      }
    }
    if (substitutions && !msg.placeholders) {
      for (let i = 0; i < substitutions.length; i++) {
        text = text.replace('$' + (i + 1), substitutions[i]);
      }
    }
    return text;
  }

  // 将翻译文本应用到所有带 data-i18n 属性的元素
  function localizeUI() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const msg = getMessage(key);
      if (msg) {
        el.textContent = msg;
      }
    });
  }

  // 将翻译文本应用到所有带 data-i18n-title 属性的元素的 title
  function localizeTitles() {
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const msg = getMessage(key);
      if (msg) {
        el.setAttribute('title', msg);
      }
    });
  }

  // 域名匹配：检查 hostname 是否在域名列表中（支持通配符）
  function isDomainInList(hostname, list) {
    const host = hostname.toLowerCase();
    const hostNoWww = host.startsWith('www.') ? host.substring(4) : host;
    for (const item of list) {
      const d = item.toLowerCase().trim();
      if (!d) continue;
      if (d.startsWith('*.')) {
        const base = d.substring(2);
        if (hostNoWww === base || hostNoWww.endsWith('.' + base)) return true;
      } else {
        const dNoWww = d.startsWith('www.') ? d.substring(4) : d;
        if (hostNoWww === dNoWww || hostNoWww.endsWith('.' + dNoWww)) return true;
      }
    }
    return false;
  }

  // URL 解析完成后：判断代理状态并更新 UI
  function afterUrlResolved(tabId, storageResult, windowId) {
    chrome.storage.local.get(['tabProxies', 'windowProxies'], tabResult => {
      const tabProxies = tabResult.tabProxies || {};
      const windowProxiesData = tabResult.windowProxies || {};
      const windowProxyId = windowId != null ? windowProxiesData[windowId] : null;

      if (tabProxies[tabId]) {
        activeProxyId = tabProxies[tabId];
        tabExplicitlyProxied = true;
      } else if (windowProxyId) {
        // 窗口级别有代理设置
        activeProxyId = windowProxyId;
        tabExplicitlyProxied = true;
      } else {
        activeProxyId = storageResult.activeProxyId || null;
        tabExplicitlyProxied = false;
      }
      currentTabProxied = tabExplicitlyProxied || (currentTabHostname ? isDomainFavorited(currentTabHostname) : false);
      if (!currentTabProxied && proxyMode === 'smart') {
        currentTabProxied = currentTabHostname ? isDomainInList(currentTabHostname, smartDomains) : false;
      }
      renderProxySelect();
      elements.proxyModeSelect.value = proxyMode;
      updateToggleState();
      updateStatusBar();
      updateCurrentUrlDisplay();
      updateActionButtons();
    });
  }

  // ============================================================
  // 状态加载：从 storage 读取所有状态并更新 UI
  // ============================================================
  function loadState() {
    chrome.storage.local.get(['proxies', 'activeProxyId', 'proxyMode', 'favorites', 'smartDomains'], result => {
      proxies = result.proxies || [];
      proxyMode = result.proxyMode || 'page';
      favoritesList = result.favorites || [];
      const smartDomains = result.smartDomains || [];

      if (proxyMode !== 'global') {
        // 非全局模式：需要获取当前标签页信息来判断代理状态
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (tabs.length > 0) {
            const tabId = tabs[0].id;
            const tab = tabs[0];
            const tabUrl = tab.pendingUrl || tab.url || '';

            // Firefox 回退：从 background 获取 onBeforeRequest 缓存的 URL
            const resolveUrl = (url) => {
              try { currentTabHostname = new URL(url).hostname; } catch (e) { currentTabHostname = ''; }
            };

            if (IS_FIREFOX) {
              chrome.runtime.sendMessage({ action: 'getFirefoxPendingUrl', tabId: tabId }, (resp) => {
                const firefoxUrl = (resp && resp.pendingUrl) || '';
                console.log('[popup] Firefox tabUrl=' + tabUrl, 'cachedUrl=' + firefoxUrl, 'tab.status=' + tab.status);
                // 优先使用缓存的 URL（loading 状态下更准确）
                const bestUrl = (tab.status === 'loading' && firefoxUrl) ? firefoxUrl : (tabUrl || firefoxUrl);
                resolveUrl(bestUrl);
                afterUrlResolved(tabId, result, tab.windowId);
              });
            } else {
              resolveUrl(tabUrl);
              afterUrlResolved(tabId, result, tab.windowId);
            }
          } else {
            activeProxyId = result.activeProxyId || null;
            currentTabHostname = '';
            currentTabProxied = false;
            renderProxySelect();
            elements.proxyModeSelect.value = proxyMode;
            updateToggleState();
            updateStatusBar();
            updateCurrentUrlDisplay();
            updateActionButtons();
          }
        });
      } else {
        // 全局模式：所有标签页都走代理
        activeProxyId = result.activeProxyId || null;
        currentTabProxied = true;
        renderProxySelect();
        elements.proxyModeSelect.value = proxyMode;
        updateToggleState();
        updateStatusBar();
        updateCurrentUrlDisplay();
        updateActionButtons();
      }
    });
  }

  // ============================================================
  // UI 更新函数
  // ============================================================

  // 渲染代理服务器下拉框选项
  function renderProxySelect() {
    const firstOption = elements.proxySelect.querySelector('option');
    elements.proxySelect.innerHTML = '';
    elements.proxySelect.appendChild(firstOption);

    proxies.forEach(proxy => {
      const option = document.createElement('option');
      option.value = proxy.id;
      option.textContent = `${proxy.name} (${proxy.type.toUpperCase()})`;
      elements.proxySelect.appendChild(option);
    });

    if (proxies.length > 0) {
      elements.proxySelect.value = activeProxyId || proxies[0].id;
    }
  }

  // 更新开关状态（根据当前标签页是否已代理）
  function updateToggleState() {
    if (proxyMode === 'global') {
      elements.proxyToggle.checked = !!activeProxyId;
    } else {
      elements.proxyToggle.checked = !!activeProxyId && currentTabProxied;
    }
  }

  // 更新状态栏显示（已连接/待机/断开 + 延迟）
  function updateStatusBar() {
    if (activeProxyId) {
      const proxy = proxies.find(p => p.id === activeProxyId);
      if (proxy) {
        if (currentTabProxied) {
          elements.statusBar.className = 'status-bar connected';
          elements.statusValue.textContent = getMessage('connected');
        } else {
          elements.statusBar.className = 'status-bar standby';
          elements.statusValue.textContent = getMessage('standby');
        }
        elements.statusLatency.textContent = '--';
        testAndShowLatency(proxy);  // 测试并显示延迟
      }
    } else {
      elements.statusBar.className = 'status-bar disconnected';
      elements.statusValue.textContent = getMessage('disconnected');
      elements.statusLatency.textContent = '--';
    }
  }

  // 检查域名是否已收藏
  function isDomainFavorited(hostname) {
    if (!hostname) return false;
    const host = hostname.toLowerCase();
    const hostNoWww = host.startsWith('www.') ? host.substring(4) : host;
    for (const fav of favoritesList) {
      const domain = (typeof fav === 'string' ? fav : fav.domain).toLowerCase().trim();
      if (!domain) continue;
      if (domain.startsWith('*.')) {
        const base = domain.substring(2);
        if (hostNoWww === base || hostNoWww.endsWith('.' + base)) return true;
      } else {
        const fNoWww = domain.startsWith('www.') ? domain.substring(4) : domain;
        if (hostNoWww === fNoWww || hostNoWww.endsWith('.' + fNoWww)) return true;
      }
    }
    return false;
  }

  // 查找匹配域名的收藏项（返回完整对象或 null）
  function findFavoriteObj(hostname) {
    if (!hostname) return null;
    const host = hostname.toLowerCase();
    const hostNoWww = host.startsWith('www.') ? host.substring(4) : host;
    for (const fav of favoritesList) {
      const domain = (typeof fav === 'string' ? fav : fav.domain).toLowerCase().trim();
      if (!domain) continue;
      if (domain.startsWith('*.')) {
        const base = domain.substring(2);
        if (hostNoWww === base || hostNoWww.endsWith('.' + base)) return fav;
      } else {
        const fNoWww = domain.startsWith('www.') ? domain.substring(4) : domain;
        if (hostNoWww === fNoWww || hostNoWww.endsWith('.' + fNoWww)) return fav;
      }
    }
    return null;
  }

  // 获取收藏项的域名字符串
  function getFavDomain(fav) {
    return typeof fav === 'string' ? fav : fav.domain;
  }

  // 隐藏收藏范围下拉菜单
  function hideFavScopeDropdown() {
    elements.favScopeDropdown.classList.remove('show');
  }

  // 更新当前 URL 显示和收藏按钮状态
  function updateCurrentUrlDisplay() {
    if (currentTabHostname) {
      elements.currentUrlText.textContent = currentTabHostname;
      elements.currentUrlText.title = currentTabHostname;
    } else {
      elements.currentUrlText.textContent = '--';
      elements.currentUrlText.title = '';
    }
    const fav = isDomainFavorited(currentTabHostname);
    elements.currentUrlFavImg.src = fav ? 'icons/collected.png' : 'icons/collection.png';
    elements.currentUrlFavBtn.title = fav ? getMessage('removeFavorite') : getMessage('favorite');
  }

  // 测试并显示代理延迟
  function testAndShowLatency(proxy) {
    chrome.runtime.sendMessage({
      action: 'testLatency',
      proxy
    }, response => {
      if (response && response.success && response.latency > 0) {
        elements.statusLatency.textContent = getMessage('latency', [response.latency.toString()]);
      } else {
        elements.statusLatency.textContent = getMessage('latencyFailed');
      }
    });
  }

  // 刷新延迟（点击延迟数字时触发）
  function refreshLatency() {
    if (!activeProxyId) return;
    const proxy = proxies.find(p => p.id === activeProxyId);
    if (!proxy) return;

    elements.statusLatency.textContent = '...';
    chrome.runtime.sendMessage({
      action: 'refreshLatency',
      proxy
    }, response => {
      if (response && response.success && response.latency > 0) {
        elements.statusLatency.textContent = getMessage('latency', [response.latency.toString()]);
      } else {
        elements.statusLatency.textContent = getMessage('latencyFailed');
      }
    });
  }

  // 更新编辑/删除按钮的可用状态
  function updateActionButtons() {
    const hasProxy = elements.proxySelect.value !== '';
    elements.editBtn.disabled = !hasProxy;
    elements.deleteBtn.disabled = !hasProxy;
  }

  // ============================================================
  // 事件监听绑定
  // ============================================================
  function setupEventListeners() {
    elements.proxySelect.addEventListener('change', handleProxySelect);
    elements.proxyToggle.addEventListener('change', handleToggle);
    elements.proxyModeSelect.addEventListener('change', handleProxyModeChange);
    elements.editBtn.addEventListener('click', handleEdit);
    elements.deleteBtn.addEventListener('click', handleDelete);
    elements.currentUrlFavBtn.addEventListener('click', handleFavorite);
    elements.favScopeAll.addEventListener('click', () => addFavoriteWithScope('all'));
    elements.favScopeCurrent.addEventListener('click', () => addFavoriteWithScope('specific'));
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.fav-wrapper')) {
        hideFavScopeDropdown();
      }
    });
    elements.addProxyBtn.addEventListener('click', () => showProxyDialog());
    elements.settingsBtn.addEventListener('click', handleSettings);
    elements.helpBtn.addEventListener('click', handleHelp);
    elements.statusLatency.addEventListener('click', refreshLatency);
    elements.dialogClose.addEventListener('click', hideDialog);
    elements.dialogCancel.addEventListener('click', hideDialog);
    elements.dialogOverlay.addEventListener('click', e => {
      if (e.target === elements.dialogOverlay) hideDialog();
    });
    elements.proxyForm.addEventListener('submit', handleFormSubmit);
  }

  // ============================================================
  // 事件处理函数
  // ============================================================

  // 代理模式切换（页面/全局/智能）
  function handleProxyModeChange() {
    proxyMode = elements.proxyModeSelect.value;
    chrome.storage.local.set({ proxyMode });
    chrome.runtime.sendMessage({
      action: 'setProxyMode',
      mode: proxyMode
    }, function(response) {
      // 收到响应后刷新popup状态
      if (response && response.success) {
        loadState();
      }
    });
  }

  // 代理服务器选择切换
  function handleProxySelect() {
    const proxyId = elements.proxySelect.value;
    updateActionButtons();

    if (elements.proxyToggle.checked && proxyId) {
      const proxy = proxies.find(p => p.id === proxyId);
      if (proxy) {
        enableProxy(proxy);
      }
    }
  }

  // 代理开关切换
  function handleToggle() {
    if (elements.proxyToggle.checked) {
      const proxyId = elements.proxySelect.value;
      const proxy = proxies.find(p => p.id === proxyId);
      if (proxy) {
        enableProxy(proxy);
      } else {
        elements.proxyToggle.checked = false;
      }
    } else {
      disableProxy();
    }
  }

  // 开启代理：记录当前标签页的代理设置，通知 background 应用代理
  function enableProxy(proxy) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        const windowId = tabs[0].windowId;
        chrome.storage.local.get(['tabProxies'], (result) => {
          const tabProxies = result.tabProxies || {};
          tabProxies[tabId] = proxy.id;
          chrome.storage.local.set({ tabProxies });
        });
        chrome.runtime.sendMessage({
          action: 'setProxy',
          proxy: proxy,
          windowId: windowId
        }, response => {
          if (response && response.success) {
            activeProxyId = proxy.id;
            updateStatusBar();
          }
        });
      }
    });
  }

  // 关闭代理：清除当前标签页的代理记录，通知 background 禁用代理
  function disableProxy() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        const windowId = tabs[0].windowId;
        chrome.storage.local.get(['tabProxies'], (result) => {
          const tabProxies = result.tabProxies || {};
          delete tabProxies[tabId];
          chrome.storage.local.set({ tabProxies });
        });
        chrome.runtime.sendMessage({
          action: 'disableProxy',
          windowId: windowId
        }, response => {
          if (response && response.success) {
            activeProxyId = null;
            updateStatusBar();
          }
        });
      }
    });
  }

  // 编辑代理：打开编辑弹窗
  function handleEdit() {
    const proxyId = elements.proxySelect.value;
    if (!proxyId) return;

    const proxy = proxies.find(p => p.id === proxyId);
    if (proxy) {
      showProxyDialog(proxy);
    }
  }

  // 删除代理：确认后从列表中移除
  function handleDelete() {
    const proxyId = elements.proxySelect.value;
    if (!proxyId) return;

    const confirmMessage = getMessage('deleteConfirm');
    if (confirm(confirmMessage)) {
      proxies = proxies.filter(p => p.id !== proxyId);

      if (activeProxyId === proxyId) {
        disableProxy();
      }

      chrome.storage.local.set({ proxies }, () => {
        renderProxySelect();
        updateActionButtons();
      });
    }
  }

  // 收藏/取消收藏当前域名
  function handleFavorite() {
    if (!currentTabHostname) return;

    const isFav = isDomainFavorited(currentTabHostname);

    if (isFav) {
      // 取消收藏
      const confirmMessage = getMessage('deleteConfirm');
      if (confirm(confirmMessage)) {
        const domainToRemove = currentTabHostname.toLowerCase();
        const wwwVariant = 'www.' + domainToRemove;
        const noWww = domainToRemove.startsWith('www.') ? domainToRemove.substring(4) : domainToRemove;
        const toRemove = favoritesList.filter(f => {
          const domain = (typeof f === 'string' ? f : f.domain).toLowerCase().trim();
          return domain === domainToRemove || domain === wwwVariant || domain === noWww || domain === 'www.' + noWww;
        });
        if (toRemove.length > 0) {
          const removeDomain = getFavDomain(toRemove[0]);
          chrome.runtime.sendMessage({ action: 'removeFavorite', domain: removeDomain }, () => {
            favoritesList = favoritesList.filter(f => !toRemove.includes(f));
            updateCurrentUrlDisplay();
            updateStatusBar();
          });
        }
      }
    } else {
      // 添加收藏：显示范围选择下拉菜单
      const dropdown = elements.favScopeDropdown;
      if (dropdown.classList.contains('show')) {
        hideFavScopeDropdown();
      } else {
        dropdown.classList.add('show');
      }
    }
  }

  // 执行收藏操作（由范围选择触发）
  function addFavoriteWithScope(scope) {
    if (!currentTabHostname) return;
    hideFavScopeDropdown();

    let proxyIds = [];
    if (scope === 'specific' && activeProxyId) {
      proxyIds = [activeProxyId];
    }

    chrome.runtime.sendMessage({
      action: 'addFavorite',
      domain: currentTabHostname,
      scope: scope,
      proxyIds: proxyIds
    }, () => {
      favoritesList.push({
        domain: currentTabHostname,
        scope: scope,
        proxyIds: proxyIds
      });
      updateCurrentUrlDisplay();
      if (!activeProxyId && proxies.length > 0) {
        const proxy = proxies[0];
        enableProxy(proxy);
      }
      loadState();
    });
  }

  // 打开设置页面
  function handleSettings() {
    chrome.runtime.openOptionsPage();
  }

  // 打开帮助页面
  function handleHelp() {
    chrome.tabs.create({ url: 'help.html' });
  }

  // ============================================================
  // 代理编辑弹窗
  // ============================================================

  // 显示代理编辑弹窗（添加或编辑模式）
  function showProxyDialog(proxy = null) {
    editingProxyId = proxy ? proxy.id : null;
    elements.dialogTitle.textContent = getMessage(proxy ? 'edit' : 'addProxy');

    if (proxy) {
      elements.proxyName.value = proxy.name;
      elements.proxyType.value = proxy.type;
      elements.proxyHost.value = proxy.host;
      elements.proxyPort.value = proxy.port;
      elements.proxyUsername.value = proxy.username || '';
      elements.proxyPassword.value = proxy.password || '';
    } else {
      elements.proxyForm.reset();
    }

    elements.dialogOverlay.classList.add('active');
  }

  // 隐藏弹窗
  function hideDialog() {
    elements.dialogOverlay.classList.remove('active');
    editingProxyId = null;
  }

  // 表单提交：保存代理配置
  function handleFormSubmit(e) {
    e.preventDefault();

    const proxyData = {
      name: elements.proxyName.value.trim(),
      type: elements.proxyType.value,
      host: elements.proxyHost.value.trim(),
      port: parseInt(elements.proxyPort.value),
      username: elements.proxyUsername.value.trim(),
      password: elements.proxyPassword.value
    };

    if (!proxyData.name || !proxyData.host || !proxyData.port) {
      return;
    }

    if (editingProxyId) {
      // 编辑模式：更新现有代理
      const index = proxies.findIndex(p => p.id === editingProxyId);
      if (index !== -1) {
        proxies[index] = { ...proxies[index], ...proxyData };
      }
    } else {
      // 添加模式：创建新代理
      proxyData.id = Date.now().toString();
      proxies.push(proxyData);
    }

    chrome.storage.local.set({ proxies }, () => {
      hideDialog();
      renderProxySelect();
      updateActionButtons();
    });
  }
});
