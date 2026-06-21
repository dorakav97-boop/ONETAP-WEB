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
    W=canvas.width=window.innerWidth; 
    H=canvas.height=window.innerHeight; 
}
window.addEventListener('resize', resize);
resize();

const scoreEl = document.getElementById('score'), highEl = document.getElementById('high'), overlay = document.getElementById('overlay'), 
      retryBtn = document.getElementById('retry'), playerNameInput = document.getElementById('playerName'), 
      scoresList = document.getElementById('scoresList'), shieldStatus = document.getElementById('shieldStatus'), 
      shareWA = document.getElementById('shareWA'), shareTG = document.getElementById('shareTG');

const playerImg = new Image(); playerImg.src = 'me.png.JPG'; 
const jumpSound = new Audio('jump.mp3.wav');
jumpSound.preload = 'auto';

let high = parseInt(localStorage.getItem('onetap_high')||'0');
highEl.textContent = 'High: ' + high;

let player = { x: 50, y: 0, r: 25, vy: 0, angle: 0, hasShield: false, trail: [] };
let gravity = 0.4, jump = -7, pipes = [], items = [], particles = [], clouds = [], score = 0, running = false, 
    currentSpeed = 3.5, spawnTimer = 0, lastTime = 0, level = 1, combo = 0, sloMo = 1;

// אתחול עננים פעם אחת
for(let i=0; i<8; i++) clouds.push({x: Math.random()*W, y: Math.random()*H*0.6, s: 0.1 + Math.random()*0.2, r: 30+Math.random()*40});

async function loadLeaderboard() {
    try {
        const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let html = '', medals = ['🥇', '🥈', '🥉', '🏅', '🏅'];
        let i = 0;
        snap.forEach(doc => { html += `<p style="margin:5px 0;">${medals[i++] || '🏅'} ${doc.data().name}: ${doc.data().score}</p>`; });
        scoresList.innerHTML = html || 'No scores yet!';
    } catch (e) { console.log(e); }
}

function createParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({ x: x, y: y, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, life: 1.0, color: color });
    }
}

