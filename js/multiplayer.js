const firebaseConfig = { /* YOUR CONFIG HERE */ };
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function startMultiplayerListener() {
    const oppRole = (myRole === 'host') ? 'guest' : 'host';
    const movePath = (oppRole === 'host') ? 'hostMove' : 'guestMove';

    roomRef.child(movePath).on('value', async (snapshot) => {
        const move = snapshot.val();
        if (!move || move.timestamp <= (window.lastMoveTime || 0)) return;
        window.lastMoveTime = move.timestamp;

        if (move.type === 'play') {
            isProcessing = true;
            const cardElem = document.getElementById('ai-hand').children[move.data.cardIndex] || document.getElementById('ai-hand').lastElementChild;
            const slotElem = document.getElementById(`ai-${move.data.slot}`);
            
            if (cardElem && slotElem) await flyCard(cardElem, slotElem);

            let card = aiHand.splice(move.data.cardIndex, 1)[0];
            card.charging = true;
            aiField[move.data.slot] = card;
            isProcessing = false;
            render();
        } 
        else if (move.type === 'endTurn') {
            handleTurnHandover(move.data.resultingHp);
        }
    });
}

function sendMultiplayerMove(type, data) {
    if (gameMode !== 'multi' || !roomRef) return;
    const path = (myRole === 'host') ? 'hostMove' : 'guestMove';
    roomRef.child(path).set({ type, data, timestamp: Date.now() });
}
