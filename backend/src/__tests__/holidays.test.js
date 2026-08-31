process.env.JWT_SECRET = 'test-jwt-secret-key-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-characters-long';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clear } = require('./setup');
const { createUserAndLogin, auth } = require('./testHelpers');
const Announcement = require('../models/Announcement');
const { syncHolidayAnnouncements } = require('../services/holidaySyncService');
const { getIndiaHolidays } = require('../data/indiaHolidays');

describe('Holiday auto-population', () => {
  beforeAll(connect);
  afterAll(disconnect);
  afterEach(clear);

  it('does nothing when no admin user exists yet (fresh DB)', async () => {
    const result = await syncHolidayAnnouncements();
    expect(result.created).toBe(0);
    expect(await Announcement.countDocuments()).toBe(0);
  });

  it('creates a holiday announcement for every curated holiday, once an admin exists', async () => {
    await createUserAndLogin({ role: 'admin' });
    const result = await syncHolidayAnnouncements();

    const currentYear = new Date().getFullYear();
    const expectedCount = getIndiaHolidays(currentYear).length + getIndiaHolidays(currentYear + 1).length;
    expect(result.created).toBe(expectedCount);

    const count = await Announcement.countDocuments({ isSystemHoliday: true, type: 'holiday' });
    expect(count).toBe(expectedCount);
  });

  it('is idempotent — running it again creates no duplicates', async () => {
    await createUserAndLogin({ role: 'admin' });
    await syncHolidayAnnouncements();
    const before = await Announcement.countDocuments();

    const second = await syncHolidayAnnouncements();
    expect(second.created).toBe(0);
    expect(await Announcement.countDocuments()).toBe(before);
  });

  it('lists a future-dated holiday even though its publishAt is in the future', async () => {
    // Regression: GET /announcements normally hides anything with
    // publishAt in the future (an embargo mechanism). Holiday announcements
    // repurpose publishAt as the holiday's own date, so a Diwali entry
    // three months out must still be visible today, or the Calendar page
    // would never show any upcoming holiday.
    const { token } = await createUserAndLogin({ role: 'student' });
    await createUserAndLogin({ role: 'admin' });
    await syncHolidayAnnouncements();

    const res = await request(app).get('/api/v1/announcements?type=holiday&limit=100').set(auth(token));
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    const now = new Date();
    const hasFutureHoliday = res.body.data.some((a) => new Date(a.publishAt) > now);
    expect(hasFutureHoliday).toBe(true);
  });
});