function start() {
    running = true; score = 0; level = 1; combo = 0; pipes = []; items = []; particles = []; player.trail = [];
    player.y = H / 2; player.vy = 0; player.hasShield = false;
    currentSpeed = 3.5; scoreEl.textContent = "0"; overlay.style.display = 'none';
    shareWA.style.display = 'none'; shareTG.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnObject() {
    let gap = Math.max(150, 260 - (score * 2));
    let center = Math.random() * (H - gap - 120) + 60 + gap/2;
    let moveDist = level > 2 ? Math.min(100, (level-2)*20) : 0;
    pipes.push({ x: W, topH: center-gap/2, botY: center+gap/2, passed: false, color: `hsl(${score * 10 % 360}, 60%, 50%)`, move: moveDist, offset: Math.random()*5 });
    if (Math.random() > 0.8) {
        items.push({ x: W + 100, y: center + (Math.random()-0.5)*60, r: 15, type: Math.random() > 0.9 ? 'shield' : 'coin' });
    }
}

function loop(timestamp) {
    if (!running) return;
    let dt = (timestamp - lastTime);
    if (dt > 100) dt = 16; // מונע קפיצה ענקית אם היתה תקיעה
    lastTime = timestamp;

    let adjustedDt = dt * sloMo / 16;

    // רקע
    let lightness = Math.max(5, 20 - (score * 0.2)); 
    ctx.fillStyle = `hsl(220, 40%, ${lightness}%)`;
    ctx.fillRect(0, 0, W, H);

    // עננים
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    clouds.forEach(c => {
        c.x -= currentSpeed * c.s * adjustedDt;
        if (c.x < -c.r*2) c.x = W + c.r*2;
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
    });

    currentSpeed = 3.5 + (score * 0.05);
    spawnTimer += dt * sloMo;
    if (spawnTimer > 1500) { spawnTimer = 0; spawnObject(); }

    player.vy += gravity * adjustedDt; 
    player.y += player.vy * adjustedDt;
    player.angle = Math.max(-0.5, Math.min(0.5, player.vy * 0.1));

    // שובל אופטימלי
    if (timestamp % 32 < 16) {
        player.trail.push({x: player.x, y: player.y, a: player.angle});
        if (player.trail.length > 5) player.trail.shift();
    }

    player.trail.forEach((t, i) => {
        ctx.globalAlpha = i / 15;
        ctx.save(); ctx.translate(t.x, t.y); ctx.rotate(t.a);
        if(playerImg.complete) ctx.drawImage(playerImg, -player.r, -player.r, player.r*2, player.r*2);
        ctx.restore();
    });
    ctx.globalAlpha = 1;

    // מכשולים
    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i]; p.x -= currentSpeed * adjustedDt;
        let yShift = p.move > 0 ? Math.sin(timestamp/600 + p.offset) * p.move : 0;
        
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, yShift, 60, p.topH);
        ctx.fillRect(p.x, p.botY + yShift, 60, H - (p.botY + yShift));

        if (!p.passed && p.x < player.x) { 
            p.passed = true; score++; combo++;
            scoreEl.textContent = score;
            if (score % 10 === 0) {
                level++;
                const l = document.createElement('div'); l.className = 'level-up';
                l.textContent = "LEVEL " + level; document.body.appendChild(l);
                setTimeout(()=>l.remove(), 1500);
            }
        }
        
        if (player.x + player.r > p.x && player.x - player.r < p.x + 60) {
            if (player.y - player.r < p.topH + yShift || player.y + player.r > p.botY + yShift) {
                if (player.hasShield) { 
                    player.hasShield = false; shieldStatus.textContent = ""; 
                    createParticles(player.x, player.y, "#38bdf8");
                    pipes.splice(i, 1); 
                } else gameOver();
            }
        }
        if (p.x < -100) pipes.splice(i, 1);
    }

    // פריטים
    for (let i = items.length - 1; i >= 0; i--) {
        let it = items[i]; it.x -= currentSpeed * adjustedDt;
        let col = it.type === 'shield' ? '#38bdf8' : '#fbbf24';
        ctx.fillStyle = col;
        ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI*2); ctx.fill();
        
        if (Math.hypot(player.x-it.x, player.y-it.y) < player.r + it.r) {
            createParticles(it.x, it.y, col);
            if (it.type === 'shield') { player.hasShield = true; shieldStatus.textContent = "🛡️ SHIELD"; }
            else score += 5;
            items.splice(i, 1);
        }
        if (it.x < -50) items.splice(i, 1);
    }

    // חלקיקים
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx * adjustedDt; p.y += p.vy * adjustedDt; p.life -= 0.03;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 4, 4);
    }
    ctx.globalAlpha = 1;

    if (player.y > H || player.y < 0) gameOver();

    // שחקן
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
    ctx.beginPath(); ctx.arc(0, 0, player.r, 0, Math.PI * 2); ctx.clip();
    if (playerImg.complete) ctx.drawImage(playerImg, -player.r, -player.r, player.r * 2, player.r * 2);
    else { ctx.fillStyle = '#f59e0b'; ctx.fill(); }
    if (player.hasShield) { ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 5; ctx.stroke(); }
    ctx.restore();

    requestAnimationFrame(loop);
}

function gameOver() {
    running = false; document.body.classList.add('shake');
    setTimeout(() => document.body.classList.remove('shake'), 400);
    overlay.style.display = 'flex';
    shareWA.style.display = 'block'; shareTG.style.display = 'block';
    document.getElementById('gameover').textContent = "FINAL: " + score;
    db.collection('scores').add({ name: playerNameInput.value || "Legend", score: score, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    loadLeaderboard();
}

shareWA.onclick = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent('הגעתי ל-'+score+' נקודות במשחק של דור! עקפו אותי: '+window.location.href)}`, '_blank');
};
shareTG.onclick = () => {
    window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('הגעתי ל-'+score+' נקודות!')}`, '_blank');
};

window.addEventListener('mousedown', (e) => { 
    if (['playerName','retry','shareWA','shareTG'].includes(e.target.id)) return;
    if(running) { player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); }
});
window.addEventListener('touchstart', (e) => { 
    if (['playerName','retry','shareWA','shareTG'].includes(e.target.id)) return;
    if(running) { e.preventDefault(); player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); }
}, { passive: false });

retryBtn.onclick = () => { if (!running) start(); };
loadLeaderboard();
