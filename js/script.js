// ==========================================
// js/script.js - Main Engine & UI
// ==========================================

// --- GLOBAL EXPOSURE (Makes HTML buttons work) ---
window.startGame = function() {
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('top-bar').classList.remove('hidden');
    init();
};

window.openSkills = function() {
    document.getElementById('skills-overlay').classList.remove('hidden');
    if (typeof renderShop === "function") renderShop();
    if (typeof updateBuilderUI === "function") updateBuilderUI();
};

window.closeSkills = function() {
    document.getElementById('skills-overlay').classList.add('hidden');
};

window.openRules = function() {
    document.getElementById('rules-menu').classList.remove('hidden');
};

window.closeRulesMenu = function() {
    document.getElementById('rules-menu').classList.add('hidden');
};

window.toggleMenu = function() {
    document.getElementById('menu-overlay').classList.toggle('hidden');
};

// --- CORE ENGINE ---

async function init() {
    isProcessing = false;
    window.lastMoveTime = 0;
    document.getElementById('game-log').innerHTML = '';

    // 1. Build Deck
    pDeck = [];
    BASE_DECK.forEach(card => { for(let i=0; i<card.count; i++) pDeck.push({...card}); });
    SKILL_POOL.forEach(skill => {
        let qty = playerSkills[skill.id] || 0;
        for(let i=0; i<qty; i++) pDeck.push({ name: skill.name, type: "skl", img: skill.img, effect: skill.effect });
    });
    pDeck.sort(() => Math.random() - 0.5);

    // 2. Setup Mode
    if (gameMode === 'solo') {
        aiDeck = createAIDeck(); // This function should be in ai.js or globals.js
        isMyTurn = true;
    } else {
        isMyTurn = (myRole === 'host');
    }

    // 3. State Reset
    pHP = 60; aiHP = 60; pHand = []; aiHand = [];
    pField = [null, null, null]; aiField = [null, null, null];
    render();

    // 4. Deal Cards
    for(let i=0; i<3; i++) await drawCardAnimated(pDeck, pHand, true);
    if (gameMode === 'solo') {
        for(let i=0; i<3; i++) await drawCardAnimated(aiDeck, aiHand, false);
    } else {
        await performMultiplayerHandshake();
    }
}

function render() {
    document.getElementById('p-hp').innerText = pHP;
    document.getElementById('ai-hp').innerText = aiHP;
    
    const disabled = (isProcessing || !isMyTurn);
    document.getElementById('btn-discard').disabled = (discarded || selectedIdx === null || disabled);
    document.getElementById('btn-end').disabled = disabled;

    syncHandDOM('hand', pHand, true);
    syncHandDOM('ai-hand', aiHand, false);

    for(let i=0; i<3; i++) {
        renderField('p-'+i, pField[i], i, 'p');
        renderField('ai-'+i, aiField[i], i, 'ai');
    }
}

function renderField(id, card, col, owner) {
    const slot = document.getElementById(id);
    slot.innerHTML = '';
    slot.classList.remove('highlight');

    if (!card) {
        if (selectedIdx !== null && owner === 'p' && !isProcessing && isMyTurn) {
            slot.classList.add('highlight');
        }
        return;
    }

    const div = document.createElement('div');
    div.className = `card ${card.charging ? 'charging' : ''} ${sacrifices.includes(col) ? 'sac-target' : ''}`;
    
    if (owner === 'ai' && card.type === 'skl' && !card.revealed) {
        div.style.backgroundImage = `url('${IMAGES}cardbacks/cardback.png')`;
    } else {
        div.style.backgroundImage = `url('${IMAGES}${card.img}')`;
    }

    if (owner === 'p' && !isProcessing && isMyTurn) {
        div.onclick = () => {
            if (sacrifices.includes(col)) sacrifices = sacrifices.filter(s => s !== col);
            else sacrifices.push(col);
            render();
        };
    }
    slot.appendChild(div);
}

// Attach Gameplay functions to window as well
window.clickSlot = clickSlot;
window.endTurn = endTurn;
window.discardCard = discardCard;

// --- HELPERS ---

async function drawCardAnimated(deck, hand, isPlayer) {
    let card = deck.shift();
    if (!card) return;
    card.animState = 'entering';
    hand.push(card);
    render();
    await sleep(400);
    card.animState = null;
    render();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function addToLog(msg, type) {
    const log = document.getElementById('game-log');
    if (!log) return;
    const li = document.createElement('li');
    li.innerText = msg;
    li.className = `log-${type}`;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
}
