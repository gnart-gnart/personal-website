#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read navigation JSON
const navJson = JSON.parse(fs.readFileSync('build/nav.json', 'utf8'));

// Sidebar CSS (matches Typora aesthetic)
const sidebarCSS = `
<style>
:root {
  --sidebar-width: 280px;
  --sidebar-bg: #f5f5f5;
  --sidebar-text: #333;
  --sidebar-hover: #e8e8e8;
  --sidebar-border: #ddd;
  --accent: #0066cc;
}

body {
  display: flex;
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Helvetica Neue', sans-serif;
}

#sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: var(--sidebar-width);
  height: 100vh;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border);
  overflow-y: auto;
  padding: 20px 0;
  box-sizing: border-box;
  z-index: 1000;
}

#sidebar h1 {
  margin: 0 20px 20px;
  font-size: 18px;
  font-weight: 600;
  color: var(--sidebar-text);
  border-bottom: 1px solid var(--sidebar-border);
  padding-bottom: 15px;
}

#sidebar ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

#sidebar li {
  margin: 0;
}

#sidebar a {
  display: block;
  padding: 8px 20px;
  color: var(--sidebar-text);
  text-decoration: none;
  font-size: 14px;
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
}

#sidebar a:hover {
  background: var(--sidebar-hover);
  border-left-color: var(--accent);
}

#sidebar a.active {
  color: var(--accent);
  background: rgba(0, 102, 204, 0.1);
  border-left-color: var(--accent);
  font-weight: 500;
}

#sidebar .folder {
  padding: 8px 20px;
  color: var(--sidebar-text);
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

#sidebar .folder:hover {
  background: var(--sidebar-hover);
}

#sidebar .folder::after {
  content: '▶';
  font-size: 10px;
  transition: transform 0.2s ease;
  margin-left: 8px;
}

#sidebar .folder.expanded::after {
  transform: rotate(90deg);
}

#sidebar .folder + ul {
  display: none;
  padding-left: 0;
}

#sidebar .folder.expanded + ul {
  display: block;
}

#sidebar .folder + ul a {
  padding-left: 40px;
  font-size: 13px;
}

article, main, .content {
  margin-left: var(--sidebar-width);
  flex: 1;
  padding: 40px;
  max-width: 900px;
}

@media (max-width: 768px) {
  #sidebar {
    position: absolute;
    width: 100%;
    height: auto;
    max-height: 400px;
    border-right: none;
    border-bottom: 1px solid var(--sidebar-border);
  }
  
  article, main, .content {
    margin-left: 0;
    margin-top: 0;
    padding: 20px;
  }
}
</style>
`;

// Build sidebar HTML from nav JSON
function buildSidebarHTML(items, currentPath) {
  let html = '<ul>';
  
  items.forEach(item => {
    if (item.type === 'folder') {
      html += `<li>
        <div class="folder" data-folder="${item.name}">${item.name}</div>
        ${buildSidebarHTML(item.children, currentPath)}
      </li>`;
    } else if (item.type === 'page') {
      const isActive = currentPath === item.path;
      const activeClass = isActive ? ' class="active"' : '';
      html += `<li><a href="${item.path}"${activeClass}>${item.name}</a></li>`;
    }
  });
  
  html += '</ul>';
  return html;
}

// Process all HTML files
function processHTMLFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processHTMLFiles(fullPath);
    } else if (file.endsWith('.html')) {
      let html = fs.readFileSync(fullPath, 'utf8');
      
      // Skip if sidebar already injected
      if (html.includes('id="sidebar"')) {
        return;
      }
      
      // Get relative path for current page
      const relativePath = '/' + path.relative('build', fullPath).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\.html$/, '');
      
      // Build sidebar
      const sidebarHTML = `
        ${sidebarCSS}
        <nav id="sidebar">
          <h1>Site</h1>
          ${buildSidebarHTML(navJson, relativePath)}
        </nav>
        <script>
          // Toggle folder expansion
          document.querySelectorAll('.folder').forEach(folder => {
            folder.addEventListener('click', (e) => {
              e.stopPropagation();
              folder.classList.toggle('expanded');
            });
          });
          
          // Highlight active link
          const currentPath = window.location.pathname;
          document.querySelectorAll('#sidebar a').forEach(link => {
            if (link.getAttribute('href') === currentPath || 
                link.getAttribute('href') === currentPath + 'index.html' ||
                currentPath.endsWith(link.getAttribute('href'))) {
              link.classList.add('active');
              // Expand parent folders
              let parent = link.closest('ul');
              while (parent && parent.id !== 'sidebar') {
                const folder = parent.previousElementSibling;
                if (folder && folder.classList.contains('folder')) {
                  folder.classList.add('expanded');
                }
                parent = parent.parentElement.closest('ul');
              }
            }
          });
        </script>
      `;
      
      // Inject sidebar after opening body tag
      html = html.replace(/<body[^>]*>/, (match) => match + sidebarHTML);
      
      fs.writeFileSync(fullPath, html);
      console.log(`✓ Injected sidebar: ${fullPath}`);
    }
  });
}

processHTMLFiles('build/docs');
console.log('Sidebar injection complete!');