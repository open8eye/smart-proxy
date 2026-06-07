// ============================================================
// options.js — 设置页面脚本
// 职责：代理管理、收藏管理、智能域名管理、设置保存/导入导出
// ============================================================

var IS_FIREFOX = typeof browser !== 'undefined' && typeof browser.proxy !== 'undefined' && typeof browser.proxy.onRequest !== 'undefined';

// 禁用代理（兼容 Chrome 和 Firefox）
function disableProxySettings(callback) {
  if (IS_FIREFOX) {
    chrome.runtime.sendMessage({ action: 'disableProxy' }, callback);
  } else {
    chrome.proxy.settings.set({ value: { mode: 'direct' }, scope: 'regular' }, callback);
  }
}

// 获取浏览器默认语言
function getDefaultLanguage() {
  var available = ['zh_CN', 'zh_TW', 'en', 'ja', 'ko', 'fr', 'de', 'es'];
  var browserLang = (typeof chrome !== 'undefined' && chrome.i18n && chrome.i18n.getUILanguage) ? chrome.i18n.getUILanguage() : 'en';
  var normalized = browserLang.replace('-', '_');
  if (available.indexOf(normalized) !== -1) return normalized;
  var short = normalized.split('_')[0];
  if (available.indexOf(short) !== -1) return short;
  return 'en';
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
  loadTranslations(function() {
    applyI18n();        // 应用国际化文本
    loadOptions();      // 加载设置
    loadProxies();      // 加载代理列表
    loadFavorites();    // 加载收藏列表
    loadSmartDomains(); // 加载智能域名
    // loadPacScript();    // 加载 PAC 脚本预览（已屏蔽）
    bindEvents();       // 绑定事件
  });
});

var translations = {};

// ============================================================
// 国际化
// ============================================================

// 加载翻译文件
function loadTranslations(callback) {
  chrome.storage.local.get(['options'], function(result) {
    var lang = (result.options && result.options.language) || getDefaultLanguage();
    var url = chrome.runtime.getURL('_locales/' + lang + '/messages.json');
    fetch(url)
      .then(function(res) { return res.json(); })
      .then(function(data) {
        translations = data;
        callback();
      })
      .catch(function() {
        // 加载失败时回退到英文
        var fallbackUrl = chrome.runtime.getURL('_locales/en/messages.json');
        fetch(fallbackUrl)
          .then(function(res) { return res.json(); })
          .then(function(data) {
            translations = data;
            callback();
          });
      });
  });
}

// 获取翻译文本，支持占位符替换
function getMessage(key, substitutions) {
  var msg = translations[key];
  if (!msg) return key;
  var text = msg.message || key;
  if (substitutions && msg.placeholders) {
    for (var placeholder in msg.placeholders) {
      var index = msg.placeholders[placeholder].content.replace('$', '');
      text = text.replace(new RegExp('\\$' + placeholder + '\\$', 'gi'), substitutions[parseInt(index)] || '');
    }
  }
  if (substitutions) {
    for (var i = 0; i < substitutions.length; i++) {
      text = text.replace('$' + (i + 1), substitutions[i]);
    }
  }
  return text;
}

// 将翻译文本应用到所有带 data-i18n 属性的元素
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var message = getMessage(key);
    if (message) {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        return;  // 跳过表单元素
      }
      el.textContent = message;
    }
  });

  // 应用 placeholder 翻译
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-placeholder');
    var message = getMessage(key);
    if (message) {
      el.placeholder = message;
    }
  });

  // 应用 title 翻译
  document.querySelectorAll('[data-i18n-title]').forEach(function(el) {
    var key = el.getAttribute('data-i18n-title');
    var message = getMessage(key);
    if (message) {
      el.title = message;
    }
  });

  document.title = getMessage('optionsTitle') || 'Smart Proxy Options';
}

// ============================================================
// 事件绑定
// ============================================================

