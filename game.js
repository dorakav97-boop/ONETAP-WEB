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
    const text = `שיחקתי והגעתי ל־${score} נקודות!`;
    const link = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + window.location.href);
    openUrl(link);
  });
  btnTelegram.addEventListener('click', () => {
    const text = `שיחקתי והגעתי ל־${score} נקודות!`;
    const link = 'https://t.me/share/url?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(text);
    openUrl(link);
  });
  btnShareAfter.addEventListener('click', () => {
    const text = `שיחקתי והגעתי ל־${score} נקודות!`;
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
    skins.forEa
