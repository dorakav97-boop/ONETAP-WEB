window.addEventListener('load', () => {
    // Firebase Config
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

    // הגדרות שלבים (10 מכשולים כל שלב)
    const stageConfigs = [
        { bg: "#05080a", pipe: "#06b6d4" },
        { bg: "#1a0b2e", pipe: "#d946ef" },
        { bg: "#062c43", pipe: "#0ea5e9" },
        { bg: "#431407", pipe: "#f97316" },
        { bg: "#020617", pipe: "#6366f1" }
    ];

    let running = false, score = 0, level = 1, currentStage = 0;
    let coinsOwned = parseInt(localStorage.getItem('onetap_coins') || '0');
    let high = parseInt(localStorage.getItem('onetap_high') || '0');
    let player = { x: 80, y: 0, r: 22, vy: 0, angle: 0, hasShield: false };
    let pipes = [], items = [], spawnTimer = 0, lastTime = 0;
    let gravity = 0.3, jump = -6, speed = 2.5; // מהירות התחלתית איטית יותר
    let muted = false;

    const playerImg = new Image();
    playerImg.src = localStorage.getItem('onetap_custom_skin') || 'me.png.JPG';

    // --- ניווט וסקינים ---
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

    // בחירת סקין אימוג'י
    document.querySelectorAll('.skin-option').forEach(opt => {
        bind(opt.id, () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 60; tempCanvas.height = 60;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.font = '45px serif'; tCtx.textAlign = 'center'; tCtx.textBaseline = 'middle';
            tCtx.fillText(opt.innerText, 30, 30);
            playerImg.src = tempCanvas.toDataURL();
            localStorage.setItem('onetap_custom_skin', playerImg.src);
        });
    });

    // העלאת תמונה מהאייפון
    const imageUpload = document.getElementById('imageUpload');
    bind('btnUpload', () => imageUpload.click());
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                playerImg.src = event.target.result;
                localStorage.setItem('onetap_custom_skin', event.target.result);
                alert("התמונה הועלתה בהצלחה!");
            };
            reader.readAsDataURL(file);
        }
    });

    bind('btnPlay', () => { showScreen('gameScreen'); start(); });
    bind('btnSkins', () => showScreen('skinsMenu'));
    bind('btnShop', () => { document.getElementById('shopCoins').textContent = coinsOwned; showScreen('shopMenu'); });
    bind('btnLeaderboard', () => { showScreen('leaderboardMenu'); loadLeaderboard(); });
    bind('backFromSkins', () => showScreen('mainMenu'));
    bind('backFromShop', () => showScreen('mainMenu'));
    bind('backFromLeaderboard', () => showScreen('mainMenu'));
    bind('retry', () => start());
    bind('homeBtn', () => { running = false; showScreen('mainMenu'); });

    // --- לוגיקת משחק ---
    function start() {
        running = true; score = 0; level = 1; currentStage = 0;
        pipes = []; items = []; player.y = H / 2; player.vy = 0;
        speed = 2.5; spawnTimer = 2000;
        updateUI();
        requestAnimationFrame(loop);
    }

    function updateUI() {
        document.getElementById('score').textContent = score;
        document.getElementById('coinsDisplay').textContent = coinsOwned;
        document.getElementById('levelText').textContent = level;
    }

    function levelUp() {
        level++;
        currentStage = Math.min(Math.floor((level - 1) / 2), stageConfigs.length - 1);
        const banner = document.createElement('div');
        banner.className = 'level-banner';
        banner.textContent = "LEVEL " + level;
        document.getElementById('gameScreen').appendChild(banner);
        setTimeout(() => banner.remove(), 2000);
        updateUI();
    }

    function spawnPipe() {
        let gap = 200 + (level * 2); // פתחים גדולים יותר
        let center = Math.random() * (H - gap - 150) + 75 + gap/2;
        pipes.push({ x: W, topH: center - gap/2, botY: center + gap/2, passed: false });
        
        // מטבעות רנדומליים (סיכוי של 40%)
        if (Math.random() > 0.6) {
            items.push({ x: W + 100, y: center, r: 15 });
        }
    }

    function loop(t) {
        if (!running) return;
        let dt = t - lastTime; lastTime = t;

        ctx.fillStyle = stageConfigs[currentStage].bg;
        ctx.fillRect(0, 0, W, H);

        spawnTimer += dt;
        if (spawnTimer > 2500 - (speed * 100)) { 
            spawnTimer = 0; 
            spawnPipe(); 
        }

        player.vy += gravity; player.y += player.vy;
        player.angle = player.vy * 0.1;

        ctx.save();
        ctx.translate(player.x, player.y); ctx.rotate(player.angle);
        ctx.beginPath(); ctx.arc(0,0,player.r,0,Math.PI*2); ctx.clip();
        if (playerImg.complete) ctx.drawImage(playerImg, -player.r, -player.r, player.r*2, player.r*2);
        ctx.restore();

        for (let i = pipes.length - 1; i >= 0; i--) {
            let p = pipes[i]; p.x -= speed;
            ctx.fillStyle = stageConfigs[currentStage].pipe;
            // מכשולים רחבים ובולטים יותר
            ctx.fillRect(p.x, 0, 80, p.topH);
            ctx.fillRect(p.x, p.botY, 80, H - p.botY);

            if (!p.passed && p.x < player.x) {
                p.passed = true; 
                score++; 
                speed += 0.03; // עליה קטנה מאוד במהירות בכל מכשול
                if (score % 10 === 0) levelUp();
                updateUI();
            }

            if (player.x + player.r > p.x && player.x - player.r < p.x + 80) {
                if (player.y - player.r < p.topH || player.y + player.r > p.botY) gameOver();
            }
            if (p.x < -100) pipes.splice(i, 1);
        }

        for (let i = items.length - 1; i >= 0; i--) {
            let it = items[i]; it.x -= speed;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI*2); ctx.fill();
            if (Math.hypot(player.x - it.x, player.y - it.y) < player.r + it.r) {
                coinsOwned += 3;
                speed += 0.06; // מטבע מעלה מהירות פי 2 ממכשול
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
        document.getElementById('gameover').textContent = "ניקוד: " + score;
        saveScore(score);
    }

    window.addEventListener('touchstart', (e) => {
        if (running && e.target.tagName !== 'BUTTON') player.vy = jump;
    });

    async function saveScore(s) {
        const name = document.getElementById('playerName').value || "שחקן";
        if (s > 0) await db.collection('scores').add({ name, score: s, date: new Date() });
    }

    async function loadLeaderboard() {
        const list = document.getElementById('scoresList');
        list.innerHTML = "טוען...";
        const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let h = "";
        snap.forEach(doc => h += `<p>${doc.data().name}: ${doc.data().score}</p>`);
        list.innerHTML = h || "אין תוצאות";
    }
});
