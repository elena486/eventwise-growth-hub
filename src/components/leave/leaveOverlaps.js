import { format, parseISO, addDays } from 'date-fns';

/**
 * Compute overlapping leave ranges where 2+ approved/confirmed people are out.
 * Returns an array of { startDate, endDate, people: [names], count } grouped
 * into maximal runs of consecutive days sharing the same set of people.
 *
 * Only Approved / Confirmed entries count toward overlaps (per spec).
 */
export function computeLeaveOverlaps(entries) {
  const approved = (entries || []).filter(
    e => (e.status === 'Approved' || e.status === 'Confirmed') && e.startDate && e.endDate && e.personName
  );

  // Build day -> Set<people>
  const dayPeople = new Map();
  for (const e of approved) {
    let d = new Date(e.startDate);
    const end = new Date(e.endDate);
    while (d <= end) {
      const key = format(d, 'yyyy-MM-dd');
      if (!dayPeople.has(key)) dayPeople.set(key, new Set());
      dayPeople.get(key).add(e.personName);
      d = addDays(d, 1);
    }
  }

  const sortedDays = [...dayPeople.keys()].sort();
  const runs = [];
  let run = null;

  for (const key of sortedDays) {
    const people = dayPeople.get(key);
    if (people.size >= 2) {
      const peopleKey = [...people].sort().join(',');
      const expectedPrev = run ? format(addDays(parseISO(run.endDate), 1), 'yyyy-MM-dd') : null;
      if (run && run.peopleKey === peopleKey && expectedPrev === key) {
        run.endDate = key;
      } else {
        if (run) runs.push(run);
        run = { startDate: key, endDate: key, people: [...people].sort(), peopleKey };
      }
    } else {
      if (run) runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);

  return runs.map(r => ({ ...r, count: r.people.length }));
}

/** Human-readable range label, e.g. "13 Aug" or "13–14 Aug". */
export function formatOverlapRange(start, end) {
  try {
    const s = parseISO(start);
    const e = parseISO(end);
    return start === end
      ? format(s, 'd MMM')
      : `${format(s, 'd')}–${format(e, 'd MMM')}`;
  } catch {
    return `${start} – ${end}`;
  }
}