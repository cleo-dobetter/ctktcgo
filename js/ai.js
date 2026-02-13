async function runSoloAI() {
    // 1. Skill Cleanup (Only if AI has health)
    if (aiHP > 15) {
        for(let i=0; i<3; i++) {
            let c = aiField[i];
            if (c && c.type === 'skl') {
                // Simplified cleanup check
                aiHP -= 5;
                await animateDeath(`ai-${i}`, c.name);
                aiField[i] = null;
            }
        }
    }
    
    // 2. Simple Scoring
    let moves = [];
    aiHand.forEach((card, hIdx) => {
        for(let slot=0; slot<3; slot++) {
            if (aiField[slot] === null) {
                moves.push({ card, hIdx, slot, score: Math.random() * 100 });
            }
        }
    });

    moves.sort((a,b) => b.score - a.score);

    // 3. Execution
    if (moves.length > 0) {
        let best = moves[0];
        isProcessing = true;
        const cardElem = document.getElementById('ai-hand').children[best.hIdx];
        const slotElem = document.getElementById(`ai-${best.slot}`);
        
        if (cardElem && slotElem) await flyCard(cardElem, slotElem);

        let newCard = {...best.card, charging: (best.card.type === 'atk')};
        aiField[best.slot] = newCard;
        aiHand.splice(best.hIdx, 1);
        isProcessing = false;
        render();
    }
}
