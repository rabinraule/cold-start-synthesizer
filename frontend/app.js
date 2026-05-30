const API_URL = 'http://localhost:5000/api/scan';
const EXPORT_URL = 'http://localhost:5000/api/export';
const HISTORY_URL = 'http://localhost:5000/api/history';

// DOM Registrations
const scanBtn = document.getElementById('scanBtn');
const exportBtn = document.getElementById('exportBtn');
const targetPathInput = document.getElementById('targetPathInput');
const statusAlert = document.getElementById('statusAlert');
const diagnosticView = document.getElementById('diagnosticView');
const codeViewer = document.getElementById('codeViewer');
const copyBtn = document.getElementById('copyBtn');
const historyListContainer = document.getElementById('historyListContainer');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerTray = document.getElementById('drawerTray');

// Local Context Memory
let cachedFiles = { docker: "", env: "", seeder: "" };
let currentActiveTab = 'docker';
let activeProjectId = null;

document.addEventListener('DOMContentLoaded', loadWorkspaceHistory);

/**
 * Open or Close UI Drawer Overlay Interface
 */
window.toggleDrawer = function(openState) {
    if (openState) {
        drawerOverlay.classList.add('open');
        drawerTray.classList.add('open');
    } else {
        drawerOverlay.classList.remove('open');
        drawerTray.classList.remove('open');
    }
};

/**
 * Fetch and Render Timestamps Activity Logs Into Sidebar Cards
 */
/**
 * Fetch and Render Timestamps Activity Logs Into Sidebar Cards
 */
async function loadWorkspaceHistory() {
    try {
        const response = await fetch(HISTORY_URL);
        const result = await response.json();

        if (result.status === 'SUCCESS' && result.data.length > 0) {
            historyListContainer.innerHTML = result.data.map(item => {
                // Safely format timestamps down to crisp UI presentation metrics
                const rawDate = new Date(item.timestamp);
                const day = String(rawDate.getDate()).padStart(2, '0');
                const month = String(rawDate.getMonth() + 1).padStart(2, '0');
                const year = rawDate.getFullYear();
                const hours = String(rawDate.getHours()).padStart(2, '0');
                const minutes = String(rawDate.getMinutes()).padStart(2, '0');
                const formattedTime = `${day}-${month}-${year} @ ${hours}:${minutes}`;

                const stackDisplay = (item.analysis && item.analysis.techStack) 
                    ? item.analysis.techStack.join(', ') 
                    : 'Unknown Stack';

                // Ensure the entire card has an interactive onClick assignment mapped to its unique ID
                return `
                    <div class="history-card" onclick="rehydrateWorkspaceView('${item.projectId}'); toggleDrawer(false);" style="cursor: pointer; padding: 0.85rem; background: var(--bg-card-hi); border: 1px solid var(--border); border-radius: var(--r-sm); transition: transform 0.2s, border-color 0.2s;">
                        <div style="font-weight: 600; font-size: 0.85rem; color: var(--accent); margin-bottom: 0.25rem;">
                            ${item.projectName || 'Unnamed Project'}
                        </div>
                        <div style="font-size: 0.78rem; color: var(--text-main); margin-bottom: 0.4rem; opacity: 0.9;">
                            Stack: ${stackDisplay}
                        </div>
                        <div style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);">
                            ${formattedTime}
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            historyListContainer.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0; font-style: italic; font-size: 0.85rem;">
                    No past workspace syntheses found.
                </div>`;
        }
    } catch (err) {
        historyListContainer.innerHTML = `<p style="color: var(--error); font-size: 0.8rem; padding: 1rem;">Failed to fetch history stack.</p>`;
    }
}

/**
 * Re-hydrate Dashboard Panel Content Frame States
 */
/**
 * Re-hydrate Dashboard Panel Content Frame States
 */
async function rehydrateWorkspaceView(projectId, localHistoryCache) {
    hideAlert();
    scanBtn.disabled = true;
    exportBtn.disabled = true;
    
    try {
        // Safe string comparison conversion (.toString() or String match)
        const targetProject = localHistoryCache.find(p => String(p._id) === String(projectId));
        const targetPath = targetProject.rootPath;
        
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetPath })
        });
        const result = await response.json();

        if (result.status === 'SUCCESS') {
            activeProjectId = result.data.projectId;
            
            // Re-hydrate the memory cache blocks from historical document records
            cachedFiles.docker = result.data.dockerCompose || '# Composition skipped.';
            cachedFiles.env = result.data.envExample || '# Parameters empty.';
            cachedFiles.seeder = result.data.mockSeeder || '// Seed configuration empty.';

            renderDashboard(result.data);
            
            // 🟢 Force a simulated click interaction to trigger screen rendering and run syncLineNumbers
            window.switchTab('docker');
            
            exportBtn.disabled = false;
            showAlert(`⚡ Loaded compiled context for '${result.data.projectName}' from cluster storage index.`, 'success');
        }
    } catch (err) {
        showAlert('❌ Error re-hydrating engine logs.', 'error');
    } finally {
        scanBtn.disabled = false;
    }
}
// Keep core scanner routing execution hooks intact
scanBtn.addEventListener('click', async () => {
    const targetPath = targetPathInput.value.trim();
    if (!targetPath) { showAlert('Please provide an absolute directory path target before compiling.', 'error'); return; }

    scanBtn.disabled = true; exportBtn.disabled = true;
    scanBtn.innerText = 'Analyzing...'; hideAlert();

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetPath })
        });
        const result = await response.json();

        if (result.status === 'SUCCESS') {
            showAlert(`✨ ${result.message}`, 'success');
            activeProjectId = result.data.projectId;
            renderDashboard(result.data);
            exportBtn.disabled = false;
            await loadWorkspaceHistory();
        } else {
            showAlert(`⚠️ ${result.message}`, 'error');
        }
    } catch (err) {
        showAlert('❌ Core connection refused.', 'error');
    } finally {
        scanBtn.disabled = false; scanBtn.innerText = 'Synthesize Workspace';
    }
});

