function escapeHtml(value) { return String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }

// ---- PLAYERS ----
let PLAYERS = [];
let currentUserId = null;
let playerColors = {};
const PLAYER_COLORS = ['#9b5de5', '#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4732a', '#38bdf8', '#fb923c'];

function buildPlayer(member, index) {
  return {
    id: member.id,
    name: escapeHtml(member.username || member.name || `Player ${index + 1}`),
    color: playerColors[member.id] || member.color || PLAYER_COLORS[index % PLAYER_COLORS.length],
    role: member.role
  };
}


const COUNTRY_NAMES = {
  4:"Afghanistan",8:"Albania",10:"Antarctica",12:"Algeria",16:"American Samoa",20:"Andorra",24:"Angola",28:"Antigua and Barbuda",32:"Argentina",36:"Australia",40:"Austria",44:"Bahamas",48:"Bahrain",50:"Bangladesh",52:"Barbados",56:"Belgium",60:"Bermuda",64:"Bhutan",68:"Bolivia",70:"Bosnia and Herzegovina",72:"Botswana",74:"Bouvet Island",76:"Brazil",84:"Belize",86:"Taiwan",90:"Solomon Islands",92:"British Virgin Islands",96:"Brunei",100:"Bulgaria",104:"Myanmar",108:"Burundi",112:"Belarus",116:"Cambodia",120:"Cameroon",124:"Canada",132:"Cape Verde",136:"Cayman Islands",140:"Central African Republic",144:"Sri Lanka",148:"Chad",152:"Chile",156:"China",158:"Taiwan",162:"Christmas Island",166:"Comoros",170:"Colombia",174:"Comoros",175:"Mauritius",178:"Mauritius",180:"Democratic Republic of the Congo",184:"Cook Islands",188:"Costa Rica",191:"Croatia",192:"Cuba",196:"Cyprus",203:"Czech Republic",204:"Benin",208:"Denmark",212:"Dominica",214:"Dominican Republic",218:"Ecuador",222:"El Salvador",226:"Equatorial Guinea",231:"Ethiopia",232:"Eritrea",238:"Falkland Islands",239:"South Georgia and South Sandwich Islands",242:"Fiji",246:"Finland",248:"French Guiana",250:"France",254:"French Guiana",258:"French Polynesia",260:"French Guiana",262:"Reunion",266:"Mozambique",268:"Mauritius",270:"Mauritius",275:"Palestine",276:"Germany",288:"Ghana",292:"Gibraltar",296:"Kiribati",300:"Greece",304:"Greenland",308:"Grenada",312:"Guadeloupe",316:"Guam",320:"Guatemala",324:"Guinea",328:"Guyana",332:"Haiti",334:"Heard Island and McDonald Islands",340:"Honduras",344:"Hong Kong",348:"Hungary",352:"Iceland",356:"India",360:"Indonesia",364:"Iran",368:"Iraq",372:"Ireland",376:"Israel",380:"Italy",383:"Kosovo",384:"Côte d'Ivoire",388:"Jamaica",392:"Japan",396:"Japan",398:"Kazakhstan",400:"Jordan",404:"Kenya",408:"North Korea",410:"South Korea",414:"Kuwait",417:"Kyrgyzstan",418:"Laos",422:"Lebanon",426:"Lesotho",428:"Latvia",430:"Liberia",434:"Libya",438:"Liechtenstein",440:"Lithuania",442:"Luxembourg",446:"Macao",450:"Madagascar",454:"Malawi",458:"Malaysia",462:"Maldives",466:"Mali",470:"Malta",474:"Martinique",478:"Mauritania",480:"Mauritius",484:"Mexico",492:"Monaco",496:"Mongolia",498:"Moldova",499:"Montenegro",500:"Montserrat",504:"Morocco",508:"Mozambique",512:"Oman",516:"Namibia",520:"Nauru",524:"Nepal",528:"Netherlands",531:"Curaçao",533:"Aruba",534:"Sint Maarten",535:"Caribbean Netherlands",540:"New Caledonia",548:"Vanuatu",554:"New Zealand",558:"Nicaragua",562:"Niger",566:"Nigeria",570:"Niue",574:"Norfolk Island",578:"Norway",580:"Northern Mariana Islands",581:"United States Minor Outlying Islands",583:"Federated States of Micronesia",584:"Marshall Islands",585:"Palau",586:"Pakistan",591:"Panama",598:"Papua New Guinea",600:"Paraguay",604:"Peru",608:"Philippines",612:"Pitcairn Islands",616:"Poland",620:"Portugal",624:"Guinea-Bissau",626:"Timor-Leste",630:"Puerto Rico",634:"Qatar",638:"Reunion",642:"Romania",643:"Russia",646:"Rwanda",652:"Saint Barthélemy",654:"Saint Helena, Ascension and Tristan da Cunha",659:"Saint Kitts and Nevis",660:"Anguilla",662:"Saint Lucia",666:"Saint Pierre and Miquelon",670:"Saint Vincent and the Grenadines",674:"San Marino",678:"São Tomé and Príncipe",682:"Saudi Arabia",686:"Senegal",688:"Serbia",690:"Seychelles",694:"Sierra Leone",702:"Malta",703:"Slovakia",704:"Vietnam",705:"Slovenia",706:"Somalia",710:"South Africa",716:"Zimbabwe",724:"Spain",728:"South Sudan",729:"Sudan",732:"Western Sahara",740:"Suriname",744:"Svalbard and Jan Mayen",748:"Eswatini",752:"Sweden",756:"Switzerland",760:"Syria",762:"Tajikistan",764:"Thailand",768:"Togo",772:"Tokelau",776:"Tonga",780:"Trinidad and Tobago",784:"United Arab Emirates",788:"Tunisia",792:"Turkey",795:"Turkmenistan",796:"Turks and Caicos Islands",798:"Tuvalu",800:"Uganda",804:"Ukraine",807:"North Macedonia",818:"Egypt",826:"United Kingdom",831:"Guernsey",832:"Jersey",833:"Isle of Man",834:"Tanzania",840:"United States",850:"United States Virgin Islands",854:"Burkina Faso",858:"Uruguay",860:"Uzbekistan",862:"Venezuela",876:"Wallis and Futuna",882:"Samoa",886:"Taiwan",887:"Yemen",894:"Zambia",
};

function getCountryName(id) { return COUNTRY_NAMES[parseInt(id)] || null; }
function normalizeCountryId(id) {
  if (id === null || id === undefined || id === '') return null;
  return String(parseInt(id, 10));
}

function localDateInputValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

