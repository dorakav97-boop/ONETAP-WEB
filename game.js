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

const scoreEl = document.getElementById('score'), overlay = document.getElementById('overlay'), 
      retryBtn = document.getElementById('retry'), playerNameInput = document.getElementById('playerName'), 
      scoresList = document.getElementById('scoresList'), shareWA = document.getElementById('shareWA'), 
      shareTG = document.getElementById('shareTG'), muteBtn = document.getElementById('mute-btn');

const playerImg = new Image(); playerImg.src = 'me.png.JPG'; 
const jumpSound = new Audio('jump.mp3.wav');
let isMuted = false;

muteBtn.onclick = (e) => {
    e.stopPropagation();
    isMuted = !isMuted;
    muteBtn.textContent = isMuted ? "🔇" : "🔊";
};

let currentSkinIdx = 0;
const skins = ["🔥", "💎", "🌈", "⚡", "💀"];
window.setSkin = (i) => { currentSkinIdx = i; document.querySelectorAll('.skin-item').forEach((b, idx) => b.classList.toggle('active', idx === i)); };

let player = { x: 50, y: 0, r: 25, vy: 0, angle: 0, hasShield: false, trail: [] };
let gravity = 0.4, jump = -7, pipes = [], items = [], particles = [], clouds = [], score = 0, running = false, 
    currentSpeed = 3.5, spawnTimer = 0, lastTime = 0, level = 1, combo = 0, sloMo = 1;

for(let i=0; i<10; i++) clouds.push({x: Math.random()*W, y: Math.random()*H, s: 0.1 + Math.random()*0.2, r: 20+Math.random()*40});

async function loadLeaderboard() {
    try {
        const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let html = '';
        snap.forEach((doc, i) => { 
            const d = doc.data();
            html += `<div class="score-row"><span>${i===0?'👑':i+1+'.'} ${d.name}</span> <b>${d.score}</b></div>`;
        });
        scoresList.innerHTML = html || 'No scores yet!';
    } catch (e) { console.log(e); }
}

async function saveScore(name, s) {
    if (s === 0) return;
    await db.collection('scores').add({ name: name || "Legend", score: s, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    loadLeaderboard();
}

function start() {
    running = true; score = 0; level = 1; combo = 0; pipes = []; items = []; particles = []; player.trail = [];
    player.y = H / 2; player.vy = 0; player.hasShield = false;
    currentSpeed = 3.5; // המהירות שביקשת
    scoreEl.textContent = "0"; overlay.style.display = 'none';
    shareWA.style.display = 'none'; shareTG.style.display = 'none';
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function spawnObject() {
    let gap = Math.max(150, 260 - (score * 2.5));
    let center = Math.random() * (H - gap - 120) + 60 + gap/2;
    pipes.push({ x: W, topH: center-gap/2, botY: center+gap/2, passed: false, color: `hsl(${score * 15 % 360}, 70%, 50%)` });
    if (Math.random() > 0.7) {
        let type = Math.random() > 0.9 ? 'shield' : 'coin';
        items.push({ x: W + 100, y: center, r: 15, type: type });
    }
}

function loop(timestamp) {
    if (!running) return;
    let dt = (timestamp - lastTime) * sloMo;
    lastTime = timestamp;

    ctx.fillStyle = `hsl(${220 + level*10}, 30%, ${Math.max(5, 15 - score*0.1)}%)`;
    ctx.fillRect(0, 0, W, H);

    clouds.forEach(c => {
        c.x -= currentSpeed * c.s * sloMo;
        if (c.x < -c.r) c.x = W + c.r;
        ctx.fillStyle = "rgba(255,255,255,0.03)";
        ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
    });

    currentSpeed = 3.5 + (score * 0.08); // קצב העלייה שביקשת
    spawnTimer += dt;
    if (spawnTimer > 1500) { spawnTimer = 0; spawnObject(); }

    player.vy += gravity * sloMo; player.y += player.vy * sloMo;
    player.angle = player.vy * 0.1;

    player.trail.push({x: player.x, y: player.y});
    if (player.trail.length > 6) player.trail.shift();
    player.trail.forEach((t, i) => {
        ctx.globalAlpha = i / 12;
        ctx.font = "30px Arial";
        ctx.fillText(skins[currentSkinIdx], t.x, t.y);
    });
    ctx.globalAlpha = 1;

    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i]; p.x -= currentSpeed * sloMo;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, 0, 60, p.topH);
        ctx.fillRect(p.x, p.botY, 60, H - p.botY);

        if (!p.done && p.x < player.x) { 
            p.done = true; score++;
            scoreEl.textContent = score;
            if (Math.abs(player.y - p.topH) < 15 || Math.abs(player.y - p.botY) < 15) {
                sloMo = 0.3; setTimeout(()=>sloMo = 1, 150);
            }
            if (score % 10 === 0) {
                level++;
                const l = document.createElement('div'); l.className = 'level-up';
                l.textContent = "LEVEL " + level; document.body.appendChild(l);
                setTimeout(()=>l.remove(), 2000);
            }
        }
        if (player.x + player.r > p.x && player.x - player.r < p.x + 60) {
            if (player.y - player.r < p.topH || player.y + player.r > p.botY) {
                if (player.hasShield) { player.hasShield = false; pipes.splice(i, 1); }
                else gameOver();
            }
        }
        if (p.x < -100) pipes.splice(i, 1);
    }

    items.forEach((it, i) => {
        it.x -= currentSpeed * sloMo;
        let col = it.type === 'shield' ? '#38bdf8' : '#fbbf24';
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI*2); ctx.fill();
        if (Math.hypot(player.x-it.x, player.y-it.y) < player.r + it.r) {
            if (it.type === 'shield') player.hasShield = true;
            else score += 5;
            items.splice(i, 1);
        }
    });

    if (player.y > H || player.y < 0) gameOver();

    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle);
    ctx.font = "45px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(skins[currentSkinIdx], 0, 0);
    if (player.hasShield) { ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 4; ctx.strokeRect(-player.r, -player.r, player.r*2, player.r*2); }
    ctx.restore();

    requestAnimationFrame(loop);
}

function gameOver() {
    running = false; overlay.style.display = 'flex';
    shareWA.style.display = 'block'; shareTG.style.display = 'block';
    document.getElementById('gameover').textContent = "SCORE: " + score;
    saveScore(playerNameInput.value, score);
}

shareWA.onclick = () => window.open(`https://wa.me/?text=${encodeURIComponent('הגעתי ל-'+score+' נקודות! עקפו אותי: '+window.location.href)}`, '_blank');
shareTG.onclick = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('הגעתי ל-'+score+' נקודות!')}`, '_blank');

const inputIds = ['playerName','retry','shareWA','shareTG','mute-btn'];
window.addEventListener('mousedown', (e) => { 
    if (inputIds.includes(e.target.id)) return;
    if(running) { player.vy = jump; if(!isMuted) { jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); } }
});
window.addEventListener('touchstart', (e) => { 
    if (inputIds.includes(e.target.id)) return;
    if(running) { e.preventDefault(); player.vy = jump; if(!isMuted) { jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); } }
}, { passive: false });

retryBtn.onclick = start;
loadLeaderboard();
