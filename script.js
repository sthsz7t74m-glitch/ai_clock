const $ = (id) => document.getElementById(id);

const worldClockTab = $("worldClockTab");
const stopwatchTab = $("stopwatchTab");
const timerTab = $("timerTab");
const worldClockView = $("worldClockView");
const stopwatchView = $("stopwatchView");
const timerView = $("timerView");

const timeElement = $("time");
const dateElement = $("date");
const cityNameElement = $("cityName");
const timezoneSelect = $("timezoneSelect");
const utcOffsetElement = $("utcOffset");
const dstStatusElement = $("dstStatus");
const hour24Button = $("hour24Button");
const hour12Button = $("hour12Button");
const addFavoriteButton = $("addFavoriteButton");
const favoritesList = $("favoritesList");
const favoriteCountLabel = $("favoriteCount");

const stopwatchTimeElement = $("stopwatchTime");
const startButton = $("startButton");
const pauseResumeButton = $("pauseResumeButton");
const resetButton = $("resetButton");
const lapButton = $("lapButton");
const clearLapsButton = $("clearLapsButton");
const lapsList = $("lapsList");

const timerTimeElement = $("timerTime");
const timerMinutes = $("timerMinutes");
const timerSeconds = $("timerSeconds");
const timerStartButton = $("timerStartButton");
const timerPauseButton = $("timerPauseButton");
const timerResetButton = $("timerResetButton");
const timerStatus = $("timerStatus");

const CITIES = [
  ["Asia/Tokyo", "東京"], ["Asia/Seoul", "ソウル"], ["Asia/Shanghai", "上海"],
  ["Asia/Hong_Kong", "香港"], ["Asia/Singapore", "シンガポール"], ["Asia/Bangkok", "バンコク"],
  ["Asia/Kolkata", "デリー"], ["Asia/Dubai", "ドバイ"], ["Europe/London", "ロンドン"],
  ["Europe/Paris", "パリ"], ["Europe/Berlin", "ベルリン"], ["America/New_York", "ニューヨーク"],
  ["America/Chicago", "シカゴ"], ["America/Denver", "デンバー"], ["America/Los_Angeles", "ロサンゼルス"],
  ["America/Honolulu", "ホノルル"], ["America/Sao_Paulo", "サンパウロ"], ["Australia/Sydney", "シドニー"],
  ["Pacific/Auckland", "オークランド"]
];
const cityNames = Object.fromEntries(CITIES);

const STORAGE_HOUR_FORMAT = "aiClockHourFormat";
const STORAGE_FAVORITES = "aiClockFavorites";
const STORAGE_STOPWATCH = "aiClockStopwatch";
const STORAGE_TIMER = "aiClockTimer";
const HOUR_FORMAT_24 = "24";
const HOUR_FORMAT_12 = "12";
const MAX_FAVORITES = 8;
let hasLocalStorage = true;
let stopwatchState = { running: false, elapsed: 0, startTimestamp: null, laps: [], lastLapElapsed: 0 };
let timerState = { running: false, remaining: 300000, endTimestamp: null, initial: 300000 };

function safeGetItem(key) {
  if (!hasLocalStorage) return null;
  try { return localStorage.getItem(key); } catch { hasLocalStorage = false; return null; }
}
function safeSetItem(key, value) {
  if (!hasLocalStorage) return;
  try { localStorage.setItem(key, value); } catch { hasLocalStorage = false; }
}

function getHourFormat() { return safeGetItem(STORAGE_HOUR_FORMAT) === HOUR_FORMAT_12 ? HOUR_FORMAT_12 : HOUR_FORMAT_24; }
function getFavorites() {
  try { const value = JSON.parse(safeGetItem(STORAGE_FAVORITES) || "[]"); return Array.isArray(value) ? value.filter((z) => cityNames[z]) : []; }
  catch { return []; }
}
function saveFavorites(value) { safeSetItem(STORAGE_FAVORITES, JSON.stringify(value)); }

