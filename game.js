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

// ORIGINAL CORE SETTINGS
let player = { x: 80, y: 0, r: 24, vy: 0, hasShield: false };
let pipes = [], items = [], stars = [], score = 0, running = false, lastTime = 0, speed = 3, level = 1;
const gravity = 0.4, jump = -7;

for(let i=0; i<40; i++) stars.push({x: Math.random()*W, y: Math.random()*H, s: Math.random()*2});

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

function showLevelMsg(txt) {
    const d = document.createElement('div'); d.className = 'level-msg';
    d.textContent = txt; document.body.appendChild(d);
    setTimeout(() => d.remove(), 1500);
}

function start() {
    running = true; score = 0; level = 1; pipes = []; items = [];
    player.y = H/2; player.vy = 0; player.hasShield = false;
    speed = 3; scoreEl.textContent = "0"; shieldEl.textContent = "";
    overlay.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnObject() {
    // Gap shrinks from 250 down to 140 based on score (Like original)
    let currentGap = Math.max(140, 250 - (score * 2));
    let center = Math.random() * (H - currentGap - 160) + 80 + currentGap/2;
    pipes.push({ x: W, top: center - currentGap/2, bot: center + currentGap/2, done: false, color: `hsl(${score*15}, 60%, 50%)` });
    
    // Spawn Coins or Shields
    if (Math.random() > 0.7) {
        items.push({ x: W + 150, y: center, type: Math.random() > 0.9 ? 'shield' : 'coin' });
    }
}

function loop(t) {
    if (!running) return;
    let dt = t - lastTime; lastTime = t;
    if(dt > 100) dt = 16;

    // Background
    ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    stars.forEach(s => {
        s.x -= speed * 0.2; if(s.x < 0) s.x = W;
        ctx.fillRect(s.x, s.y, s.s, s.s);
    });

    // Difficulty increases every point (Like original)
    speed = 3 + (score * 0.1);

    player.vy += gravity;
    player.y += player.vy;

    // Spawning logic
    if (pipes.length === 0 || pipes[pipes.length-1].x < W - 280) spawnObject();

    // Pipes logic
    for(let i=pipes.length-1; i>=0; i--) {
        let p = pipes[i]; p.x -= speed;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, 0, 60, p.top);
        ctx.fillRect(p.x, p.bot, 60, H - p.bot);

        if(!p.done && p.x < player.x) {
            p.done = true; score++; scoreEl.textContent = score;
            if(score % 10 === 0) { level++; showLevelMsg("LEVEL " + level); }
        }
        if(player.x+18 > p.x && player.x-18 < p.x+60 && (player.y-18 < p.top || player.y+18 > p.bot)) {
            if(player.hasShield) { player.hasShield = false; shieldEl.textContent = ""; pipes.splice(i, 1); }
            else die();
        }
        if(p.x < -100) pipes.splice(i, 1);
    }

    // Items logic
    for(let i=items.length-1; i>=0; i--) {
        let it = items[i]; it.x -= speed;
        ctx.fillStyle = it.type === 'shield' ? '#38bdf8' : '#fbbf24';
        ctx.beginPath(); ctx.arc(it.x, it.y, 15, 0, 7); ctx.fill();
        if(Math.hypot(player.x-it.x, player.y-it.y) < player.r+15) {
            if(it.type === 'shield') { player.hasShield = true; shieldEl.textContent = "🛡️ SHIELD ACTIVE"; }
            else { score += 5; scoreEl.textContent = score; showLevelMsg("+5"); }
            items.splice(i, 1);
        }
        if(it.x < -50) items.splice(i, 1);
    }

    if(player.y > H || player.y < 0) die();

    // Player
    ctx.font = "45px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(skins[currentSkinIdx], player.x, player.y);
    if(player.hasShield) { ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(player.x, player.y, 32, 0, 7); ctx.stroke(); }
    
    requestAnimationFrame(loop);
}

function die() {
    running = false; overlay.style.display = 'flex';
    if(score > 0) db.collection('scores').add({ name: playerNameInput.value || "Legend", score: score, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    loadLeaderboard();
}

window.addEventListener('mousedown', (e) => { if(overlay.style.display === 'none') { player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); } });
window.addEventListener('touchstart', (e) => { if(overlay.style.display === 'none') { e.preventDefault(); player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); } }, { passive: false });
startBtn.onclick = (e) => { e.stopPropagation(); start(); };
playerNameInput.onclick = (e) => e.stopPropagation();
loadLeaderboard();
