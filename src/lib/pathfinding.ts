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

// Find nodes inside a polygon
function nodesInArea(area: MapArea, nodes: MapRouteNode[]): MapRouteNode[] {
  return nodes.filter(n => pointInPolygon(n.x, n.y, area.polygon_points));
}

export type RouteEndpoint = 
  | { type: 'location'; location: MapLocation }
  | { type: 'area'; area: MapArea };

export function findRoute(
  from: RouteEndpoint | MapLocation,
  to: RouteEndpoint | MapLocation,
  nodes: MapRouteNode[],
  edges: MapRouteEdge[]
): { x: number; y: number }[] | null {
  const adj = buildAdjacencyList(edges);

  // Normalize to RouteEndpoint
  const fromEp: RouteEndpoint = 'type' in from ? from : { type: 'location', location: from };
  const toEp: RouteEndpoint = 'type' in to ? to : { type: 'location', location: to };

  // Resolve start node(s)
  let startNodeId: string | null = null;
  let startCoord: { x: number; y: number } | null = null;

  if (fromEp.type === 'location') {
    startNodeId = findNearestNode(fromEp.location, nodes);
    startCoord = { x: fromEp.location.x, y: fromEp.location.y };
  }

  // Resolve end
  if (toEp.type === 'location') {
    const endNodeId = findNearestNode(toEp.location, nodes);
    if (!startNodeId || !endNodeId) return null;

    const nodePath = bfs(adj, startNodeId, endNodeId);
    if (!nodePath) return null;

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return [
      startCoord!,
      ...nodePath.map(id => { const n = nodeMap.get(id)!; return { x: n.x, y: n.y }; }),
      { x: toEp.location.x, y: toEp.location.y },
    ];
  }

  // To is an area — find node inside area with fewest hops from start
  if (fromEp.type === 'area') {
    // Both are areas: find the pair of (nodeInFrom, nodeInTo) with fewest hops
    const fromNodes = nodesInArea(fromEp.area, nodes);
    const toNodes = nodesInArea(toEp.area, nodes);
    if (fromNodes.length === 0 || toNodes.length === 0) return null;

    let bestPath: string[] | null = null;
    let bestFromNode: MapRouteNode | null = null;
    let bestToNode: MapRouteNode | null = null;

    for (const fn of fromNodes) {
      const distances = bfsDistances(adj, fn.id);
      for (const tn of toNodes) {
        const d = distances.get(tn.id);
        if (d !== undefined && (!bestPath || d < bestPath.length - 1)) {
          const path = bfs(adj, fn.id, tn.id);
          if (path) { bestPath = path; bestFromNode = fn; bestToNode = tn; }
        }
      }
    }

    if (!bestPath || !bestFromNode || !bestToNode) return null;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    return bestPath.map(id => { const n = nodeMap.get(id)!; return { x: n.x, y: n.y }; });
  }

  // From is location, To is area
  if (!startNodeId) return null;
  const areaNodes = nodesInArea(toEp.area, nodes);
  if (areaNodes.length === 0) return null;

  const distances = bfsDistances(adj, startNodeId);
  let bestNode: MapRouteNode | null = null;
  let bestDist = Infinity;
  for (const an of areaNodes) {
    const d = distances.get(an.id);
    if (d !== undefined && d < bestDist) { bestDist = d; bestNode = an; }
  }

  if (!bestNode) return null;
  const nodePath = bfs(adj, startNodeId, bestNode.id);
  if (!nodePath) return null;

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  return [
    startCoord!,
    ...nodePath.map(id => { const n = nodeMap.get(id)!; return { x: n.x, y: n.y }; }),
  ];
}
