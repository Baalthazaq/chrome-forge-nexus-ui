import { useRef, useState, useCallback, useEffect, useMemo, MouseEvent } from 'react';
import { MapLocation, MapArea, MapRouteNode, MapRouteEdge } from '@/hooks/useMazeData';
import { MapPin, Building, Store, Landmark, Home, Skull, Trees, Zap } from 'lucide-react';

const MAP_URL = 'https://csyajgxbptbtluxdiepi.supabase.co/storage/v1/object/public/Map/RaccaDigitalMap.png';

const ICON_MAP: Record<string, typeof MapPin> = {
  default: MapPin,
  building: Building,
  store: Store,
  landmark: Landmark,
  home: Home,
  danger: Skull,
  nature: Trees,
  tech: Zap,
};

export const LOCATION_ICON_TYPES = Object.keys(ICON_MAP);

interface InteractiveMapProps {
  locations: MapLocation[];
  areas: MapArea[];
  routeNodes?: MapRouteNode[];
  routeEdges?: MapRouteEdge[];
  routePath?: { x: number; y: number }[] | null;
  showRouteNodes?: boolean;
  showRouteEdges?: boolean;
  selectedArea?: MapArea | null;
  selectedLocation?: MapLocation | null;
  drawingPolygon?: { x: number; y: number }[];
  drawingRoute?: string[];
  onMapClick?: (x: number, y: number) => void;
  onLocationClick?: (loc: MapLocation) => void;
  onAreaClick?: (area: MapArea) => void;
  onRouteNodeClick?: (node: MapRouteNode) => void;
  mode?: 'view' | 'place-location' | 'draw-polygon' | 'draw-route';
  zoomToArea?: MapArea | null;
}

