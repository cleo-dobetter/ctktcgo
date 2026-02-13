let tutStep = 0;
let currentTutDeck = []; // The "Live" deck for the current session

// --- MASTER TEMPLATE (Do not shift from this!) ---
const TUT_MASTER_DECK = [
    { name: "Blazing Colt", type: "atk", val: 10, cost: 1, img: "horse/blazing_colt.png" },
    { name: "Dark Knight", type: "def", val: 10, cost: 0, img: "knights/dark_knight.png" },
    { name: "Secret Agent 12", type: "skl", val: 0, cost: 0, img: "agents/secret_agent_12.png", effect: "miss" },
    { name: "Blazing Colt", type: "atk", val: 10, cost: 1, img: "horse/blazing_colt.png" },
    { name: "Damned Knight", type: "def", val: 15, cost: 1, img: "knights/damned_knight.png" },
    { name: "Angelic Stallion", type: "atk", val: 20, cost: 3, img: "horse/angelic_stallion.png" },
    { name: "Dark Knight", type: "def", val: 10, cost: 0, img: "knights/dark_knight.png" },
    { name: "Dark Knight", type: "def", val: 10, cost: 0, img: "knights/dark_knight.png" }
];

// --- STARTUP & INFINITE RESET ---
function startTutorial() {
    isTutorial = true;
    tutStep = 1;
    
    
    // Direct style manipulation (the "Hammer" approach)
    document.getElementById('btn-menu').style.display = 'none'; 


    // 1. CLONE THE DECK (Fixes the "no cards on second play" bug)
    currentTutDeck = JSON.parse(JSON.stringify(TUT_MASTER_DECK));

    // 2. UI RESET
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('rules-menu').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('top-bar').classList.remove('hidden');
    document.getElementById('tutorial-overlay').classList.add('hidden'); // Clear old messages
    
    // 3. GAME STATE RESET
    pHand = []; aiHand = []; 
    pField = [null,null,null]; aiField = [null,null,null];
    pHP = 60; aiHP = 60;
    sacrifices = []; selectedIdx = null;
    actions = 0; discarded = false;
    isProcessing = false;

    // 4. BOARD CLEANUP
    document.getElementById('hand').innerHTML = '';
    document.getElementById('ai-hand').innerHTML = '';
    document.getElementById('game-log').innerHTML = '';
    for(let i=0; i<3; i++) {
        document.getElementById(`p-${i}`).innerHTML = '';
        document.getElementById(`ai-${i}`).innerHTML = '';
        document.getElementById(`p-${i}`).classList.remove('highlight');
    }
    render();

    // 5. STATS RESET
    stats = { 
        atkDmgGiven: 0, atkDmgTaken: 0, 
        skillDmgGiven: 0, skillDmgTaken: 0,
        defDmgGiven: 0, defDmgTaken: 0,
        skillsUsed: 0, sacrifices: 0, 
        startTime: Date.now(), endTime: 0 
    };
    
    document.getElementById('btn-end').disabled = true;
    document.getElementById('btn-discard').disabled = true;

    // Show first message
    showTutMsg("Welcome to Crown The King. To start you will draw 3 cards.", true);
}

function showTutMsg(msg, showBtn) {
    const box = document.getElementById('tutorial-overlay');
    const txt = document.getElementById('tut-text');
    const btn = document.getElementById('tut-btn');
    box.classList.remove('hidden');
    txt.innerText = msg;
    if(showBtn) btn.classList.remove('hidden');
    else btn.classList.add('hidden');
}

function tutorialSelectCard(index) {
    const card = pHand[index];
    if (!card) return;
    if (tutStep === 6 && card.name === "Damned Knight") {
        showTutMsg("In order to play a Defense 15 you must sacrifice 1 card. Sacrifice your Defense 10 and play your Defense 15 in the center.", false);
        tutStep = 7;
    }
    if (tutStep === 8 && card.name === "Blazing Colt") {
        showTutMsg("Sacrifice your Attack 10 on the field and play your card in the right column.", false);
        tutStep = 9;
    }
    if (tutStep === 13 && card.name === "Angelic Stallion") {
        showTutMsg("Sacrifice all of your cards to play him in your opponent’s open column.", false);
    }
}

