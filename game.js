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

  // ניווט תפריטים (addEventListener)
  if (btnSkins) btnSkins.addEventListener('click', ()=>{ if (mainMenu && skinsMenu){ mainMenu.style.display='none'; skinsMenu.style.disp
