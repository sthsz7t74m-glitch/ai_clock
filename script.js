const $ = (id) => document.getElementById(id);

class StorageService {
  constructor(prefix = "aiClock") { this.prefix = prefix; }
  key(name) { return `${this.prefix}${name}`; }
  get(name, fallback) {
    try {
      const raw = localStorage.getItem(this.key(name));
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }
  set(name, value) {
    try { localStorage.setItem(this.key(name), JSON.stringify(value)); } catch {}
  }
}

class CityRepository {
  constructor() {
    this.cities = [
      ["Asia/Tokyo", "東京", "Tokyo"], ["Asia/Seoul", "ソウル", "Seoul"], ["Asia/Shanghai", "上海", "Shanghai"],
      ["Asia/Hong_Kong", "香港", "Hong Kong"], ["Asia/Singapore", "シンガポール", "Singapore"], ["Asia/Bangkok", "バンコク", "Bangkok"],
      ["Asia/Kolkata", "デリー", "Delhi"], ["Asia/Dubai", "ドバイ", "Dubai"], ["Europe/London", "ロンドン", "London"],
      ["Europe/Paris", "パリ", "Paris"], ["Europe/Berlin", "ベルリン", "Berlin"], ["Europe/Rome", "ローマ", "Rome"],
      ["Europe/Madrid", "マドリード", "Madrid"], ["America/New_York", "ニューヨーク", "New York"], ["America/Chicago", "シカゴ", "Chicago"],
      ["America/Denver", "デンバー", "Denver"], ["America/Los_Angeles", "ロサンゼルス", "Los Angeles"], ["America/Honolulu", "ホノルル", "Honolulu"],
      ["America/Toronto", "トロント", "Toronto"], ["America/Vancouver", "バンクーバー", "Vancouver"], ["America/Sao_Paulo", "サンパウロ", "Sao Paulo"],
      ["Australia/Sydney", "シドニー", "Sydney"], ["Australia/Perth", "パース", "Perth"], ["Pacific/Auckland", "オークランド", "Auckland"]
    ];
    this.byZone = Object.fromEntries(this.cities.map(([z, ja, en]) => [z, { ja, en }]));
  }
  all() { return [...this.cities]; }
  name(zone) { return this.byZone[zone]?.ja || zone; }
  search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return this.all();
    return this.cities.filter(([zone, ja, en]) => `${zone} ${ja} ${en}`.toLowerCase().includes(q));
  }
}

class TimeFormatter {
  static formatDateTime(date, timeZone, hour12 = false) {
    return {
      time: new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12, timeZone }).format(date),
      date: new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone }).format(date)
    };
  }
  static offsetMinutes(timeZone, date) {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return Math.round((Date.UTC(+values.year, +values.month - 1, +values.day, +values.hour, +values.minute, +values.second) - date.getTime()) / 60000);
  }
  static offsetLabel(timeZone, date = new Date()) {
    const mins = this.offsetMinutes(timeZone, date);
    const sign = mins >= 0 ? "+" : "-";
    const abs = Math.abs(mins);
    return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
  }
  static isDst(timeZone, date = new Date()) {
    const y = date.getUTCFullYear();
    const jan = this.offsetMinutes(timeZone, new Date(Date.UTC(y, 0, 15, 12)));
    const jul = this.offsetMinutes(timeZone, new Date(Date.UTC(y, 6, 15, 12)));
    return this.offsetMinutes(timeZone, date) !== Math.min(jan, jul);
  }
  static stopwatch(ms) {
    const cs = Math.floor(ms / 10), p = (v) => String(v).padStart(2, "0");
    return `${p(Math.floor(cs / 360000))}:${p(Math.floor(cs / 6000) % 60)}:${p(Math.floor(cs / 100) % 60)}.${p(cs % 100)}`;
  }
  static timer(ms) {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }
}