// ---- CONTINENTS ----
const CONTINENTS = GameRules.CONTINENTS;

// Map country id → continent name
const COUNTRY_CONTINENT = {};
for (const [cont, ids] of Object.entries(CONTINENTS)) {
  ids.forEach(id => { COUNTRY_CONTINENT[id] = cont; });
}

function getContinentController(name) { return GameRules.continentController({troops, tiebreakers, lastUpdated}, name); }

// ---- STATE ----
let selectedPlayer = null;
let selectedCountry = null;
let troops = {}; // { countryId: { playerId: count } }
let tiebreakers = {}; // { countryId: { playerId: true/false } }
let lastUpdated = {}; // { countryId: { playerId: timestamp } }
let selectedEl = null;
const GROUP_ID = Number(window.location.pathname.split('/')[2]) || null;

let gameVersion = 0;
let extraGameFields = {};
let gameLoaded = false;
let dirty = false;
let saving = false;
let saveBlocked = false;
function snapshot() { return { ...extraGameFields, troops, tiebreakers, lastUpdated, selectedPlayer, kissLog, playerColors }; }
function downloadBackup() {
  const data = {format:'risky-business-group', schemaVersion:1, group:{id:GROUP_ID}, exportedAt:new Date().toISOString(), version:gameVersion, game:snapshot()};
  const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url; a.download=`risky-business-${GROUP_ID}-${Date.now()}.json`; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showSaveProblem(message) {
  const box=document.getElementById('sync-error');
  box.hidden=false; document.getElementById('sync-message').textContent=message;
  flashStatus('Not saved — see warning',false);
}
async function saveData() {
  if (!GROUP_ID || !gameLoaded) return;
  dirty=true;
  if(saving || saveBlocked) return;
  saving=true;
  try {
    while(dirty && !saveBlocked) {
      dirty=false;
      const body=JSON.stringify(snapshot());
      flashStatus('Saving…',false);
      const response=await fetch(`/api/groups/${GROUP_ID}/game`,{method:'POST',headers:{'Content-Type':'application/json','If-Match':String(gameVersion)},body});
      const result=await response.json();
      if(!response.ok) throw new Error(result.error || `Save failed (${response.status})`);
      gameVersion=result.version;
    }
    flashStatus('Saved ✓',true);
  } catch(error) {
    dirty=true;saveBlocked=true;
    showSaveProblem(error.message+' Your local changes remain here. Export them before reloading.');
  } finally { saving=false; }
}
function applySnapshot(game) {
  extraGameFields = {...game};
  troops=mergeCountryState(game.troops);
  tiebreakers=mergeCountryState(game.tiebreakers);
  lastUpdated=mergeCountryState(game.lastUpdated);
  playerColors=game.playerColors || {};
  PLAYERS.forEach(p=>{p.color=playerColors[p.id] || p.color;});
  selectedPlayer=PLAYERS.some(p=>p.id===game.selectedPlayer)?game.selectedPlayer:PLAYERS[0]?.id || null;
  kissLog=game.kissLog || [];
}
async function importBackup(file) {
  if(!file || !gameLoaded || saving || saveBlocked) return;
  try {
    if(file.size>2*1024*1024) throw new Error('Backup is too large');
    const data=JSON.parse(await file.text());
    if(data.format!=='risky-business-group' || data.schemaVersion!==1 || data.group?.id!==GROUP_ID || !data.game || !Array.isArray(data.game.kissLog)) throw new Error('Choose a backup from this group');
    if(!confirm('Replace this group game with the backup? A backup of the current state will be downloaded first.')) return;
    downloadBackup();
    // Server validation is authoritative. Validate before replacing the visible local state.
    const response=await fetch(`/api/groups/${GROUP_ID}/game`,{method:'POST',headers:{'Content-Type':'application/json','If-Match':String(gameVersion)},body:JSON.stringify(data.game)});
    const result=await response.json();
    if(!response.ok) throw new Error(result.error || 'Import failed');
    gameVersion=result.version; applySnapshot(data.game); renderAll(); renderMobileAll(); updateMapColors(); renderStats();
    flashStatus('Backup restored ✓',true);
  } catch(error) { showSaveProblem(error.message); }
}
window.addEventListener('beforeunload',event=>{if(dirty || saving){event.preventDefault();event.returnValue='';}});
async function refreshGame() {
  if(!gameLoaded || dirty || saving || saveBlocked || document.hidden || document.getElementById('stats-overlay').classList.contains('open') || document.getElementById('history-dialog').open) return;
  try {
    const response=await fetch(`/api/groups/${GROUP_ID}`);
    if(!response.ok) throw new Error('Cannot refresh game. Check your connection or sign in again.');
    const {group}=await response.json();
    if(dirty || saving || saveBlocked) return;
    PLAYERS=(group.players || group.members).map(buildPlayer);
    if(group.version!==gameVersion) {
      gameVersion=group.version; applySnapshot(group.state);
    } else { PLAYERS.forEach(p=>{p.color=playerColors[p.id] || p.color;}); }
    renderAll(); renderMobileAll(); updateMapColors();
  } catch(error) { flashStatus(error.message,false); }
}
setInterval(refreshGame,10000);

async function loadGroupMembers() {
  const response=await fetch(`/api/groups/${GROUP_ID}`);
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || 'Unable to load group');
  PLAYERS=(data.group.players || data.group.members).map(buildPlayer);
}

async function loadCurrentUser() {
  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();
    currentUserId = response.ok ? data.user?.id : null;
  } catch (e) {
    currentUserId = null;
  }
}

function mergeCountryState(source) {
  const normalized = {};
  Object.entries(source || {}).forEach(([countryId, values]) => {
    const id = normalizeCountryId(countryId);
    if (!id) return;
    normalized[id] = { ...(normalized[id] || {}), ...(values || {}) };
  });
  return normalized;
}

async function loadSaved() {
  if(!GROUP_ID) throw new Error('Open the game through your group dashboard.');
  await Promise.all([loadGroupMembers(),loadCurrentUser()]);
  const response=await fetch(`/api/groups/${GROUP_ID}/game`);
  const data=await response.json();
  if(!response.ok) throw new Error(data.error || 'Unable to load game');
  gameVersion=data.version; applySnapshot(data.game); gameLoaded=true;
  flashStatus('Loaded ✓',true);
}
function resetData() {
  if(!gameLoaded || saveBlocked || saving) return;
  if(!confirm('Reset all troops, tiebreakers and log entries? A backup will be downloaded first.')) return;
  downloadBackup();
  troops={}; tiebreakers={}; lastUpdated={}; kissLog=[];
  selectedCountry=null; selectedPlayer=PLAYERS[0]?.id || null;
  if(selectedEl){selectedEl.classList.remove('selected');selectedEl=null;}
  updateMapColors();renderAll();renderMobileAll();renderStats();saveData();
}
function toggleTiebreaker(pid) { changeTiebreaker(pid,(tiebreakers[selectedCountry?.id]?.[pid] || 0)>0?-1:1); }

