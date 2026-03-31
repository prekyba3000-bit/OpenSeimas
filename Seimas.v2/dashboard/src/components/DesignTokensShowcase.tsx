// ORPHANED(v4): not imported by any production route. Safe to delete in hygiene pass.
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

// Color Primitives from CSS Variables
const colorPrimitives = {
  'sys/bg/depth': { hex: '#0a0a0c', description: 'App background depth' },
  'sys/bg/surface': { hex: '#1a1a1e', description: 'Surface elevation' },
  'sys/color/primary': { hex: '#3b82f6', description: 'Primary accent' },
};

// Glass Material Tokens
const glassMaterials = {
  'Material/Glass/Flat': {
    fill: 'rgba(255, 255, 255, 0.05)',
    stroke: 'rgba(255, 255, 255, 0.1)',
    strokeWidth: '1px',
    strokePosition: 'Inside',
  },
  'Material/Glass/Card': {
    fill: 'rgba(255, 255, 255, 0.05)',
    stroke: 'rgba(255, 255, 255, 0.1)',
    strokeWidth: '1px',
    cornerRadius: '12px',
    shadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
  },
};

// Typography Scale
const typographyScale = {
  'H1/Page_Title': {
    size: '30px',
    weight: '700',
    lineHeight: '1.2',
    usage: 'Main page titles',
  },
  'H2/Section_Title': {
    size: '20px',
    weight: '600',
    lineHeight: '1.4',
    usage: 'Section headers',
  },
  'Body/Regular': {
    size: '14px',
    weight: '400',
    lineHeight: '1.5',
    color: '#e5e7eb',
    usage: 'Default body text',
  },
  'Caption/Meta': {
    size: '12px',
    weight: '500',
    lineHeight: '1.4',
    color: '#6b7280',
    usage: 'Metadata, timestamps',
  },
  'Label/Micro': {
    size: '10px',
    weight: '700',
    lineHeight: '1.2',
    letterSpacing: '0.05em',
    transform: 'uppercase',
    usage: 'Labels, tags, badges',
  },
};

interface ColorSwatchProps {
  name: string;
  hex: string;
  description: string;
}

function ColorSwatch({ name, hex, description }: ColorSwatchProps) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-white/5 hover:border-white/10 transition-all">
      <div
        className="w-16 h-16 rounded-lg shadow-lg border border-white/10"
        style={{ backgroundColor: hex }}
      />
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-mono text-sm font-semibold text-white">{name}</h4>
          <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-gray-400">
            Variable
          </Badge>
        </div>
        <p className="text-xs text-gray-400 mb-1">{description}</p>
        <code className="text-xs font-mono text-blue-400">{hex.toUpperCase()}</code>
      </div>
    </div>
  );
}

interface GlassMaterialCardProps {
  name: string;
  specs: {
    fill?: string;
    stroke?: string;
    strokeWidth?: string;
    strokePosition?: string;
    cornerRadius?: string;
    shadow?: string;
  };
}

function GlassMaterialCard({ name, specs }: GlassMaterialCardProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-white">{name}</h4>
        <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-gray-400">
          Style
        </Badge>
      </div>
      
      {/* Preview */}
      <div
        className="h-32 rounded-xl border"
        style={{
          background: specs.fill,
          borderColor: specs.stroke?.replace(')', ', 1)').replace('rgba', 'rgb') || 'transparent',
          borderWidth: specs.strokeWidth || '1px',
          boxShadow: specs.shadow || 'none',
        }}
      >
        <div className="h-full flex items-center justify-center">
          <span className="text-xs text-gray-500 font-mono">{name}</span>
        </div>
      </div>

      {/* Specs */}
      <div className="p-3 bg-black/40 rounded-lg space-y-1 text-xs">
        {specs.fill && (
          <div className="flex justify-between">
            <span className="text-gray-500">Fill:</span>
            <code className="text-gray-300 font-mono">{specs.fill}</code>
          </div>
        )}
        {specs.stroke && (
          <div className="flex justify-between">
            <span className="text-gray-500">Stroke:</span>
            <code className="text-gray-300 font-mono">{specs.stroke}</code>
          </div>
        )}
        {specs.strokeWidth && (
          <div className="flex justify-between">
            <span className="text-gray-500">Width:</span>
            <code className="text-gray-300 font-mono">{specs.strokeWidth}</code>
          </div>
        )}
        {specs.strokePosition && (
          <div className="flex justify-between">
            <span className="text-gray-500">Position:</span>
            <code className="text-gray-300 font-mono">{specs.strokePosition}</code>
          </div>
        )}
        {specs.cornerRadius && (
          <div className="flex justify-between">
            <span className="text-gray-500">Radius:</span>
            <code className="text-gray-300 font-mono">{specs.cornerRadius}</code>
          </div>
        )}
        {specs.shadow && (
          <div className="flex justify-between">
            <span className="text-gray-500">Shadow:</span>
            <code className="text-gray-300 font-mono text-xs">{specs.shadow}</code>
          </div>
        )}
      </div>
    </div>
  );
}

interface TypographyExampleProps {
  name: string;
  specs: {
    size: string;
    weight: string;
    lineHeight: string;
    color?: string;
    letterSpacing?: string;
    transform?: string;
    usage: string;
  };
}

