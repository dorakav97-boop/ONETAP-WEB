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
      scoresList = document.getElementById('scoresList'), muteBtn = document.getElementById('mute-btn');

const jumpSound = new Audio('jump.mp3.wav');
let isMuted = false;

muteBtn.onclick = (e) => { e.stopPropagation(); isMuted = !isMuted; muteBtn.textContent = isMuted ? "🔇" : "🔊"; };

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

// HARDCORE SETTINGS
let player = { x: 70, y: 0, r: 24, vy: 0, hasShield: false };
let pipes = [], items = [], stars = [], score = 0, running = false, lastTime = 0, speed = 3.5, level = 1;
const gravity = 0.45, jump = -7.5;

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

function start() {
    running = true; score = 0; level = 1; pipes = []; items = [];
    player.y = H / 2; player.vy = 0; player.hasShield = false;
    speed = 3.8; overlay.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawn() {
    let gap = Math.max(135, 220 - (score * 1.5));
    let center = Math.random() * (H - gap - 160) + 80 + gap/2;
    // מכשולים זזים מ-30 נקודות (רמה 4)
    let move = score >= 30 ? Math.min(120, (score-30)*4) : 0;
    pipes.push({ x: W, top: center-gap/2, bot: center+gap/2, done: false, color: `hsl(${score*12}, 60%, 50%)`, move: move, offset: Math.random()*10 });
    if (Math.random() > 0.8) items.push({ x: W + 100, y: center, type: Math.random() > 0.9 ? 'shield' : 'coin' });
}

function loop(t) {
    if (!running) return;
    let dt = t - lastTime; lastTime = t;
    if(dt > 100) dt = 16;

    // Background - Blue Space
    ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    stars.forEach(s => { s.x -= speed * 0.2; if(s.x < 0) s.x = W; ctx.fillRect(s.x, s.y, s.s, s.s); });

    speed = 3.8 + (score * 0.09); // מהירות עולה מהר
    player.vy += gravity; player.y += player.vy;

    if (pipes.length === 0 || pipes[pipes.length-1].x < W - 280) spawn();

    for(let i=pipes.length-1; i>=0; i--) {
        let p = pipes[i]; p.x -= speed;
        let yShift = p.move > 0 ? Math.sin(t/500 + p.offset) * p.move : 0;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, yShift, 60, p.top);
        ctx.fillRect(p.x, p.bot + yShift, 60, H - p.bot - yShift);

        if(!p.done && p.x < player.x) {
            p.done = true; score++; scoreEl.textContent = score;
            if(score % 10 === 0) {
                level++;
                const l = document.createElement('div'); l.className = 'level-up';
                l.textContent = "LEVEL " + level; document.body.appendChild(l);
                setTimeout(()=>l.remove(), 1500);
            }
        }
        if(player.x+18 > p.x && player.x-18 < p.x+60 && (player.y-18 < p.top + yShift || player.y+18 > p.bot + yShift)) {
            if(player.hasShield) { player.hasShield = false; pipes.splice(i, 1); }
            else die();
        }
        if(p.x < -100) pipes.splice(i, 1);
    }

    for(let i=items.length-1; i>=0; i--) {
        let it = items[i]; it.x -= speed;
        ctx.fillStyle = it.type === 'shield' ? '#38bdf8' : '#fbbf24';
        ctx.beginPath(); ctx.arc(it.x, it.y, 15, 0, 7); ctx.fill();
        if(Math.hypot(player.x-it.x, player.y-it.y) < player.r+15) {
            if(it.type === 'shield') player.hasShield = true;
            else score += 5;
            items.splice(i, 1);
        }
        if(it.x < -50) items.splice(i, 1);
    }

    if(player.y > H || player.y < 0) die();

    ctx.font = "45px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(skins[currentSkinIdx], player.x, player.y);
    if(player.hasShield) { ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(player.x, player.y, 32, 0, 7); ctx.stroke(); }
    requestAnimationFrame(loop);
}

function die() {
    running = false; overlay.style.display = 'flex';
    if(score > 0) db.collection('scores').add({ name: playerNameInput.value || "Player", score: score, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    loadLeaderboard();
}

window.addEventListener('mousedown', (e) => { 
    if(overlay.style.display === 'none') { player.vy = jump; if(!isMuted) { jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); } }
});
window.addEventListener('touchstart', (e) => { 
    if(overlay.style.display === 'none') { e.preventDefault(); player.vy = jump; if(!isMuted) { jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); } }
}, { passive: false });

startBtn.onclick = (e) => { e.stopPropagation(); start(); };
playerNameInput.onclick = (e) => e.stopPropagation();
loadLeaderboard();
