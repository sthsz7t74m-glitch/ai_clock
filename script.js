const timeElement = document.getElementById("time");
const dateElement = document.getElementById("date");
const cityNameElement = document.getElementById("cityName");
const timezoneSelect = document.getElementById("timezoneSelect");

const cityNames = {
  "Asia/Tokyo": "東京",
  "Europe/London": "ロンドン",
  "America/New_York": "ニューヨーク",
  "America/Los_Angeles": "ロサンゼルス",
  "Australia/Sydney": "シドニー",
};

function updateClock() {
  const selectedTimeZone = timezoneSelect.value;
  const now = new Date();

  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
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

updateClock();
setInterval(updateClock, 1000);
