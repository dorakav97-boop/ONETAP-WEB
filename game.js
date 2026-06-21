const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W, H;
function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
window.addEventListener('resize', resize);
resize();

const scoreEl=document.getElementById('score');
const highEl=document.getElementById('high');
const overlay=document.getElementById('overlay');
const retryBtn=document.getElementById('retry');
const statusText=document.getElementById('gameover');

let high = parseInt(localStorage.getItem('onetap_high')||'0');
highEl.textContent = 'High: '+high;

let player = { x: 50, y: 0, r: 20, vy:0 };
let gravity = 0.5;
let jump = -8;
let pipes = [];
let spawnTimer=0, spawnRate=1500; 
let speed = 3;
let score=0;
let running=false;

function tap(){
  if(!running) { start(); }
  else { player.vy = jump; }
}

window.addEventListener('mousedown', tap);
window.addEventListener('touchstart', (e)=>{ e.preventDefault(); tap(); }, {passive:false});

function start(){
  running = true;
  player.y = H/2; player.vy=0; player.x = W*0.2;
  pipes=[]; spawnTimer=0; score=0;
  scoreEl.textContent = "Score: 0";
  overlay.style.display = 'none'; // זה מעלים את הכתב בוודאות
  loop();
}

function spawnPair(){
  const gap = 200; // רווח גדול וקל
  const center = Math.random()*(H - gap - 100) + 50 + gap/2;
  pipes.push({
    x: W,
    topH: center - gap/2,
    botY: center + gap/2,
    passed: false
  });
}

function loop(){
  if(!running) return;
  ctx.clearRect(0,0,W,H);
  
  spawnTimer += 16;
  if(spawnTimer > spawnRate){
    spawnTimer = 0;
    spawnPair();
  }

  player.vy += gravity;
  player.y += player.vy;

  for(let i=pipes.length-1; i>=0; i--){
    let p = pipes[i];
    p.x -= speed;

    ctx.fillStyle = '#10b981';
    ctx.fillRect(p.x, 0, 50, p.topH);
    ctx.fillRect(p.x, p.botY, 50, H - p.botY);

    if(!p.passed && p.x < player.x){
      p.passed = true;
      score++;
      scoreEl.textContent = "Score: " + score;
      if(score > high){
        high = score;
        localStorage.setItem('onetap_high', high);
        highEl.textContent = "High: " + high;
      }
    }

    if(player.x + player.r > p.x && player.x - player.r < p.x + 50){
      if(player.y - player.r < p.topH || player.y + player.r > p.botY){
        gameOver();
      }
    }
    if(p.x < -50) pipes.splice(i, 1);
  }

  if(player.y > H || player.y < 0) gameOver();

  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
  ctx.fill();

  requestAnimationFrame(loop);
}

function gameOver(){
  running = false;
  overlay.style.display = 'flex';
  statusText.textContent = "Game Over";
  retryBtn.textContent = "Try Again";
}
