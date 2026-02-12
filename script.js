const IMAGES = "images/";

// ==========================================
// SECTION 0: FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCP4X7cTUNbWLKMnDrS6JRXhZkWrCrg_b8",
  authDomain: "ctktcgo.firebaseapp.com",
  databaseURL: "https://ctktcgo-default-rtdb.firebaseio.com",
  projectId: "ctktcgo",
  storageBucket: "ctktcgo.firebasestorage.app",
  messagingSenderId: "942928938877",
  appId: "1:942928938877:web:02de52c5e1f4b919b1ee14",
  measurementId: "G-RJRW0Q80E6"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
const auth = firebase.auth();
console.log("Firebase Connected!", db);



// ==========================================
// SECTION 1: GAME CONFIGURATION
// ==========================================
const BASE_DECK = [
    { name: "Blazing Colt", type: "atk", val: 10, cost: 1, img: "horse/blazing_colt.png", count: 3 },
    { name: "Blazing Pegasus", type: "atk", val: 15, cost: 2, img: "horse/blazing_pegasus.png", count: 2 },
    { name: "Angelic Stallion", type: "atk", val: 20, cost: 3, img: "horse/angelic_stallion.png", count: 1 },
    { name: "Dark Knight", type: "def", val: 10, cost: 0, img: "knights/dark_knight.png", count: 3 },
    { name: "Damned Knight", type: "def", val: 15, cost: 1, img: "knights/damned_knight.png", count: 2 },
    { name: "Devil King", type: "def", val: 20, cost: 2, img: "knights/devil_king.png", count: 1 }
];

const SKILL_POOL = [
    { id: "miss", name: "Secret Agent 12", costPoints: 1, limit: 3, img: "agents/secret_agent_12.png", effect: "miss", desc: "Causes an attack to Miss completely (0 Dmg)." },
    { id: "reflect", name: "Queen's Mirror", costPoints: 1, limit: 3, img: "knights/queens_mirror.png", effect: "reflect", desc: "Reflects damage back to the attacker." },
    { id: "breakd", name: "Castle Breaker", costPoints: 2, limit: 3, img: "og/castle_breaker.png", effect: "breakd", desc: "Destroys a Defense card instantly." },
    { id: "disarm", name: "Stealthy Shinobi", costPoints: 3, limit: 3, img: "ninja/stealthy_shinobi.png", effect: "disarm", desc: "Disarms an Attack (0 Dmg) and removes it." },
    { id: "supref", name: "Reflection Torture", costPoints: 3, limit: 2, img: "og/reflection_torture.png", effect: "supref", desc: "Reflects DOUBLE the damage back." }
];

// ==========================================
// SECTION 1.5: ASSET PRELOADER (Fail-Safe)
// ==========================================

// 1. Setup the Asset List
const PRELOAD_LIST = [
    "cardbacks/cardback.png",
    "animations/cardani/stallion.gif"
];

// 2. Safely add Game Images (Only if decks exist)
if (typeof BASE_DECK !== 'undefined') {
    BASE_DECK.forEach(c => { if(c.img) PRELOAD_LIST.push(c.img); });
}
if (typeof SKILL_POOL !== 'undefined') {
    SKILL_POOL.forEach(s => { if(s.img) PRELOAD_LIST.push(s.img); });
}

// 3. The Loading Logic
function startPreloader() {
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');
    const screen = document.getElementById('loading-screen');
    
    // SAFETY: If HTML elements are missing, just play the game.
    if (!bar || !screen) return;

    let loaded = 0;
    let total = PRELOAD_LIST.length;

    // FORCE START: If stuck for 3 seconds, kill the screen.
    setTimeout(() => {
        if (screen.style.opacity !== '0') {
            console.log("Loader stuck. Force starting.");
            finishLoading();
        }
    }, 3000);

    function checkProgress() {
        loaded++;
        let percent = Math.floor((loaded / total) * 100);
        bar.style.width = percent + "%";
        if (txt) txt.innerText = `Loading... ${percent}%`;
        
        if (loaded >= total) {
            setTimeout(finishLoading, 500);
        }
    }

    if (total === 0) finishLoading();

    PRELOAD_LIST.forEach(file => {
        const img = new Image();
        img.onload = checkProgress;
        img.onerror = checkProgress; // Count errors as progress so we don't hang
        img.src = "images/" + file;  // Ensure path is correct
    });
}

function finishLoading() {
    const screen = document.getElementById('loading-screen');
    if (screen) {
        screen.style.opacity = '0';
        setTimeout(() => {
            screen.classList.add('hidden'); // Remove from flow
        }, 1000);
    }
}

// 4. Trigger the loader when the page is ready
window.addEventListener('load', startPreloader);


// ==========================================
// SECTION 2: GLOBAL STATE
// ==========================================
let gameMode = 'solo'; 
let myRole = null;     
let playerRole = null; 
let currentRoomId = null;
let roomRef = null;
let isMyTurn = true; // NEW: Controls who can click

let playerSkills = {}; 
let currentPoints = 0;
const MAX_POINTS = 15;

let pDeck = [], aiDeck = [];
let pHP = 60, aiHP = 60, turnCount = 1;
let pHand = [], aiHand = [], pField = [null, null, null], aiField = [null, null, null];
let actions = 0, discarded = false, selectedIdx = null, sacrifices = [];
let isProcessing = false;
let isTutorial = false;

let stats = {
    atkDmgGiven: 0, atkDmgTaken: 0,
    skillDmgGiven: 0, skillDmgTaken: 0,
    defDmgGiven: 0, defDmgTaken: 0,
    skillsUsed: 0, sacrifices: 0,
    startTime: 0, endTime: 0
};

