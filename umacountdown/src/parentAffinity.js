// Matches uma.moe's database score with no target character selected.
// Sources: affinity-repository, inheritance-factors and races modules.
export function calculateParentAffinity(inheritance, affinity, raceMapping) {
  if (!inheritance) return null;
  const stored = inheritance.affinity_score;
  const fallback = stored != null && Number.isFinite(Number(stored))
    ? { total: Number(stored), stored: true }
    : null;
  if (!Array.isArray(affinity?.chars) || !Array.isArray(affinity?.aff2) ||
      !Array.isArray(raceMapping?.races)) return fallback;

  const index = new Map(affinity.chars.map((id, i) => [Number(id), i]));
  const character = (id) => {
    const value = Number(id);
    return value >= 10000 ? Math.floor(value / 100) : value;
  };
  const main = character(inheritance.main_parent_id ?? inheritance.card_id);
  const left = character(inheritance.parent_left_id);
  const right = character(inheritance.parent_right_id);
  // Missing characters or wins are unknown, rather than zero affinity.
  if (![main, left, right].every((id) => index.has(id))) return fallback;
  const wins = [inheritance.main_win_saddles, inheritance.left_win_saddles,
    inheritance.right_win_saddles];
  if (!wins.every(Array.isArray)) return fallback;

  const groups = new Map();
  for (const race of raceMapping.races) {
    for (const saddle of race.win_saddles ?? []) {
      if ((saddle.win_saddle_type === 3 ||
          saddle.win_saddle_type_label?.toUpperCase() === "G1") &&
          Number.isFinite(saddle.group_id)) {
        groups.set(Number(saddle.saddle_id), saddle.group_id);
      }
    }
  }
  const groupSets = wins.map((ids) => new Set(ids.map((id) => groups.get(Number(id)))
    .filter((id) => id != null)));
  const pair = (id) => affinity.aff2[index.get(main) * affinity.chars.length + index.get(id)];
  const baseLeft = pair(left);
  const baseRight = pair(right);
  if (![baseLeft, baseRight].every(Number.isFinite)) return fallback;
  const overlap = (other) => [...groupSets[0]].filter((id) => other.has(id)).length * 3;
  const raceLeft = overlap(groupSets[1]);
  const raceRight = overlap(groupSets[2]);
  const base = baseLeft + baseRight;
  const race = raceLeft + raceRight;
  return { total: base + race, base, race,
    left: baseLeft + raceLeft, right: baseRight + raceRight, stored: false };
}
