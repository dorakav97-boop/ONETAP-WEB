const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W, H;
function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
window.addEventListener('resize', resize);
resize();

const scoreEl = document.getElementById('score');
const highEl = document.getElementById('high');
const overlay = document.getElementById('overlay');

let high = parseInt(localStorage.getItem('onetap_high')||'0');
highEl.textContent = 'High: ' + high;

let player = { x: 50, y: 0, r: 18, vy: 0 };
let gravity = 0.4; // כבידה חלשה יותר
let jump = -7;    // קפיצה עדינה יותר
let pipes = [];
let spawnTimer = 0;
let spawnRate = 1800; // מכשולים מגיעים לאט יותר
let speed = 2.5;     // מהירות איטית יותר
let score = 0;
let running = false;

// פונקציית הלחיצה
function tap() {
    if (!running) {
        start();
    } else {
        player.vy = jump;
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
    scoreEl.textContent = "Score: 0";
    
    // התיקון הקריטי - מעלים את כל התיבה של הטקסט
    overlay.style.display = 'none'; 
    
    loop();
}

function spawnPair() {
    const gap = 220; // רווח ענקי - קל מאוד לעבור
    const minPipeHeight = 50;
    const center = Math.random() * (H - gap - (minPipeHeight * 2)) + minPipeHeight + gap / 2;
    pipes.push({
        x: W,
        topH: center - gap / 2,
        botY: center + gap / 2,
        passed: false
    });
}

function loop() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    spawnTimer += 16;
    if (spawnTimer > spawnRate) {
        spawnTimer = 0;
        spawnPair();
    }

    player.vy += gravity;
    player.y += player.vy;

    for (let i = pipes.length - 1; i >= 0; i--) {
        let p = pipes[i];
        p.x -= speed;

        // ציור מכשולים
        ctx.fillStyle = '#10b981';
        ctx.fillRect(p.x, 0, 50, p.topH);
        ctx.fillRect(p.x, p.botY, 50, H - p.botY);

        // ניקוד
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

        // בדיקת פסילה (התנגשות)
        if (player.x + player.r > p.x && player.x - player.r < p.x + 50) {
            if (player.y - player.r < p.topH || player.y + player.r > p.botY) {
                gameOver();
            }
        }
        if (p.x < -60) pipes.splice(i, 1);
    }

    // פסילה אם נופל או עף למעלה
    if (player.y > H || player.y < 0) gameOver();

    // ציור השחקן (הכדור)
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fill();

    requestAnimationFrame(loop);
}

function gameOver() {
    running = false;
    overlay.style.display = 'flex'; // מחזיר את המסך
    const statusText = document.getElementById('gameover');
    statusText.textContent = "Game Over! Tap to Restart";
}