let statusTimer = null;
function flashStatus(msg, ok) {
  const el = document.getElementById('save-status');
  el.textContent = msg;
  el.className = 'save-status' + (ok ? ' ok' : '');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { el.textContent = ''; el.className = 'save-status'; }, 2800);
}



// ---- ZOOM & PAN ----
let scale = 1, panX = 0, panY = 0;
let isPanning = false, didPan = false;
let panStart = {x:0,y:0}, panOrigin = {x:0,y:0};

function applyTransform() {
  document.getElementById('world-map').style.transform =
    `translate(${panX}px,${panY}px) scale(${scale})`;
}

function doZoom(factor, cx, cy) {
  const wrap = document.getElementById('map-wrapper');
  const rect = wrap.getBoundingClientRect();
  const px = (cx !== undefined ? cx : rect.left + rect.width/2) - rect.left;
  const py = (cy !== undefined ? cy : rect.top + rect.height/2) - rect.top;
  const ns = Math.min(Math.max(scale * factor, 0.45), 14);
  const sd = ns / scale;
  panX = px - sd*(px - panX);
  panY = py - sd*(py - panY);
  scale = ns;
  applyTransform();
}

function resetZoom() { scale=1; panX=0; panY=0; applyTransform(); }

const wrap = document.getElementById('map-wrapper');

wrap.addEventListener('wheel', e => {
  e.preventDefault();
  doZoom(e.deltaY < 0 ? 1.15 : 0.87, e.clientX, e.clientY);
}, { passive: false });

wrap.addEventListener('mousedown', e => {
  if (e.button !== 0) return;
  isPanning = true; didPan = false;
  panStart = {x: e.clientX, y: e.clientY};
  panOrigin = {x: panX, y: panY};
  wrap.classList.add('grabbing');
});

window.addEventListener('mousemove', e => {
  if (!isPanning) return;
  const dx = e.clientX - panStart.x;
  const dy = e.clientY - panStart.y;
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didPan = true;
  panX = panOrigin.x + dx;
  panY = panOrigin.y + dy;
  applyTransform();
});

window.addEventListener('mouseup', () => {
  isPanning = false;
  wrap.classList.remove('grabbing');
});

// ---- LOAD MAP ----
async function loadMap() {
  const resp = await fetch('/vendor/countries-110m.json');
  const world = await resp.json();

  await loadScript('/vendor/topojson-client.min.js');
  await loadScript('/vendor/d3.min.js');
  renderMap(world);
}

function loadScript(src) {
  return new Promise((res, reject) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => reject(new Error("Map library failed to load"));
    document.head.appendChild(s);
  });
}

function renderMap(world) {
  const svg = document.getElementById('world-map');
  const countries = topojson.feature(world, world.objects.countries);

  const projection = d3.geoNaturalEarth1().scale(310).translate([1000, 490]);
  const path = d3.geoPath().projection(projection);
  const tooltip = document.getElementById('tooltip');

  countries.features.forEach(feature => {
    const id = feature.id;
    const name = getCountryName(id);
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    el.setAttribute('d', path(feature));
    el.setAttribute('data-id', id);
    el.style.fill = '#2a4060';

    el.addEventListener('mouseenter', e => {
      tooltip.style.display = 'block';
      tooltip.textContent = name;
      posTooltip(e);
    });
    el.addEventListener('mousemove', posTooltip);
    el.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    el.addEventListener('click', e => {
      if (didPan) return;
      e.stopPropagation();
      selectCountry(id, name, el);
    });

    svg.appendChild(el);
  });

  updateMapColors();
}

function posTooltip(e) {
  const t = document.getElementById('tooltip');
  t.style.left = (e.clientX + 14) + 'px';
  t.style.top = (e.clientY - 8) + 'px';
}

// ---- GAME LOGIC ----
function getWinner(cid) { return GameRules.winner({troops, tiebreakers, lastUpdated}, cid); }

function countTerritories(pid) {
  let n = 0;
  for (const cid of Object.keys(troops)) { if (getWinner(cid) === pid) n++; }
  return n;
}

function selectCountry(id, name, el) {
  if (selectedEl) selectedEl.classList.remove('selected');
  selectedEl = el; el.classList.add('selected');
  selectedCountry = { id: normalizeCountryId(id), name };
  renderTerritoryPanel();
}

function changeTroops(pid, delta) {
  if (!selectedCountry || !selectedPlayer) return;
  const cid = selectedCountry.id;
  if (!troops[cid]) troops[cid] = {};
  const newVal = Math.max(0, (troops[cid][pid] || 0) + delta);
  troops[cid][pid] = newVal;
  if (!lastUpdated[cid]) lastUpdated[cid] = {};
  lastUpdated[cid][pid] = Date.now();
  const el = document.getElementById('tc-' + pid);
  if (el) el.textContent = troops[cid][pid];
  updateMapColors();
  renderPlayers();
  renderScoreboard();
  renderLegend();
  saveData();
}

function changeTiebreaker(pid, delta) {
  if (!selectedCountry) return;
  const cid = selectedCountry.id;
  if (!tiebreakers[cid]) tiebreakers[cid] = {};
  tiebreakers[cid][pid] = Math.max(0, (tiebreakers[cid][pid] || 0) + delta);
  updateMapColors();
  renderPlayers();
  renderScoreboard();
  renderLegend();
  renderTerritoryPanel();
  saveData();
}

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

function updateMapColors() {
  document.querySelectorAll('#world-map path').forEach(p => {
    const id = normalizeCountryId(p.getAttribute('data-id'));
    const winner = getWinner(id);
    if (winner) {
      const pl = PLAYERS.find(x => x.id === winner);
      if (pl) {
        // Check if this country's continent is controlled by this player
        const cont = COUNTRY_CONTINENT[parseInt(id)];
        const contController = cont ? getContinentController(cont) : null;
        const hasContinentBonus = contController === winner;
        p.style.fill = pl.color;
        p.style.opacity = '0.82';
        p.style.stroke = hasContinentBonus ? '#fff' : '#1a3050';
        p.style.strokeWidth = hasContinentBonus ? '1.5' : '0.4';
        return;
      }
    }
    p.style.fill = '#2a4060';
    p.style.opacity = '1';
    p.style.stroke = '#1a3050';
    p.style.strokeWidth = '0.4';
  });
  renderContinentBadges();
}

