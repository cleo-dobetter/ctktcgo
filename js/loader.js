// js/loader.js

window.startPreloader = function() {
    console.log("Loader started...");

    const screen = document.getElementById('loading-screen');
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');

    // 1. SAFETY: If the HTML is missing, just unlock the game immediately
    if (!screen) {
        console.warn("No loading screen found in HTML.");
        return; 
    }

    // 2. COLLECT ASSETS
    const assets = ["cardbacks/cardback.png", "animations/cardani/stallion.gif"];
    
    // Add deck images safely
    if (window.BASE_DECK) {
        window.BASE_DECK.forEach(c => assets.push(c.img));
    }
    if (window.SKILL_POOL) {
        window.SKILL_POOL.forEach(s => assets.push(s.img));
    }

    let loaded = 0;
    let total = assets.length;

    // 3. LOAD LOOP
    if (total === 0) {
        finishLoading();
        return;
    }

    assets.forEach(path => {
        const img = new Image();
        
        // Success Handler
        img.onload = () => {
            loaded++;
            updateBar(loaded, total, bar, txt);
        };

        // Error Handler (Logs missing files but keeps loading)
        img.onerror = () => {
            console.error("Missing image:", window.IMAGES + path);
            loaded++;
            updateBar(loaded, total, bar, txt);
        };

        // Trigger Load
        img.src = window.IMAGES + path;
    });

    // 4. TIMEOUT FALLBACK (In case a download hangs)
    setTimeout(() => {
        if (screen && !screen.classList.contains('hidden')) {
            console.log("Forcing load completion...");
            finishLoading();
        }
    }, 4000);
};

function updateBar(loaded, total, bar, txt) {
    const percent = Math.floor((loaded / total) * 100);
    if (bar) bar.style.width = percent + "%";
    if (txt) txt.innerText = `Loading... ${percent}%`;

    if (loaded >= total) {
        setTimeout(finishLoading, 500);
    }
}

function finishLoading() {
    const screen = document.getElementById('loading-screen');
    if (screen) {
        screen.style.opacity = '0';
        setTimeout(() => {
            screen.style.display = 'none'; // Completely remove it
        }, 500);
    }
}

// Start immediately when the window is ready
window.addEventListener('load', window.startPreloader);
