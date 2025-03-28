#!/bin/bash

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
TGT_DIR="$ROOT_DIR/public/textures"

# Create public/textures directory if it doesn't exist
mkdir -p "$TGT_DIR"

# Copy all files to public/textures
echo "Copying files to ${TGT_DIR}..."
cp "$SCRIPT_DIR"/*.png "$TGT_DIR/"

# Process garbage-*.png files (scale down and sharpen)
echo "Processing garbage-*.png files..."
for file in "$SCRIPT_DIR"/garbage-*.png; do
    filename=$(basename "$file")
    echo "Converting $filename..."
    # Scale down to 25% and sharpen
    magick "$file" -resize 25% -sharpen 0x1.0 "$TGT_DIR/${filename}"
done

# Process bin-*.png files (scale down and sharpen)
echo "Processing bin-*.png files..."
for file in "$SCRIPT_DIR"/bin-*.png; do
    filename=$(basename "$file")
    echo "Converting $filename..."
    # Scale down to 20% and sharpen
    magick "$file" -resize 20% -sharpen 0x1.0 "$TGT_DIR/${filename}"
done

# convert truck.png to 50%
echo "Converting truck-*.png to 50%..."
for file in "$SCRIPT_DIR"/truck-*.png; do
    filename=$(basename "$file")
    echo "Converting $filename..."
    magick "$file" -resize 50% "$TGT_DIR/${filename}"
done

# convert drop-zone-icon.png to 50%
echo "Converting drop-zone-icon.png to 20%..."
magick "$SCRIPT_DIR/drop-zone-icon.png" -resize 20% -sharpen 0x1.0 "$TGT_DIR/drop-zone-icon.png"

# incovert icons.png to 25%
echo "Converting icons.png to 12.5%..."
magick "$SCRIPT_DIR/icons.png" -resize 12.5% -sharpen 0x1.0 "$TGT_DIR/icons.png"

echo "Converting icons2.png to 12.5%..."
magick "$SCRIPT_DIR/icons2.png" -resize 12.5% -sharpen 0x1.0 "$TGT_DIR/icons2.png"

cp $SCRIPT_DIR/*.json $TGT_DIR/

echo "Conversion complete!" 