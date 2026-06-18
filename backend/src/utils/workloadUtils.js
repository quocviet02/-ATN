/**
 * Returns the ISO week label "YYYY-Www" for a given date.
 */
function getWeekLabel(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay() || 7; // 1=Mon … 7=Sun
  d.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

/**
 * Returns the Monday (start) of the week containing `date`.
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Returns an array of week objects spanning from startDate to endDate.
 */
function getWeeksInRange(startDate, endDate) {
  const weeks = [];
  const cursor = getWeekStart(startDate);
  const end = new Date(endDate);

  while (cursor <= end) {
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weeks.push({
      weekStart: new Date(cursor),
      weekEnd:   new Date(weekEnd),
      weekLabel: getWeekLabel(cursor),
    });
    cursor.setDate(cursor.getDate() + 7);
  }
  return weeks;
}

/**
 * Distribute estimatedHours evenly across weeks that overlap with
 * [taskStart, taskEnd]. Returns a map: weekLabel → hours.
 */
function distributeHours(taskStart, taskEnd, estimatedHours) {
  if (!taskStart || !taskEnd || !estimatedHours) return {};
  const weeks = getWeeksInRange(taskStart, taskEnd);
  if (!weeks.length) return {};
  const hoursPerWeek = estimatedHours / weeks.length;
  const result = {};
  weeks.forEach(w => { result[w.weekLabel] = hoursPerWeek; });
  return result;
}

/**
 * Calculate burnout risk based on utilization percentage and consecutive overloaded weeks.
 */
function calcBurnoutRisk(utilization, consecutiveOverloadedWeeks = 0) {
  if (utilization > 120 || consecutiveOverloadedWeeks >= 4) return 'critical';
  if (utilization > 100 || consecutiveOverloadedWeeks >= 2) return 'high';
  if (utilization > 85  || consecutiveOverloadedWeeks >= 1) return 'medium';
  return 'low';
}

module.exports = { getWeekLabel, getWeekStart, getWeeksInRange, distributeHours, calcBurnoutRisk };
