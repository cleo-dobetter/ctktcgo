// ==========================================
// js/ai.js - AI Logic
// ==========================================
window.runSoloAI = async function() {
    isProcessing = true;
    
    // AI looks for the first empty slot and plays a card
    let played = false;
    for (let hIdx = 0; hIdx < aiHand.length; hIdx++) {
        for (let slot = 0; slot < 3; slot++) {
            if (aiField[slot] === null) {
                // Logic: Move card from hand to field
                let card = aiHand.splice(hIdx, 1)[0];
                card.charging = true;
                aiField[slot] = card;
                played = true;
                break;
            }
        }
        if (played) break;
    }
    
    await new Promise(r => setTimeout(r, 1000)); // Simulate "Thinking"
    render();
    isProcessing = false;
};
