window.addEventListener('load', () => {
    // --- Firebase האתחול שלך ---
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

    // הגדרות שלבים
    const stageConfigs = [
        { name: "שלב 1: התחלה", bg: "#05080a", pipe: "#8b5cf6" },
        { name: "שלב 2: הלילה הסגול", bg: "#1a0b2e", pipe: "#d946ef" },
        { name: "שלב 3: מעמקי הים", bg: "#062c43", pipe: "#0ea5e9" },
        { name: "שלב 4: מאדים", bg: "#431407", pipe: "#f97316" },
        { name: "שלב 5: חלל עמוק", bg: "#020617", pipe: "#6366f1" }
    ];

    // משתני משחק
    let running = false, score = 0, level = 1, currentStage = 0;
    let coinsOwned = parseInt(localStorage.getItem('onetap_coins') || '0');
    let high = parseInt(localStorage.getItem('onetap_high') || '0');
    let player = { x: 80, y: 0, r: 25, vy: 0, angle: 0, hasShield: false };
    let pipes = [], items = [], spawnTimer = 0, lastTime = 0;
    let gravity = 0.35, jump = -6.5, speed = 3;
    let muted = false;

    const playerImg = new Image();
    const savedSkin = localStorage.getItem('onetap_selected_skin');
    playerImg.src = savedSkin || 'me.png.JPG';

    // --- ניווט ---
    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        document.getElementById('overlay').style.display = 'none';
        document.getElementById(id).style.display = 'flex';
    }

    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) {
            el.onclick = (e) => { e.preventDefault(); fn(); };
            el.ontouchstart = (e) => { e.preventDefault(); fn(); };
        }
    };

    // בחירת סקין
    document.querySelectorAll('.skin-option').forEach(opt => {
        bind(opt.id, () => {
            document.querySelectorAll('.skin-option').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            if (opt.id === 'skin-blue') {
                playerImg.src = 'me.png.JPG';
            } else {
                // יצירת תמונה מאימוג'י
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = 50; tempCanvas.height = 50;
                const tCtx = tempCanvas.getContext('2d');
                tCtx.font = '40px serif';
                tCtx.textAlign = 'center'; tCtx.textBaseline = 'middle';
                tCtx.fillText(opt.innerText, 25, 25);
                playerImg.src = tempCanvas.toDataURL();
            }
            localStorage.setItem('onetap_selected_skin', playerImg.src);
        });
    });

    bind('btnPlay', () => { showScreen('gameScreen'); start(); });
    bind('btnSkins', () => showScreen('skinsMenu'));
    bind('btnShop', () => {
        document.getElementById('shopCoins').textContent = coinsOwned;
        showScreen('shopMenu');
    });
    bind('btnLeaderboard', () => { showScreen('leaderboardMenu'); loadLeaderboard(); });
    bind('backFromSkins', () => showScreen('mainMenu'));
    bind('backFromShop', () => showScreen('mainMenu'));
    bind('backFromLeaderboard', () => showScreen('mainMenu'));
    bind('retry', () => start());
    bind('homeBtn', () => { running = false; showScreen('mainMenu'); });
    bind('muteBtn', () => { muted = !muted; document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊'; });

    // רכישת מגן
    bind('shield-buy', () => {
        if (coinsOwned >= 100) {
            coinsOwned -= 100;
            player.hasShield = true;
            localStorage.setItem('onetap_coins', coinsOwned);
            document.getElementById('shopCoins').textContent = coinsOwned;
            alert("מגן הופעל!");
        } else alert("חסר מטבעות!");
    });

    // --- לוגיקת משחק ---
    function start() {
        running = true; score = 0; currentStage = 0; level = 1;
        pipes = []; items = [];
        player.y = H / 2; player.vy = 0;
        speed = 3; spawnTimer = 2000;
        updateUI();
        requestAnimationFrame(loop);
    }

    function updateUI() {
        document.getElementById('score').textContent = score;
        document.getElementById('coinsDisplay').textContent = coinsOwned;
    }

    function nextStage() {
        currentStage = Math.min(Math.floor(score / 15), stageConfigs.length - 1);
        const banner = document.createElement('div');
        banner.className = 'level-banner';
        banner.textContent = stageConfigs[currentStage].name;
        document.getElementById('gameScreen').appendChild(banner);
        setTimeout(() => banner.remove(), 2500);
    }

    function spawnPipe() {
        let gap = 180 + (currentStage * 10);
        let center = Math.random() * (H - gap - 200) + 100 + gap/2;
        pipes.push({ x: W, topH: center - gap/2, botY: center + gap/2, passed: false });
        if (Math.random() > 0.6) items.push({ x: W + 50, y: center, r: 15 });
    }

    function loop(t) {
        if (!running) return;
        let dt = t - lastTime; lastTime = t;

        ctx.fillStyle = stageConfigs[currentStage].bg;
        ctx.fillRect(0, 0, W, H);

        speed = 3 + (score * 0.05);
        spawnTimer += dt;
        if (spawnTimer > 2300 - (speed * 80)) { 
            spawnTimer = 0; 
            spawnPipe(); 
        }

        player.vy += gravity; player.y += player.vy;
        player.angle = player.vy * 0.1;

        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        if (player.hasShield) {
            ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0,0,player.r + 5,0,Math.PI*2); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0,0,player.r,0,Math.PI*2); ctx.clip();
        if (playerImg.complete) ctx.drawImage(playerImg, -player.r, -player.r, player.r*2, player.r*2);
        ctx.restore();

        for (let i = pipes.length - 1; i >= 0; i--) {
            let p = pipes[i]; p.x -= speed;
            ctx.fillStyle = stageConfigs[currentStage].pipe;
            ctx.fillRect(p.x, 0, 70, p.topH);
            ctx.fillRect(p.x, p.botY, 70, H - p.botY);

            if (!p.passed && p.x < player.x) {
                p.passed = true; score++; updateUI();
                if (score % 15 === 0) nextStage();
            }

            if (player.x + player.r > p.x && player.x - player.r < p.x + 70) {
                if (player.y - player.r < p.topH || player.y + player.r > p.botY) {
                    if (player.hasShield) {
                        player.hasShield = false;
                        pipes.splice(i, 1);
                    } else gameOver();
                }
            }
            if (p.x < -100) pipes.splice(i, 1);
        }

        for (let i = items.length - 1; i >= 0; i--) {
            let it = items[i]; it.x -= speed;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI*2); ctx.fill();
            if (Math.hypot(player.x - it.x, player.y - it.y) < player.r + it.r) {
                score += 5; coinsOwned += 3;
                localStorage.setItem('onetap_coins', coinsOwned);
                updateUI();
                items.splice(i, 1);
            }
        }

        if (player.y > H || player.y < 0) gameOver();
        requestAnimationFrame(loop);
    }

    function gameOver() {
        running = false;
        document.getElementById('overlay').style.display = 'flex';
        if (score > high) { high = score; localStorage.setItem('onetap_high', high); }
        saveScore(score);
    }

    window.addEventListener('touchstart', (e) => {
        if (running && e.target.tagName !== 'BUTTON') player.vy = jump;
    });

    async function loadLeaderboard() {
        const list = document.getElementById('scoresList');
        list.innerHTML = "טוען...";
        try {
            const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
            let h = "";
            snap.forEach(doc => h += `<p>${doc.data().name}: ${doc.data().score}</p>`);
            list.innerHTML = h || "אין תוצאות";
        } catch(e) { list.innerHTML = "שגיאה בטעינה"; }
    }

    async function saveScore(s) {
        const name = document.getElementById('playerName').value || "שחקן";
        if (s > 0) await db.collection('scores').add({ name, score: s, date: new Date() });
    }
});
