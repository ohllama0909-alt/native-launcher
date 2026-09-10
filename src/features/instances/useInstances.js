import { useEffect, useState } from 'react';
import { INITIAL_CLUSTERS, getClusterArt } from '../../data/versionsData.js';

const STORAGE_KEY = 'native.instances';
const LEGACY_STORAGE_KEY = 'oneclient.instances';

const DEFAULT_DATA = {
  instances: INITIAL_CLUSTERS,
  selectedId: INITIAL_CLUSTERS[0].id
};

function newInstanceId() {
  // Date.now() alone collided when two instances were created in the same ms
  // (e.g. importing a modpack), which silently broke selection.
  return `native-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function hydrate(instance) {
  // Always pass saved artwork through the resolver. It replaces stale Vite
  // file URLs from another build while retaining valid custom HTTP artwork.
  return { ...instance, art: getClusterArt(instance) };
}

async function loadData() {
  if (window.native?.instances) {
    const saved = await window.native.instances.load();
    if (saved?.instances?.length) {
      const instances = saved.instances.map(hydrate);
      return {
        instances,
        selectedId: saved.selectedId || instances[0]?.id || null
      };
    }
    return DEFAULT_DATA;
  }

  // Browser / dev fallback. Migrate the pre-rebrand key if it's still around.
  for (const key of [STORAGE_KEY, LEGACY_STORAGE_KEY]) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.instances?.length) {
        const migrated = { ...parsed, instances: parsed.instances.map(hydrate) };
        if (key === LEGACY_STORAGE_KEY) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
        return migrated;
      }
    } catch {
      /* corrupt payload, fall through */
    }
  }

  return DEFAULT_DATA;
}

function saveData(data) {
  if (window.native?.instances) {
    return window.native.instances.save(data);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return Promise.resolve();
}

/** Drop undefined keys so partial form values can't clobber computed fields. */
function compact(values) {
  const result = {};
  Object.entries(values || {}).forEach(([key, value]) => {
    if (value !== undefined) result[key] = value;
  });
  return result;
}

function buildInstance(values) {
  const input = compact(values);
  const version = input.version || input.mc_version || '1.21.1';
  const loader = input.loader || input.mc_loader || 'Fabric';
  const name = String(input.name || '').trim() || `${version} ${loader}`;

  const instance = {
    ...input,
    id: input.id || newInstanceId(),
    name,
    version,
    mc_version: version,
    loader,
    mc_loader: loader,
    description: input.description || 'Custom Minecraft installation',
    tags: input.tags?.length ? input.tags : ['Custom'],
    group: input.group || null,
    icon: input.icon || null,
    memoryMb: input.memoryMb || null,
    playtimeSecs: input.playtimeSecs || 0,
    sessionCount: input.sessionCount || 0,
    avgSessionSecs: input.avgSessionSecs || 0,
    activeDays: input.activeDays || 0,
    serverJoins: input.serverJoins || 0,
    created: input.created || Date.now(),
    lastPlayed: input.lastPlayed ?? null
  };

  instance.art = input.art || getClusterArt(instance);
  return instance;
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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveData(data).catch((err) => console.error('Could not save instances:', err));
  }, [data, loaded]);

  const selected =
    data.instances.find((item) => item.id === data.selectedId) ?? data.instances[0] ?? null;

  return {
    instances: data.instances,
    selected,
    selectedId: data.selectedId,
    loaded,

    select(id) {
      setData((current) => ({ ...current, selectedId: id }));
    },

    create(values) {
      const instance = buildInstance(values);
      setData((current) => ({
        ...current,
        instances: [...current.instances, instance],
        selectedId: instance.id
      }));
      return instance;
    },

    add(instance) {
      const hydrated = hydrate(instance);
      setData((current) => ({
        ...current,
        instances: [...current.instances, hydrated],
        selectedId: hydrated.id
      }));
      return hydrated;
    },

    duplicate(id) {
      const source = data.instances.find((item) => item.id === id);
      if (!source) return null;
      const copy = buildInstance({
        ...source,
        id: newInstanceId(),
        name: `${source.name} (copy)`,
        playtimeSecs: 0,
        sessionCount: 0,
        avgSessionSecs: 0,
        activeDays: 0,
        serverJoins: 0,
        created: Date.now(),
        lastPlayed: null
      });
      setData((current) => ({
        ...current,
        instances: [...current.instances, copy],
        selectedId: copy.id
      }));
      return copy;
    },

    update(id, values) {
      setData((current) => ({
        ...current,
        instances: current.instances.map((item) => {
          if (item.id !== id) return item;
          const merged = { ...item, ...compact(values) };
          // Keep the paired version/loader fields in sync.
          if (values?.version) merged.mc_version = values.version;
          if (values?.mc_version) merged.version = values.mc_version;
          if (values?.loader) merged.mc_loader = values.loader;
          if (values?.mc_loader) merged.loader = values.mc_loader;
          return merged;
        })
      }));
    },

    recordSession(id, durationSeconds) {
      setData((current) => ({
        ...current,
        instances: current.instances.map((item) => {
          if (item.id !== id) return item;
          const playtime = (item.playtimeSecs || 0) + durationSeconds;
          const sessions = (item.sessionCount || 0) + 1;
          return {
            ...item,
            playtimeSecs: playtime,
            sessionCount: sessions,
            avgSessionSecs: Math.round(playtime / sessions),
            lastPlayed: Date.now()
          };
        })
      }));
    },

    remove(id) {
      setData((current) => {
        const instances = current.instances.filter((item) => item.id !== id);
        return {
          ...current,
          instances,
          selectedId:
            current.selectedId === id ? instances[0]?.id ?? null : current.selectedId
        };
      });
    }
  };
}
