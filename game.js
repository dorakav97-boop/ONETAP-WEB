alert('JS loaded');
// Simple one-tap canvas game (Flappy-like)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W=window.innerWidth, H=window.innerHeight;
function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
window.addEventListener('resize', resize);
resize();

// UI
const scoreEl=document.getElementById('score');
const highEl=document.getElementById('high');
const overlay=document.getElementById('overlay');
const retryBtn=document.getElementById('retry');

let high = parseInt(localStorage.getItem('onetap_high')||'0');
highEl.textContent = 'High: '+high;

// Game state
let player = { x: W*0.3, y: H*0.5, r: Math.min(28, W*0.06), vy:0 };
let gravity = 0.9 * (H/800);
let jump = -14 * (H/800);
let pipes = [];
let spawnTimer=0, spawnRate=1100; // ms
let speed = 3 * (W/800);
let score=0;
let running=false;
let lastTime=0;

// input
function tap(){
  if(!running){ start(); return; }
  player.vy = jump;
}
window.addEventListener('mousedown', tap);
window.addEventListener('touchstart', (e)=>{ e.preventDefault(); tap(); }, {passive:false});

// start/restart
function start(){
  running = true;
  player.y = H*0.5; player.vy=0;
  pipes=[]; spawnTimer=0; score=0; updateUI();
  overlay.classList.add('hidden');
  lastTime = performance.now();
  loop(lastTime);
}
retryBtn.addEventListener('click', start);

// spawn pipe pair
function spawnPair(){
  const gap = Math.max(110, H*0.22);
  const center = Math.random()*(H - gap - 120) + 60 + gap/2;
  const top = { x: W + 60, y: 0, w: 60, h: center - gap/2 };
  const bottom = { x: W + 60, y: center + gap/2, w: 60, h: H - (center + gap/2) };
  const sensor = { x: W + 60 + 30, y: center, w: 2, passed:false };
  pipes.push({top,bottom,sensor});
}

// update/draw
function loop(now){
  if(!running) return;
  const dt = now - lastTime;
  lastTime = now;
  // update
  spawnTimer += dt;
  if(spawnTimer > spawnRate){
    spawnTimer = 0;
    spawnPair();
    // slowly increase difficulty
    spawnRate = Math.max(700, spawnRate - 6);
    speed += 0.02;
  }
  // physics
  player.vy += gravity;
  player.y += player.vy;
  // move pipes
  for(let p of pipes){
    p.top.x -= speed;
    p.bottom.x -= speed;
    p.sensor.x -= speed;
  }
  // remove offscreen
  pipes = pipes.filter(p => p.top.x + p.top.w > -50);
  // scoring & collisions
  for(let p of pipes){
    // sensor scoring
    if(!p.sensor.passed && p.sensor.x + p.sensor.w < player.x - player.r/2){
      p.sensor.passed = true; score++; updateUI(); if(score%1===0) localStorage.setItem('onetap_last',score);
      if(score>high){ high=score; localStorage.setItem('onetap_high',high); highEl.textContent='High: '+high; }
    }
    // collision with rects (AABB vs circle approx)
    if(circleRectColl(player, p.top) || circleRectColl(player, p.bottom) || player.y+player.r > H || player.y-player.r < 0){
      gameOver();
      return;
    }
  }

  // draw
  draw();
  requestAnimationFrame(loop);
}

function updateUI(){ scoreEl.textContent = 'Score: '+score; }

function gameOver(){
  running=false;
  overlay.classList.remove('hidden');
}

function draw(){
  // clear
  ctx.clearRect(0,0,W,H);
  // background (gradient already via CSS but fill to be safe)
  // draw pipes
  ctx.fillStyle = '#10b981';
  for(let p of pipes){
    // top
    ctx.fillRect(p.top.x, p.top.y, p.top.w, p.top.h);
    // bottom
    ctx.fillRect(p.bottom.x, p.bottom.y, p.bottom.w, p.bottom.h);
  }
  // player
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.r, 0, Math.PI*2);
  ctx.fill();
}

// collision helper (circle vs rect)
function circleRectColl(c, r){
  const rx = r.x, ry = r.y, rw = r.w, rh = r.h;
  const closestX = clamp(c.x, rx, rx+rw);
  const closestY = clamp(c.y, ry, ry+rh);
  const dx = c.x - closestX;
  const dy = c.y - closestY;
  return (dx*dx + dy*dy) < (c.r*c.r);
}
function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }

// initial instructions overlay
overlay.classList.remove('hidden');
document.getElementById('gameover').textContent = 'Tap to Start';
