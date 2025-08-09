import salsaApi from '../config/salsa.js';

// Return version and maintainer from the latest tag
export const getLatestVersionAndMaintainer = async (projectId) => {
  try {
    const { data } = await salsaApi.get(
      `/projects/${projectId}/repository/tags`
    );

    const tag = Array.isArray(data) && data.length > 0 ? data[0] : null;
    if (!tag) return { version: null, maintainer: '' };

    const version = tag.name
      ? tag.name.includes('/')
        ? tag.name.split('/').pop()
        : tag.name
      : null;

    // Assuming maintainer is the one who committed the tag
    const authorName =
      tag?.commit?.author_name || tag?.commit?.committer_name || '';
    const authorEmail =
      tag?.commit?.author_email || tag?.commit?.committer_email || '';
    const maintainer = authorName
      ? authorEmail
        ? `${authorName} <${authorEmail}>`
        : authorName
      : '';

    return { version, maintainer };
  } catch (err) {
    console.error(
      `Failed to fetch tags for project ${projectId}:`,
      err?.response?.data || err.message
    );
    return { version: null, maintainer: '' };
  }
};
