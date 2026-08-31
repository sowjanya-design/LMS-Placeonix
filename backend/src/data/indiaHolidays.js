// India public holidays — used to auto-populate the Calendar and Announcements
// so nobody has to manually create a "holiday" announcement every year.
//
// Two tiers:
//  - FIXED_HOLIDAYS: same calendar date every year (Republic Day, Independence
//    Day, etc.) — computed for ANY year, so this never goes stale.
//  - MOVABLE_HOLIDAYS_BY_YEAR: lunar/Islamic-calendar festivals (Diwali, Holi,
//    Eid, ...) whose date shifts year to year. These have to be looked up and
//    added per year — curated for 2025-2027 below from published government/
//    almanac sources. Islamic dates in particular are subject to moon-sighting
//    and can move by a day either way; treat these as best-effort, not
//    gospel, and confirm against the official gazette before relying on them
//    for a real institute's attendance policy.
//
// A year with no curated movable-holiday entry still gets all the fixed
// holidays automatically — it just won't have Diwali/Holi/Eid until someone
// extends MOVABLE_HOLIDAYS_BY_YEAR for that year.

const FIXED_HOLIDAYS = [
  { month: 1, day: 1, name: "New Year's Day" },
  { month: 1, day: 26, name: 'Republic Day' },
  { month: 4, day: 14, name: 'Ambedkar Jayanti' },
  { month: 5, day: 1, name: 'Labour Day' },
  { month: 8, day: 15, name: 'Independence Day' },
  { month: 10, day: 2, name: 'Gandhi Jayanti' },
  { month: 12, day: 25, name: 'Christmas' },
];

// prettier-ignore
const MOVABLE_HOLIDAYS_BY_YEAR = {
  2025: [
    { month: 3, day: 14, name: 'Holi' },
    { month: 3, day: 31, name: 'Id-ul-Fitr' },
    { month: 4, day: 6, name: 'Ram Navami' },
    { month: 4, day: 18, name: 'Good Friday' },
    { month: 6, day: 7, name: 'Bakrid (Eid-ul-Zuha)' },
    { month: 7, day: 6, name: 'Muharram' },
    { month: 8, day: 16, name: 'Janmashtami' },
    { month: 10, day: 2, name: 'Dussehra' }, // coincides with Gandhi Jayanti in 2025
    { month: 10, day: 20, name: 'Diwali' },
    { month: 11, day: 5, name: 'Guru Nanak Jayanti' },
  ],
  2026: [
    { month: 2, day: 15, name: 'Maha Shivratri' },
    { month: 3, day: 4, name: 'Holi' },
    { month: 3, day: 21, name: 'Id-ul-Fitr' },
    { month: 3, day: 26, name: 'Ram Navami' },
    { month: 4, day: 3, name: 'Good Friday' },
    { month: 5, day: 27, name: 'Bakrid (Eid-ul-Zuha)' },
    { month: 6, day: 26, name: 'Muharram' },
    { month: 9, day: 4, name: 'Janmashtami' },
    { month: 10, day: 20, name: 'Dussehra' },
    { month: 11, day: 8, name: 'Diwali' },
    { month: 11, day: 24, name: 'Guru Nanak Jayanti' },
  ],
  2027: [
    { month: 3, day: 5, name: 'Holika Dahan' },
    { month: 3, day: 13, name: 'Id-ul-Fitr' },
    { month: 3, day: 15, name: 'Ram Navami' },
    { month: 3, day: 26, name: 'Good Friday' },
    { month: 5, day: 17, name: 'Bakrid (Eid-ul-Zuha)' },
    { month: 6, day: 16, name: 'Muharram' },
    { month: 8, day: 25, name: 'Janmashtami' },
    { month: 10, day: 9, name: 'Dussehra' },
    { month: 10, day: 29, name: 'Diwali' },
    { month: 11, day: 14, name: 'Guru Nanak Jayanti' },
  ],
};

function pad(n) {
  return String(n).padStart(2, '0');
}

/**
 * Returns this year's India holiday list as
 * [{ date: 'YYYY-MM-DD', name }], sorted chronologically.
 * Always includes the fixed set; includes the movable set only for years
 * curated in MOVABLE_HOLIDAYS_BY_YEAR above.
 */
function getIndiaHolidays(year) {
  const y = Number(year) || new Date().getFullYear();
  const entries = [...FIXED_HOLIDAYS, ...(MOVABLE_HOLIDAYS_BY_YEAR[y] || [])];
  return entries
    .map((h) => ({ date: `${y}-${pad(h.month)}-${pad(h.day)}`, name: h.name }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

module.exports = { getIndiaHolidays, FIXED_HOLIDAYS, MOVABLE_HOLIDAYS_BY_YEAR };
