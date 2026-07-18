const timeElement = document.getElementById("time");
const dateElement = document.getElementById("date");
const cityNameElement = document.getElementById("cityName");
const timezoneSelect = document.getElementById("timezoneSelect");
const hour24Button = document.getElementById("hour24Button");
const hour12Button = document.getElementById("hour12Button");

const cityNames = {
  "Asia/Tokyo": "東京",
  "Europe/London": "ロンドン",
  "America/New_York": "ニューヨーク",
  "America/Los_Angeles": "ロサンゼルス",
  "Australia/Sydney": "シドニー",
};

const STORAGE_KEY = "aiClockHourFormat";
const HOUR_FORMAT_24 = "24";
const HOUR_FORMAT_12 = "12";

function getSavedHourFormat() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === HOUR_FORMAT_12 ? HOUR_FORMAT_12 : HOUR_FORMAT_24;
}

function setHourFormat(format) {
  localStorage.setItem(STORAGE_KEY, format);
  hour24Button.classList.toggle("active", format === HOUR_FORMAT_24);
  hour12Button.classList.toggle("active", format === HOUR_FORMAT_12);
  updateClock();
}

function updateClock() {
  const selectedTimeZone = timezoneSelect.value;
  const hourFormat = getSavedHourFormat();
  const now = new Date();

  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: hourFormat === HOUR_FORMAT_12,
    timeZone: selectedTimeZone,
  };

  const dateOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: selectedTimeZone,
  };

  timeElement.textContent = now.toLocaleTimeString("ja-JP", timeOptions);
  dateElement.textContent = now.toLocaleDateString("ja-JP", dateOptions);
  cityNameElement.textContent = cityNames[selectedTimeZone];
}

timezoneSelect.addEventListener("change", updateClock);
hour24Button.addEventListener("click", () => setHourFormat(HOUR_FORMAT_24));
hour12Button.addEventListener("click", () => setHourFormat(HOUR_FORMAT_12));

const initialHourFormat = getSavedHourFormat();
setHourFormat(initialHourFormat);
setInterval(updateClock, 1000);