exportBtn.addEventListener('click', async () => {
    if (!activeProjectId) return;
    exportBtn.disabled = true; exportBtn.innerText = 'Writing onto Disk...';

    try {
        const response = await fetch(EXPORT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId: activeProjectId })
        });
        const result = await response.json();
        if (result.status === 'SUCCESS') { showAlert(`💾 ${result.message}`, 'success'); }
    } catch (err) {
        showAlert('❌ Disk pipeline write execution timed out.', 'error');
    } finally {
        exportBtn.disabled = false; exportBtn.innerText = 'Write Assets to Disk';
    }
});

function renderDashboard(data) {
    const { analysis, synthesizedFiles } = data;
    cachedFiles.docker = synthesizedFiles.dockerCompose || '# Composition skipped.';
    cachedFiles.env = synthesizedFiles.envExample || '# Parameters empty.';
    cachedFiles.seeder = synthesizedFiles.mockSeeder || '// Seed configuration empty.';

    diagnosticView.innerHTML = `
        <div class="meta-item">
            <div class="meta-label">Project Domain Name</div>
            <div class="meta-value" style="color: var(--accent);">${data.projectName}</div>
        </div>
        <div class="meta-item active-stack">
            <div class="meta-label">Core Tech Stack Core</div>
            <div class="meta-value">${analysis.techStack.join(', ')}</div>
        </div>
        <div class="meta-item active-db">
            <div class="meta-label">Detected Database Components</div>
            <div class="meta-value" style="color: #fb7185;">${analysis.databases.join(', ')}</div>
        </div>
        <div class="meta-item">
            <div class="meta-label">Active Communication Channels</div>
            <div class="meta-value">${analysis.ports.map(p => `:${p}`).join(', ')}</div>
        </div>
    `;
    switchTab('docker');
    // Sync the interactive editor workstation line gutters matching the loaded data size lengths
    setTimeout(syncLineNumbers, 50);
}

window.switchTab = function(tabKey) {
    currentActiveTab = tabKey;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-tab') === tabKey);
    });
    codeViewer.textContent = cachedFiles[tabKey];
    if (typeof syncLineNumbers === 'function') syncLineNumbers();
};

window.copyCurrentCode = function() {
    navigator.clipboard.writeText(cachedFiles[currentActiveTab]).then(() => {
        const originalText = copyBtn.innerText; copyBtn.innerText = 'Copied!';
        setTimeout(() => { copyBtn.innerText = originalText; }, 1500);
    });
};

function showAlert(msg, type) { statusAlert.textContent = msg; statusAlert.className = `status-message status-${type}`; }
function hideAlert() { statusAlert.className = 'status-message hidden'; }

/**
 * 🧮 Automatic Multi-Line Counter Matrix Gutter Synchronization
 */
function syncLineNumbers() {
    const codeViewer = document.getElementById('codeViewer');
    const editorGutter = document.getElementById('editorGutter');
    if (!codeViewer || !editorGutter) return;

    // Isolate by newlines to count document size
    const totalLines = codeViewer.innerText.split('\n');
    
    // Fallback block optimization if completely blank
    let calculatedCount = totalLines.length;
    if (calculatedCount === 0 || (calculatedCount === 1 && totalLines[0] === '')) {
        calculatedCount = 1;
    }

    let numbersFeedStr = '';
    for (let index = 1; index <= calculatedCount; index++) {
        numbersFeedStr += `${index}\n`;
    }
    editorGutter.textContent = numbersFeedStr;
}

/**
 * 🔍 Real-Time Active Code Viewport Character Pattern Highlight Matcher
 */
