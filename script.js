const worldClockTab = document.getElementById("worldClockTab");
const stopwatchTab = document.getElementById("stopwatchTab");
const worldClockView = document.getElementById("worldClockView");
const stopwatchView = document.getElementById("stopwatchView");

const timeElement = document.getElementById("time");
const dateElement = document.getElementById("date");
const cityNameElement = document.getElementById("cityName");
const timezoneSelect = document.getElementById("timezoneSelect");
const hour24Button = document.getElementById("hour24Button");
const hour12Button = document.getElementById("hour12Button");
const addFavoriteButton = document.getElementById("addFavoriteButton");
const favoritesList = document.getElementById("favoritesList");
const favoriteCountLabel = document.getElementById("favoriteCount");

const stopwatchTimeElement = document.getElementById("stopwatchTime");
const startButton = document.getElementById("startButton");
const pauseResumeButton = document.getElementById("pauseResumeButton");
const resetButton = document.getElementById("resetButton");
const lapButton = document.getElementById("lapButton");
const lapsList = document.getElementById("lapsList");

const cityNames = {
  "Asia/Tokyo": "東京",
  "Europe/London": "ロンドン",
  "America/New_York": "ニューヨーク",
  "America/Los_Angeles": "ロサンゼルス",
  "Australia/Sydney": "シドニー",
};

const STORAGE_HOUR_FORMAT = "aiClockHourFormat";
const STORAGE_FAVORITES = "aiClockFavorites";
const STORAGE_STOPWATCH = "aiClockStopwatch";
const HOUR_FORMAT_24 = "24";
const HOUR_FORMAT_12 = "12";
const MAX_FAVORITES = 5;
let hasLocalStorage = true;
let stopwatchState = {
  running: false,
  elapsed: 0,
  startTimestamp: null,
  laps: [],
  lastLapElapsed: 0,
};
let rafId = null;

function safeGetItem(key) {
  if (!hasLocalStorage) return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    hasLocalStorage = false;
    return null;
  }
}

function safeSetItem(key, value) {
  if (!hasLocalStorage) return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    hasLocalStorage = false;
  }
}

function getSavedHourFormat() {
  const saved = safeGetItem(STORAGE_HOUR_FORMAT);
  return saved === HOUR_FORMAT_12 ? HOUR_FORMAT_12 : HOUR_FORMAT_24;
}

function getSavedFavorites() {
  const saved = safeGetItem(STORAGE_FAVORITES);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  safeSetItem(STORAGE_FAVORITES, JSON.stringify(favorites));
}

function saveHourFormat(format) {
  safeSetItem(STORAGE_HOUR_FORMAT, format);
}

function getSavedStopwatch() {
  const saved = safeGetItem(STORAGE_STOPWATCH);
  if (!saved) return null;

  try {
    const parsed = JSON.parse(saved);
    if (parsed && typeof parsed === "object") {
      return {
        running: Boolean(parsed.running),
        elapsed: Number(parsed.elapsed) || 0,
        startTimestamp:
          parsed.running && Number(parsed.startTimestamp)
            ? Number(parsed.startTimestamp)
            : null,
        laps: Array.isArray(parsed.laps) ? parsed.laps : [],
        lastLapElapsed: Number(parsed.lastLapElapsed) || 0,
      };
    }
  } catch {
    return null;
  }

  return null;
}

function saveStopwatchState() {
  safeSetItem(STORAGE_STOPWATCH, JSON.stringify(stopwatchState));
}

function parseIntlDate(date, options) {
  try {
    return new Intl.DateTimeFormat("ja-JP", options).format(date);
  } catch {
    return null;
  }
}

function fallbackTimeString(date, hourFormat) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const padded = (value) => String(value).padStart(2, "0");

  if (hourFormat === HOUR_FORMAT_12) {
    const period = hours < 12 ? "午前" : "午後";
    const h = hours % 12 || 12;
    return `${period}${String(h).padStart(2, "0")}:${padded(minutes)}:${padded(seconds)}`;
  }

  return `${padded(hours)}:${padded(minutes)}:${padded(seconds)}`;
}

function fallbackDateString(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = [
    "日曜日",
    "月曜日",
    "火曜日",
    "水曜日",
    "木曜日",
    "金曜日",
    "土曜日",
  ];
  const weekday = weekdays[date.getDay()];
  return `${year}年${month}月${day}日${weekday}`;
}

function formatDateTime(date, timeZone, hourFormat) {
  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: hourFormat === HOUR_FORMAT_12,
    timeZone,
  };

  const dateOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone,
  };

  const time =
    parseIntlDate(date, timeOptions) || fallbackTimeString(date, hourFormat);
  const dateText = parseIntlDate(date, dateOptions) || fallbackDateString(date);

  return {
    time,
    date: dateText,
  };
}

