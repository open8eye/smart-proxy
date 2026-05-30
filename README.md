# Smart Proxy

一款功能强大的浏览器代理管理扩展，帮助您高效管理代理配置。

## 主要功能

- **快速切换代理**：一键切换不同的代理服务器
- **延迟测试**：实时显示代理延迟（毫秒）
- **网站收藏**：收藏网站，下次访问自动启用代理
- **多种代理模式**：
  - 页面模式：仅代理当前标签页的域名
  - 全局模式：代理所有流量
  - 规则模式：仅代理预设的不可访问域名和收藏域名
- **级联代理**：从已代理的标签页打开的新标签页也会自动代理
- **多语言支持**：支持中文、英文、日文、韩文、法文、德文、西班牙文等8种语言
- **代理认证**：支持HTTP、HTTPS、SOCKS4、SOCKS5代理，支持用户名/密码认证

## 安装方法

1. 下载或克隆本项目
2. 打开Chrome浏览器，进入扩展管理页面：`chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本项目的 `smart-proxy` 目录

## 使用说明

1. 点击浏览器工具栏中的扩展图标打开弹出窗口
2. 点击"添加代理"按钮添加代理服务器
3. 从下拉框选择要使用的代理
4. 打开旁边的开关即可启用代理
5. 状态栏会显示当前连接延迟（毫秒）

## 快捷键

- Windows/Linux: `Ctrl+Shift+P`
- macOS: `Command+Shift+P`

## 项目结构

```
smart-proxy/
├── _locales/          # 多语言翻译文件
├── icons/             # 扩展图标
├── tests/             # 测试文件
├── background.js      # 后台脚本
├── popup.html/js/css  # 弹出窗口
├── options.html/js/css # 设置页面
├── help.html/js       # 帮助页面
└── manifest.json      # 扩展配置文件
```

## 许可证

本项目基于原作者 [xubaifu97](https://github.com/xubaifu97) 的 [Easy Proxy Switcher](https://chromewebstore.google.com/detail/fjnpcbjdpbhbdlnkncaoennjdkoegmof) 扩展进行优化改进。