function bindEvents() {
  document.getElementById('save-btn').addEventListener('click', saveOptions);
  document.getElementById('reset-btn').addEventListener('click', resetOptions);
  document.getElementById('import-btn').addEventListener('click', importData);
  document.getElementById('export-btn').addEventListener('click', exportData);
  document.getElementById('export-config-btn').addEventListener('click', exportConfigToFile);
  document.getElementById('import-config-file').addEventListener('change', importConfigFromFile);
  document.getElementById('save-proxy-btn').addEventListener('click', saveProxy);
  document.getElementById('cancel-edit-btn').addEventListener('click', closeModal);
  document.getElementById('modal-close-btn').addEventListener('click', closeModal);

  document.getElementById('save-fav-edit-btn').addEventListener('click', saveFavoriteScope);
  document.getElementById('cancel-fav-edit-btn').addEventListener('click', closeFavModal);
  document.getElementById('fav-modal-close-btn').addEventListener('click', closeFavModal);

  document.getElementById('edit-fav-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeFavModal();
    }
  });

  // 点击弹窗外部关闭
  document.getElementById('edit-proxy-modal').addEventListener('click', function(e) {
    if (e.target === this) {
      closeModal();
    }
  });

  // 语言切换：保存后重新加载翻译
  document.getElementById('language-select').addEventListener('change', function() {
    chrome.storage.local.get(['options'], function(result) {
      var options = result.options || {};
      options.language = document.getElementById('language-select').value;
      chrome.storage.local.set({ options: options }, function() {
        loadTranslations(function() {
          applyI18n();
          // loadPacScript(); // PAC脚本功能已屏蔽
          showStatus(getMessage('languageSaved'), 'success');
        });
      });
    });
  });

  // PAC脚本功能暂时屏蔽，待后续设计完善后再启用
  /*
  // 智能域名输入时实时更新 PAC 预览
  document.getElementById('smart-domains').addEventListener('input', function() {
    generatePacPreview();
  });

  // 保存自定义 PAC 规则
  document.getElementById('save-pac-btn').addEventListener('click', function() {
    var content = document.getElementById('pac-script').value;
    var customPart = extractCustomPacRules(content);
    chrome.storage.local.set({ customPacRules: customPart }, function() {
      showStatus(getMessage('pacSaved'), 'success');
    });
  });
  */

  // Tabs 切换
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var tabId = this.getAttribute('data-tab');
      // 切换按钮状态
      document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      // 切换内容显示
      document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
      document.getElementById('tab-' + tabId).classList.add('active');
      // 如果切换到统计页面，加载统计数据
      if (tabId === 'statistics') {
        loadStatistics();
      }
      // 如果切换到日志页面，加载日志
      if (tabId === 'logs') {
        loadLogs();
      }
    });
  });

  // 统计页面事件
  document.querySelectorAll('.stats-filter .btn-sm').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.stats-filter .btn-sm').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
      loadStatistics(this.getAttribute('data-period'));
    });
  });

  document.getElementById('refresh-stats-btn').addEventListener('click', function() {
    loadStatistics();
  });

  document.getElementById('clear-stats-btn').addEventListener('click', function() {
    if (confirm(getMessage('confirmClearStats') || '确定要清除所有统计数据吗？')) {
      chrome.runtime.sendMessage({ action: 'clearTrafficStats' }, function() {
        loadStatistics();
        showStatus(getMessage('statsCleared') || '统计数据已清除', 'success');
      });
    }
  });

  // 日志页面事件
  document.getElementById('refresh-log-btn').addEventListener('click', function() {
    loadLogs();
  });

  document.getElementById('clear-log-btn').addEventListener('click', function() {
    if (confirm(getMessage('confirmClearLog') || '确定要清除所有日志吗？')) {
      chrome.runtime.sendMessage({ action: 'clearLogs' }, function() {
        loadLogs();
        showStatus(getMessage('logCleared') || '日志已清除', 'success');
      });
    }
  });

  document.getElementById('export-log-btn-tab').addEventListener('click', function() {
    exportLogs();
  });
}

// ============================================================
// 设置加载与保存
// ============================================================

// 从 storage 加载设置并填充表单
function loadOptions() {
  chrome.storage.local.get(['options'], function(result) {
    var options = result.options || {};
    document.getElementById('startup-restore').checked = options.startupRestore || false;
    document.getElementById('quick-switch').checked = options.quickSwitch || false;
    document.getElementById('cascade-proxy').checked = options.cascadeProxy === true;  // 默认关闭
    document.getElementById('favorite-quick-proxy').checked = options.favoriteQuickProxy !== false;  // 默认开启
    document.getElementById('icon-animation').checked = options.iconAnimation === true;  // 默认关闭

    var bypassList = options.bypassList || [];
    document.getElementById('bypass-list').value = bypassList.join('\n');

    var langSelect = document.getElementById('language-select');
    if (options.language) {
      langSelect.value = options.language;
    }
  });
}

