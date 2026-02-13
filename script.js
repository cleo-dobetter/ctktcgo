const IMAGES = "images/";

// ==========================================
// SECTION 0: FIREBASE CONFIGURATION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyCP4X7cTUNbWLKMnDrS6JRXhZkWrCrg_b8",
  authDomain: "ctktcgo.firebaseapp.com",

	databaseURL: https://ctktcgo-default-rtdb.firebaseio.com,

  projectId: "ctktcgo",
  storageBucket: "ctktcgo.firebasestorage.app",
  messagingSenderId: "942928938877",
  appId: "1:942928938877:web:02de52c5e1f4b919b1ee14",
  measurementId: "G-RJRW0Q80E6"
};

// Initialize Firebase (Compat Mode)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Create Global Database Reference
const db = firebase.database();
const auth = firebase.auth();

if (db) {
    alert("SUCCESS: Firebase Connected!");
} else {
    alert("ERROR: Database not found.");
}




// ==========================================
// SECTION 1: GAME CONFIGURATION (STATIC DATA)
// TROUBLESHOOTING: Check here if images aren't loading or card stats are wrong.
// ==========================================

// --- 1. BASE DECK (Always Included) ---
const BASE_DECK = [
    { name: "Blazing Colt", type: "atk", val: 10, cost: 1, img: "horse/blazing_colt.png", count: 3 },
    { name: "Blazing Pegasus", type: "atk", val: 15, cost: 2, img: "horse/blazing_pegasus.png", count: 2 },
    { name: "Angelic Stallion", type: "atk", val: 20, cost: 3, img: "horse/angelic_stallion.png", count: 1 },
    { name: "Dark Knight", type: "def", val: 10, cost: 0, img: "knights/dark_knight.png", count: 3 },
    { name: "Damned Knight", type: "def", val: 15, cost: 1, img: "knights/damned_knight.png", count: 2 },
    { name: "Devil King", type: "def", val: 20, cost: 2, img: "knights/devil_king.png", count: 1 }
];

// --- 2. SKILL POOL (Shop Data) ---
const SKILL_POOL = [
    { id: "miss", name: "Secret Agent 12", costPoints: 1, limit: 3, img: "agents/secret_agent_12.png", effect: "miss", desc: "Causes an attack to Miss completely (0 Dmg)." },
    { id: "reflect", name: "Queen's Mirror", costPoints: 1, limit: 3, img: "knights/queens_mirror.png", effect: "reflect", desc: "Reflects damage back to the attacker." },
    { id: "breakd", name: "Castle Breaker", costPoints: 2, limit: 3, img: "og/castle_breaker.png", effect: "breakd", desc: "Destroys a Defense card instantly." },
    { id: "disarm", name: "Stealthy Shinobi", costPoints: 3, limit: 3, img: "ninja/stealthy_shinobi.png", effect: "disarm", desc: "Disarms an Attack (0 Dmg) and removes it." },
    { id: "supref", name: "Reflection Torture", costPoints: 3, limit: 2, img: "og/reflection_torture.png", effect: "supref", desc: "Reflects DOUBLE the damage back." }
];

// ==========================================
// SECTION 2: GLOBAL STATE (MEMORY)
// TROUBLESHOOTING: If the game forgets your score or deck, this section is responsible.
// ==========================================

let playerSkills = {}; 
let currentPoints = 0;
const MAX_POINTS = 15;

let pDeck = [], aiDeck = [];
let pHP = 60, aiHP = 60, turnCount = 1;
let pHand = [], aiHand = [], pField = [null, null, null], aiField = [null, null, null];
let actions = 0, discarded = false, selectedIdx = null, sacrifices = [];
let isProcessing = false;

// NEW DETAILED STATS TRACKING
let stats = {
    atkDmgGiven: 0,
    atkDmgTaken: 0,
    skillDmgGiven: 0,
    skillDmgTaken: 0,
    defDmgGiven: 0,
    defDmgTaken: 0,
    skillsUsed: 0,
    sacrifices: 0,
    startTime: 0,
    endTime: 0
};

loadDefaultSkills(); 

