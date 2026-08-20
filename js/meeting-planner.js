import { $ } from './core.js';

export class MeetingPlannerController {
  constructor(storage, cities, formatter) {
    this.storage = storage;
    this.cities = cities;
    this.formatter = formatter;
    this.participants = this.storage.get('meetingCities', []);
    this.workHours = this.storage.get('meetingWorkHours', {});
  }

  init() {
    this.populateCitySelect();
    if (!this.participants.length) this.participants = this.defaultCities();
    this.normalizeParticipants();
    $('meetingDate').value = this.todayInZone(this.participants[0] || 'Asia/Tokyo');
    $('addMeetingCityButton').onclick = () => this.addCity();
    $('meetingCityList').addEventListener('click', (event) => this.handleListClick(event));
    $('meetingCityList').addEventListener('change', (event) => this.handleHourChange(event));
    $('findMeetingTimeButton').onclick = () => this.findTimes();
    $('meetingDate').onchange = () => this.findTimes();
    $('copyMeetingResultButton').onclick = () => this.copyBest();
    this.renderCities();
    this.findTimes();
  }

  defaultCities() {
    const favorites = this.storage.get('favorites', []);
    const valid = favorites.filter((zone) => this.cities.find(zone)).slice(0, 4);
    return valid.length >= 2 ? valid : ['Asia/Tokyo', 'Europe/London', 'America/New_York'];
  }

  normalizeParticipants() {
    this.participants = [...new Set(this.participants.filter((zone) => this.cities.find(zone)))].slice(0, 4);
    if (!this.participants.length) this.participants = ['Asia/Tokyo'];
    this.save();
  }

  populateCitySelect() {
    $('meetingCitySelect').innerHTML = this.cities.all().map((city) =>
      `<option value="${city.zone}">${city.ja} / ${city.en}</option>`
    ).join('');
  }

  addCity() {
    const zone = $('meetingCitySelect').value;
    if (!zone || this.participants.includes(zone) || this.participants.length >= 4) return;
    this.participants.push(zone);
    this.save();
    this.renderCities();
    this.findTimes();
  }

  handleListClick(event) {
    const button = event.target.closest('[data-meeting-remove]');
    if (!button || this.participants.length <= 1) return;
    this.participants = this.participants.filter((zone) => zone !== button.dataset.meetingRemove);
    this.save();
    this.renderCities();
    this.findTimes();
  }

  handleHourChange(event) {
    const input = event.target.closest('[data-work-zone]');
    if (!input) return;
    const zone = input.dataset.workZone;
    const kind = input.dataset.workKind;
    const current = this.hoursFor(zone);
    const value = Math.max(0, Math.min(24, Number(input.value)));
    this.workHours[zone] = { ...current, [kind]: Number.isFinite(value) ? value : current[kind] };
    if (this.workHours[zone].end <= this.workHours[zone].start) this.workHours[zone].end = Math.min(24, this.workHours[zone].start + 1);
    this.save();
    this.findTimes();
  }

  hoursFor(zone) {
    const saved = this.workHours[zone];
    return {
      start: Number.isFinite(saved?.start) ? saved.start : 9,
      end: Number.isFinite(saved?.end) ? saved.end : 18
    };
  }

  save() {
    this.storage.set('meetingCities', this.participants);
    this.storage.set('meetingWorkHours', this.workHours);
  }

  renderCities() {
    $('meetingCityCount').textContent = `${this.participants.length}/4`;
    $('meetingCityList').innerHTML = this.participants.map((zone, index) => {
      const city = this.cities.find(zone);
      const hours = this.hoursFor(zone);
      return `<article class="meeting-city-card">
        <div class="meeting-city-head">
          <div><strong>${city?.ja || zone}</strong><small>${city?.en || zone}</small></div>
          <button class="compare-remove" data-meeting-remove="${zone}" aria-label="削除" ${this.participants.length <= 1 ? 'disabled' : ''}>×</button>
        </div>
        <div class="work-hours">
          <label>開始<input type="number" min="0" max="23" step="1" value="${hours.start}" data-work-zone="${zone}" data-work-kind="start"></label>
          <span>〜</span>
          <label>終了<input type="number" min="1" max="24" step="1" value="${hours.end}" data-work-zone="${zone}" data-work-kind="end"></label>
        </div>
        ${index === 0 ? '<span class="reference-chip">基準都市</span>' : ''}
      </article>`;
    }).join('');
  }

