const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W, H;
function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
window.addEventListener('resize', resize);
resize();

const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const overlay = document.getElementById('overlay');

// טעינת תמונה וצליל
const playerImg = new Image();
playerImg.src = 'me.png.JPG'; // וודא שהעלית קובץ בשם הזה
const jumpSound = new Audio('jump.mp3.wav'); // וודא שהעלית קובץ בשם הזה

let high = parseInt(localStorage.getItem('onetap_high')||'0');
highEl.textContent = 'High: ' + high;

let player = { x: 50, y: 0, r: 25, vy: 0 };
let gravity = 0.4;
let jump = -7;
let pipes = [];
let spawnTimer = 0;
let score = 0;
let running = false;

// משתני קושי שמשתנים
let currentSpeed = 2.5;
let currentGap = 250;
let currentSpawnRate = 1800;

function tap() {
    if (!running) {
        start();
    } else {
        player.vy = jump;
        // מפעיל את הצליל (מאתחל אותו להתחלה כדי שיוכל להתנגן ברצף)
        jumpSound.currentTime = 0;
        jumpSound.play().catch(e => console.log("Sound ready after first click"));
    }
}

window.addEventListener('mousedown', tap);
window.addEventListener('touchstart', (e) => { e.preventDefault(); tap(); }, { passive: false });

function start() {
    running = true;
    score = 0;
    pipes = [];
    player.y = H / 2;
    player.vy = 0;
    player.x = W * 0.2;
    
    // איפוס קושי בכל התחלה
    currentSpeed = 2.5;
    currentGap = 250;
    currentSpawnRate = 1800;
    
    scoreEl.textContent = "Score: 0";
    overlay.style.display = 'none'; 
    loop();
}

function spawnPair() {
    // ככל שהניקוד עולה, הרווח (Gap) קטן עד למינימום של 140
    let gap = Math.max(140, currentGap - (score * 2));
    const minPipeHeight = 50;
    const center = Math.random() * (H - gap - (minPipeHeight * 2)) + minPipeHeight + gap / 2;
    
    pipes.push({
        x: W,
        topH: center - gap/2,
        botY: center + gap/2,
        passed: false,
        color: `hsl(${Math.random() * 360}, 70%, 50%)` // צבע מכשול משתנה כל פעם
    });
}

function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    // עדכון קושי לפי ניקוד
    currentSpeed = 2.5 + (score * 0.1); // מהירות עולה ב-0.1 כל נקודה
    currentSpawnRate = Math.max(800, 1800 - (score * 20)); // מכשולים מגיעים מהר יותר

    spawnTimer += 16;
    if (spawnTimer > currentSpawnRate) {
        spawnTimer = 0;
        spawnPair();
    }

    player.vy += gravity;
    player.y += player.vy;

    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        p.x -= currentSpeed;

        ctx.fillStyle = p.color; // משתמש בצבע המשתנה של המכשול
        ctx.fillRect(p.x, 0, 60, p.topH);
        ctx.fillRect(p.x, p.botY, 60, H - p.botY);

        if (!p.passed && p.x < player.x) {
            p.passed = true;
            score++;
            scoreEl.textContent = "Score: " + score;
            if (score > high) {
                high = score;
                localStorage.setItem('onetap_high', high);
                highEl.textContent = "High: " + high;
            }
        }

        if (player.x + player.r > p.x && player.x - player.r < p.x + 60) {
            if (player.y - player.r < p.topH || player.y + player.r > p.botY) {
                gameOver();
            }
        }
        if (p.x < -70) pipes.splice(i, 1);
    }

    if (player.y > H || player.y < 0) gameOver();

    // ציור השחקן - אם התמונה נטענה נצייר אותה, אחרת נצייר עיגול
    if (playerImg.complete && playerImg.width > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(playerImg, player.x - player.r, player.y - player.r, player.r * 2, player.r * 2);
        ctx.restore();
    } else {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
        ctx.fill();
    }

    requestAnimationFrame(loop);
}

function gameOver() {
    running = false;
    overlay.style.display = 'flex';
    document.getElementById('gameover').textContent = "Game Over! Score: " + score;
}