function renderContinentBadges() {
  let el = document.getElementById('continent-badges');
  if (!el) {
    el = document.createElement('div');
    el.id = 'continent-badges';
    el.style.cssText = 'margin-top:8px;';
    const sb = document.getElementById('scoreboard');
    sb.parentNode.insertBefore(el, sb);
  }
  const controlled = Object.entries(CONTINENTS)
    .map(([name]) => ({ name, controller: getContinentController(name) }))
    .filter(c => c.controller);

  if (controlled.length === 0) { el.innerHTML = ''; return; }

  const section = document.createElement('div');
  section.innerHTML = `<div class="section-title" style="margin-bottom:6px;">Continents</div>`;
  controlled.forEach(({ name, controller }) => {
    const pl = PLAYERS.find(p => p.id === controller);
    if (!pl) return;
    const badge = document.createElement('div');
    badge.style.cssText = `display:flex;align-items:center;gap:6px;padding:4px 6px;background:${hexToRgba(pl.color,0.12)};border:1px solid ${pl.color};border-radius:4px;margin-bottom:4px;`;
    badge.innerHTML = `
      <span style="width:8px;height:8px;border-radius:50%;background:${pl.color};box-shadow:0 0 4px ${pl.color};flex-shrink:0"></span>
      <span style="font-family:'Cinzel',serif;font-size:0.65rem;flex:1;">${name}</span>
      <span style="font-size:0.7rem;color:${pl.color};">👑 ${pl.name}</span>
    `;
    section.appendChild(badge);
  });
  el.innerHTML = '';
  el.appendChild(section);
}

// ---- QUICK-ADD from territory panel ----
function quickAddEntry(countryId, countryName, playerId) {
  openStats();
  switchStatsTab('log');
  // Pre-fill the form
  setTimeout(() => {
    document.getElementById('entry-player').value = playerId;
    document.getElementById('entry-country').value = countryId;
    document.getElementById('entry-date').value = localDateInputValue();
    document.getElementById('entry-name').focus();
  }, 100);
}
function hexToRgba(hex, a) {
  return `rgba(${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)},${a})`;
}

function renderPlayers() {
  const list = document.getElementById('players-list');
  list.innerHTML = '';
  PLAYERS.forEach(p => {
    const terr = countTerritories(p.id);
    const div = document.createElement('div');
    div.className = 'player-card' + (selectedPlayer === p.id ? ' active' : '');
    div.style.setProperty('--pc', p.color);
    div.style.setProperty('--pg', hexToRgba(p.color, 0.22));
    div.innerHTML = `
      <div class="player-card-header">
        <div class="player-dot" style="background:${p.color};box-shadow:0 0 6px ${p.color}"></div>
        <div class="player-name">${p.name}</div>
        ${(extraGameFields.players || p.id === currentUserId) ? `<input type="color" value="${p.color}" title="Kies je kleur" aria-label="Kies je kleur" onclick="event.stopPropagation()" onchange="setPlayerColor(${p.id}, this.value); event.stopPropagation()" style="width:28px;height:24px;padding:0;border:0;background:none;cursor:pointer;">` : ''}
      </div>
      <div class="player-territories">${terr} ${terr===1?'territory':'territories'} controlled</div>
    `;
    div.onclick = () => { selectedPlayer = p.id; renderAll(); };
    list.appendChild(div);
  });
}