  findTimes() {
    const date = $('meetingDate').value;
    if (!date || !this.participants.length) return;
    const referenceZone = this.participants[0];
    const candidates = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += 30) {
      const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
      const mm = String(minutes % 60).padStart(2, '0');
      const instant = this.formatter.localDateToInstant(date, `${hh}:${mm}`, referenceZone);
      const rows = this.participants.map((zone) => this.localStatus(instant, zone));
      const inWorkCount = rows.filter((row) => row.inWork).length;
      const score = rows.reduce((sum, row) => sum + this.rowScore(row), 0);
      candidates.push({ instant, rows, inWorkCount, score, exact: inWorkCount === rows.length });
    }
    const exact = candidates.filter((item) => item.exact);
    const pool = exact.length ? exact : candidates.sort((a, b) => b.score - a.score || a.instant - b.instant);
    this.renderResults(pool.slice(0, 6), exact.length > 0);
  }

  localStatus(instant, zone) {
    const parts = this.formatter.parts(instant, zone);
    const hour = Number(parts.hour) + Number(parts.minute) / 60;
    const hours = this.hoursFor(zone);
    const inWork = hour >= hours.start && hour < hours.end;
    const city = this.cities.find(zone);
    return {
      zone,
      city: city?.ja || zone,
      time: `${parts.hour}:${parts.minute}`,
      date: `${parts.year}/${parts.month}/${parts.day}`,
      hour,
      inWork,
      work: hours
    };
  }

  rowScore(row) {
    if (row.inWork) return 100;
    const before = row.hour < row.work.start ? row.work.start - row.hour : Infinity;
    const after = row.hour >= row.work.end ? row.hour - row.work.end : Infinity;
    const distance = Math.min(before, after);
    return Math.max(0, 70 - distance * 15);
  }

  renderResults(items, hasExact) {
    const box = $('meetingResults');
    const status = $('meetingPlannerStatus');
    status.textContent = hasExact
      ? `全員が勤務時間内の候補を${items.length}件表示`
      : '全員一致がないため、負担が少ない妥協候補を表示';
    box.innerHTML = items.length ? items.map((item, index) => {
      const reference = item.rows[0];
      return `<article class="meeting-result-card ${index === 0 ? 'best' : ''}" data-meeting-result="${index}">
        <div class="meeting-result-head"><div><span class="rank-chip">${index === 0 ? 'おすすめ' : `候補${index + 1}`}</span><strong>${reference.date} ${reference.time}</strong></div><span class="fit-chip ${item.exact ? 'perfect' : 'compromise'}">${item.exact ? '全員OK' : `${item.inWorkCount}/${item.rows.length}人OK`}</span></div>
        <div class="meeting-times">${item.rows.map((row) => `<div class="meeting-time-row ${row.inWork ? 'work-ok' : 'work-out'}"><span>${row.city}</span><strong>${row.time}</strong><small>${row.date}</small></div>`).join('')}</div>
      </article>`;
    }).join('') : '<p class="empty-message">候補がありません</p>';
    this.lastResults = items;
    $('copyMeetingResultButton').disabled = !items.length;
  }

  copyBest() {
    const best = this.lastResults?.[0];
    if (!best) return;
    const parts = best.rows.map((row) => `${row.city} ${row.date} ${row.time}`);
    const text = `会議候補：${parts.join(' / ')}`;
    navigator.clipboard?.writeText(text).then(() => {
      $('meetingPlannerStatus').textContent = 'おすすめ候補をコピーしたよ';
    }).catch(() => {
      $('meetingPlannerStatus').textContent = text;
    });
  }

  todayInZone(zone) {
    const p = this.formatter.parts(new Date(), zone);
    return `${p.year}-${p.month}-${p.day}`;
  }
}
