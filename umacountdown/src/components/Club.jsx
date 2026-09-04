import { useEffect, useState } from "react";
import { circleListItems, estimateCombinedRank } from "../clubRank";
import "./Club.css";

const CIRCLE_IDS = [619284325, 676001972, 702265397, 868091297];

const SAME_PERSON_ALIASES = [
  ["AntWolf", "LiliWeiss", "Scarlet Shadow", "Red Hood"],
];

function normalizeTrainerName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function betterEarner(a, b) {
  if (a.monthlyGain !== b.monthlyGain) return a.monthlyGain > b.monthlyGain;
  return a.latestFans > b.latestFans;
}

function collapseSamePeople(members) {
  const groupByName = new Map();
  SAME_PERSON_ALIASES.forEach((names, groupId) => {
    for (const name of names) {
      groupByName.set(normalizeTrainerName(name), groupId);
    }
  });

  const bestByGroup = new Map();
  const unique = [];
  for (const member of members) {
    const groupId = groupByName.get(normalizeTrainerName(member.name));
    if (groupId == null) {
      unique.push(member);
      continue;
    }
    const current = bestByGroup.get(groupId);
    if (!current || betterEarner(member, current)) {
      bestByGroup.set(groupId, member);
    }
  }
  return [...unique, ...bestByGroup.values()];
}

function fanStats(rawFans) {
  const fans = Array.isArray(rawFans)
    ? rawFans.filter((n) => typeof n === "number")
    : [];
  const lastPositiveIdx = fans.reduce((idx, n, i) => (n > 0 ? i : idx), -1);
  if (lastPositiveIdx < 0) {
    return { monthlyGain: 0, latestFans: 0 };
  }

  const trimmed = fans.slice(0, lastPositiveIdx + 1);
  let lastNegativeIdx = -1;
  let negativeCount = 0;
  for (let i = 0; i < trimmed.length; i += 1) {
    if (trimmed[i] < 0) {
      lastNegativeIdx = i;
      negativeCount += 1;
    }
  }

  let dailyFans;
  if (lastNegativeIdx < 0) {
    const firstPositiveIdx = trimmed.findIndex((n) => n > 0);
    const start = firstPositiveIdx > 0 ? firstPositiveIdx : 0;
    let prev = trimmed[start];
    dailyFans = trimmed.slice(start).map((n) => {
      const v = n > 0 ? n : prev;
      prev = v;
      return v;
    });
  } else if (negativeCount === 1 && lastNegativeIdx === 0) {
    const baseline = Math.abs(trimmed[0]);
    let prev = baseline;
    dailyFans = [
      baseline,
      ...trimmed.slice(1).map((n) => {
        const v = n > 0 ? n : prev;
        prev = v;
        return v;
      }),
    ];
  } else {
    const baseline = Math.abs(trimmed[lastNegativeIdx]);
    let prev = baseline;
    dailyFans = [
      baseline,
      ...trimmed.slice(lastNegativeIdx + 1).map((n) => {
        const v = n > 0 ? n : prev;
        prev = v;
        return v;
      }),
    ];
  }

  if (!dailyFans.length) return { monthlyGain: 0, latestFans: 0 };
  const firstFans = dailyFans[0] ?? 0;
  const latestFans = dailyFans[dailyFans.length - 1] ?? firstFans;
  return { monthlyGain: latestFans - firstFans, latestFans };
}

function formatFans(value) {
  return Math.max(0, Math.round(Number(value) || 0)).toLocaleString();
}

async function fetchCircleListPage(page) {
  const res = await fetch(
    `/api/v4/circles/list?page=${page}&limit=100&sort_by=rank&sort_dir=asc`
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error || `Circle list failed (${res.status})`);
  }
  return circleListItems(body);
}

function rankNeighbors(estimated) {
  if (estimated.above && estimated.below) {
    return `, between ${estimated.above.name} and ${estimated.below.name}`;
  }
  if (estimated.below) {
    return `, ahead of ${estimated.below.name}`;
  }
  if (estimated.above) {
    return `, behind ${estimated.above.name}`;
  }
  return "";
}

async function loadCombinedRank(monthlyFans) {
  const ladder = [];
  try {
    for (let page = 0; page < 5; page += 1) {
      const items = await fetchCircleListPage(page);
      if (!items.length) break;
      ladder.push(...items);
      const lastPoints = Number(items[items.length - 1]?.monthly_point) || 0;
      if (lastPoints <= monthlyFans) break;
    }
    return estimateCombinedRank(monthlyFans, ladder, CIRCLE_IDS);
  } catch {
    return null;
  }
}