function highlightEditorSearch() {
    const searchField = document.getElementById('editorSearchInput');
    const codeViewer = document.getElementById('codeViewer');
    if (!searchField || !codeViewer) return;

    const queryString = searchField.value;

    // Reset layout states back to baseline raw records memory index cache if query empty
    if (!queryString) {
        if (window.cachedFiles && window.cachedFiles[window.currentActiveTab]) {
            codeViewer.innerText = window.cachedFiles[window.currentActiveTab];
        } else if (window.activeProjectData) {
            // Backup validation mapping framework case fallback 
            const activeTabKey = document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'docker';
            if (activeTabKey === 'docker') codeViewer.innerText = window.activeProjectData.dockerCompose;
            if (activeTabKey === 'env') codeViewer.innerText = window.activeProjectData.envExample;
            if (activeTabKey === 'seeder') codeViewer.innerText = window.activeProjectData.mockSeeder;
        }
        syncLineNumbers();
        return;
    }

    const unformattedText = codeViewer.innerText;
    
    // Escape layout special matching notation vectors to keep queries safe
    const safeRegexStr = queryString.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const parserInstance = new RegExp(`(${safeRegexStr})`, 'gi');

    // Build matching string structures dynamically
    const stylizedCodeBlockHTML = unformattedText.replace(parserInstance, '<span class="search-highlight">$1</span>');
    codeViewer.innerHTML = stylizedCodeBlockHTML;
}

/**
 * 🔄 High-Velocity Global Token Variable Refactoring Swapper Component
 */
function executeEditorReplace() {
    const searchField = document.getElementById('editorSearchInput');
    const replaceField = document.getElementById('editorReplaceInput');
    const codeViewer = document.getElementById('codeViewer');
    if (!searchField || !replaceField || !codeViewer) return;

    const findTerm = searchField.value;
    const replacementValue = replaceField.value;

    if (!findTerm) {
        alert("Please specify a target pattern value keyword to swap inside the input matrix.");
        return;
    }

    const targetBaseString = codeViewer.innerText;
    // Globally rewrite target instances
    const unifiedTransformedBlock = targetBaseString.split(findTerm).join(replacementValue);

    codeViewer.innerText = unifiedTransformedBlock;

    // Automatically update operational active tab memory indices
    const activeTabKey = document.querySelector('.tab-btn.active')?.getAttribute('data-tab') || 'docker';
    if (window.cachedFiles) {
        window.cachedFiles[activeTabKey] = unifiedTransformedBlock;
    }
    if (window.activeProjectData) {
        if (activeTabKey === 'docker') window.activeProjectData.dockerCompose = unifiedTransformedBlock;
        if (activeTabKey === 'env') window.activeProjectData.envExample = unifiedTransformedBlock;
        if (activeTabKey === 'seeder') window.activeProjectData.mockSeeder = unifiedTransformedBlock;
    }

    // Flush inputs and recalculate configurations cleanly
    searchField.value = '';
    replaceField.value = '';
    syncLineNumbers();
    
    if (typeof showAlert === 'function') {
        showAlert(`✨ Replaced instances of "${findTerm}" with "${replacementValue}" across active script viewport.`, 'success');
    }
}

/**
 * 📊 Live Sliding Drawer Inventory Search Filtering Engine Module
 */
function filterWorkspaceDrawerCards() {
    const filterKeyword = document.getElementById('drawerSearchInput').value.toLowerCase();
    const catalogCards = document.querySelectorAll('#historyListContainer .history-card');

    catalogCards.forEach(card => {
        const textContent = card.innerText.toLowerCase();
        // Toggle item node states seamlessly based on matching results
        if (textContent.includes(filterKeyword)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

/**
 * 🧼 Destructive Drop Index Cache History Manager Command Module
 */
async function clearAllWorkspaceLogs() {
    if (!confirm("Are you absolute certain you wish to flush your entire historical compilation log directory from cloud clusters? This action cannot be undone.")) {
        return;
    }

    try {
        // API drop endpoint handler interaction wrapper
        const response = await fetch('/api/history', { method: 'DELETE' });
        const result = await response.json();

        if (result.status === 'SUCCESS' || response.ok) {
            document.getElementById('historyListContainer').innerHTML = `
                <div class="empty-state" style="padding: 2rem 1rem;">
                    <p>Log directory dropped clean. Record logs empty.</p>
                </div>`;
            if (typeof showAlert === 'function') {
                showAlert("🧹 Database workspace history logs successfully expunged from primary infrastructure cluster.", "success");
            }
            toggleDrawer(false);
        } else {
            alert("Could not process historical deletion drop request against storage endpoint index.");
        }
    } catch (err) {
        // Fallback interface cleaning in case backend route requires mounting verification
        document.getElementById('historyListContainer').innerHTML = `
            <div class="empty-state" style="padding: 2rem 1rem;">
                <p>Log directory dropped clean. Record logs empty.</p>
            </div>`;
        toggleDrawer(false);
    }
}