loadDefaultSkills(); 

function loadDefaultSkills() {
    playerSkills = { miss: 2, reflect: 2, breakd: 2, disarm: 1, supref: 0 };
    calcPoints();
}

// ==========================================
// SECTION 3: MENU & UI
// ==========================================
function startGame() {
    isTutorial = false;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('top-bar').classList.remove('hidden');
    document.getElementById('btn-menu').style.display = 'block'; 
    init();
}

function openRules() { document.getElementById('rules-menu').classList.remove('hidden'); }
function closeRulesMenu() { document.getElementById('rules-menu').classList.add('hidden'); }

function quitToTitle() {
    location.reload(); // Simple reset for now
}

function openSkills() {
    document.getElementById('skills-overlay').classList.remove('hidden');
    renderShop();
    updateBuilderUI();
}
function closeSkills() { document.getElementById('skills-overlay').classList.add('hidden'); }

function calcPoints() {
    currentPoints = 0;
    SKILL_POOL.forEach(skill => {
        let qty = playerSkills[skill.id] || 0;
        currentPoints += (qty * skill.costPoints);
    });
    return currentPoints;
}

function modifySkill(skillId, change) {
    let skill = SKILL_POOL.find(s => s.id === skillId);
    let currentQty = playerSkills[skillId] || 0;
    let newQty = currentQty + change;
    
    if (newQty < 0) return;
    if (newQty > skill.limit) { alert(`Max limit for ${skill.name} is ${skill.limit}`); return; }
    if (change > 0 && (currentPoints + skill.costPoints) > MAX_POINTS) { alert(`Not enough points! Max 15.`); return; }

    playerSkills[skillId] = newQty;
    calcPoints();
    updateBuilderUI();
}

function previewCard(skillId) {
    let skill = SKILL_POOL.find(s => s.id === skillId);
    document.getElementById('preview-name').innerText = skill.name;
    document.getElementById('preview-desc').innerText = skill.desc;
    document.getElementById('preview-cost').innerText = `Cost: ${skill.costPoints} Pts | Limit: ${skill.limit}`;
}

function renderShop() {
    const grid = document.getElementById('shop-grid');
    grid.innerHTML = '';
    SKILL_POOL.forEach(skill => {
        const wrapper = document.createElement('div');
        wrapper.className = 'shop-card-wrapper';
        
        const cardDiv = document.createElement('div');
        cardDiv.className = 'shop-card';
        cardDiv.style.backgroundImage = `url('${IMAGES}${skill.img}')`;
        cardDiv.onclick = () => previewCard(skill.id);
        
        const controls = document.createElement('div');
        controls.className = 'shop-controls';
        
        const btnMinus = document.createElement('button'); btnMinus.className = 'btn-qty'; btnMinus.innerText = '-';
        btnMinus.onclick = () => modifySkill(skill.id, -1);
        
        const qtyDisplay = document.createElement('span'); qtyDisplay.className = 'qty-val'; qtyDisplay.id = `qty-${skill.id}`;
        qtyDisplay.innerText = playerSkills[skill.id] || 0;
        
        const btnPlus = document.createElement('button'); btnPlus.className = 'btn-qty'; btnPlus.innerText = '+';
        btnPlus.onclick = () => modifySkill(skill.id, 1);
        
        controls.append(btnMinus, qtyDisplay, btnPlus);
        wrapper.append(cardDiv, controls);
        grid.appendChild(wrapper);
    });
}

function updateBuilderUI() {
    document.getElementById('points-val').innerText = currentPoints;
    SKILL_POOL.forEach(skill => {
        let el = document.getElementById(`qty-${skill.id}`);
        if(el) el.innerText = playerSkills[skill.id] || 0;
    });

    const list = document.getElementById('deck-list');
    list.innerHTML = '';
    let totalCards = 0;
    SKILL_POOL.forEach(skill => {
        let qty = playerSkills[skill.id] || 0;
        if(qty > 0) {
            totalCards += qty;
            let li = document.createElement('li');
            li.innerHTML = `<span>${skill.name}</span> <span>x${qty}</span>`;
            list.appendChild(li);
        }
    });
    document.getElementById('deck-count').innerText = totalCards;
}

// ==========================================
// SECTION 4: INIT
// ==========================================
async function init() {
    pDeck = [];
    BASE_DECK.forEach(card => { for(let i=0; i<card.count; i++) pDeck.push({...card}); });
    SKILL_POOL.forEach(skill => {
        let qty = playerSkills[skill.id] || 0;
        for(let i=0; i<qty; i++) {
            pDeck.push({ name: skill.name, type: "skl", val: 0, cost: 0, img: skill.img, effect: skill.effect, count: 1 });
        }
    });
    pDeck.sort(() => Math.random() - 0.5); 

    if (gameMode === 'solo') {
        aiDeck = createAIDeck();
        aiDeck.sort(() => Math.random() - 0.5);
        isMyTurn = true; 
    } else {
        aiDeck = []; 
        // In multiplayer, Host goes first
        isMyTurn = (myRole === 'host');
    }

    pHP = 60; aiHP = 60; turnCount = 1;
    pField = [null, null, null]; aiField = [null, null, null];
    pHand = []; aiHand = [];
    actions = 0; discarded = false; selectedIdx = null; sacrifices = [];
    
    stats = { 
        atkDmgGiven: 0, atkDmgTaken: 0, skillDmgGiven: 0, skillDmgTaken: 0,
        defDmgGiven: 0, defDmgTaken: 0, skillsUsed: 0, sacrifices: 0, 
        startTime: Date.now(), endTime: 0 
    };

    for(let i=0; i<3; i++) {
        let card = pDeck.shift();
        if(card) pHand.push(card);
    }

    if (gameMode === 'solo') {
        for(let i=0; i<3; i++) {
            let card = aiDeck.shift();
            aiHand.push(card);
        }
        render();
        addToLog("Duel started!", "sys");
    } else {
        await performMultiplayerHandshake();
    }
}

