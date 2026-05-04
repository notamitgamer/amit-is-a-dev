const HF_BASE = "https://huggingface.co/datasets/notamitgamer/usercontent";
const RAW_BASE = `${HF_BASE}/resolve/main`;
const HF_API_BASE = "https://huggingface.co/api/datasets/notamitgamer/usercontent/tree/main";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const key = url.pathname.slice(1);
    const hostname = url.hostname;

    // Helper to allow testing on Cloudflare's provided URL
    const isPagesDev = hostname.endsWith(".pages.dev");
    const isTestUiMode = url.searchParams.get("ui") === "true";

    // ====================================================================
    // ROUTE 1: THE EXPLORER & FILE VIEWER VIEW
    // Renders custom Material Design 3 UIs for both folders and files
    // ====================================================================
    if (hostname === "usercontent.amit.is-a.dev" || (isPagesDev && isTestUiMode)) {
      const apiUrl = key ? `${HF_API_BASE}/${key}` : HF_API_BASE;
      const apiResponse = await fetch(apiUrl);

      // If the Hugging Face Tree API fails, it means this is NOT a directory.
      // Let's check if it's a specific file so we can show the File Viewer UI!
      if (!apiResponse.ok) {
        const rawUrl = `${RAW_BASE}/${key}`;
        const rawCheck = await fetch(rawUrl, { method: 'HEAD' });
        
        if (rawCheck.ok) {
          // It IS a file! Show the new GitHub-style File Viewer UI.
          const html = generateM3FileViewerHtml(key, isPagesDev);
          return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
        }
        
        // If it's neither a folder nor a file, show a 404
        return new Response("404 - File or Folder Not Found", { status: 404 });
      }

      // It is a directory, show the folder explorer UI
      const items = await apiResponse.json();
      const html = generateM3ExplorerHtml(key, items, isPagesDev);
      
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // ====================================================================
    // ROUTE 2: THE RAW VIEW
    // Acts like raw.githubusercontent.com - serves pure cached bytes
    // ====================================================================
    if (hostname === "raw.usercontent.amit.is-a.dev" || (isPagesDev && !isTestUiMode)) {
      if (!key) return new Response("No file path provided.", { status: 400 });
      if (key.includes("..")) return new Response("Invalid path.", { status: 403 });

      const upstreamUrl = `${RAW_BASE}/${key}`;
      const response = await fetch(upstreamUrl, {
        method: request.method,
        headers: request.headers,
      });

      if (!response.ok) {
        return new Response(`Upstream error: ${response.statusText}`, { status: response.status });
      }

      const headers = new Headers();
      const contentType = response.headers.get("Content-Type");
      if (contentType) headers.set("Content-Type", contentType);

      const contentLength = response.headers.get("Content-Length");
      if (contentLength) headers.set("Content-Length", contentLength);

      headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400");
      headers.set("Access-Control-Allow-Origin", "*");
      headers.set("X-Content-Type-Options", "nosniff");

      return new Response(response.body, { status: response.status, headers });
    }

    return new Response(
      "Service active. Please use usercontent.amit.is-a.dev or raw.usercontent.amit.is-a.dev", 
      { status: 200 }
    );
  },
};

// ====================================================================
// HELPER FUNCTIONS FOR M3 UI
// ====================================================================

