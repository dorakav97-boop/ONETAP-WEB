window.addEventListener('load', () => {
    const firebaseConfig = {
        apiKey: "AIzaSyBW-oSotemXbf3rpbHwAp-jFUVB0",
        authDomain: "dor-akav-game.firebaseapp.com",
        projectId: "dor-akav-game",
        storageBucket: "dor-akav-game.firebasestorage.app",
        messagingSenderId: "630792064093",
        appId: "1:630792064093:web:3a7c53b696e86899b8"
    };
    if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    let W, H;
    function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
    window.addEventListener('resize', resize); resize();

    let running = false, score = 0, level = 1, currentStage = 0;
    let coinsOwned = parseInt(localStorage.getItem('onetap_coins') || '0');
    
    // מלאי (Inventory)
    let invShields = parseInt(localStorage.getItem('onetap_inv_shields') || '0');
    let invSlows = parseInt(localStorage.getItem('onetap_inv_slows') || '0');
    
    // מצב פעיל במשחק
    let shieldActive = false;
    let slowTimer = 0; // זמן שנותר להאטה
    let reviveCount = 0;
    
    let player = { x: 80, y: 0, r: 30, vy: 0, angle: 0 }; 
    let pipes = [], items = [], spawnTimer = 0, lastTime = 0;
    const BASE_SPEED = 3.2; 
    let currentSpeed = BASE_SPEED;
    let gravity = 0.38, jump = -6.8;
    let muted = false;
    const jumpSound = new Audio('jump.mp3.wav');

    const stageConfigs = [
        { bg: "#05080a", pipe: "#06b6d4" },
        { bg: "#1a0b2e", pipe: "#d946ef" },
        { bg: "#062c43", pipe: "#0ea5e9" },
        { bg: "#431407", pipe: "#f97316" }, 
        { bg: "#020617", pipe: "#ffffff" }
    ];

    const playerImg = new Image();
    playerImg.src = localStorage.getItem('onetap_custom_skin') || 'me.png.JPG';

    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active-screen'));
        document.getElementById('overlay').style.display = 'none';
        const target = document.getElementById(id);
        if (target) target.classList.add('active-screen');
    }

    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('touchstart', (e) => { e.preventDefault(); e.stopPropagation(); fn(); }, {passive: false});
            el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); fn(); });
        }
    };

    // חנות - קנייה למלאי
    bind('buy-shield', () => {
        if (coinsOwned >= 75) {
            coinsOwned -= 75; invShields++;
            localStorage.setItem('onetap_inv_shields', invShields);
            saveAndRefresh();
        } else alert("אין מספיק מטבעות!");
    });
    bind('buy-slow', () => {
        if (coinsOwned >= 150) {
            coinsOwned -= 150; invSlows++;
            localStorage.setItem('onetap_inv_slows', invSlows);
            saveAndRefresh();
        } else alert("אין מספיק מטבעות!");
    });

    // שימוש בכוחות בזמן משחק
    bind('use-shield', () => {
        if (invShields > 0 && !shieldActive && running) {
            invShields--;
            shieldActive = true;
            localStorage.setItem('onetap_inv_shields', invShields);
            saveAndRefresh();
        }
    });
    bind('use-slow', () => {
        if (invSlows > 0 && slowTimer <= 0 && running) {
            invSlows--;
            slowTimer = 400; // בערך 7 שניות של האטה
            localStorage.setItem('onetap_inv_slows', invSlows);
            saveAndRefresh();
        }
    });

    bind('btnRevive', () => {
        let cost = 300 + (reviveCount * 100);
        if (coinsOwned >= cost) { coinsOwned -= cost; reviveCount++; saveAndRefresh(); revivePlayer(); }
        else alert("אין מספיק מטבעות!");
    });

    function saveAndRefresh() {
        localStorage.setItem('onetap_coins', coinsOwned);
        document.getElementById('shopCoins').textContent = coinsOwned;
        document.getElementById('coinsDisplay').textContent = coinsOwned;
        document.getElementById('lvlBox').textContent = "Lvl: " + level;
        document.getElementById('scrBox').textContent = "Score: " + score;
        document.getElementById('s-inv').textContent = invShields;
        document.getElementById('w-inv').textContent = invSlows;
    }

    bind('shareWA', () => {
        const text = `הגעתי ל-LEVEL ${level} עם ${score} נקודות ב-OneTap MEGA! מי עוקף? 👑 ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    });

    bind('shareTG', () => {
        const text = `הגעתי ל-LEVEL ${level} עם ${score} נקודות ב-OneTap MEGA! מי עוקף? 👑`;
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
    });

    bind('btnPlay', () => { showScreen('gameScreen'); start(); });
    bind('btnSkins', () => showScreen('skinsMenu'));
    bind('btnShop', () => { saveAndRefresh(); showScreen('shopMenu'); });
    bind('btnLeaderboard', () => { showScreen('leaderboardMenu'); loadLeaderboard(); });
    bind('backFromSkins', () => showScreen('mainMenu'));
    bind('backFromShop', () => showScreen('mainMenu'));
    bind('backFromLeaderboard', () => showScreen('mainMenu'));
    bind('homeBtn', () => { running = false; showScreen('mainMenu'); });
    bind('retry', () => { reviveCount = 0; document.getElementById('overlay').style.display = 'none'; start(); });
    bind('muteBtn', () => { muted = !muted; document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊'; });

    function start() {
        running = true; score = 0; level = 1; currentStage = 0; currentSpeed = BASE_SPEED;
        pipes = []; items = []; player.y = H / 2; player.vy = 0;
        shieldActive = false; slowTimer = 0;
        spawnTimer = 2000; saveAndRefresh();
        requestAnimationFrame(loop);
    }

    function revivePlayer() { running = true; pipes = []; player.y = H / 2; player.vy = 0; document.getElementById('overlay').style.display = 'none'; lastTime = performance.now(); requestAnimationFrame(loop); }

    function loop(t) {
        if (!running) return;
        let dt = t - lastTime; if (dt > 100) dt = 16; lastTime = t;
        
        if (slowTimer > 0) slowTimer--;
        let effSpeed = (slowTimer > 0) ? currentSpeed * 0.65 : currentSpeed;

        ctx.fillStyle = stageConfigs[currentStage].bg;
        ctx.fillRect(0, 0, W, H);

        spawnTimer += dt;
        if (spawnTimer > (3500 / (effSpeed/2))) { spawnTimer = 0; spawnPipe(); }

        player.vy += gravity; player.y += player.vy;
        player.angle = player.vy * 0.08;

        ctx.save();
        ctx.translate(player.x, player.y); ctx.rotate(player.angle);
        if (shieldActive) { ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0,0,player.r + 8,0,Math.PI*2); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(0,0,player.r,0,Math.PI*2); ctx.clip();
        if (playerImg.complete) ctx.drawImage(playerImg, -player.r, -player.r, player.r*2, player.r*2);
        ctx.restore();

        for (let i = pipes.length - 1; i >= 0; i--) {
            let p = pipes[i]; p.x -= effSpeed;
            if (currentStage >= 3) p.yOff = Math.sin(t / 400) * 100; else p.yOff = 0;
            ctx.fillStyle = stageConfigs[currentStage].pipe;
            ctx.fillRect(p.x, p.yOff, 85, p.topH); ctx.fillRect(p.x, p.botY + p.yOff, 85, H - p.botY);

            if (!p.passed && p.x < player.x) {
                p.passed = true; score++; currentSpeed += 0.12; 
                if (score % 10 === 0) levelUp();
                saveAndRefresh();
            }

            if (player.x + player.r > p.x && player.x - player.r < p.x + 85) {
                if (player.y - player.r < p.topH + p.yOff || player.y + player.r > p.botY + p.yOff) {
                    if (shieldActive) { shieldActive = false; saveAndRefresh(); pipes.splice(i, 1); }
                    else gameOver();
                }
            }
            if (p.x < -120) pipes.splice(i, 1);
        }

        for (let i = items.length - 1; i >= 0; i--) {
            let it = items[i]; it.x -= effSpeed;
            ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI*2); ctx.fill();
            if (Math.hypot(player.x - it.x, player.y - it.y) < player.r + it.r) {
                coinsOwned += 3; score += 5; currentSpeed += 0.25; 
                saveAndRefresh(); items.splice(i, 1);
            }
        }
        if (player.y > H || player.y < 0) gameOver();
        requestAnimationFrame(loop);
    }

    function levelUp() {
        level++; currentStage = Math.min(Math.floor((level - 1) / 1), stageConfigs.length - 1);
        const div = document.createElement('div');
        div.className = 'lvl-up-anim'; div.textContent = "LEVEL UP!";
        document.getElementById('gameScreen').appendChild(div);
        setTimeout(() => div.remove(), 2000);
    }

    function spawnPipe() {
        let gap = 240 + (level * 2);
        let center = Math.random() * (H - gap - 160) + 80 + gap/2;
        pipes.push({ x: W, topH: center - gap/2, botY: center + gap/2, passed: false, yOff: 0 });
        if (Math.random() > 0.65) items.push({ x: W + 100, y: center, r: 16 });
    }

    function gameOver() { running = false; document.getElementById('overlay').style.display = 'flex'; saveScore(score); }

    window.addEventListener('touchstart', (e) => { 
        if (running && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'INPUT' && !e.target.classList.contains('power-btn')) {
            player.vy = jump; if(!muted) jumpSound.play().catch(()=>{});
        }
    }, {passive: false});

    async function saveScore(s) {
        const name = document.getElementById('playerName').value || "שחקן";
        if (s > 0) await db.collection('scores').add({ name, score: s, date: new Date() });
    }

    async function loadLeaderboard() {
        const list = document.getElementById('scoresList'); list.innerHTML = "טוען...";
        const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let h = ""; snap.forEach(doc => h += `<p>${doc.data().name}: ${doc.data().score}</p>`);
        list.innerHTML = h || "אין תוצאות";
    }
});
