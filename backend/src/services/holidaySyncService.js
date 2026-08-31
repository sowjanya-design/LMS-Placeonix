const Announcement = require('../models/Announcement');
const User = require('../models/User');
const logger = require('../utils/logger');
const { getIndiaHolidays } = require('../data/indiaHolidays');

/**
 * Auto-populates public holidays as 'holiday'-type Announcements, so nobody
 * has to manually create one for every Diwali/Republic Day/etc. every year.
 *
 * Idempotent: for each holiday date, only creates an announcement if no
 * system holiday announcement already exists for that exact date — safe to
 * call on every server start and from a daily cron without creating
 * duplicates. If an admin deletes a wrongly-dated holiday, this WILL
 * recreate it on the next run (there is no separate "suppressed" list) —
 * an accepted tradeoff for "this should never need manual upkeep" over
 * letting admins silently blacklist a date.
 */
async function syncHolidayAnnouncements() {
  const currentYear = new Date().getFullYear();
  const holidays = [...getIndiaHolidays(currentYear), ...getIndiaHolidays(currentYear + 1)];
  if (holidays.length === 0) return { created: 0 };

  // Announcements require a createdBy user. Use any admin as the system
  // author — on a totally fresh DB (before seeding) there won't be one yet,
  // in which case skip for now; the next server restart (after seeding)
  // will pick it up.
  const systemAuthor = await User.findOne({ role: 'admin' }).select('_id').lean();
  if (!systemAuthor) {
    logger.warn('[holidaySync] No admin user found yet — skipping holiday auto-population until one exists');
    return { created: 0 };
  }

  const dates = holidays.map((h) => new Date(`${h.date}T00:00:00.000Z`));
  const existing = await Announcement.find({
    isSystemHoliday: true,
    publishAt: { $in: dates },
  })
    .select('publishAt')
    .lean();
  const existingDates = new Set(existing.map((a) => a.publishAt.toISOString().slice(0, 10)));

  const toCreate = holidays
    .filter((h) => !existingDates.has(h.date))
    .map((h) => ({
      title: `Holiday: ${h.name}`,
      body: `${h.name} — the institute will be closed. This entry was added automatically; no action needed.`,
      type: 'holiday',
      priority: 'normal',
      audience: { roles: ['admin', 'mentor', 'student'], isPublic: false },
      publishAt: new Date(`${h.date}T00:00:00.000Z`),
      isSystemHoliday: true,
      createdBy: systemAuthor._id,
    }));

  if (toCreate.length === 0) return { created: 0 };
  await Announcement.insertMany(toCreate);
  logger.info(`[holidaySync] Auto-created ${toCreate.length} holiday announcement(s)`);
  return { created: toCreate.length };
}

module.exports = { syncHolidayAnnouncements };