function loadDefaultSkills() {
    playerSkills = { miss: 2, reflect: 2, breakd: 2, disarm: 1, supref: 0 };
    calcPoints();
}

let isTutorial = false; // NEW FLAG


// ==========================================
// SECTION 3: MENU & UI NAVIGATION
// TROUBLESHOOTING: If buttons don't work or menus won't close, copy this section.
// ==========================================

function startGame() {
    isTutorial = false; // Ensure tutorial mode is OFF
    
    // UI Visibility
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('top-bar').classList.remove('hidden');

    // FORCE the menu button to appear for standard matches
    document.getElementById('btn-menu').style.display = 'block'; 

    init();
}


function openRules() {
    document.getElementById('rules-menu').classList.remove('hidden');
}
function closeRulesMenu() {
    document.getElementById('rules-menu').classList.add('hidden');
}


function quitToTitle() {
    document.getElementById('game-container').classList.add('hidden');
    document.getElementById('top-bar').classList.add('hidden');
    document.getElementById('menu-overlay').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}

document.getElementById('btn-menu').style.display = 'block'; 

function openSkills() {
    document.getElementById('skills-overlay').classList.remove('hidden');
    renderShop();
    updateBuilderUI();
}
function closeSkills() { document.getElementById('skills-overlay').classList.add('hidden'); }

// --- SKILL BUILDER LOGIC ---
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
// SECTION 4: GAME INITIALIZATION
// TROUBLESHOOTING: If the game crashes immediately upon starting, check this.
// ==========================================

