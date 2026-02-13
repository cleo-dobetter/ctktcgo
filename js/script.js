// ==========================================
// SECTION 5: CORE ENGINE & RENDERING
// ==========================================

async function init() {
    isProcessing = false; 
    window.lastMoveTime = 0;
    document.getElementById('game-log').innerHTML = ''; 

    // 1. Build Player Deck
    pDeck = [];
    BASE_DECK.forEach(card => { for(let i=0; i<card.count; i++) pDeck.push({...card}); });
    SKILL_POOL.forEach(skill => {
        let qty = playerSkills[skill.id] || 0;
        for(let i=0; i<qty; i++) {
            pDeck.push({ name: skill.name, type: "skl", val: 0, cost: 0, img: skill.img, effect: skill.effect });
        }
    });
    pDeck.sort(() => Math.random() - 0.5); 

    // 2. Setup AI Deck (If Solo)
    if (gameMode === 'solo') {
        aiDeck = createAIDeck();
        aiDeck.sort(() => Math.random() - 0.5);
        isMyTurn = true; 
    } else {
        isMyTurn = (myRole === 'host');
    }

    // 3. Reset UI & Stats
    pHP = 60; aiHP = 60; pField = [null, null, null]; aiField = [null, null, null];
    pHand = []; aiHand = []; actions = 0; discarded = false;
    render();

    // 4. Animated Dealing
    addToLog("Dealing cards...", "sys");
    for(let i=0; i<3; i++) await drawCardAnimated(pDeck, pHand, true);
    
    if (gameMode === 'solo') {
        for(let i=0; i<3; i++) await drawCardAnimated(aiDeck, aiHand, false);
        addToLog("Match Start!", "sys");
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

    // Sync Hands
    syncHandDOM('hand', pHand, true);
    syncHandDOM('ai-hand', aiHand, false);

    // Sync Field
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
        // Highlight logic for playing cards
        if (selectedIdx !== null && owner === 'p' && !isProcessing && isMyTurn) {
            const cost = getCost();
            if (sacrifices.length === cost) slot.classList.add('highlight');
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
            else if (sacrifices.length < getCost()) sacrifices.push(col);
            render();
        };
    }
    slot.appendChild(div);
}

// ==========================================
// SECTION 6: COMBAT & TURN LOGIC
// ==========================================

async function endTurn() {
    isProcessing = true;
    
    if (gameMode === 'multi') {
        // 1. Enemy Counter-Attack
        addToLog("--- Enemy Ambush ---", "sys");
        aiField.forEach(c => { if(c) c.charging = false; });
        await resolveCombat(aiField, pField, true);
        
        // 2. Notify Network
        sendMultiplayerMove('endTurn', { resultingHp: pHP });
        isMyTurn = false;
        render();
    } else {
        // Solo AI sequence
        addToLog("--- AI Reacts ---", "sys");
        aiField.forEach(c => { if(c) c.charging = false; });
        await resolveCombat(aiField, pField, true);
        
        await runSoloAI();
        
        addToLog("--- Your Turn ---", "sys");
        pField.forEach(c => { if(c) c.charging = false; });
        await resolveCombat(pField, aiField, false);
        
        actions = 0; discarded = false;
        while(pHand.length < 3) await drawCardAnimated(pDeck, pHand, true);
        while(aiHand.length < 3) await drawCardAnimated(aiDeck, aiHand, false);
    }
    
    isProcessing = false;
    render();
    checkGameOver();
}

async function handleTurnHandover(enemyReportedHp) {
    addToLog("--- My Ambush ---", "sys");
    pField.forEach(c => { if(c) c.charging = false; });
    await resolveCombat(pField, aiField, false);
    
    // Sync HP
    if (enemyReportedHp !== undefined) aiHP = enemyReportedHp;

    isMyTurn = true;
    actions = 0; discarded = false;
    while(pHand.length < 3) await drawCardAnimated(pDeck, pHand, true);
    while(aiHand.length < 3) await drawCardAnimated(aiDeck, aiHand, false);
    
    render();
    checkGameOver();
}

