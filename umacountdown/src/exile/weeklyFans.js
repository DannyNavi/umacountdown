const DAY_MS = 24 * 60 * 60 * 1000;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function quotaWeek(now = Date.now()) {
  // Store JST calendar dates at UTC midnight for date arithmetic and formatting.
  const today = Math.floor((now + JST_OFFSET_MS) / DAY_MS) * DAY_MS;
  // The Exiles report uses Monday's snapshot to close the week and switches on Tuesday.
  const yesterday = new Date(today - DAY_MS);
  const daysSinceMonday = (yesterday.getUTCDay() + 6) % 7;
  const start = yesterday.getTime() - daysSinceMonday * DAY_MS;
  const end = start + 7 * DAY_MS;
  return {
    today,
    start,
    end,
    resetAt: end + DAY_MS - JST_OFFSET_MS,
    // The competition month and its daily slots start on the 2nd in JST.
    currentMonth: new Date(today - DAY_MS),
    baselineMonth: new Date(start - DAY_MS),
  };
}

function fanDate(member, slot) {
  // Slot 0 is the opening baseline. Slot 1 is the in-progress total for the 2nd JST.
  return Date.UTC(member.year, member.month - 1, slot + 1);
}

export function latestFanSnapshot(member, today) {
  const totals = member.daily_fans ?? [];
  for (let slot = totals.length - 1; slot >= 0; slot -= 1) {
    const date = fanDate(member, slot);
    if (totals[slot] > 0 && date <= today) return { date, fans: totals[slot] };
  }
  return null;
}

function baselineFans(member, date) {
  if (!member) return null;
  const slot = (date - fanDate(member, 0)) / DAY_MS;
  // A negative snapshot is a total recorded by a previous club.
  return Math.abs(member.daily_fans?.[slot]) || null;
}

export function weeklyFanProgress(member, previousMonthMember, clubName, week) {
  const latest = latestFanSnapshot(member, week.today);
  const baselineDate = week.start;
  const baseline = baselineFans(member, baselineDate)
    ?? baselineFans(previousMonthMember, baselineDate);
  if (!latest || baseline === null || latest.date < baselineDate || latest.fans < baseline) {
    return null;
  }

  const target = /dawn/i.test(clubName) ? 14_000_000 : 22_000_000;
  const earned = latest.fans - baseline;
  return { target, earned, remaining: Math.max(0, target - earned) };
}