// 保存设置
function saveOptions() {
  var startupRestore = document.getElementById('startup-restore').checked;
  var quickSwitch = document.getElementById('quick-switch').checked;
  var cascadeProxy = document.getElementById('cascade-proxy').checked;
  var favoriteQuickProxy = document.getElementById('favorite-quick-proxy').checked;
  var iconAnimation = document.getElementById('icon-animation').checked;
  var bypassText = document.getElementById('bypass-list').value.trim();
  var bypassList = bypassText ? bypassText.split('\n').map(function(line) { return line.trim(); }).filter(function(line) { return line.length > 0; }) : [];
  var language = document.getElementById('language-select').value;
  var smartDomainsText = document.getElementById('smart-domains').value.trim();
  var smartDomains = smartDomainsText ? smartDomainsText.split('\n').map(function(line) { return line.trim(); }).filter(function(line) { return line.length > 0; }) : [];

  chrome.storage.local.get(['options'], function(result) {
    var options = result.options || {};
    options.startupRestore = startupRestore;
    options.quickSwitch = quickSwitch;
    options.cascadeProxy = cascadeProxy;
    options.favoriteQuickProxy = favoriteQuickProxy;
    options.iconAnimation = iconAnimation;
    options.bypassList = bypassList;
    options.language = language;

    chrome.storage.local.set({ options: options, smartDomains: smartDomains }, function() {
      // loadPacScript(); // PAC脚本功能已屏蔽
      showStatus(getMessage('optionsSaved'), 'success');
    });
  });
}

// 重置所有设置为默认值
function resetOptions() {
  if (!confirm(getMessage('confirmReset'))) return;

  chrome.storage.local.clear(function() {
    disableProxySettings(function() {
      document.getElementById('startup-restore').checked = false;
      document.getElementById('quick-switch').checked = false;
      document.getElementById('bypass-list').value = '';
      document.getElementById('language-select').value = 'en';
      document.getElementById('import-export-data').value = '';
      document.getElementById('smart-domains').value = '';
      document.getElementById('pac-script').value = '';

      loadProxies();
      loadFavorites();
      showStatus(getMessage('optionsReset'), 'success');
    });
  });
}

// ============================================================
// 代理管理
// ============================================================

// 加载代理列表并渲染表格
function loadProxies() {
  chrome.storage.local.get(['proxies'], function(result) {
    var proxies = result.proxies || [];
    var tbody = document.getElementById('proxies-tbody');
    var noProxies = document.getElementById('no-proxies');
    var table = document.getElementById('proxies-table');

    tbody.innerHTML = '';

    if (proxies.length === 0) {
      table.style.display = 'none';
      noProxies.style.display = 'block';
      return;
    }

    table.style.display = 'table';
    noProxies.style.display = 'none';

    proxies.forEach(function(proxy) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td>' + escapeHtml(proxy.name) + '</td>' +
        '<td>' + escapeHtml(proxy.type.toUpperCase()) + '</td>' +
        '<td>' + escapeHtml(proxy.host) + '</td>' +
        '<td>' + proxy.port + '</td>' +
        '<td>' + escapeHtml(proxy.username || '-') + '</td>' +
        '<td class="actions-cell">' +
          '<button class="btn btn-small btn-secondary edit-proxy-btn" data-id="' + proxy.id + '">' + getMessage('editBtn') + '</button>' +
          '<button class="btn btn-small btn-danger delete-proxy-btn" data-id="' + proxy.id + '">' + getMessage('deleteBtn') + '</button>' +
        '</td>';
      tbody.appendChild(tr);
    });

    // 绑定编辑/删除按钮事件
    tbody.querySelectorAll('.edit-proxy-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        editProxy(this.getAttribute('data-id'));
      });
    });

    tbody.querySelectorAll('.delete-proxy-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        deleteProxy(this.getAttribute('data-id'));
      });
    });
  });
}

// 打开编辑弹窗填充代理数据
function editProxy(id) {
  chrome.storage.local.get(['proxies'], function(result) {
    var proxies = result.proxies || [];
    var proxy = proxies.find(function(p) { return p.id === id; });
    if (!proxy) return;

    document.getElementById('edit-proxy-id').value = proxy.id;
    document.getElementById('proxy-name').value = proxy.name;
    document.getElementById('proxy-type').value = proxy.type;
    document.getElementById('proxy-host').value = proxy.host;
    document.getElementById('proxy-port').value = proxy.port;
    document.getElementById('proxy-username').value = proxy.username || '';
    document.getElementById('proxy-password').value = proxy.password || '';

    openModal();
  });
}

