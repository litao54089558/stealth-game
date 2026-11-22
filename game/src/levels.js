// Night Archive — the three levels.
// Map legend: '#' wall, '.' floor, 'C' crate (cover), 'S' shelf (cover),
// 'P' player start, 'E' exit door, 'K' keycard. Guard waypoints are tile
// coordinates; a patrol leg must run straight down an open row or column.

import { TILE } from './config.js';
import { tileCenter } from './physics.js';

const LEVEL_1_MAP = [
  '##############################',
  '#P.....#......C......#.......#',
  '#......#.................C...#',
  '#..C...#....C........#.......#',
  '#......#.............#.......#',
  '#.......##......#####........#',
  '#......#.....C......#....C...#',
  '#..C...#............#........#',
  '#......#..C.........#...E....#',
  '#......#............#........#',
  '#..C...#.....C......#..C.....#',
  '#......#............#........#',
  '#.......###.....#####........#',
  '#......#...........#....C....#',
  '#..C...#..C....C...#.........#',
  '#......#...........#....C....#',
  '#......#.....C.....#.........#',
  '#..................#...C.....#',
  '#..C...#..C........#.........#',
  '##############################',
];

const LEVEL_2_MAP = [
  '##############################',
  '#P....#.......C..............#',
  '#....................#...K...#',
  '#..C..#...C......C...#.......#',
  '#.....#..............#.......#',
  '#..C..#.###....#######...C...#',
  '#.....#......C......#........#',
  '#..C..#.............#....C...#',
  '#.....#...C....C....#........#',
  '#.....###......######....E...#',
  '#............................#',
  '#..C..#....C........#...C....#',
  '#.....#.............#........#',
  '#.....#.###.....#####........#',
  '#.....#.....C........#...C...#',
  '#..C..#.............#........#',
  '#.....#...C.....C...#....C...#',
  '#.....#.............#........#',
  '#..C..#......C......#........#',
  '##############################',
];

const LEVEL_3_MAP = [
  '##############################',
  '#P...#......C......#....K....#',
  '#....#.............#.........#',
  '#.C..#...C.....C...#....C....#',
  '#....#.............#.........#',
  '#.....##.....#######....C....#',
  '#....#....C............#.....#',
  '#.C..#...........#..C..#..C..#',
  '#....#...C....C..#.....#.....#',
  '#.....####....####..C..#.....#',
  '#....#.........#..........E..#',
  '#.C..#....C....#..C.#....#...#',
  '#....#.........#....#....#...#',
  '#....####...#####...#..C.#...#',
  '#.........C.....#........#...#',
  '#.C..#.........#.C..#....#...#',
  '#....#...C.....#....#..C.#...#',
  '#....#.........#....#....#...#',
  '#..K.#....C....#....#....#...#',
  '##############################',
];

export const LEVEL_DEFS = [
  {
    name: 'Reading Room',
    map: LEVEL_1_MAP,
    viewDistance: 200,
    patrolSpeed: 52,
    guards: [
      { waypoints: [[9, 2], [19, 2]] },
      { waypoints: [[26, 6], [26, 16]] },
    ],
  },
  {
    name: 'The Stacks',
    map: LEVEL_2_MAP,
    viewDistance: 225,
    patrolSpeed: 58,
    guards: [
      { waypoints: [[9, 2], [19, 2]] },
      { waypoints: [[26, 6], [26, 16]] },
      { waypoints: [[14, 11], [14, 17]] },
    ],
  },
  {
    name: 'Vault Corridor',
    map: LEVEL_3_MAP,
    viewDistance: 245,
    patrolSpeed: 64,
    guards: [
      { waypoints: [[7, 4], [17, 4]] },
      { waypoints: [[27, 6], [27, 16]] },
      { waypoints: [[11, 11], [11, 17]] },
      { waypoints: [[22, 10], [22, 17]] },
    ],
  },
];

// Turn a level definition's strings into the playable level object:
// a tile grid plus pixel positions for the player, the exit, keycards
// and guard spawns. 'P', 'E' and 'K' tiles become floor under the object.
export function buildLevel(def) {
  const rows = def.map.length;
  const cols = def.map[0].length;
  const tiles = def.map.map((row) => row.split(''));
  const level = {
    name: def.name,
    tiles,
    rows,
    cols,
    viewDistance: def.viewDistance,
    patrolSpeed: def.patrolSpeed,
    playerStart: { x: 0, y: 0 },
    exit: { x: 0, y: 0 },
    keycards: [],
    guardSpawns: [],
  };
  for (let ty = 0; ty < rows; ty++) {
    for (let tx = 0; tx < cols; tx++) {
      const ch = tiles[ty][tx];
      const center = tileCenter(tx, ty);
      if (ch === 'P') {
        level.playerStart = center;
        tiles[ty][tx] = '.';
      } else if (ch === 'E') {
        level.exit = center;
        tiles[ty][tx] = '.';
      } else if (ch === 'K') {
        level.keycards.push({ x: center.x, y: center.y, taken: false });
        tiles[ty][tx] = '.';
      }
    }
  }
  level.guardSpawns = def.guards.map((g) => ({
    waypoints: g.waypoints.map(([tx, ty]) => tileCenter(tx, ty)),
  }));
  return level;
}

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return '#';
  return level.tiles[ty][tx];
}
