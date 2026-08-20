import { $, TimeFormatter } from './core.js';

export class WorldClockController {
  constructor(storage, cities) {
    this.storage = storage; this.cities = cities; this.formatter = new TimeFormatter();
    this.maxFavorites = 8;
  }
  init() {
    this.search = $('citySearch'); this.select = $('timezoneSelect'); this.time = $('time'); this.date = $('date');
    this.city = $('cityName'); this.offset = $('utcOffset'); this.dst = $('dstStatus'); this.favorites = $('favoritesList'); this.count = $('favoriteCount');
    this.secondsToggle = $('secondsToggle'); this.analog = $('analogClock');
    this.renderOptions(this.cities.all());
    this.select.value = this.storage.get('selectedZone','Asia/Tokyo');
    this.search?.addEventListener('input', () => this.renderOptions(this.cities.search(this.search.value)));
    this.select?.addEventListener('change', () => { this.storage.set('selectedZone',this.select.value); this.tick(); });
    $('addFavoriteButton')?.addEventListener('click', () => this.addFavorite());
    this.favorites?.addEventListener('click', (e) => { const b = e.target.closest('[data-remove-zone]'); if (b) this.removeFavorite(b.dataset.removeZone); });
    this.secondsToggle?.addEventListener('change', () => { this.storage.set('seconds',this.secondsToggle.checked); this.tick(); });
    if (this.secondsToggle) this.secondsToggle.checked = this.storage.get('seconds',true);
    this.tick(); this.renderFavorites();
    this.interval = setInterval(() => this.tick(),1000);
  }
  renderOptions(list) {
    const current = this.select?.value;
    this.select.innerHTML = list.map((c) => `<option value="${c.zone}">${c.ja} / ${c.en}</option>`).join('');
    if (list.some((c) => c.zone === current)) this.select.value = current;
  }
  hour12() { return this.storage.get('hourFormat','24') === '12'; }
  showSeconds() { return this.storage.get('seconds',true); }
  tick() {
    const zone = this.select.value || 'Asia/Tokyo'; const now = new Date(); const f = this.formatter.format(now,zone,this.hour12(),this.showSeconds());
    const c = this.cities.find(zone); this.time.textContent = f.time; this.date.textContent = f.date; this.city.textContent = c?.ja || zone;
    this.offset.textContent = this.formatter.offsetLabel(zone,now); this.dst.textContent = this.formatter.isDst(zone,now) ? 'サマータイム' : '標準時';
    this.drawAnalog(now,zone); this.updateFavoriteTimes();
  }
  drawAnalog(now,zone) {
    if (!this.analog) return; const p = this.formatter.parts(now,zone); const h=+p.hour%12,m=+p.minute,s=+p.second;
    this.analog.style.setProperty('--hour-angle',`${(h+m/60)*30}deg`); this.analog.style.setProperty('--minute-angle',`${(m+s/60)*6}deg`); this.analog.style.setProperty('--second-angle',`${s*6}deg`);
  }
  getFavorites() { return this.storage.get('favorites',[]).filter((z) => this.cities.find(z)); }
  addFavorite() { const list=this.getFavorites(); const zone=this.select.value; if (!list.includes(zone)&&list.length<this.maxFavorites) { list.push(zone); this.storage.set('favorites',list); this.renderFavorites(); } }
  removeFavorite(zone) { this.storage.set('favorites',this.getFavorites().filter((z)=>z!==zone)); this.renderFavorites(); }
  renderFavorites() {
    const list=this.getFavorites(); this.count.textContent=`${list.length}/${this.maxFavorites}`;
    this.favorites.innerHTML = list.length ? list.map((zone) => { const c=this.cities.find(zone); const f=this.formatter.format(new Date(),zone,this.hour12(),this.showSeconds()); return `<article class="favorite-card" data-zone="${zone}"><div class="favorite-card-header"><div><p class="favorite-title">${c?.ja||zone}</p><p class="favorite-meta">${this.formatter.offsetLabel(zone)} · ${this.formatter.isDst(zone)?'DST':'標準時'}</p></div><button class="favorite-remove" data-remove-zone="${zone}">削除</button></div><p class="favorite-time">${f.time}</p><p class="favorite-date">${f.date}</p></article>`; }).join('') : '<p class="empty-message">お気に入りはまだありません</p>';
  }
  updateFavoriteTimes() { this.favorites?.querySelectorAll('[data-zone]').forEach((card) => { const f=this.formatter.format(new Date(),card.dataset.zone,this.hour12(),this.showSeconds()); card.querySelector('.favorite-time').textContent=f.time; card.querySelector('.favorite-date').textContent=f.date; }); }
}