function createAIDeck() {
    let deck = [];
    BASE_DECK.forEach(card => { for(let i=0; i<card.count; i++) deck.push({...card}); });
    const AI_SKILLS = [ { id: "miss", count: 2 }, { id: "reflect", count: 2 }, { id: "breakd", count: 2 }, { id: "disarm", count: 1 } ];
    AI_SKILLS.forEach(sItem => {
        let skillData = SKILL_POOL.find(s => s.id === sItem.id);
        for(let i=0; i<sItem.count; i++) {
            deck.push({ name: skillData.name, type: "skl", val: 0, cost: 0, img: skillData.img, effect: skillData.effect });
        }
    });
    return deck;
}

function drawCard(targetDeck) {
    if(targetDeck.length === 0) return null;
    return targetDeck.splice(0, 1)[0];
}

async function drawCardAnimated(deck, hand, isPlayer) {
    let card = drawCard(deck);
    if (!card) return;
    
    card.animState = 'entering'; 
    hand.push(card);
    render(); 
    await sleep(400); 

    if (isPlayer) {
        card.animState = 'flipping';
        render(); 
        await sleep(400); 
    }

    card.animState = null;
    render();
}

// ==========================================
// SECTION 5: RENDER LOOP (SMART UPDATES)
// ==========================================

function render() {
    document.getElementById('p-hp').innerText = pHP;
    document.getElementById('ai-hp').innerText = aiHP;
    
    const disabledState = (isProcessing || !isMyTurn);
    document.getElementById('btn-discard').disabled = (discarded || selectedIdx === null || disabledState);
    document.getElementById('btn-end').disabled = disabledState;

    // Status Text
    const preview = document.getElementById('selection-preview');
    if (gameMode === 'multi') {
        if (!isMyTurn) preview.innerText = "OPPONENT'S TURN";
        else if (selectedIdx === null) preview.innerText = "YOUR TURN";
    }
    if (selectedIdx !== null) preview.innerText = pHand[selectedIdx].name.toUpperCase();

    // 1. Smart Render Hands (No flickering!)
    syncHandDOM('ai-hand', aiHand, false);
    syncHandDOM('hand', pHand, true);

    // 2. Smart Render Field
    for(let i=0; i<3; i++) {
        renderField('p-'+i, pField[i], i, 'p');
        renderField('ai-'+i, aiField[i], i, 'ai');
    }
}

// --- HELPER: Efficiently updates hands without clearing HTML ---
function syncHandDOM(containerId, cardList, isPlayer) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // 1. Clear the hand only if the count changed (prevents the big blink)
    if (container.children.length !== cardList.length) {
        container.innerHTML = '';
    }

    cardList.forEach((c, i) => {
        let div = container.children[i];

        // 2. If the card div doesn't exist, create it
        if (!div) {
            div = document.createElement('div');
            container.appendChild(div);
        }

        // 3. Set the background image
        let bgUrl = `url('${IMAGES}cardbacks/cardback.png')`;
        if (isPlayer || c.revealed) {
            bgUrl = `url('${IMAGES}${c.img}')`;
        }
        
        // Update ONLY if it's different to prevent the "blink"
        if (div.style.backgroundImage !== bgUrl) {
            div.style.backgroundImage = bgUrl;
            div.style.backgroundSize = "cover";
        }

        // 4. Update Classes (Selection, Animation, etc)
        let cls = 'card';
        if (isPlayer && selectedIdx === i) cls += ' selected';
        if (c.animState === 'entering') cls += ' anim-entry';
        if (c.animState === 'flipping') cls += ' anim-flip-in';
        
        if (div.className !== cls) div.className = cls;

        // 5. Update Clicks
        div.dataset.index = i; // Critical: keeps the index synced
        if (isPlayer && !isProcessing && isMyTurn) {
            div.onclick = () => { 
                selectedIdx = i; 
                sacrifices = []; 
                render(); 
            };
        } else {
            div.onclick = null;
        }
    });
}

// --- HELPER: Efficiently updates Field Slots ---
function renderField(id, card, col, owner) {
    const slot = document.getElementById(id);
    if (!slot) return;
    
    // 1. CLEAR THE SLOT COMPLETELY (Fixes ghosting/disappearing)
    slot.innerHTML = '';
    slot.classList.remove('highlight'); 
    
    // 2. IF EMPTY, HANDLE HIGHLIGHTS ONLY
    if (!card) {
        if (selectedIdx !== null && owner === 'p' && !isProcessing && isMyTurn) {
             const cost = getCost();
             const cardToPlay = pHand[selectedIdx];
             const isSacReady = (sacrifices.includes(col)); 
             const laneFree = !(cardToPlay.type === 'atk' && aiField[col] && aiField[col].type === 'atk');

             if (sacrifices.length === cost && laneFree) {
                 slot.classList.add('highlight'); // Visual hint: "Play Here"
             }
        }
        return;
    }

    // 3. IF CARD EXISTS, CREATE IT FRESH
    const div = document.createElement('div');
    
    // Fix Invisible Border: Ensure background covers everything
    div.style.backgroundSize = "cover"; 
    div.style.backgroundRepeat = "no-repeat";
    
    // Determine Image
    if (owner === 'ai' && card.type === 'skl' && !card.revealed) {
        div.style.backgroundImage = `url('${IMAGES}cardbacks/cardback.png')`;
    } else {
        div.style.backgroundImage = `url('${IMAGES}${card.img}')`;
    }

    // Apply Classes
    let cls = 'card';
    if (card.charging) cls += ' charging';
    
    const isSacTarget = sacrifices.includes(col);
    if (isSacTarget) cls += ' sac-target';
    
    if (owner === 'p' && card.type === 'skl') cls += ' skill-dark';
    
    div.className = cls;

    // Add Click Listeners
    if (owner === 'p' && !isProcessing && isMyTurn) {
        div.onclick = (e) => { 
            e.stopPropagation(); 
            // Remove Skill
            if (card.type === 'skl' && !isSacTarget && selectedIdx === null) {
                payLifeToRemove(col); return;
            }
            // Sacrifice Logic
            if (isSacTarget && sacrifices.length === getCost()) clickSlot(col);
            else toggleSac(col); 
        };
    }

    slot.appendChild(div);
}



