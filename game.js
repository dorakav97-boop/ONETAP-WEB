window.addEventListener('DOMContentLoaded', () => {

  // Firebase config (החלף אם צריך)
  const firebaseConfig = {
    apiKey: "AIzaSyBW-oSotemXbf3rpbHwAp-jFUVB0",
    authDomain: "dor-akav-game.firebaseapp.com",
    projectId: "dor-akav-game",
    storageBucket: "dor-akav-game.firebasestorage.app",
    messagingSenderId: "630792064093",
    appId: "1:630792064093:web:3a7c53b696e86899b8",
    measurementId: "G-LM4P75B50D"
  };
  if (typeof firebase !== 'undefined') {
    try { firebase.initializeApp(firebaseConfig); } catch(e){ /* אם כבר מאותחל */ }
  }
  const db = (firebase && firebase.firestore) ? firebase.firestore() : null;

  // אלמנטים
  const canvas = document.getElementById('game'), ctx = canvas.getContext ? canvas.getContext('2d') : null;
  const scoreEl = document.getElementById('score'), levelDisp = document.getElementById('levelDisp');
  const overlay = document.getElementById('overlay'), retryBtn = document.getElementById('retry'), homeBtn = document.getElementById('homeBtn');
  const playerNameInput = document.getElementById('playerName'), scoresList = document.getElementById('scoresList');
  const scoresListOverlay = document.getElementById('scoresListOverlay');
  const shareWA = document.getElementById('shareWA'), shareTG = document.getElementById('shareTG');
  const muteBtn = document.getElementById('muteBtn');
  const shopCoinsEl = document.getElementById('shopCoins'), coinsDisplay = document.getElementById('coinsDisplay');

  // תפריטים וכפתורים
  const mainMenu = document.getElementById('mainMenu');
  const skinsMenu = document.getElementById('skinsMenu');
  const shopMenu = document.getElementById('shopMenu');
  const leaderboardMenu = document.getElementById('leaderboardMenu');
  const btnSkins = document.getElementById('btnSkins');
  const btnPlay = document.getElementById('btnPlay');
  const btnLeaderboard = document.getElementById('btnLeaderboard');
  const btnShop = document.getElementById('btnShop');
  const backFromSkins = document.getElementById('backFromSkins');
  const backFromShop = document.getElementById('backFromShop');
  const backFromLeaderboard = document.getElementById('backFromLeaderboard');
  const uploadSkinBtn = document.getElementById('uploadSkinBtn');
  const customSkinInput = document.getElementById('customSkinInput');

  if (!canvas || !ctx) { console.error('Canvas/context missing'); return; }

  // גודל canvas
  let W, H;
  function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = Math.max(200, window.innerHeight - 140); }
  window.addEventListener('resize', resize);
  resize();

  // סאונד & מיוט
  const jumpSound = new Audio('jump.mp3.wav'); jumpSound.volume = 0.9;
  let muted = false;
  if (muteBtn) {
    muteBtn.addEventListener('click', () => { muted = !muted; jumpSound.muted = muted; muteBtn.textContent = muted ? '🔇' : '🔊'; });
  }

  // נתונים נשמרים
  let high = parseInt(localStorage.getItem('onetap_high')||'0');
  let coinsOwned = parseInt(localStorage.getItem('onetap_coins')||'0');
  if (shopCoinsEl) shopCoinsEl.textContent = coinsOwned;
  if (coinsDisplay) coinsDisplay.textContent = coinsOwned;

  // סקינים
  let playerImg = new Image();
  let selectedSkin = localStorage.getItem('onetap_skin') || 'default';
  let customSkinDataUrl = localStorage.getItem('onetap_custom_skin') || null;
  function applySkin(skin){
    selectedSkin = skin;
    localStorage.setItem('onetap_skin', skin);
    if (skin === 'default') playerImg.src = 'me.png.JPG';
    else if (skin === 'fire') playerImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><circle cx='100' cy='100' r='90' fill='orange'/><text x='50%' y='58%' font-size='60' text-anchor='middle' fill='white'>🔥</text></svg>`);
    else if (skin === 'star') playerImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><circle cx='100' cy='100' r='90' fill='#ffd700'/><text x='50%' y='58%' font-size='60' text-anchor='middle' fill='white'>⭐</text></svg>`);
    else if (skin === 'diamond') playerImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect x='20' y='20' width='160' height='160' rx='30' fill='#60a5fa'/></svg>`);
    else if (skin === 'custom' && customSkinDataUrl) playerImg.src = customSkinDataUrl;
  }
  applySkin(selectedSkin);

  // העלאת סקין
  if (uploadSkinBtn && customSkinInput) {
    uploadSkinBtn.addEventListener('click', () => customSkinInput.click());
    customSkinInput.addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { customSkinDataUrl = r.result; localStorage.setItem('onetap_custom_skin', customSkinDataUrl); applySkin('custom'); document.querySelectorAll('.skin-option').forEach(s=>s.classList.remove('active')); uploadSkinBtn.classList.add('active'); };
      r.readAsDataURL(f);
    });
  }

  // בחירת סקין UI
  document.querySelectorAll('.skin-option').forEach(el=>{
    el.addEventListener('click', ()=>{
      document.querySelectorAll('.skin-option').forEach(s=>s.classList.remove('active'));
      el.classList.add('active');
      const s = el.getAttribute('data-skin');
      if (s) applySkin(s);
    });
  });

  // addEventListener navigation
  function bindMenuButtons(){
    if (btnSkins) btnSkins.addEventListener('click', ()=>{ if (mainMenu && skinsMenu){ mainMenu.style.display='none'; skinsMenu.style.display='flex'; } });
    if (backFromSkins) backFromSkins.addEventListener('click', ()=>{ if (skinsMenu && mainMenu){ skinsMenu.style.display='none'; mainMenu.style.display='flex'; } });
    if (btnPlay) btnPlay.addEventListener('click', ()=>{ if (mainMenu){ mainMenu.style.display='none'; start(); } });
    if (btnShop) btnShop.addEventListener('click', ()=>{ if (mainMenu && shopMenu){ mainMenu.style.display='none'; shopMenu.style.display='flex'; } });
    if (backFromShop) backFromShop.addEventListener('click', ()=>{ if (shopMenu && mainMenu){ shopMenu.style.display='none'; mainMenu.style.display='flex'; } });
    if (btnLeaderboard) btnLeaderboard.addEventListener('click', async ()=>{ if (mainMenu && leaderboardMenu){ mainMenu.style.display='none'; leaderboardMenu.style.display='flex'; await loadLeaderboard(); } });
    if (backFromLeaderboard) backFromLeaderboard.addEventListener('click', ()=>{ if (leaderboardMenu && mainMenu){ leaderboardMenu.style.display='none'; mainMenu.style.display='flex'; } });
  }
  bindMenuButtons();

  // leaderboard TOP5
  function escapeHtml(str){ return String(str).replace(/[&<>"'`=\/]/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#96;','=':'&#61;' }[s])); }
  async function loadLeaderboard(){
    if (!db) { if (scoresList) scoresList.innerHTML = '<p>DB לא זמין</p>'; if (scoresListOverlay) scoresListOverlay.innerHTML = '<p>DB לא זמין</p>'; return; }
    try{
      const snap = await db.collection('scores').orderBy('score','desc').limit(5).get();
      const medals = ['🥇','🥈','🥉','🏅','🏅'];
      let html = '';
      let overlayHtml = '';
      let i=0;
      snap.forEach(doc=>{
        i++;
        const d = doc.data();
        const medal = medals[i-1] || '🏅';
        html += `<div class="leaderboard-entry"><div class="rank">${medal}</div><div class="player-name">${escapeHtml(d.name||'---')}</div><div class="player-score">${d.score}</div></div>`;
        overlayHtml += `<div class="leaderboard-entry"><div class="rank">${medal}</div><div class="player-name">${escapeHtml(d.name||'---')}</div><div class="player-score">${d.score}</div></div>`;
      });
      if (scoresList) scoresList.innerHTML = html || '<p>אין תוצאות עדיין</p>';
      if (scoresListOverlay) scoresListOverlay.innerHTML = overlayHtml || '<p>אין תוצאות עדיין</p>';
    } catch(e){ console.error(e); if (scoresList) scoresList.innerHTML = '<p>שגיאה בטעינה</p>'; if (scoresListOverlay) scoresListOverlay.innerHTML = '<p>שגיאה בטעינה</p>'; }
  }

  async function saveScore(name, s){
    if (!db) return;
    if (s === 0) return;
    try{ await db.collection('scores').add({ name: name||'Legend', score: s, timestamp: firebase.firestore.FieldValue.serverTimestamp() }); loadLeaderboard(); }
    catch(e){ console.error(e); }
  }

  // game core vars
  let player = { x: 80, y: 0, r: 30, vy: 0, angle: 0, hasShield: false, trail: [] };
  let gravity = 0.45, jump = -8;
  let pipes = [], items = [], particles = [], clouds = [], score = 0, running = false, currentSpeed = 3.5, spawnTimer = 0, lastTime = 0, level = 1, combo = 0, sloMo = 1;
  let coinValue = 5; // points per coin

  // init clouds
  for (let i=0;i<8;i++) clouds.push({ x: Math.random()*window.innerWidth, y: Math.random()*(window.innerHeight-200), s: 0.08+Math.random()*0.25, r: 20+Math.random()*40 });

  const LEVELS = [
    { level:1, gap:220, speedBoost:0 },
    { level:2, gap:190, speedBoost:0.5 },
    { level:3, gap:160, speedBoost:1.2 },
    { level:4, gap:140, speedBoost:2.0 },
    { level:5, gap:120, speedBoost:3.0 }
  ];
  function getLevelConfig(l){ return LEVELS[Math.min(LEVELS.length-1, l-1)]; }

  function spawnObject(){
    const lvlConf = getLevelConfig(level);
    let gap = Math.max(110, lvlConf.gap - score*0.5);
    let center = Math.random()*(H - gap - 120) + 60 + gap/2;
    let moveDist = level > 2 ? Math.min(120, (level-2)*25) : 0;
    pipes.push({ x: W, topH: center-gap/2, botY: center+gap/2, passed:false, color:`hsl(${(score*18)%360},70%,50%)`, move: moveDist, offset: Math.random()*5 });
    if (Math.random() > 0.65) {
      let type = Math.random() > 0.9 ? 'shield' : 'coin';
      items.push({ x: W + 100, y: center + (Math.random()-0.5)*80, r: 15, type: type });
    }
  }

  function createParticles(x,y,color,count=12){ for (let i=0;i<count;i++) particles.push({ x:x, y:y, vx:(Math.random()-0.5)*8, vy:(Math.random()-0.5)*8, life:1.0, color:color }); }

  // start game
  function start(){
    running = true; score = 0; level = 1; combo = 0; pipes = []; items = []; particles = []; player.trail = [];
    player.y = H/2; player.vy = 0; player.has
