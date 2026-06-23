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
      shareBtn = document.getElementById('shareBtn'), levelMsg = document.getElementById('levelMsg');

const playerImg = new Image(); playerImg.src = 'me.png.JPG'; 
const jumpSound = new Audio('jump.mp3.wav');

let high = parseInt(localStorage.getItem('onetap_high')||'0');
highEl.textContent = 'High: ' + high;

let player = { x: 50, y: 0, r: 25, vy: 0, angle: 0, hasShield: false, turbo: 0, trail: [] };
let gravity = 0.4, jump = -7, pipes = [], items = [], particles = [], clouds = [], score = 0, running = false, 
    currentSpeed = 3.5, spawnTimer = 0, lastTime = 0, level = 1, combo = 0, sloMo = 1;

for(let i=0; i<10; i++) clouds.push({x: Math.random()*W, y: Math.random()*H, s: 0.1 + Math.random()*0.2, r: 20+Math.random()*40});

async function loadLeaderboard() {
    try {
        const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let html = '', medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
        let i = 0;
        snap.forEach(doc => { html += `<p>${medals[i++] || '🏅'} ${doc.data().name}: ${doc.data().score}</p>`; });
        scoresList.innerHTML = html || 'No scores yet!';
    } catch (e) { console.log(e); }
}

async function saveScore(name, s) {
    if (s === 0) return;
    await db.collection('scores').add({ name: name || "Legend", score: s, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    loadLeaderboard();
}

function createParticles(x, y, color, count=10) {
    for (let i = 0; i < count; i++) {
        particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 1.0, color: color });
    }
}

