// ==========================================
// LOADER MODULE (Fail-Safe Version)
// ==========================================

function startPreloader() {
    console.log("Preloader sequence initiated...");
    
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');
    const screen = document.getElementById('loading-screen');

    // 1. SAFETY: If globals didn't load, we can't find images.
    if (typeof BASE_DECK === 'undefined' || typeof SKILL_POOL === 'undefined') {
        console.error("CRITICAL: globals.js not detected. Check script order in HTML.");
        if (screen) finishLoading();
        return;
    }

    // 2. BUILD LIST
    const PRELOAD_LIST = ["cardbacks/cardback.png", "animations/cardani/stallion.gif"];
    BASE_DECK.forEach(c => { if(c.img) PRELOAD_LIST.push(c.img); });
    SKILL_POOL.forEach(s => { if(s.img) PRELOAD_LIST.push(s.img); });

    let loaded = 0;
    let total = PRELOAD_LIST.length;
    console.log(`Preloading ${total} assets...`);

    // 3. EMERGENCY OVERRIDE (3-second timeout)
    setTimeout(() => {
        if (loaded < total) {
            console.warn("Preloader timed out. Bypassing...");
            finishLoading();
        }
    }, 3000);

    // 4. LOAD LOGIC
    PRELOAD_LIST.forEach(file => {
        const img = new Image();
        img.onload = img.onerror = () => {
            loaded++;
            let percent = Math.floor((loaded / total) * 100);
            if (bar) bar.style.width = percent + "%";
            if (txt) txt.innerText = `Loading Assets... ${percent}%`;
            if (loaded >= total) {
                console.log("All assets loaded successfully.");
                setTimeout(finishLoading, 500);
            }
        };
        img.src = IMAGES + file;
    });
}

function finishLoading() {
    const screen = document.getElementById('loading-screen');
    if (screen) {
        screen.style.opacity = '0';
        setTimeout(() => screen.classList.add('hidden'), 1000);
    }
}

// Ensure the preloader starts ONLY after all scripts are parsed
window.addEventListener('load', startPreloader);
