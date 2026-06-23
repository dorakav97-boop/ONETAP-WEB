const firebaseConfig = {
  apiKey: "AIzaSyBW-oSotemXbf3rpbHwAp-jFUVB0",
  authDomain: "dor-akav-game.firebaseapp.com",
  projectId: "dor-akav-game",
  storageBucket: "dor-akav-game.firebasestorage.app",
  messagingSenderId: "630792064093",
  appId: "1:630792064093:web:3a7c53b696e86899b8",
  measurementId: "G-LM4P75B50D"
};

// אתחול Firebase
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

// פונקציית השתקה
muteBtn.onclick = (e) => {
    e.stopPropagation();
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? "🔇" : "🔊";
};

let currentSkinIdx = 0;
const skins = ["🔥", "💎", "🌈", "⚡", "💀"];

// בחירת סקין
document.querySelectorAll('.skin-item').forEach((btn, i) => {
    btn.onclick = (e) => {
        e.stopPropagation();
        currentSkinIdx = i;
        document.querySelectorAll('.skin-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

// משתני משחק
let player = { x: 70, y: 0, r: 24, vy: 0, hasShield: false };
let pipes = [], items = [], stars = [], score = 0, running = false, lastTime = 0, speed = 3.5, level = 1, sloMo = 1;
const gravity = 0.45, jump = -7.5;

for(let i=0; i<40; i++) stars.push({x: Math.random()*W, y: Math.random()*H, s: Math.random()*2});

// טעינת טבלת שיאים (מתוקן)
async function loadLeaderboard() {
    try {
        const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let html = '';
        snap.forEach((doc, i) => {
            const d = doc.data();
            html += `<div class="score-row"><span>${i===0?'👑':i+1+'.'} ${d.name}</span> <b>${d.score}</b></div>`;
        });
        scoresList.innerHTML = html || "No scores yet!";
    } catch (e) {
        console.error("Firebase Error:", e);
        scoresList.innerHTML = "Error loading...";
    }
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
    let move = score >= 30 ? Math.min(110, (score-30)*4) : 0;
    pipes.push({ x: W, top: center-gap/2, bot: center+gap/2, done: false, color: `hsl(${score*12}, 60%, 50%)`, move: move, offset: Math.random()*10 });
    if (Math.random() > 0.8) items.push({ x: W + 100, y: center, type: Math.random() > 0.9 ? 'shield' : 'coin' });
}

function loop(t) {
    if (!running) return;
    let dt = (t - lastTime) * sloMo;
    lastTime = t;
    if(dt > 100) dt = 16;

    // Background
    ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    stars.forEach(s => { s.x -= speed * 0.2; if(s.x < 0) s.x = W; ctx.fillRect(s.x, s.y, s.s, s.s); });

    speed = 3.8 + (score * 0.09);
    player.vy += gravity; player.y += player.vy;

    if (pipes.length === 0 || pipes[pipes.length-1].x < W - 280) spawn();

    for(let i=pipes.length-1; i>=0; i--) {
        let p = pipes[i]; p.x -= speed * sloMo;
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

    if(player.y > H || player.y < 0) die();

    ctx.font = "45px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(skins[currentSkinIdx], player.x, player.y);
    requestAnimationFrame(loop);
}

function die() {
    running = false;
    overlay.style.display = 'flex';
    const finalName = playerNameInput.value || "Legend";
    if(score > 0) {
        db.collection('scores').add({ name: finalName, score: score, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    }
    loadLeaderboard();
}

// לחיצות על המסך
window.addEventListener('mousedown', (e) => {
    if(overlay.style.display !== 'none') return;
    player.vy = jump; if(!isMuted) { jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); }
});
window.addEventListener('touchstart', (e) => {
    if(overlay.style.display !== 'none') return;
    e.preventDefault();
    player.vy = jump; if(!isMuted) { jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); }
}, { passive: false });

// כפתור התחלה - לוודא שהוא מגיב
startBtn.onclick = (e) => {
    e.stopPropagation();
    start();
};

playerNameInput.onclick = (e) => e.stopPropagation();

// טעינה ראשונית
loadLeaderboard();