async function init() {
    // 1. Build Player Deck
    pDeck = [];
    BASE_DECK.forEach(card => { for(let i=0; i<card.count; i++) pDeck.push({...card}); });
    SKILL_POOL.forEach(skill => {
        let qty = playerSkills[skill.id] || 0;
        for(let i=0; i<qty; i++) {
            pDeck.push({ name: skill.name, type: "skl", val: 0, cost: 0, img: skill.img, effect: skill.effect, count: 1 });
        }
    });

    // 2. Build AI Deck
    aiDeck = createAIDeck();

    // 3. Shuffle & Reset
    pDeck.sort(() => Math.random() - 0.5);
    aiDeck.sort(() => Math.random() - 0.5);
    pHP = 60; aiHP = 60; turnCount = 1;
    pField = [null, null, null]; aiField = [null, null, null];
    pHand = []; aiHand = [];
    actions = 0; discarded = false; selectedIdx = null; sacrifices = [];
    
    // RESET STATS (Detailed)
    stats = { 
        atkDmgGiven: 0, atkDmgTaken: 0, 
        skillDmgGiven: 0, skillDmgTaken: 0,
        defDmgGiven: 0, defDmgTaken: 0,
        skillsUsed: 0, sacrifices: 0, 
        startTime: Date.now(), endTime: 0 
    };
    
    document.getElementById('game-log').innerHTML = '';
    addToLog("Duel started!", "sys");

    // 4. ANIMATED DEALING
    isProcessing = true;
    for(let i=0; i<3; i++) {
        await drawCardAnimated(pDeck, pHand, true);
        await drawCardAnimated(aiDeck, aiHand, false);
    }
    isProcessing = false;
    render();
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
// SECTION 5: RENDER LOOP (VISUALS)
// TROUBLESHOOTING: If cards disappear, or don't highlight when they should, copy this.
// ==========================================

function render() {
    document.getElementById('p-hp').innerText = pHP;
    document.getElementById('ai-hp').innerText = aiHP;
    
    const disabledState = (isProcessing);
    document.getElementById('btn-discard').disabled = (discarded || selectedIdx === null || disabledState);
    document.getElementById('btn-end').disabled = disabledState;

    const preview = document.getElementById('selection-preview');
    if (preview) preview.innerText = selectedIdx !== null ? pHand[selectedIdx].name.toUpperCase() : "CHOOSE A CARD";

    // AI HAND
    const aiHandDiv = document.getElementById('ai-hand');
    aiHandDiv.innerHTML = '';
    aiHand.forEach((c, i) => {
        const div = document.createElement('div');
        div.className = 'card';
        div.style.backgroundImage = `url('${IMAGES}cardbacks/cardback.png')`;
        if (c.animState === 'entering') div.classList.add('anim-entry');
        div.dataset.aiIndex = i; 
        aiHandDiv.appendChild(div);
    });

    // PLAYER HAND
    const handDiv = document.getElementById('hand');
    handDiv.innerHTML = '';
    pHand.forEach((c, i) => {
        const div = document.createElement('div');
        let classes = `card ${selectedIdx === i ? 'selected' : ''}`;
        
        if (c.animState === 'entering') {
            classes += ' anim-entry';
            div.style.backgroundImage = `url('${IMAGES}cardbacks/cardback.png')`;
        } 
        else if (c.animState === 'flipping') {
            classes += ' anim-flip-in';
            div.style.backgroundImage = `url('${IMAGES}${c.img}')`;
        }
        else {
            div.style.backgroundImage = `url('${IMAGES}${c.img}')`;
        }

        div.className = classes;
        div.dataset.index = i; 
        if (!isProcessing) {
            div.onclick = () => { 
    selectedIdx = i; 
    sacrifices = []; 
    if (isTutorial) tutorialSelectCard(i); // NEW HOOK
    render(); 
};

        }
        handDiv.appendChild(div);
    });

    for(let i=0; i<3; i++) {
        renderField('p-'+i, pField[i], i, 'p');
        renderField('ai-'+i, aiField[i], i, 'ai');
    }
}

function renderField(id, card, col, owner) {
    const slot = document.getElementById(id);
    if (!slot) return;
    slot.innerHTML = '';
    slot.classList.remove('highlight');
    
    if(card) {
        const div = document.createElement('div');
        const isSacTarget = sacrifices.includes(col);
        div.className = `card ${card.charging ? 'charging' : ''} ${isSacTarget ? 'sac-target' : ''}`;
        
        if (owner === 'ai' && card.type === 'skl' && !card.revealed) {
            div.style.backgroundImage = `url('${IMAGES}cardbacks/cardback.png')`;
        } else {
            div.style.backgroundImage = `url('${IMAGES}${card.img}')`;
        }
        if (owner === 'p' && card.type === 'skl') div.classList.add('skill-dark');

        if(owner === 'p' && !isProcessing) {
            div.onclick = (e) => { 
                e.stopPropagation(); 
                if (card.type === 'skl' && !isSacTarget && selectedIdx === null) {
                    payLifeToRemove(col); return;
                }
                if (isSacTarget && sacrifices.length === getCost()) clickSlot(col);
                else toggleSac(col); 
            };
        }
        slot.appendChild(div);
    } 

    if (selectedIdx !== null && owner === 'p' && !isProcessing) {
        const costNeeded = getCost();
        const cardToPlay = pHand[selectedIdx];
        const isSlotAvailable = (pField[col] === null || sacrifices.includes(col));
        const laneRulePassed = !(cardToPlay.type === 'atk' && aiField[col] && aiField[col].type === 'atk');

        if (sacrifices.length === costNeeded && isSlotAvailable && laneRulePassed) {
            slot.classList.add('highlight');
        }
    }
}

// ==========================================
// SECTION 6: PLAYER INTERACTIONS
// TROUBLESHOOTING: If you can't play cards, sacrifice, or discard, check here.
// ==========================================

function payLifeToRemove(col) {
    if (pHP <= 5) { alert("Not enough HP!"); return; }
    if (confirm("Pay 5 HP to remove this Skill card?")) {
        let c = pField[col];
        pField[col] = null;
        pHP -= 5;
        addToLog(`Player paid 5 HP to remove ${c.name}`, "p");
        render();
    }
}

function getCost() {
    if (selectedIdx === null) return 0;
    let c = pHand[selectedIdx];
    if (c.type === 'skl') return 0;
    if (c.type === 'def') return c.cost;
    let onBoard = pField.filter(x => x !== null).length;
    if (c.type === 'atk' && onBoard === 0 && c.val === 10) return 0; // Rule: Free Colt
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
    if (isTutorial) { tutorialClickSlot(col); return; } // HOOK
    
    // ... rest of your existing clickSlot code ...
    if (isProcessing || selectedIdx === null || actions >= 2) return;
    
    const cardToPlay = pHand[selectedIdx];
    // (Keep your existing logic exactly as is below this line)
    const costNeeded = getCost();
    const isSlotValid = (pField[col] === null || sacrifices.includes(col));

    if (sacrifices.length === costNeeded && isSlotValid) {
        if (cardToPlay.type === 'atk' && aiField[col] && aiField[col].type === 'atk') {
            alert("Cannot play an Attack facing another Attack!");
            return;
        }

        isProcessing = true; 
        const handDiv = document.getElementById('hand');
        const cardElem = Array.from(handDiv.children).find(el => el.dataset.index == selectedIdx);
        const slotElem = document.getElementById(`p-${col}`);

        if (cardElem && slotElem) await flyCard(cardElem, slotElem);

        if (sacrifices.length > 0) {
            stats.sacrifices += sacrifices.length;
        }
        if (cardToPlay.type === 'skl') {
            stats.skillsUsed++;
        }

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
    if (isTutorial) { tutorialDiscard(); return; } // HOOK

    if (selectedIdx !== null && !discarded && !isProcessing) {
        let c = pHand.splice(selectedIdx, 1)[0];
        addToLog(`Player discarded ${c.name}`, "p");
        selectedIdx = null; discarded = true; render();
    }
}


// ==========================================
// SECTION 7: ANIMATIONS
// TROUBLESHOOTING: If GIFs or card movements look weird, this is the place.
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
// SECTION 8: COMBAT & AI LOGIC (THE BRAIN)
// TROUBLESHOOTING: Check here if damage is calculated wrong or AI plays stupidly.
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

        // 1. CASTLE BREAKER
        if (atk.type === 'skl' && atk.effect === 'breakd') {
            let def = defField[i];
            if (def && def.type === 'def') {
                atk.revealed = true; render(); await sleep(400);
                addToLog(`${attackerName} used Castle Breaker!`, isAiAtk ? "ai" : "p");
                addToLog(`${defenderName}'s ${def.name} was destroyed!`, "dmg");
                flashSlot(defSlotId, 'hit');
                await animateDeath(defSlotId, def.name);
                defField[i] = null; 
                offField[i] = null; 
            }
        }
        // 2. ATTACK
        else if (atk.type === 'atk') {
            let dmg = atk.val;
            let def = defField[i];
            
            if (def) {
                if (def.type === 'skl') {
                    def.revealed = true; render(); await sleep(600);
                    addToLog(`${defenderName}'s ${def.name} triggered!`, isAiAtk ? "p" : "ai");
                    
                    if (def.effect === 'disarm') {
                        offField[i] = null; dmg = 0; 
                        addToLog(`${attackerName}'s ${atk.name} was Disarmed!`, "sys");
                        flashSlot(atkSlotId, 'block'); 
                    } 
                    else if (def.effect === 'reflect') {
                        if (isAiAtk) { 
                            aiHP -= dmg; 
                            // AI took damage from Player's Skill
                            // Note: isAiAtk means AI is attacking. Reflect means AI hurts itself.
                            // So Player GAVE this damage via Skill.
                            // However, we want to track stats for the PLAYER.
                            // If isAiAtk (AI Turn), AI takes damage = Player gave Skill Dmg.
                            // If !isAiAtk (Player Turn), Player takes damage = Player took Skill Dmg.
                        } 
                        else { 
                            pHP -= dmg; 
                            // Player Turn. Player Reflects? No, Enemy Reflects.
                            // Player takes Skill Dmg.
                            stats.skillDmgTaken += dmg; 
                        }
                        
                        // Wait, let's simplify based on Perspective.
                        // We track PLAYER STATS.
                        if (isAiAtk) {
                            // AI Attacking. Player Reflects.
                            // AI takes damage. This is Player Skill Dmg Given.
                            stats.skillDmgGiven += dmg;
                        } else {
                            // Player Attacking. AI Reflects.
                            // Player takes damage. This is Player Skill Dmg Taken.
                            stats.skillDmgTaken += dmg;
                        }

                        addToLog(`Reflected ${dmg} dmg to ${attackerName}`, "dmg"); 
                        dmg = 0; flashSlot(atkSlotId, 'hit'); 
                    } 
                    else if (def.effect === 'supref') {
                        let refDmg = dmg * 2; 
                        if (isAiAtk) { aiHP -= refDmg; stats.skillDmgGiven += refDmg; } 
                        else { pHP -= refDmg; stats.skillDmgTaken += refDmg; }
                        addToLog(`Super Reflected ${refDmg} dmg to ${attackerName}!`, "dmg"); 
                        dmg = 0; flashSlot(atkSlotId, 'super'); 
                    } 
                    else if (def.effect === 'miss') {
                        addToLog(`Attack Missed!`, "sys"); dmg = 0;
                    }
                    await animateDeath(defSlotId, def.name);
                    defField[i] = null; 
                } 
                else if (def.type === 'def') {
                    if (def.val > dmg) {
                        let thorns = def.val - dmg; 
                        if (isAiAtk) { aiHP -= thorns; stats.defDmgGiven += thorns; } 
                        else { pHP -= thorns; stats.defDmgTaken += thorns; }
                        addToLog(`Thorn Damage! ${attackerName} took ${thorns}`, "dmg");
                        flashSlot(defSlotId, 'block'); flashSlot(atkSlotId, 'hit');   
                    }
                    else if (def.val === dmg) {
                        addToLog(`${def.name} blocked all dmg`, "sys");
                        flashSlot(defSlotId, 'block'); 
                    }
                    else {
                         let blocked = def.val;
                         addToLog(`${def.name} blocked ${blocked} dmg`, "sys");
                         flashSlot(defSlotId, 'hit'); 
                    }
                    dmg = Math.max(0, dmg - def.val);
                }
            } else {
                if (atk.name === "Angelic Stallion") await playGifAnimation("stallion.gif");
                flashSlot(defSlotId, 'hit');
            }

            if (dmg > 0) {
                // Direct Attack Damage
                if (isAiAtk) { pHP -= dmg; stats.atkDmgTaken += dmg; } 
                else { aiHP -= dmg; stats.atkDmgGiven += dmg; }
                addToLog(`${attackerName} dealt ${dmg} dmg with ${atk.name}`, "dmg");
            }
            await sleep(300); 
        }
    }
}