function setPlayerColor(playerId, color) {
  if ((!extraGameFields.players && playerId !== currentUserId) || !/^#[0-9a-f]{6}$/i.test(color)) return;
  playerColors[playerId] = color;
  const player = PLAYERS.find(p => p.id === playerId);
  if (player) player.color = color;
  updateMapColors();
  renderAll();
  renderStats();
  saveData();
}

function renderTerritoryPanel() {
  document.getElementById('no-selection').style.display = selectedCountry ? 'none' : 'block';
  document.getElementById('territory-detail').style.display = selectedCountry ? 'block' : 'none';
  if (!selectedCountry) return;

  document.getElementById('territory-name').textContent = selectedCountry.name;
  const container = document.getElementById('troop-entries');
  container.innerHTML = '';
  const cid = selectedCountry.id;
  if (!troops[cid]) troops[cid] = {};

  // Quick-add button
  const qaBtn = document.createElement('button');
  qaBtn.style.cssText = `width:100%;margin-bottom:8px;padding:6px;background:none;border:1px dashed var(--border);border-radius:3px;color:var(--text-dim);font-family:'Cinzel',serif;font-size:0.6rem;letter-spacing:0.1em;cursor:pointer;transition:all 0.15s;`;
  qaBtn.textContent = '💋 LOG A KISS HERE';
  qaBtn.onmouseover = () => { qaBtn.style.borderColor = 'var(--accent)'; qaBtn.style.color = 'var(--accent)'; };
  qaBtn.onmouseout = () => { qaBtn.style.borderColor = 'var(--border)'; qaBtn.style.color = 'var(--text-dim)'; };
  qaBtn.onclick = () => quickAddEntry(cid, selectedCountry.name, selectedPlayer);
  container.appendChild(qaBtn);

  PLAYERS.forEach(p => {
    const count = troops[cid][p.id] || 0;
    if (!tiebreakers[cid]) tiebreakers[cid] = {};
    const tbVal = tiebreakers[cid][p.id] || 0;
    const row = document.createElement('div');
    row.className = 'troop-entry';
    row.innerHTML = `
      <div class="troop-dot" style="background:${p.color};box-shadow:0 0 4px ${p.color}"></div>
      <div class="troop-player">${p.name}</div>
      <div class="troop-controls">
        <button class="troop-btn" onclick="changeTroops(${p.id},-5)">−5</button>
        <button class="troop-btn" onclick="changeTroops(${p.id},-1)">−</button>
        <div class="troop-count" id="tc-${p.id}">${count}</div>
        <button class="troop-btn" onclick="changeTroops(${p.id},1)">+</button>
        <button class="troop-btn" onclick="changeTroops(${p.id},5)">+5</button>
        <button class="troop-btn" onclick="changeTiebreaker(${p.id},-1)"
          style="margin-left:4px;border-color:${tbVal>0?p.color:'var(--border)'};color:${tbVal>0?p.color:'var(--text-dim)'};background:${tbVal>0?'rgba('+hexToRgb(p.color)+',0.15)':'var(--panel)'};">−</button>
          <span style="font-family:'Cinzel',serif;font-size:0.75rem;min-width:18px;text-align:center;color:${tbVal>0?p.color:'var(--text-dim)'};">🔥${tbVal>0?tbVal:''}</span>
          <button class="troop-btn" onclick="changeTiebreaker(${p.id},1)"
          style="border-color:${tbVal>0?p.color:'var(--border)'};color:${tbVal>0?p.color:'var(--text-dim)'};background:${tbVal>0?'rgba('+hexToRgb(p.color)+',0.15)':'var(--panel)'};">+</button>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderScoreboard() {
  const sb = document.getElementById('scoreboard');
  sb.innerHTML = '';
  const scored = PLAYERS.map(p => ({
    ...p,
    territories: countTerritories(p.id),
    points: Object.values(troops).reduce((s,t) => s+(t[p.id]||0), 0)
  })).sort((a,b) => b.territories - a.territories || b.points - a.points);

  scored.forEach((p, i) => {
    const continents = Object.keys(CONTINENTS).filter(c => getContinentController(c) === p.id).length;
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;gap:8px;padding:4px 6px;background:${p.id===selectedPlayer?'rgba(255,255,255,0.04)':'transparent'};border-radius:3px;cursor:pointer;`;
    row.innerHTML = `
      <span style="font-family:Cinzel,serif;font-size:0.57rem;color:var(--text-dim);width:14px;">${i+1}.</span>
      <span style="width:8px;height:8px;border-radius:50%;background:${p.color};flex-shrink:0;box-shadow:0 0 4px ${p.color}"></span>
      <span style="flex:1;font-size:0.75rem;">${p.name}</span>
      ${continents > 0 ? `<span title="${continents} continent${continents>1?'s':''}" style="font-size:0.7rem;">👑${continents}</span>` : ''}
      <span style="font-family:Cinzel,serif;font-size:0.68rem;color:${p.color};">${p.territories}</span>
    `;
    row.onclick = () => { selectedPlayer = p.id; renderAll(); };
    sb.appendChild(row);
  });
}

function renderLegend() {
  const rows = document.getElementById('legend-rows');
  rows.innerHTML = '';
  PLAYERS.forEach(p => {
    const row = document.createElement('div');
    row.className = 'legend-row';
    row.innerHTML = `
      <div class="legend-dot" style="background:${p.color};box-shadow:0 0 4px ${p.color}"></div>
      <div class="legend-name">${p.name}</div>
      <div class="legend-count">${countTerritories(p.id)}</div>
    `;
    rows.appendChild(row);
  });
}

function renderAll() {
  renderPlayers();
  renderTerritoryPanel();
  renderScoreboard();
  renderLegend();
  renderContinentBadges();
}

// ---- MOBILE SHEET ----
function openSheet() {
  document.getElementById('mobile-panel').classList.add('open');
  document.getElementById('sheet-backdrop').classList.add('visible');
  document.getElementById('mobile-open-btn').style.display = 'none';
  renderMobileAll();
}

function closeSheet() {
  document.getElementById('mobile-panel').classList.remove('open');
  document.getElementById('sheet-backdrop').classList.remove('visible');
  document.getElementById('mobile-open-btn').style.display = 'block';
}

let activeTab = 'territory';
function switchTab(tab) {
  activeTab = tab;
  document.querySelectorAll('.sheet-tab').forEach((t, i) => {
    const names = ['territory','players','scores'];
    t.classList.toggle('active', names[i] === tab);
  });
  document.querySelectorAll('.sheet-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('mpane-' + tab).classList.add('active');
  renderMobileAll();
}

function renderMobileAll() {
  renderMobileTerritoryPanel();
  renderMobilePlayers();
  renderMobileScoreboard();
}

function renderMobileTerritoryPanel() {
  const hasSel = !!selectedCountry;
  document.getElementById('m-no-selection').style.display = hasSel ? 'none' : 'block';
  document.getElementById('m-territory-detail').style.display = hasSel ? 'block' : 'none';
  if (!hasSel) return;

  document.getElementById('m-territory-name').textContent = selectedCountry.name;
  const container = document.getElementById('m-troop-entries');
  container.innerHTML = '';
  const cid = selectedCountry.id;
  if (!troops[cid]) troops[cid] = {};

  PLAYERS.forEach(p => {
    const count = troops[cid][p.id] || 0;
    if (!tiebreakers[cid]) tiebreakers[cid] = {};
    const tbOn = !!(tiebreakers[cid][p.id]);
    const row = document.createElement('div');
    row.className = 'troop-entry';
    row.innerHTML = `
      <div class="troop-dot" style="background:${p.color};box-shadow:0 0 4px ${p.color}"></div>
      <div class="troop-player">${p.name}</div>
      <div class="troop-controls">
        <button class="troop-btn" onclick="changeTroops(${p.id},-5);renderMobileAll()">−5</button>
        <button class="troop-btn" onclick="changeTroops(${p.id},-1);renderMobileAll()">−</button>
        <div class="troop-count" id="mtc-${p.id}">${count}</div>
        <button class="troop-btn" onclick="changeTroops(${p.id},1);renderMobileAll()">+</button>
        <button class="troop-btn" onclick="changeTroops(${p.id},5);renderMobileAll()">+5</button>
        <button class="troop-btn tb-toggle" onclick="toggleTiebreaker(${p.id});renderMobileAll()"
          style="margin-left:4px;min-width:34px;border-color:${tbOn?p.color:'var(--border)'};color:${tbOn?p.color:'var(--text-dim)'};background:${tbOn?'rgba('+hexToRgb(p.color)+',0.15)':'var(--panel)'};">TB</button>
      </div>
    `;
    container.appendChild(row);
  });
}

function renderMobilePlayers() {
  const list = document.getElementById('m-players-list');
  list.innerHTML = '';
  PLAYERS.forEach(p => {
    const terr = countTerritories(p.id);
    const div = document.createElement('div');
    div.className = 'player-card' + (selectedPlayer === p.id ? ' active' : '');
    div.style.setProperty('--pc', p.color);
    div.style.setProperty('--pg', hexToRgba(p.color, 0.22));
    div.innerHTML = `
      <div class="player-card-header">
        <div class="player-dot" style="background:${p.color};box-shadow:0 0 6px ${p.color}"></div>
        <div class="player-name">${p.name}</div>
      </div>
      <div class="player-territories">${terr} ${terr===1?'territory':'territories'} controlled</div>
    `;
    div.onclick = () => { selectedPlayer = p.id; renderAll(); renderMobileAll(); };
    list.appendChild(div);
  });
}

function renderMobileScoreboard() {
  const sb = document.getElementById('m-scoreboard');
  sb.innerHTML = '';
  const scored = PLAYERS.map(p => ({
    ...p,
    territories: countTerritories(p.id),
    points: Object.values(troops).reduce((s,t) => s+(t[p.id]||0), 0)
  })).sort((a,b) => b.territories - a.territories || b.points - a.points);

  scored.forEach((p, i) => {
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;gap:10px;padding:8px 6px;background:${p.id===selectedPlayer?'rgba(255,255,255,0.04)':'transparent'};border-radius:3px;cursor:pointer;border-bottom:1px solid var(--border);`;
    row.innerHTML = `
      <span style="font-family:Cinzel,serif;font-size:0.65rem;color:var(--text-dim);width:16px;">${i+1}.</span>
      <span style="width:10px;height:10px;border-radius:50%;background:${p.color};flex-shrink:0;box-shadow:0 0 4px ${p.color}"></span>
      <span style="flex:1;font-size:0.9rem;">${p.name}</span>
      <span style="font-family:Cinzel,serif;font-size:0.8rem;color:${p.color};">${p.territories} terr.</span>
    `;
    row.onclick = () => { selectedPlayer = p.id; renderAll(); renderMobileAll(); };
    sb.appendChild(row);
  });
}

// Update country banner on mobile
function updateMobileBanner() {
  const banner = document.getElementById('mobile-country-banner');
  if (banner) banner.textContent = selectedCountry ? selectedCountry.name : 'Tap a country';
}

// ---- TOUCH PAN & PINCH ZOOM ----
let touches = {};
let lastPinchDist = null;

wrap.addEventListener('touchstart', e => {
  e.preventDefault();
  didPan = false;
  Array.from(e.changedTouches).forEach(t => { touches[t.identifier] = {x: t.clientX, y: t.clientY}; });

  if (e.touches.length === 1) {
    panStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
    panOrigin = {x: panX, y: panY};
    isPanning = true;
  }
  if (e.touches.length === 2) {
    isPanning = false;
    lastPinchDist = getPinchDist(e.touches);
  }
}, { passive: false });

wrap.addEventListener('touchmove', e => {
  e.preventDefault();
  if (e.touches.length === 1 && isPanning) {
    const dx = e.touches[0].clientX - panStart.x;
    const dy = e.touches[0].clientY - panStart.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) didPan = true;
    panX = panOrigin.x + dx;
    panY = panOrigin.y + dy;
    applyTransform();
  }
  if (e.touches.length === 2) {
    const dist = getPinchDist(e.touches);
    if (lastPinchDist) {
      const factor = dist / lastPinchDist;
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      doZoom(factor, cx, cy);
      didPan = true;
    }
    lastPinchDist = dist;
  }
}, { passive: false });

wrap.addEventListener('touchend', e => {
  isPanning = false;
  lastPinchDist = null;
  // treat as tap if no significant movement
  if (!didPan && e.changedTouches.length === 1) {
    const t = e.changedTouches[0];
    // find element under touch
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (el && el.tagName === 'path' && el.getAttribute('data-id')) {
      const id = el.getAttribute('data-id');
      const name = getCountryName(id);
      if (name) {
        selectCountry(id, name, el);
        updateMobileBanner();
        // auto-open sheet on territory tap
        if (window.innerWidth <= 700) {
          openSheet();
          switchTab('territory');
        }
      }
    }
  }
  touches = {};
}, { passive: false });

function getPinchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx*dx + dy*dy);
}

// Also update banner on desktop click
const origSelectCountry = selectCountry;
// patch selectCountry to also update banner
const _origSelect = selectCountry;
window.selectCountry = function(id, name, el) {
  _origSelect(id, name, el);
  updateMobileBanner();
};


// ---- STATS ----
let kissLog = []; // [{ id, name, age, date, playerId, country }]
let editingEntryId = null;

function openStats() {

  document.getElementById('stats-overlay').classList.add('open');
  populateStatsForm();
  renderStats();
}

function closeStats() {
  document.getElementById('stats-overlay').classList.remove('open');
}

let activeStatsTab = 'log';
function switchStatsTab(tab) {
  activeStatsTab = tab;
  document.querySelectorAll('.stats-tab').forEach((t, i) => {
    const names = ['log','timeline','charts','leaderboard'];
    t.classList.toggle('active', names[i] === tab);
  });
  document.querySelectorAll('.stats-pane').forEach(p => p.classList.remove('active'));
  document.getElementById('spane-' + tab).classList.add('active');
  renderStats();
}

function populateStatsForm() {
  // Players dropdown
  const pSel = document.getElementById('entry-player');
  pSel.innerHTML = PLAYERS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  // Country dropdown — sorted alphabetically
  const cSel = document.getElementById('entry-country');
  const sorted = Object.entries(COUNTRY_NAMES).sort((a,b) => a[1].localeCompare(b[1]));
  cSel.innerHTML = `<option value="">— Unknown —</option>` +
    sorted.map(([id, name]) => `<option value="${id}">${name}</option>`).join('');

  // Default date to today
  const dateEl = document.getElementById('entry-date');
  if (!dateEl.value) dateEl.value = localDateInputValue();

  // Ensure submit button shows add mode
  const btn = document.getElementById('entry-submit-btn');
  if (btn) btn.textContent = '+ ADD ENTRY';
  editingEntryId = null;
}



function submitEntry() {
  const name = document.getElementById('entry-name').value.trim();
  if (!name) { alert('Please enter a name'); return; }
  const age = parseInt(document.getElementById('entry-age').value) || null;
  const date = document.getElementById('entry-date').value || localDateInputValue();
  const playerId = parseInt(document.getElementById('entry-player').value);
  const country = normalizeCountryId(document.getElementById('entry-country').value);
  const countryName = country ? COUNTRY_NAMES[parseInt(country)] || null : null;

  if (editingEntryId) {
    const existing = kissLog.find(e => e.id === editingEntryId);
    if (existing) {
      decrementTroopsForEntry(existing);
      Object.assign(existing, { name, age, date, playerId, country, countryName });
      incrementTroopsForEntry(existing);
    }
    editingEntryId = null;
  } else {
    const entry = { id: Math.max(Date.now(), ...kissLog.map(e=>e.id+1)), name, age, date, playerId, country, countryName };
    kissLog.unshift(entry);
    incrementTroopsForEntry(entry);
  }

  // keep date/player/country so rapid edits are easier
  document.getElementById('entry-name').value = '';
  document.getElementById('entry-age').value = '';
  const btn = document.getElementById('entry-submit-btn');
  if (btn) btn.textContent = '+ ADD ENTRY';

  saveData();

  updateMapColors();
  renderAll();
  renderStats();
}

function incrementTroopsForEntry(entry) {
  if (!entry.country || !entry.playerId) return;
  const cid = normalizeCountryId(entry.country);
  if (!troops[cid]) troops[cid] = {};
  troops[cid][entry.playerId] = (troops[cid][entry.playerId] || 0) + 1;
  if (!lastUpdated[cid]) lastUpdated[cid] = {};
  lastUpdated[cid][entry.playerId] = entry.id;
}


function decrementTroopsForEntry(entry) {
  if (!entry || !entry.country || !entry.playerId) return;
  const cid = normalizeCountryId(entry.country);
  if (!troops[cid]) return;
  const pid = entry.playerId;
  const current = troops[cid][pid] || 0;
  const next = Math.max(0, current - 1);
  if (next === 0) {
    delete troops[cid][pid];
    if (Object.keys(troops[cid]).length === 0) delete troops[cid];
  } else {
    troops[cid][pid] = next;
  }

  // Recompute lastUpdated for this (country, player) from remaining log entries.
  const remaining = kissLog.filter(e => e.id !== entry.id && normalizeCountryId(e.country) === cid && e.playerId === pid);
  if (!lastUpdated[cid]) lastUpdated[cid] = {};
  if (remaining.length === 0) {
    delete lastUpdated[cid][pid];
    if (Object.keys(lastUpdated[cid]).length === 0) delete lastUpdated[cid];
  } else {
    // newest entry is max id (we use Date.now() for id)
    const latest = remaining.reduce((a,b) => (a.id > b.id ? a : b));
    lastUpdated[cid][pid] = latest.id;
  }
}

function editEntry(id) {
  const entry = kissLog.find(e => e.id === id);
  if (!entry) return;

  editingEntryId = id;

  document.getElementById('entry-name').value = entry.name || '';
  document.getElementById('entry-age').value = entry.age ?? '';
  document.getElementById('entry-date').value = entry.date || localDateInputValue();
  document.getElementById('entry-player').value = String(entry.playerId);
  document.getElementById('entry-country').value = entry.country || '';

  // update submit button label
  const btn = document.getElementById('entry-submit-btn');
  if (btn) btn.textContent = '✎ SAVE CHANGES';
}

function deleteEntry(id) {
  const entry = kissLog.find(e => e.id === id);
  if (!entry) return;
  if (!confirm('Delete this entry?')) return;

  // Remove from log first, then update counters based on remaining state.
  kissLog = kissLog.filter(e => e.id !== id);
  decrementTroopsForEntry(entry);

  updateMapColors();
  renderAll();
  renderStats();
  saveData();
}



function renderStats() {
  renderLogList();
  renderTimeline();
  renderCharts();
  renderLeaderboard();
}

function formatDateNl(dateStr) {
  if (!dateStr) return '?';
  // input is yyyy-mm-dd; parse as local time to avoid timezone shifts
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function entryCard(entry, showDelete = true) {
  const player = PLAYERS.find(p => p.id === entry.playerId);
  const dateStr = formatDateNl(entry.date);
const del = showDelete ? `<button class="timeline-delete" onclick="deleteEntry(${entry.id})">✕</button>` : '';
  const edit = showDelete ? `<button class="timeline-delete" style="margin-right:6px;" onclick="editEntry(${entry.id})">✎</button>` : '';

  return `
    <div class="timeline-entry">
      <div class="timeline-dot" style="background:${player?.color||'#888'};color:${player?.color||'#888'}"></div>
      <div class="timeline-body">
        <div class="timeline-name">${escapeHtml(entry.name)}${entry.age ? ` <span style="font-family:Crimson Text,serif;font-weight:400;font-size:0.8rem;color:var(--text-dim)">(${entry.age})</span>` : ''}</div>
        <div class="timeline-meta">
          <span>👤 ${player?.name || '?'}</span>
          ${entry.countryName ? `<span>🌍 ${escapeHtml(entry.countryName)}</span>` : ''}
          <span>📅 ${dateStr}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:row;gap:6px;align-items:center;">
        ${edit}
        ${del}
      </div>

    </div>
  `;
}


function renderLogList() {
  const el = document.getElementById('log-list');
  if (kissLog.length === 0) {
    el.innerHTML = '<div class="empty-state">No entries yet. Add your first one above!</div>';
    return;
  }
  el.innerHTML = kissLog.map(e => entryCard(e)).join('');
}

function renderTimeline() {
  const el = document.getElementById('timeline-list');
  if (kissLog.length === 0) {
    el.innerHTML = '<div class="empty-state">No entries yet.</div>';
    return;
  }
  // Sort by date ascending for timeline
  const sorted = [...kissLog].sort((a,b) => (a.date||'').localeCompare(b.date||''));
  el.innerHTML = sorted.map(e => entryCard(e)).join('');
}

function renderCharts() {
  if (kissLog.length === 0) {
    ['chart-player','chart-country','chart-age','stat-cards'].forEach(id => {
      document.getElementById(id).innerHTML = '<div class="empty-state">No data yet.</div>';
    });
    return;
  }

  // Stat cards
  const avgAge = kissLog.filter(e => e.age).reduce((s,e) => s+e.age, 0) / (kissLog.filter(e=>e.age).length || 1);
  const countries = new Set(kissLog.filter(e=>e.country).map(e=>normalizeCountryId(e.country))).size;
  document.getElementById('stat-cards').innerHTML = `
    <div class="stat-card">
      <div class="stat-card-value">${kissLog.length}</div>
      <div class="stat-card-label">Total entries</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-value">${avgAge ? avgAge.toFixed(1) : '?'}</div>
      <div class="stat-card-label">Avg age</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-value">${countries}</div>
      <div class="stat-card-label">Countries</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-value">${Math.min(...kissLog.filter(e=>e.age).map(e=>e.age)) || '?'}</div>
      <div class="stat-card-label">Youngest</div>
    </div>
    <div class="stat-card">
      <div class="stat-card-value">${Math.max(...kissLog.filter(e=>e.age).map(e=>e.age)) || '?'}</div>
      <div class="stat-card-label">Oldest</div>
    </div>
  `;

  // Per player bar chart
  const playerCounts = PLAYERS.map(p => ({ label: p.name, color: p.color, count: kissLog.filter(e=>e.playerId===p.id).length }))
    .sort((a,b) => b.count - a.count);
  const maxP = Math.max(...playerCounts.map(p=>p.count), 1);
  document.getElementById('chart-player').innerHTML = playerCounts.map(p => `
    <div class="bar-row">
      <div class="bar-label">${p.label}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(p.count/maxP*100)}%;background:${p.color};">
          ${p.count > 0 ? `<span class="bar-value">${p.count}</span>` : ''}
        </div>
      </div>
      <div class="bar-count">${p.count}</div>
    </div>
  `).join('');

  // Per country bar chart (top 10)
  const countryCounts = {};
  kissLog.forEach(e => { if (e.countryName) countryCounts[e.countryName] = (countryCounts[e.countryName]||0)+1; });
  const topCountries = Object.entries(countryCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxC = Math.max(...topCountries.map(c=>c[1]), 1);
  document.getElementById('chart-country').innerHTML = topCountries.length ? topCountries.map(([name,count]) => `
    <div class="bar-row">
      <div class="bar-label">${name}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${count/maxC*100}%;background:var(--accent);">
          <span class="bar-value">${count}</span>
        </div>
      </div>
      <div class="bar-count">${count}</div>
    </div>
  `).join('') : '<div class="empty-state">No country data.</div>';

  // Age distribution (buckets of 5 years)
  const ageBuckets = {};
  kissLog.filter(e=>e.age).forEach(e => {
    const bucket = Math.floor(e.age/5)*5;
    const label = `${bucket}–${bucket+4}`;
    ageBuckets[label] = (ageBuckets[label]||0)+1;
  });
  const sortedBuckets = Object.entries(ageBuckets).sort((a,b)=>parseInt(a[0])-parseInt(b[0]));
  const maxA = Math.max(...sortedBuckets.map(b=>b[1]), 1);
  document.getElementById('chart-age').innerHTML = sortedBuckets.length ? sortedBuckets.map(([label,count]) => `
    <div class="bar-row">
      <div class="bar-label">${label}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${count/maxA*100}%;background:#c77dff;">
          <span class="bar-value">${count}</span>
        </div>
      </div>
      <div class="bar-count">${count}</div>
    </div>
  `).join('') : '<div class="empty-state">No age data.</div>';
}

function renderLeaderboard() {
  const el = document.getElementById('leaderboard-content');
  if (kissLog.length === 0) {
    el.innerHTML = '<div class="empty-state">No entries yet.</div>';
    return;
  }

  const ranked = PLAYERS.map(p => {
    const entries = kissLog.filter(e => e.playerId === p.id);
    const avgAge = entries.filter(e=>e.age).reduce((s,e)=>s+e.age,0) / (entries.filter(e=>e.age).length||1);
    const countries = new Set(entries.filter(e=>e.country).map(e=>normalizeCountryId(e.country))).size;
    return { ...p, entries, count: entries.length, avgAge, countries };
  }).sort((a,b) => b.count - a.count);

  el.innerHTML = ranked.map((p, i) => `
    <div style="background:var(--panel2);border:1px solid ${i===0?p.color:'var(--border)'};border-radius:6px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <span style="font-family:'Cinzel Decorative',serif;font-size:1.3rem;color:${i===0?'#d4a843':i===1?'#aaa':i===2?'#cd7f32':'var(--text-dim)'};">${i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}</span>
        <span style="width:12px;height:12px;border-radius:50%;background:${p.color};box-shadow:0 0 6px ${p.color};flex-shrink:0"></span>
        <span style="font-family:'Cinzel',serif;font-size:1rem;font-weight:700;flex:1">${p.name}</span>
        <span style="font-family:'Cinzel Decorative',serif;font-size:1.4rem;color:${p.color}">${p.count}</span>
      </div>
      <div style="display:flex;gap:16px;font-size:0.78rem;color:var(--text-dim);flex-wrap:wrap;">
        <span>📊 Avg age: <b style="color:var(--text)">${p.entries.filter(e=>e.age).length ? p.avgAge.toFixed(1) : '?'}</b></span>
        <span>🌍 Countries: <b style="color:var(--text)">${p.countries}</b></span>
      </div>
      ${p.entries.length ? `
        <div style="margin-top:10px;border-top:1px solid var(--border);padding-top:8px;">
          <div style="font-family:'Cinzel',serif;font-size:0.58rem;letter-spacing:0.15em;color:var(--text-dim);margin-bottom:6px;">RECENT</div>
          ${p.entries.slice(0,3).map(e => {
            const dateStr = e.date ? formatDateNl(e.date) : '';
            return `<div style="font-size:0.8rem;padding:2px 0;color:var(--text)">${escapeHtml(e.name)}${e.age?` (${e.age})`:''} ${e.countryName?`• ${escapeHtml(e.countryName)}`:''} ${dateStr?`• ${dateStr}`:''}</div>`;
          }).join('')}

        </div>
      ` : ''}
    </div>
  `).join('');
}

// ---- BOOT ----
document.body.classList.add('loading');
Promise.all([loadMap(),loadSaved()]).then(()=>{
  renderAll();renderMobileAll();updateMapColors();document.body.classList.remove('loading');
}).catch(error=>{showSaveProblem(error.message+' Reload to try again.');});

let historyBaseVersion=null;
async function openHistory() {
  if(!gameLoaded || dirty || saving || saveBlocked) { alert('Save your changes or resolve the save warning first.'); return; }
  historyBaseVersion=gameVersion;
  const dialog=document.getElementById('history-dialog');
  const list=document.getElementById('history-list');list.textContent='Loading…';dialog.showModal();
  try {
    const response=await fetch(`/api/groups/${GROUP_ID}/history`);
    const data=await response.json();if(!response.ok) throw new Error(data.error || 'History unavailable');
    list.replaceChildren();
    if(!data.history.length) list.textContent='No previous saved versions yet.';
    for(const row of data.history) {
      const button=document.createElement('button');
      button.textContent=`Restore version ${row.version} — ${new Date(row.created_at).toLocaleString('nl-NL')}`;
      button.onclick=()=>restoreHistory(row.version);list.appendChild(button);
    }
  } catch(error) { list.textContent=error.message; }
}
async function restoreHistory(version) {
  if(!confirm('Restore this earlier version? Your current version is backed up first.')) return;
  downloadBackup();
  try {
    const response=await fetch(`/api/groups/${GROUP_ID}/history/${version}/restore`,{method:'POST',headers:{'Content-Type':'application/json','If-Match':String(historyBaseVersion)},body:'{}'});
    const result=await response.json();if(!response.ok) throw new Error(result.error || 'Restore failed');
    gameVersion=result.version;applySnapshot(result.game);renderAll();renderMobileAll();updateMapColors();renderStats();
    document.getElementById('history-dialog').close();flashStatus('Version restored ✓',true);
  } catch(error) { document.getElementById('history-list').textContent=error.message+' Close and reload history before trying again.'; }
}