function formatStopwatchTime(ms) {
  const totalCentiseconds = Math.floor(ms / 10);
  const hundredths = totalCentiseconds % 100;
  const seconds = Math.floor(totalCentiseconds / 100) % 60;
  const minutes = Math.floor(totalCentiseconds / 6000) % 60;
  const hours = Math.floor(totalCentiseconds / 360000);

  const padded = (value, length = 2) => String(value).padStart(length, "0");

  return `${padded(hours)}:${padded(minutes)}:${padded(seconds)}.${padded(hundredths)}`;
}

function updateClock() {
  const selectedTimeZone = timezoneSelect.value;
  const hourFormat = getSavedHourFormat();
  const now = new Date();
  const formatted = formatDateTime(now, selectedTimeZone, hourFormat);

  timeElement.textContent = formatted.time;
  dateElement.textContent = formatted.date;
  cityNameElement.textContent = cityNames[selectedTimeZone] || selectedTimeZone;
}

function updateFavoriteTimes() {
  const hourFormat = getSavedHourFormat();
  const cards = favoritesList.querySelectorAll(".favorite-card");
  cards.forEach((card) => {
    const timeZone = card.getAttribute("data-timezone");
    if (!timeZone) return;
    const formatted = formatDateTime(new Date(), timeZone, hourFormat);
    const timeElement = card.querySelector(".favorite-time");
    const dateElement = card.querySelector(".favorite-date");
    if (timeElement) timeElement.textContent = formatted.time;
    if (dateElement) dateElement.textContent = formatted.date;
  });
}

function renderFavorites() {
  const favorites = getSavedFavorites();
  const hourFormat = getSavedHourFormat();

  favoriteCountLabel.textContent = `${favorites.length}/${MAX_FAVORITES}`;
  favoritesList.innerHTML = "";
  updateAddFavoriteButtonState();

  if (favorites.length === 0) {
    favoritesList.innerHTML =
      '<p class="empty-message">お気に入りはまだありません</p>';
    return;
  }

  favorites.forEach((timeZone) => {
    const formatted = formatDateTime(new Date(), timeZone, hourFormat);
    const card = document.createElement("article");
    card.className = "favorite-card";
    card.setAttribute("data-timezone", timeZone);

    card.innerHTML = `
      <div class="favorite-card-header">
        <p class="favorite-title">${cityNames[timeZone] || timeZone}</p>
        <button type="button" class="favorite-remove" data-timezone="${timeZone}">削除</button>
      </div>
      <p class="favorite-time">${formatted.time}</p>
      <p class="favorite-date">${formatted.date}</p>
    `;

    favoritesList.appendChild(card);
  });
}

function updateAddFavoriteButtonState() {
  const selectedTimeZone = timezoneSelect.value;
  const favorites = getSavedFavorites();
  addFavoriteButton.disabled =
    favorites.includes(selectedTimeZone) || favorites.length >= MAX_FAVORITES;
}

function addFavorite() {
  const selectedTimeZone = timezoneSelect.value;
  const favorites = getSavedFavorites();

  if (
    favorites.includes(selectedTimeZone) ||
    favorites.length >= MAX_FAVORITES
  ) {
    return;
  }

  favorites.push(selectedTimeZone);
  saveFavorites(favorites);
  renderFavorites();
}

function removeFavorite(timeZone) {
  const favorites = getSavedFavorites().filter((item) => item !== timeZone);
  saveFavorites(favorites);
  renderFavorites();
}

function switchView(view) {
  const worldActive = view === "world";
  worldClockView.classList.toggle("hidden", !worldActive);
  stopwatchView.classList.toggle("hidden", worldActive);
  worldClockTab.classList.toggle("active", worldActive);
  stopwatchTab.classList.toggle("active", !worldActive);
  worldClockTab.setAttribute("aria-selected", worldActive.toString());
  stopwatchTab.setAttribute("aria-selected", (!worldActive).toString());
}

function getStopwatchElapsed(now) {
  if (stopwatchState.running && stopwatchState.startTimestamp != null) {
    return (
      stopwatchState.elapsed + Math.max(0, now - stopwatchState.startTimestamp)
    );
  }
  return stopwatchState.elapsed;
}

function updateStopwatchDisplay() {
  const now = Date.now();
  const elapsed = getStopwatchElapsed(now);
  stopwatchTimeElement.textContent = formatStopwatchTime(elapsed);
  updateControlStates();
}

function animateStopwatch() {
  updateStopwatchDisplay();
  rafId = requestAnimationFrame(animateStopwatch);
}

function updateControlStates() {
  startButton.disabled = stopwatchState.running || stopwatchState.elapsed > 0;
  pauseResumeButton.disabled =
    stopwatchState.elapsed === 0 && !stopwatchState.running;
  resetButton.disabled =
    stopwatchState.elapsed === 0 && !stopwatchState.running;
  lapButton.disabled = !stopwatchState.running;
  pauseResumeButton.textContent = stopwatchState.running ? "一時停止" : "再開";
}