// 保存代理（编辑或新增）
function saveProxy() {
  var id = document.getElementById('edit-proxy-id').value;
  var name = document.getElementById('proxy-name').value.trim();
  var type = document.getElementById('proxy-type').value;
  var host = document.getElementById('proxy-host').value.trim();
  var port = parseInt(document.getElementById('proxy-port').value);
  var username = document.getElementById('proxy-username').value.trim();
  var password = document.getElementById('proxy-password').value;

  if (!name) {
    showStatus(getMessage('nameRequired'), 'error');
    return;
  }
  if (!host) {
    showStatus(getMessage('hostRequired'), 'error');
    return;
  }
  if (!port || port < 1 || port > 65535) {
    showStatus(getMessage('portInvalid'), 'error');
    return;
  }

  chrome.storage.local.get(['proxies'], function(result) {
    var proxies = result.proxies || [];
    var index = proxies.findIndex(function(p) { return p.id === id; });

    var proxyData = {
      id: id,
      name: name,
      type: type,
      host: host,
      port: port,
      username: username,
      password: password
    };

    if (index >= 0) {
      proxies[index] = proxyData;  // 更新现有
    } else {
      proxies.push(proxyData);     // 新增
    }

    chrome.storage.local.set({ proxies: proxies }, function() {
      loadProxies();
      closeModal();
      showStatus(getMessage('proxySaved'), 'success');
    });
  });
}

// 删除代理
function deleteProxy(id) {
  if (!confirm(getMessage('confirmDeleteProxy'))) return;

  chrome.storage.local.get(['proxies', 'activeProxyId'], function(result) {
    var proxies = result.proxies || [];
    proxies = proxies.filter(function(p) { return p.id !== id; });

    var updates = { proxies: proxies };

    // 如果删除的是当前活跃代理，清除代理设置
    if (result.activeProxyId === id) {
      updates.activeProxyId = null;
      disableProxySettings();
    }

    chrome.storage.local.set(updates, function() {
      loadProxies();
      showStatus(getMessage('proxyDeleted'), 'success');
    });
  });
}

// ============================================================
// 收藏管理
// ============================================================

// 加载收藏列表并渲染
function loadFavorites() {
  chrome.storage.local.get(['favorites', 'proxies'], function(result) {
    var favorites = result.favorites || [];
    var proxies = result.proxies || [];
    var container = document.getElementById('favorites-list');
    var noFavorites = document.getElementById('no-favorites');

    container.innerHTML = '';

    if (favorites.length === 0) {
      noFavorites.style.display = 'block';
      container.style.display = 'none';
      return;
    }

    noFavorites.style.display = 'none';
    container.style.display = 'flex';

    favorites.forEach(function(fav) {
      var domain = typeof fav === 'string' ? fav : fav.domain;
      var scope = (typeof fav === 'object' && fav.scope) ? fav.scope : 'all';
      var proxyIds = (typeof fav === 'object' && Array.isArray(fav.proxyIds)) ? fav.proxyIds : [];

      var scopeLabel = '';
      if (scope === 'all') {
        scopeLabel = '<span class="fav-scope-badge fav-scope-all">' + escapeHtml(getMessage('scopeAllProxies')) + '</span>';
      } else {
        var proxyNames = proxyIds.map(function(pid) {
          var p = proxies.find(function(pr) { return pr.id === pid; });
          return p ? escapeHtml(p.name) : pid;
        }).join(', ');
        scopeLabel = '<span class="fav-scope-badge fav-scope-specific">' + escapeHtml(getMessage('scopeSpecificProxies')) + (proxyNames ? ': ' + proxyNames : '') + '</span>';
      }

      var item = document.createElement('div');
      item.className = 'favorite-item';
      item.innerHTML =
        '<div class="favorite-info">' +
          '<span class="favorite-domain">' + escapeHtml(domain) + '</span>' +
          scopeLabel +
        '</div>' +
        '<div class="favorite-actions">' +
          '<button class="favorite-edit" data-domain="' + escapeHtml(domain) + '" title="' + getMessage('editFavorite') + '">&#9998;</button>' +
          '<button class="favorite-remove" data-domain="' + escapeHtml(domain) + '" title="' + getMessage('removeFavorite') + '">&times;</button>' +
        '</div>';
      container.appendChild(item);
    });

    container.querySelectorAll('.favorite-edit').forEach(function(btn) {
      btn.addEventListener('click', function() {
        editFavorite(this.getAttribute('data-domain'));
      });
    });
    container.querySelectorAll('.favorite-remove').forEach(function(btn) {
      btn.addEventListener('click', function() {
        removeFavorite(this.getAttribute('data-domain'));
      });
    });
  });
}

