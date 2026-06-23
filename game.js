window.addEventListener('DOMContentLoaded', () => {

  // Firebase config (keep as-is or replace)
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
    try { firebase.initializeApp(firebaseConfig); } catch(e) {}
  }
  const db = (firebase && firebase.firestore) ? firebase.firestore() : null;

  // Elements
  const canvas = document.getElementById('game'), ctx = canvas.getContext ? canvas.getContext('2d') : null;
  const scoreEl = document.getElementById('score'), levelDisp = document.getElementById('levelDisp');
  const overlay = document.getElementById('overlay'), retryBtn = document.getElementById('retry');
  const playerNameInput = document.getElementById('playerName'), scoresList = document.getElementById('scoresList');
  const scoresListOverlay = document.getElementById('scoresListOverlay');
  const shareWA = document.getElementById('shareWA'), shareTG = document.getElementById('shareTG');
  const muteBtn = document.getElementById('muteBtn');
  const shopCoinsEl = document.getElementById('shopCoins'), coinsDisplay = document.getElementById('coinsDisplay');

  // menus
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

  // resize
  let W, H;
  function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = Math.max(200, window.innerHeight - 140); }
  window.addEventListener('resize', resize);
  resize();

  // audio & mute
  const jumpSound = new Audio('jump.mp3.wav'); jumpSound.volume = 0.9;
  let muted = false;
  if (muteBtn) {
    muteBtn.onclick = () => { muted = !muted; jumpSound.muted = muted; muteBtn.textContent = muted ? '🔇' : '🔊'; };
  }

  // persistent
  let high = parseInt(localStorage.getItem('onetap_high')||'0');
  let coins = parseInt(localStorage.getItem('onetap_coins')||'0');
  if (shopCoinsEl) shopCoinsEl.textContent = coins;
  if (coinsDisplay) coinsDisplay.textContent = coins;

  // skins
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

  // upload skin
  if (uploadSkinBtn && customSkinInput) {
    uploadSkinBtn.onclick = () => customSkinInput.click();
    customSkinInput.onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader();
      r.onload = () => { customSkinDataUrl = r.result; localStorage.setItem('onetap_custom_skin', customSkinDataUrl); applySkin('custom'); document.querySelectorAll('.skin-option').forEach(s=>s.classList.remove('active')); uploadSkinBtn.classList.add('active'); };
      r.readAsDataURL(f);
    };
  }

  // skin selection UI
  document.querySelectorAll('.skin-option').forEach(el=>{
    el.addEventListener('click', ()=>{
      document.querySelectorAll('.skin-option').forEach(s=>s.classList.remove('active'));
      el.classList.add('active');
      const s = el.getAttribute('data-skin');
      if (s) applySkin(s);
    });
  });

  // menu navigation (with safety checks)
  if (btnSkins) btnSkins.onclick = ()=>{ if (mainMenu && skinsMenu){ mainMenu.style.display='none'; skinsMenu.style.display='flex'; } };
  if (backFromSkins) backFromSkins.onclick = ()=>{ if (skinsMenu && mainMenu){ skinsMenu.style.display='none'; mainMenu.style.display='flex'; } };
  if (btnPlay) btnPlay.onclick = ()=>{ if (mainMenu){ mainMenu.style.display='none'; start(); } };
  if (btnShop) btnShop.onclick = ()=>{ if (mainMenu && shopMenu){ mainMenu.style.display='none'; shopMenu.style.display='flex'; } };
  if (backFromShop) backFromShop.onclick = ()=>{ if (shopMenu && mainMenu){ shopMenu.style.display='none'; mainMenu.style.display='flex'; } };
  if (btnLeaderboard) btnLeaderboard.onclick = async ()=>{ if (mainMenu && leaderboardMenu){ mainMenu.style.display='none'; leaderboardMenu.style.display='flex'; await loadLeaderboard(); } };
  if (backFromLeaderboard) backFromLeaderboard.onclick = ()=>{ if (leaderboardMenu && mainMenu){ leaderboardMenu.style.display='none'; mainMenu.style.display='flex'; } };

  // leaderboard (TOP 5)
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
    } catch(e){ console.error(e); if (scoresList) scoresList.innerHTML = '<p>שגיאה בטעינה</p>'; if (scoresListOverlay) scoresListOverlay.innerHTML
