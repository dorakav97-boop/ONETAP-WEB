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

const scoreEl = document.getElementById('score'), overlay = document.getElementById('overlay'), 
      startBtn = document.getElementById('start-btn'), playerNameInput = document.getElementById('playerName'), 
      scoresList = document.getElementById('scoresList');

const jumpSound = new Audio('jump.mp3.wav');

// Skin Selection
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

// Physics - BACK TO ORIGINAL FUN VALUES
let player = { x: 80, y: 0, r: 24, vy: 0 };
let pipes = [], score = 0, running = false, lastTime = 0;
const gravity = 0.4; 
const jump = -7;
const speed = 3;

async function loadLeaderboard() {
    try {
        const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let html = '';
        snap.forEach((doc, i) => {
            const d = doc.data();
            html += `<div class="score-row"><span>${i===0?'👑':i+1+'.'} ${d.name}</span> <b>${d.score}</b></div>`;
        });
        scoresList.innerHTML = html;
    } catch (e) {}
}

function start() {
    running = true; score = 0; pipes = [];
    player.y = H/2; player.vy = 0;
    scoreEl.textContent = "0";
    overlay.style.display = 'none';
    requestAnimationFrame(loop);
}

function spawn() {
    const gap = 220; // רווח ענקי ונוח תמיד
    const center = Math.random() * (H - gap - 150) + 75 + gap/2;
    pipes.push({ x: W, top: center-gap/2, bot: center+gap/2, done: false });
}

function loop(t) {
    if (!running) return;
    
    // Background - FORCED BLUE
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, W, H);

    player.vy += gravity;
    player.y += player.vy;

    // Spawn pipes
    if (pipes.length === 0 || pipes[pipes.length-1].x < W - 250) spawn();

    for(let i=pipes.length-1; i>=0; i--) {
        let p = pipes[i];
        p.x -= speed;
        
        ctx.fillStyle = "#10b981";
        ctx.fillRect(p.x, 0, 60, p.top);
        ctx.fillRect(p.x, p.bot, 60, H - p.bot);

        if(!p.done && p.x < player.x) {
            p.done = true; score++; scoreEl.textContent = score;
        }
        
        if(player.x+18 > p.x && player.x-18 < p.x+60) {
            if(player.y-18 < p.top || player.y+18 > p.bot) die();
        }
        if(p.x < -100) pipes.splice(i, 1);
    }

    if(player.y > H || player.y < 0) die();

    // Draw Player (Emoji Skin)
    ctx.font = "45px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(skins[currentSkinIdx], player.x, player.y);

    requestAnimationFrame(loop);
}

function die() {
    running = false;
    overlay.style.display = 'flex';
    if(score > 0) db.collection('scores').add({ 
        name: playerNameInput.value || "Player", 
        score: score, 
        timestamp: firebase.firestore.FieldValue.serverTimestamp() 
    });
    loadLeaderboard();
}

// Input
window.addEventListener('mousedown', (e) => {
    if (overlay.style.display !== 'none') return;
    player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{});
});
window.addEventListener('touchstart', (e) => {
    if (overlay.style.display !== 'none') return;
    e.preventDefault();
    player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{});
}, { passive: false });

startBtn.onclick = (e) => { e.stopPropagation(); start(); };
loadLeaderboard();
