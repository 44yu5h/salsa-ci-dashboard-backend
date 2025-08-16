import salsaApi from '../config/salsa.js';

// Duration utilities for stats controllers
export const ALLOWED_DURATIONS = ['24h', '7d', '30d', '6m', '1y'];
export const isValidDuration = (duration) =>
  ALLOWED_DURATIONS.includes(duration);

export const getPeriodForDuration = (duration, now = new Date()) => {
  const endDate = new Date(now);
  const startDate = new Date(now);
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
