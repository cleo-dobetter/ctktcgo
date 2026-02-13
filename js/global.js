// ==========================================
// js/globals.js - The Single Source of Truth
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
    { id: "miss", name: "Secret Agent 12", costPoints: 1, limit: 3, img: "agents/secret_agent_12.png", effect: "miss" },
    { id: "reflect", name: "Queen's Mirror", costPoints: 1, limit: 3, img: "knights/queens_mirror.png", effect: "reflect" },
    { id: "breakd", name: "Castle Breaker", costPoints: 2, limit: 3, img: "og/castle_breaker.png", effect: "breakd" },
    { id: "disarm", name: "Stealthy Shinobi", costPoints: 3, limit: 3, img: "ninja/stealthy_shinobi.png", effect: "disarm" }
];

// Global Shared State
let gameMode = 'solo'; 
let myRole = null;     
let isMyTurn = true; 
let isProcessing = false;
let pHP = 60, aiHP = 60;
let pHand = [], aiHand = [], pField = [null, null, null], aiField = [null, null, null];
let pDeck = [], aiDeck = [];
let selectedIdx = null, sacrifices = [], actions = 0, discarded = false;
let playerSkills = { miss: 2, reflect: 2, breakd: 2, disarm: 1 };
