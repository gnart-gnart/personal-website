#!/bin/bash
mkdir -p build
cp -r styles/* build/

convert_markdown() {
  local input_dir="$1"
  local output_dir="$2"
  mkdir -p "$output_dir"

  for md_file in "$input_dir"/*.md; do
    if [ -f "$md_file" ]; then
      filename=$(basename "$md_file" .md)
      html_file="$output_dir/$filename.html"

      pandoc "$md_file" \
        -f markdown \
        -t html \
        -c ../theme.css \
        -s \
        -o "$html_file"
      
      echo "✓ Converted: $md_file → $html_file"
    fi
  done
  
  for subdir in "$input_dir"/*/; do
    if [ -d "$subdir" ]; then
      dirname=$(basename "$subdir")
      convert_markdown "$subdir" "$output_dir/$dirname"
    fi
  done
}

convert_markdown "markdown" "build/docs"
echo "Build complete! HTML files are in build/docs/"