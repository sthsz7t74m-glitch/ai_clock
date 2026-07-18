const timeElement = document.getElementById("time");
const dateElement = document.getElementById("date");
const cityNameElement = document.getElementById("cityName");
const timezoneSelect = document.getElementById("timezoneSelect");
const hour24Button = document.getElementById("hour24Button");
const hour12Button = document.getElementById("hour12Button");
const addFavoriteButton = document.getElementById("addFavoriteButton");
const favoritesList = document.getElementById("favoritesList");
const favoriteCountLabel = document.getElementById("favoriteCount");

const cityNames = {
  "Asia/Tokyo": "東京",
  "Europe/London": "ロンドン",
  "America/New_York": "ニューヨーク",
  "America/Los_Angeles": "ロサンゼルス",
  "Australia/Sydney": "シドニー",
};

const STORAGE_HOUR_FORMAT = "aiClockHourFormat";
const STORAGE_FAVORITES = "aiClockFavorites";
const HOUR_FORMAT_24 = "24";
const HOUR_FORMAT_12 = "12";
const MAX_FAVORITES = 5;

function getSavedHourFormat() {
  const saved = localStorage.getItem(STORAGE_HOUR_FORMAT);
  return saved === HOUR_FORMAT_12 ? HOUR_FORMAT_12 : HOUR_FORMAT_24;
}

function getSavedFavorites() {
  try {
    const saved = localStorage.getItem(STORAGE_FAVORITES);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(STORAGE_FAVORITES, JSON.stringify(favorites));
}

function setHourFormat(format) {
  localStorage.setItem(STORAGE_HOUR_FORMAT, format);
  hour24Button.classList.toggle("active", format === HOUR_FORMAT_24);
  hour12Button.classList.toggle("active", format === HOUR_FORMAT_12);
  updateClock();
  renderFavorites();
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

  return {
    time: date.toLocaleTimeString("ja-JP", timeOptions),
    date: date.toLocaleDateString("ja-JP", dateOptions),
  };
}

function updateClock() {
  const selectedTimeZone = timezoneSelect.value;
  const hourFormat = getSavedHourFormat();
  const now = new Date();
  const formatted = formatDateTime(now, selectedTimeZone, hourFormat);

  timeElement.textContent = formatted.time;
  dateElement.textContent = formatted.date;
  cityNameElement.textContent = cityNames[selectedTimeZone];
}

function renderFavorites() {
  const favorites = getSavedFavorites();
  const hourFormat = getSavedHourFormat();

  favoriteCountLabel.textContent = `${favorites.length}/${MAX_FAVORITES}`;
  favoritesList.innerHTML = "";

  if (favorites.length === 0) {
    favoritesList.innerHTML =
      '<p class="empty-message">お気に入りはまだありません</p>';
    return;
  }

  favorites.forEach((timeZone) => {
    const { time, date } = formatDateTime(new Date(), timeZone, hourFormat);
    const card = document.createElement("article");
    card.className = "favorite-card";

    card.innerHTML = `
      <div class="favorite-card-header">
        <p class="favorite-title">${cityNames[timeZone] || timeZone}</p>
        <button type="button" class="favorite-remove" data-timezone="${timeZone}">削除</button>
      </div>
      <p class="favorite-time">${time}</p>
      <p class="favorite-date">${date}</p>
    `;

    favoritesList.appendChild(card);
  });
}

function addFavorite() {
  const selectedTimeZone = timezoneSelect.value;
  const favorites = getSavedFavorites();

  if (favorites.includes(selectedTimeZone)) {
    return;
  }

  if (favorites.length >= MAX_FAVORITES) {
    favorites.shift();
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

timezoneSelect.addEventListener("change", updateClock);
hour24Button.addEventListener("click", () => setHourFormat(HOUR_FORMAT_24));
hour12Button.addEventListener("click", () => setHourFormat(HOUR_FORMAT_12));
addFavoriteButton.addEventListener("click", addFavorite);

favoritesList.addEventListener("click", (event) => {
  const button = event.target.closest(".favorite-remove");
  if (!button) return;
  const timeZone = button.getAttribute("data-timezone");
  if (timeZone) removeFavorite(timeZone);
});

setHourFormat(getSavedHourFormat());
renderFavorites();
setInterval(() => {
  updateClock();
  renderFavorites();
}, 1000);
