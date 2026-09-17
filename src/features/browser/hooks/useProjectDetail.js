import { useEffect, useState } from 'react';
import { getProject, getVersions } from '../api/modrinthApi.js';

/**
 * Loads the full project record and its version list once a search hit is
 * opened. The caller keeps rendering the search-hit data until (and if)
 * richer data arrives — Modrinth failures never crash the detail view.
 */
export default function useProjectDetail(project, { versionLimit = 12 } = {}) {
  const [data, setData] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);

  const projectId = project?.project_id || null;

  useEffect(() => {
    setData(null);
    setVersions([]);
    if (!projectId) return undefined;

    let cancelled = false;
    setLoading(true);

    Promise.all([getProject(projectId), getVersions(projectId)])
      .then(([record, list]) => {
        if (cancelled) return;
        if (record) setData(record);
        setVersions(versionLimit ? list.slice(0, versionLimit) : list);
      })
      .catch(() => {
        /* the view falls back to the search hit data */
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectId, versionLimit]);

  return { data, versions, loading };
}