export const InteractiveMap = ({
  locations,
  areas,
  routeNodes = [],
  routeEdges = [],
  routePath,
  showRouteNodes = false,
  showRouteEdges = false,
  selectedArea,
  selectedLocation,
  drawingPolygon = [],
  drawingRoute = [],
  onMapClick,
  onLocationClick,
  onAreaClick,
  onRouteNodeClick,
  mode = 'view',
  zoomToArea,
}: InteractiveMapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [hoveredAreas, setHoveredAreas] = useState<Set<string>>(new Set());
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Calculate zoom transform from area polygon
  const zoomTransform = useMemo(() => {
    if (!zoomToArea || zoomToArea.polygon_points.length < 3) return null;
    const pts = zoomToArea.polygon_points;
    const minX = Math.min(...pts.map(p => p.x));
    const maxX = Math.max(...pts.map(p => p.x));
    const minY = Math.min(...pts.map(p => p.y));
    const maxY = Math.max(...pts.map(p => p.y));
    const padding = 3;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w = maxX - minX + padding * 2;
    const h = maxY - minY + padding * 2;
    const scale = Math.min(100 / w, 100 / h);
    return { cx, cy, scale };
  }, [zoomToArea]);

  useEffect(() => {
    setIsZoomed(!!zoomTransform);
  }, [zoomTransform]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onMapClick || mode === 'view') return;
    const inner = e.currentTarget.querySelector('[data-map-inner]') as HTMLElement;
    if (!inner) return;
    const rect = inner.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onMapClick(x, y);
  };

  const cursor = mode === 'view' ? 'default' : 'crosshair';

  // Point-in-polygon test (ray casting)
  const pointInPolygon = useCallback((px: number, py: number, polygon: { x: number; y: number }[]) => {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x, yi = polygon[i].y;
      const xj = polygon[j].x, yj = polygon[j].y;
      if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }, []);

  // Handle mouse move on the map inner element to detect all overlapping areas
  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const inner = e.currentTarget.querySelector('[data-map-inner]') as HTMLElement;
    if (!inner) return;
    const innerRect = inner.getBoundingClientRect();
    const px = ((e.clientX - innerRect.left) / innerRect.width) * 100;
    const py = ((e.clientY - innerRect.top) / innerRect.height) * 100;

    const hovered = new Set<string>();
    for (const area of areas) {
      if (area.polygon_points.length >= 3 && pointInPolygon(px, py, area.polygon_points)) {
        hovered.add(area.id);
      }
    }
    setHoveredAreas(hovered);

    if (hovered.size > 0) {
      const container = containerRef.current;
      if (container) {
        const rect = container.getBoundingClientRect();
        setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
    } else {
      setMousePos(null);
    }
  }, [areas, pointInPolygon]);

  // Build node map for edge rendering
  const nodeMap = new Map(routeNodes.map(n => [n.id, n]));

  // Build the transform style for zoom
  const innerStyle: React.CSSProperties = zoomTransform && isZoomed
    ? {
        transform: `scale(${zoomTransform.scale}) translate(${-(zoomTransform.cx - 50 / zoomTransform.scale)}%, ${-(zoomTransform.cy - 50 / zoomTransform.scale)}%)`,
        transformOrigin: '0 0',
        transition: 'transform 0.4s ease-in-out',
      }
    : {
        transform: 'scale(1) translate(0, 0)',
        transformOrigin: '0 0',
        transition: 'transform 0.4s ease-in-out',
      };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-gray-900 rounded-md"
      style={{ cursor }}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { setHoveredAreas(new Set()); setMousePos(null); }}
    >
      {/* Inner wrapper that gets zoomed */}
      <div className="relative w-full" data-map-inner style={innerStyle}>
        {/* Map image */}
        <img
          src={MAP_URL}
          alt="Map of Raccassammeddi"
          className="w-full block"
          draggable={false}
        />

        {/* SVG overlay for polygons, edges, paths */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Area polygons */}
          {areas.map(area => {
            if (area.polygon_points.length < 3) return null;
            const pts = area.polygon_points.map(p => `${p.x},${p.y}`).join(' ');
            const isSelected = selectedArea?.id === area.id;
            return (
              <g key={area.id}>
                <polygon
                  points={pts}
                  fill={isSelected ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.1)'}
                  stroke={isSelected ? 'rgba(20,184,166,0.8)' : 'rgba(20,184,166,0.4)'}
                  strokeWidth={isSelected ? 0.4 : 0.2}
                  className="pointer-events-auto cursor-pointer transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Find all areas under the click and pick the smallest
                    const inner = containerRef.current?.querySelector('[data-map-inner]') as HTMLElement;
                    if (!inner || !onAreaClick) return;
                    const rect = inner.getBoundingClientRect();
                    const px = ((e.clientX - rect.left) / rect.width) * 100;
                    const py = ((e.clientY - rect.top) / rect.height) * 100;
                    const overlapping = areas.filter(a =>
                      a.polygon_points.length >= 3 && pointInPolygon(px, py, a.polygon_points)
                    );
                    if (overlapping.length === 0) return;
                    // Pick smallest by polygon area (shoelace formula)
                    const polyArea = (pts: { x: number; y: number }[]) => {
                      let a = 0;
                      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                        a += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
                      }
                      return Math.abs(a / 2);
                    };
                    const smallest = overlapping.reduce((s, c) =>
                      polyArea(c.polygon_points) < polyArea(s.polygon_points) ? c : s
                    );
                    onAreaClick(smallest);
                  }}
                />
              </g>
            );
          })}

          {/* Drawing polygon preview */}
          {drawingPolygon.length > 0 && (
            <>
              <polyline
                points={drawingPolygon.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke="rgba(251,191,36,0.8)"
                strokeWidth={0.3}
                strokeDasharray="0.5,0.5"
              />
              {drawingPolygon.map((p, i) => {
                const isFirst = i === 0 && drawingPolygon.length >= 3;
                return (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={isFirst ? 0.7 : 0.4}
                    fill={isFirst ? 'rgba(251,191,36,1)' : 'rgba(251,191,36,0.8)'}
                    stroke={isFirst ? 'white' : 'none'}
                    strokeWidth={isFirst ? 0.2 : 0}
                    className={isFirst ? 'pointer-events-auto cursor-pointer' : ''}
                  />
                );
              })}
            </>
          )}

          {/* Route edges (admin only) */}
          {showRouteEdges && routeEdges.map(edge => {
            const from = nodeMap.get(edge.from_node_id);
            const to = nodeMap.get(edge.to_node_id);
            if (!from || !to) return null;
            return (
              <line
                key={edge.id}
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="rgba(168,85,247,0.5)"
                strokeWidth={0.2}
              />
            );
          })}

          {/* Drawing route preview */}
          {drawingRoute.length > 1 && drawingRoute.map((nodeId, i) => {
            if (i === 0) return null;
            const from = nodeMap.get(drawingRoute[i - 1]);
            const to = nodeMap.get(nodeId);
            if (!from || !to) return null;
            return (
              <line
                key={`draw-${i}`}
                x1={from.x} y1={from.y}
                x2={to.x} y2={to.y}
                stroke="rgba(251,191,36,0.8)"
                strokeWidth={0.3}
                strokeDasharray="0.5,0.5"
              />
            );
          })}

          {/* Pathfinding route (player view) */}
          {routePath && routePath.length > 1 && (
            <polyline
              points={routePath.map(p => `${p.x},${p.y}`).join(' ')}
              fill="none"
              stroke="rgba(59,130,246,0.9)"
              strokeWidth={0.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="1,0.5"
            />
          )}
        </svg>

        {/* Route nodes (admin only) */}
        {showRouteNodes && routeNodes.map(node => {
          const isInDrawing = drawingRoute.includes(node.id);
          return (
            <div
              key={node.id}
              className={`absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer border ${
                isInDrawing ? 'bg-amber-400 border-amber-300' : 'bg-purple-500/60 border-purple-400/60'
              } hover:scale-150 transition-transform`}
              style={{ left: `${node.x}%`, top: `${node.y}%`, zIndex: 20 }}
              onClick={(e) => {
                e.stopPropagation();
                onRouteNodeClick?.(node);
              }}
            />
          );
        })}

        {/* Location pins */}
        {locations.map(loc => {
          const Icon = ICON_MAP[loc.icon_type] || MapPin;
          const isSelected = selectedLocation?.id === loc.id;
          return (
            <div
              key={loc.id}
              className={`absolute -translate-x-1/2 -translate-y-full cursor-pointer group z-30 transition-transform ${
                isSelected ? 'scale-125' : 'hover:scale-110'
              }`}
              style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onLocationClick?.(loc);
              }}
            >
              <Icon className={`w-5 h-5 drop-shadow-lg ${
                isSelected ? 'text-teal-300' : loc.is_public ? 'text-teal-500' : 'text-amber-500'
              }`} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-black/80 rounded text-[10px] font-mono text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                {loc.name}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reset zoom button - outside the inner wrapper */}
      {isZoomed && (
        <button
          className="absolute top-2 left-2 z-40 px-2 py-1 bg-black/70 border border-teal-500/30 rounded text-teal-400 text-xs font-mono hover:bg-black/90"
          onClick={(e) => {
            e.stopPropagation();
            setIsZoomed(false);
          }}
        >
          ← Full Map
        </button>
      )}

      {/* Area hover tooltip */}
      {hoveredAreas.size > 0 && mousePos && (
        <div
          className="absolute z-50 px-2 py-0.5 bg-black/80 rounded text-[10px] font-mono text-gray-300 whitespace-nowrap pointer-events-none"
          style={{ left: mousePos.x + 12, top: mousePos.y - 8 }}
        >
          {areas.filter(a => hoveredAreas.has(a.id)).map(a => a.name).join(' · ')}
        </div>
      )}
    </div>
  );
};
