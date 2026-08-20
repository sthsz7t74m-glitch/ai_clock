import { $ } from './core.js';

export class DashboardController {
  constructor(storage, cities, formatter, tabs) {
    this.storage = storage; this.cities = cities; this.formatter = formatter; this.tabs = tabs;
  }

  init() {
    $('dashboardActions')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-view]');
      if (!button) return;
      this.open(button.dataset.openView);
    });
    $('dashboardContent')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-open-view]');
      if (!button) return;
      this.open(button.dataset.openView);
    });
    this.render();
    this.interval = setInterval(() => this.render(), 1000);
  }

  open(view) {
    this.storage.set('lastView', view);
    this.tabs.show(view);
  }

  render() {
    const box = $('dashboardContent');
    if (!box) return;
    const alarms = this.storage.get('alarms', []).filter((a) => a.enabled);
    const timers = this.storage.get('timers', []).filter((t) => t.running || Number(t.remaining) > 0);
    const favorites = this.storage.get('favorites', []).filter((zone) => this.cities.find(zone)).slice(0, 3);
    const cards = [];

    cards.push(`<article class="dashboard-card"><div><span class="dashboard-kicker">NEXT ALARM</span><strong>${this.nextAlarmLabel(alarms)}</strong><small>${alarms.length ? `${alarms.length}件ON` : '登録するとここに表示'}</small></div><button class="secondary-button small-button" data-open-view="alarm">開く</button></article>`);
    cards.push(`<article class="dashboard-card"><div><span class="dashboard-kicker">TIMERS</span><strong>${timers.length ? `${timers.length}件` : 'なし'}</strong><small>${timers.length ? '動作中・待機中のタイマー' : 'クイックタイマーをすぐ開始'}</small></div><button class="secondary-button small-button" data-open-view="timer">開く</button></article>`);

    if (favorites.length) {
      const now = new Date();
      cards.push(`<article class="dashboard-card dashboard-world"><div><span class="dashboard-kicker">FAVORITES</span>${favorites.map((zone) => { const c=this.cities.find(zone); const f=this.formatter.format(now,zone,false,false); return `<div class="dashboard-city"><span>${c?.ja||zone}</span><strong>${f.time}</strong></div>`; }).join('')}</div><button class="secondary-button small-button" data-open-view="world">開く</button></article>`);
    }
    box.innerHTML = cards.join('');
  }

  nextAlarmLabel(alarms) {
    if (!alarms.length) return 'アラームなし';
    const now = new Date();
    let best = null;
    for (let add = 0; add < 8; add++) {
      const day = new Date(now); day.setDate(now.getDate()+add);
      for (const alarm of alarms) {
        if (alarm.days?.length && !alarm.days.includes(day.getDay())) continue;
        const [h,m] = String(alarm.time||'00:00').split(':').map(Number);
        const candidate = new Date(day); candidate.setHours(h,m,0,0);
        if (candidate <= now) continue;
        if (!best || candidate < best.date) best = { date:candidate, alarm };
      }
      if (best) break;
    }
    if (!best) return alarms[0].time || '設定済み';
    const diff = best.date.toDateString() === now.toDateString() ? '今日' : best.date.toLocaleDateString('ja-JP',{weekday:'short'});
    return `${diff} ${best.alarm.time} ${best.alarm.label||''}`.trim();
  }
}
