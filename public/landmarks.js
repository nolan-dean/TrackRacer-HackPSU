// Shared by the server (spawns/destinations) and the controller (builds the 3D models).
// Put this file in /public. x,z = centre of a city block (blocks sit every 90 units, roads run between them).
// North = -z, west = -x.  Roads: College Ave z=-135, Calder Way z=-45, Beaver Ave z=45 / Allen St x=-45, Fraser St x=45.
const LANDMARKS = [
  // ---------------- campus (north) ----------------
  { name: 'Old Main',               x:    0, z: -180, type: 'oldmain' },
  { name: 'Paterno Library',        x:  -90, z: -180, type: 'library' },
  { name: 'HUB-Robeson Center',     x: -180, z: -180, type: 'hub' },
  { name: 'Nittany Lion Inn',       x:   90, z: -180, type: 'georgian', w: 46, h: 24, d: 22, cols: 6, cupola: true },
  { name: 'Berkey Creamery',        x:  180, z: -180, type: 'creamery' },
  { name: 'Nittany Lion Shrine',    x:   90, z: -270, type: 'shrine' },
  { name: 'Rec Hall',               x:    0, z: -270, type: 'georgian', w: 52, h: 18, d: 22, cols: 4, cupola: false },
  { name: 'Beaver Stadium',         x:  180, z: -270, type: 'stadium' },
  { name: 'Bryce Jordan Center',    x:  270, z: -270, type: 'arena' },
  // residence halls
  { name: 'East Halls',             x:  270, z: -180, type: 'dorm', towers: 3, h: 36, color: '#b8ad98' },
  { name: 'West Halls',             x: -270, z: -180, type: 'dorm', towers: 3, h: 18, color: '#9a5240', cap: true },
  { name: 'North Halls',            x: -270, z: -270, type: 'dorm', towers: 4, h: 24, color: '#8c4a3c' },
  { name: 'Pollock Halls',          x: -180, z: -270, type: 'dorm', towers: 3, h: 24, color: '#7b828e', accent: '#b4533c' },
  { name: 'South Halls',            x: -270, z:  -90, type: 'dorm', towers: 3, h: 24, color: '#a35d45' },

  // ---------------- downtown (south of College Ave) ----------------
  { name: 'Corner Room',            x:  -90, z:  -90, type: 'hotel' },   // Hotel State College: Corner Room, Zeno's, Allen Street Grill
  { name: "Bill Pickle's Tap Room", x:    0, z:  -90, type: 'bar', w: 40, wall: '#7a3b2e', accent: '#f5b301', text: "PICKLE'S TAP ROOM" },
  { name: 'Local Saloon',           x:   90, z:  -90, type: 'bar', w: 40, wall: '#5a3a22', accent: '#35d0ff', text: 'LOCAL SALOON' },
  { name: 'Cafe 210 West',          x: -180, z:  -90, type: 'bar', w: 38, wall: '#4a5d4f', accent: '#f472b6', text: 'CAFE 210 WEST' },
  { name: 'The Rathskeller',        x:  180, z:  -90, type: 'bar', w: 38, wall: '#4b2e2a', accent: '#fbbf24', text: 'THE SKELLER' },
  { name: "Kildare's Irish Pub",    x:  270, z:  -90, type: 'bar', w: 40, wall: '#1f3d2b', accent: '#22c55e', text: "KILDARE'S" },
  { name: 'The Phyrst',             x:    0, z:    0, type: 'bar', w: 38, wall: '#3a3f4a', accent: '#ff5a3c', text: 'THE PHYRST' },
  { name: 'Federal Taphouse',       x:   90, z:    0, type: 'bar', w: 40, wall: '#5b4636', accent: '#fb923c', text: 'FEDERAL TAPHOUSE' },
  { name: 'Mad Mex',                x:  180, z:    0, type: 'bar', w: 36, wall: '#8a3b2a', accent: '#facc15', text: 'MAD MEX' },
  { name: 'The Tavern',             x:  270, z:    0, type: 'bar', w: 40, wall: '#6b4a2f', accent: '#fde68a', text: 'THE TAVERN' },
  { name: 'Champs Downtown',       x:  -90, z:    0, type: 'bar', w: 40, wall: '#1f3a5f', accent: '#f97316', text: 'CHAMPS DOWNTOWN' },  // 139 S Allen St
  { name: 'Original Waffle Shop',   x:  -90, z:   90, type: 'bar', w: 34, wall: '#b49a6b', accent: '#fb7185', text: 'WAFFLE SHOP' },
  { name: 'Brothers Bar & Grill',   x:    0, z:   90, type: 'bar', w: 40, wall: '#2f3b5a', accent: '#60a5fa', text: 'BROTHERS' }
];

if (typeof module !== 'undefined') module.exports = LANDMARKS;