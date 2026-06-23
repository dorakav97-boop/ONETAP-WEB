// Firebase config (replace/adjust if needed)
const firebaseConfig = {
  apiKey: "AIzaSyBW-oSotemXbf3rpbHwAp-jFUVB0",
  authDomain: "dor-akav-game.firebaseapp.com",
  projectId: "dor-akav-game",
  storageBucket: "dor-akav-game.firebasestorage.app",
  messagingSenderId: "630792064093",
  appId: "1:630792064093:web:3a7c53b696e86899b8",
  measurementId: "G-LM4P75B50D"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// UI elements
const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score'), levelDisp = document.getElementById('levelDisp');
const overlay = document.getElementById('overlay'), retryBtn = document.getElementById('retry');
const playerNameInput = document.getElementById('playerName'), scoresList = document.getElementById('scoresList');
const shieldStatus = document.getElementById('shopCoins'); // reuse to show coins
const shareWA = document.getElementById('shareWA'), shareTG = document.getElementById('shareTG');
const muteBtn = document.getElementById('muteBtn');

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

// resize
let W, H;
function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight - 140; } // reserve header
window.addEventListener('resize', resize);
resize();

// audio
const jumpSound = new Audio('jump.mp3.wav'); jumpSound.volume = 0.9;
let muted = false;
muteBtn.onclick = () => {
  muted = !muted;
  jumpSound.muted = muted;
  muteBtn.textContent = muted ? '🔇' : '🔊';
};

// game state
let high = parseInt(localStorage.getItem('onetap_high')||'0');
let coins = parseInt(localStorage.getItem('onetap_coins')||'0');
document.getElementById('shopCoins').textContent = coins;

let playerImg = new Image(); // will set src per selected skin
let selectedSkin = localStorage.getItem('onetap_skin') || 'default';
let customSkinDataUrl = localStorage.getItem('onetap_custom_skin') || null;

