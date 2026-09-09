import './GuideNpc.css';

/*
 * Pixel-art villager head, drawn as an inline SVG so it works offline and
 * scales crisply. Each character below is one "pixel".
 */
const PALETTE = {
  H: '#4a2f22', // hair / unibrow
  S: '#c4906a', // skin
  s: '#ab7a58', // skin shade
  W: '#f2f2f2', // eye white
  E: '#3d9a46', // iris
  N: '#a86f4f', // nose
  n: '#8f5a3f', // nose shade
  R: '#6b4a34', // robe collar
  r: '#553a28'  // robe shade
};

const ROWS = [
  '.HHHHHHHH.',
  'HSSSSSSSSH',
  'HSSSSSSSSH',
  'SHHHHHHHHS',
  'SWESSSSEWS',
  'SSSSNNSSSS',
  'SSSSNNSSSS',
  'SSSsNNsSSS',
  'SSSsnnsSSS',
  'SSSS..SSSS', // mouth row — drawn separately so it can animate
  'sSSSSSSSSs',
  'RRRrRRrRRR'
];

const W = ROWS[0].length;
const H = ROWS.length;

const PIXELS = [];
ROWS.forEach((row, y) => {
  [...row].forEach((ch, x) => {
    const fill = PALETTE[ch];
    if (fill) PIXELS.push({ x, y, fill });
  });
});

export default function GuideNpc({ talking = false, size = 64, className = '' }) {
  return (
    <div
      className={`guide-npc${talking ? ' talking' : ''} ${className}`.trim()}
      style={{ '--npc-size': `${size}px` }}
      data-testid="guide-npc"
      aria-hidden="true"
    >
      <svg
        className="guide-npc-svg"
        viewBox={`0 0 ${W} ${H}`}
        shapeRendering="crispEdges"
        xmlns="http://www.w3.org/2000/svg"
      >
        {PIXELS.map((p) => (
          <rect key={`${p.x}-${p.y}`} x={p.x} y={p.y} width="1.02" height="1.02" fill={p.fill} />
        ))}
        {/* mouth — closed (thin) and open (tall) variants toggled by CSS */}
        <rect className="guide-npc-mouth guide-npc-mouth--closed" x="4" y="9" width="2.02" height="1.02" fill="#5c3626" />
        <rect className="guide-npc-mouth guide-npc-mouth--open" x="4" y="9" width="2.02" height="1.02" fill="#3b2016" />
      </svg>
      <span className="guide-npc-shadow" />
    </div>
  );
}
