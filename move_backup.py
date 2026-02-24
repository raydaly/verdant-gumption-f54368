import re

with open('index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update app-header
header_target = '''        <header class="app-header">
            <h1 class="brand">Greatuncle</h1>
        </header>'''
header_replacement = '''        <header class="app-header" style="position: relative; display: flex; align-items: center; justify-content: center;">
            <h1 class="brand" style="margin: 0;">Greatuncle</h1>
            <button id="nav-header-settings" class="nav-item" aria-label="About" style="position: absolute; right: var(--space-lg); background: none; border: none; font-size: 1.5rem; cursor: pointer; opacity: 0.6; padding: 0; outline: none;">⚙️</button>
        </header>'''
content = content.replace(header_target, header_replacement)

# 2. Update bottom nav
nav_target = '''            <button id="nav-settings" class="nav-item" aria-label="About">
                <span class="icon">⚙️</span>
                <span class="label">About</span>
            </button>'''
nav_replacement = '''            <button id="nav-backup" class="nav-item" aria-label="Backup">
                <span class="icon">🗄️</span>
                <span class="label">Backup</span>
            </button>'''
content = content.replace(nav_target, nav_replacement)

# 3. Update tab control
tab_target = '''                <div class="tab-control">
                    <button class="tab-btn active" data-tab="about">The Vision</button>
                    <button class="tab-btn" data-tab="settings">App Settings</button>
                    <button class="tab-btn" data-tab="gardenshed">Garden Shed</button>
                </div>'''
tab_replacement = '''                <div class="tab-control">
                    <button class="tab-btn active" data-tab="about">The Vision</button>
                    <button class="tab-btn" data-tab="settings">App Settings</button>
                </div>'''
content = content.replace(tab_target, tab_replacement)

# 4. Extract Garden Shed
gs_start_string = '                <!-- Garden Shed Tab (Backup/Export) -->'
gs_end_string = '                <!-- Settings Tab (Existing content wrapped) -->'

# Split around Garden Shed
parts1 = content.split(gs_start_string)
before_gs = parts1[0]
after_gs_start = parts1[1]

parts2 = after_gs_start.split(gs_end_string)
gs_content_raw = parts2[0]
after_gs = parts2[1]

# Reformat gs_content_raw to be a view-section
# It starts with `<div id="gardenshed-tab" ...>` and ends with `</div>\n\n`
gs_content = gs_content_raw.replace('<div id="gardenshed-tab" class="tab-content hidden" data-tab="gardenshed">', 
'''<section id="backup-view" class="view-section hidden">
                <header class="section-header">
                    <h2 class="subtitle-title">Backup</h2>
                </header>''', 1)

# Find the last </div> before the end and replace it with </section>
last_div_index = gs_content.rfind('</div>')
gs_content = gs_content[:last_div_index] + '</section>' + gs_content[last_div_index+6:]

# Re-assemble without Garden Shed in its original place
content = before_gs + '                <!-- Settings Tab (Existing content wrapped) -->' + after_gs

# Place Backup view right before Journal view
journal_start = '            <!-- Journal View -->'
content = content.replace(journal_start, '            <!-- Backup View -->\\n' + gs_content + '\\n' + journal_start)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(content)

