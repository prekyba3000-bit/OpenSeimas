import fs from "fs";
import path from "path";

// Configuration
const UX_ROOT = "/home/julio/Documents/seimas v2/UX";
const SOURCE_THEME_PATH = path.join(UX_ROOT, "src/styles/theme.css");
const SOURCE_COMPONENTS_PATH = path.join(UX_ROOT, "src/app/components");

const TARGET_ROOT = process.cwd();
const TARGET_CSS_PATH = path.join(TARGET_ROOT, "src/index.css");
const TARGET_COMPONENTS_PATH = path.join(TARGET_ROOT, "src/components");

function syncDesignSystem() {
  console.log("🎨 Starting Design System Sync...");

  // 1. Sync Theme
  if (fs.existsSync(SOURCE_THEME_PATH)) {
    console.log(`Syncing Theme: ${SOURCE_THEME_PATH} -> ${TARGET_CSS_PATH}`);
    try {
      const sourceContent = fs.readFileSync(SOURCE_THEME_PATH, "utf-8");
      const finalContent = `@import "tailwindcss";\n\n${sourceContent}`;
      fs.writeFileSync(TARGET_CSS_PATH, finalContent, "utf-8");
      console.log("✅ Theme synced.");
    } catch (e) {
      console.error("❌ Failed to sync theme:", e);
    }
  } else {
    console.error("❌ Source theme file not found!");
  }

  // 2. Sync Components
  if (fs.existsSync(SOURCE_COMPONENTS_PATH)) {
    console.log(
      `Syncing Components: ${SOURCE_COMPONENTS_PATH} -> ${TARGET_COMPONENTS_PATH}`,
    );
    try {
      // Create target dir if implies
      if (!fs.existsSync(TARGET_COMPONENTS_PATH)) {
        fs.mkdirSync(TARGET_COMPONENTS_PATH, { recursive: true });
      }

      fs.cpSync(SOURCE_COMPONENTS_PATH, TARGET_COMPONENTS_PATH, {
        recursive: true,
        force: true,
      });
      console.log("✅ Components synced.");
    } catch (e) {
      console.error("❌ Failed to sync components:", e);
    }
  } else {
    console.error("❌ Source components directory not found!");
  }
}

syncDesignSystem();
