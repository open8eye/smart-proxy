#!/bin/bash

# Firefox Extension Build Script
# Usage: ./build-firefox.sh [version]

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="smart-proxy"
OUTPUT_DIR="$SCRIPT_DIR/dist"
BUILD_DIR="$SCRIPT_DIR/.build-firefox"

echo -e "${GREEN}=== Firefox Extension Build Script ===${NC}"
echo ""

mkdir -p "$OUTPUT_DIR"

VERSION=$(grep -o '"version": *"[^"]*"' "$SCRIPT_DIR/manifest.firefox.json" | cut -d'"' -f4)
if [ -n "$1" ]; then
    VERSION="$1"
fi

echo -e "${YELLOW}Version: $VERSION${NC}"

OUTPUT_FILE="$OUTPUT_DIR/${PROJECT_NAME}-firefox-v${VERSION}.zip"

if [ -f "$OUTPUT_FILE" ]; then
    rm "$OUTPUT_FILE"
    echo -e "${YELLOW}Removed old build: $OUTPUT_FILE${NC}"
fi

# Clean and create temp build directory
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# Copy source files (excluding build artifacts and dev files)
echo -e "${GREEN}Copying source files...${NC}"
cd "$SCRIPT_DIR"
rsync -a \
    --exclude='build.sh' \
    --exclude='build-firefox.sh' \
    --exclude='dev-firefox.sh' \
    --exclude='.gitignore' \
    --exclude='README.md' \
    --exclude='package.json' \
    --exclude='package-lock.json' \
    --exclude='babel.config.js' \
    --exclude='node_modules' \
    --exclude='tests' \
    --exclude='dist' \
    --exclude='.*' \
    --exclude='manifest.json' \
    --exclude='manifest.firefox.json' \
    --exclude='.build-firefox' \
    ./ "$BUILD_DIR/"

# Use Firefox manifest
cp "$SCRIPT_DIR/manifest.firefox.json" "$BUILD_DIR/manifest.json"

# Create zip
echo -e "${GREEN}Creating zip file...${NC}"
cd "$BUILD_DIR"
zip -r "$OUTPUT_FILE" . -x ".*"

# Clean up
rm -rf "$BUILD_DIR"

FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo ""
echo -e "${GREEN}=== Build Complete ===${NC}"
echo -e "${GREEN}Output: $OUTPUT_FILE${NC}"
echo -e "${GREEN}Size: $FILE_SIZE${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Go to about:debugging#/runtime/this-firefox"
echo "2. Click 'Load Temporary Add-on'"
echo "3. Select manifest.json from the extracted zip"
echo "4. Upload $OUTPUT_FILE to https://addons.mozilla.org/"
