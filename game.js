// --- Firebase Config ---
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
function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
window.addEventListener('resize', resize);
resize();

const scoreEl = document.getElementById('score'), highEl = document.getElementById('high'), overlay = document.getElementById('overlay'), 
      retryBtn = document.getElementById('retry'), playerNameInput = document.getElementById('playerName'), 
      scoresList = document.getElementById('scoresList'), shieldStatus = document.getElementById('shieldStatus'), 
      shareWA = document.getElementById('shareWA'), shareTG = document.getElementById('shareTG');

// אופטימיזציה לתמונה: מציירים לעיגול פעם אחת בלבד
const playerImgRaw = new Image(); playerImgRaw.src = 'me.png.JPG';
const playerCanvas = document.createElement('canvas');
const pCtx = playerCanvas.getContext('2d');
let imagePrepared = false;

playerImgRaw.onload = () => {
    playerCanvas.width = 100; playerCanvas.height = 100;
    pCtx.beginPath(); pCtx.arc(50, 50, 50, 0, Math.PI*2); pCtx.clip();
    pCtx.drawImage(playerImgRaw, 0, 0, 100, 100);
    imagePrepared = true;
};

const jumpSound = new Audio('jump.mp3.wav');
jumpSound.preload = 'auto';

let high = parseInt(localStorage.getItem('onetap_high')||'0');
highEl.textContent = 'High: ' + high;

let player = { x: 50, y: 0, r: 25, vy: 0, angle: 0, hasShield: false };
let gravity = 0.4, jump = -7, pipes = [], items = [], particles = [], score = 0, running = false, 
    currentSpeed = 3.5, spawnTimer = 0, lastTime = 0, level = 1, sloMo = 1;

async function loadLeaderboard() {
    try {
        const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let html = '', medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
        let i = 0;
        snap.forEach(doc => { html += `<p>${medals[i++] || '🏅'} ${doc.data().name}: ${doc.data().score}</p>`; });
        scoresList.innerHTML = html || 'No scores yet!';
    } catch (e) { console.log(e); }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 6; i++) { // פחות חלקיקים למניעת לאג
        particles.push({ x: x, y: y, vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10, life: 1.0, color: color });
    }
}

function start() {
    running = true; score = 0; level = 1; pipes = []; items = []; particles = [];
    player.y = H / 2; player.vy = 0; player.hasShield = false;
    currentSpeed = 3.5; scoreEl.textContent = "0"; overlay.style.display = 'none';
    shareWA.style.display = 'none'; shareTG.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnObject() {
    let gap = Math.max(150, 260 - (score * 2));
    let center = Math.random() * (H - gap - 120) + 60 + gap/2;
    pipes.push({ x: W, topH: center-gap/2, botY: center+gap/2, passed: false, color: `hsl(${score * 15 % 360}, 70%, 50%)` });
    if (Math.random() > 0.8) {
        items.push({ x: W + 100, y: center + (Math.random()-0.5)*80, r: 15, type: Math.random() > 0.9 ? 'shield' : 'coin' });
    }
}

function loop(timestamp) {
    if (!running) return;
    let dt = timestamp - lastTime;
    if (dt > 100) dt = 16; // הגבלת קפיצת זמן במקרה של תקיעה
    lastTime = timestamp;

    let moveStep = (dt / 16) * sloMo;

    // רקע פשוט ללא חישובים כבדים
    ctx.fillStyle = "#0b1220";
    ctx.fillRect(0, 0, W, H);

    currentSpeed = 3.5 + (score * 0.05);
    spawnTimer += dt * sloMo;
    if (spawnTimer > 1500) { spawnTimer = 0; spawnObject(); }

    player.vy += gravity * moveStep;
    player.y += player.vy * moveStep;
    player.angle = player.vy * 0.1;

    // ציור מכשולים ללא צללים (ShadowBlur = 0)
    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i]; p.x -= currentSpeed * moveStep;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, 0, 60, p.topH);
        ctx.fillRect(p.x, p.botY, 60, H - p.botY);

        if (!p.passed && p.x < player.x) { 
            p.passed = true; score++; scoreEl.textContent = score; 
            if (score % 10 === 0) level++;
        }
        
        if (player.x + player.r > p.x && player.x - player.r < p.x + 60) {
            if (player.y - player.r < p.topH || player.y + player.r > p.botY) {
                if (player.hasShield) { player.hasShield = false; shieldStatus.textContent = ""; pipes.splice(i, 1); }
                else gameOver();
            }
        }
        if (p.x < -70) pipes.splice(i, 1);
    }

    // פריטים וחלקיקים
    for (let i = items.length - 1; i >= 0; i--) {
        let it = items[i]; it.x -= currentSpeed * moveStep;
        ctx.fillStyle = it.type === 'shield' ? '#38bdf8' : '#fbbf24';
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI*2); ctx.fill();
        if (Math.hypot(player.x-it.x, player.y-it.y) < player.r + it.r) {
            createParticles(it.x, it.y, ctx.fillStyle);
            if (it.type === 'shield') { player.hasShield = true; shieldStatus.textContent = "🛡️ SHIELD"; }
            else score += 5;
            items.splice(i, 1);
        }
        if (it.x < -50) items.splice(i, 1);
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.03;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life; ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 3, 3);
    }
    ctx.globalAlpha = 1;

    if (player.y > H || player.y < 0) gameOver();

    // ציור שחקן אופטימלי (מתוך ה-Canvas המוכן מראש)
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    if (imagePrepared) {
        ctx.drawImage(playerCanvas, -player.r, -player.r, player.r*2, player.r*2);
    } else {
        ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI*2); ctx.fill();
    }
    if (player.hasShield) { ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4; ctx.stroke(); }
    ctx.restore();

    requestAnimationFrame(loop);
}

function gameOver() {
    running = false;
    overlay.style.display = 'flex';
    document.getElementById('gameover').textContent = "SCORE: " + score;
    db.collection('scores').add({ name: playerNameInput.value || "Legend", score: score, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    loadLeaderboard();
    shareWA.style.display = 'block'; shareTG.style.display = 'block';
}

shareWA.onclick = () => { window.open(`https://wa.me/?text=${encodeURIComponent('הגעתי ל-'+score+' נקודות! '+window.location.href)}`, '_blank'); };
shareTG.onclick = () => { window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('הגעתי ל-'+score+' נקודות!')}`, '_blank'); };

const inputs = ['playerName','retry','shareWA','shareTG'];
window.addEventListener('mousedown', (e) => { 
    if (inputs.includes(e.target.id)) return;
    if(running) { player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); }
});
window.addEventListener('touchstart', (e) => { 
    if (inputs.includes(e.target.id)) return;
    if(running) { e.preventDefault(); player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); }
}, { passive: false });

retryBtn.onclick = () => { if (!running) start(); };
loadLeaderboard();