class TabController {
  constructor(entries) { this.entries = entries; }
  show(name) {
    this.entries.forEach(({ name: n, tab, view }) => {
      const active = n === name;
      view.classList.toggle("hidden", !active);
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
  }
  bind() { this.entries.forEach((e) => e.tab.addEventListener("click", () => this.show(e.name))); }
}

class WorldClockController {
  constructor(storage, cities) {
    this.storage = storage; this.cities = cities; this.maxFavorites = 8;
    this.select = $("timezoneSelect"); this.search = $("citySearch");
    this.time = $("time"); this.date = $("date"); this.city = $("cityName");
    this.offset = $("utcOffset"); this.dst = $("dstStatus");
    this.favorites = $("favoritesList"); this.favoriteCount = $("favoriteCount");
    this.addFavoriteButton = $("addFavoriteButton"); this.hour24 = $("hour24Button"); this.hour12 = $("hour12Button");
  }
  hour12Enabled() { return this.storage.get("HourFormat", "24") === "12"; }
  favoritesValue() { return this.storage.get("Favorites", []).filter((z) => this.cities.byZone[z]); }
  populate(list = this.cities.all()) {
    const current = this.select.value || "Asia/Tokyo";
    this.select.innerHTML = list.map(([z, ja]) => `<option value="${z}">${ja}</option>`).join("");
    this.select.value = list.some(([z]) => z === current) ? current : (list[0]?.[0] || "Asia/Tokyo");
    this.update();
  }
  setHourFormat(format) {
    this.storage.set("HourFormat", format);
    this.hour24.classList.toggle("active", format === "24");
    this.hour12.classList.toggle("active", format === "12");
    this.update(); this.renderFavorites();
  }
  update() {
    if (!this.select.value) return;
    const now = new Date(), zone = this.select.value;
    const f = TimeFormatter.formatDateTime(now, zone, this.hour12Enabled());
    this.time.textContent = f.time; this.date.textContent = f.date; this.city.textContent = this.cities.name(zone);
    this.offset.textContent = TimeFormatter.offsetLabel(zone, now);
    this.dst.textContent = TimeFormatter.isDst(zone, now) ? "サマータイム" : "標準時";
    this.updateFavoriteButton();
  }
  updateFavoriteButton() {
    const fav = this.favoritesValue();
    this.addFavoriteButton.disabled = !this.select.value || fav.includes(this.select.value) || fav.length >= this.maxFavorites;
  }
  addFavorite() {
    const fav = this.favoritesValue();
    if (!fav.includes(this.select.value) && fav.length < this.maxFavorites) {
      fav.push(this.select.value); this.storage.set("Favorites", fav); this.renderFavorites();
    }
  }
  removeFavorite(zone) { this.storage.set("Favorites", this.favoritesValue().filter((z) => z !== zone)); this.renderFavorites(); }
  renderFavorites() {
    const fav = this.favoritesValue(), now = new Date(); this.favoriteCount.textContent = `${fav.length}/${this.maxFavorites}`;
    this.favorites.innerHTML = fav.length ? fav.map((zone) => {
      const f = TimeFormatter.formatDateTime(now, zone, this.hour12Enabled());
      return `<article class="favorite-card" data-timezone="${zone}"><div class="favorite-card-header"><div><p class="favorite-title">${this.cities.name(zone)}</p><p class="favorite-meta">${TimeFormatter.offsetLabel(zone)} · ${TimeFormatter.isDst(zone) ? "DST" : "標準時"}</p></div><button type="button" class="favorite-remove" data-timezone="${zone}">削除</button></div><p class="favorite-time">${f.time}</p><p class="favorite-date">${f.date}</p></article>`;
    }).join("") : '<p class="empty-message">お気に入りはまだありません</p>';
    this.updateFavoriteButton();
  }
  updateFavoriteTimes() {
    const now = new Date();
    this.favorites.querySelectorAll(".favorite-card").forEach((card) => {
      const f = TimeFormatter.formatDateTime(now, card.dataset.timezone, this.hour12Enabled());
      card.querySelector(".favorite-time").textContent = f.time;
      card.querySelector(".favorite-date").textContent = f.date;
    });
  }
  bind() {
    this.search.addEventListener("input", () => this.populate(this.cities.search(this.search.value)));
    this.select.addEventListener("change", () => this.update());
    this.hour24.addEventListener("click", () => this.setHourFormat("24"));
    this.hour12.addEventListener("click", () => this.setHourFormat("12"));
    this.addFavoriteButton.addEventListener("click", () => this.addFavorite());
    this.favorites.addEventListener("click", (e) => { const b = e.target.closest(".favorite-remove"); if (b) this.removeFavorite(b.dataset.timezone); });
  }
  init() { this.populate(); this.setHourFormat(this.storage.get("HourFormat", "24")); this.renderFavorites(); this.bind(); }
}

class StopwatchController {
  constructor(storage) {
    this.storage = storage; this.state = storage.get("Stopwatch", { running:false, elapsed:0, startTimestamp:null, laps:[], lastLapElapsed:0 });
    this.display=$("stopwatchTime"); this.startBtn=$("startButton"); this.pauseBtn=$("pauseResumeButton"); this.resetBtn=$("resetButton"); this.lapBtn=$("lapButton"); this.clearBtn=$("clearLapsButton"); this.list=$("lapsList");
  }
  elapsed() { return this.state.running ? this.state.elapsed + Math.max(0, Date.now() - this.state.startTimestamp) : this.state.elapsed; }
  save() { this.storage.set("Stopwatch", this.state); }
  render() {
    this.display.textContent = TimeFormatter.stopwatch(this.elapsed());
    this.startBtn.disabled = this.state.running || this.state.elapsed > 0;
    this.pauseBtn.disabled = !this.state.running && this.state.elapsed === 0;
    this.pauseBtn.textContent = this.state.running ? "一時停止" : "再開";
    this.lapBtn.disabled = !this.state.running;
    this.resetBtn.disabled = !this.state.running && this.state.elapsed === 0 && this.state.laps.length === 0;
  }
  renderLaps() { this.list.innerHTML = this.state.laps.length ? this.state.laps.map((l) => `<article class="lap-card"><div class="lap-row"><b>Lap ${l.number}</b><b>${TimeFormatter.stopwatch(l.lapTime)}</b></div><div class="lap-row muted"><span>区間</span><span>合計 ${TimeFormatter.stopwatch(l.totalTime)}</span></div></article>`).join("") : '<p class="empty-message">ラップはまだありません</p>'; }
  start() { this.state.running=true; this.state.startTimestamp=Date.now(); if (!this.state.elapsed) { this.state.laps=[]; this.state.lastLapElapsed=0; } this.save(); }
  pauseResume() { if (this.state.running) { this.state.elapsed=this.elapsed(); this.state.running=false; this.state.startTimestamp=null; } else { this.state.running=true; this.state.startTimestamp=Date.now(); } this.save(); }
  reset() { this.state={running:false,elapsed:0,startTimestamp:null,laps:[],lastLapElapsed:0}; this.save(); this.renderLaps(); }
  lap() { if (!this.state.running) return; const total=this.elapsed(); this.state.laps.unshift({number:this.state.laps.length+1,lapTime:total-this.state.lastLapElapsed,totalTime:total}); this.state.lastLapElapsed=total; this.save(); this.renderLaps(); }
  clearLaps() { this.state.laps=[]; this.state.lastLapElapsed=this.elapsed(); this.save(); this.renderLaps(); }
  init() { this.startBtn.onclick=()=>this.start(); this.pauseBtn.onclick=()=>this.pauseResume(); this.resetBtn.onclick=()=>this.reset(); this.lapBtn.onclick=()=>this.lap(); this.clearBtn.onclick=()=>this.clearLaps(); this.renderLaps(); this.render(); }
}

class TimerController {
  constructor(storage, notifier) {
    this.storage=storage; this.notifier=notifier; this.state=storage.get("Timer", {running:false,remaining:300000,endTimestamp:null,initial:300000});
    this.display=$("timerTime"); this.min=$("timerMinutes"); this.sec=$("timerSeconds"); this.startBtn=$("timerStartButton"); this.pauseBtn=$("timerPauseButton"); this.resetBtn=$("timerResetButton"); this.status=$("timerStatus");
  }
  remaining() { return this.state.running ? Math.max(0, this.state.endTimestamp-Date.now()) : this.state.remaining; }
  save() { this.storage.set("Timer", this.state); }
  set(ms) { this.state={running:false,remaining:ms,endTimestamp:null,initial:ms}; this.min.value=Math.floor(ms/60000); this.sec.value=Math.floor(ms%60000/1000); this.save(); this.render(); }
  start() { if (this.state.remaining===this.state.initial && !this.state.running) this.set(((+this.min.value*60)+(+this.sec.value))*1000 || 60000); this.state.endTimestamp=Date.now()+this.state.remaining; this.state.running=true; this.save(); document.title="AI Clock"; }
  pauseResume() { if (this.state.running) { this.state.remaining=this.remaining(); this.state.running=false; this.state.endTimestamp=null; } else if (this.state.remaining>0) { this.state.endTimestamp=Date.now()+this.state.remaining; this.state.running=true; } this.save(); }
  reset() { this.set(this.state.initial || 300000); this.status.textContent="時間を設定して開始"; document.title="AI Clock"; }
  render() {
    const remaining=this.remaining(); this.display.textContent=TimeFormatter.timer(remaining);
    if (this.state.running && remaining<=0) { this.state.running=false; this.state.remaining=0; this.state.endTimestamp=null; this.save(); this.status.textContent="時間です！"; this.notifier.ring("タイマー", "時間です！"); }
    else this.status.textContent=this.state.running?"計測中":remaining===0?"終了":"時間を設定して開始";
    this.startBtn.disabled=this.state.running||remaining<=0; this.pauseBtn.disabled=!this.state.running&&remaining===this.state.initial; this.pauseBtn.textContent=this.state.running?"一時停止":"再開"; this.resetBtn.disabled=remaining===this.state.initial&&!this.state.running;
  }
  init() {
    this.min.value=Math.floor(this.remaining()/60000); this.sec.value=Math.floor(this.remaining()%60000/1000);
    document.querySelectorAll(".quick-button").forEach((b)=>b.addEventListener("click",()=>{ document.querySelectorAll(".quick-button").forEach((x)=>x.classList.remove("active")); b.classList.add("active"); this.set(+b.dataset.minutes*60000); }));
    this.startBtn.onclick=()=>this.start(); this.pauseBtn.onclick=()=>this.pauseResume(); this.resetBtn.onclick=()=>this.reset(); this.render();
  }
}

class AlarmNotifier {
  constructor() { this.audioContext=null; this.interval=null; }
  ring(title, message) {
    document.title=`⏰ ${title} - AI Clock`; if (navigator.vibrate) navigator.vibrate([300,150,300,150,500]);
    try { if (!this.audioContext) this.audioContext=new (window.AudioContext||window.webkitAudioContext)(); this.stopSound(); this.beep(); this.interval=setInterval(()=>this.beep(),1200); } catch {}
  }
  beep() {
    if (!this.audioContext) return; const osc=this.audioContext.createOscillator(), gain=this.audioContext.createGain(); osc.frequency.value=880; gain.gain.value=.12; osc.connect(gain); gain.connect(this.audioContext.destination); osc.start(); osc.stop(this.audioContext.currentTime+.35);
  }
  stopSound() { if (this.interval) clearInterval(this.interval); this.interval=null; document.title="AI Clock"; }
}

class AlarmController {
  constructor(storage, notifier) {
    this.storage=storage; this.notifier=notifier; this.alarms=storage.get("Alarms", []); this.selectedDays=new Set(); this.lastTriggered=new Map(); this.ringingAlarm=null;
    this.time=$("alarmTime"); this.label=$("alarmLabel"); this.weekdays=$("weekdayPicker"); this.addBtn=$("addAlarmButton"); this.list=$("alarmList"); this.count=$("alarmCount"); this.overlay=$("alarmOverlay"); this.ringLabel=$("ringingAlarmLabel"); this.ringTime=$("ringingAlarmTime");
  }
  save() { this.storage.set("Alarms", this.alarms); }
  add() {
    const time=this.time.value; if (!time) return;
    const alarm={ id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`, time, label:this.label.value.trim()||"アラーム", days:[...this.selectedDays].sort(), enabled:true, snoozeUntil:null };
    this.alarms.push(alarm); this.save(); this.label.value=""; this.render();
  }
  toggle(id) { const a=this.alarms.find((x)=>x.id===id); if (a) { a.enabled=!a.enabled; this.save(); this.render(); } }
  remove(id) { this.alarms=this.alarms.filter((x)=>x.id!==id); this.save(); this.render(); }
  dayLabel(days) { if (!days.length) return "毎日"; const map=["日","月","火","水","木","金","土"]; return days.map((d)=>map[d]).join("・"); }
  render() {
    this.count.textContent=`${this.alarms.length}件`;
    this.list.innerHTML=this.alarms.length?this.alarms.sort((a,b)=>a.time.localeCompare(b.time)).map((a)=>`<article class="alarm-item ${a.enabled?'':'alarm-off'}"><div class="alarm-main"><div><p class="alarm-item-time">${a.time}</p><p class="alarm-item-label">${a.label}</p><p class="alarm-item-days">${this.dayLabel(a.days)}</p></div><label class="switch"><input type="checkbox" data-action="toggle" data-id="${a.id}" ${a.enabled?'checked':''}><span></span></label></div><button type="button" class="favorite-remove alarm-delete" data-action="delete" data-id="${a.id}">削除</button></article>`).join(""):'<p class="empty-message">アラームはまだありません</p>';
  }
  check() {
    const now=new Date(), hhmm=`${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`, day=now.getDay(), minuteKey=`${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${hhmm}`;
    for (const a of this.alarms) {
      if (!a.enabled) continue;
      if (a.snoozeUntil && Date.now()>=a.snoozeUntil) { a.snoozeUntil=null; this.trigger(a); this.save(); return; }
      if (a.snoozeUntil) continue;
      const dayOk=!a.days.length||a.days.includes(day); if (dayOk&&a.time===hhmm&&this.lastTriggered.get(a.id)!==minuteKey) { this.lastTriggered.set(a.id,minuteKey); this.trigger(a); return; }
    }
  }
  trigger(alarm) { this.ringingAlarm=alarm; this.ringLabel.textContent=alarm.label; this.ringTime.textContent=alarm.time; this.overlay.classList.remove("hidden"); this.notifier.ring(alarm.label, alarm.time); }
  stop() { this.overlay.classList.add("hidden"); this.notifier.stopSound(); this.ringingAlarm=null; }
  snooze() { if (this.ringingAlarm) { this.ringingAlarm.snoozeUntil=Date.now()+5*60000; this.save(); } this.stop(); }
  init() {
    this.weekdays.addEventListener("click",(e)=>{ const b=e.target.closest(".weekday-button"); if(!b)return; const d=+b.dataset.day; this.selectedDays.has(d)?this.selectedDays.delete(d):this.selectedDays.add(d); b.classList.toggle("active",this.selectedDays.has(d)); });
    this.addBtn.onclick=()=>this.add(); this.list.addEventListener("click",(e)=>{ const t=e.target.closest("[data-action]"); if(!t)return; t.dataset.action==="delete"?this.remove(t.dataset.id):this.toggle(t.dataset.id); });
    $("stopAlarmButton").onclick=()=>this.stop(); $("snoozeAlarmButton").onclick=()=>this.snooze(); this.render();
  }
}

class App {
  constructor() {
    this.storage=new StorageService(); this.cities=new CityRepository(); this.notifier=new AlarmNotifier();
    this.world=new WorldClockController(this.storage,this.cities); this.stopwatch=new StopwatchController(this.storage); this.timer=new TimerController(this.storage,this.notifier); this.alarm=new AlarmController(this.storage,this.notifier);
    this.tabs=new TabController([
      {name:"world",tab:$("worldClockTab"),view:$("worldClockView")}, {name:"stopwatch",tab:$("stopwatchTab"),view:$("stopwatchView")},
      {name:"timer",tab:$("timerTab"),view:$("timerView")}, {name:"alarm",tab:$("alarmTab"),view:$("alarmView")}
    ]);
  }
  init() {
    this.tabs.bind(); this.tabs.show("world"); this.world.init(); this.stopwatch.init(); this.timer.init(); this.alarm.init();
    setInterval(()=>{ this.world.update(); this.world.updateFavoriteTimes(); this.stopwatch.render(); this.timer.render(); this.alarm.check(); },250);
    window.addEventListener("pageshow",()=>{ this.world.update(); this.world.renderFavorites(); this.stopwatch.render(); this.timer.render(); this.alarm.render(); });
  }
}

document.addEventListener("DOMContentLoaded",()=>new App().init());