function formatDateTime(date, timeZone) {
  const hour12 = getHourFormat() === HOUR_FORMAT_12;
  const time = new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12, timeZone }).format(date);
  const dateText = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short", timeZone }).format(date);
  return { time, date: dateText };
}

function getOffsetLabel(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(date);
  const value = parts.find((p) => p.type === "timeZoneName")?.value || "GMT";
  return value.replace("GMT", "UTC");
}

function getOffsetMinutes(timeZone, date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(date);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+values.year, +values.month - 1, +values.day, +values.hour, +values.minute, +values.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

function isDst(timeZone, date = new Date()) {
  const year = date.getUTCFullYear();
  const jan = getOffsetMinutes(timeZone, new Date(Date.UTC(year, 0, 15, 12)));
  const jul = getOffsetMinutes(timeZone, new Date(Date.UTC(year, 6, 15, 12)));
  const current = getOffsetMinutes(timeZone, date);
  return current !== Math.min(jan, jul);
}

function populateCities() {
  timezoneSelect.innerHTML = CITIES.map(([zone, name]) => `<option value="${zone}">${name}</option>`).join("");
  timezoneSelect.value = "Asia/Tokyo";
}

function updateClock() {
  const zone = timezoneSelect.value;
  const now = new Date();
  const formatted = formatDateTime(now, zone);
  timeElement.textContent = formatted.time;
  dateElement.textContent = formatted.date;
  cityNameElement.textContent = cityNames[zone] || zone;
  utcOffsetElement.textContent = getOffsetLabel(zone, now);
  dstStatusElement.textContent = isDst(zone, now) ? "サマータイム" : "標準時";
}

function updateAddFavoriteButtonState() {
  const favorites = getFavorites();
  addFavoriteButton.disabled = favorites.includes(timezoneSelect.value) || favorites.length >= MAX_FAVORITES;
}

function renderFavorites() {
  const favorites = getFavorites();
  favoriteCountLabel.textContent = `${favorites.length}/${MAX_FAVORITES}`;
  favoritesList.innerHTML = "";
  if (!favorites.length) {
    favoritesList.innerHTML = '<p class="empty-message">お気に入りはまだありません</p>';
  } else {
    favorites.forEach((zone) => {
      const formatted = formatDateTime(new Date(), zone);
      const card = document.createElement("article");
      card.className = "favorite-card";
      card.dataset.timezone = zone;
      card.innerHTML = `<div class="favorite-card-header"><div><p class="favorite-title">${cityNames[zone]}</p><p class="favorite-meta">${getOffsetLabel(zone)} · ${isDst(zone) ? "DST" : "標準時"}</p></div><button class="favorite-remove" data-timezone="${zone}">削除</button></div><p class="favorite-time">${formatted.time}</p><p class="favorite-date">${formatted.date}</p>`;
      favoritesList.appendChild(card);
    });
  }
  updateAddFavoriteButtonState();
}

function updateFavoriteTimes() {
  favoritesList.querySelectorAll(".favorite-card").forEach((card) => {
    const zone = card.dataset.timezone;
    const formatted = formatDateTime(new Date(), zone);
    card.querySelector(".favorite-time").textContent = formatted.time;
    card.querySelector(".favorite-date").textContent = formatted.date;
  });
}

function addFavorite() {
  const favorites = getFavorites();
  if (!favorites.includes(timezoneSelect.value) && favorites.length < MAX_FAVORITES) {
    favorites.push(timezoneSelect.value); saveFavorites(favorites); renderFavorites();
  }
}
function removeFavorite(zone) { saveFavorites(getFavorites().filter((z) => z !== zone)); renderFavorites(); }

function switchView(view) {
  const entries = [["world", worldClockView, worldClockTab], ["stopwatch", stopwatchView, stopwatchTab], ["timer", timerView, timerTab]];
  entries.forEach(([name, panel, tab]) => {
    const active = name === view;
    panel.classList.toggle("hidden", !active);
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", String(active));
  });
}

function formatStopwatchTime(ms) {
  const cs = Math.floor(ms / 10);
  const hundredths = cs % 100;
  const seconds = Math.floor(cs / 100) % 60;
  const minutes = Math.floor(cs / 6000) % 60;
  const hours = Math.floor(cs / 360000);
  const p = (v) => String(v).padStart(2, "0");
  return `${p(hours)}:${p(minutes)}:${p(seconds)}.${p(hundredths)}`;
}
function getStopwatchElapsed() { return stopwatchState.running ? stopwatchState.elapsed + Math.max(0, Date.now() - stopwatchState.startTimestamp) : stopwatchState.elapsed; }
function saveStopwatch() { safeSetItem(STORAGE_STOPWATCH, JSON.stringify(stopwatchState)); }
function loadStopwatch() {
  try { const s = JSON.parse(safeGetItem(STORAGE_STOPWATCH)); if (s) stopwatchState = { ...stopwatchState, ...s }; } catch {}
}
function updateStopwatch() {
  stopwatchTimeElement.textContent = formatStopwatchTime(getStopwatchElapsed());
  startButton.disabled = stopwatchState.running || stopwatchState.elapsed > 0;
  pauseResumeButton.disabled = !stopwatchState.running && stopwatchState.elapsed === 0;
  resetButton.disabled = !stopwatchState.running && stopwatchState.elapsed === 0 && stopwatchState.laps.length === 0;
  lapButton.disabled = !stopwatchState.running;
  pauseResumeButton.textContent = stopwatchState.running ? "一時停止" : "再開";
}
function renderLaps() {
  if (!stopwatchState.laps.length) { lapsList.innerHTML = '<p class="empty-message">ラップはまだありません</p>'; return; }
  lapsList.innerHTML = stopwatchState.laps.map((lap) => `<article class="lap-card"><div class="lap-row"><b>Lap ${lap.number}</b><b>${formatStopwatchTime(lap.lapTime)}</b></div><div class="lap-row muted"><span>区間</span><span>合計 ${formatStopwatchTime(lap.totalTime)}</span></div></article>`).join("");
}
function startStopwatch() { stopwatchState.running = true; stopwatchState.startTimestamp = Date.now(); if (!stopwatchState.elapsed) { stopwatchState.laps = []; stopwatchState.lastLapElapsed = 0; } saveStopwatch(); }
function pauseResumeStopwatch() {
  if (stopwatchState.running) { stopwatchState.elapsed = getStopwatchElapsed(); stopwatchState.running = false; stopwatchState.startTimestamp = null; }
  else { stopwatchState.running = true; stopwatchState.startTimestamp = Date.now(); }
  saveStopwatch();
}
function resetStopwatch() { stopwatchState = { running: false, elapsed: 0, startTimestamp: null, laps: [], lastLapElapsed: 0 }; saveStopwatch(); renderLaps(); }
function addLap() {
  if (!stopwatchState.running) return;
  const total = getStopwatchElapsed();
  stopwatchState.laps.unshift({ number: stopwatchState.laps.length + 1, lapTime: total - stopwatchState.lastLapElapsed, totalTime: total });
  stopwatchState.lastLapElapsed = total; saveStopwatch(); renderLaps();
}
function clearLaps() { stopwatchState.laps = []; stopwatchState.lastLapElapsed = getStopwatchElapsed(); saveStopwatch(); renderLaps(); }

function formatTimer(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(total / 60); const sec = total % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}
function saveTimer() { safeSetItem(STORAGE_TIMER, JSON.stringify(timerState)); }
function loadTimer() {
  try { const s = JSON.parse(safeGetItem(STORAGE_TIMER)); if (s) timerState = { ...timerState, ...s }; } catch {}
}
function getTimerRemaining() { return timerState.running ? Math.max(0, timerState.endTimestamp - Date.now()) : timerState.remaining; }
function syncTimerInputs(ms) { timerMinutes.value = Math.floor(ms / 60000); timerSeconds.value = Math.floor((ms % 60000) / 1000); }
function setTimer(ms) { timerState = { running: false, remaining: ms, endTimestamp: null, initial: ms }; syncTimerInputs(ms); saveTimer(); updateTimer(); }
function updateTimer() {
  const remaining = getTimerRemaining();
  timerTimeElement.textContent = formatTimer(remaining);
  if (timerState.running && remaining <= 0) {
    timerState.running = false; timerState.remaining = 0; timerState.endTimestamp = null; saveTimer();
    timerStatus.textContent = "時間です！"; document.title = "⏰ 時間です！ - AI Clock";
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } else if (timerState.running) timerStatus.textContent = "計測中";
  else timerStatus.textContent = remaining === 0 ? "終了" : "時間を設定して開始";
  timerStartButton.disabled = timerState.running || remaining <= 0;
  timerPauseButton.disabled = !timerState.running && remaining === timerState.initial;
  timerPauseButton.textContent = timerState.running ? "一時停止" : "再開";
  timerResetButton.disabled = remaining === timerState.initial && !timerState.running;
}
function startTimer() {
  const ms = (+timerMinutes.value * 60 + +timerSeconds.value) * 1000;
  if (!timerState.running && timerState.remaining === timerState.initial) setTimer(ms || 60000);
  timerState.endTimestamp = Date.now() + timerState.remaining; timerState.running = true; saveTimer(); document.title = "AI Clock";
}
function pauseTimer() {
  if (timerState.running) { timerState.remaining = getTimerRemaining(); timerState.running = false; timerState.endTimestamp = null; }
  else if (timerState.remaining > 0) { timerState.endTimestamp = Date.now() + timerState.remaining; timerState.running = true; }
  saveTimer();
}
function resetTimer() { setTimer(timerState.initial || 300000); timerStatus.textContent = "時間を設定して開始"; document.title = "AI Clock"; }

function setHourFormat(format) {
  safeSetItem(STORAGE_HOUR_FORMAT, format);
  hour24Button.classList.toggle("active", format === HOUR_FORMAT_24);
  hour12Button.classList.toggle("active", format === HOUR_FORMAT_12);
  updateClock(); renderFavorites();
}

function init() {
  populateCities(); loadStopwatch(); loadTimer();
  setHourFormat(getHourFormat()); renderFavorites(); renderLaps(); syncTimerInputs(getTimerRemaining());
  worldClockTab.onclick = () => switchView("world");
  stopwatchTab.onclick = () => switchView("stopwatch");
  timerTab.onclick = () => switchView("timer");
  timezoneSelect.onchange = () => { updateClock(); updateAddFavoriteButtonState(); };
  hour24Button.onclick = () => setHourFormat(HOUR_FORMAT_24);
  hour12Button.onclick = () => setHourFormat(HOUR_FORMAT_12);
  addFavoriteButton.onclick = addFavorite;
  favoritesList.onclick = (e) => { const b = e.target.closest(".favorite-remove"); if (b) removeFavorite(b.dataset.timezone); };
  startButton.onclick = startStopwatch; pauseResumeButton.onclick = pauseResumeStopwatch; resetButton.onclick = resetStopwatch; lapButton.onclick = addLap; clearLapsButton.onclick = clearLaps;
  document.querySelectorAll(".quick-button").forEach((b) => b.onclick = () => { document.querySelectorAll(".quick-button").forEach((x) => x.classList.remove("active")); b.classList.add("active"); setTimer(+b.dataset.minutes * 60000); });
  [timerMinutes, timerSeconds].forEach((input) => input.onchange = () => setTimer((Math.max(0, +timerMinutes.value) * 60 + Math.min(59, Math.max(0, +timerSeconds.value))) * 1000));
  timerStartButton.onclick = startTimer; timerPauseButton.onclick = pauseTimer; timerResetButton.onclick = resetTimer;
  switchView("world"); updateClock(); updateTimer();
  setInterval(() => { updateClock(); updateFavoriteTimes(); updateStopwatch(); updateTimer(); }, 100);
}

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("pageshow", () => { updateClock(); updateFavoriteTimes(); updateStopwatch(); updateTimer(); });
