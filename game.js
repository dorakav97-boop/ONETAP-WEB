// Simple canvas runner with skins, rare collectible shield, share and Game Over overlay.
// Copy this entire file to replace your existing game.js
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  // fixed internal resolution
  const INTERNAL_W = 800;
  const INTERNAL_H = 400;
  canvas.width = INTERNAL_W;
  canvas.height = INTERNAL_H;
  // UI elems
  const scoreEl = document.getElementById('score');
  const coinsEl = document.getElementById('coins');
  const shieldStatusEl = document.getElementById('shieldStatus');
  const overlay = document.getElementById('overlay');
  const finalScoreEl = document.getElementById('finalScore');
  const btnRetry = document.getElementById('btnRetry');
  const btnShareAfter = document.getElementById('btnShareAfter');
  const btnWhatsapp = document.getElementById('shareWhatsapp');
  const btnTelegram = document.getElementById('shareTelegram');
  const btnSkins = document.getElementById('btnSkins');
  const btnShop = document.getElementById('btnShop');
  const panelSkins = document.getElementById('panelSkins');
  const panelShop = document.getElementById('panelShop');
  const skinsList = document.getElementById('skinsList');
  const closeButtons = document.querySelectorAll('.closePanel');
  const btnMute = document.getElementById('btnMute');
  // State
  let running = false;
  let score = 0;
  let coins = 0;
  let speed = 3;
  let gravity = 0.9;
  let objects = [];
  let collectibles = [];
  let tick = 0;
  let muted = false;
  // Shield
  let shield = {
    active: false,
    expiresAt: 0,
    duration: 5000 // ms
  };
  // Skins
  const skins = [
    { id: 'default', label: 'ברירת מחדל', color: '#ffcc00' },
    { id: 'blue', label: 'כחול', color: '#4f46e5' },
    { id: 'green', label: 'ירוק', color: '#10b981' },
    { id: 'red', label: 'אדום', color: '#ef4444' }
  ];
  let currentSkin = localStorage.getItem('game-skin') || 'default';
  // Player
  const player = {
    x: 80,
    y: INTERNAL_H - 70,
    w: 40,
    h: 40,
    vy: 0,
    onGround: true,
    jumpPower: -13
  };
  // Input
  let spaceDown = false;
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { spaceDown = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { spaceDown = false; }
  });
  canvas.addEventListener('touchstart', e => { e.preventDefault(); spaceDown = true; }, {passive:false});
  window.addEventListener('touchend', e => { spaceDown = false; });
  // Sounds (optional placeholders)
  const soundJump = new Audio();
  const soundCoin = new Audio();
  const soundHit = new Audio();
  soundJump.src = ''; // put actual paths if you have them in repo
  soundCoin.src = '';
  soundHit.src = '';
  // Helpers
  function rectsOverlap(a, b) {
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }
  function spawnObstacle() {
    const h = 24 + Math.random() * 56;
    objects.push({
      x: INTERNAL_W + 60,
      y: INTERNAL_H - h - 20,
      w: 20 + Math.random() * 40,
      h: h
    });
  }
  // Very rare shield collectible
  function maybeSpawnCollectible() {
    // ~0.1% per frame at 60fps → very rare
    if (Math.random() < 0.001) {
      collectibles.push({
        x: INTERNAL_W + 40,
        y: INTERNAL_H - 120 - Math.random() * 140,
        w: 20,
        h: 20,
        type: 'shield'
      });
    }
  }
  // Reset / Start / End
  function startGame() {
    running = true;
    score = 0;
    coins = 0;
    speed = 3;
    objects = [];
    collectibles = [];
    tick = 0;
    shield.active = false;
    shield.expiresAt = 0;
    overlay.hidden = true;
    player.y = INTERNAL_H - 70;
    player.vy = 0;
    player.onGround = true;
    requestAnimationFrame(loop);
  }
  function gameOver() {
    running = false;
    overlay.hidden = false;
    finalScoreEl.textContent = 'ניקוד: ' + score;
  }
  // Sharing
  function openUrl(url) {
    window.open(url, '_blank');
  }
  btnWhatsapp.addEventListener('click', () => {
    const text = שיחקתי והגעתי ל־${score} נקודות!;
    const link = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + window.location.href);
    openUrl(link);
  });
  btnTelegram.addEventListener('click', () => {
    const text = שיחקתי והגעתי ל־${score} נקודות!;
    const link = 'https://t.me/share/url?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(text);
    openUrl(link);
  });
  btnShareAfter.addEventListener('click', () => {
    const text = שיחקתי והגעתי ל־${score} נקודות!;
    if (navigator.share) {
      navigator.share({ title: 'תוצאה', text }).catch(()=>{});
    } else {
      const link = 'https://t.me/share/url?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(text);
      openUrl(link);
    }
  });
  btnRetry.addEventListener('click', () => startGame());
  // Mute toggle
  btnMute.addEventListener('click', () => {
    muted = !muted;
    btnMute.textContent = muted ? 'קול: כבוי' : 'קול: מופעל';
  });
  btnMute.textContent = 'קול: מופעל';
  // Panels
  btnSkins.addEventListener('click', () => {
    panelSkins.hidden = !panelSkins.hidden;
    panelShop.hidden = true;
  });
  btnShop.addEventListener('click', () => {
    panelShop.hidden = !panelShop.hidden;
    panelSkins.hidden = true;
  });
  closeButtons.forEach(b => b.addEventListener('click', () => {
    panelSkins.hidden = true; panelShop.hidden = true;
  }));
  // Build skins UI
  function buildSkinsUI() {
    skinsList.innerHTML = '';
    skins.forEach(s => {
      const el = document.createElement('div');
      el.className = 'skinCard';
      el.title = s.label;
      el.dataset.id = s.id;
      el.style.background = s.color;
      if (s.id === currentSkin) el.classList.add('selected');
      el.addEventListener('click', () => {
        currentSkin = s.id;
        localStorage.setItem('game-skin', currentSkin);
        document.querySelectorAll('.skinCard').forEach(x => x.classList.remove('selected'));
        el.classList.add('selected');
      });
      skinsList.appendChild(el);
    });
  }
  function updateHUD() {
    scoreEl.textContent = 'ניקוד: ' + score;
    coinsEl.textContent = 'מטבעות: ' + coins;
    shieldStatusEl.textContent = shield.active ? 'מגן: פעיל' : 'מגן: אין';
  }
  function drawPlayer() {
    const s = skins.find(x => x.id === currentSkin) || skins[0];
    ctx.fillStyle = s.color;
    ctx.fillRect(player.x, player.y, player.w, player.h);
    if (shield.active) {
      ctx.strokeStyle = 'rgba(45,212,191,0.95)';
      ctx.lineWidth = 4;
      ctx.strokeRect(player.x - 6, player.y - 6, player.w + 12, player.h + 12);
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#2dd4bf';
      ctx.fillRect(player.x - 8, player.y - 8, player.w + 16, player.h + 16);
      ctx.globalAlpha = 1;
    }
  }
  // Main loop
  function loop() {
    if (!running) return;
    tick++;
    // clearו
    ctx.clearRect(0, 0, INTERNAL_W, INTERNAL_H);
      // sky/background
ctx.fillStyle = '#87CEEB';
ctx.fillRect(0, 0, INTERNAL_W, INTERNAL_H);

// ground
ctx.fillStyle = '#374151';
ctx.fillRect(0, INTERNAL_H - 20, INTERNAL_W, 20);

// spawn obstacles
if (tick % Math.max(50, Math.floor(220 - score / 3)) === 0) {
  spawnObstacle();
}
maybeSpawnCollectible();

// player input -> jump
if (spaceDown && player.onGround) {
  player.vy = player.jumpPower;
  player.onGround = false;
  if (!muted && soundJump.src) soundJump.play().catch(()=>{});
}

// physics
player.vy += gravity;
player.y += player.vy;
if (player.y + player.h >= INTERNAL_H - 20) {
  player.y = INTERNAL_H - 20 - player.h;
  player.vy = 0;
  player.onGround = true;
}

// update objects
for (let i = objects.length - 1; i >= 0; i--) {
  const o = objects[i];
  o.x -= speed;
  ctx.fillStyle = '#111827';
  ctx.fillRect(o.x, o.y, o.w, o.h);

  if (o.x + o.w < -60) objects.splice(i, 1);

  if (rectsOverlap(player, o)) {
    if (shield.active) {
      shield.active = false;
      shield.expiresAt = 0;
      objects.splice(i, 1);
      if (!muted && soundHit.src) soundHit.play().catch(()=>{});
    } else {
      if (!muted && soundHit.src) soundHit.play().catch(()=>{});
      gameOver();
      return;
    }
  }
}

// update collectibles
for (let i = collectibles.length - 1; i >= 0; i--) {
  const c = collectibles[i];
  c.x -= speed;
  if (c.type === 'shield') {
    // blue orb
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2, c.y + c.h / 2, c.w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0369a1';
    ctx.fillText('+', c.x + c.w/4, c.y + c.h/1.2);
  } else {
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(c.x, c.y, c.w, c.h);
  }

  if (c.x + c.w < -60) collectibles.splice(i, 1);
  else if (rectsOverlap(player, c)) {
    if (c.type === 'shield') {
      shield.active = true;
      shield.expiresAt = Date.now() + shield.duration;
    } else {
      coins += 1;
    }
    collectibles.splice(i, 1);
    if (!muted && soundCoin.src) soundCoin.play().catch(()=>{});
  }
}

// small random coins spawn
if (Math.random() < 0.012) {
  collectibles.push({
    x: INTERNAL_W + 20,
    y: INTERNAL_H - 60 - Math.random() * 80,
    w: 12,
    h: 12,
    type: 'coin'
  });
}

// shield expiry
if (shield.active && Date.now() > shield.expiresAt) {
  shield.active = false;
}

// draw player
drawPlayer();

// score display
ctx.fillStyle = '#ffffff';
ctx.font = '18px sans-serif';
ctx.fillText('ניקוד: ' + score, INTERNAL_W - 160, 30);

// increment score and difficulty
if (tick % 10 === 0) {
  score += 1;
  if (score % 60 === 0) speed += 0.35;
}

updateHUD();

requestAnimationFrame(loop);