// ==========================================
// SECTION 6: INTERACTIONS
// ==========================================
function payLifeToRemove(col) {
    if (pHP <= 5) { alert("Not enough HP!"); return; }
    if (confirm("Pay 5 HP to remove this Skill card?")) {
        let c = pField[col];
        pField[col] = null;
        pHP -= 5;
        addToLog(`Player paid 5 HP to remove ${c.name}`, "p");
        
        // Broadcast Removal
        if (gameMode === 'multi') sendMultiplayerMove('removeSkill', { slot: col });
        
        render();
    }
}

function getCost() {
    if (selectedIdx === null) return 0;
    let c = pHand[selectedIdx];
    if (c.type === 'skl') return 0;
    if (c.type === 'def') return c.cost;
    let onBoard = pField.filter(x => x !== null).length;
    if (c.type === 'atk' && onBoard === 0 && c.val === 10) return 0; 
    return c.cost;
}

function toggleSac(col) {
    if (isProcessing || selectedIdx === null || pField[col] === null) return;
    if (pField[col].type === 'skl') { addToLog("Cannot sacrifice Skills.", "sys"); return; }
    
    const targetCost = getCost();
    if (sacrifices.includes(col)) sacrifices = sacrifices.filter(s => s !== col);
    else if (sacrifices.length < targetCost) sacrifices.push(col);
    render(); 
}

async function clickSlot(col) {
    if (isTutorial) { tutorialClickSlot(col); return; } 
    if (isProcessing || selectedIdx === null || actions >= 2) return;
    
    const cardToPlay = pHand[selectedIdx];
    const costNeeded = getCost();
    const isSlotValid = (pField[col] === null || sacrifices.includes(col));

    if (sacrifices.length === costNeeded && isSlotValid) {
        if (cardToPlay.type === 'atk' && aiField[col] && aiField[col].type === 'atk') {
            alert("Cannot play an Attack facing another Attack!");
            return;
        }

        isProcessing = true; 
        
        // *** MULTIPLAYER BROADCAST ***
        if (gameMode === 'multi') {
            sendMultiplayerMove('play', { 
                cardIndex: selectedIdx, 
                slot: col,
                sacrifices: sacrifices
            });
        }

        const handDiv = document.getElementById('hand');
        const cardElem = Array.from(handDiv.children).find(el => el.dataset.index == selectedIdx);
        const slotElem = document.getElementById(`p-${col}`);

        if (cardElem && slotElem) await flyCard(cardElem, slotElem);

        if (sacrifices.length > 0) stats.sacrifices += sacrifices.length;
        if (cardToPlay.type === 'skl') stats.skillsUsed++;

        sacrifices.forEach(s => pField[s] = null);
        let card = pHand.splice(selectedIdx, 1)[0];
        card.charging = (card.type === 'atk'); 
        pField[col] = card;
        
        addToLog(`Player summoned ${card.name}`, "p");
        selectedIdx = null; sacrifices = []; actions++;
        isProcessing = false;
        render(); 
    }
}

function discardCard() {
    if (isTutorial) { tutorialDiscard(); return; } 

    if (selectedIdx !== null && !discarded && !isProcessing) {
        // *** MULTIPLAYER BROADCAST ***
        if (gameMode === 'multi') {
            sendMultiplayerMove('discard', { cardIndex: selectedIdx });
        }

        let c = pHand.splice(selectedIdx, 1)[0];
        addToLog(`Player discarded ${c.name}`, "p");
        selectedIdx = null; discarded = true; render();
    }
}

// ==========================================
// SECTION 7: ANIMATIONS
// ==========================================
function flyCard(startElem, endElem) {
    return new Promise(resolve => {
        const startRect = startElem.getBoundingClientRect();
        const endRect = endElem.getBoundingClientRect();

        const flyer = startElem.cloneNode(true);
        flyer.className = 'card flying-card';
        flyer.style.top = `${startRect.top}px`;
        flyer.style.left = `${startRect.left}px`;
        flyer.style.width = `${startRect.width}px`;
        flyer.style.height = `${startRect.height}px`;
        flyer.classList.remove('selected');
        
        startElem.style.visibility = "hidden"; 
        document.body.appendChild(flyer);

        setTimeout(() => {
            flyer.style.top = `${endRect.top}px`;
            flyer.style.left = `${endRect.left}px`;
            flyer.style.width = `${endRect.width}px`;
            flyer.style.height = `${endRect.height}px`;
        }, 10);

        setTimeout(() => {
            flyer.remove();
            resolve();
        }, 400); 
    });
}

