export const $ = (id) => document.getElementById(id);

export class StorageService {
  constructor(prefix = "aiClock") { this.prefix = prefix; }
  key(name) { return `${this.prefix}:${name}`; }
  get(name, fallback = null) {
    try {
      const raw = localStorage.getItem(this.key(name));
      return raw == null ? fallback : JSON.parse(raw);
    } catch { return fallback; }
  }
  set(name, value) {
    try { localStorage.setItem(this.key(name), JSON.stringify(value)); } catch {}
  }
}

export class CityRepository {
  constructor() {
    this.cities = [
      ["Asia/Tokyo","東京","Tokyo"],["Asia/Seoul","ソウル","Seoul"],["Asia/Shanghai","上海","Shanghai"],
      ["Asia/Hong_Kong","香港","Hong Kong"],["Asia/Singapore","シンガポール","Singapore"],["Asia/Bangkok","バンコク","Bangkok"],
      ["Asia/Kolkata","デリー","Delhi"],["Asia/Dubai","ドバイ","Dubai"],["Europe/London","ロンドン","London"],
      ["Europe/Paris","パリ","Paris"],["Europe/Berlin","ベルリン","Berlin"],["Europe/Rome","ローマ","Rome"],
      ["Europe/Madrid","マドリード","Madrid"],["America/New_York","ニューヨーク","New York"],["America/Chicago","シカゴ","Chicago"],
      ["America/Denver","デンバー","Denver"],["America/Los_Angeles","ロサンゼルス","Los Angeles"],["America/Honolulu","ホノルル","Honolulu"],
      ["America/Sao_Paulo","サンパウロ","Sao Paulo"],["Australia/Sydney","シドニー","Sydney"],["Pacific/Auckland","オークランド","Auckland"]
    ];
  }
  all() { return this.cities.map(([zone, ja, en]) => ({ zone, ja, en })); }
  find(zone) { return this.all().find((c) => c.zone === zone); }
  search(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return this.all();
    return this.all().filter((c) => `${c.ja} ${c.en} ${c.zone}`.toLowerCase().includes(q));
  }
  resolve(name) {
    const q = String(name || "").trim().toLowerCase();
    return this.all().find((c) => [c.ja,c.en,c.zone].some((v) => v.toLowerCase() === q)) ||
      this.all().find((c) => `${c.ja} ${c.en}`.toLowerCase().includes(q));
  }
}

export class TimeFormatter {
  format(date, zone, hour12 = false, seconds = true) {
    return {
      time: new Intl.DateTimeFormat("ja-JP", { hour:"2-digit", minute:"2-digit", ...(seconds ? {second:"2-digit"} : {}), hour12, timeZone:zone }).format(date),
      date: new Intl.DateTimeFormat("ja-JP", { year:"numeric", month:"long", day:"numeric", weekday:"short", timeZone:zone }).format(date)
    };
  }
  parts(date, zone) {
    const parts = new Intl.DateTimeFormat("en-CA", { timeZone:zone, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23" }).formatToParts(date);
    return Object.fromEntries(parts.map((p) => [p.type,p.value]));
  }
  offsetMinutes(zone, date = new Date()) {
    const p = this.parts(date, zone);
    const localAsUtc = Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);
    return Math.round((localAsUtc - date.getTime()) / 60000);
  }
  offsetLabel(zone, date = new Date()) {
    const m = this.offsetMinutes(zone,date); const sign = m >= 0 ? "+" : "-"; const abs = Math.abs(m);
    return `UTC${sign}${String(Math.floor(abs/60)).padStart(2,"0")}:${String(abs%60).padStart(2,"0")}`;
  }
  isDst(zone, date = new Date()) {
    const y = date.getUTCFullYear();
    const jan = this.offsetMinutes(zone,new Date(Date.UTC(y,0,15,12)));
    const jul = this.offsetMinutes(zone,new Date(Date.UTC(y,6,15,12)));
    return this.offsetMinutes(zone,date) !== Math.min(jan,jul);
  }
  localDateToInstant(dateString, timeString, zone) {
    const [y,m,d] = dateString.split("-").map(Number); const [hh,mm] = timeString.split(":").map(Number);
    let guess = Date.UTC(y,m-1,d,hh,mm,0);
    for (let i=0;i<3;i++) guess -= this.offsetMinutes(zone,new Date(guess))*60000;
    return new Date(guess);
  }
}

export class TabController {
  constructor(entries) { this.entries = entries; }
  show(name) {
    this.entries.forEach(({name:key,button,panel}) => {
      const active = key === name;
      button?.classList.toggle("active",active); panel?.classList.toggle("hidden",!active); button?.setAttribute("aria-selected",String(active));
    });
  }
}
