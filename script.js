// ==========================================
// 1. CONFIGURATION & FIREBASE SETUP
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

// Initialize Firebase safely
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = (typeof firebase !== 'undefined') ? firebase.database() : null;

// ==========================================
// 2. GLOBAL VARIABLES & DATA
// ==========================================
const IMAGES = "images/"; 

const BASE_DECK = [
    { name: "Blazing Colt", type: "atk", val: 10, cost: 1, img: "horse/blazing_colt.png", count: 3 },
    { name: "Blazing Pegasus", type: "atk", val: 15, cost: 2, img: "horse/blazing_pegasus.png", count: 2 },
    { name: "Angelic Stallion", type: "atk", val: 20, cost: 3, img: "horse/angelic_stallion.png", count: 1 },
    { name: "Dark Knight", type: "def", val: 10, cost: 0, img: "knights/dark_knight.png", count: 3 },
    { name: "Damned Knight", type: "def", val: 15, cost: 1, img: "knights/damned_knight.png", count: 2 },
    { name: "Devil King", type: "def", val: 20, cost: 2, img: "knights/devil_king.png", count: 1 }
];

const SKILL_POOL = [
    { id: "miss", name: "Secret Agent 12", costPoints: 1, limit: 3, img: "agents/secret_agent_12.png", effect: "miss", desc: "Causes attack to miss." },
    { id: "reflect", name: "Queen's Mirror", costPoints: 1, limit: 3, img: "knights/queens_mirror.png", effect: "reflect", desc: "Reflects damage." },
    { id: "breakd", name: "Castle Breaker", costPoints: 2, limit: 3, img: "og/castle_breaker.png", effect: "breakd", desc: "Destroys defense." },
    { id: "disarm", name: "Stealthy Shinobi", costPoints: 3, limit: 3, img: "ninja/stealthy_shinobi.png", effect: "disarm", desc: "Disarms opponent." }
];

// Game State
let gameMode = 'solo'; // 'solo' or 'multi'
let myRole = null;     // 'host' or 'guest'
let currentRoomId = null;
let roomRef = null;

let pHP = 60, aiHP = 60;
let pHand = [], aiHand = [];
let pField = [null, null, null], aiField = [null, null, null];
let pDeck = [], aiDeck = [];

let isProcessing = false;
let isMyTurn = true;
let selectedIdx = null; // Index of card selected in hand
let sacrifices = [];    // Array of field indices selected for sacrifice
let discarded = false;  // Has player discarded this turn?

// Tutorial State
let isTutorial = false;
let tutStep = 0;

// ==========================================
// 3. LOADER & INITIALIZATION
// ==========================================
window.onload = function() {
    startPreloader();
};

function startPreloader() {
    const screen = document.getElementById('loading-screen');
    const bar = document.getElementById('loading-bar');
    const txt = document.getElementById('loading-text');
    
    // Build list of all images
    let assets = ["cardbacks/cardback.png", "animations/cardani/stallion.gif"];
    BASE_DECK.forEach(c => assets.push(c.img));
    SKILL_POOL.forEach(s => assets.push(s.img));

    let loaded = 0;
    let total = assets.length;

    if (total === 0) {
        finishLoading();
        return;
    }

    assets.forEach(path => {
        const img = new Image();
        img.onload = () => {
            loaded++;
            if (bar) bar.style.width = Math.floor((loaded/total)*100) + "%";
            if (txt) txt.innerText = "Loading... " + Math.floor((loaded/total)*100) + "%";
            if (loaded >= total) setTimeout(finishLoading, 500);
        };
        img.onerror = () => {
            console.warn("Missing image: " + path);
            loaded++; // Continue anyway
            if (loaded >= total) setTimeout(finishLoading, 500);
        };
        img.src = IMAGES + path;
    });
    
    // Safety Timeout
    setTimeout(finishLoading, 4000);
}

function finishLoading() {
    const screen = document.getElementById('loading-screen');
    if (screen) {
        screen.style.opacity = '0';
        setTimeout(() => screen.style.display = 'none', 500);
    }
}

// ==========================================
// 4. MENU FUNCTIONS
// ==========================================
function startGame() {
    gameMode = 'solo';
    isTutorial = false;
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('top-bar').classList.remove('hidden');
    initGame();
}