async function nextTutorialStep() {
    const btn = document.getElementById('tut-btn');
    btn.classList.add('hidden'); 
    
    if (tutStep === 1) {
        for(let i=0; i<3; i++) {
            let card = currentTutDeck.shift(); // Use cloned deck
            card.animState = 'entering';
            pHand.push(card);
            render(); await sleep(400);
            card.animState = 'flipping';
            render(); await sleep(400);
            card.animState = null; render();
        }
        showTutMsg("Since there is nothing on the board, you may summon 1 Attack 10 card for free.", false);
        tutStep = 2;
    }
    else if (tutStep === 11) {
        showTutMsg("It is now your turn.", false);
        for(let i=0; i<3; i++) {
            let card = currentTutDeck.shift();
            card.animState = 'entering';
            pHand.push(card);
            render(); await sleep(400);
            card.animState = 'flipping';
            render(); await sleep(400);
            card.animState = null; render();
        }
        showTutMsg("You've drawn a powerful card. Attack 20 cards must sacrifice 3 cards in order to summon.", false);
        await sleep(6000); 
        showTutMsg("Play a Defense 10, remember they are free, in your open column.", false);
        tutStep = 12;
    }
}

function tutorialClickSlot(col) {
    const card = pHand[selectedIdx];
    if (!card) return;

    if (tutStep === 2) {
        if (card.name !== "Blazing Colt") { alert("Select the Attack 10 Card."); return; }
        if (col !== 0) { alert("Play this in the Left Column."); return; }
        executeTutPlay(col);
        showTutMsg("You get 2 summons per turn. Play your Defense 10 card. They are always free to play.", false);
        tutStep = 3; 
        return;
    }
    if (tutStep === 3) {
        if (card.name !== "Dark Knight") { alert("Select the Defense 10 Card."); return; }
        if (col !== 2) { alert("Play this in the Right Column."); return; }
        executeTutPlay(col);
        showTutMsg("You are now prepared to attack. Your attack cards will always attack automatically at the end of your opponent’s turn. End your turn.", false);
        document.getElementById('btn-end').disabled = false;
        tutStep = 4;
        return;
    }
    if (tutStep === 7) {
        if (card.name !== "Damned Knight") { alert("Select the Defense 15 Card."); return; }
        let def10Index = pField.findIndex(c => c && c.name === "Dark Knight");
        if (sacrifices.length !== 1) { toggleSac(col); return; } 
        if (!sacrifices.includes(def10Index)) { alert("You must sacrifice the Defense 10 card."); sacrifices = []; render(); return; }
        if (col !== 1) { alert("Play this in the Center Column."); return; }
        executeTutPlay(col);
        showTutMsg("Now select your Attack 10 in your hand. Since there are cards on the field, it is no longer free to play.", false);
        tutStep = 8; 
        return;
    }
    if (tutStep === 9) {
        if (card.name !== "Blazing Colt") { alert("Select the Attack 10 Card."); return; }
        let atk10Index = pField.findIndex(c => c && c.name === "Blazing Colt");
        if (sacrifices.length !== 1) { toggleSac(col); return; }
        if (!sacrifices.includes(atk10Index)) { alert("Sacrifice your Attack 10 on the field."); sacrifices = []; render(); return; }
        if (col !== 2) { alert("Play in the Right Column."); return; }
        executeTutPlay(col);
        showTutMsg("Discard this skill card, maybe you can farm something better.", false);
        document.getElementById('btn-discard').disabled = false;
        tutStep = 10;
        return;
    }
    if (tutStep === 12) {
        if (card.name !== "Dark Knight") { alert("Play a Defense 10 card."); return; }
        if (col !== 0) { alert("Play in the Left Column."); return; }
        executeTutPlay(col);
        showTutMsg("Good, now select your Angelic Stallion.", false);
        tutStep = 13;
        return;
    }
    if (tutStep === 13) {
        if (card.name !== "Angelic Stallion") { alert("Select the Angelic Stallion."); return; }
        if (sacrifices.length < 3) { toggleSac(col); return; }
        if (col !== 2) { alert("Play in the Right Column."); return; }
        executeTutPlay(col);
        showTutMsg("This concludes the tutorial setup. End your turn to watch the finale.", false);
        document.getElementById('btn-end').disabled = false;
        tutStep = 14;
    }
}

