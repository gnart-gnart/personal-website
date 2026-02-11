#!/bin/bash

# Create output directory
mkdir -p build

# Copy CSS and assets to build folder
cp -r styles/* build/ 2>/dev/null || true

# Generate navigation JSON from directory structure
generate_nav_json() {
  local dir="$1"
  local prefix="$2"
  local json_items=()
  
  # Process files in current directory
  for md_file in "$dir"/*.md; do
    if [ -f "$md_file" ]; then
      filename=$(basename "$md_file" .md)
      filepath="${prefix}${filename}.html"
      
      # Extract title from frontmatter or use filename
      title=$(grep -m 1 "^title:" "$md_file" | sed 's/^title: *//;s/"//g' | sed "s/'//g")
      if [ -z "$title" ]; then
        title="$filename"
      fi
      
      json_items+=("{\"name\":\"$title\",\"path\":\"/$filepath\",\"type\":\"page\"}")
    fi
  done
  
  # Process subdirectories
  for subdir in "$dir"/*/; do
    if [ -d "$subdir" ]; then
      dirname=$(basename "$subdir")
      sub_json=$(generate_nav_json "$subdir" "${prefix}${dirname}/" | tail -1)
      json_items+=("{\"name\":\"$dirname\",\"type\":\"folder\",\"children\":$sub_json}")
    fi
  done
  
  # Output JSON array
  printf '['
  IFS=$'\n'
  for i in "${!json_items[@]}"; do
    printf '%s' "${json_items[$i]}"
    if [ $i -lt $((${#json_items[@]}-1)) ]; then printf ','; fi
  done
  printf ']'
}

# Function to convert markdown files recursively
convert_markdown() {
  local input_dir="$1"
  local output_dir="$2"
  local depth="$3"
  
  [ -z "$depth" ] && depth=0
  
  # Create output directory structure
  mkdir -p "$output_dir"
  
  # Convert each markdown file
  for md_file in "$input_dir"/*.md; do
    if [ -f "$md_file" ]; then
      filename=$(basename "$md_file" .md)
      html_file="$output_dir/$filename.html"
      
      # Extract title from YAML frontmatter
      title=$(awk '/^---$/{ if(++count==1) next; if(count==2) exit } /^title:/ && count==1 { gsub(/^title: */, ""); gsub(/"/, ""); gsub(/'\'', ""); print; exit }' "$md_file")
      
      if [ -z "$title" ]; then
        title="$filename"
      fi
      
      # Calculate relative path for CSS
      css_path=$(printf '../%.0s' $(seq 1 $depth))
      css_path="${css_path}theme.css"
      
      # Convert with Pandoc
      pandoc "$md_file" \
        -f markdown \
        -t html \
        -c "$css_path" \
        -s \
        --metadata title="$title" \
        -o "$html_file"
      
      echo "✓ Converted: $md_file → $html_file (title: $title)"
    fi
  done
  
  # Recurse into subdirectories
  for subdir in "$input_dir"/*/; do
    if [ -d "$subdir" ]; then
      dirname=$(basename "$subdir")
      convert_markdown "$subdir" "$output_dir/$dirname" $((depth+1))
    fi
  done
}

# Start conversion
convert_markdown "markdown" "build/docs" 0

# Generate navigation data
echo "Generating navigation..."
nav_json=$(generate_nav_json "markdown" "docs/")
echo "$nav_json" > build/nav.json

echo "Build complete! HTML files are in build/docs/"
echo "Navigation data saved to build/nav.json"