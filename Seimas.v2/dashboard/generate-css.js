import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read tokens.json
const tokensPath = path.join(__dirname, 'design-system/tokens.json');
const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf-8'));

// Generate CSS custom properties
let css = ':root {\n';
css += '  /* Colors */\n';

if (tokens.collections.Colors) {
  const colors = tokens.collections.Colors.variables;
  for (const [name, data] of Object.entries(colors)) {
    const cssVarName = `--${name.toLowerCase().replace(/\//g, '-')}`;
    css += `  ${cssVarName}: ${data.value};\n`;
  }
}

css += '\n  /* Typography */\n';
if (tokens.collections.Typography) {
  const typography = tokens.collections.Typography.variables;
  for (const [name, data] of Object.entries(typography)) {
    const cssVarName = `--text-${name.toLowerCase().replace(/\//g, '-')}`;
    css += `  ${cssVarName}: ${data.value};\n`;
  }
}

css += '\n  /* Spacing */\n';
if (tokens.collections.Spacing) {
  const spacing = tokens.collections.Spacing.variables;
  for (const [name, data] of Object.entries(spacing)) {
    const cssVarName = `--${name.toLowerCase().replace(/\//g, '-')}`;
    css += `  ${cssVarName}: ${data.value}px;\n`;
  }
}

css += '}\n';

// Write to index.css
const cssPath = path.join(__dirname, 'src/index.css');
let existingCss = fs.readFileSync(cssPath, 'utf-8');

// Keep existing CSS, prepend design tokens
const finalCss = css + '\n' + existingCss;
fs.writeFileSync(cssPath, finalCss);

console.log('✅ CSS custom properties generated and applied to src/index.css');
console.log(`Generated ${Object.keys(tokens.collections.Colors.variables).length + Object.keys(tokens.collections.Typography.variables).length + Object.keys(tokens.collections.Spacing.variables).length} CSS variables`);