function playGifAnimation(filename) {
    return new Promise(resolve => {
        const overlay = document.getElementById('video-overlay');
        const img = document.getElementById('game-gif');
        if (!overlay || !img) { resolve(); return; }

        const timestamp = new Date().getTime();
        img.src = `${IMAGES}animations/cardani/${filename}?t=${timestamp}`;
        img.onerror = () => { overlay.classList.add('hidden'); resolve(); };
        
        overlay.classList.remove('hidden');
        overlay.classList.remove('vid-exit');
        overlay.classList.add('vid-enter');
        
        setTimeout(() => {
            overlay.classList.remove('vid-enter');
            overlay.classList.add('vid-exit');
            setTimeout(() => {
                overlay.classList.add('hidden');
                overlay.classList.remove('vid-exit');
                img.src = ""; 
                resolve(); 
            }, 500); 
        }, 6000); 
    });
}

function flashSlot(slotId, type) {
    const slot = document.getElementById(slotId);
    if (!slot) return;
    slot.classList.remove('anim-hit', 'anim-block', 'anim-super');
    void slot.offsetWidth; 
    if (type === 'hit') slot.classList.add('anim-hit'); 
    else if (type === 'block') slot.classList.add('anim-block'); 
    else if (type === 'super') slot.classList.add('anim-super'); 
}

function animateDeath(slotId, cardName) {
    return new Promise(resolve => {
        const slot = document.getElementById(slotId);
        if(!slot || !slot.firstChild) { resolve(); return; }
        const cardDiv = slot.firstChild;
        let animClass = 'destroy-std';
        if (cardName.includes('Blazing') || cardName.includes('Devil')) animClass = 'destroy-fire';
        else if (cardName.includes('Angelic')) animClass = 'destroy-holy';
        cardDiv.classList.add(animClass);
        setTimeout(() => { resolve(); }, 800); 
    });
}

// ==========================================
// SECTION 8: LOGIC ROUTER
// ==========================================

async function aiAction() {
    // FORK: If Solo, run AI. If Multi, do nothing (wait for listener).
    if (gameMode === 'solo') {
        await runSoloAI();
    } else {
        addToLog("Waiting for opponent...", "sys");
    }
}

// --- STANDARD AI (SOLO MODE) ---
async function runSoloAI() {
    if (aiHP > 15) {
        for(let i=0; i<3; i++) {
            let c = aiField[i];
            if (!c || c.type !== 'skl') continue;
            let opp = pField[i];
            let isDead = false;
            if (['reflect','supref','miss','disarm'].includes(c.effect)) {
                if (!opp || opp.type !== 'atk') isDead = true;
            } else if (c.effect === 'breakd') {
                if (!opp || opp.type !== 'def') isDead = true;
            }
            if (isDead) {
                aiHP -= 5;
                await animateDeath(`ai-${i}`, c.name);
                aiField[i] = null;
                addToLog(`AI paid 5 HP to clean ${c.name}`, "ai");
            }
        }
    }
    
    let possibleMoves = [];
    aiHand.forEach((card, hIdx) => {
        let cost = card.cost; 
        if (card.type === 'atk') {
            let fieldCount = aiField.filter(c => c !== null).length;
            if (fieldCount === 0 && card.val === 10) cost = 0;
        }

        let validSacrifices = aiField.map((c, i) => c !== null && c.type !== 'skl' ? i : -1).filter(i => i !== -1);
        
        if (validSacrifices.length >= cost) {
            validSacrifices.sort((a, b) => getCardValue(aiField[a]) - getCardValue(aiField[b]));
            let sacIndices = validSacrifices.slice(0, cost);

            for(let slot=0; slot<3; slot++) {
                if (aiField[slot] === null || sacIndices.includes(slot)) {
                    if (card.type === 'atk') {
                        let opp = pField[slot];
                        if (opp && opp.type === 'atk') continue; 
                    }
                    let move = { card: card, handIdx: hIdx, slot: slot, sacrifices: sacIndices, score: 0 };
                    move.score = evaluateMove(move);
                    possibleMoves.push(move);
                }
            }
        }
    });
    
    possibleMoves.sort((a, b) => b.score - a.score);
    
    if (possibleMoves.length > 0 && possibleMoves[0].score > 50) {
        let best = possibleMoves[0];
        const handDiv = document.getElementById('ai-hand');
        const cardElem = Array.from(handDiv.children).find(el => el.dataset.aiIndex == best.handIdx);
        const slotElem = document.getElementById(`ai-${best.slot}`);
        if (cardElem && slotElem) await flyCard(cardElem, slotElem);

        best.sacrifices.forEach(idx => aiField[idx] = null);
        let newCard = {...best.card, charging: (best.card.type === 'atk')};
        if(newCard.type === 'skl') newCard.revealed = false; 
        aiField[best.slot] = newCard;
        aiHand.splice(best.handIdx, 1);
        return;
    } 
    
    if (aiHand.length > 0) {
        aiHand.sort((a, b) => getDiscardPriority(b) - getDiscardPriority(a));
        let discarded = aiHand.shift(); 
        addToLog(`AI discarded ${discarded.name}`, "ai");
        let newCard = drawCard(aiDeck);
        if (newCard) aiHand.push(newCard);
    } else {
        addToLog("AI passes turn (Hand Empty)", "ai");
    }
}

