// ==========================================
// js/tutorial.js - The Full Guided Experience
// ==========================================

let tutorialStep = 0;

const TUTORIAL_DATA = [
    {
        text: "Welcome to the Arena! This guide will teach you the basics of combat. Click NEXT to begin.",
        action: () => { setupTutorialBoard(); }
    },
    {
        text: "This is your HAND. You can have up to 3 cards. Attack cards have a Value and a Cost.",
        action: () => { highlightElement('hand'); }
    },
    {
        text: "To play a card with a COST of 1 or more, you must SACRIFICE a card already on your field.",
        action: () => { highlightElement('p-field'); }
    },
    {
        text: "ATTACK cards (horses) start 'Charging'. They won't strike until the NEXT turn ends.",
        action: () => { /* Visual cue for charging */ }
    },
    {
        text: "SKILL cards (agents) are played face-down. They act as traps to surprise your opponent!",
        action: () => { /* Visual cue for skills */ }
    },
    {
        text: "Ready to try? Let's start a real match. Good luck!",
        action: () => { window.closeTutorial(); window.startGame(); }
    }
];

window.startTutorial = function() {
    tutorialStep = 0;
    isProcessing = true; // Block normal game clicks
    
    const overlay = document.getElementById('tutorial-overlay');
    const startScreen = document.getElementById('start-screen');
    
    if (startScreen) startScreen.classList.add('hidden');
    if (overlay) overlay.classList.remove('hidden');
    
    updateTutorialUI();
};

window.nextTutorialStep = function() {
    tutorialStep++;
    if (tutorialStep < TUTORIAL_DATA.length) {
        updateTutorialUI();
    } else {
        window.closeTutorial();
    }
};

window.closeTutorial = function() {
    const overlay = document.getElementById('tutorial-overlay');
    const startScreen = document.getElementById('start-screen');
    
    if (overlay) overlay.classList.add('hidden');
    if (startScreen) startScreen.classList.remove('hidden');
    
    isProcessing = false;
    tutorialStep = 0;
};

function updateTutorialUI() {
    const step = TUTORIAL_DATA[tutorialStep];
    const textEl = document.getElementById('tutorial-text');
    if (textEl) textEl.innerText = step.text;
    if (step.action) step.action();
}

function setupTutorialBoard() {
    // Force specific cards for teaching
    pHand = [
        { name: "Tutorial Colt", type: "atk", val: 10, cost: 0, img: "horse/blazing_colt.png" },
        { name: "Tutorial Skill", type: "skl", img: "agents/secret_agent_12.png", effect: "miss" }
    ];
    pHP = 60;
    aiHP = 60;
    render(); // Call the render from script.js
}

function highlightElement(id) {
    // Remove previous highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => el.classList.remove('tutorial-highlight'));
    
    const el = document.getElementById(id);
    if (el) el.classList.add('tutorial-highlight');
}