function applySkin(skin){
  selectedSkin = skin;
  localStorage.setItem('onetap_skin', skin);
  if(skin === 'default'){ playerImg.src = 'me.png.JPG'; }
  else if(skin === 'fire'){ playerImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><circle cx='100' cy='100' r='90' fill='orange'/><text x='50%' y='58%' font-size='60' text-anchor='middle' fill='white'>🔥</text></svg>`); }
  else if(skin === 'star'){ playerImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><circle cx='100' cy='100' r='90' fill='#ffd700'/><text x='50%' y='58%' font-size='60' text-anchor='middle' fill='white'>⭐</text></svg>`); }
  else if(skin === 'diamond'){ playerImg.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect x='20' y='20' width='160' height='160' rx='30' fill='#60a5fa'/></svg>`); }
  else if(skin === 'custom' && customSkinDataUrl){ playerImg.src = customSkinDataUrl; }
}
applySkin(selectedSkin);

// handle upload
uploadSkinBtn.onclick = () => customSkinInput.click();
customSkinInput.onchange = (e) => {
  const f = e.target.files[0];
  if(!f) return;
  const r = new FileReader();
  r.onload = () => {
    customSkinDataUrl = r.result;
    localStorage.setItem('onetap_custom_skin', customSkinDataUrl);
    applySkin('custom');
    // mark active in UI
    document.querySelectorAll('.skin-option').forEach(s=>s.classList.remove('active'));
    uploadSkinBtn.classList.add('active');
  };
  r.readAsDataURL(f);
};

// skins UI select
document.querySelectorAll('.skin-option').forEach(el=>{
  el.addEventListener('click', ()=>{
    document.querySelectorAll('.skin-option').forEach(s=>s.classList.remove('active'));
    el.classList.add('active');
    const s = el.getAttribute('data-skin');
    if(s) applySkin(s);
  });
});

// menu nav
btnSkins.onclick = ()=>{ mainMenu.style.display='none'; skinsMenu.style.display='flex'; };
backFromSkins.onclick = ()=>{ skinsMenu.style.display='none'; mainMenu.style.display='flex'; };
btnPlay.onclick = ()=>{ mainMenu.style.display='none'; start(); };
btnShop.onclick = ()=>{ mainMenu.style.display='none'; shopMenu.style.display='flex'; };
backFromShop.onclick = ()=>{ shopMenu.style.display='none'; mainMenu.style.display='flex'; };
btnLeaderboard.onclick = async ()=>{
  mainMenu.style.display='none'; leaderboardMenu.style.display='flex';
  await loadLeaderboard();
};
backFromLeaderboard.onclick = ()=>{ leaderboardMenu.style.display='none'; mainMenu.style.display='flex'; };

// leaderboard functions
async function loadLeaderboard(){
  try{
    const snap = await db.collection('scores').orderBy('score','desc').limit(10).get();
    let html = '';
    let i=0;
    snap.forEach(doc=>{
      i++;
      const d = doc.data();
      html += `<div class="leaderboard-entry"><div><div class="rank">${i}</div></div><div class="player-info"><div class="player-name">${d.name}</div></div><div class="player-score">${d.score}</div></div>`;
    });
    scoresList.innerHTML = html || 'אין תוצאות עדיין';
  }catch(e){ console.error(e); scoresList.innerHTML='שגיאה בטעינה'; }
}

async function saveScore(name, s){
  if(s===0) return;
  try{
    await db.collection('scores').add({ name: name||'Legend', score: s, timestamp: firebase.firestore.FieldValue.serverTimestamp() });
    loadLeaderboard();
  }catch(e){ console.error(e); }
}

// game variables (based on your original)
let player = { x: 80, y: 0, r: 30, vy: 0, angle:0, hasShield:false, trail:[] };
let gravity = 0.45, jump = -8;
let pipes = [], items = [], particles = [], clouds = [], score = 0, running=false, currentSpeed=3.5, spawnTimer=0, lastTime=0, level=1, combo=0, sloMo=1;
let coinValue = 5; // changed from 10 to 5
let coinsOwned = coins;

// clouds
for(let i=0;i<8;i++) clouds.push({x:Math.random()*window.innerWidth, y:Math.random()*(window.innerHeight-200), s:0.08+Math.random()*0.25, r:20+Math.random()*40});

// spawn rules and levels
const LEVELS = [
  { level:1, gap:220, speedBoost:0 },
  { level:2, gap:190, speedBoost:0.5 },
  { level:3, gap:160, speedBoost:1.2 },
  { level:4, gap:140, speedBoost:2.0 },
  { level:5, gap:120, speedBoost:3.0 }
];

function getLevelConfig(l){
  return LEVELS[Math.min(LEVELS.length-1, l-1)];
}

function spawnObject(){
  const lvlConf = getLevelConfig(level);
  let gap = Math.max(110, lvlConf.gap - score*0.5);
  let center = Math.random()*(H - gap - 120) + 60 + gap/2;
  let moveDist = level > 2 ? Math.min(120, (level-2)*25) : 0;
  pipes.push({ x: W, topH: center-gap/2, botY: center+gap/2, passed:false, color:`hsl(${(score*18)%360},70%,50%)`, move: moveDist, offset: Math.random()*5 });
  if(Math.random()>0.65){
    let type = Math.random()>0.9 ? 'shield' : 'coin';
    items.push({ x: W+100, y: center + (Math.random()-0.5)*80, r:15, type: type });
  }
}

// particles
function createParticles(x,y,color,count=12){
  for(let i=0;i<count;i++){
    particles.push({ x:x, y:y, vx:(Math.random()-0.5)*8, vy:(Math.random()-0.5)*8, life:1.0, color:color });
  }
}

// game loop
function start(){
  // initialize
  running = true; score = 0; level = 1; combo = 0; pipes=[]; items=[]; particles=[]; player.trail=[];
  player.y = H/2; player.vy = 0; player.hasShield = false;
  currentSpeed = 3.5; spawnTimer = 0; lastTime = performance.now();
  overlay.style.display = 'none';
  document.getElementById('gameScreen').style.display = 'flex';
  requestAnimationFrame(loop);
}

function loop(timestamp){
  if(!running) return;
  let dt = (timestamp - lastTime) * sloMo;
  lastTime = timestamp;

  // background
  ctx.fillStyle = `hsl(${220 + level*8}, 30%, ${Math.max(6, 18 - score*0.08)}%)`;
  ctx.fillRect(0,0,W,H);

  // clouds
  clouds.forEach(c=>{
    c.x -= (currentSpeed*0.2 + c.s*currentSpeed) * sloMo;
    if(c.x < -c.r) c.x = W + c.r;
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI*2); ctx.fill();
  });

  // speed adjust by score + level
  const lvlConf = getLevelConfig(level);
  currentSpeed = 3.5 + (score*0.06) + lvlConf.speedBoost;

  spawnTimer += dt;
  if(spawnTimer > 1500){