function openSkills() {
    document.getElementById('skills-overlay').classList.remove('hidden');
    // Simplified deck builder logic would go here
}

function closeSkills() {
    document.getElementById('skills-overlay').classList.add('hidden');
}

function openRules() {
    document.getElementById('rules-menu').classList.remove('hidden');
}

function closeRulesMenu() {
    document.getElementById('rules-menu').classList.add('hidden');
}

function toggleMenu() {
    document.getElementById('menu-overlay').classList.toggle('hidden');
}

function quitToTitle() {
    location.reload();
}

// ==========================================
// 5. CORE GAME ENGINE
// ==========================================
async function initGame() {
    // Reset Variables
    pHP = 60; aiHP = 60;
    pHand = []; aiHand = [];
    pField = [null, null, null]; aiField = [null, null, null];
    isProcessing = false;
    selectedIdx = null;
    sacrifices = [];
    discarded = false;

    // Build Decks
    pDeck = [];
    BASE_DECK.forEach(c => { for(let i=0; i<c.count; i++) pDeck.push({...c}); });
    // Add some skills for testing
    pDeck.push({...SKILL_POOL[0], type: 'skl', val: 0, cost: 0});
    pDeck.push({...SKILL_POOL[1], type: 'skl', val: 0, cost: 0});
    pDeck.sort(() => Math.random() - 0.5);

    if (gameMode === 'solo') {
        aiDeck = [...pDeck].sort(() => Math.random() - 0.5);
        isMyTurn = true;
    } else {
        isMyTurn = (myRole === 'host');
    }

    render();
    
    // Draw Initial Hands
    for(let i=0; i<3; i++) await drawCard(pHand, pDeck, true);
    
    if (gameMode === 'solo') {
        for(let i=0; i<3; i++) await drawCard(aiHand, aiDeck, false);
    } else {
        await multiplayerHandshake();
    }
}

function render() {
    // Stats
    document.getElementById('p-hp').innerText = pHP;
    document.getElementById('ai-hp').innerText = aiHP;
    document.getElementById('btn-discard').disabled = (isProcessing || !isMyTurn || discarded || selectedIdx === null);
    document.getElementById('btn-end').disabled = (isProcessing || !isMyTurn);

    // Hands
    renderHand('hand', pHand, true);
    renderHand('ai-hand', aiHand, false);

    // Fields
    for(let i=0; i<3; i++) {
        renderFieldSlot('p-'+i, pField[i], i, true);
        renderFieldSlot('ai-'+i, aiField[i], i, false);
    }
}

function renderHand(id, cards, isPlayer) {
    const div = document.getElementById(id);
    div.innerHTML = '';
    cards.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = 'card';
        if (isPlayer && i === selectedIdx) el.classList.add('selected');
        
        let bg = isPlayer ? `url('${IMAGES}${c.img}')` : `url('${IMAGES}cardbacks/cardback.png')`;
        el.style.backgroundImage = bg;
        el.style.backgroundSize = 'cover';
        
        if (isPlayer) {
            el.onclick = () => {
                if (isProcessing || !isMyTurn) return;
                selectedIdx = (selectedIdx === i) ? null : i;
                sacrifices = []; // Reset sacrifices when changing card
                render();
            };
        }
        div.appendChild(el);
    });
}

function renderFieldSlot(id, card, idx, isPlayer) {
    const slot = document.getElementById(id);
    slot.innerHTML = '';
    slot.classList.remove('sac-target', 'highlight');

    // Highlight valid slots
    if (isPlayer && !card && selectedIdx !== null && !isProcessing) {
        const cost = pHand[selectedIdx].cost || 0;
        if (sacrifices.length === cost) slot.classList.add('highlight');
    }

    // Highlight sacrifice targets
    if (isPlayer && card && sacrifices.includes(idx)) {
        slot.classList.add('sac-target');
    }

    if (card) {
        const el = document.createElement('div');
        el.className = 'card';
        if (card.charging) el.classList.add('charging');
        
        let bg = (isPlayer || card.revealed) ? `url('${IMAGES}${card.img}')` : `url('${IMAGES}cardbacks/cardback.png')`;
        el.style.backgroundImage = bg;
        el.style.backgroundSize = 'cover';
        
        // Sacrifice Click Logic
        if (isPlayer && !isProcessing && selectedIdx !== null) {
            el.onclick = () => {
                if (sacrifices.includes(idx)) sacrifices = sacrifices.filter(x => x !== idx);
                else sacrifices.push(idx);
                render();
            };
        }
        slot.appendChild(el);
    }
}

