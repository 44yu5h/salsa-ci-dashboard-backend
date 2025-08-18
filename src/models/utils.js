import salsaApi from '../config/salsa.js';

// Duration utilities for stats controllers
export const ALLOWED_DURATIONS = ['24h', '7d', '30d', '6m', '1y'];
export const isValidDuration = (duration) =>
  ALLOWED_DURATIONS.includes(duration);

export const getPeriodForDuration = (duration, now = new Date()) => {
  const endDate = new Date(now);
  const startDate = new Date(now);

  // Temporarily adjust endDate to exclude the current hour or day and shift startDate accordingly
  // This is because we insert stats for those at the end of the period (EOD/EOHour)
  // Permanent fix would be to fetch stats for the current period in realtime,
  // which is not yet implemented due to limitations of the free plan.
  if (duration === '24h') {
    endDate.setHours(endDate.getHours() - 1);
    startDate.setHours(startDate.getHours() - 1);
  } else {
    endDate.setDate(endDate.getDate() - 1);
    startDate.setDate(startDate.getDate() - 1);
  }

  switch (duration) {
    case '24h':
      startDate.setHours(startDate.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '6m':
      startDate.setMonth(startDate.getMonth() - 6);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
      break;
  }
  return { startDate, endDate, isHourly: duration === '24h' };
};

// Build full x timeline (no gaps) for hourly or daily data.
// (start, end] - start exclusive, end is inclusive
export const startOfHour = (d) => {
  const x = new Date(d);
  x.setMinutes(0, 0, 0);
  return x;
};
export const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
export const buildTimeBuckets = (startDate, endDate, isHourly) => {
  const end = isHourly ? startOfHour(endDate) : startOfDay(endDate);
  const start = isHourly ? startOfHour(startDate) : startOfDay(startDate);

  const buckets = [];
  const cur = new Date(start);
  // Shift by one unit so we get exactly 24 points for 24h and 7/30/etc for days
  if (isHourly) {
    cur.setHours(cur.getHours() + 1);
    while (cur <= end) {
      buckets.push(new Date(cur));
      cur.setHours(cur.getHours() + 1);
    }
  } else {
    cur.setDate(cur.getDate() + 1);
    while (cur <= end) {
      buckets.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
  }
  return buckets;
};

// Return version (from latest tag) and maintainer (from debian/control)
export const getLatestVersionAndMaintainer = async (projectId) => {
  try {
    const { data } = await salsaApi.get(
      `/projects/${projectId}/repository/tags`
    );

    const tag = Array.isArray(data) && data.length > 0 ? data[0] : null;

    const version = tag?.name
      ? tag.name.includes('/')
        ? tag.name.split('/').pop()
        : tag.name
      : null;

    // fetch maintainer from debian/control on default branch
    const filePath = encodeURIComponent('debian/control');
    let maintainer = '';
    try {
      const { data: controlRaw } = await salsaApi.get(
        `/projects/${projectId}/repository/files/${filePath}/raw`
        // Do not specify the ref param to avoid 404s when debian/master does not exist
        // Fetch from the repo's default branch (mostly master, main or debian/master)
        // { params: { ref: 'debian/master' } }
      );
      const match = String(controlRaw).match(/^\s*Maintainer:\s*(.+)\s*$/im);
      maintainer = match ? match[1].trim() : '';
    } catch (e) {
      console.error(
        `Failed to fetch maintainer from debian/control for project #${projectId} :`,
        e?.response?.data || e.message
      );
    }

    return { version, maintainer };
  } catch (err) {
    console.error(
      `Failed to fetch tags for project ${projectId}:`,
      err?.response?.data || err.message
    );
    return { version: null, maintainer: '' };
  }
};