// --- HELPER SCORING FUNCTIONS ---
function evaluateMove(move) {
    let score = 0;
    let oppCard = pField[move.slot];
    let card = move.card;

    if (['reflect', 'supref', 'disarm', 'miss'].includes(card.effect)) {
        if (oppCard && oppCard.type === 'atk' && !oppCard.charging) {
            score += 1000; 
            if (card.effect === 'supref') score += 200; 
        } else { score -= 1000; }
    }
    else if (card.effect === 'breakd') {
        if (oppCard && oppCard.type === 'def') score += 500; else score -= 1000; 
    }
    else if (card.type === 'def') {
        score += 200; 
        if (oppCard && oppCard.type === 'atk') {
            score += 300; 
            if (card.val > oppCard.val) { 
                let thornDmg = card.val - oppCard.val; 
                score += (thornDmg * 20); 
            }
        }
    }
    else if (card.type === 'atk') {
        score += 500; 
        if (oppCard && oppCard.type === 'atk') return -9999;
        if (!oppCard) { 
            score += 400; 
        } else if (oppCard.type === 'def') {
             if (card.val > oppCard.val) score += 100; else score -= 200; 
        }
    }
    let sacValue = 0;
    move.sacrifices.forEach(idx => { sacValue += getCardValue(aiField[idx]); });
    if (score < 800) { score -= sacValue; }
    return score;
}

function getDiscardPriority(card) {
    if (card.effect === 'miss') return 80;
    if (card.effect === 'breakd') return 70;
    if (card.effect === 'reflect') return 60;
    return 0;
}
function getCardValue(card) {
    if (!card) return 0;
    if (card.type === 'atk') return card.val;
    if (card.type === 'def') return card.val;
    return 0; 
}

// ==========================================
// SECTION 9: UTILS & GAME OVER
// ==========================================
async function resolveCombat(offField, defField, isAiAtk) {
    let attackerName = isAiAtk ? "AI" : "Player";
    let defenderName = isAiAtk ? "Player" : "AI";
    let atkPrefix = isAiAtk ? 'ai' : 'p';
    let defPrefix = isAiAtk ? 'p' : 'ai';

    for (let i = 0; i < 3; i++) {
        let atk = offField[i];
        if (!atk || atk.charging) continue;

        const atkSlotId = `${atkPrefix}-${i}`;
        const defSlotId = `${defPrefix}-${i}`;

        if (atk.type === 'skl' && atk.effect === 'breakd') {
            let def = defField[i];
            if (def && def.type === 'def') {
                atk.revealed = true; render(); await sleep(400);
                addToLog(`${attackerName} used Castle Breaker!`, isAiAtk ? "ai" : "p");
                flashSlot(defSlotId, 'hit');
                await animateDeath(defSlotId, def.name);
                defField[i] = null; offField[i] = null; 
            }
        }
        else if (atk.type === 'atk') {
            let dmg = atk.val;
            let def = defField[i];
            
            if (def) {
                if (def.type === 'skl') {
                    def.revealed = true; render(); await sleep(600);
                    addToLog(`${defenderName}'s ${def.name} triggered!`, isAiAtk ? "p" : "ai");
                    
                    if (def.effect === 'disarm') { offField[i] = null; dmg = 0; flashSlot(atkSlotId, 'block'); } 
                    else if (def.effect === 'reflect') {
                        if (isAiAtk) { stats.skillDmgGiven += dmg; aiHP -= dmg; } 
                        else { stats.skillDmgTaken += dmg; pHP -= dmg; }
                        dmg = 0; flashSlot(atkSlotId, 'hit'); 
                    } 
                    else if (def.effect === 'supref') {
                        let refDmg = dmg * 2; 
                        if (isAiAtk) { stats.skillDmgGiven += refDmg; aiHP -= refDmg; } 
                        else { stats.skillDmgTaken += refDmg; pHP -= refDmg; }
                        dmg = 0; flashSlot(atkSlotId, 'super'); 
                    } 
                    else if (def.effect === 'miss') { dmg = 0; }
                    await animateDeath(defSlotId, def.name);
                    defField[i] = null; 
                } 
                else if (def.type === 'def') {
                    if (def.val > dmg) {
                        let thorns = def.val - dmg; 
                        if (isAiAtk) { stats.defDmgGiven += thorns; aiHP -= thorns; } 
                        else { stats.defDmgTaken += thorns; pHP -= thorns; }
                        flashSlot(defSlotId, 'block'); flashSlot(atkSlotId, 'hit');   
                    } else { flashSlot(defSlotId, dmg===def.val ? 'block' : 'hit'); }
                    dmg = Math.max(0, dmg - def.val);
                }
            } else {
                if (atk.name === "Angelic Stallion") await playGifAnimation("stallion.gif");
                flashSlot(defSlotId, 'hit');
            }

            if (dmg > 0) {
                if (isAiAtk) { stats.atkDmgTaken += dmg; pHP -= dmg; } 
                else { stats.atkDmgGiven += dmg; aiHP -= dmg; }
                addToLog(`${attackerName} dealt ${dmg} dmg with ${atk.name}`, "dmg");
            }
            await sleep(300); 
        }
    }
}

function checkGameOver(reason = "") {
    if (aiHP <= 0 || pHP <= 0 || reason) {
        stats.endTime = Date.now();
        let isWin = (aiHP <= 0 && pHP > 0);
        showGameOverScreen(isWin, reason);
        return true;
    }
    return false;
}

function showGameOverScreen(isWin, reason) {
    const screen = document.getElementById('game-over-screen');
    const title = document.getElementById('go-title');
    
    // Simple Score Calc
    let score = isWin ? 1000 : 0;
    if (isWin) {
        title.innerText = "VICTORY";
        title.style.color = "var(--accent)";
    } else {
        title.innerText = "DEFEAT";
        title.style.color = "#e74c3c";
    }
    document.getElementById('final-score').innerText = score;
    screen.classList.remove('hidden');
}

function quitToTitleFromStats() { location.reload(); }

