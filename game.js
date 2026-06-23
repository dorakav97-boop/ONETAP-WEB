window.addEventListener('load', () => {
    // אתחול Firebase בסיסי
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

    // פונקציה למעבר בין מסכים
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        const target = document.getElementById(screenId);
        if (target) target.style.display = 'flex';
    }

    // חיבור כפתורים - פשוט וישיר
    const setupButtons = () => {
        const buttons = {
            'btnPlay': () => { start(); showScreen('gameScreen'); },
            'btnSkins': () => showScreen('skinsMenu'),
            'btnShop': () => showScreen('shopMenu'),
            'btnLeaderboard': () => { showScreen('leaderboardMenu'); loadLeaderboard(); },
            'backFromSkins': () => showScreen('mainMenu'),
            'backFromShop': () => showScreen('mainMenu'),
            'backFromLeaderboard': () => showScreen('mainMenu'),
            'homeBtn': () => { running = false; showScreen('mainMenu'); document.getElementById('overlay').style.display='none'; },
            'retry': () => start()
        };

        for (let id in buttons) {
            const btn = document.getElementById(id);
            if (btn) {
                btn.onclick = (e) => {
                    e.preventDefault();
                    buttons[id]();
                };
                // תמיכה בטאץ' לאייפון
                btn.ontouchstart = (e) => {
                    e.preventDefault();
                    buttons[id]();
                };
            }
        }
    };

    setupButtons();

    // --- לוגיקת המשחק (מקוצרת כדי לוודא עבודה) ---
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    let W, H, running = false, score = 0;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    window.addEventListener('resize', resize);
    resize();

    function start() {
        running = true;
        score = 0;
        document.getElementById('overlay').style.display = 'none';
        gameLoop();
    }

    function gameLoop() {
        if (!running) return;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = "#06b6d4";
        ctx.fillRect(W/2 - 25, H/2 - 25, 50, 50); // ריבוע זמני במקום השחקן לבדיקה
        
        requestAnimationFrame(gameLoop);
    }

    function gameOver() {
        running = false;
        document.getElementById('overlay').style.display = 'flex';
    }
    
    // חשיפת פונקציות ל-window למקרה הצורך
    window.start = start;
    window.showScreen = showScreen;
});