// 移除收藏域名
function removeFavorite(domain) {
  if (!confirm(getMessage('confirmRemoveFavorite'))) return;

  chrome.storage.local.get(['favorites'], function(result) {
    var favorites = (result.favorites || []).filter(function(f) {
      var d = typeof f === 'string' ? f : f.domain;
      return d !== domain;
    });
    chrome.storage.local.set({ favorites: favorites }, function() {
      loadFavorites();
      showStatus(getMessage('favoriteRemoved'), 'success');
    });
  });
}

// 编辑收藏范围
function editFavorite(domain) {
  chrome.storage.local.get(['favorites', 'proxies'], function(result) {
    var favorites = result.favorites || [];
    var proxies = result.proxies || [];
    var fav = null;
    for (var i = 0; i < favorites.length; i++) {
      var d = typeof favorites[i] === 'string' ? favorites[i] : favorites[i].domain;
      if (d === domain) { fav = favorites[i]; break; }
    }
    if (!fav) return;

    var scope = (typeof fav === 'object' && fav.scope) ? fav.scope : 'all';
    var proxyIds = (typeof fav === 'object' && Array.isArray(fav.proxyIds)) ? fav.proxyIds : [];

    document.getElementById('edit-fav-domain').value = domain;

    var scopeAllRadio = document.getElementById('fav-scope-all');
    var scopeSpecificRadio = document.getElementById('fav-scope-specific');
    scopeAllRadio.checked = scope === 'all';
    scopeSpecificRadio.checked = scope === 'specific';

    var checkboxesContainer = document.getElementById('fav-proxy-checkboxes');
    checkboxesContainer.innerHTML = '';

    if (proxies.length === 0) {
      checkboxesContainer.innerHTML = '<div class="empty-state">' + escapeHtml(getMessage('noProxies')) + '</div>';
    } else {
      proxies.forEach(function(proxy) {
        var label = document.createElement('label');
        label.className = 'checkbox-item';
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = proxy.id;
        checkbox.checked = proxyIds.indexOf(proxy.id) !== -1;
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(' ' + escapeHtml(proxy.name)));
        checkboxesContainer.appendChild(label);
      });
    }

    checkboxesContainer.style.display = scope === 'specific' ? 'flex' : 'none';

    scopeAllRadio.onchange = function() {
      checkboxesContainer.style.display = 'none';
    };
    scopeSpecificRadio.onchange = function() {
      checkboxesContainer.style.display = 'flex';
    };

    openFavModal();
  });
}

// 保存收藏范围编辑
function saveFavoriteScope() {
  var domain = document.getElementById('edit-fav-domain').value;
  var scopeAllRadio = document.getElementById('fav-scope-all');
  var scope = scopeAllRadio.checked ? 'all' : 'specific';
  var proxyIds = [];

  if (scope === 'specific') {
    var checkboxes = document.querySelectorAll('#fav-proxy-checkboxes input[type="checkbox"]:checked');
    checkboxes.forEach(function(cb) { proxyIds.push(cb.value); });
    if (proxyIds.length === 0) {
      showStatus(getMessage('selectAtLeastOneProxy'), 'error');
      return;
    }
  }

  chrome.storage.local.get(['favorites'], function(result) {
    var favorites = (result.favorites || []).map(function(f) {
      var d = typeof f === 'string' ? f : f.domain;
      if (d === domain) {
        return { domain: domain, scope: scope, proxyIds: proxyIds };
      }
      return typeof f === 'string' ? { domain: f, scope: 'all', proxyIds: [] } : f;
    });
    chrome.storage.local.set({ favorites: favorites }, function() {
      closeFavModal();
      loadFavorites();
      showStatus(getMessage('favoriteScopeUpdated'), 'success');
    });
  });
}