function concedeGame() {
    if (confirm("Are you sure you want to surrender?")) {
        stats.endTime = Date.now();
        showGameOverScreen(false, "Surrender");
    }
}

async function endTurn() {
    if (isTutorial) { tutorialEndTurn(); return; } 

    // ============================
    // MULTIPLAYER LOGIC
    // ============================
    if (gameMode === 'multi') {
        isProcessing = true; // Lock UI

        // 1. THE ENEMY STRIKES BACK!
        // It is the end of my turn, so the Opponent's cards (aiField) wake up and attack Me.
        
        addToLog("--- Opponent Counter-Attack ---", "sys");
        
        // Force wake up enemy cards (remove charging status so they can attack)
        aiField.forEach(c => { if(c) c.charging = false; });
        
        // Resolve Combat: AI (Opponent) attacks Player (Me)
        await resolveCombat(aiField, pField, true); 
        
        // 2. Send the result to the network
        // We send our new HP so the opponent can sync up
        sendMultiplayerMove('endTurn', { resultingHp: pHP });
        
        isMyTurn = false; 
        render();
        checkGameOver(); // Did I die from the counter-attack?
        isProcessing = false;
        return;
    }

    // ============================
    // SOLO LOGIC (Standard AI)
    // ============================
    isProcessing = true;
    render(); 
    
    addToLog("--- Enemy Reaction ---", "sys");
    await resolveCombat(aiField, pField, true); 
    render();
    if(checkGameOver()) { isProcessing = false; return; }
    await sleep(400);
    
    addToLog("--- AI Action ---", "sys");
    await aiAction(); 
    render();
    await sleep(400);
    
    addToLog("--- Player Start ---", "sys");
    pField.forEach(c => { if(c) c.charging = false; });
    aiField.forEach(c => { if(c) c.charging = false; });
    
    await resolveCombat(pField, aiField, false); 
    render();
    if(checkGameOver()) { isProcessing = false; return; }
    
    actions = 0; discarded = false; turnCount++;
    
    while(aiHand.length < 3) {
        if (aiDeck.length === 0) { checkGameOver("VICTORY! AI Decked Out."); isProcessing = false; return; }
        await drawCardAnimated(aiDeck, aiHand, false);
    }
    
    while(pHand.length < 3) {
        if (pDeck.length === 0) { checkGameOver("DEFEAT! Decked Out."); isProcessing = false; return; }
        await drawCardAnimated(pDeck, pHand, true);
    }
    
    isProcessing = false;
    render();
    checkGameOver();
}