function addLap() {
  if (!stopwatchState.running) return;

  const now = Date.now();
  const elapsed = getStopwatchElapsed(now);
  const lapTime = elapsed - stopwatchState.lastLapElapsed;
  stopwatchState.lastLapElapsed = elapsed;
  stopwatchState.laps.unshift({
    number: stopwatchState.laps.length + 1,
    lapTime,
    totalTime: elapsed,
  });
  saveStopwatchState();
  renderLaps();
}

function renderLaps() {
  const laps = stopwatchState.laps;
  lapsList.innerHTML = "";

  if (laps.length === 0) {
    lapsList.innerHTML = '<p class="empty-message">ラップはまだありません</p>';
    return;
  }

  laps.forEach((lap, index) => {
    const card = document.createElement("article");
    card.className = "lap-card";
    card.innerHTML = `
      <div class="lap-row">
        <p class="lap-number">Lap ${lap.number}</p>
        <p class="lap-duration">${formatStopwatchTime(lap.lapTime)}</p>
      </div>
      <div class="lap-row">
        <p class="lap-time">区間</p>
        <p class="lap-total">合計 ${formatStopwatchTime(lap.totalTime)}</p>
      </div>
    `;
    lapsList.appendChild(card);
  });
}

function startStopwatch() {
  if (stopwatchState.running) return;

  stopwatchState.running = true;
  stopwatchState.startTimestamp = Date.now();
  if (stopwatchState.elapsed === 0) {
    stopwatchState.lastLapElapsed = 0;
    stopwatchState.laps = [];
  }
  saveStopwatchState();
  updateControlStates();
}

function pauseResumeStopwatch() {
  if (stopwatchState.running) {
    stopwatchState.elapsed = getStopwatchElapsed(Date.now());
    stopwatchState.running = false;
    stopwatchState.startTimestamp = null;
    saveStopwatchState();
  } else {
    stopwatchState.running = true;
    stopwatchState.startTimestamp = Date.now();
    saveStopwatchState();
  }
  updateControlStates();
}

function resetStopwatch() {
  if (stopwatchState.elapsed === 0 && stopwatchState.laps.length === 0) return;
  stopwatchState = {
    running: false,
    elapsed: 0,
    startTimestamp: null,
    laps: [],
    lastLapElapsed: 0,
  };
  saveStopwatchState();
  renderLaps();
  updateStopwatchDisplay();
}

function initStopwatch() {
  const saved = getSavedStopwatch();
  if (saved) {
    stopwatchState = saved;
    if (stopwatchState.running) {
      const now = Date.now();
      if (
        stopwatchState.startTimestamp &&
        stopwatchState.startTimestamp > now
      ) {
        stopwatchState.startTimestamp = now;
      }
    }
  }
  renderLaps();
  updateControlStates();
}

function switchToWorldClock() {
  switchView("world");
}

function switchToStopwatch() {
  switchView("stopwatch");
}

function initApp() {
  switchToWorldClock();

  const initialHourFormat = getSavedHourFormat();
  setHourFormat(initialHourFormat, true);
  updateClock();
  renderFavorites();
  updateAddFavoriteButtonState();

  timezoneSelect.addEventListener("change", () => {
    updateClock();
    updateAddFavoriteButtonState();
  });
  hour24Button.addEventListener("click", () => setHourFormat(HOUR_FORMAT_24));
  hour12Button.addEventListener("click", () => setHourFormat(HOUR_FORMAT_12));
  addFavoriteButton.addEventListener("click", addFavorite);
  favoritesList.addEventListener("click", (event) => {
    const button = event.target.closest(".favorite-remove");
    if (!button) return;
    const timeZone = button.getAttribute("data-timezone");
    if (timeZone) removeFavorite(timeZone);
  });

  worldClockTab.addEventListener("click", switchToWorldClock);
  stopwatchTab.addEventListener("click", switchToStopwatch);

  startButton.addEventListener("click", startStopwatch);
  pauseResumeButton.addEventListener("click", pauseResumeStopwatch);
  resetButton.addEventListener("click", resetStopwatch);
  lapButton.addEventListener("click", addLap);

  initStopwatch();
  renderLaps();
  updateClock();
  updateFavoriteTimes();

  setInterval(() => {
    updateClock();
    updateFavoriteTimes();
  }, 1000);

  animateStopwatch();
}

function setHourFormat(format, skipSave = false) {
  if (!skipSave) {
    saveHourFormat(format);
  }
  hour24Button.classList.toggle("active", format === HOUR_FORMAT_24);
  hour12Button.classList.toggle("active", format === HOUR_FORMAT_12);
  updateClock();
  updateFavoriteTimes();
}

window.addEventListener("DOMContentLoaded", initApp);
window.addEventListener("pageshow", () => {
  updateClock();
  updateFavoriteTimes();
  initStopwatch();
});
