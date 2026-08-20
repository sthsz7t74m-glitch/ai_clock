export class MeetingPlannerService {
  constructor(cities, formatter) {
    this.cities = cities;
    this.formatter = formatter;
  }

  find({ date, zones, workHours, stepMinutes = 30, limit = 6 }) {
    if (!date || !zones?.length) return { items: [], hasExact: false };
    const referenceZone = zones[0];
    const candidates = [];
    for (let minutes = 0; minutes < 24 * 60; minutes += stepMinutes) {
      const hh = String(Math.floor(minutes / 60)).padStart(2, '0');
      const mm = String(minutes % 60).padStart(2, '0');
      const instant = this.formatter.localDateToInstant(date, `${hh}:${mm}`, referenceZone);
      const rows = zones.map((zone) => this.localStatus(instant, zone, workHours[zone]));
      const inWorkCount = rows.filter((row) => row.inWork).length;
      const score = rows.reduce((sum, row) => sum + this.scoreRow(row), 0);
      candidates.push({ instant, rows, inWorkCount, score, exact: inWorkCount === rows.length });
    }
    const exact = candidates.filter((item) => item.exact);
    const pool = exact.length
      ? exact.sort((a, b) => a.instant - b.instant)
      : candidates.sort((a, b) => b.score - a.score || a.instant - b.instant);
    return { items: pool.slice(0, limit), hasExact: exact.length > 0 };
  }

  localStatus(instant, zone, work = { start: 9, end: 18 }) {
    const parts = this.formatter.parts(instant, zone);
    const hour = Number(parts.hour) + Number(parts.minute) / 60;
    const normalized = {
      start: Number.isFinite(work?.start) ? work.start : 9,
      end: Number.isFinite(work?.end) ? work.end : 18
    };
    const city = this.cities.find(zone);
    return {
      zone,
      city: city?.ja || zone,
      time: `${parts.hour}:${parts.minute}`,
      date: `${parts.year}/${parts.month}/${parts.day}`,
      hour,
      work: normalized,
      inWork: hour >= normalized.start && hour < normalized.end
    };
  }

  scoreRow(row) {
    if (row.inWork) return 100;
    const before = row.hour < row.work.start ? row.work.start - row.hour : Infinity;
    const after = row.hour >= row.work.end ? row.hour - row.work.end : Infinity;
    const distance = Math.min(before, after);
    return Math.max(0, 70 - distance * 15);
  }
}
