/**
 * Five-Star Deathmatch Frontend JavaScript
 * 
 * Handles the interactive image ranking interface including:
 * - Navigation between images
 * - Ranking and flagging functionality
 * - Filtering and display controls
 * - Keyboard shortcuts
 */

// Application state
let state = { files: [], meta: {} };
let index = 0;
let filters = { ranks: new Set(), flags: new Set() };
let zoom = false;

// DOM elements
const mainimg = document.getElementById("mainimg");
const filenameDiv = document.getElementById("filename");
const rankflagsDiv = document.getElementById("rankflags");
const posDiv = document.getElementById("pos");
const central = document.getElementById("central");
const help = document.getElementById("help");
const helpPanel = document.getElementById("helpPanel");

/**
 * Fetch the current state from the server
 */
function fetchState() {
    fetch("/api/state")
        .then(r => r.json())
        .then(js => {
            state = js;
            render();
            buildBottom();
        });
}

/**
 * Build the bottom control panel with rank and flag filters
 */
function buildBottom() {
    buildRankRow();
    buildFlagRow();
}

/**
 * Build the rank filter row
 */
function buildRankRow() {
    const rr = document.getElementById("rankrow");
    rr.innerHTML = "";
    
    const ranks = [-1, 0, 1, 2, 3, 4, 5];
    let counts = {};
    for (let r of ranks) counts[r] = 0;
    
    let total = 0;
    for (let f of state.files) {
        let m = state.meta[f] || { rank: 0, flags: [] };
        if (m.rank > -1) total++;
        counts[m.rank]++;
    }
    
    for (let r of ranks) {
        let icon = (r == -1 ? "❌" : (r == 0 ? "⚪️" : "⭐️".repeat(r)));
        let pct = (r >= 0 && total > 0) ? Math.round(100 * counts[r] / total) + "%" : "";
        
        const d = document.createElement("div");
        d.className = "cell";
        if (filters.ranks.has(r)) d.classList.add("active");
        
        d.innerHTML = "<div>" + icon + "</div><div>" + counts[r] + (pct ? " (" + pct + ")" : "") + "</div>";
        d.onclick = () => {
            if (filters.ranks.has(r)) {
                filters.ranks.delete(r);
            } else {
                filters.ranks.add(r);
            }
            render();
            buildBottom();
        };
        rr.appendChild(d);
    }
}

/**
 * Build the flag filter row
 */
function buildFlagRow() {
    const fr = document.getElementById("flagrow");
    fr.innerHTML = "";
    
    const flags = ["A", "B", "C", "D", "E", "F"];
    let flagCounts = {};
    for (let fl of flags) flagCounts[fl] = 0;
    
    let unflagged = 0;
    for (let f of state.files) {
        let m = state.meta[f] || { rank: 0, flags: [] };
        if (m.flags.length == 0) unflagged++;
        for (let fl of m.flags) flagCounts[fl]++;
    }
    
    // Add flag buttons
    for (let fl of flags) {
        const d = document.createElement("div");
        d.className = "cell";
        if (filters.flags.has(fl)) d.classList.add("active");
        
        d.innerHTML = "<div>" + fl + "</div><div>" + flagCounts[fl] + "</div>";
        d.onclick = () => {
            if (filters.flags.has(fl)) {
                filters.flags.delete(fl);
            } else {
                filters.flags.add(fl);
            }
            render();
            buildBottom();
        };
        fr.appendChild(d);
    }
    
    // Add unflagged button
    const d = document.createElement("div");
    d.className = "cell";
    if (filters.flags.has("UNFLAG")) d.classList.add("active");
    
    d.innerHTML = "<div>🚫</div><div>" + unflagged + "</div>";
    d.onclick = () => {
        if (filters.flags.has("UNFLAG")) {
            filters.flags.delete("UNFLAG");
        } else {
            filters.flags.add("UNFLAG");
        }
        render();
        buildBottom();
    };
    fr.appendChild(d);
}

/**
 * Get filtered list of files based on current filters
 */
function filteredFiles() {
    return state.files.filter(f => {
        let m = state.meta[f] || { rank: 0, flags: [] };
        
        // Check rank filters
        if (filters.ranks.has(m.rank)) return false;
        
        // Check flag filters
        for (let fl of m.flags) {
            if (filters.flags.has(fl)) return false;
        }
        
        // Check unflagged filter
        if (m.flags.length == 0 && filters.flags.has("UNFLAG")) return false;
        
        return true;
    });
}

/**
 * Copy the current filtered list of filenames to the clipboard, LF-delimited.
 */
