// ==========================================
// js/script.js - Main Engine & Rendering
// ==========================================

window.startGame = function() {
    window.gameMode = 'solo';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('top-bar').classList.remove('hidden');
    init();
};

async function init() {
    window.pDeck = [];
    window.BASE_DECK.forEach(c => { for(let i=0; i<c.count; i++) pDeck.push({...c}); });
    window.pDeck.sort(() => Math.random() - 0.5);
    
    if (window.gameMode === 'solo') {
        window.aiDeck = [...window.pDeck].sort(() => Math.random() - 0.5);
    }

    window.pHP = 60; window.aiHP = 60;
    window.pHand = []; window.aiHand = [];
    window.pField = [null, null, null]; window.aiField = [null, null, null];
    
    render();
    for(let i=0; i<3; i++) await drawCardAnimated(pDeck, pHand, true);
    if (window.gameMode === 'solo') {
        for(let i=0; i<3; i++) await drawCardAnimated(aiDeck, aiHand, false);
    }
}

function render() {
    document.getElementById('p-hp').innerText = window.pHP;
    document.getElementById('ai-hp').innerText = window.aiHP;
    
    syncHandDOM('hand', window.pHand, true);
    syncHandDOM('ai-hand', window.aiHand, false);

    for(let i=0; i<3; i++) {
        renderField('p-'+i, window.pField[i], i, 'p');
        renderField('ai-'+i, window.aiField[i], i, 'ai');
    }
}

function renderField(id, card, col, owner) {
    const slot = document.getElementById(id);
    slot.innerHTML = '';
    if (!card) return;

    const div = document.createElement('div');
    div.className = `card ${card.charging ? 'charging' : ''}`;
    
    // IMAGE PATH FIX
    const imgPath = (owner === 'ai' && !card.revealed) 
        ? `${window.IMAGES}cardbacks/cardback.png` 
        : `${window.IMAGES}${card.img}`;
    
    div.style.backgroundImage = `url('${imgPath}')`;
    div.style.backgroundSize = "cover";
    slot.appendChild(div);
}

function syncHandDOM(id, cards, isPlayer) {
    const container = document.getElementById(id);
    container.innerHTML = '';
    cards.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'card';
        const imgPath = isPlayer ? `${window.IMAGES}${c.img}` : `${window.IMAGES}cardbacks/cardback.png`;
        div.style.backgroundImage = `url('${imgPath}')`;
        div.style.backgroundSize = "cover";
        if (isPlayer) div.onclick = () => { window.selectedIdx = i; render(); };
        container.appendChild(div);
    });
}

async function drawCardAnimated(deck, hand, isPlayer) {
    let card = deck.shift();
    if (!card) return;
    hand.push(card);
    render();
    await new Promise(r => setTimeout(r, 400));
}

window.render = render; // Expose for other files
