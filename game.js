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

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W, H;
function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
window.addEventListener('resize', resize);
resize();

const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const overlay = document.getElementById('overlay');
const retryBtn = document.getElementById('retry');
const playerNameInput = document.getElementById('playerName');
const scoresList = document.getElementById('scoresList');

// טעינת תמונה פעם אחת מראש
const playerImg = new Image();
playerImg.src = 'me.png.JPG'; 
const jumpSound = new Audio('jump.mp3.wav');
jumpSound.preload = 'auto';

let high = parseInt(localStorage.getItem('onetap_high')||'0');
highEl.textContent = 'High: ' + high;

let player = { x: 50, y: 0, r: 25, vy: 0 };
let gravity = 0.4;
let jump = -7;
let pipes = [];
let spawnTimer = 0;
let score = 0;
let running = false;
let currentSpeed = 3;
let lastTime = 0;

// מניעת תקיעות בלחיצה על תיבת הטקסט
playerNameInput.addEventListener('mousedown', (e) => e.stopPropagation());
playerNameInput.addEventListener('touchstart', (e) => e.stopPropagation());

async function loadLeaderboard() {
    try {
        const snapshot = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            html += `<p style="margin:5px 0;">${data.name}: ${data.score}</p>`;
        });
        scoresList.innerHTML = html || 'No scores yet!';
    } catch (e) { console.log(e); }
}

async function saveScore(name, finalScore) {
    if (!name || name.trim() === "") name = "Anonymous";
    if (finalScore === 0) return;
    try {
        await db.collection('scores').add({
            name: name, score: finalScore, timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadLeaderboard();
    } catch (e) { console.log(e); }
}

function playerJump() {
    if (running) {
        player.vy = jump;
        jumpSound.currentTime = 0;
        jumpSound.play().catch(() => {});
    }
}

window.addEventListener('mousedown', (e) => {
    if (e.target === playerNameInput || e.target === retryBtn) return;
    playerJump();
});

window.addEventListener('touchstart', (e) => {
    if (e.target === playerNameInput || e.target === retryBtn) return;
    if (running) e.preventDefault();
    playerJump();
}, { passive: false });

retryBtn.onclick = (e) => {
    e.stopPropagation();
    if (!running) start();
};

function start() {
    running = true;
    score = 0;
    pipes = [];
    player.y = H / 2;
    player.vy = 0;
    player.x = W * 0.2;
    currentSpeed = 3;
    scoreEl.textContent = "Score: 0";
    overlay.style.display = 'none'; 
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnPair() {
    let gap = Math.max(150, 260 - (score * 2));
    const center = Math.random() * (H - gap - 100) + 50 + gap / 2;
    pipes.push({ x: W, topH: center - gap/2, botY: center + gap/2, passed: false, color: `hsl(${Math.random() * 360}, 70%, 50%)` });
}

function loop(timestamp) {
    if (!running) return;

    // חישוב זמן חלק (Delta Time) למניעת קפיצות
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    ctx.clearRect(0, 0, W, H);

    currentSpeed = 3 + (score * 0.1);
    
    spawnTimer += dt;
    if (spawnTimer > 1500) {
        spawnTimer = 0;
        spawnPair();
    }

    player.vy += gravity;
    player.y += player.vy;

    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        p.x -= currentSpeed;

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, 0, 60, p.topH);
        ctx.fillRect(p.x, p.botY, 60, H - p.botY);

        if (!p.passed && p.x < player.x) {
            p.passed = true;
            score++;
            scoreEl.textContent = "Score: " + score;
        }

        if (player.x + player.r > p.x && player.x - player.r < p.x + 60) {
            if (player.y - player.r < p.topH || player.y + player.r > p.botY) gameOver();
        }
        
        // מחיקה יעילה מהזיכרון
        if (p.x < -100) pipes.splice(i, 1);
    }

    if (player.y > H || player.y < 0) gameOver();
    
    // ציור אופטימלי של התמונה
    ctx.save();
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.clip();
    if (playerImg.complete) {
        ctx.drawImage(playerImg, player.x - player.r, player.y - player.r, player.r * 2, player.r * 2);
    } else {
        ctx.fillStyle = '#f59e0b';
        ctx.fill();
    }
    ctx.restore();

    requestAnimationFrame(loop);
}

function gameOver() {
    running = false;
    overlay.style.display = 'flex';
    document.getElementById('gameover').textContent = "Game Over!";
    saveScore(playerNameInput.value, score);
}

loadLeaderboard();
