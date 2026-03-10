import { useRef, useState, useCallback, useEffect, MouseEvent } from 'react';
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
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [viewBox, setViewBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const updateImgSize = useCallback(() => {
    if (imgRef.current) {
      setImgSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }
  }, []);

  useEffect(() => {
    if (zoomToArea && zoomToArea.polygon_points.length >= 3) {
      const pts = zoomToArea.polygon_points;
      const minX = Math.min(...pts.map(p => p.x));
      const maxX = Math.max(...pts.map(p => p.x));
      const minY = Math.min(...pts.map(p => p.y));
      const maxY = Math.max(...pts.map(p => p.y));
      const padding = 2;
      setViewBox({
        x: Math.max(0, minX - padding),
        y: Math.max(0, minY - padding),
        w: Math.min(100, maxX - minX + padding * 2),
        h: Math.min(100, maxY - minY + padding * 2),
      });
    } else {
      setViewBox(null);
    }
  }, [zoomToArea]);

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!onMapClick || mode === 'view') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / rect.width * 100;
    const rawY = (e.clientY - rect.top) / rect.height * 100;
    
    // If zoomed, convert to full-map coordinates
    let x = rawX, y = rawY;
    if (viewBox) {
      x = viewBox.x + rawX * viewBox.w / 100;
      y = viewBox.y + rawY * viewBox.h / 100;
    }
    onMapClick(x, y);
  };

  const toViewCoords = (px: number, py: number) => {
    if (viewBox) {
      return {
        left: `${((px - viewBox.x) / viewBox.w) * 100}%`,
        top: `${((py - viewBox.y) / viewBox.h) * 100}%`,
      };
    }
    return { left: `${px}%`, top: `${py}%` };
  };

  const toViewPercent = (px: number, py: number) => {
    if (viewBox) {
      return {
        x: ((px - viewBox.x) / viewBox.w) * 100,
        y: ((py - viewBox.y) / viewBox.h) * 100,
      };
    }
    return { x: px, y: py };
  };

  const cursor = mode === 'view' ? 'default' : 'crosshair';

  // Build node map for edge rendering
  const nodeMap = new Map(routeNodes.map(n => [n.id, n]));

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden bg-gray-900 rounded-md"
      style={{ cursor, aspectRatio: viewBox ? `${viewBox.w} / ${viewBox.h}` : undefined }}
      onClick={handleClick}
    >
      {/* Map image */}
      <img
        ref={imgRef}
        src={MAP_URL}
        alt="Map of Raccassammeddi"
        className="w-full h-full block"
        style={viewBox ? {
          objectFit: 'cover',
          objectPosition: `${viewBox.x}% ${viewBox.y}%`,
          // Use clip-path approach via transform
          position: 'absolute',
          left: `${-viewBox.x / viewBox.w * 100}%`,
          top: `${-viewBox.y / viewBox.h * 100}%`,
          width: `${100 / viewBox.w * 100}%`,
          height: `${100 / viewBox.h * 100}%`,
        } : { width: '100%', display: 'block' }}
        draggable={false}
        onLoad={updateImgSize}
      />

      {/* SVG overlay for polygons, edges, paths */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Area polygons */}
        {areas.map(area => {
          if (area.polygon_points.length < 3) return null;
          const pts = area.polygon_points.map(p => {
            const v = toViewPercent(p.x, p.y);
            return `${v.x},${v.y}`;
          }).join(' ');
          const isSelected = selectedArea?.id === area.id;
          return (
            <polygon
              key={area.id}
              points={pts}
              fill={isSelected ? 'rgba(20,184,166,0.25)' : 'rgba(20,184,166,0.1)'}
              stroke={isSelected ? 'rgba(20,184,166,0.8)' : 'rgba(20,184,166,0.4)'}
              strokeWidth={isSelected ? 0.4 : 0.2}
              className="pointer-events-auto cursor-pointer transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onAreaClick?.(area);
              }}
            />
          );
        })}

        {/* Drawing polygon preview */}
        {drawingPolygon.length > 0 && (
          <>
            <polyline
              points={drawingPolygon.map(p => {
                const v = toViewPercent(p.x, p.y);
                return `${v.x},${v.y}`;
              }).join(' ')}
              fill="none"
              stroke="rgba(251,191,36,0.8)"
              strokeWidth={0.3}
              strokeDasharray="0.5,0.5"
            />
            {drawingPolygon.map((p, i) => {
              const v = toViewPercent(p.x, p.y);
              const isFirst = i === 0 && drawingPolygon.length >= 3;
              return (
                <circle
                  key={i}
                  cx={v.x}
                  cy={v.y}
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
          const vf = toViewPercent(from.x, from.y);
          const vt = toViewPercent(to.x, to.y);
          return (
            <line
              key={edge.id}
              x1={vf.x} y1={vf.y}
              x2={vt.x} y2={vt.y}
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
          const vf = toViewPercent(from.x, from.y);
          const vt = toViewPercent(to.x, to.y);
          return (
            <line
              key={`draw-${i}`}
              x1={vf.x} y1={vf.y}
              x2={vt.x} y2={vt.y}
              stroke="rgba(251,191,36,0.8)"
              strokeWidth={0.3}
              strokeDasharray="0.5,0.5"
            />
          );
        })}

        {/* Pathfinding route (player view) */}
        {routePath && routePath.length > 1 && (
          <polyline
            points={routePath.map(p => {
              const v = toViewPercent(p.x, p.y);
              return `${v.x},${v.y}`;
            }).join(' ')}
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
        const pos = toViewCoords(node.x, node.y);
        const isInDrawing = drawingRoute.includes(node.id);
        return (
          <div
            key={node.id}
            className={`absolute w-3 h-3 rounded-full -translate-x-1/2 -translate-y-1/2 cursor-pointer border ${
              isInDrawing ? 'bg-amber-400 border-amber-300' : 'bg-purple-500/60 border-purple-400/60'
            } hover:scale-150 transition-transform`}
            style={{ ...pos, zIndex: 20 }}
            onClick={(e) => {
              e.stopPropagation();
              onRouteNodeClick?.(node);
            }}
          />
        );
      })}

      {/* Location pins */}
      {locations.map(loc => {
        const pos = toViewCoords(loc.x, loc.y);
        const Icon = ICON_MAP[loc.icon_type] || MapPin;
        const isSelected = selectedLocation?.id === loc.id;
        return (
          <div
            key={loc.id}
            className={`absolute -translate-x-1/2 -translate-y-full cursor-pointer group z-30 transition-transform ${
              isSelected ? 'scale-125' : 'hover:scale-110'
            }`}
            style={pos}
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

      {/* Reset zoom button */}
      {viewBox && (
        <button
          className="absolute top-2 left-2 z-40 px-2 py-1 bg-black/70 border border-teal-500/30 rounded text-teal-400 text-xs font-mono hover:bg-black/90"
          onClick={(e) => {
            e.stopPropagation();
            setViewBox(null);
          }}
        >
          ← Full Map
        </button>
      )}
    </div>
  );
};
