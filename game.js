const firebaseConfig = {
  apiKey: "AIzaSyBW-oSotemXbf3rpbHwAp-jFUVB0",
  authDomain: "dor-akav-game.firebaseapp.com",
  projectId: "dor-akav-game",
  storageBucket: "dor-akav-game.firebasestorage.app",
  messagingSenderId: "630792064093",
  appId: "1:630792064093:web:3a7c53b696e86899b8",
  measurementId: "G-LM4P75B50D"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
let W, H;
function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize);
resize();

const scoreEl = document.getElementById('score'), shieldEl = document.getElementById('shieldStatus'), overlay = document.getElementById('overlay'), 
      startBtn = document.getElementById('start-btn'), playerNameInput = document.getElementById('playerName'), 
      scoresList = document.getElementById('scoresList');

const jumpSound = new Audio('jump.mp3.wav');

let currentSkinIdx = 0;
const skins = ["🔥", "💎", "🌈", "⚡", "💀"];

document.querySelectorAll('.skin-item').forEach((btn, i) => {
    btn.onclick = (e) => {
        e.stopPropagation();
        currentSkinIdx = i;
        document.querySelectorAll('.skin-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

// --- החזרת משתני הקושי המקוריים ---
let player = { x: 80, y: 0, r: 24, vy: 0, hasShield: false };
let pipes = [], items = [], stars = [], score = 0, running = false, lastTime = 0, level = 1;
const gravity = 0.4; // הפיזיקה שביקשת
const jump = -7