// 打开编辑收藏弹窗
function openFavModal() {
  document.getElementById('edit-fav-modal').classList.add('active');
}

// 关闭编辑收藏弹窗
function closeFavModal() {
  document.getElementById('edit-fav-modal').classList.remove('active');
  document.getElementById('edit-fav-domain').value = '';
  document.getElementById('fav-proxy-checkboxes').innerHTML = '';
}

// ============================================================
// 智能域名与 PAC 脚本
// ============================================================

// 加载智能域名列表
function loadSmartDomains() {
  chrome.storage.local.get(['smartDomains'], function(result) {
    var domains = result.smartDomains || [];
    document.getElementById('smart-domains').value = domains.join('\n');
  });
}

// PAC脚本功能暂时屏蔽，待后续设计完善后再启用
/*
// 加载 PAC 脚本预览
function loadPacScript() {
  chrome.storage.local.get(['smartDomains', 'favorites', 'customPacRules'], function(result) {
    var smartDomains = result.smartDomains || [];
    var favorites = result.favorites || [];
    var customRules = result.customPacRules || '';
    var pacScript = generatePacScript(smartDomains, favorites, customRules);
    document.getElementById('pac-script').value = pacScript;
  });
}

// 从 PAC 脚本中提取自定义规则（排除同步的智能域名和收藏部分）
function extractCustomPacRules(content) {
  var lines = content.split('\n');
  var customLines = [];
  var inSynced = false;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (line.indexOf('// SYNCED:') !== -1) {
      inSynced = true;
      continue;
    }
    if (line.indexOf('// END SYNCED:') !== -1) {
      inSynced = false;
      continue;
    }
    if (!inSynced) {
      if (line.indexOf('function FindProxyForURL') !== -1) continue;
      if (line === '}') continue;
      if (line.trim().indexOf('return "DIRECT"') !== -1) continue;
      customLines.push(line);
    }
  }

  return customLines.join('\n').trim();
}

// 生成 PAC 脚本内容（用于预览）
function generatePacScript(smartDomains, favorites, customRules) {
  var lines = [];
  lines.push('function FindProxyForURL(url, host) {');

  // 智能域名部分
  lines.push('');
  lines.push('  // ' + getMessage('syncedSmartDomains'));
  lines.push('  // SYNCED: SMART DOMAINS');

  if (smartDomains.length > 0) {
    var domainConditions = smartDomains.map(function(domain) {
      domain = domain.trim();
      if (domain.indexOf('*.') === 0) {
        var base = domain.substring(2);
        return '    shExpMatch(host, "*.' + base + '") || host === "' + base + '"';
      }
      return '    shExpMatch(host, "' + domain + '")';
    });
    lines.push('  if (');
    lines.push(domainConditions.join(' ||\n'));
    lines.push('  ) {');
    lines.push('    return "PROXY __PROXY_HOST__:__PROXY_PORT__";');
    lines.push('  }');
  } else {
    lines.push('  // (empty)');
  }

  lines.push('  // END SYNCED: SMART DOMAINS');

  // 收藏域名部分
  lines.push('');
  lines.push('  // ' + getMessage('syncedFavorites'));
  lines.push('  // SYNCED: FAVORITES');

  if (favorites.length > 0) {
    var favConditions = favorites.map(function(domain) {
      domain = domain.trim();
      return '    shExpMatch(host, "*.' + domain + '") || host === "' + domain + '"';
    });
    lines.push('  if (');
    lines.push(favConditions.join(' ||\n'));
    lines.push('  ) {');
    lines.push('    return "PROXY __PROXY_HOST__:__PROXY_PORT__";');
    lines.push('  }');
  } else {
    lines.push('  // (empty)');
  }

  lines.push('  // END SYNCED: FAVORITES');

  // 自定义规则部分
  if (customRules && customRules.trim()) {
    lines.push('');
    lines.push('  // Custom rules');
    lines.push(customRules);
  }

  lines.push('');
  lines.push('  return "DIRECT";');
  lines.push('}');

  return lines.join('\n');
}

// 实时更新 PAC 预览（当智能域名输入变化时）
function generatePacPreview() {
  var textarea = document.getElementById('smart-domains');
  var text = textarea.value.trim();
  var domains = text ? text.split('\n').map(function(line) { return line.trim(); }).filter(function(line) { return line.length > 0; }) : [];

  chrome.storage.local.get(['favorites', 'customPacRules'], function(result) {
    var favorites = result.favorites || [];
    var customRules = result.customPacRules || '';
    var pacScript = generatePacScript(domains, favorites, customRules);
    document.getElementById('pac-script').value = pacScript;
  });
}
*/

