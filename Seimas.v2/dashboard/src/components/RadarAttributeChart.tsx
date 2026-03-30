import React from 'react';

interface RadarDataPoint {
  label: string;
  value: number; // 0-100 scale
}

interface RadarAttributeChartProps {
  data: RadarDataPoint[];
  size?: number; // Canvas size in pixels
  color?: string; // Primary color for the data shape
  showLabels?: boolean;
  showVertices?: boolean;
  showAtmosphere?: boolean;
}

export function RadarAttributeChart({
  data,
  size = 300,
  color = '#22C55E',
  showLabels = true,
  showVertices = true,
  showAtmosphere = true,
}: RadarAttributeChartProps) {
  const center = size / 2;
  const maxRadius = center - 60; // Leave space for labels
  const numPoints = data.length;
  const angleStep = (Math.PI * 2) / numPoints;

  // Calculate point on pentagon at given radius and index
  const getPoint = (index: number, radiusPercent: number) => {
    const angle = (index * angleStep) - (Math.PI / 2); // Start from top
    const radius = maxRadius * radiusPercent;
    return {
      x: center + radius * Math.cos(angle),
      y: center + radius * Math.sin(angle),
    };
  };

  // Generate path for concentric pentagon at given radius
  const getPentagonPath = (radiusPercent: number) => {
    const points = Array.from({ length: numPoints }, (_, i) => getPoint(i, radiusPercent));
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    return pathData;
  };

  // Generate data shape path
  const getDataPath = () => {
    const points = data.map((d, i) => getPoint(i, d.value / 100));
    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
    return pathData;
  };

  // Get data points for vertices
  const getDataPoints = () => {
    return data.map((d, i) => getPoint(i, d.value / 100));
  };

  return (
    <div className="relative inline-block">
      <svg width={size} height={size} className="overflow-visible">
        <defs>
          {/* Radial gradient for atmosphere */}
          <radialGradient id={`atmosphere-${color.replace('#', '')}`}>
            <stop offset="0%" stopColor={color} stopOpacity="0.1" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Background Atmosphere (The Glow) */}
        {showAtmosphere && (
          <circle
            cx={center}
            cy={center}
            r={maxRadius * 0.8}
            fill={`url(#atmosphere-${color.replace('#', '')})`}
            style={{ mixBlendMode: 'screen' }}
          />
        )}

        {/* The Grid - 3 Concentric Pentagons */}
        {[0.33, 0.66, 1].map((scale, i) => (
          <path
            key={`grid-${i}`}
            d={getPentagonPath(scale)}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />
        ))}

        {/* The Grid - 5 Axis Lines */}
        {data.map((_, i) => {
          const outer = getPoint(i, 1);
          return (
            <line
              key={`axis-${i}`}
              x1={center}
              y1={center}
              x2={outer.x}
              y2={outer.y}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1"
            />
          );
        })}

        {/* The Data Shape (The Polymer) - Fill */}
        <path
          d={getDataPath()}
          fill={color}
          fillOpacity="0.2"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
        />

        {/* The Data Shape - Vertices (small white circles) */}
        {showVertices && getDataPoints().map((point, i) => (
          <circle
            key={`vertex-${i}`}
            cx={point.x}
            cy={point.y}
            r="4"
            fill="white"
            stroke={color}
            strokeWidth="2"
          />
        ))}

        {/* Labels at vertices */}
        {showLabels && data.map((d, i) => {
          const labelPoint = getPoint(i, 1.15); // Position outside the grid
          return (
            <text
              key={`label-${i}`}
              x={labelPoint.x}
              y={labelPoint.y}
              fill="rgba(255, 255, 255, 0.6)"
              fontSize="11"
              fontWeight="500"
              textAnchor="middle"
              dominantBaseline="middle"
              style={{ fontFamily: 'Inter, Geist Sans, sans-serif' }}
            >
              {d.label}
            </text>
          );
        })}
      </svg>
    </div>
  );
}