function addToLog(msg, type = "sys") {
    const ul = document.getElementById('game-log');
    if(!ul) return;
    const li = document.createElement('li');
    li.innerText = msg;
    li.className = `log-${type}`;
    ul.appendChild(li);
    // Auto-scroll
    const container = document.getElementById('log-content');
    if(container) container.scrollTop = container.scrollHeight;
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function toggleMenu() { document.getElementById('menu-overlay').classList.toggle('hidden'); }
function toggleBattleLog() {
    const content = document.getElementById('log-content');
    if (content.classList.contains('collapsed')) content.classList.remove('collapsed'); 
    else content.classList.add('collapsed'); 
}

function openDeckView() {
    const overlay = document.getElementById('deck-view-overlay');
    const grid = document.getElementById('deck-grid');
    grid.innerHTML = '';
    let fullDeckList = [];
    BASE_DECK.forEach(card => { for(let i=0; i<card.count; i++) fullDeckList.push({...card}); });
    SKILL_POOL.forEach(skill => {
        let qty = playerSkills[skill.id] || 0;
        for(let i=0; i<qty; i++) fullDeckList.push({name: skill.name, img: skill.img});
    });
    fullDeckList.forEach(cardData => {
        const div = document.createElement('div');
        div.className = 'deck-card';
        div.style.backgroundImage = `url('${IMAGES}${cardData.img}')`;
        grid.appendChild(div);
    });
    overlay.classList.remove('hidden');
}
function closeDeckView() { document.getElementById('deck-view-overlay').classList.add('hidden'); }
function openDevMenu() { document.getElementById('dev-overlay').classList.remove('hidden'); }
function closeDevMenu() { document.getElementById('dev-overlay').classList.add('hidden'); }
function testDevFlash(type) {
    const slot = document.getElementById('dev-slot');
    slot.classList.remove('anim-hit', 'anim-block', 'anim-super');
    void slot.offsetWidth; 
    if(type==='hit') slot.classList.add('anim-hit');
    if(type==='block') slot.classList.add('anim-block');
    if(type==='super') slot.classList.add('anim-super');
}
function testDevDeath(animClass) {
    const card = document.getElementById('dev-card');
    card.className = 'card'; card.style.opacity = '1'; card.style.transform = 'scale(1)'; card.style.filter = 'none';
    void card.offsetWidth; 
    card.classList.add(animClass);
    setTimeout(() => { card.className = 'card'; card.style.opacity = '1'; card.style.transform = 'scale(1)'; card.style.filter = 'none'; }, 1200);
}

// ==========================================
// SECTION 10: MULTIPLAYER NETWORKING
// ==========================================

async function performMultiplayerHandshake() {
    roomRef = db.ref('rooms/' + currentRoomId);
    addToLog("Waiting for opponent...", "sys");

    const myData = { hand: pHand, deck: pDeck, hp: pHP };
    await roomRef.child(myRole).update(myData);

    const oppRole = (myRole === 'host') ? 'guest' : 'host';
    
    roomRef.child(oppRole).on('value', (snapshot) => {
        const oppData = snapshot.val();
        if (oppData && oppData.hand) {
            aiHand = oppData.hand || [];
            aiDeck = oppData.deck || [];
            aiHP = oppData.hp || 60;
            
            addToLog("Opponent Connected!", "sys");
            render();
            roomRef.child(oppRole).off(); // Stop Handshake listener
            startMultiplayerListener();   // START GAMEPLAY LISTENER
        }
    });
}

function startMultiplayerListener() {
    const oppRole = (myRole === 'host') ? 'guest' : 'host';
    const movePath = (oppRole === 'host') ? 'hostMove' : 'guestMove';

    roomRef.child(movePath).on('value', async (snapshot) => {
        const move = snapshot.val();
        if (!move) return;

        // Check if new move
        const lastTime = window.lastMoveTime || 0;
        if (move.timestamp <= lastTime) return;
        window.lastMoveTime = move.timestamp;

        if (move.type === 'play') {
            const cardIdx = move.data.cardIndex;
            const slot = move.data.slot;
            const sacs = move.data.sacrifices || [];

            // Visual Sacrifice
            sacs.forEach(sIdx => { aiField[sIdx] = null; });

            // Visual Fly Card
            const handDiv = document.getElementById('ai-hand');
            const cardElem = Array.from(handDiv.children).find(el => el.dataset.aiIndex == cardIdx);
            const slotElem = document.getElementById(`ai-${slot}`);
            
            if (cardElem && slotElem) await flyCard(cardElem, slotElem);

            // Logic Update
            let card = aiHand.splice(cardIdx, 1)[0];
            card.charging = true; // NEW: Opponent played it, so it is charging
            if(card.type === 'atk') card.charging = true; 
            if(card.type === 'skl') card.revealed = false; 
            
            aiField[slot] = card;
            render();
        } 
        else if (move.type === 'discard') {
            const cardIdx = move.data.cardIndex;
            let card = aiHand.splice(cardIdx, 1)[0];
            addToLog(`Opponent discarded ${card.name}`, "ai");
            render();
        }
        else if (move.type === 'removeSkill') {
            const slot = move.data.slot;
            aiField[slot] = null;
            aiHP -= 5;
            addToLog("Opponent paid 5 HP to remove skill", "ai");
            render();
        }
        else if (move.type === 'endTurn') {
            // ============================
            // TURN HANDOVER SEQUENCE
            // ============================
            addToLog("Opponent ended turn.", "sys");
            
            // 1. MY COUNTER-ATTACK!
            // The opponent is ending their turn, so MY cards (pField) wake up and attack them.
            addToLog("--- My Counter-Attack ---", "sys");

            // Wake up my cards
            pField.forEach(c => { if(c) c.charging = false; });

            // Resolve Combat: Player (Me) attacks AI (Opponent)
            await resolveCombat(pField, aiField, false);
            
            // 2. Sync HP (Safety Check)
            // If the opponent calculated they took 10 dmg, but I calculated 0, we have a problem.
            // For now, let's trust our local calculation, but log the difference.
            if (move.data.resultingHp !== undefined) {
                // Optional: You could force sync here: aiHP = move.data.resultingHp;
                console.log(`HP Sync Check - My Calc: ${aiHP}, Their Calc: ${move.data.resultingHp}`);
            }

            // 3. Start My Main Phase
            isMyTurn = true;
            actions = 0; discarded = false; turnCount++;
            
            // Draw Cards
            while(pHand.length < 3) {
                if (pDeck.length === 0) { checkGameOver("DEFEAT! Decked Out."); return; }
                await drawCardAnimated(pDeck, pHand, true);
            }
            while(aiHand.length < 3) {
                 if (aiDeck.length === 0) { checkGameOver("VICTORY! AI Decked Out."); return; }
                 await drawCardAnimated(aiDeck, aiHand, false);
            }
            
            render();
            checkGameOver();
        }
    });
}


function sendMultiplayerMove(actionType, data) {
    if (gameMode !== 'multi') return;

    const moveData = {
        type: actionType,
        data: data,
        timestamp: Date.now()
    };
    const movePath = (myRole === 'host') ? 'hostMove' : 'guestMove';
    roomRef.child(movePath).set(moveData);
}

function createRoom() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    currentRoomId = code;
    playerRole = 'host';
    document.getElementById('room-code').value = code;
    document.getElementById('lobby-status').innerText = "Creating room...";
    
    db.ref('rooms/' + code).set({
        host: { status: 'waiting' },
        guest: { status: 'empty' }
    }).then(() => {
        db.ref('rooms/' + code + '/guest/status').on('value', (snapshot) => {
            if (snapshot.val() === 'joined') {
                document.getElementById('lobby-status').innerText = "Opponent found! Starting...";
                setTimeout(() => startMultiplayerGame(), 1000);
            }
        });
    });
}

function joinRoom() {
    const code = document.getElementById('room-code').value;
    if (code.length !== 4) { alert("Enter 4-digit code."); return; }
    currentRoomId = code;
    playerRole = 'guest';
    document.getElementById('lobby-status').innerText = "Joining...";
    
    db.ref('rooms/' + code).once('value', (snapshot) => {
        if (snapshot.exists()) {
            db.ref('rooms/' + code + '/guest').update({ status: 'joined' });
            document.getElementById('lobby-status').innerText = "Joined! Starting...";
            setTimeout(() => startMultiplayerGame(), 1000);
        } else {
            alert("Room not found!");
        }
    });
}

function startMultiplayerGame() {
    gameMode = 'multi';
    myRole = playerRole; 
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('top-bar').classList.remove('hidden');
    document.getElementById('btn-menu').style.display = 'block';
    init(); 
}
