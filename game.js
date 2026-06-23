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
    try { firebase.initializeApp(firebaseConfig); } catch(e){ /* already initialized */ }
  }
  const db = (firebase && firebase.firestore) ? firebase.firestore() : null;

  // Elements
  const get = id => document.getElementById(id);
  const canvas = get('game'), ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const scoreEl = get('score'), levelDisp = get('levelDisp');
  const overlay = get('overlay'), retryBtn = get('retry'), homeBtn = get('homeBtn');
  const playerNameInput = get('playerName'), scoresList = get('scoresList');
  const scoresListOverlay = get('scoresListOverlay');
  const shareWA = get('shareWA'), shareTG = get('shareTG');
  const muteBtn = get('muteBtn');
  const shopCoinsEl = get('shopCoins'), coinsDisplay = get('coinsDisplay');

  // Menus/buttons
  const mainMenu = get('mainMenu'), skinsMenu = get('skinsMenu'), shopMenu = get('shopMenu'), leaderboardMenu = get('leaderboardMenu');
  const btnSkins = get('btnSkins'), btnPlay = get('btnPlay'), btnLeaderboard = get('btnLeaderboard'), btnShop = get('btnShop');
  const backFromSkins = get('backFromSkins'), backFromShop = get('backFromShop'), backFromLeaderboard = get('backFromLeaderboard');
  const uploadSkinBtn = get('uploadSkinBtn'), customSkinInput = get('customSkinInput');

  if (!canvas || !ctx) { console.error('Canvas/context missing'); return; }

  // Resize
  let W, H;
  function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = Math.max(200, window.innerHeight - 140); }
  window.addEventListener('resize', resize); resize();

  // Audio & mute
  const jumpSound = new Audio('jump.mp3.wav'); jumpSound.volume = 0.9;
  let muted = false;
  if (muteBtn) {
    muteBtn.addEventListener('click', () => { muted = !muted; jumpSound.muted = muted; muteBtn.textContent = muted ? '🔇' : '🔊'; });
    muteBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); muteBtn.click(); }, { passive:false });
  }

  // Persistent data
  let high = parseInt(localStorage.getItem('onetap_high')||'0');
  let coinsOwned = parseInt(localStorage.getItem('onetap_coins')||'0');
  if (shopCoinsEl) shopCoinsEl.textContent = coinsOwned;
  if (coinsDisplay) coinsDisplay.textContent = coinsOwned;

  // Skins
  let playerImg = new Image();
  let selectedSkin = localStorage.getItem('onetap_skin') || 'default';
  let customSkinDataUrl = localStorage.getItem('onetap_custom_skin') || null;
  function applySkin(skin){
    selectedSkin = skin; localStorage.setItem('onetap_skin', skin);
    if (skin === 'default') playerImg.src = 'me.png.JPG';
    else if (skin === 'fire') playerImg.src = 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><circle cx='100' cy='100' r='90' fill='orange'/><text x='50%' y='58%' font-size='60' text-anchor='middle' fill='white'>🔥</text></svg>`);
    else if (skin === 'star') playerImg.src = 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><circle cx='100' cy='100' r='90' fill='#ffd700'/><text x='50%' y='58%' font-size='60' text-anchor='middle' fill='white'>⭐</text></svg>`);
    else if (skin === 'diamond') playerImg.src = 'data:image/svg+xml;utf8,'+encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect x='20' y='20' width='160' height='160' rx='30' fill='#60a5fa'/></svg>`);
    else if (skin === 'custom' && customSkinDataUrl) playerImg.src = customSkinDataUrl;
  }
  applySkin(selectedSkin);

  // Upload skin
  if (uploadSkinBtn && customSkinInput) {
    uploadSkinBtn.addEventListener('click', ()=>customSkinInput.click());
    uploadSkinBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); uploadSkinBtn.click(); }, { passive:false });
    customSkinInput.addEventListener('change', (e)=>{
      const f = e.target.files[0]; if(!f) return;
      const r = new FileReader();
      r.onload = ()=>{ customSkinDataUrl = r.result; localStorage.setItem('onetap_custom_skin', customSkinDataUrl); applySkin('custom'); document.querySelectorAll('.skin-option').forEach(s=>s.classList.remove('active')); uploadSkinBtn.classList.add('active'); };
      r.readAsDataURL(f);
    });
  }

  // Skin UI
  document.querySelectorAll('.skin-option').forEach(el=>{
    el.addEventListener('click', ()=>{ document.querySelectorAll('.skin-option').forEach(s=>s.classList.remove('active')); el.classList.add('active'); const s = el.getAttribute('data-skin'); if(s) applySkin(s); });
    el.addEventListener('touchstart', (e)=>{ e.preventDefault(); el.click(); }, { passive:false });
  });

  // Utility: show/hide screens
  function showScreen(idToShow){
    ['mainMenu','skinsMenu','shopMenu','leaderboardMenu','gameScreen'].forEach(id=>{ const el=get(id); if(!el) return; el.style.display = (id===idToShow)? 'flex' : 'none'; });
  }

  // Bind menu buttons robustly (click + touch)
  function bindBtn(elem, fn){
    if(!elem) return;
    elem.addEventListener('click', fn);
    elem.addEventListener('touchstart', (e)=>{ e.preventDefault(); fn(); }, { passive:false });
  }
  bindBtn(btnSkins, ()=> showScreen('skinsMenu'));
  bindBtn(backFromSkins, ()=> showScreen('mainMenu'));
  bindBtn(btnShop, ()=> showScreen('shopMenu'));
  bindBtn(backFromShop, ()=> showScreen('mainMenu'));
  bindBtn(btnLeaderboard, async ()=>{ showScreen('leaderboardMenu'); await loadLeaderboard(); });
  bindBtn(backFromLeaderboard, ()=> showScreen('mainMenu'));

  // Also bind Play, Retry, Home
  bindBtn(btnPlay, ()=> { showScreen('gameScreen'); start(); });
  if (retryBtn) bindBtn(retryBtn, ()=> start());
  if (homeBtn) bindBtn(homeBtn, ()=> { showScreen('mainMenu'); overlay.style.display = 'none'; });

  // Leaderboard
  function escapeHtml(str){ return String(str).replace(/[&<>"'`=\/]/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#96;','=':'&#61;' }[s])); }
  async function loadLeaderboard(){
    if (!db) { if (scoresList) scoresList.innerHTML = '<p>DB לא זמין</p>'; if (scoresListOverlay) scoresListOverlay.innerHTML = '<p>DB לא זמין</p>'; return; }
    try{
      const snap = await db.collection('scores').orderBy('score','desc').limit(5).get();
      const medals = ['🥇','🥈','🥉','🏅','🏅'];
      let html='', overlayHtml=''; let i=0;
      snap.forEach(doc=>{ i++; const d=doc.data(); const medal = medals[i-1]||'🏅'; html += `<div class="leaderboard-entry"><div class="rank">${medal}</div><div class="player-name">${escapeHtml(d.name||'---')}</div><div class="player-score">${d.score}</div></div>`; overlayHtml += html; });
      if (scoresList) scoresList.innerHTML = html || '<p>אין תוצאות</p>'; if (scoresListOverlay) scoresListOverlay.innerHTML = overlayHtml || '<p>אין תוצאות</p>';
    } catch(e){ console.error(e); if (scoresList) scoresList.innerHTML = '<p>שגיאה</p>'; if (scoresListOverlay) scoresListOverlay.innerHTML = '<p>שגיאה</p>'; }
  }

  async function saveScore(name, s){
    if (!db) return;
    if (s===0) return;
    try{ await db.collection('scores').add({ name: name||'Legend', score: s, timestamp: firebase.firestore.FieldValue.serverTimestamp() }); loadLeaderboard(); } catch(e){ console.error(e); }
  }

  // Game core
  let player = { x: 80, y: 0, r: 30, vy: 0, angle:0, hasShield:false, trail:[] };
  let gravity = 0.45, jump = -8;
  let pipes = [], items = [], particles = [], clouds = [], score = 0, running=false, currentSpeed=3.5, spawnTimer=0, lastTime=0, level=1, combo=0, sloMo=1;
  let coinValue = 5;

  // ensure coinsOwned exists
  coinsOwned = parseInt(localStorage.getItem('onetap_coins')||'0');

  // clouds init
  for(let i=0;i<8;i++) clouds.push({ x:Math.random()*window.innerWidth, y:Math.random()*(window.innerHeight-200), s:0.08+Math.random()*0.25, r:20+Math.random()*40 });

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
    if (Math.random() > 0.65) { let type = Math.random() > 0.9 ? 'shield' : 'coin'; items.push({ x: W+100, y: center + (Math.random()-0.5)*80, r:15, type:type }); }
  }

  function createParticles(x,y,color,count=12){ for(let i=0;i<count;i++) particles.push({ x:x, y:y, vx:(Math.random()-0.5)*8, vy:(Math.random()-0.5)*8, life:1.0, color:color }); }

  function start(){
    running = true; score = 0; level = 1; combo = 0; pipes=[]; items=[]; particles=[]; player.trail=[];
    player.y = H/2; player.vy = 0; player.hasShield = false;
    currentSpeed = 3.5; spawnTimer = 0; lastTime = performance.now();
    if (overlay) overlay.style.display = 'none';
    showScreen('gameScreen');
    if (scoreEl) scoreEl.textContent = "0";
    if (levelDisp) levelDisp.textContent = level;
    requestAnimationFrame(loop);
  }
  // expose start globally so external listeners can call it
  window.start = start;

  function loop(timestamp){
    if (!running) return;
    let dt = (timestamp - lastTime) * sloMo; lastTime = timestamp;
    // background
    ctx.fillStyle = `hsl(${220 + level*8}, 30%, ${Math.max(6, 18 - score*0.08)}%)`; ctx.fillRect(0,0,W,H);
    // clouds
    clouds.forEach(c=>{ c.x -= (currentSpeed*0.2 + c.s*currentSpeed) * sloMo; if(c.x < -c.r) c.x = W+c.r; ctx.fillStyle="rgba(255,255,255,0.03)"; ctx.beginPath(); ctx.arc(c.x,c.y,c.r,0,Math.PI*2); ctx.fill(); });
    // speed
    const lvlConf = getLevelConfig(level); currentSpeed = 3.5 + (score*0.06) + lvlConf.speedBoost;
    spawnTimer += dt; if (spawnTimer > 1500){ spawnTimer = 0; spawnObject(); }
    // physics
    player.vy += gravity * sloMo; player.y += player.vy * sloMo; player.angle = player.vy * 0.08;
    player.trail.push({ x: player.x, y: player.y }); if (player.trail.length > 8) player.trail.shift();
    // draw trail
    player.trail.forEach((t,i)=>{ ctx.globalAlpha = i/16; if (playerImg.complete) ctx.drawImage(playerImg, t.x-player.r, t.y-player.r, player.r*2, player.r*2); }); ctx.globalAlpha = 1;
    // pipes
    for(let i=pipes.length-1;i>=0;i--){ let p=pipes[i]; p.x -= currentSpeed * sloMo; let yShift = Math.sin(timestamp/600 + p.offset) * p.move;
      ctx.fillStyle = p.color; ctx.shadowBlur=15; ctx.shadowColor=p.color;
      ctx.fillRect(p.x, yShift, 60, p.topH); ctx.fillRect(p.x, p.botY + yShift, 60, H - p.botY - yShift); ctx.shadowBlur=0;
      if (!p.passed && p.x < player.x){ p.passed=true; score++; combo++; let comboBonus=Math.floor(combo/5); score += comboBonus; if(scoreEl) scoreEl.textContent = score;
        if (Math.abs(player.y - (p.topH + yShift)) < 15 || Math.abs(player.y - (p.botY + yShift)) < 15){ sloMo = 0.3; ctx.fillStyle="white"; ctx.fillRect(0,0,W,H); setTimeout(()=>sloMo=1,150); }
        if (score % 10 === 0){ level++; if(levelDisp) levelDisp.textContent = level; const l=document.createElement('div'); l.className='level-up'; l.textContent="LEVEL "+level; document.body.appendChild(l); setTimeout(()=>l.remove(),2000); }
      }
      // collision
      if (player.x + player.r > p.x && player.x - player.r < p.x + 60) {
        if (player.y - player.r < p.topH + yShift || player.y + player.r > p.botY + yShift) {
          if (player.hasShield) { player.hasShield=false; createParticles(player.x,player.y,"#38bdf8",20); pipes.splice(i,1); }
          else return gameOver();
        }
      }
      if (p.x < -100) pipes.splice(i,1);
    }
    // items
    for(let i=items.length-1;i>=0;i--){ const it = items[i]; it.x -= currentSpeed * sloMo; let col = it.type==='shield' ? '#38bdf8' : '#fbbf24'; ctx.fillStyle=col; ctx.shadowBlur=20; ctx.shadowColor=col; ctx.beginPath(); ctx.arc(it.x,it.y,it.r,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
      if (Math.hypot(player.x - it.x, player.y - it.y) < player.r + it.r){ createParticles(it.x,it.y,col,20); if (it.type==='shield') player.hasShield=true; else if (it.type==='coin'){ score += coinValue; coinsOwned = (coinsOwned||0) + 1; localStorage.setItem('onetap_coins', coinsOwned); if (shopCoinsEl) shopCoinsEl.textContent = coinsOwned; if (coinsDisplay) coinsDisplay.textContent = coinsOwned; if (scoreEl) scoreEl.textContent = score; } items.splice(i,1); }
    }
    // particles
    for(let i=particles.length-1;i>=0;i--){ const p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.02; ctx.fillStyle=p.color; ctx.globalAlpha=p.life; ctx.fillRect(p.x,p.y,4,4); if (p.life<=0) particles.splice(i,1); }
    ctx.globalAlpha = 1;
    // bounds
    if (player.y > H || player.y < 0) return gameOver();
    // draw player
    ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(player.angle); ctx.beginPath(); ctx.arc(0,0,player.r,0,Math.PI*2); ctx.clip(); if (playerImg.complete) ctx.drawImage(playerImg, -player.r, -player.r, player.r*2, player.r*2); if (player.hasShield){ ctx.strokeStyle='#38bdf8'; ctx.lineWidth=6; ctx.stroke(); } ctx.restore();
    requestAnimationFrame(loop);
  }

  function gameOver(){
    running = false; document.body.classList.add('shake'); setTimeout(()=>document.body.classList.remove('shake'),400);
    if (overlay) overlay.style.display = 'flex';
    if (shareWA) { shareWA.style.display = 'block'; shareWA.style.width = '260px'; }
    if (shareTG) { shareTG.style.display = 'block'; shareTG.style.width = '260px'; }
    const goEl = get('gameover'); if (goEl) goEl.textContent = "SCORE: " + score;
    if (scoresListOverlay) loadLeaderboard();
    saveScore(playerNameInput ? playerNameInput.value : 'Player', score);
    if (score > high){ high = score; localStorage.setItem('onetap_high', high); const highEl = get('high'); if (highEl) highEl.textContent = "High: " + high; }
  }

  // Sharing
  if (shareWA) bindBtn(shareWA, ()=>{ let text = `הגעתי ל-LEVEL ${level} עם ${score} נקודות במשחק של דור! מי עוקף? 👑 ${window.location.href}`; window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank'); });
  if (shareTG) bindBtn(shareTG, ()=>{ let text = `הגעתי ל-LEVEL ${level} עם ${score} נקודות במשחק של דור! מי עוקף? 👑`; window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`, '_blank'); });

  // Input handlers: tapping the game area to jump
  const inputExcludeIds = ['playerName','retry','shareWA','shareTG','btnSkins','btnPlay','btnShop','btnLeaderboard','uploadSkinBtn'];
  window.addEventListener('mousedown', (e)=>{ if (inputExcludeIds.includes(e.target.id)) return; if (running){ player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); } });
  window.addEventListener('touchstart', (e)=>{ if (e.target && inputExcludeIds.includes(e.target.id)) return; if (running){ e.preventDefault(); player.vy = jump; jumpSound.currentTime = 0; jumpSound.play().catch(()=>{}); } }, { passive:false });

  // Initial leaderboard load
  if (db) loadLeaderboard();

  // small console debug for you
  console.log('Game initialized. Buttons bound via addEventListener. start available as window.start');

}); // end DOMContent