async function drawCard(hand, deck, isPlayer) {
    if (deck.length === 0 || hand.length >= 3) return;
    const card = deck.shift();
    hand.push(card);
    render();
    await new Promise(r => setTimeout(r, 200));
}

// ==========================================
// 6. INTERACTION & LOGIC
// ==========================================
async function clickSlot(idx) {
    if (isProcessing || !isMyTurn || selectedIdx === null) return;
    if (pField[idx]) return; // Slot occupied

    const card = pHand[selectedIdx];
    const cost = card.cost || 0;

    if (sacrifices.length !== cost) {
        alert(`You need to sacrifice ${cost} cards to play this! Click your own cards on the field to select them.`);
        return;
    }

    isProcessing = true;

    // Process Sacrifices
    sacrifices.forEach(sIdx => pField[sIdx] = null);
    
    // Play Card
    const playedCard = pHand.splice(selectedIdx, 1)[0];
    if (playedCard.type === 'atk') playedCard.charging = true;
    pField[idx] = playedCard;

    // Multiplayer Send
    if (gameMode === 'multi') {
        sendMove('play', { slot: idx, cardIndex: selectedIdx, sacrifices: sacrifices });
    }

    selectedIdx = null;
    sacrifices = [];
    isProcessing = false;
    render();
}

function discardCard() {
    if (isProcessing || !isMyTurn || selectedIdx === null || discarded) return;
    pHand.splice(selectedIdx, 1);
    selectedIdx = null;
    discarded = true;
    render();
}

async function endTurn() {
    if (isProcessing || !isMyTurn) return;
    isProcessing = true;

    if (gameMode === 'multi') {
        // Resolve MY attacks on ENEMY
        await resolveCombat(pField, aiField, false);
        sendMove('endTurn', { hp: aiHP }); // Send resulting HP
        isMyTurn = false;
    } else {
        // SOLO MODE SEQUENCE
        addToLog("--- Player Attack ---");
        await resolveCombat(pField, aiField, false); // Player hits AI
        
        addToLog("--- AI Turn ---");
        await runSoloAI();
        
        addToLog("--- AI Attack ---");
        await resolveCombat(aiField, pField, true); // AI hits Player
        
        // Refill Hands
        while(pHand.length < 3) await drawCard(pHand, pDeck, true);
        while(aiHand.length < 3) await drawCard(aiHand, aiDeck, false);
        
        isMyTurn = true;
        discarded = false;
    }

    isProcessing = false;
    render();
    checkGameOver();
}

async function resolveCombat(attackers, defenders, isAiAttacking) {
    for (let i=0; i<3; i++) {
        const atk = attackers[i];
        if (!atk) continue;

        if (atk.charging) {
            atk.charging = false; // Ready for next turn
            continue;
        }

        if (atk.type === 'def' || atk.type === 'skl') continue;

        // Combat Animation Shake
        const slotID = isAiAttacking ? `ai-${i}` : `p-${i}`;
        const slotEl = document.getElementById(slotID);
        if(slotEl) {
            slotEl.classList.add('anim-hit'); 
            setTimeout(()=>slotEl.classList.remove('anim-hit'), 500);
        }
        await new Promise(r => setTimeout(r, 400));

        let dmg = atk.val;
        const def = defenders[i];

        if (def) {
            // Check for Skills/Traps
            if (def.type === 'skl') {
                def.revealed = true;
                render();
                addToLog(`${def.name} activated!`);
                await new Promise(r => setTimeout(r, 500));
                
                if (def.effect === 'miss') dmg = 0;
                else if (def.effect === 'reflect') {
                    if (isAiAttacking) aiHP -= dmg; else pHP -= dmg;
                    dmg = 0;
                }
                defenders[i] = null; // Skill used up
            } else {
                // Standard Defense
                dmg = Math.max(0, dmg - def.val);
            }
        }

        // Apply Damage
        if (dmg > 0) {
            if (isAiAttacking) pHP -= dmg;
            else aiHP -= dmg;
        }
    }
    render();
}

