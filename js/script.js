// ==========================================
// js/script.js - Main Engine & UI
// ==========================================

// --- GLOBAL EXPOSURE (Makes HTML Buttons Work) ---
window.startGame = function() {
    gameMode = 'solo';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('top-bar').classList.remove('hidden');
    init();
};

window.endTurn = async function() {
    if (isProcessing || !isMyTurn) return;
    isProcessing = true;
    
    if (gameMode === 'solo') {
        addToLog("AI's Turn...", "ai");
        await runSoloAI(); 
        isMyTurn = true;
        actions = 0; discarded = false;
        while(pHand.length < 3) await drawCardAnimated(pDeck, pHand, true);
        while(aiHand.length < 3) await drawCardAnimated(aiDeck, aiHand, false);
    }
    isProcessing = false;
    render();
};

// --- CORE LOGIC ---
async function init() {
    pDeck = [];
    BASE_DECK.forEach(c => { for(let i=0; i<c.count; i++) pDeck.push({...c}); });
    pDeck.sort(() => Math.random() - 0.5);
    
    if (gameMode === 'solo') {
        aiDeck = [...pDeck].sort(() => Math.random() - 0.5);
    }

    pHP = 60; aiHP = 60;
    pHand = []; aiHand = [];
    pField = [null, null, null]; aiField = [null, null, null];
    
    render();
    for(let i=0; i<3; i++) await drawCardAnimated(pDeck, pHand, true);
    if (gameMode === 'solo') {
        for(let i=0; i<3; i++) await drawCardAnimated(aiDeck, aiHand, false);
    }
}

function render() {
    document.getElementById('p-hp').innerText = pHP;
    document.getElementById('ai-hp').innerText = aiHP;
    syncHandDOM('hand', pHand, true);
    syncHandDOM('ai-hand', aiHand, false);
    for(let i=0; i<3; i++) {
        renderField('p-'+i, pField[i], i, 'p');
        renderField('ai-'+i, aiField[i], i, 'ai');
    }
}

// --- RENDERING HELPERS ---
function renderField(id, card, col, owner) {
    const slot = document.getElementById(id);
    slot.innerHTML = '';
    if (!card) return;

    const div = document.createElement('div');
    div.className = `card ${card.charging ? 'charging' : ''}`;
    div.style.backgroundImage = (owner === 'ai' && !card.revealed) 
        ? `url('${IMAGES}cardbacks/cardback.png')` 
        : `url('${IMAGES}${card.img}')`;
    slot.appendChild(div);
}

function syncHandDOM(id, cards, isPlayer) {
    const container = document.getElementById(id);
    container.innerHTML = '';
    cards.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.backgroundImage = isPlayer ? `url('${IMAGES}${c.img}')` : `url('${IMAGES}cardbacks/cardback.png')`;
        if (isPlayer) div.onclick = () => { selectedIdx = i; render(); };
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

function addToLog(msg, type) {
    const log = document.getElementById('game-log');
    const li = document.createElement('li');
    li.innerText = msg;
    li.className = `log-${type}`;
    log.appendChild(li);
}