async function aiAction() {
    // 1. CLEANUP
    if (aiHP > 15) {
        for(let i=0; i<3; i++) {
            let c = aiField[i];
            if (!c || c.type !== 'skl') continue;
            let opp = pField[i];
            let isDead = false;
            
            if (['reflect','supref','miss','disarm'].includes(c.effect)) {
                if (!opp || opp.type !== 'atk') isDead = true;
            }
            else if (c.effect === 'breakd') {
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
    
    // 2. SCORE MOVES
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
    
    possibleMoves = possibleMoves.filter(m => m.score > -200);
    possibleMoves.sort((a, b) => b.score - a.score);
    
    // 3. EXECUTE BEST MOVE
    if (possibleMoves.length > 0 && possibleMoves[0].score > 50) {
        let best = possibleMoves[0];
        const handDiv = document.getElementById('ai-hand');
        const cardElem = Array.from(handDiv.children).find(el => el.dataset.aiIndex == best.handIdx);
        const slotElem = document.getElementById(`ai-${best.slot}`);
        if (cardElem && slotElem) await flyCard(cardElem, slotElem);

        best.sacrifices.forEach(idx => aiField[idx] = null);
        if(best.sacrifices.length > 0) addToLog(`AI sacrificed ${best.sacrifices.length} card(s)`, "ai");
        
        addToLog(`AI summoned ${best.card.name}`, "ai");
        let newCard = {...best.card, charging: (best.card.type === 'atk')};
        if(newCard.type === 'skl') newCard.revealed = false; 
        
        aiField[best.slot] = newCard;
        aiHand.splice(best.handIdx, 1);
        return;
    } 
    
    // 4. DISCARD IF NO MOVES
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
    if (card.effect === 'supref') return 50;
    if (card.effect === 'disarm') return 40;
    if (card.val === 20) return 30; 
    if (card.val === 15) return 20;
    if (card.val === 10) return 10; 
    return 0;
}

function getCardValue(card) {
    if (!card) return 0;
    if (card.type === 'atk') return card.val;
    if (card.type === 'def') return card.val;
    return 0; 
}

// ==========================================
// SECTION 9: UTILITIES & SYSTEM
// TROUBLESHOOTING: Logging, menu toggles, and loop control.
// ==========================================

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
    
    // Time Calc
    let totalSeconds = Math.floor((stats.endTime - stats.startTime) / 1000);
    let mins = Math.floor(totalSeconds / 60);
    let secs = totalSeconds % 60;
    let timeString = `${mins}:${secs < 10 ? '0'+secs : secs}`;

    // Points Calc
    let score = 0;
    let timeBonus = 0;
    
    // Calculate Multiplied Points (x10)
    let ptsCards = pDeck.length * 10;
    
    let ptsAtkGiven = stats.atkDmgGiven * 10;
    let ptsAtkTaken = stats.atkDmgTaken * 10;
    
    let ptsSkillUsed = stats.skillsUsed * 10;
    let ptsSkillGiven = stats.skillDmgGiven * 10;
    let ptsSkillTaken = stats.skillDmgTaken * 10;
    
    let ptsDefGiven = stats.defDmgGiven * 10;
    let ptsDefTaken = stats.defDmgTaken * 10;
    
    let ptsSac = stats.sacrifices * 10;

    if (isWin) {
        title.innerText = "VICTORY";
        title.style.color = "var(--accent)";
        
        if (totalSeconds < 60) timeBonus = 100;
        else if (totalSeconds > 300) timeBonus = 10;
        else timeBonus = 100 - Math.floor((totalSeconds - 60) * (90 / 240));

        // Score Formula
        let totalGiven = ptsAtkGiven + ptsSkillGiven + ptsDefGiven;
        let totalTaken = ptsAtkTaken + ptsSkillTaken + ptsDefTaken;
        
        score = (totalGiven - totalTaken) + ptsCards + ptsSkillUsed + ptsSac + timeBonus;
        score = Math.max(0, score); 
    } else {
        title.innerText = "DEFEAT";
        title.style.color = "#e74c3c";
        score = 10; 
        timeBonus = 0;
    }

    // UPDATE DOM
    document.getElementById('val-cards').innerText = pDeck.length;
    
    document.getElementById('val-atk-given').innerText = stats.atkDmgGiven;
    document.getElementById('val-atk-taken').innerText = stats.atkDmgTaken;
    
    document.getElementById('val-skl-used').innerText = stats.skillsUsed;
    document.getElementById('val-skl-given').innerText = stats.skillDmgGiven;
    document.getElementById('val-skl-taken').innerText = stats.skillDmgTaken;
    
    document.getElementById('val-def-given').innerText = stats.defDmgGiven;
    document.getElementById('val-def-taken').innerText = stats.defDmgTaken;
    
    document.getElementById('val-sac').innerText = stats.sacrifices;
    document.getElementById('val-time').innerText = timeString;
    
    // Points Column
    if (isWin) {
        document.getElementById('pts-cards').innerText = `+${ptsCards}`;
        document.getElementById('pts-atk-given').innerText = `+${ptsAtkGiven}`;
        document.getElementById('pts-atk-taken').innerText = `-${ptsAtkTaken}`;
        document.getElementById('pts-skl-used').innerText = `+${ptsSkillUsed}`;
        document.getElementById('pts-skl-given').innerText = `+${ptsSkillGiven}`;
        document.getElementById('pts-skl-taken').innerText = `-${ptsSkillTaken}`;
        document.getElementById('pts-def-given').innerText = `+${ptsDefGiven}`;
        document.getElementById('pts-def-taken').innerText = `-${ptsDefTaken}`;
        document.getElementById('pts-sac').innerText = `+${ptsSac}`;
        document.getElementById('pts-time').innerText = `+${timeBonus}`;
    } else {
        // Loser sees 0 points everywhere except "Final Score" (10)
        let elements = document.getElementsByClassName('pts-plus');
        for(let el of elements) el.innerText = "+0";
        elements = document.getElementsByClassName('pts-minus');
        for(let el of elements) el.innerText = "-0";
    }
    
    document.getElementById('final-score').innerText = score;
    screen.classList.remove('hidden');
}

function quitToTitleFromStats() {
    document.getElementById('game-over-screen').classList.add('hidden');
    quitToTitle();
}

function concedeGame() {
    if (confirm("Are you sure you want to surrender?")) {
        stats.endTime = Date.now();
        showGameOverScreen(false, "Surrender");
    }
}

async function endTurn() {
    if (isTutorial) { tutorialEndTurn(); return; } // HOOK

    // ... rest of your existing endTurn code ...
    isProcessing = true;
    render(); 
    
    addToLog("--- Enemy Reaction ---", "sys");
    await resolveCombat(aiField, pField, true); 
    // (Keep the rest of your standard logic)
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


// Helpers
function addToLog(msg, type = "sys") {
    const ul = document.getElementById('game-log');
    if(!ul) return;
    const li = document.createElement('li');
    li.innerText = msg;
    li.className = `log-${type}`;
    ul.appendChild(li);
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function toggleMenu() { document.getElementById('menu-overlay').classList.toggle('hidden'); }
function toggleBattleLog() {
    const content = document.getElementById('log-content');
    const arrow = document.getElementById('log-arrow');
    if (content.classList.contains('collapsed')) { content.classList.remove('collapsed'); arrow.innerText = '▼'; } 
    else { content.classList.add('collapsed'); arrow.innerText = '▶'; }
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
    
    let drawPileChecklist = pDeck.map(c => c.name);
    
    fullDeckList.forEach(cardData => {
        const div = document.createElement('div');
        div.className = 'deck-card';
        div.style.backgroundImage = `url('${IMAGES}${cardData.img}')`;
        const foundIdx = drawPileChecklist.indexOf(cardData.name);
        if (foundIdx !== -1) {
            drawPileChecklist.splice(foundIdx, 1);
        } else {
            div.classList.add('drawn');
        }
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
// SECTION 10: MULTIPLAYER LOBBY
// ==========================================

let currentRoomId = null;
let playerRole = null; // 'host' or 'guest'

function createRoom() {
    // 1. Generate a random 4-digit code
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    currentRoomId = code;
    playerRole = 'host';
    
    document.getElementById('room-code').value = code;
    document.getElementById('lobby-status').innerText = "Creating room... waiting for opponent...";
    
    // 2. Create the room in Firebase
    db.ref('rooms/' + code).set({
        host: { status: 'waiting' },
        guest: { status: 'empty' },
        turn: 'host', // Host always goes first
        lastMove: null
    });

    // 3. Listen for Guest to join
    db.ref('rooms/' + code + '/guest').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.status === 'joined') {
            document.getElementById('lobby-status').innerText = "Opponent found! Starting...";
            setTimeout(() => startMultiplayerGame(), 1000);
        }
    });
}

function joinRoom() {
    const code = document.getElementById('room-code').value;
    if (code.length !== 4) { alert("Please enter a 4-digit code."); return; }
    
    currentRoomId = code;
    playerRole = 'guest';
    
    document.getElementById('lobby-status').innerText = "Joining room...";
    
    // 1. Check if room exists
    db.ref('rooms/' + code).once('value', (snapshot) => {
        if (snapshot.exists()) {
            // 2. Join the room
            db.ref('rooms/' + code + '/guest').set({ status: 'joined' });
            document.getElementById('lobby-status').innerText = "Joined! Starting game...";
            setTimeout(() => startMultiplayerGame(), 1000);
        } else {
            alert("Room not found!");
            document.getElementById('lobby-status').innerText = "";
        }
    });
}

function startMultiplayerGame() {
    alert(`Game Started! You are: ${playerRole.toUpperCase()}`);
    // We will hook this up to the actual game logic in Phase 2
}
