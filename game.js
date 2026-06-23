window.addEventListener('load', () => {
    // --- Firebase אתחול ---
    const firebaseConfig = {
        apiKey: "AIzaSyBW-oSotemXbf3rpbHwAp-jFUVB0",
        authDomain: "dor-akav-game.firebaseapp.com",
        projectId: "dor-akav-game",
        storageBucket: "dor-akav-game.firebasestorage.app",
        messagingSenderId: "630792064093",
        appId: "1:630792064093:web:3a7c53b696e86899b8"
    };
    
    // בדיקה בטוחה לטעינת Firebase בספארי
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const db = (typeof firebase !== 'undefined') ? firebase.firestore() : null;

    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    let W, H;
    
    function resize() { 
        W = canvas.width = window.innerWidth; 
        H = canvas.height = window.innerHeight; 
    }
    window.addEventListener('resize', resize); 
    resize();

    // משתני משחק
    let running = false, score = 0, level = 1, currentStage = 0;
    let coinsOwned = parseInt(localStorage.getItem('onetap_coins') || '0');
    let high = parseInt(localStorage.getItem('onetap_high') || '0');
    
    // יכולות (Power-ups)
    let shields = 0;
    let slows = 0;
    let reviveCount = 0;
    
    let player = { x: 80, y: 0, r: 30, vy: 0, angle: 0 }; 
    let pipes = [], items = [], spawnTimer = 0, lastTime = 0;
    
    // הגדרות מהירות
    const BASE_SPEED = 2.8; 
    let currentSpeed = BASE_SPEED;
    let gravity = 0.32; 
    let jump = -6.2;
    
    const stageConfigs = [
        { bg: "#05080a", pipe: "#06b6d4" },
        { bg: "#1a0b2e", pipe: "#d946ef" },
        { bg: "#062c43", pipe: "#0ea5e9" },
        { bg: "#431407", pipe: "#f97316" },
        { bg: "#020617", pipe: "#6366f1" }
    ];

    const playerImg = new Image();
    playerImg.src = localStorage.getItem('onetap_custom_skin') || 'me.png.JPG';

    function showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        const overlay = document.getElementById('overlay');
        if (overlay) overlay.style.display = 'none';
        const target = document.getElementById(id);
        if (target) target.style.display = 'flex';
    }

    // פונקציית קישור מאובטחת לספארי
    const bind = (id, fn) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => { e.preventDefault(); fn(); }, {passive: false});
            el.addEventListener('touchstart', (e) => { e.preventDefault(); fn(); }, {passive: false});
        }
    };

    // --- חנות וניהול כספים ---
    bind('buy-shield', () => {
        if (coinsOwned >= 75 && shields < 3) {
            coinsOwned -= 75; shields++;
            saveAndRefresh();
        } else if (shields >= 3) alert("מקסימום מגנים!");
        else alert("אין מספיק מטבעות!");
    });

    bind('buy-slow', () => {
        if (coinsOwned >= 150 && slows < 3) {
            coinsOwned -= 150; slows++;
            saveAndRefresh();
        } else if (slows >= 3) alert("מקסימום מאט קצב!");
        else alert("אין מספיק מטבעות!");
    });

    bind('btnRevive', () => {
        let cost = 300 + (reviveCount * 100);
        if (coinsOwned >= cost) {
            coinsOwned -= cost;
            reviveCount++;
            saveAndRefresh();
            revivePlayer();
        } else alert("אין מספיק מטבעות!");
    });

    function saveAndRefresh() {
        localStorage.setItem('onetap_coins', coinsOwned);
        if(document.getElementById('shopCoins')) document.getElementById('shopCoins').textContent = coinsOwned;
        if(document.getElementById('coinsDisplay')) document.getElementById('coinsDisplay').textContent = coinsOwned;
        updatePowerDisplay();
    }

    function updatePowerDisplay() {
        if(document.getElementById('shield-count')) document.getElementById('shield-count').textContent = `🛡️ x${shields}`;
        if(document.getElementById('slow-count')) document.getElementById('slow-count').textContent = `⏱️ x${slows}`;
    }

    // --- סקינים ---
    const imageUpload = document.getElementById('imageUpload');
    bind('btnUpload', () => imageUpload.click());
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                playerImg.src = ev.target.result;
                localStorage.setItem('onetap_custom_skin', ev.target.result);
            };
            reader.readAsDataURL(file);
        }
    });

    document.querySelectorAll('.skin-option').forEach(opt => {
        bind(opt.id, () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 70; tempCanvas.height = 70;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.font = '50px serif'; tCtx.textAlign = 'center'; tCtx.textBaseline = 'middle';
            tCtx.fillText(opt.innerText, 35, 35);
            playerImg.src = tempCanvas.toDataURL();
            localStorage.setItem('onetap_custom_skin', playerImg.src);
        });
    });

    bind('btnPlay', () => { showScreen('gameScreen'); start(); });
    bind('btnSkins', () => showScreen('skinsMenu'));
    bind('btnShop', () => { saveAndRefresh(); showScreen('shopMenu'); });
    bind('btnLeaderboard', () => { showScreen('leaderboardMenu'); loadLeaderboard(); });
    bind('backFromSkins', () => showScreen('mainMenu'));
    bind('backFromShop', () => showScreen('mainMenu'));
    bind('backFromLeaderboard', () => showScreen('mainMenu'));
    bind('retry', () => { reviveCount = 0; start(); });
    bind('homeBtn', () => { running = false; showScreen('mainMenu'); });

    // --- לוגיקת משחק ---
    function start() {
        running = true; score = 0; level = 1; currentStage = 0;
        pipes = []; items = []; player.y = H / 2; player.vy = 0;
        currentSpeed = BASE_SPEED; 
        spawnTimer = 2000;
        saveAndRefresh();
        requestAnimationFrame(loop);
    }

    function revivePlayer() {
        running = true;
        pipes = []; 
        player.y = H / 2; player.vy = 0;
        document.getElementById('overlay').style.display = 'none';
        requestAnimationFrame(loop);
    }

    function loop(t) {
        if (!running) return;
        let dt = t - lastTime; 
        if (dt > 100) dt = 16; // מניעת קפיצות בספארי
        lastTime = t;

        // אפקט מאט קצב
        let effectiveSpeed = (slows > 0) ? currentSpeed * 0.72 : currentSpeed;

        ctx.fillStyle = stageConfigs[currentStage].bg;
        ctx.fillRect(0, 0, W, H);

        spawnTimer += dt;
        if (spawnTimer > (2600 / (effectiveSpeed/2))) { 
            spawnTimer = 0; 
            spawnPipe(); 
        }

        player.vy += gravity; 
        player.y += player.vy;
        player.angle = player.vy * 0.08;

        ctx.save();
        ctx.translate(player.x, player.y); 
        ctx.rotate(player.angle);
        if (shields > 0) {
            ctx.strokeStyle = '#06b6d4'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0,0,player.r + 8,0,Math.PI*2); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0,0,player.r,0,Math.PI*2); ctx.clip();
        if (playerImg.complete) ctx.drawImage(playerImg, -player.r, -player.r, player.r*2, player.r*2);
        ctx.restore();

        // צינורות
        for (let i = pipes.length - 1; i >= 0; i--) {
            let p = pipes[i]; p.x -= effectiveSpeed;
            ctx.fillStyle = stageConfigs[currentStage].pipe;
            ctx.fillRect(p.x, 0, 80, p.topH);
            ctx.fillRect(p.x, p.botY, 80, H - p.botY);

            if (!p.passed && p.x < player.x) {
                p.passed = true; 
                score++; 
                currentSpeed += 0.04; // המהירות עולה בכל מכשול
                if (score % 10 === 0) levelUp();
                document.getElementById('score').textContent = score;
            }

            if (player.x + player.r > p.x && player.x - player.r < p.x + 80) {
                if (player.y - player.r < p.topH || player.y + player.r > p.botY) {
                    if (shields > 0) {
                        shields--; 
                        updatePowerDisplay();
                        pipes.splice(i, 1);
                    } else gameOver();
                }
            }
            if (p.x < -100) pipes.splice(i, 1);
        }

        // מטבעות
        for (let i = items.length - 1; i >= 0; i--) {
            let it = items[i]; it.x -= effectiveSpeed;
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath(); ctx.arc(it.x, it.y, it.r, 0, Math.PI*2); ctx.fill();
            
            if (Math.hypot(player.x - it.x, player.y - it.y) < player.r + it.r) {
                coinsOwned += 3; 
                currentSpeed += 0.08; // מטבע מעלה מהירות כפול ממכשול (0.04 * 2)
                saveAndRefresh();
                items.splice(i, 1);
            }
        }

        if (player.y > H || player.y < 0) gameOver();
        requestAnimationFrame(loop);
    }

    function levelUp() {
        level++;
        currentStage = Math.min(Math.floor((level - 1) / 2), stageConfigs.length - 1);
        document.getElementById('levelText').textContent = level;
    }

    function spawnPipe() {
        let gap = 230 + (level * 2);
        let center = Math.random() * (H - gap - 160) + 80 + gap/2;
        pipes.push({ x: W, topH: center - gap/2, botY: center + gap/2, passed: false });
        if (Math.random() > 0.65) items.push({ x: W + 100, y: center, r: 16 });
    }

    function gameOver() {
        running = false;
        document.getElementById('overlay').style.display = 'flex';
        document.getElementById('gameover').textContent = "ניקוד: " + score;
        let nextReviveCost = 300 + (reviveCount * 100);
        document.getElementById('reviveCost').textContent = nextReviveCost;
        if(db) saveScore(score);
    }

    // מאזין קפיצה לאייפון
    window.addEventListener('touchstart', (e) => {
        if (running && e.target.tagName !== 'BUTTON') {
            player.vy = jump;
        }
    }, {passive: false});

    async function saveScore(s) {
        const name = document.getElementById('playerName').value || "שחקן";
        if (s > 0 && db) await db.collection('scores').add({ name, score: s, date: new Date() });
    }

    async function loadLeaderboard() {
        const list = document.getElementById('scoresList');
        list.innerHTML = "טוען...";
        if(!db) return;
        const snap = await db.collection('scores').orderBy('score', 'desc').limit(5).get();
        let h = "";
        snap.forEach(doc => h += `<p>${doc.data().name}: ${doc.data().score}</p>`);
        list.innerHTML = h || "אין תוצאות";
    }
});
