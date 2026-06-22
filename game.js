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
function resize(){ 
    W = canvas.width = window.innerWidth; 
    H = canvas.height = window.innerHeight; 
}
window.addEventListener('resize', resize);
resize();

// UI Elements
const scoreEl = document.getElementById('score'), comboEl = document.getElementById('combo-info'),
      overlay = document.getElementById('overlay'), startBtn = document.getElementById('start-btn'), 
      playerNameInput = document.getElementById('playerName'), scoresList = document.getElementById('scoresList');

const jumpSound = new Audio('jump.mp3.wav');

// Skin System
let currentSkinIdx = 0;
const skins = [
    {icon: "🔥", color: "#f97316"},
    {icon: "💎", color: "#06b6d4"},
    {icon: "🌈", color: "#a855f7"},
    {icon: "⚡", color: "#fbbf24"},
    {icon: "💀", color: "#94a3b8"}
];

window.setSkin = (i) => {
    currentSkinIdx = i;
    document.querySelectorAll('.skin-item').forEach((item, idx) => {
        item.classList.toggle('active', idx === i);
    });
};

// Game State
let player = { x: 90, y: 0, r: 24, vy: 0, trail: [] };
let pipes = [], particles = [], score = 0, combo = 0, running = false, lastTime = 0, speed = 4.5, gravity = 0.45;

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

function showMessage(txt) {
    const m = document.createElement('div');
    m.className = 'poper';
    m.textContent = txt;
    m.style.left = '50%'; m.style.top = '40%';
    document.body.appendChild(m);
    setTimeout(() => m.remove(), 800);
}

function start() {
    running = true; score = 0; combo = 0; pipes = []; particles = []; player.trail = [];
    player.y = H/2; player.vy = 0; speed = 4.8;
    scoreEl.textContent = "0"; comboEl.textContent = "";
    overlay.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawn() {
    let gap = Math.max(140, 210 - (score * 2));
    let center = Math.random() * (H - gap - 150) + 75 + gap/2;
    pipes.push({ x: W, top: center-gap/2, bot: center+gap/2, done: false, color: skins[currentSkinIdx].color });
}

function loop(t) {
    if (!running) return;
    let dt = t - lastTime;
    if (dt > 100) dt = 16;
    lastTime = t;

    // Background
    ctx.fillStyle = "#05080a";
    ctx.fillRect(0, 0, W, H);

    // Physics
    player.vy += gravity;
    player.y += player.vy;

    if (t % 1100 < 20) spawn();

    // Trail Effect (Zero Lag version)
    player.trail.push({y: player.y});
    if(player.trail.length > 6) player.trail.shift();
    player.trail.forEach((pos, i) => {
        ctx.globalAlpha = i / 12;
        ctx.font = (20 + i*2) + "px Arial";
        ctx.fillText(skins[currentSkinIdx].icon, player.x - (6-i)*5, pos.y);
    });
    ctx.globalAlpha = 1;

    // Pipes & Scoring
    for(let i=pipes.length-1; i>=0; i--) {
        let p = pipes[i];
        p.x -= speed;
        
        // Neon Pipes
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.8;
        ctx.fillRect(p.x, 0, 60, p.top);
        ctx.fillRect(p.x, p.bot, 60, H-p.bot);
        ctx.globalAlpha = 1;

        if(!p.done && p.x < player.x) {
            p.done = true; score++; combo++;
            scoreEl.textContent = score;
            
            // Combo & Feedback System
            if(score % 10 === 0) { speed += 0.4; showMessage("LEVEL UP! 🚀"); }
            else if(combo === 5) showMessage("GREAT! ✨");
            else if(combo === 10) showMessage("UNSTOPPABLE! 🔥");
            else if(combo === 20) showMessage("GODLIKE! 👑");
        }
        
        // Optimized Collision
        if(player.x+20 > p.x && player.x-20 < p.x+60) {
            if(player.y-20 < p.top || player.y+20 > p.bot) die();
        }
        if(p.x < -70) pipes.splice(i, 1);
    }

    if(player.y > H || player.y < 0) die();

    // Player with Aura
    ctx.font = "45px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Aura based on combo
    if(combo > 5) {
        ctx.strokeStyle = skins[currentSkinIdx].color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, 30 + Math.sin(t/100)*5, 0, Math.PI*2);
        ctx.stroke();
    }

    ctx.fillText(skins[currentSkinIdx].icon, player.x, player.y);

    requestAnimationFrame(loop);
}

function die() {
    running = false;
    document.body.style.animation = "shake 0.3s";
    setTimeout(() => { document.body.style.animation = ""; overlay.style.display = 'flex'; }, 300);
    
    db.collection('scores').add({
        name: playerNameInput.value || "Anonymous",
        score: score,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    loadLeaderboard();
}

// Input handling
const tap = (e) => {
    if(e.target.closest('#overlay')) return;
    if(running) { player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); }
};
window.addEventListener('mousedown', tap);
window.addEventListener('touchstart', (e) => { if(running) e.preventDefault(); tap(e); }, { passive: false });

startBtn.onclick = start;
loadLeaderboard();
