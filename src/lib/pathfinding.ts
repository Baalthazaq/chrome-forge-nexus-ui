import { MapRouteNode, MapRouteEdge, MapLocation, MapArea } from '@/hooks/useMazeData';

// Point-in-polygon test (ray casting)
export function pointInPolygon(px: number, py: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// Build adjacency list from edges (bidirectional)
function buildAdjacencyList(edges: MapRouteEdge[]): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    if (!adj.has(edge.from_node_id)) adj.set(edge.from_node_id, []);
    if (!adj.has(edge.to_node_id)) adj.set(edge.to_node_id, []);
    adj.get(edge.from_node_id)!.push(edge.to_node_id);
    adj.get(edge.to_node_id)!.push(edge.from_node_id);
  }
  return adj;
}

// Find nearest route node to a location
function findNearestNode(loc: { x: number; y: number }, nodes: MapRouteNode[]): string | null {
  if (nodes.length === 0) return null;
  let minDist = Infinity;
  let nearest: string | null = null;
  for (const node of nodes) {
    const dx = node.x - loc.x;
    const dy = node.y - loc.y;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      nearest = node.id;
    }
  }
  return nearest;
}

// BFS shortest path (fewest hops)
function bfs(adj: Map<string, string[]>, start: string, end: string): string[] | null {
  if (start === end) return [start];
  const visited = new Set<string>();
  const queue: string[][] = [[start]];
  visited.add(start);
  
  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];
    const neighbors = adj.get(current) || [];
    
    for (const neighbor of neighbors) {
      if (neighbor === end) return [...path, neighbor];
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push([...path, neighbor]);
      }
    }
  }
  return null;
}

// BFS from a start node, returns distance map
function bfsDistances(adj: Map<string, string[]>, start: string): Map<string, number> {
  const dist = new Map<string, number>();
  dist.set(start, 0);
  const queue = [start];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const d = dist.get(current)!;
    for (const neighbor of (adj.get(current) || [])) {
      if (!dist.has(neighbor)) {
        dist.set(neighbor, d + 1);
        queue.push(neighbor);
      }
    }
  }
  return dist;
}

// Find nodes inside a polygon, with fallback to nearest node to centroid
function nodesInArea(area: MapArea, nodes: MapRouteNode[]): MapRouteNode[] {
  const inside = nodes.filter(n => pointInPolygon(n.x, n.y, area.polygon_points));
  if (inside.length > 0) return inside;

  // Fallback: find the nearest node to the polygon centroid
  const centroid = area.polygon_points.reduce(
    (acc, p) => ({ x: acc.x + p.x / area.polygon_points.length, y: acc.y + p.y / area.polygon_points.length }),
    { x: 0, y: 0 }
  );
  const nearestId = findNearestNode(centroid, nodes);
  if (nearestId) {
    const node = nodes.find(n => n.id === nearestId);
    if (node) return [node];
  }
  return [];
}

export type RouteEndpoint =
  | { type: 'location'; location: MapLocation }
  | { type: 'area'; area: MapArea }
  | { type: 'offmap'; location: MapLocation };

export interface RouteResult {
  path: { x: number; y: number }[];
  offMapMilesStart: number;
  offMapMilesEnd: number;
}

function findEdgeNode(direction: string, nodes: MapRouteNode[]): MapRouteNode | null {
  if (nodes.length === 0) return null;
  let best = nodes[0];
  for (const n of nodes) {
    if (direction === 'north' && n.y < best.y) best = n;
    else if (direction === 'south' && n.y > best.y) best = n;
    else if (direction === 'west' && n.x < best.x) best = n;
    else if (direction === 'east' && n.x > best.x) best = n;
  }
  return best;
}

function offmapExitPoint(node: MapRouteNode, direction: string): { x: number; y: number } {
  // Push slightly toward the corresponding map edge for visual hint
  switch (direction) {
    case 'north': return { x: node.x, y: Math.max(0, node.y - 8) };
    case 'south': return { x: node.x, y: Math.min(100, node.y + 8) };
    case 'west':  return { x: Math.max(0, node.x - 8), y: node.y };
    case 'east':  return { x: Math.min(100, node.x + 8), y: node.y };
    default: return { x: node.x, y: node.y };
  }
}

export function findRoute(
  from: RouteEndpoint | MapLocation,
  to: RouteEndpoint | MapLocation,
  nodes: MapRouteNode[],
  edges: MapRouteEdge[]
): RouteResult | null {
  const adj = buildAdjacencyList(edges);
  const fromEp: RouteEndpoint = 'type' in from ? from : { type: 'location', location: from };
  const toEp: RouteEndpoint = 'type' in to ? to : { type: 'location', location: to };

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  let offMapMilesStart = 0;
  let offMapMilesEnd = 0;

  // Resolve start "anchor" node id and prefix coords
  let startNodeId: string | null = null;
  const prefixCoords: { x: number; y: number }[] = [];
  if (fromEp.type === 'location') {
    startNodeId = findNearestNode(fromEp.location, nodes);
    prefixCoords.push({ x: fromEp.location.x, y: fromEp.location.y });
  } else if (fromEp.type === 'offmap') {
    const dir = fromEp.location.off_map_direction || 'north';
    const edge = findEdgeNode(dir, nodes);
    if (!edge) return null;
    startNodeId = edge.id;
    offMapMilesStart = Number(fromEp.location.off_map_distance_miles || 0);
    prefixCoords.push(offmapExitPoint(edge, dir));
  } else {
    // area: pick first node in area as start anchor
    const ans = nodesInArea(fromEp.area, nodes);
    if (ans.length === 0) return null;
    startNodeId = ans[0].id;
  }

  // Resolve end target node ids and suffix coords
  let endTargets: string[] = [];
  const suffixCoords: { x: number; y: number }[] = [];
  if (toEp.type === 'location') {
    const n = findNearestNode(toEp.location, nodes);
    if (!n) return null;
    endTargets = [n];
    suffixCoords.push({ x: toEp.location.x, y: toEp.location.y });
  } else if (toEp.type === 'offmap') {
    const dir = toEp.location.off_map_direction || 'north';
    const edge = findEdgeNode(dir, nodes);
    if (!edge) return null;
    endTargets = [edge.id];
    offMapMilesEnd = Number(toEp.location.off_map_distance_miles || 0);
    suffixCoords.push(offmapExitPoint(edge, dir));
  } else {
    const ans = nodesInArea(toEp.area, nodes);
    if (ans.length === 0) return null;
    endTargets = ans.map(n => n.id);
  }

  if (!startNodeId) return null;

  // For area starts, try every start node and pick shortest
  const startCandidates: string[] = fromEp.type === 'area'
    ? nodesInArea(fromEp.area, nodes).map(n => n.id)
    : [startNodeId];

  let bestPath: string[] | null = null;
  for (const s of startCandidates) {
    const distances = bfsDistances(adj, s);
    for (const t of endTargets) {
      const d = distances.get(t);
      if (d !== undefined && (!bestPath || d < bestPath.length - 1)) {
        const p = bfs(adj, s, t);
        if (p) bestPath = p;
      }
    }
  }
  if (!bestPath) return null;

  const path = [
    ...prefixCoords,
    ...bestPath.map(id => { const n = nodeMap.get(id)!; return { x: n.x, y: n.y }; }),
    ...suffixCoords,
  ];

  return { path, offMapMilesStart, offMapMilesEnd };
}
