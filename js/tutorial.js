// ==========================================
// js/tutorial.js - Tutorial System
// ==========================================
let tutStep = 0;
const messages = [
    "Welcome! Let's learn to play. Click NEXT.",
    "These are your horse cards. They take one turn to 'Charge' before attacking.",
    "These are Skill cards. Play them face-down to trap your opponent!",
    "Ready to duel? Click FINISH to start a match."
];

window.startTutorial = function() {
    tutStep = 0;
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('tutorial-overlay').classList.remove('hidden');
    updateTut();
};

window.nextTutorialStep = function() {
    tutStep++;
    if (tutStep < messages.length) {
        updateTut();
    } else {
        window.closeTutorial();
    }
};

window.closeTutorial = function() {
    document.getElementById('tutorial-overlay').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
};

function updateTut() {
    const txt = document.getElementById('tutorial-text');
    if (txt) txt.innerText = messages[tutStep];
}
