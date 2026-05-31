#!/bin/bash

# Firefox 开发调试脚本
# 切换 manifest 为 Firefox 版本，方便在 Firefox 中加载临时附加组件

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST="$SCRIPT_DIR/manifest.json"
CHROME_MANIFEST="$SCRIPT_DIR/manifest.chrome.json"
FIREFOX_MANIFEST="$SCRIPT_DIR/manifest.firefox.json"

if [ "$1" == "restore" ] || [ "$1" == "r" ]; then
    if [ -f "$CHROME_MANIFEST" ]; then
        mv "$CHROME_MANIFEST" "$MANIFEST"
        echo "已恢复 Chrome manifest.json"
    else
        echo "没有找到 Chrome 备份文件"
    fi
else
    if [ -f "$CHROME_MANIFEST" ]; then
        echo "已切换为 Firefox manifest，无需重复操作"
        echo "如需恢复 Chrome 版本: ./dev-firefox.sh restore"
    else
        mv "$MANIFEST" "$CHROME_MANIFEST"
        cp "$FIREFOX_MANIFEST" "$MANIFEST"
        echo "已切换为 Firefox manifest.json"
        echo "现在可以在 Firefox 中加载临时附加组件了"
        echo "恢复 Chrome 版本: ./dev-firefox.sh restore"
    fi
fi
