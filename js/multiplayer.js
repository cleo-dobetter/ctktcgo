// ==========================================
// js/multiplayer.js - Networking & Firebase
// ==========================================

// 1. FIREBASE CONFIGURATION
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

// Initialize Firebase only once
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// --- GLOBAL EXPOSURE (Makes HTML Lobby Buttons work) ---

window.createRoom = function() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    currentRoomId = code;
    playerRole = 'host';
    
    const codeInput = document.getElementById('room-code');
    const statusTxt = document.getElementById('lobby-status');
    
    if (codeInput) codeInput.value = code;
    if (statusTxt) statusTxt.innerText = "Creating room...";
    
    db.ref('rooms/' + code).set({
        host: { status: 'waiting' },
        guest: { status: 'empty' }
    }).then(() => {
        // Listen for Guest to join
        db.ref('rooms/' + code + '/guest/status').on('value', (snapshot) => {
            if (snapshot.val() === 'joined') {
                if (statusTxt) statusTxt.innerText = "Opponent found! Starting...";
                setTimeout(() => window.startMultiplayerGame(), 1000);
            }
        });
    }).catch(err => {
        console.error("Firebase Create Error:", err);
        if (statusTxt) statusTxt.innerText = "Error creating room.";
    });
};

window.joinRoom = function() {
    const codeInput = document.getElementById('room-code');
    const statusTxt = document.getElementById('lobby-status');
    
    if (!codeInput || codeInput.value.length !== 4) {
        alert("Please enter a 4-digit code.");
        return;
    }

    const code = codeInput.value;
    currentRoomId = code;
    playerRole = 'guest';
    if (statusTxt) statusTxt.innerText = "Joining...";
    
    db.ref('rooms/' + code).once('value', (snapshot) => {
        if (snapshot.exists()) {
            db.ref('rooms/' + code + '/guest').update({ status: 'joined' });
            if (statusTxt) statusTxt.innerText = "Joined! Starting...";
            setTimeout(() => window.startMultiplayerGame(), 1000);
        } else {
            alert("Room not found!");
            if (statusTxt) statusTxt.innerText = "";
        }
    });
};

window.startMultiplayerGame = function() {
    gameMode = 'multi';
    myRole = playerRole; 
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-container').classList.remove('hidden');
    document.getElementById('top-bar').classList.remove('hidden');
    document.getElementById('btn-menu').style.display = 'block';
    
    // Call init from script.js
    if (typeof init === "function") init();
};

// --- NETWORK COMMUNICATION ---

window.sendMultiplayerMove = function(actionType, data) {
    if (gameMode !== 'multi' || !roomRef) return;
    
    const moveData = {
        type: actionType,
        data: data,
        timestamp: Date.now()
    };
    
    const movePath = (myRole === 'host') ? 'hostMove' : 'guestMove';
    roomRef.child(movePath).set(moveData);
};

// Handshake and Listener functions...
async function performMultiplayerHandshake() {
    roomRef = db.ref('rooms/' + currentRoomId);
    const myData = { hand: pHand, deck: pDeck, hp: pHP };
    await roomRef.child(myRole).update(myData);

    const oppRole = (myRole === 'host') ? 'guest' : 'host';
    roomRef.child(oppRole).on('value', (snapshot) => {
        const oppData = snapshot.val();
        if (oppData && oppData.hand) {
            aiHand = oppData.hand;
            aiDeck = oppData.deck;
            aiHP = oppData.hp;
            render();
            roomRef.child(oppRole).off(); 
            startMultiplayerListener();   
        }
    });
}
