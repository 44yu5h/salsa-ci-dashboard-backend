import salsaApi from '../config/salsa.js';

export const getMergedYamlForProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const params = { include_merged_yaml: 'true' };

    let response;
    try {
      response = await salsaApi.get(
        `/projects/${encodeURIComponent(projectId)}/ci/lint`,
        { params, timeout: 15000 }
      );
    } catch (err) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        return res.status(status).json({ message: 'Access denied - Salsa' });
      }
      throw err;
    }

    const data = response?.data || {};
    const mergedYaml = data?.merged_yaml || null;

    if (!mergedYaml) {
      if (Array.isArray(data?.errors) && data.errors.length) {
        return res.status(500).json({
          message: "Gitlab's CI lint reported error(s)",
          errors: data.errors,
        });
      }
      return res
        .status(404)
        .json({ message: 'Merged yaml not found for this project' });
    }

    return res.status(200).json({
      projectId,
      merged_yaml: mergedYaml,
    });
  } catch (err) {
    console.error(
      'Failed to fetch merged CI yaml:',
      err?.response?.data || err
    );
    const status = err?.response?.status || 500;
    const message =
      err?.response?.data?.message ||
      err?.response?.data?.error ||
      'Failed to fetch merged CI yaml';
    res.status(status).json({ message });
  }
};

export default {
  getMergedYamlForProject,
};
