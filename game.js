// Minimal working game.js — העתק את כל הקובץ (מחליף את הקיים)

(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const W = canvas.width = 800;
  const H = canvas.height = 400;

  // UI
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const shieldStatusEl = document.getElementById('shieldStatus');
  const overlay = document.getElementById('overlay');
  const finalScoreEl = document.getElementById('finalScore');
  const btnRetry = document.getElementById('btnRetry');

  // State
  let running = false;
  let score = 0;
  let tick = 0;
  let obstacles = [];

  // Player
  const player = { x:80, y:H-60, w:40, h:40, vy:0, onGround:true };

  // Input
  let jumpPressed = false;
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { jumpPressed = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space' || e.code === 'ArrowUp') jumpPressed = false; });
  canvas.addEventListener('click', () => {
    if (!running) startGame();
    else { jumpPressed = true; setTimeout(()=> jumpPressed = false, 120); }
  });

  function spawnObstacle(){
    obstacles.push({ x: W + 20, y: H - 40 - Math.random()*40, w: 20 + Math.random()*30, h: 20 + Math.random()*40 });
  }

  function rectsOverlap(a,b){
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  function startGame(){
    running = true;
    score = 0;
    tick = 0;
    obstacles = [];
    overlay.hidden = true;
    player.y = H - 60;
    player.vy = 0;
    player.onGround = true;
    requestAnimationFrame(loop);
  }

  function gameOver(){
    running = false;
    overlay.hidden = false;
    finalScoreEl.textContent = 'ניקוד: ' + score;
  }

  btnRetry.addEventListener('click', startGame);

  function loop(){
    if (!running) return;
    tick++;
    // clear
    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0,0,W,H);
    // ground
    ctx.fillStyle = '#374151';
    ctx.fillRect(0,H-20,W,20);

    // spawn
    if (tick % 100 === 0) spawnObstacle();

    // player jump
    if (jumpPressed && player.onGround) { player.vy = -12; player.onGround = false; jumpPressed = false; }
    player.vy += 0.8;
    player.y += player.vy;
    if (player.y + player.h >= H - 20) { player.y = H - 20 - player.h; player.vy = 0; player.onGround = true; }

    // obstacles
    for (let i = obstacles.length-1; i>=0; i--){
      const o = obstacles[i];
      o.x -= 4;
      ctx.fillStyle = '#111827';
      ctx.fillRect(o.x,o.y,o.w,o.h);
      if (o.x + o.w < -50) obstacles.splice(i,1);
      if (rectsOverlap(player,o)) { gameOver(); return; }
    }

    // draw player
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(player.x,player.y,player.w,player.h);

    // HUD
    score = Math.floor(tick/10);
    scoreEl.textContent = 'ניקוד: ' + score;

    requestAnimationFrame(loop);
  }

  // initial splash
  ctx.fillStyle = '#082032';
  ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('לחץ/הקש כדי להתחיל', W/2 - 90, H/2);

})();
