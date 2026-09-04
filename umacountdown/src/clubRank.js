export function circleListItems(body) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];
  if (Array.isArray(body.circles)) return body.circles;
  if (Array.isArray(body.list)) return body.list;
  if (Array.isArray(body.items)) return body.items;
  return [];
}

export function estimateCombinedRank(monthlyFans, ladder, excludeIds = []) {
  const excluded = new Set([...excludeIds].map(Number));
  const others = (ladder || [])
    .filter((club) => !excluded.has(Number(club.circle_id)))
    .map((club) => ({
      id: Number(club.circle_id),
      name: club.name || "Club",
      monthlyPoint: Number(club.monthly_point) || 0,
      monthlyRank: Number(club.monthly_rank) || null,
    }))
    .sort(
      (a, b) =>
        b.monthlyPoint - a.monthlyPoint ||
        (a.monthlyRank || 0) - (b.monthlyRank || 0)
    );

  const ahead = others.filter((club) => club.monthlyPoint > monthlyFans);
  const last = others[others.length - 1];
  const complete = others.length === 0 || (last && last.monthlyPoint <= monthlyFans);

  return {
    rank: ahead.length + 1,
    complete,
    compared: others.length,
    above: ahead[ahead.length - 1] || null,
    below: others[ahead.length] || null,
  };
}
