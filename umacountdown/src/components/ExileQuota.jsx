import { useState } from "react";
import { EXILE_CIRCLE_IDS, fetchExileCircle } from "../exile/circles";
import { latestFanSnapshot, quotaWeek, weeklyFanProgress } from "../exile/weeklyFans";
import "./Club.css";
import "./ExileQuota.css";

const fans = new Intl.NumberFormat("en-US");
const dates = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

function matchingMembers(circles, username, week) {
  const matches = new Map();
  for (const { circle, members } of circles) {
    for (const member of members) {
      if (member.trainer_name?.trim().toLowerCase() !== username) continue;

      // A transfer can leave the same trainer in multiple monthly club histories.
      const snapshot = latestFanSnapshot(member, week.today);
      const existing = matches.get(member.viewer_id);
      const updated = Date.parse(member.last_updated) || 0;
      if (!existing || (snapshot?.date ?? 0) > (existing.snapshot?.date ?? 0)
        || (snapshot?.date === existing.snapshot?.date && updated > existing.updated)) {
        matches.set(member.viewer_id, { member, circle, snapshot, updated });
      }
    }
  }
  return [...matches.values()];
}

async function lookup(username, week) {
  const circles = await Promise.all(
    EXILE_CIRCLE_IDS.map((id) => fetchExileCircle(id, week.currentMonth))
  );
  const matches = matchingMembers(circles, username, week);
  const previousMonths = new Map();
  const results = await Promise.all(matches.map(async ({ member, circle }) => {
    let progress = weeklyFanProgress(member, null, circle.name, week);
    if (!progress && week.baselineMonth.getUTCMonth() !== week.currentMonth.getUTCMonth()) {
      if (!previousMonths.has(circle.circle_id)) {
        previousMonths.set(circle.circle_id, fetchExileCircle(circle.circle_id, week.baselineMonth));
      }
      const previous = await previousMonths.get(circle.circle_id);
      const previousMember = previous.members.find(({ viewer_id }) => viewer_id === member.viewer_id);
      progress = weeklyFanProgress(member, previousMember, circle.name, week);
    }
    return { member, club: circle.name, progress };
  }));
  return results;
}

export default function ExileQuota() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    const name = username.trim();
    if (!name || loading) return;

    const week = quotaWeek();
    setLoading(true);
    setResult(null);
    setError("");
    try {
      setResult({ name, week, matches: await lookup(name.toLowerCase(), week) });
    } catch {
      setError("Club fan data is temporarily unavailable. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="Club-page">
      <div className="Club-wrap ExileQuota-wrap">
        <h1>Exile Quota Check</h1>

        <form className="ExileQuota-form" onSubmit={handleSubmit}>
          <label htmlFor="exile-username">Trainer username</label>
          <div className="ExileQuota-fields">
            <input
              id="exile-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              required
            />
            <button type="submit" disabled={loading || !username.trim()}>Check quota</button>
          </div>
        </form>

        <div aria-live="polite">
          {loading && <p className="Club-status">Checking fan totals…</p>}
          {error && <p className="Club-status Club-status--error">{error}</p>}
          {result && (
            <>
              {result.matches.length === 0 ? (
                <p className="Club-status">No Exile member found with the username “{result.name}”.</p>
              ) : (
                <>
                  <p className="Club-lead">{dates.formatRange(result.week.start, result.week.end)} (JST)</p>
                  {result.matches.map(({ member, club, progress }) => (
                    <section key={member.viewer_id} className="Club-combined ExileQuota-result">
                      <h2>{member.trainer_name} · {club}</h2>
                      {result.matches.length > 1 && <p>Trainer ID {member.viewer_id}</p>}
                      {progress ? (
                        <>
                          <strong className="ExileQuota-remaining">
                            {progress.remaining > 0
                              ? `${fans.format(progress.remaining)} fans remaining`
                              : "Weekly quota met"}
                          </strong>
                          <p>{fans.format(progress.earned)} of {fans.format(progress.target)} fans earned this week</p>
                        </>
                      ) : (
                        <p>Weekly progress is unavailable because a fan snapshot is missing.</p>
                      )}
                    </section>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
