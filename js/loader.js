// ==========================================
// js/loader.js - The Preloader
// ==========================================

window.startPreloader = function() {
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');

    // 1. Build List (Safely check for globals)
    const PRELOAD_LIST = ["cardbacks/cardback.png", "animations/cardani/stallion.gif"];
    
    if (typeof BASE_DECK !== 'undefined') {
        BASE_DECK.forEach(c => { if(c.img) PRELOAD_LIST.push(c.img); });
    }
    if (typeof SKILL_POOL !== 'undefined') {
        SKILL_POOL.forEach(s => { if(s.img) PRELOAD_LIST.push(s.img); });
    }

    let loaded = 0;
    let total = PRELOAD_LIST.length;

    if (total === 0) {
        finishLoading();
        return;
    }

    // 2. Loading Loop
    PRELOAD_LIST.forEach(file => {
        const img = new Image();
        img.onload = img.onerror = () => {
            loaded++;
            let percent = Math.floor((loaded / total) * 100);
            if (bar) bar.style.width = percent + "%";
            if (txt) txt.innerText = `Loading Assets... ${percent}%`;
            if (loaded >= total) setTimeout(finishLoading, 500);
        };
        // Use IMAGES from globals.js
        img.src = (typeof IMAGES !== 'undefined' ? IMAGES : "images/") + file;
    });

    // 3. Fail-safe timeout
    setTimeout(() => {
        if (loaded < total) finishLoading();
    }, 5000);
};

function finishLoading() {
    const screen = document.getElementById('loading-screen');
    if (screen) {
        screen.style.opacity = '0';
        setTimeout(() => screen.classList.add('hidden'), 1000);
    }
}

// Start when window loads
window.addEventListener('load', startPreloader);
