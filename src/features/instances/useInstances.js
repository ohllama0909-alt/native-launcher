import { useEffect, useState } from 'react';
import { INITIAL_CLUSTERS, getClusterArt } from '../../data/versionsData.js';

const DEFAULT_DATA = {
  instances: INITIAL_CLUSTERS,
  selectedId: INITIAL_CLUSTERS[0].id
};

async function loadData() {
  if (window.native?.instances) {
    const saved = await window.native.instances.load();
    if (saved && saved.instances && saved.instances.length > 0) {
      // Ensure artwork and fields exist on each instance
      const instances = saved.instances.map((item) => ({
        ...item,
        art: item.art || getClusterArt(item)
      }));
      return {
        instances,
        selectedId: saved.selectedId || instances[0]?.id || null
      };
    }
    return DEFAULT_DATA;
  }
  const raw = localStorage.getItem('oneclient.instances');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.instances?.length) return parsed;
    } catch {}
  }
  return DEFAULT_DATA;
}

function saveData(data) {
  if (window.native?.instances) {
    return window.native.instances.save(data);
  } else {
    localStorage.setItem('oneclient.instances', JSON.stringify(data));
    return Promise.resolve();
  }
}

export default function useInstances() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadData()
      .then((saved) => {
        if (!cancelled) setData(saved);
      })
      .catch((err) => console.error('Could not load instances:', err))
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveData(data).catch((err) => console.error('Could not save instances:', err));
  }, [data, loaded]);

  const selected =
    data.instances.find((i) => i.id === data.selectedId) ?? data.instances[0] ?? null;

  return {
    instances: data.instances,
    selected,
    selectedId: data.selectedId,
    loaded,

    select(id) {
      setData((current) => ({ ...current, selectedId: id }));
    },

    create(values) {
      const id = values.id || `cluster-${Date.now()}`;
      const instance = {
        id,
        mc_version: values.version || values.mc_version || '1.21.1',
        version: values.version || values.mc_version || '1.21.1',
        mc_loader: values.loader || values.mc_loader || 'Fabric',
        loader: values.loader || values.mc_loader || 'Fabric',
        name: values.name || `${values.version || '1.21.1'} ${values.loader || 'Fabric'}`,
        description: values.description || 'Custom Minecraft installation',
        tags: values.tags || ['Custom'],
        playtimeSecs: 0,
        sessionCount: 0,
        avgSessionSecs: 0,
        activeDays: 0,
        serverJoins: 0,
        created: Date.now(),
        lastPlayed: null,
        ...values,
        art: values.art || getClusterArt(values)
      };
      setData((current) => ({
        ...current,
        instances: [...current.instances, instance],
        selectedId: instance.id
      }));
      return instance;
    },

    add(instance) {
      const hydrated = {
        ...instance,
        art: instance.art || getClusterArt(instance)
      };
      setData((current) => ({
        ...current,
        instances: [...current.instances, hydrated],
        selectedId: hydrated.id
      }));
    },

    update(id, values) {
      setData((current) => ({
        ...current,
        instances: current.instances.map((i) => (i.id === id ? { ...i, ...values } : i))
      }));
    },

    recordSession(id, durationSeconds) {
      setData((current) => ({
        ...current,
        instances: current.instances.map((i) => {
          if (i.id !== id) return i;
          const prevPlaytime = i.playtimeSecs || 0;
          const prevSessions = i.sessionCount || 0;
          const newPlaytime = prevPlaytime + durationSeconds;
          const newSessions = prevSessions + 1;
          return {
            ...i,
            playtimeSecs: newPlaytime,
            sessionCount: newSessions,
            avgSessionSecs: Math.round(newPlaytime / newSessions),
            lastPlayed: Date.now()
          };
        })
      }));
    },

    remove(id) {
      setData((current) => {
        const instances = current.instances.filter((i) => i.id !== id);
        return {
          ...current,
          instances,
          selectedId: current.selectedId === id ? instances[0]?.id ?? null : current.selectedId
        };
      });
    }
  };
}
