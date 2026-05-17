#!/bin/bash
# Generate iOS App Icons from a source 1024x1024 PNG
# Usage: ./scripts/generate-icons.sh <source-1024x1024.png>
#
# Requires: ImageMagick (brew install imagemagick)
#
# This generates all required iOS app icon sizes for App Store submission.

set -e

SOURCE="${1:-icon-source.png}"
OUTPUT_DIR="ios/App/App/Assets.xcassets/AppIcon.appiconset"

if [ ! -f "$SOURCE" ]; then
  echo "Error: Source icon not found at $SOURCE"
  echo ""
  echo "Please provide a 1024x1024 PNG icon."
  echo "You can create one at https://www.figma.com or use any image editor."
  echo ""
  echo "The icon should:"
  echo "  - Be 1024x1024 pixels"
  echo "  - Be a PNG with no transparency (required by Apple)"
  echo "  - Not contain any rounded corners (iOS adds them automatically)"
  echo "  - Use the Chetana brain/consciousness theme"
  echo ""
  echo "Usage: $0 path/to/icon-1024x1024.png"
  exit 1
fi

mkdir -p "$OUTPUT_DIR"

# All required iOS icon sizes
declare -A SIZES=(
  ["icon-20@2x.png"]=40
  ["icon-20@3x.png"]=60
  ["icon-29@2x.png"]=58
  ["icon-29@3x.png"]=87
  ["icon-40@2x.png"]=80
  ["icon-40@3x.png"]=120
  ["icon-60@2x.png"]=120
  ["icon-60@3x.png"]=180
  ["icon-76.png"]=76
  ["icon-76@2x.png"]=152
  ["icon-83.5@2x.png"]=167
  ["icon-1024.png"]=1024
)

echo "Generating iOS app icons from $SOURCE..."

for filename in "${!SIZES[@]}"; do
  size=${SIZES[$filename]}
  echo "  ${filename} (${size}x${size})"
  convert "$SOURCE" -resize "${size}x${size}" "$OUTPUT_DIR/$filename"
done

# Generate Contents.json
cat > "$OUTPUT_DIR/Contents.json" << 'CONTENTS'
{
  "images": [
    { "size": "20x20", "idiom": "iphone", "filename": "icon-20@2x.png", "scale": "2x" },
    { "size": "20x20", "idiom": "iphone", "filename": "icon-20@3x.png", "scale": "3x" },
    { "size": "29x29", "idiom": "iphone", "filename": "icon-29@2x.png", "scale": "2x" },
    { "size": "29x29", "idiom": "iphone", "filename": "icon-29@3x.png", "scale": "3x" },
    { "size": "40x40", "idiom": "iphone", "filename": "icon-40@2x.png", "scale": "2x" },
    { "size": "40x40", "idiom": "iphone", "filename": "icon-40@3x.png", "scale": "3x" },
    { "size": "60x60", "idiom": "iphone", "filename": "icon-60@2x.png", "scale": "2x" },
    { "size": "60x60", "idiom": "iphone", "filename": "icon-60@3x.png", "scale": "3x" },
    { "size": "20x20", "idiom": "ipad", "filename": "icon-20@2x.png", "scale": "2x" },
    { "size": "29x29", "idiom": "ipad", "filename": "icon-29@2x.png", "scale": "2x" },
    { "size": "40x40", "idiom": "ipad", "filename": "icon-40@2x.png", "scale": "2x" },
    { "size": "76x76", "idiom": "ipad", "filename": "icon-76.png", "scale": "1x" },
    { "size": "76x76", "idiom": "ipad", "filename": "icon-76@2x.png", "scale": "2x" },
    { "size": "83.5x83.5", "idiom": "ipad", "filename": "icon-83.5@2x.png", "scale": "2x" },
    { "size": "1024x1024", "idiom": "ios-marketing", "filename": "icon-1024.png", "scale": "1x" }
  ],
  "info": { "version": 1, "author": "xcode" }
}
CONTENTS

echo ""
echo "Done! Icons generated in $OUTPUT_DIR"
echo "Open the Xcode project and verify the icons look correct."
