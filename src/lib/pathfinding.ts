import { MapRouteNode, MapRouteEdge, MapLocation } from '@/hooks/useMazeData';

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

export function findRoute(
  fromLocation: MapLocation,
  toLocation: MapLocation,
  nodes: MapRouteNode[],
  edges: MapRouteEdge[]
): { x: number; y: number }[] | null {
  const adj = buildAdjacencyList(edges);
  const startNode = findNearestNode(fromLocation, nodes);
  const endNode = findNearestNode(toLocation, nodes);
  
  if (!startNode || !endNode) return null;
  
  const nodePath = bfs(adj, startNode, endNode);
  if (!nodePath) return null;
  
  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  
  // Build coordinate path: location -> nodes -> location
  const points: { x: number; y: number }[] = [
    { x: fromLocation.x, y: fromLocation.y },
    ...nodePath.map(id => {
      const n = nodeMap.get(id)!;
      return { x: n.x, y: n.y };
    }),
    { x: toLocation.x, y: toLocation.y },
  ];
  
  return points;
}