function copyListToClipboard() {
    const list = filteredFiles();
    const text = list.join("\n") + "\n";
    if (!text) {
        return; // nothing to copy
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => fallbackClipboardCopy(text));
    } else {
        fallbackClipboardCopy(text);
    }
}

/**
 * Fallback clipboard copy using a temporary textarea element.
 */
function fallbackClipboardCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'absolute';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) { /* ignore */ }
    document.body.removeChild(ta);
}

/**
 * Render the current image and update display
 */
function render() {
    let list = filteredFiles();
    
    if (list.length == 0) {
        mainimg.src = "";
        filenameDiv.textContent = "";
        rankflagsDiv.textContent = "";
        posDiv.textContent = "0/0";
        return;
    }
    
    if (index >= list.length) index = 0;
    
    let fname = list[index];
    mainimg.src = "/image/" + encodeURIComponent(fname);
    filenameDiv.textContent = fname;
    
    let m = state.meta[fname] || { rank: 0, flags: [] };
    let rankDisp = (m.rank == -1 ? "❌" : (m.rank == 0 ? "⚪️" : "⭐️".repeat(m.rank)));
    rankflagsDiv.textContent = rankDisp + " " + m.flags.sort().join("");
    posDiv.textContent = (index + 1) + " / " + list.length;
}

/**
 * Find the next valid index after a file update
 */
function nextValidIndex(oldfname) {
    let list = filteredFiles();
    let i = list.indexOf(oldfname);
    
    if (i == -1) {
        if (index >= list.length) index = list.length - 1;
    } else {
        index = i + 1;
    }
}

/**
 * Update the rank of the current image
 */
function updateRank(r) {
    let fname = filteredFiles()[index];
    
    fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: fname, rank: r })
    })
    .then(() => fetch("/api/state"))
    .then(r => r.json())
    .then(js => {
        state = js;
        nextValidIndex(fname);
        render();
        buildBottom();
    });
}

/**
 * Toggle a flag on the current image
 */
function toggleFlag(fl) {
    let fname = filteredFiles()[index];
    
    fetch("/api/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file: fname, toggle_flag: fl })
    })
    .then(() => fetch("/api/state"))
    .then(r => r.json())
    .then(js => {
        state = js;
        render();
        buildBottom();
    });
}

/**
 * Handle keyboard shortcuts
 */
document.addEventListener("keydown", ev => {
    // State-management shortcuts (always available)
    switch (ev.key) {
        case "r":
        case "R":
            filters = { ranks: new Set(), flags: new Set() };
            render();
            buildBottom();
            return;

        case "z":
        case "Z":
            zoom = !zoom;
            if (zoom) {
                central.classList.add("zoom");
                central.scrollTop = 0;
                central.scrollLeft = 0;
            } else {
                central.classList.remove("zoom");
            }
            return;

        case " ":
            fetch("/api/reload", { method: "POST" })
                .then(() => fetchState());
            return;

        case "l":
        case "L":
            copyListToClipboard();
            return;
    }

    // Image-dependent shortcuts (require at least one image)
    let list = filteredFiles();
    if (list.length == 0) return;

    switch (ev.key) {
        case "ArrowLeft":
            index = (index - 1 + list.length) % list.length;
            render();
            break;

        case "ArrowRight":
            index = (index + 1) % list.length;
            render();
            break;

        case "ArrowUp":
            index = 0;
            render();
            break;

        case "ArrowDown":
            index = list.length - 1;
            render();
            break;

        case "x":
        case "X":
            updateRank(-1);
            break;

        case "0":
        case "1":
        case "2":
        case "3":
        case "4":
        case "5":
            updateRank(parseInt(ev.key));
            break;

        default:
            if ("ABCDEF".includes(ev.key.toUpperCase())) {
                toggleFlag(ev.key.toUpperCase());
            }
            break;
    }
});

/**
 * Show help panel
 */
help.onclick = () => {
    helpPanel.style.display = "block";
    helpPanel.innerHTML = "<ul>" +
        "<li>← / → : Previous / Next image</li>" +
        "<li>↑ / ↓ : First / Last image</li>" +
        "<li>0–5 : Set rank</li>" +
        "<li>X : Rank -1 (❌)</li>" +
        "<li>A–F : Toggle flags</li>" +
        "<li>R : Reset filters</li>" +
        "<li>Z : Toggle zoom</li>" +
        "<li>L : Copy filtered list to clipboard</li>" +
        "<li>Space : Reload state</li>" +
        "</ul>";
};

/**
 * Hide help panel
 */
helpPanel.onclick = () => {
    helpPanel.style.display = "none";
};

// Initialize the application
fetchState();
