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

const scoreEl = document.getElementById('score'), highEl = document.getElementById('high'), overlay = document.getElementById('overlay'), 
      retryBtn = document.getElementById('retry'), playerNameInput = document.getElementById('playerName'), 
      scoresList = document.getElementById('scoresList'), shieldStatus = document.getElementById('shieldStatus'), shareBtn = document.getElementById('shareBtn');

const playerImg = new Image(); playerImg.src = 'me.png.JPG'; 
const jumpSound = new Audio('jump.mp3.wav');

let high = parseInt(localStorage.getItem('onetap_high')||'0');
highEl.textContent = 'High: ' + high;

let player = { x: 50, y: 0, r: 25, vy: 0, angle: 0, hasShield: false };
let gravity = 0.4, jump = -7, pipes = [], items = [], score = 0, running = false, currentSpeed = 3, spawnTimer = 0, lastTime = 0;

playerNameInput.addEventListener('mousedown', (e) => e.stopPropagation());
playerNameInput.addEventListener('touchstart', (e) => e.stopPropagation());

async function loadLeaderboard() {
    try {
        const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let html = '', medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
        let i = 0;
        snap.forEach(doc => {
            let d = doc.data();
            html += `<p>${medals[i] || '🏅'} ${d.name}: ${d.score}</p>`;
            i++;
        });
        scoresList.innerHTML = html || 'No scores yet!';
    } catch (e) { console.log(e); }
}

async function saveScore(name, s) {
    if (s === 0) return;
    await db.collection('scores').add({ name: name || "Anonymous", score: s, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    loadLeaderboard();
}

function start() {
    running = true; score = 0; pipes = []; items = [];
    player.y = H / 2; player.vy = 0; player.hasShield = false;
    currentSpeed = 3; scoreEl.textContent = "Score: 0";
    shieldStatus.textContent = ""; overlay.style.display = 'none';
    shareBtn.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnObject() {
    let gap = Math.max(150, 260 - (score * 2));
    let center = Math.random() * (H - gap - 100) + 50 + gap/2;
    pipes.push({ x: W, topH: center - gap/2, botY: center + gap/2, passed: false, color: `hsl(${score * 10 % 360}, 70%, 50%)` });
    
    // סיכוי להופעת מטבע או מגן
    if (Math.random() > 0.7) {
        items.push({ x: W + 150, y: center, r: 15, type: Math.random() > 0.9 ? 'shield' : 'coin' });
    }
}

function loop(timestamp) {
    if (!running) return;
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    
    // רקע דינמי שמשתנה מכחול לסגול-שחור
    let lightness = Math.max(5, 50 - (score * 0.5)); // הופך כהה יותר
    let colorHue = 210 + (score * 0.5); // משנה גוון מכחול לסגול
    ctx.fillStyle = `hsl(${colorHue}, 50%, ${lightness}%)`;
    ctx.fillRect(0, 0, W, H);

    // הוספת "כוכבים" קטנים אם זה לילה (ניקוד גבוה מ-20)
    if (score > 20) {
        ctx.fillStyle = "white";
        for(let i=0; i<10; i++) {
            ctx.fillRect((Math.sin(i*500)*W), (Math.cos(i*1000)*H), 2, 2);
        }
    }

    currentSpeed = 3 + (score * 0.05);
    spawnTimer += dt;
    if (spawnTimer > 1500) { spawnTimer = 0; spawnObject(); }

    player.vy += gravity;
    player.y += player.vy;
    player.angle = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, player.vy * 0.1));

    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i]; p.x -= currentSpeed;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, 0, 60, p.topH);
        ctx.fillRect(p.x, p.botY, 60, H - p.botY);

        if (!p.passed && p.x < player.x) { p.passed = true; score++; scoreEl.textContent = "Score: " + score; }
        
        if (player.x + player.r > p.x && player.x - player.r < p.x + 60) {
            if (player.y - player.r < p.topH || player.y + player.r > p.botY) {
                if (player.hasShield) { player.hasShield = false; shieldStatus.textContent = ""; pipes.splice(i, 1); }
                else gameOver();
            }
        }
        if (p.x < -100) pipes.splice(i, 1);
    }

    for (let i = items.length - 1; i >= 0; i--) {
        let it = items[i]; it.x -= currentSpeed;
        ctx.fillStyle = it.type === 'shield' ? '#38bdf8' : '#fbbf24';
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI*2); ctx.fill();
        
        let dx = player.x - it.x, dy = player.y - it.y;
        if (Math.sqrt(dx*dx + dy*dy) < player.r + it.r) {
            if (it.type === 'shield') { player.hasShield = true; shieldStatus.textContent = "🛡️ SHIELD ACTIVE"; }
            else { score += 5; scoreEl.textContent = "Score: " + score; }
            items.splice(i, 1);
        }
    }

    if (player.y > H || player.y < 0) gameOver();

    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.rotate(player.angle);
    ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.clip();
    if (playerImg.complete) ctx.drawImage(playerImg, -player.r, -player.r, player.r * 2, player.r * 2);
    if (player.hasShield) { ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 5; ctx.stroke(); }
    ctx.restore();

    requestAnimationFrame(loop);
}

function gameOver() {
    running = false;
    document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);
    overlay.style.display = 'flex';
    document.getElementById('gameover').textContent = "Game Over!";
    saveScore(playerNameInput.value, score);
    
    shareBtn.style.display = 'block';
    shareBtn.onclick = () => {
        let text = `הצלחתי להשיג ${score} נקודות במשחק של דור! מי מצליח לעקוף אותי? ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };
}

window.addEventListener('mousedown', (e) => { if (e.target.id === 'playerName' || e.target.id === 'retry' || e.target.id === 'shareBtn') return; if(!running) return; player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); });
window.addEventListener('touchstart', (e) => { if (e.target.id === 'playerName' || e.target.id === 'retry' || e.target.id === 'shareBtn') return; if(running) e.preventDefault(); player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); }, { passive: false });
retryBtn.onclick = () => { if (!running) start(); };
loadLeaderboard();
