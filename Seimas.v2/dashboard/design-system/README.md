# Transparent Parliament Design System

Design tokens extracted from the Storybook component library, ready for Figma import.

## Quick Start

### 1. Figma Setup

1. Open your Figma file: `A09iuI2IyCbtqyaUT9shYT`
2. **Create Styles** (Recommended for Starter Plan):
   - Draw rectangles and create **Color Styles** named matching our system (e.g., `Primary/500`, `Background/Base`).
   - Draw text and create **Text Styles**.

**Note on Styles vs Variables:**
Since your token has standard scopes, we will use **Figma Styles**.
- Variables are newer but require specific Enterprise/Org scopes.
- Styles work on all plans and with standard tokens.

### 2. Required Styles (Create these in Figma)

Create these Color Styles in your Figma file and **apply them to at least one object** (the script needs to find an object with the style to read its value).

| Style Name | Value (Hex) |
|------------|-------------|
| `Background/Base` | `#0a0a0c` |
| `Background/Surface` | `#1a1a1e` |
| `Primary/500` | `#3b82f6` |
| `Text/Primary` | `#ffffff` |

### 3. Sync Back to Code

```bash
# Set environment variables
export FIGMA_API_KEY="your-token"
export FIGMA_FILE_ID="A09iuI2IyCbtqyaUT9shYT"

# Run the sync script
npm run sync:tokens
```

---

## Token Reference

### Colors
| Token | Value |
|-------|-------|
| `Background/Base` | `#0a0a0c` |
| `Background/Surface` | `#1a1a1e` |
| `Primary/500` | `#3b82f6` |
| `Text/Primary` | `#ffffff` |
