/**
 * Design Token Sync: Figma → CSS Custom Properties
 *
 * Supports two sources:
 * 1. Figma Variables (Preferred, requires file_variables:read scope)
 * 2. Figma Styles (Fallback, works with standard file_content:read scope)
 *
 * Usage:
 *   FIGMA_API_KEY=xxx FIGMA_FILE_ID=xxx npx tsx scripts/sync-tokens.ts
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIGMA_API_KEY = process.env.FIGMA_API_KEY;
const FIGMA_FILE_ID = process.env.FIGMA_FILE_ID;

// --- Interfaces ---

interface FigmaVariable {
  id: string;
  name: string;
  resolvedType: "COLOR" | "FLOAT" | "STRING";
  valuesByMode: Record<string, any>;
}

interface FigmaVariablesResponse {
  status?: number;
  error?: boolean;
  meta?: {
    variables: Record<string, FigmaVariable>;
  };
}

interface FigmaStyle {
  key: string;
  name: string;
  styleType: "FILL" | "TEXT" | "EFFECT" | "GRID";
  description: string;
}

interface FigmaNode {
  id: string;
  name: string;
  type: string;
  children?: FigmaNode[];
  styles?: Record<string, string>; // Maps styleType to styleID
  fills?: any[];
  style?: any; // For text styles
}

interface FigmaFileResponse {
  document: FigmaNode;
  styles: Record<string, FigmaStyle>;
}

// --- Helpers ---

function rgbaToHex(color: {
  r: number;
  g: number;
  b: number;
  a?: number;
}): string {
  const toHex = (n: number) =>
    Math.round(n * 255)
      .toString(16)
      .padStart(2, "0");
  const hex = `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  if (color.a !== undefined && color.a < 1) {
    return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a.toFixed(2)})`;
  }
  return hex;
}

function toKebabCase(str: string): string {
  return str
    .replace(/\//g, "-")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "-") // Remove non-alphanumeric chars
    .replace(/--+/g, "-") // Remove multiple dashes
    .toLowerCase();
}

// --- Fetchers ---

async function fetchFigmaVariables(): Promise<FigmaVariablesResponse | null> {
  try {
    const response = await fetch(
      `https://api.figma.com/v1/files/${FIGMA_FILE_ID}/variables/local`,
      { headers: { "X-Figma-Token": FIGMA_API_KEY! } },
    );
    if (!response.ok) return null;
    return response.json();
  } catch (e) {
    return null;
  }
}

async function fetchFigmaFile(): Promise<FigmaFileResponse> {
  const response = await fetch(
    `https://api.figma.com/v1/files/${FIGMA_FILE_ID}`,
    { headers: { "X-Figma-Token": FIGMA_API_KEY! } },
  );

  if (!response.ok) {
    throw new Error(
      `Figma API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

// --- Generators ---

function generateFromVariables(data: FigmaVariablesResponse): string[] {
  const lines: string[] = [];
  if (!data.meta?.variables) return lines;

  for (const variable of Object.values(data.meta.variables)) {
    const cssName = `--${toKebabCase(variable.name)}`;
    const modeId = Object.keys(variable.valuesByMode)[0];
    const value = variable.valuesByMode[modeId];

    if (
      variable.resolvedType === "COLOR" &&
      typeof value === "object" &&
      "r" in value
    ) {
      lines.push(`  ${cssName}: ${rgbaToHex(value)};`);
    } else if (variable.resolvedType === "FLOAT") {
      const name = variable.name.toLowerCase();
      const unit =
        name.includes("space") ||
        name.includes("radius") ||
        name.includes("size")
          ? "px"
          : "";
      lines.push(`  ${cssName}: ${value}${unit};`);
    }
  }
  return lines;
}

function traverseNodesForStyles(
  node: FigmaNode,
  styles: Record<string, FigmaStyle>,
  definitions: string[],
) {
  // If node has styles attached
  if (node.styles) {
    for (const [styleType, styleId] of Object.entries(node.styles)) {
      const styleDef = styles[styleId];
      if (!styleDef) continue;

      const cssName = `--${toKebabCase(styleDef.name)}`;

      // 1. FILL (Colors)
      if (styleType === "fill" && node.fills && node.fills.length > 0) {
        const fill = node.fills[0];
        if (fill.type === "SOLID" && fill.color) {
          // Basic dedup check
          if (!definitions.some((d) => d.startsWith(`  ${cssName}:`))) {
            definitions.push(
              `  ${cssName}: ${rgbaToHex({ ...fill.color, a: fill.opacity ?? 1 })};`,
            );
          }
        }
      }

      // 2. TEXT (Typography)
      // Note: Typography is complex to flatten to single variables, usually requires mixins or multiple vars
      // For this script, we'll just extract font-size as a simple example if needed
    }
  }

  if (node.children) {
    node.children.forEach((child) =>
      traverseNodesForStyles(child, styles, definitions),
    );
  }
}

async function main() {
  if (!FIGMA_API_KEY || !FIGMA_FILE_ID) {
    console.error("❌ Error: FIGMA_API_KEY and FIGMA_FILE_ID required");
    process.exit(1);
  }

  console.log("🎨 Syncing design tokens...");

  const cssLines: string[] = [
    "/* ============================================",
    "   AUTO-GENERATED FROM FIGMA - DO NOT EDIT",
    `   Synced: ${new Date().toISOString()}`,
    `   File ID: ${FIGMA_FILE_ID}`,
    "   ============================================ */",
    "",
    ":root {",
  ];

  // 1. Try Variables first
  const variablesData = await fetchFigmaVariables();
  if (variablesData) {
    console.log("   ✅ Using Figma Variables API");
    cssLines.push(...generateFromVariables(variablesData));
  } else {
    console.log(
      "   ⚠️  Variables API access denied or unavailable. Falling back to Styles.",
    );

    // 2. Fallback to Styles (requires traversing the document to find values)
    const fileData = await fetchFigmaFile();
    const styleDefinitions: string[] = [];

    // We have to traverse the document to find the *values* of the styles
    // because the top-level styles object only gives metadata, not values.
    traverseNodesForStyles(
      fileData.document,
      fileData.styles,
      styleDefinitions,
    );

    if (styleDefinitions.length === 0) {
      console.log("   ℹ️  No styles found applied to objects in the file.");
      console.log(
        "      To export styles, apply them to at least one object in your Figma file.",
      );
    } else {
      console.log(`   ✅ Found ${styleDefinitions.length} style definitions`);
      cssLines.push(...styleDefinitions.sort());
    }
  }

  cssLines.push("}");

  const outputDir = path.join(__dirname, "..", "src", "styles");
  const outputPath = path.join(outputDir, "variables.css");

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, cssLines.join("\n"));

  console.log(`✅ Generated: ${outputPath}`);
}

main();
