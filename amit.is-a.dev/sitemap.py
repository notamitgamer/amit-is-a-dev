import os
import datetime
from pathlib import Path
from fnmatch import fnmatch
from urllib.parse import quote

# --- CONFIGURATION ---

# 1. Where to save the final sitemap.xml? (Usually your main portfolio folder)
OUTPUT_FILE = r"C:\Users\PC\Desktop\amit.is-a.dev\sitemap.xml"

# 2. List of all your projects/subdomains to scan
SITES = [
    {
        "local_path": r"C:\Users\PC\Desktop\amit.is-a.dev",
        "base_url": "https://amit.is-a.dev/"
    },
    {
        "local_path": r"C:\Users\PC\Desktop\ada-web",
        "base_url": "https://ada.amit.is-a.dev/"
    },
    {
        "local_path": r"C:\Users\PC\Desktop\compiler.amit.is-a.dev",
        "base_url": "https://compiler.amit.is-a.dev/"
    },
    {
        "local_path": r"C:\Users\PC\Desktop\esal.amit.is-a.dev",
        "base_url": "https://esal.amit.is-a.dev/"
    }
]

# Files/Folders to ignore across ALL projects
IGNORE_FILES = [
    "google*.html", 
    "404.html", 
    "draft.html", 
    "index1.html", 
    "index2.html", 
    "indexcopy.html", 
    "index copy.html", 
    "indexbackup*.html",
    "new.html",
    "template.html",
    "wpChat.html",
    "wpChat-backup.html"
] 
IGNORE_DIRS = [".git", "node_modules", ".github", ".vscode", "screenshots", "dist", "build", "__pycache__", "backups", "assets"]

def generate_sitemap():
    all_urls = []

    print(f"🚀 Starting Multi-Site Sitemap Generation...")

    # Iterate through each site configuration
    for site in SITES:
        root_dir = site["local_path"]
        domain = site["base_url"]

        if not os.path.exists(root_dir):
            print(f"⚠️ Warning: Directory not found, skipping: {root_dir}")
            continue

        print(f"   Scanning: {domain} ({root_dir})...")

        # Walk through directories
        for root, dirs, files in os.walk(root_dir):
            # Remove ignored directories to stop recursion
            dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
            
            for file in files:
                if file.lower().endswith(".html"):
                    # Check if file is in ignore list
                    if any(fnmatch(file, pattern) for pattern in IGNORE_FILES):
                        continue
                    
                    # Get full local path
                    full_path = os.path.join(root, file)
                    
                    # Get relative path (e.g., "docs\intro.html")
                    try:
                        rel_path = os.path.relpath(full_path, root_dir)
                    except ValueError:
                        continue # Skip if path issue

                    # Convert to URL path and escape special chars (like spaces)
                    url_path = rel_path.replace("\\", "/")
                    url_path = quote(url_path, safe='/')
                    
                    # Determine Final URL
                    if url_path == "index.html":
                        final_url = domain # Root of that subdomain
                        priority = "1.0"
                    else:
                        final_url = domain + url_path
                        priority = "0.8"
                    
                    # Get Last Modified Date
                    timestamp = os.path.getmtime(full_path)
                    last_mod = datetime.datetime.fromtimestamp(timestamp).strftime("%Y-%m-%d")
                    
                    all_urls.append({
                        "loc": final_url,
                        "lastmod": last_mod,
                        "priority": priority
                    })

    # Generate XML Content
    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xml_content += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    
    for url in all_urls:
        xml_content += f'  <url>\n'
        xml_content += f'    <loc>{url["loc"]}</loc>\n'
        xml_content += f'    <lastmod>{url["lastmod"]}</lastmod>\n'
        xml_content += f'    <priority>{url["priority"]}</priority>\n'
        xml_content += f'  </url>\n'
    
    xml_content += '</urlset>'
    
    # Write to file
    try:
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(xml_content)
        
        print(f"\n✅ Success! Master sitemap generated with {len(all_urls)} URLs.")
        print(f"📁 Saved to: {OUTPUT_FILE}")
    except Exception as e:
        print(f"❌ Error writing file: {e}")

if __name__ == "__main__":
    generate_sitemap()