function start() {
    running = true; score = 0; level = 1; combo = 0; pipes = []; items = []; particles = [];
    player.y = H / 2; player.vy = 0; player.hasShield = false; player.turbo = 0;
    currentSpeed = 3.5; scoreEl.textContent = "0"; overlay.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnObject() {
    let gap = Math.max(140, 260 - (score * 2));
    let center = Math.random() * (H - gap - 120) + 60 + gap/2;
    let moveDist = level > 2 ? Math.min(120, (level-2)*25) : 0;
    pipes.push({ x: W, topH: center-gap/2, botY: center+gap/2, passed: false, color: `hsl(${level*40}, 80%, 60%)`, move: moveDist, offset: Math.random()*5 });
    
    if (Math.random() > 0.7) {
        let type = Math.random() > 0.9 ? 'turbo' : (Math.random() > 0.8 ? 'shield' : 'coin');
        items.push({ x: W + 100, y: center + (Math.random()-0.5)*80, r: 15, type: type });
    }
}

function loop(timestamp) {
    if (!running) return;
    let dt = (timestamp - lastTime) * sloMo;
    lastTime = timestamp;

    // רקע דינמי
    ctx.fillStyle = `hsl(${220 + level*10}, 30%, ${Math.max(5, 15 - score*0.1)}%)`;
    ctx.fillRect(0, 0, W, H);

    clouds.forEach(c => {
        c.x -= currentSpeed * c.s * sloMo;
        if (c.x < -c.r) c.x = W + c.r;
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
    });

    if (player.turbo > 0) { player.turbo -= dt; currentSpeed = 12; } 
    else { currentSpeed = 3.5 + (score * 0.08); }

    spawnTimer += dt;
    if (spawnTimer > 1500) { spawnTimer = 0; spawnObject(); }

    if (player.turbo <= 0) { player.vy += gravity * sloMo; player.y += player.vy * sloMo; }
    player.angle = player.vy * 0.1;

    // ציור שובל
    player.trail.push({x: player.x, y: player.y});
    if (player.trail.length > 8) player.trail.shift();
    player.trail.forEach((t, i) => {
        ctx.globalAlpha = i / 16;
        ctx.drawImage(playerImg, t.x-player.r, t.y-player.r, player.r*2, player.r*2);
    });
    ctx.globalAlpha = 1;

    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i]; p.x -= currentSpeed * sloMo;
        let yShift = Math.sin(timestamp/600 + p.offset) * p.move;
        
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 15; ctx.shadowColor = p.color;
        ctx.fillRect(p.x, yShift, 60, p.topH);
        ctx.fillRect(p.x, p.botY + yShift, 60, H - p.botY - yShift);
        ctx.shadowBlur = 0;

        if (!p.passed && p.x < player.x) { 
            p.passed = true; score++; combo++;
            let comboBonus = Math.floor(combo/5);
            score += comboBonus;
            scoreEl.textContent = score + (comboBonus > 0 ? ` +${comboBonus+1}` : "");
            
            // אפקט SLO-MO בכמעט פסילה
            if (Math.abs(player.y - (p.topH + yShift)) < 15 || Math.abs(player.y - (p.botY + yShift)) < 15) {
                sloMo = 0.3; ctx.fillStyle = "white"; ctx.fillRect(0,0,W,H); // הבזק
                setTimeout(()=>sloMo = 1, 150);
            }

            if (score % 10 === 0) {
                level++;
                const l = document.createElement('div'); l.className = 'level-up';
                l.textContent = "LEVEL " + level; document.body.appendChild(l);
                setTimeout(()=>l.remove(), 2000);
            }
        }
        
        if (player.turbo <= 0 && player.x + player.r > p.x && player.x - player.r < p.x + 60) {
            if (player.y - player.r < p.topH + yShift || player.y + player.r > p.botY + yShift) {
                if (player.hasShield) { player.hasShield = false; createParticles(player.x, player.y, "#38bdf8", 20); pipes.splice(i, 1); }
                else gameOver();
            }
        }
        if (p.x < -100) pipes.splice(i, 1);
    }

    items.forEach((it, i) => {
        it.x -= currentSpeed * sloMo;
        let col = it.type === 'shield' ? '#38bdf8' : (it.type === 'turbo' ? '#4ade80' : '#fbbf24');
        ctx.fillStyle = col; ctx.shadowBlur = 20; ctx.shadowColor = col;
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
        if (Math.hypot(player.x-it.x, player.y-it.y) < player.r + it.r) {
            createParticles(it.x, it.y, col, 20);
            if (it.type === 'shield') player.hasShield = true;
            else if (it.type === 'turbo') player.turbo = 3000;
            else score += 10;
            items.splice(i, 1);
        }
    });

    particles.forEach((p, i) => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.02;
        ctx.fillStyle = p.color; ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, 4, 4);
        if (p.life <= 0) particles.splice(i, 1);
    });
    ctx.globalAlpha = 1;

    if (player.y > H || player.y < 0) gameOver();

    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
    ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.clip();
    if (playerImg.complete) ctx.drawImage(playerImg, -player.r, -player.r, player.r * 2, player.r * 2);
    if (player.hasShield) { ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 6; ctx.stroke(); }
    if (player.turbo > 0) { ctx.strokeStyle = '#4ade80'; ctx.lineWidth = 10; ctx.stroke(); }
    ctx.restore();

    requestAnimationFrame(loop);
}

function gameOver() {
    running = false; document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);
    overlay.style.display = 'flex';
    document.getElementById('gameover').textContent = "SCORE: " + score;
    saveScore(playerNameInput.value, score);
    if (score > high) { high = score; localStorage.setItem('onetap_high', high); highEl.textContent = "High: " + high; }
    shareBtn.style.display = 'block';
}

shareBtn.onclick = () => {
    let text = `הגעתי ל-LEVEL ${level} עם ${score} נקודות במשחק של דור! מי מצליח לעקוף? 👑 ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
};

const inputIds = ['playerName','retry','shareBtn'];
window.addEventListener('mousedown', (e) => { 
    if (inputIds.includes(e.target.id)) return;
    if(running) { player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); }
});
window.addEventListener('touchstart', (e) => { 
    if (inputIds.includes(e.target.id)) return;
    if(running) { e.preventDefault(); player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); }
}, { passive: false });

retryBtn.onclick = () => { if (!running) start(); };
loadLeaderboard();