async function executeTutPlay(col) {
    const cardElem = document.querySelector(`.card[data-index='${selectedIdx}']`);
    const slotElem = document.getElementById(`p-${col}`);
    if (cardElem && slotElem) await flyCard(cardElem, slotElem);
    sacrifices.forEach(s => pField[s] = null);
    let card = pHand.splice(selectedIdx, 1)[0];
    card.charging = true; 
    pField[col] = card;
    selectedIdx = null; sacrifices = [];
    render();
}

function tutorialDiscard() {
    if (tutStep === 10) {
        if (pHand[selectedIdx].type !== 'skl') { alert("Select the Skill card."); return; }
        let c = pHand.splice(selectedIdx, 1)[0];
        selectedIdx = null; discarded = true; render();
        showTutMsg("You have successfully defended against an attack. Now end your turn.", false);
        document.getElementById('btn-end').disabled = false;
    }
}

async function tutorialEndTurn() {
    document.getElementById('btn-end').disabled = true;

    if (tutStep === 4) {
        showTutMsg("Your opponent must now prepare to defend against your attack.", false);
        await sleep(2000);
        aiField[1] = { name: "Blazing Colt", type: "atk", val: 10, img: "horse/blazing_colt.png", charging: true };
        addToLog("AI summoned Blazing Colt", "ai");
        render(); await sleep(1500); 

        aiField[0] = { name: "Dark Knight", type: "def", val: 10, img: "knights/dark_knight.png" };
        addToLog("AI summoned Dark Knight", "ai");
        render(); await sleep(1500); 

        pField.forEach(c => { if(c) c.charging = false; }); 
        await resolveCombat(pField, aiField, false);
        render();

        showTutMsg("Your opponent successfully defended...", false);
        for(let i=0; i<2; i++) {
            let card = currentTutDeck.shift();
            card.animState = 'entering';
            pHand.push(card);
            render(); await sleep(400);
            card.animState = 'flipping';
            render(); await sleep(400);
            card.animState = null; render();
        }
        showTutMsg("Now you are wide open. If you don't defend, you will take damage. Select your Defense 15 card.", false);
        tutStep = 6; 
        return;
    }

    if (tutStep === 10) {
        aiField[2] = { name: "Queen's Mirror", type: "skl", effect: "reflect", img: "knights/queens_mirror.png", revealed: false };
        addToLog("AI set a card Face Down", "ai");
        render(); await sleep(1000);
        showTutMsg("An open column does not mean a safe column.", false);
        await sleep(2000);
        aiField.forEach(c => { if(c) c.charging = false; });
        await resolveCombat(aiField, pField, true); 
        render();
        pField.forEach(c => { if(c) c.charging = false; });
        await resolveCombat(pField, aiField, false);
        render();
        showTutMsg("Notice the opponent took damage. Attacking or defending against a higher level card results in piercing damage.", true);
        tutStep = 11; 
    }

    if (tutStep === 14) {
        pField.forEach(c => { if(c) c.charging = false; });
        await resolveCombat(pField, aiField, false); 
        render();
        alert("The rest you learn on the battlefield.");
        // COMPLETE CLEANUP
        document.getElementById('tutorial-overlay').classList.add('hidden');
        quitToTitle();
        isTutorial = false;
    }
}