// ==========================================
// 7. AI LOGIC
// ==========================================
async function runSoloAI() {
    await new Promise(r => setTimeout(r, 1000));
    
    // Very Basic AI: Play first playable card
    for (let i = 0; i < aiHand.length; i++) {
        const card = aiHand[i];
        // AI doesn't sacrifice yet in this simple version
        if (card.cost === 0) {
            for (let slot = 0; slot < 3; slot++) {
                if (!aiField[slot]) {
                    const played = aiHand.splice(i, 1)[0];
                    if (played.type === 'atk') played.charging = true;
                    aiField[slot] = played;
                    render();
                    return; // Play one card per turn
                }
            }
        }
    }
}

// ==========================================
// 8. MULTIPLAYER (Firebase)
// ==========================================
function createRoom() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    currentRoomId = code;
    myRole = 'host';
    
    document.getElementById('room-code').value = code;
    document.getElementById('lobby-status').innerText = "Waiting for player...";
    
    db.ref('rooms/' + code).set({
        host: { status: 'waiting' },
        guest: { status: 'empty' }
    });

    db.ref('rooms/' + code + '/guest/status').on('value', (snap) => {
        if (snap.val() === 'joined') {
            document.getElementById('lobby-overlay').classList.add('hidden');
            startGame();
            gameMode = 'multi';
        }
    });
}

function joinRoom() {
    const code = document.getElementById('room-code').value;
    if (code.length !== 4) return;
    
    db.ref('rooms/' + code).once('value', (snap) => {
        if (snap.exists()) {
            currentRoomId = code;
            myRole = 'guest';
            db.ref('rooms/' + code + '/guest').update({ status: 'joined' });
            document.getElementById('lobby-overlay').classList.add('hidden');
            startGame();
            gameMode = 'multi';
        } else {
            alert("Room not found");
        }
    });
}

async function multiplayerHandshake() {
    // Exchange decks/hands info
    // (Simplified for this snippet)
    listenForMoves();
}

function sendMove(type, data) {
    if (!currentRoomId) return;
    const path = (myRole === 'host') ? 'hostMove' : 'guestMove';
    db.ref('rooms/' + currentRoomId + '/' + path).set({
        type: type,
        data: data,
        timestamp: Date.now()
    });
}

function listenForMoves() {
    const oppPath = (myRole === 'host') ? 'guestMove' : 'hostMove';
    db.ref('rooms/' + currentRoomId + '/' + oppPath).on('value', (snap) => {
        const move = snap.val();
        if (!move) return;
        // Logic to replay opponent move (omitted for brevity, assume synced)
        if (move.type === 'endTurn') {
             // Opponent ended turn, now it's my turn
             pHP = move.data.hp; // Update my HP based on their calculations
             isMyTurn = true;
             render();
        }
    });
}

// ==========================================
// 9. TUTORIAL & UTILS
// ==========================================
function startTutorial() {
    isTutorial = true;
    tutStep = 0;
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('tutorial-overlay').classList.remove('hidden');
    document.getElementById('tut-text').innerText = "Welcome to CTK! Click Continue.";
}

function nextTutorialStep() {
    tutStep++;
    const txt = document.getElementById('tut-text');
    if (tutStep === 1) txt.innerText = "Horses need 1 turn to CHARGE before attacking.";
    else if (tutStep === 2) txt.innerText = "Knights defend. Agents are TRAPS (played face down).";
    else if (tutStep === 3) {
        document.getElementById('tutorial-overlay').classList.add('hidden');
        startGame(); // Start a practice match
    }
}

function addToLog(msg) {
    const log = document.getElementById('game-log');
    const li = document.createElement('li');
    li.innerText = msg;
    log.appendChild(li);
    log.scrollTop = log.scrollHeight;
}

function checkGameOver() {
    if (pHP <= 0 || aiHP <= 0) {
        document.getElementById('game-over-screen').classList.remove('hidden');
        document.getElementById('go-title').innerText = (pHP > 0) ? "VICTORY" : "DEFEAT";
    }
}
