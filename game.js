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

// Skin Logic
let currentSkinIdx = 0;
const skins = [
    {icon: "🔥", color: "#f97316"}, {icon: "💎", color: "#06b6d4"},
    {icon: "🌈", color: "#a855f7"}, {icon: "⚡", color: "#fbbf24"}, {icon: "💀", color: "#94a3b8"}
];

document.querySelectorAll('.skin-item').forEach(btn => {
    btn.onclick = (e) => {
        e.stopPropagation();
        currentSkinIdx = parseInt(btn.getAttribute('data-idx'));
        document.querySelectorAll('.skin-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    };
});

// Game Values - BALANCED
let player = { x: 80, y: 0, r: 24, vy: 0, trail: [] };
let pipes = [], stars = [], score = 0, combo = 0, running = false, lastTime = 0;
let speed = 3.5, gravity = 0.35, jump = -6.5;

// Init Stars
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

function showMessage(txt) {
    const m = document.createElement('div'); m.className = 'poper'; m.textContent = txt;
    m.style.left = '50%'; m.style.top = '40%'; document.body.appendChild(m);
    setTimeout(() => m.remove(), 800);
}

function start() {
    running = true; score = 0; combo = 0; pipes = []; player.trail = [];
    player.y = H/2; player.vy = 0; speed = 3.5;
    scoreEl.textContent = "0"; overlay.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawn() {
    let gap = Math.max(160, 220 - (score * 1.5)); // רווח גדול יותר שנסגר לאט יותר
    let center = Math.random() * (H - gap - 160) + 80 + gap/2;
    pipes.push({ x: W, top: center-gap/2, bot: center+gap/2, done: false, color: skins[currentSkinIdx].color });
}

function loop(t) {
    if (!running) return;
    let dt = t - lastTime; if (dt > 100) dt = 16; lastTime = t;

    // רקע כחול עמוק יפה
    ctx.fillStyle = "#0b1220"; ctx.fillRect(0, 0, W, H);
    
    // כוכבים זזים
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    stars.forEach(s => {
        s.x -= speed * 0.2; if(s.x < 0) s.x = W;
        ctx.fillRect(s.x, s.y, s.s, s.s);
    });

    player.vy += gravity;
    player.y += player.vy;

    if (t % 1300 < 20) spawn();

    player.trail.push({y: player.y});
    if(player.trail.length > 5) player.trail.shift();
    player.trail.forEach((pos, i) => {
        ctx.globalAlpha = i / 15; ctx.font = (22 + i*2) + "px Arial";
        ctx.fillText(skins[currentSkinIdx].icon, player.x - (5-i)*6, pos.y);
    });
    ctx.globalAlpha = 1;

    for(let i=pipes.length-1; i>=0; i--) {
        let p = pipes[i]; p.x -= speed;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, 0, 60, p.top);
        ctx.fillRect(p.x, p.bot, 60, H-p.bot);

        if(!p.done && p.x < player.x) {
            p.done = true; score++; combo++; scoreEl.textContent = score;
            if(score % 5 === 0) speed += 0.2; // עליה איטית במהירות
            if(combo === 5) showMessage("GREAT! ✨");
            if(combo === 15) showMessage("UNSTOPPABLE! 🔥");
        }
        // Collision (נשאר מדויק)
        if(player.x+18 > p.x && player.x-18 < p.x+60) {
            if(player.y-18 < p.top || player.y+18 > p.bot) die();
        }
        if(p.x < -70) pipes.splice(i, 1);
    }

    if(player.y > H || player.y < 0) die();

    ctx.font = "45px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if(combo > 10) {
        ctx.strokeStyle = skins[currentSkinIdx].color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(player.x, player.y, 32, 0, 7); ctx.stroke();
    }
    ctx.fillText(skins[currentSkinIdx].icon, player.x, player.y);

    requestAnimationFrame(loop);
}

function die() {
    running = false; overlay.style.display = 'flex';
    if(score > 0) db.collection('scores').add({ name: playerNameInput.value || "Legend", score: score, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    loadLeaderboard();
}

window.addEventListener('mousedown', () => { if (overlay.style.display === 'none') { player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); } });
window.addEventListener('touchstart', (e) => { 
    if (overlay.style.display === 'none') { e.preventDefault(); player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); }
}, { passive: false });

startBtn.onclick = (e) => { e.stopPropagation(); start(); };
playerNameInput.onclick = (e) => e.stopPropagation();

loadLeaderboard();
