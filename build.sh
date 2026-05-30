#!/bin/bash

# Smart Proxy Build Script - Chrome & Firefox
# Usage: ./build.sh [version]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="smart-proxy"
OUTPUT_DIR="$SCRIPT_DIR/dist"
BUILD_DIR="$SCRIPT_DIR/.build-tmp"

mkdir -p "$OUTPUT_DIR"

# Auto-restore Chrome manifest if dev-firefox was active
CHROME_MANIFEST="$SCRIPT_DIR/manifest.chrome.json"
if [ -f "$CHROME_MANIFEST" ]; then
    echo -e "${YELLOW}检测到 Firefox 调试模式，自动恢复 Chrome manifest...${NC}"
    mv "$CHROME_MANIFEST" "$SCRIPT_DIR/manifest.json"
fi

VERSION=$(grep -o '"version": *"[^"]*"' "$SCRIPT_DIR/manifest.json" | cut -d'"' -f4)
if [ -n "$1" ]; then
    VERSION="$1"
fi

echo -e "${GREEN}=== Smart Proxy Build Script ===${NC}"
echo -e "${YELLOW}Version: $VERSION${NC}"
echo ""

# ---- Chrome ----
echo -e "${GREEN}[1/2] Building Chrome extension...${NC}"

CHROME_FILE="$OUTPUT_DIR/${PROJECT_NAME}-chrome-v${VERSION}.zip"
[ -f "$CHROME_FILE" ] && rm "$CHROME_FILE"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
rsync -a \
    --exclude='build.sh' \
    --exclude='build-firefox.sh' \
    --exclude='dev-firefox.sh' \
    --exclude='.gitignore' \
    --exclude='README.md' \
    --exclude='manifest.firefox.json' \
    --exclude='package.json' \
    --exclude='package-lock.json' \
    --exclude='babel.config.js' \
    --exclude='node_modules' \
    --exclude='tests' \
    --exclude='dist' \
    --exclude='.*' \
    --exclude='.build-tmp' \
    ./ "$BUILD_DIR/"

cd "$BUILD_DIR"
zip -r "$CHROME_FILE" . -x ".*" > /dev/null
cd "$SCRIPT_DIR"
rm -rf "$BUILD_DIR"

CHROME_SIZE=$(du -h "$CHROME_FILE" | cut -f1)
echo -e "  Output: ${YELLOW}$CHROME_FILE${NC} (${CHROME_SIZE})"

# ---- Firefox ----
echo -e "${GREEN}[2/2] Building Firefox extension...${NC}"

FIREFOX_FILE="$OUTPUT_DIR/${PROJECT_NAME}-firefox-v${VERSION}.zip"
[ -f "$FIREFOX_FILE" ] && rm "$FIREFOX_FILE"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
rsync -a \
    --exclude='build.sh' \
    --exclude='build-firefox.sh' \
    --exclude='dev-firefox.sh' \
    --exclude='.gitignore' \
    --exclude='README.md' \
    --exclude='manifest.json' \
    --exclude='manifest.firefox.json' \
    --exclude='package.json' \
    --exclude='package-lock.json' \
    --exclude='babel.config.js' \
    --exclude='node_modules' \
    --exclude='tests' \
    --exclude='dist' \
    --exclude='.*' \
    --exclude='.build-tmp' \
    ./ "$BUILD_DIR/"

cp "$SCRIPT_DIR/manifest.firefox.json" "$BUILD_DIR/manifest.json"

cd "$BUILD_DIR"
zip -r "$FIREFOX_FILE" . -x ".*" > /dev/null
cd "$SCRIPT_DIR"
rm -rf "$BUILD_DIR"

FIREFOX_SIZE=$(du -h "$FIREFOX_FILE" | cut -f1)
echo -e "  Output: ${YELLOW}$FIREFOX_FILE${NC} (${FIREFOX_SIZE})"

echo ""
echo -e "${GREEN}=== Build Complete ===${NC}"
echo -e "Chrome:  ${YELLOW}$CHROME_FILE${NC} (${CHROME_SIZE})"
echo -e "Firefox: ${YELLOW}$FIREFOX_FILE${NC} (${FIREFOX_SIZE})"