// ============================================================
// 数据导入导出
// ============================================================

// 导入代理配置（JSON 格式）
function importData() {
  var textarea = document.getElementById('import-export-data');
  var data = textarea.value.trim();

  if (!data) {
    showStatus(getMessage('importEmpty'), 'error');
    return;
  }

  try {
    var parsed = JSON.parse(data);

    if (!Array.isArray(parsed)) {
      showStatus(getMessage('importFormatError'), 'error');
      return;
    }

    // 验证数据格式
    var valid = parsed.every(function(item) {
      return item.name && item.type && item.host && item.port;
    });

    if (!valid) {
      showStatus(getMessage('importFormatError'), 'error');
      return;
    }

    chrome.storage.local.get(['proxies'], function(result) {
      var existing = result.proxies || [];
      var imported = parsed.map(function(item) {
        return {
          id: item.id || generateId(),
          name: item.name,
          type: item.type,
          host: item.host,
          port: parseInt(item.port),
          username: item.username || '',
          password: item.password || ''
        };
      });

      var merged = existing.concat(imported);
      chrome.storage.local.set({ proxies: merged }, function() {
        loadProxies();
        textarea.value = '';
        showStatus(getMessage('importSuccess', [imported.length.toString()]), 'success');
      });
    });
  } catch (e) {
    showStatus(getMessage('importFormatError'), 'error');
  }
}

// 导出运行日志
function exportLogs() {
  chrome.runtime.sendMessage({ action: 'getLogs' }, function(response) {
    if (response && response.success) {
      var blob = new Blob([response.logs], { type: 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      var now = new Date();
      var ts = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '_' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0');
      a.href = url;
      a.download = 'smart-proxy-log-' + ts + '.txt';
      a.click();
      URL.revokeObjectURL(url);
    }
  });
}

// 导出代理配置（JSON 格式）
function exportData() {
  chrome.storage.local.get(['proxies'], function(result) {
    var proxies = result.proxies || [];
    if (proxies.length === 0) {
      showStatus(getMessage('exportEmpty'), 'error');
      return;
    }
    var textarea = document.getElementById('import-export-data');
    textarea.value = JSON.stringify(proxies, null, 2);
    showStatus(getMessage('exportSuccess'), 'success');
  });
}

// 导出全部配置到 JSON 文件
function exportConfigToFile() {
  chrome.storage.local.get(['options', 'proxies', 'favorites', 'smartDomains', 'proxyMode'], function(result) {
    var config = {
      version: 1,
      exportTime: new Date().toISOString(),
      options: result.options || {},
      proxies: result.proxies || [],
      favorites: result.favorites || [],
      smartDomains: result.smartDomains || [],
      proxyMode: result.proxyMode || 'page'
    };

    var json = JSON.stringify(config, null, 2);
    var blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var now = new Date();
    var ts = now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') + '_' +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0');
    a.href = url;
    a.download = 'smart-proxy-config-' + ts + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showStatus(getMessage('exportConfigSuccess'), 'success');
  });
}

// 从 JSON 文件导入全部配置
function importConfigFromFile(e) {
  var file = e.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(evt) {
    try {
      var config = JSON.parse(evt.target.result);

      if (!config.version || !config.proxies) {
        showStatus(getMessage('importConfigFormatError'), 'error');
        return;
      }

      var valid = config.proxies.every(function(item) {
        return item.name && item.type && item.host && item.port;
      });

      if (!valid) {
        showStatus(getMessage('importConfigFormatError'), 'error');
        return;
      }

      var dataToSet = {};
      if (config.options) dataToSet.options = config.options;
      if (config.proxies) dataToSet.proxies = config.proxies;
      if (config.favorites) dataToSet.favorites = config.favorites;
      if (config.smartDomains) dataToSet.smartDomains = config.smartDomains;
      if (config.proxyMode) dataToSet.proxyMode = config.proxyMode;

      chrome.storage.local.set(dataToSet, function() {
        loadOptions();
        loadProxies();
        loadFavorites();
        loadSmartDomains();
        showStatus(getMessage('importConfigSuccess'), 'success');
      });
    } catch (err) {
      showStatus(getMessage('importConfigFormatError'), 'error');
    }
    e.target.value = '';
  };
  reader.readAsText(file);
}

// ============================================================
// 弹窗与工具函数
// ============================================================

// 打开编辑弹窗
function openModal() {
  document.getElementById('edit-proxy-modal').classList.add('active');
}

// 关闭编辑弹窗并清空表单
function closeModal() {
  document.getElementById('edit-proxy-modal').classList.remove('active');
  document.getElementById('edit-proxy-id').value = '';
  document.getElementById('proxy-name').value = '';
  document.getElementById('proxy-type').value = 'http';
  document.getElementById('proxy-host').value = '';
  document.getElementById('proxy-port').value = '';
  document.getElementById('proxy-username').value = '';
  document.getElementById('proxy-password').value = '';
}

// 显示状态提示（3 秒后自动消失）
function showStatus(message, type) {
  var el = document.getElementById('status-message');
  el.textContent = message;
  el.className = 'status-message ' + type;
  el.style.display = 'block';
  setTimeout(function() {
    el.style.display = 'none';
  }, 3000);
}

// 生成唯一 ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// HTML 转义（防止 XSS）
function escapeHtml(str) {
  if (!str) return '';
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(str));
  return div.innerHTML;
}

