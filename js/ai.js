// ==========================================
// js/ai.js - AI Turn Logic
// ==========================================
window.runSoloAI = async function() {
    window.isProcessing = true;
    
    let played = false;
    for (let hIdx = 0; hIdx < window.aiHand.length; hIdx++) {
        for (let slot = 0; slot < 3; slot++) {
            if (window.aiField[slot] === null) {
                let card = window.aiHand.splice(hIdx, 1)[0];
                card.charging = true;
                window.aiField[slot] = card;
                played = true;
                break;
            }
        }
        if (played) break;
    }
    
    await new Promise(r => setTimeout(r, 800));
    window.render();
    window.isProcessing = false;
};
