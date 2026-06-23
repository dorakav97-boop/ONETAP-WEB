window.addEventListener('load', () => {
    // --- אתחול Firebase ---
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

    // משתני משחק
    let running = false;
    let score = 0, level = 1, coinsOwned = parseInt(localStorage.getItem('onetap_coins') || '0');
    let high = parseInt(localStorage.getItem('onetap_high') || '0');
    let gravity = 0.4, jump = -7;
    let player = { x: 50, y: 0, r: 25, vy: 0, angle: 0, hasShield: false };
    let pipes = [], items = [], particles = [];
    let currentSpeed = 3.5, spawnTimer = 0, lastTime = 0;
    let muted = false;

    const playerImg = new Image();
    playerImg.src = 'me.png.JPG'; 

    // עדכון תצוגת מטבעות ראשונית
    document.getElementById('coinsDisplay').textContent = coinsOwned;
    document.getElementById('shopCoins').textContent = coinsOwned;

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
    bind('homeBtn', () => { running = false; showScreen('mainMenu'); });
    bind('retry', () => start());
    bind('muteBtn', () => { muted = !muted; document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊'; });

    // --- מערכת חנות ---
    document.querySelectorAll('.power-up-item').forEach(item => {
        bind(item.id || 'shield-buy', () => {
            const cost = parseInt(item.getAttribute('data-cost') || '100');
            if (coinsOwned >= cost) {
                coinsOwned -= cost;
                localStorage.setItem('onetap_coins', coinsOwned);
                document.getElementById('shopCoins').textContent = coinsOwned;
                document.getElementById('coinsDisplay').textContent = coinsOwned;
                player.hasShield = true;
                alert("קנית מגן! הוא יופעל במשחק הבא");
            } else {
                alert("אין לך מספיק מטבעות!");
            }
        });
    });

    // --- לוגיקת משחק ---
    function start() {
        running = true; score = 0; level = 1;
        pipes = []; items = []; particles = [];
        player.y = H / 2; player.vy = 0;
        // המגן נשאר פעיל רק אם נקנה בחנות
        currentSpeed = 3.5; spawnTimer = 0;
        document.getElementById('overlay').style.display = 'none';
        lastTime = performance.now();
        requestAnimationFrame(loop);
    }

    function spawnPipe() {
        // קושי דינמי: הפתח גדל ככל שהמהירות עולה
        let gap = 160 + (score * 0.5); 
        if (gap > 250) gap = 250; // הגבלה לפתח מקסימלי

        let center = Math.random() * (H - gap - 150) + 75 + gap/2;
        pipes.push({ x: W, topH: center - gap/2, botY: center + gap/2, passed: false });
        
        if (Math.random() > 0.7) {
            items.push({ x: W + 50, y: center, r: 15, type: 'coin' });
        }
    }

    function loop(t) {
        if (!running) return;
        let dt = t - lastTime; lastTime = t;
        ctx.clearRect(0, 0, W, H);

        // מהירות עולה עם הזמן
        currentSpeed = 3.5 + (score * 0.1);
        if (currentSpeed > 8) currentSpeed = 8; // הגבלת מהירות מקסימלית

        spawnTimer += dt;
        if (spawnTimer > 1500) { spawnTimer = 0; spawnPipe(); }

        // פיזיקה
        player.vy += gravity; player.y += player.vy;
        player.angle = player.vy * 0.1;

        // ציור שחקן עם מגן אם קיים
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.angle);
        if (player.hasShield) {
            ctx.strokeStyle = '#06b6d4';
            ctx.lineWidth = 5;
            ctx.beginPath(); ctx.arc(0,0,player.r + 5,0,Math.PI*2); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0,0,player.r,0,Math.PI*2); ctx.clip();
        if (playerImg.complete) ctx.drawImage(playerImg, -player.r, -player.r, player.r*2, player.r*2);
        ctx.restore();

        // צינורות
        for (let i = pipes.length - 1; i >= 0; i--) {
            let p = pipes[i]; p.x -= currentSpeed;
            ctx.fillStyle = '#8b5cf6';
            ctx.fillRect(p.x, 0, 60, p.topH);
            ctx.fillRect(p.x, p.botY, 60, H - p.botY);

            if (!p.passed && p.x < player.x) {
                p.passed = true; score++;
                document.getElementById('score').textContent = score;
            }

            if (player.x + player.r > p.x && player.x - player.r < p.x + 60) {
                if (player.y - player.r < p.topH || player.y + player.r > p.botY) {
                    if (player.hasShield) {
                        player.hasShield = false;
                        pipes.splice(i, 1); // המגן שובר את הצינור
                    } else {
                        gameOver();
                    }
                }
            }
            if (p.x < -70) pipes.splice(i, 1);
        }

        // מטבעות
        for (let i = items.length - 1; i >= 0; i--) {
            let it = items[i]; it.x -= currentSpeed;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI*2); ctx.fill();

            if (Math.hypot(player.x - it.x, player.y - it.y) < player.r + it.r) {
                score += 5; // מוסיף 5 לניקוד
                coinsOwned += 3; // מוסיף 3 לחנות
                localStorage.setItem('onetap_coins', coinsOwned);
                document.getElementById('score').textContent = score;
                document.getElementById('coinsDisplay').textContent = coinsOwned;
                items.splice(i, 1);
            }
        }

        if (player.y > H || player.y < 0) gameOver();
        requestAnimationFrame(loop);
    }

    function gameOver() {
        running = false;
        player.hasShield = false; // איבוד המגן בהפסד
        document.getElementById('overlay').style.display = 'flex';
        document.getElementById('gameover').textContent = "SCORE: " + score;
        if (score > high) {
            high = score;
            localStorage.setItem('onetap_high', high);
        }
        saveScore(score);
    }

    window.addEventListener('touchstart', (e) => {
        if (running && e.target.tagName !== 'BUTTON') {
            player.vy = jump;
        }
    });

    async function loadLeaderboard() {
        const list = document.getElementById('scoresList');
        list.innerHTML = "טוען...";
        const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let h = "";
        snap.forEach(doc => { h += `<p>${doc.data().name || 'אנונימי'}: ${doc.data().score}</p>`; });
        list.innerHTML = h || "אין תוצאות";
    }

    async function saveScore(s) {
        const name = document.getElementById('playerName').value || "שחקן";
        await db.collection('scores').add({ name, score: s, date: new Date() });
    }
});
