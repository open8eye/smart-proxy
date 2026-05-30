#!/bin/bash

# Chrome Extension Build Script
# Usage: ./build.sh [version]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_NAME="smart-proxy"
OUTPUT_DIR="$SCRIPT_DIR/dist"

echo -e "${GREEN}=== Chrome Extension Build Script ===${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Get version from manifest.json
VERSION=$(grep -o '"version": *"[^"]*"' "$SCRIPT_DIR/manifest.json" | cut -d'"' -f4)
if [ -n "$1" ]; then
    VERSION="$1"
fi

echo -e "${YELLOW}Version: $VERSION${NC}"

# Output file
OUTPUT_FILE="$OUTPUT_DIR/${PROJECT_NAME}-v${VERSION}.zip"

# Remove old build if exists
if [ -f "$OUTPUT_FILE" ]; then
    rm "$OUTPUT_FILE"
    echo -e "${YELLOW}Removed old build: $OUTPUT_FILE${NC}"
fi

# Create zip file
echo -e "${GREEN}Creating zip file...${NC}"
cd "$SCRIPT_DIR"
zip -r "$OUTPUT_FILE" \
    . \
    -x "./build.sh" \
    -x "./.gitignore" \
    -x "./README.md" \
    -x "./package.json" \
    -x "./package-lock.json" \
    -x "./babel.config.js" \
    -x "./node_modules/*" \
    -x "./tests/*" \
    -x "./dist/*" \
    -x "./.*" \
    -x "*/node_modules/*" \
    -x "*/.*"

# Get file size
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo ""
echo -e "${GREEN}=== Build Complete ===${NC}"
echo -e "${GREEN}Output: $OUTPUT_FILE${NC}"
echo -e "${GREEN}Size: $FILE_SIZE${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Go to chrome://extensions/"
echo "2. Enable Developer mode"
echo "3. Click 'Load unpacked' to test"
echo "4. Upload $OUTPUT_FILE to Chrome Web Store"