// ============================================================
// 流量统计功能
// ============================================================

// 格式化文件大小
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  var k = 1024;
  var sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化速度
function formatSpeed(bytesPerSecond) {
  return formatSize(bytesPerSecond) + '/s';
}

// 格式化时间
function formatTime(ms) {
  if (ms < 1000) return ms + 'ms';
  if (ms < 60000) return (ms / 1000).toFixed(1) + 's';
  if (ms < 3600000) return (ms / 60000).toFixed(1) + 'min';
  return (ms / 3600000).toFixed(1) + 'h';
}

// 加载日志
function loadLogs() {
  chrome.runtime.sendMessage({ action: 'getLogs' }, function(response) {
    var logContent = document.getElementById('log-content');
    if (response && response.success && response.logs) {
      logContent.textContent = response.logs;
      logContent.parentElement.scrollTop = logContent.parentElement.scrollHeight;
    } else {
      logContent.textContent = getMessage('noLogs') || '暂无日志';
    }
  });
}

// 加载统计数据
function loadStatistics(period) {
  period = period || 'day';
  chrome.storage.local.get(['trafficStats'], function(result) {
    var stats = result.trafficStats || {};
    var now = Date.now();
    var cutoff = 0;

    // 根据时间段筛选
    switch (period) {
      case 'day':
        cutoff = now - 24 * 60 * 60 * 1000;
        break;
      case 'week':
        cutoff = now - 7 * 24 * 60 * 60 * 1000;
        break;
      case 'month':
        cutoff = now - 30 * 24 * 60 * 60 * 1000;
        break;
      case 'year':
        cutoff = now - 365 * 24 * 60 * 60 * 1000;
        break;
    }

    // 筛选并汇总数据
    var filteredStats = {};
    var totalDownload = 0;
    var totalUpload = 0;
    var totalConnections = 0;
    var totalTime = 0;

    Object.keys(stats).forEach(function(host) {
      var hostStats = stats[host];
      var filteredTimestamps = (hostStats.timestamps || []).filter(function(t) {
        return t.time > cutoff;
      });

      if (filteredTimestamps.length > 0) {
        var download = 0;
        var upload = 0;
        filteredTimestamps.forEach(function(t) {
          download += t.download || 0;
          upload += t.upload || 0;
        });

        filteredStats[host] = {
          download: download,
          upload: upload,
          connections: filteredTimestamps.length,
          totalTime: hostStats.totalTime || 0,
          type: hostStats.type || 'xmlhttprequest'
        };

        totalDownload += download;
        totalUpload += upload;
        totalConnections += filteredTimestamps.length;
        totalTime += hostStats.totalTime || 0;
      }
    });

    // 更新汇总卡片
    document.getElementById('total-download').textContent = formatSize(totalDownload);
    document.getElementById('total-upload').textContent = formatSize(totalUpload);
    document.getElementById('total-connections').textContent = totalConnections;
    document.getElementById('total-time').textContent = formatTime(totalTime);
  });
}