async function resolveCombat(offField, defField, isAiAtk) {
    for (let i = 0; i < 3; i++) {
        let atk = offField[i];
        if (!atk || atk.charging) continue;

        let dmg = atk.val;
        let def = defField[i];

        if (def) {
            // Handle Skills & Defense
            if (def.type === 'skl') {
                def.revealed = true; render(); await sleep(500);
                if (def.effect === 'reflect') {
                    if (isAiAtk) aiHP -= dmg; else pHP -= dmg;
                    dmg = 0;
                }
                defField[i] = null; // Skill used up
            } else {
                dmg = Math.max(0, dmg - def.val);
            }
        }

        if (dmg > 0) {
            if (isAiAtk) pHP -= dmg; else aiHP -= dmg;
            flashSlot(isAiAtk ? `p-${i}` : `ai-${i}`, 'hit');
        }
        await sleep(300);
    }
}

// ==========================================
// SECTION 7: ANIMATIONS & UTILS
// ==========================================

function flyCard(startElem, endElem) {
    return new Promise(resolve => {
        const startRect = startElem.getBoundingClientRect();
        const endRect = endElem.getBoundingClientRect();
        const flyer = startElem.cloneNode(true);
        
        flyer.className = 'card flying-card';
        flyer.style.top = `${startRect.top}px`;
        flyer.style.left = `${startRect.left}px`;
        
        document.body.appendChild(flyer);
        startElem.style.visibility = 'hidden';

        setTimeout(() => {
            flyer.style.top = `${endRect.top}px`;
            flyer.style.left = `${endRect.left}px`;
        }, 10);

        setTimeout(() => {
            flyer.remove();
            startElem.style.visibility = 'visible';
            resolve();
        }, 400);
    });
}

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

function getCost() {
    if (selectedIdx === null) return 0;
    let c = pHand[selectedIdx];
    return c.cost || 0;
}

function addToLog(msg, type) {
    const log = document.getElementById('game-log');
    const li = document.createElement('li');
    li.innerText = msg;
    li.className = `log-${type}`;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function toggleMenu() { document.getElementById('menu-overlay').classList.toggle('hidden'); }

async function clickSlot(col) {
    if (isProcessing || selectedIdx === null || actions >= 2) return;
    const card = pHand[selectedIdx];
    
    if (sacrifices.length === getCost()) {
        isProcessing = true;
        
        // Multiplayer Broadcast
        if (gameMode === 'multi') {
            sendMultiplayerMove('play', { cardIndex: selectedIdx, slot: col, sacrifices });
        }

        const handDiv = document.getElementById('hand');
        await flyCard(handDiv.children[selectedIdx], document.getElementById(`p-${col}`));

        sacrifices.forEach(s => pField[s] = null);
        pField[col] = {...pHand.splice(selectedIdx, 1)[0], charging: (card.type === 'atk')};
        
        selectedIdx = null; sacrifices = []; actions++;
        isProcessing = false;
        render();
    }
}

// --- HELPER: Prevents the "Blink" by syncing DOM instead of nuking it ---
function syncHandDOM(containerId, cardList, isPlayer) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (container.children.length !== cardList.length) {
        container.innerHTML = '';
    }

    cardList.forEach((c, i) => {
        let div = container.children[i];
        if (!div) {
            div = document.createElement('div');
            container.appendChild(div);
        }

        let bgUrl = `url('${IMAGES}cardbacks/cardback.png')`;
        if (isPlayer || c.revealed) bgUrl = `url('${IMAGES}${c.img}')`;
        
        if (div.style.backgroundImage !== bgUrl) {
            div.style.backgroundImage = bgUrl;
            div.style.backgroundSize = "cover";
        }

        let cls = 'card';
        if (isPlayer && selectedIdx === i) cls += ' selected';
        if (c.animState === 'entering') cls += ' anim-entry';
        
        if (div.className !== cls) div.className = cls;
        div.dataset.index = i;

        if (isPlayer && !isProcessing && isMyTurn) {
            div.onclick = () => { selectedIdx = i; sacrifices = []; render(); };
        } else {
            div.onclick = null;
        }
    });
}

// --- HELPER: Visual Flash for Combat ---
function flashSlot(slotId, type) {
    const slot = document.getElementById(slotId);
    if (!slot) return;
    slot.classList.remove('anim-hit', 'anim-block', 'anim-super');
    void slot.offsetWidth; // Trigger reflow
    if (type === 'hit') slot.classList.add('anim-hit');
}
