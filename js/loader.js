const PRELOAD_LIST = ["cardbacks/cardback.png", "animations/cardani/stallion.gif"];
BASE_DECK.forEach(c => PRELOAD_LIST.push(c.img));
SKILL_POOL.forEach(s => PRELOAD_LIST.push(s.img));

function startPreloader() {
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');
    let loaded = 0;
    let total = PRELOAD_LIST.length;

    // Safety Timeout
    setTimeout(() => { if (document.getElementById('loading-screen')) finishLoading(); }, 4000);

    PRELOAD_LIST.forEach(file => {
        const img = new Image();
        img.onload = img.onerror = () => {
            loaded++;
            let percent = Math.floor((loaded / total) * 100);
            if(bar) bar.style.width = percent + "%";
            if(txt) txt.innerText = `Loading Assets... ${percent}%`;
            if (loaded >= total) setTimeout(finishLoading, 500);
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
window.addEventListener('load', startPreloader);