function formatBytes(bytes) {
  if (bytes === 0 || !bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Reusable CSS string to keep both UI pages looking identical
const COMMON_M3_CSS = `
  :root {
    --md-sys-color-background: #fbfdf9;
    --md-sys-color-on-background: #191c1a;
    --md-sys-color-surface: #f8faf6;
    --md-sys-color-surface-container: #eceee9;
    --md-sys-color-on-surface: #191c1a;
    --md-sys-color-on-surface-variant: #404943;
    --md-sys-color-primary: #006b54;
    --md-sys-color-primary-container: #7ef8d5;
    --md-sys-color-on-primary-container: #002118;
    --md-sys-color-outline-variant: #bfc9c2;
  }
  body {
    margin: 0;
    background-color: var(--md-sys-color-background);
    color: var(--md-sys-color-on-background);
    font-family: 'Roboto', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  header {
    background-color: var(--md-sys-color-surface);
    padding: 16px 24px;
    position: sticky;
    top: 0;
    z-index: 10;
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .app-title {
    font-size: 22px;
    font-weight: 500;
    margin-right: 16px;
    color: var(--md-sys-color-primary);
  }
  .breadcrumbs {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 4px;
    font-size: 14px;
    background: var(--md-sys-color-surface-container);
    padding: 8px 16px;
    border-radius: 24px;
  }
  .crumb {
    color: var(--md-sys-color-on-surface);
    text-decoration: none;
    display: flex;
    align-items: center;
    transition: color 0.2s;
  }
  a.crumb:hover {
    color: var(--md-sys-color-primary);
  }
  .crumb .material-symbols-outlined { font-size: 18px; }
  .crumb-separator {
    color: var(--md-sys-color-on-surface-variant);
    margin: 0 4px;
  }
  main {
    max-width: 900px;
    margin: 24px auto;
    padding: 0 16px;
  }
  .surface-card {
    background-color: var(--md-sys-color-surface);
    border-radius: 24px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    border: 1px solid var(--md-sys-color-outline-variant);
    overflow: hidden;
  }
`;

function generateBreadcrumbs(currentPath, queryParam) {
  const pathParts = currentPath ? currentPath.split('/') : [];
  let html = `<a href="/${queryParam}" class="crumb"><span class="material-symbols-outlined">home</span></a>`;
  let accumPath = "";
  
  for (let i = 0; i < pathParts.length; i++) {
    accumPath += (i === 0 ? "" : "/") + pathParts[i];
    html += `<span class="crumb-separator">/</span>`;
    if (i === pathParts.length - 1) {
      // Last item isn't clickable
      html += `<span class="crumb" style="cursor:default; font-weight: 500;">${pathParts[i]}</span>`;
    } else {
      html += `<a href="/${accumPath}${queryParam}" class="crumb">${pathParts[i]}</a>`;
    }
  }
  return html;
}

// --------------------------------------------------------------------
// UI GENERATOR: FOLDER EXPLORER
// --------------------------------------------------------------------
function generateM3ExplorerHtml(currentPath, items, isPagesDev) {
  const queryParam = isPagesDev ? "?ui=true" : "";
  const breadcrumbsHtml = generateBreadcrumbs(currentPath, queryParam);

  let goUpHtml = "";
  if (currentPath) {
    const parentPath = currentPath.split('/').slice(0, -1).join('/');
    goUpHtml = `
      <a href="/${parentPath}${queryParam}" class="list-item">
        <div class="item-icon-wrapper"><span class="material-symbols-outlined">arrow_upward</span></div>
        <div class="item-details"><div class="item-name">.. (Go up)</div></div>
      </a>
    `;
  }

  const itemsHtml = items.map(item => {
    const isDir = item.type === "directory";
    const icon = isDir ? "folder" : "insert_drive_file";
    
    // Always stay in the UI when clicking from the explorer!
    const link = `/${item.path}${queryParam}`;
    const name = item.path.split('/').pop();
    
    return `
      <a href="${link}" class="list-item">
        <div class="item-icon-wrapper ${isDir ? 'folder' : 'file'}">
          <span class="material-symbols-outlined">${icon}</span>
        </div>
        <div class="item-details">
          <div class="item-name">${name}</div>
          <div class="item-meta">${isDir ? 'Folder' : formatBytes(item.size)}</div>
        </div>
      </a>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${currentPath ? currentPath + ' - ' : 'Explorer'} | User Content</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
  <style>
    ${COMMON_M3_CSS}
    .list-container { padding: 8px 0; }
    .list-item {
      display: flex;
      align-items: center;
      padding: 12px 24px;
      text-decoration: none;
      color: inherit;
      transition: background-color 0.2s;
      gap: 16px;
    }
    .list-item:hover { background-color: rgba(0, 107, 84, 0.08); }
    .item-icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--md-sys-color-surface-container);
      color: var(--md-sys-color-on-surface-variant);
    }
    .item-icon-wrapper.folder {
      background-color: var(--md-sys-color-primary-container);
      color: var(--md-sys-color-on-primary-container);
    }
    .item-details { display: flex; flex-direction: column; flex: 1; }
    .item-name { font-size: 16px; font-weight: 400; color: var(--md-sys-color-on-surface); }
    .item-meta { font-size: 14px; color: var(--md-sys-color-on-surface-variant); margin-top: 2px; }
    .empty-state { padding: 48px; text-align: center; color: var(--md-sys-color-on-surface-variant); }
  </style>
</head>
<body>
  <header>
    <div class="app-title">Asset Explorer</div>
    <div class="breadcrumbs">${breadcrumbsHtml}</div>
  </header>
  <main>
    <div class="surface-card list-container">
      ${goUpHtml}
      ${itemsHtml || '<div class="empty-state">This folder is empty.</div>'}
    </div>
  </main>
</body>
</html>
  `;
}

// --------------------------------------------------------------------
// UI GENERATOR: FILE VIEWER (LIKE GITHUB)
// --------------------------------------------------------------------
function generateM3FileViewerHtml(currentPath, isPagesDev) {
  const queryParam = isPagesDev ? "?ui=true" : "";
  const breadcrumbsHtml = generateBreadcrumbs(currentPath, queryParam);
  const fileName = currentPath.split('/').pop();
  
  // The pure URL used to fetch/display the file contents
  const rawUrl = isPagesDev ? `/${currentPath}` : `https://raw.usercontent.amit.is-a.dev/${currentPath}`;
  
  const ext = currentPath.split('.').pop().toLowerCase();
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico'].includes(ext);
  const isVideo = ['mp4', 'webm', 'ogg'].includes(ext);

  let viewerContent = '';
  
  if (isImage) {
    viewerContent = `
      <div class="media-container">
        <img src="${rawUrl}" alt="${fileName}" />
      </div>`;
  } else if (isVideo) {
    viewerContent = `
      <div class="media-container">
        <video controls src="${rawUrl}"></video>
      </div>`;
  } else {
    // Treat as text/code - use client-side JS to fetch and display the raw text
    viewerContent = `
      <pre id="code-viewer" class="code-container">Loading file content...</pre>
      <script>
        fetch("${rawUrl}")
          .then(res => {
            if (!res.ok) throw new Error("Network response was not ok");
            return res.text();
          })
          .then(text => { document.getElementById('code-viewer').textContent = text; })
          .catch(err => {
            document.getElementById('code-viewer').textContent = "Error loading file content. This file might be binary or too large to preview.";
            document.getElementById('code-viewer').style.color = "#ba1a1a";
          });
      </script>`;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${fileName} | User Content</title>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&family=Roboto+Mono&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
  <style>
    ${COMMON_M3_CSS}
    .file-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 24px;
      border-bottom: 1px solid var(--md-sys-color-outline-variant);
      background: var(--md-sys-color-surface-container);
    }
    .file-info {
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 500;
      color: var(--md-sys-color-on-surface);
    }
    .raw-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 20px;
      background-color: var(--md-sys-color-primary);
      color: white;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    .raw-button:hover { background-color: #005240; }
    .raw-button .material-symbols-outlined { font-size: 18px; }
    
    .media-container {
      padding: 32px;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #e1e3de; /* Darker tone for image background */
    }
    .media-container img, .media-container video {
      max-width: 100%;
      border-radius: 8px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }
    
    .code-container {
      margin: 0;
      padding: 24px;
      font-family: 'Roboto Mono', monospace;
      font-size: 14px;
      line-height: 1.5;
      overflow-x: auto;
      background: #fdfdfd;
      color: #24292e;
    }
  </style>
</head>
<body>
  <header>
    <div class="app-title">Asset Explorer</div>
    <div class="breadcrumbs">${breadcrumbsHtml}</div>
  </header>
  <main>
    <div class="surface-card">
      <div class="file-header">
        <div class="file-info">
          <span class="material-symbols-outlined">${isImage ? 'image' : isVideo ? 'movie' : 'code'}</span>
          ${fileName}
        </div>
        <a href="${rawUrl}" target="_blank" class="raw-button">
          <span class="material-symbols-outlined">open_in_new</span>
          View Raw
        </a>
      </div>
      ${viewerContent}
    </div>
  </main>
</body>
</html>
  `;
}
