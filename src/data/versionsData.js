import ChaosCubedArt from '../assets/backgrounds/Chaos_Cubed.jpg';
import TinyTakeoverArt from '../assets/backgrounds/Tiny_Takeover.jpg';
import MountsMayhemArt from '../assets/backgrounds/Mounts_Mayhem.jpg';
import TrickyTrialsArt from '../assets/backgrounds/Tricky_Trials.jpg';
import CopperAgeArt from '../assets/backgrounds/Copper_Age.jpg';
import CavesAndCliffsArt from '../assets/backgrounds/CavesAndCliffs.jpg';

export const ART_ASSETS = {
  'Chaos_Cubed': ChaosCubedArt,
  'Tiny_Takeover': TinyTakeoverArt,
  'Mounts_Mayhem': MountsMayhemArt,
  'Tricky_Trials': TrickyTrialsArt,
  'Copper_Age': CopperAgeArt,
  'CavesAndCliffs': CavesAndCliffsArt,
  default: ChaosCubedArt
};

export const INITIAL_CLUSTERS = [
  {
    id: 'cluster-26-2-fabric',
    name: 'Chaos Cubed',
    version: '26.2',
    mc_version: '26.2',
    loader: 'Fabric',
    mc_loader: 'Fabric',
    artKey: 'Chaos_Cubed',
    art: ChaosCubedArt,
    description: "Minecraft's 26.x updates, starting with the release of \"Tiny Takeover\", primarily focuses on mob charm and quality-of-life improvements, overhauling textures and models for every baby mob that previously lacked a unique model. It also features the golden dandelion, nametag crafting, and other gameplay enhancements.",
    tags: ['PvP', 'SkyBlock', 'Survival'],
    playtimeSecs: 1620, // 27m
    sessionCount: 2,
    avgSessionSecs: 780, // 13m
    activeDays: 2,
    serverJoins: 2,
    created: Date.now() - 86400000 * 7,
    lastPlayed: Date.now() - 3600000 * 2
  },
  {
    id: 'cluster-26-1-2-fabric',
    name: 'Tiny Takeover',
    version: '26.1.2',
    mc_version: '26.1.2',
    loader: 'Fabric',
    mc_loader: 'Fabric',
    artKey: 'Tiny_Takeover',
    art: TinyTakeoverArt,
    description: "Minecraft's 26.x updates, starting with the release of \"Tiny Takeover\", primarily focuses on mob charm and quality-of-life improvements, overhauling textures and models for baby mobs.",
    tags: ['PvP', 'SkyBlock', 'Survival'],
    playtimeSecs: 900, // 15m
    sessionCount: 1,
    avgSessionSecs: 900,
    activeDays: 1,
    serverJoins: 1,
    created: Date.now() - 86400000 * 14,
    lastPlayed: Date.now() - 86400000 * 3
  },
  {
    id: 'cluster-1-21-11-fabric',
    name: 'Mounts of Mayhem',
    version: '1.21.11',
    mc_version: '1.21.11',
    loader: 'Fabric',
    mc_loader: 'Fabric',
    artKey: 'Mounts_Mayhem',
    art: MountsMayhemArt,
    description: "Rideable mob enhancements, trial chamber adventures, and expanded crafting mechanics for modern Minecraft.",
    tags: ['PvP', 'SkyBlock', 'Survival'],
    playtimeSecs: 3600, // 1h
    sessionCount: 3,
    avgSessionSecs: 1200,
    activeDays: 2,
    serverJoins: 4,
    created: Date.now() - 86400000 * 21,
    lastPlayed: Date.now() - 86400000 * 5
  },
  {
    id: 'cluster-1-21-1-fabric',
    name: 'Tricky Trials',
    version: '1.21.1',
    mc_version: '1.21.1',
    loader: 'Fabric',
    mc_loader: 'Fabric',
    artKey: 'Tricky_Trials',
    art: TrickyTrialsArt,
    description: "Minecraft's 1.21 update, known as \"Tricky Trials,\" primarily focuses on combat adventures and tinkering, introducing trial chambers, new copper block variants, a new crafting tool, and a new weapon.",
    tags: ['Tricky Trials', 'PvP', 'Survival'],
    playtimeSecs: 7200, // 2h
    sessionCount: 5,
    avgSessionSecs: 1440,
    activeDays: 4,
    serverJoins: 6,
    created: Date.now() - 86400000 * 30,
    lastPlayed: Date.now() - 86400000 * 6
  }
];

export const RELEASE_LINES = [
  {
    major: 26,
    name: 'Minecraft from 2026',
    artKey: 'Tiny_Takeover',
    art: TinyTakeoverArt,
    description: "Minecraft's 26.x updates, starting with the release of \"Tiny Takeover\", primarily focuses on mob charm and quality-of-life improvements, overhauling textures and models for every baby mob that previously lacked a unique model.",
    tags: ['Tiny Takeover', 'PvP', 'Survival'],
    versions: [
      { version: '26.2', name: 'Chaos Cubed', artKey: 'Chaos_Cubed', art: ChaosCubedArt, loader: 'Fabric' },
      { version: '26.1.2', name: 'Tiny Takeover', artKey: 'Tiny_Takeover', art: TinyTakeoverArt, loader: 'Fabric' }
    ]
  },
  {
    major: 21,
    name: 'Tricky Trials',
    artKey: 'Tricky_Trials',
    art: TrickyTrialsArt,
    description: "Minecraft's 1.21 update, known as \"Tricky Trials,\" primarily focuses on combat adventures and tinkering, introducing trial chambers, new copper block variants, and the mace.",
    tags: ['Tricky Trials', 'PvP', 'Survival'],
    versions: [
      { version: '1.21.11', name: 'Mounts of Mayhem', artKey: 'Mounts_Mayhem', art: MountsMayhemArt, loader: 'Fabric' },
      { version: '1.21.10', name: 'The Copper Age', artKey: 'Copper_Age', art: CopperAgeArt, loader: 'Fabric' },
      { version: '1.21.1', name: 'Tricky Trials', artKey: 'Tricky_Trials', art: TrickyTrialsArt, loader: 'Fabric' }
    ]
  },
  {
    major: 20,
    name: 'Trails & Tales',
    artKey: 'CavesAndCliffs',
    art: CavesAndCliffsArt,
    description: "Archaeology, sniffer mob, cherry groves, armor trims, and bamboo wood sets.",
    tags: ['Trails & Tales', 'Adventure'],
    versions: [
      { version: '1.20.1', name: 'Trails & Tales', artKey: 'CavesAndCliffs', art: CavesAndCliffsArt, loader: 'Fabric' }
    ]
  }
];

export function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
  }
  return `${minutes}m`;
}

export function getClusterArt(cluster) {
  if (!cluster) return ART_ASSETS.default;
  if (cluster.art) return cluster.art;
  if (cluster.artKey && ART_ASSETS[cluster.artKey]) return ART_ASSETS[cluster.artKey];
  if (cluster.version?.startsWith('26.2')) return ChaosCubedArt;
  if (cluster.version?.startsWith('26')) return TinyTakeoverArt;
  if (cluster.version?.startsWith('1.21.11')) return MountsMayhemArt;
  if (cluster.version?.startsWith('1.21.10')) return CopperAgeArt;
  if (cluster.version?.startsWith('1.21')) return TrickyTrialsArt;
  return CavesAndCliffsArt;
}