function TypographyExample({ name, specs }: TypographyExampleProps) {
  const style: React.CSSProperties = {
    fontSize: specs.size,
    fontWeight: specs.weight,
    lineHeight: specs.lineHeight,
    color: specs.color || '#ffffff',
    letterSpacing: specs.letterSpacing,
    textTransform: specs.transform as any,
  };

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-gray-800/30 to-gray-900/30 border border-white/5 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-mono font-semibold text-white">{name}</h4>
        <Badge variant="outline" className="text-xs bg-white/5 border-white/10 text-gray-400">
          Text Style
        </Badge>
      </div>

      {/* Preview */}
      <div className="py-4 border-y border-white/5">
        <p style={style}>The quick brown fox jumps over the lazy dog</p>
      </div>

      {/* Specs */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500">Size:</span>
          <code className="ml-2 text-gray-300 font-mono">{specs.size}</code>
        </div>
        <div>
          <span className="text-gray-500">Weight:</span>
          <code className="ml-2 text-gray-300 font-mono">{specs.weight}</code>
        </div>
        <div>
          <span className="text-gray-500">Line Height:</span>
          <code className="ml-2 text-gray-300 font-mono">{specs.lineHeight}</code>
        </div>
        {specs.letterSpacing && (
          <div>
            <span className="text-gray-500">Tracking:</span>
            <code className="ml-2 text-gray-300 font-mono">{specs.letterSpacing}</code>
          </div>
        )}
        {specs.transform && (
          <div>
            <span className="text-gray-500">Transform:</span>
            <code className="ml-2 text-gray-300 font-mono">{specs.transform}</code>
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="pt-2 border-t border-white/5">
        <p className="text-xs text-gray-400">
          <span className="text-gray-500">Usage:</span> {specs.usage}
        </p>
      </div>
    </div>
  );
}

export function DesignTokensShowcase() {
  return (
    <div className="space-y-8">
      {/* Color Primitives */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Color Primitive Collection</CardTitle>
          <p className="text-sm text-gray-400">
            Base color variables mapped from CSS to Figma variable collections
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(colorPrimitives).map(([name, { hex, description }]) => (
            <ColorSwatch key={name} name={name} hex={hex} description={description} />
          ))}
          <div className="mt-6 p-4 bg-gray-950 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-2">Variable Binding</h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• <code className="text-blue-400">sys/bg/depth</code> → Main app background (#0a0a0c)</li>
              <li>• <code className="text-blue-400">sys/bg/surface</code> → Card and surface elements (#1a1a1e)</li>
              <li>• <code className="text-blue-400">sys/color/primary</code> → Primary actions and highlights (#3b82f6)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Glass Materials */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Glass Material Styles</CardTitle>
          <p className="text-sm text-gray-400">
            Figma styles for glass morphism effects from .glass and .glass-card classes
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {Object.entries(glassMaterials).map(([name, specs]) => (
              <GlassMaterialCard key={name} name={name} specs={specs} />
            ))}
          </div>
          <div className="mt-6 p-4 bg-gray-950 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-2">CSS Source Mapping</h4>
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-gray-500 mb-1">From <code className="text-blue-400">.glass</code> class:</p>
                <code className="block p-2 bg-black/40 rounded text-gray-300 font-mono">
                  background: rgba(255, 255, 255, 0.05);<br />
                  border: 1px solid rgba(255, 255, 255, 0.1);
                </code>
              </div>
              <div>
                <p className="text-gray-500 mb-1">From <code className="text-blue-400">.glass-card</code> class:</p>
                <code className="block p-2 bg-black/40 rounded text-gray-300 font-mono">
                  @apply rounded-xl; /* 12px radius */<br />
                  + base glass + drop shadow
                </code>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Typography Scale */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Typography Scale (System UI)</CardTitle>
          <p className="text-sm text-gray-400">
            Text styles extracted from MpProfileView and component usage patterns
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(typographyScale).map(([name, specs]) => (
            <TypographyExample key={name} name={name} specs={specs} />
          ))}
          <div className="mt-6 p-4 bg-gray-950 rounded-lg">
            <h4 className="text-sm font-semibold text-white mb-2">Font Stack</h4>
            <code className="block text-xs text-gray-400 font-mono">
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Wrapper Component */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Component: Wrapper/Glass_Card</CardTitle>
          <p className="text-sm text-gray-400">
            Reusable glass card wrapper component with Material/Glass/Flat style
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Example Usage */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white">Example Usage:</h4>
              
              {/* Sizes */}
              <div className="grid md:grid-cols-3 gap-4">
                <div
                  className="p-6 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <p className="text-sm text-white font-medium mb-1">Small Card</p>
                  <p className="text-xs text-gray-400">Padding: 24px</p>
                </div>
                
                <div
                  className="p-8 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <p className="text-sm text-white font-medium mb-1">Medium Card</p>
                  <p className="text-xs text-gray-400">Padding: 32px</p>
                </div>
                
                <div
                  className="p-10 rounded-xl"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <p className="text-sm text-white font-medium mb-1">Large Card</p>
                  <p className="text-xs text-gray-400">Padding: 40px</p>
                </div>
              </div>
            </div>

            {/* Specs */}
            <div className="p-4 bg-gray-950 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-3">Component Specifications</h4>
              <div className="grid md:grid-cols-2 gap-4 text-xs">
                <div>
                  <h5 className="text-white font-semibold mb-2">Base Properties:</h5>
                  <ul className="text-gray-400 space-y-1">
                    <li>• Style: Material/Glass/Flat (applied)</li>
                    <li>• Corner Radius: 12px (rounded-xl)</li>
                    <li>• Effect: Drop Shadow (Blur 20, Y 10, Black/20)</li>
                  </ul>
                </div>
                <div>
                  <h5 className="text-white font-semibold mb-2">Variants:</h5>
                  <ul className="text-gray-400 space-y-1">
                    <li>• Size/Small: Padding 24px</li>
                    <li>• Size/Medium: Padding 32px</li>
                    <li>• Size/Large: Padding 40px</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
