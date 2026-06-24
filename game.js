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
    let invShields = parseInt(localStorage.getItem('onetap_inv_shields') || '0');
    let invSlows = parseInt(localStorage.getItem('onetap_inv_slows') || '0');
    
    let shieldActive = false;
    let slowTimer = 0;
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
        { bg: "#431407", pipe: "#f97316" }, // שלב 4 - תנועה
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

    // חנות
    bind('buy-shield', () => { if (coinsOwned >= 75) { coinsOwned -= 75; invShields++; localStorage.setItem('onetap_inv_shields', invShields); saveAndRefresh(); } });
    bind('buy-slow', () => { if (coinsOwned >= 150) { coinsOwned -= 150; invSlows++; localStorage.setItem('onetap_inv_slows', invSlows); saveAndRefresh(); } });
    
    // שימוש בכוחות
    bind('use-shield', () => { if (invShields > 0 && !shieldActive && running) { invShields--; shieldActive = true; localStorage.setItem('onetap_inv_shields', invShields); saveAndRefresh(); } });
    bind('use-slow', () => { if (invSlows > 0 && slowTimer <= 0 && running) { invSlows--; slowTimer = 400; localStorage.setItem('onetap_inv_slows', invSlows); saveAndRefresh(); } });

    bind('btnRevive', () => {
        let cost = 300 + (reviveCount * 100);
        if (coinsOwned >= cost) { coinsOwned -= cost; reviveCount++; saveAndRefresh(); revivePlayer(); }
        else alert("אין מספיק מטבעות!");
    });

    bind('muteBtn', () => { muted = !muted; document.getElementById('muteBtn').textContent = muted ? '🔇' : '🔊'; });
    
    bind('shareWA', () => {
        const text = `הגעתי ל-LEVEL ${level} עם ${score} נקודות ב-OneTap MEGA! מי עוקף? 👑 ${window.location.href}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    });

    bind('shareTG', () => {
        const text = `הגעתי ל-LEVEL ${level} עם ${score} נקודות ב-OneTap MEGA! מי עוקף? 👑`;
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank');
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

    // סקינים
    document.getElementById('imageUpload').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => { playerImg.src = ev.target.result; localStorage.setItem('onetap_custom_skin', ev.target.result); };
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
    bind('btnLeaderboard', () => { showScreen('leaderboardMenu'); loadLeader
