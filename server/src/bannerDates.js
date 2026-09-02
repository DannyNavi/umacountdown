export function isoToUnix(iso) {
  if (iso == null || iso === "") return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

export function buildBannerDateMap(timeline) {
  const map = new Map();
  const events = timeline?.events;
  if (!Array.isArray(events)) return map;

  for (const event of events) {
    const id = event?.gacha_id;
    if (id == null) continue;

    const start = isoToUnix(event.global_release_date);
    if (start == null) continue;

    map.set(Number(id), {
      start,
      end: isoToUnix(event.estimated_end_date),
      is_confirmed: Boolean(event.is_confirmed),
    });
  }

  return map;
}

export function applyBannerDates(banner, dateMap) {
  if (!banner || !dateMap) return banner;

  const match = dateMap.get(Number(banner.id));
  if (!match) return banner;

  return {
    ...banner,
    start_date: match.start,
    end_date: match.end ?? banner.end_date,
    is_global_mapped: true,
    is_confirmed: match.is_confirmed,
  };
}

export function applyBannerDatesToList(banners, dateMap) {
  if (!Array.isArray(banners)) return banners;
  return banners.map((banner) => applyBannerDates(banner, dateMap));
}