export default function Club() {
  const [rows, setRows] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [combined, setCombined] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const responses = await Promise.all(
          CIRCLE_IDS.map((id) =>
            fetch(`/api/v4/circles?circle_id=${id}`).then(async (res) => {
              const body = await res.json().catch(() => ({}));
              if (!res.ok) {
                throw new Error(body.error || `Circle ${id} failed (${res.status})`);
              }
              return body;
            })
          )
        );

        const seen = new Set();
        const members = [];
        for (const data of responses) {
          const clubName = data.circle?.name || "Club";
          for (const member of data.members || []) {
            const viewerId = member.viewer_id;
            if (viewerId == null || seen.has(viewerId)) continue;
            seen.add(viewerId);
            const stats = fanStats(member.daily_fans);
            members.push({
              viewerId,
              name: member.trainer_name || `Trainer ${viewerId}`,
              clubName,
              monthlyGain: stats.monthlyGain,
              latestFans: stats.latestFans,
            });
          }
        }

        const ranked = collapseSamePeople(members).sort(
          (a, b) => b.monthlyGain - a.monthlyGain || b.latestFans - a.latestFans
        );
        const top = ranked.slice(0, 30);
        const repsByClub = new Map();
        for (const row of top) {
          repsByClub.set(row.clubName, (repsByClub.get(row.clubName) || 0) + 1);
        }

        const clubSummaries = responses.map((data) => {
          const name = data.circle?.name || "Club";
          return {
            id: data.circle?.circle_id,
            name,
            representatives: repsByClub.get(name) || 0,
          };
        });

        const monthlyFans = responses.reduce(
          (sum, data) => sum + (Number(data.circle?.monthly_point) || 0),
          0
        );
        const liveFans = responses.reduce(
          (sum, data) => sum + (Number(data.circle?.live_points) || 0),
          0
        );
        const bestClub = responses.reduce((best, data) => {
          const rank = Number(data.circle?.monthly_rank);
          if (!Number.isFinite(rank)) return best;
          if (!best || rank < best.rank) {
            return { rank, name: data.circle?.name || "Club" };
          }
          return best;
        }, null);
        const estimated = await loadCombinedRank(monthlyFans);

        if (!cancelled) {
          setClubs(clubSummaries);
          setRows(top);
          setCombined({ monthlyFans, liveFans, bestClub, estimated });
          setError("");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load club fans");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="Club-page">
      <div className="Club-wrap">
        <h1>Exile All Stars</h1>
        <p className="Club-lead">
          Top 30 monthly fan earners across the four clubs.
        </p>

        {combined ? (
          <div className="Club-combined">
            <strong>If Exile All Stars were one club</strong>
            <p>
              Combined monthly fans: <b>{formatFans(combined.monthlyFans)}</b>
              {" · "}
              Live fans: <b>{formatFans(combined.liveFans)}</b>
            </p>
            <p>
              {combined.estimated?.complete
                ? `Estimated monthly rank: #${combined.estimated.rank}${rankNeighbors(combined.estimated)}.`
                : combined.estimated
                  ? `Estimated monthly rank: at least #${combined.estimated.rank} (compared the top ${combined.estimated.compared} clubs; all still have more fans).`
                  : combined.bestClub
                    ? `That total is higher than ${combined.bestClub.name} (#${combined.bestClub.rank}), so the combined club would rank better than #${combined.bestClub.rank}.`
                    : "Combined monthly fans from all four clubs."}
            </p>
          </div>
        ) : null}

        {clubs.length ? (
          <ul className="Club-list">
            {clubs.map((club) => (
              <li key={club.id}>
                <strong>{club.name}</strong>
                <span>
                  {club.representatives} representative{club.representatives === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {loading ? <p className="Club-status">Loading club fans…</p> : null}
        {error ? <p className="Club-status Club-status--error">{error}</p> : null}

        {!loading && !error && rows.length === 0 ? (
          <p className="Club-status">No member fan data yet.</p>
        ) : null}

        {rows.length ? (
          <div className="Club-table-wrap">
            <table className="Club-table">
              <thead>
                <tr>
                  <th className="Club-rank">#</th>
                  <th>Trainer</th>
                  <th>Club</th>
                  <th className="Club-num">Monthly fans</th>
                  <th className="Club-num">Total fans</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.viewerId} className={index < 3 ? `Club-top Club-top--${index + 1}` : undefined}>
                    <td className="Club-rank">{index + 1}</td>
                    <td>{row.name}</td>
                    <td>{row.clubName}</td>
                    <td className="Club-num">{formatFans(row.monthlyGain)}</td>
                    <td className="Club-num">{formatFans(row.latestFans)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
