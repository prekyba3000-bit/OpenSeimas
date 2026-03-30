# Quick Setup: Figma + GitHub Integration

## ⚡ 5-Minute Setup

### 1. Add GitHub Secrets (Automated)

```bash
# From repo root (replace YOUR_FIGMA_TOKEN with your actual token)
bash scripts/setup-github-secrets.sh "YOUR_FIGMA_TOKEN" "prekyba3000-bit/Seimas.v2"
```

Then authenticate with GitHub when prompted.

### 2. Local Development Setup

```bash
cd dashboard
cp .env.example .env
```

Edit `.env`:
```
FIGMA_API_KEY=your_figma_personal_access_token_here
FIGMA_FILE_ID=A09iuI2IyCbtqyaUT9shYT
```

### 3. Test Sync

```bash
npm run sync:tokens
```

Expected output:
- Updates `design-system/tokens.json`
- Regenerates `src/index.css`

### 4. Verify Setup

Check that files updated:
```bash
git status
# Should show:
#   design-system/tokens.json (modified)
#   src/index.css (modified)
```

---

## 📚 Resources

| Resource | Link |
|----------|------|
| **Setup Guide** | [FIGMA_GITHUB_INTEGRATION.md](docs/FIGMA_GITHUB_INTEGRATION.md) |
| **Design System** | [dashboard/design-system/README.md](dashboard/design-system/README.md) |
| **Figma File** | https://www.figma.com/file/A09iuI2IyCbtqyaUT9shYT |
| **GitHub Actions** | https://github.com/prekyba3000-bit/Seimas.v2/actions |
| **GitHub Secrets** | https://github.com/prekyba3000-bit/Seimas.v2/settings/secrets/actions |

---

## 🔄 Daily Workflow

### For Designers
1. Open [Figma File](https://www.figma.com/file/A09iuI2IyCbtqyaUT9shYT)
2. Make design changes
3. Create/update Color Styles with naming: `Category/Name`
4. Apply styles to design objects
5. Push changes (autosync happens via GitHub Actions)

### For Developers
1. Pull latest from git: `git pull`
2. Run `npm run sync:tokens` to fetch latest
3. Changes auto-included in CSS variables
4. Use tokens in components: `className="bg-primary-500"`

### For DevOps
1. Secrets configured? Check [here](https://github.com/prekyba3000-bit/Seimas.v2/settings/secrets/actions)
2. Workflow running? Check [Actions tab](https://github.com/prekyba3000-bit/Seimas.v2/actions)
3. Token expires? Regenerate at [Figma Settings](https://www.figma.com/settings/at_tokens)

---

## 🛠 Troubleshooting

| Issue | Solution |
|-------|----------|
| Sync fails locally | Check `.env` has `FIGMA_API_KEY` |
| Token expired | [Regenerate at Figma](https://www.figma.com/settings/at_tokens) → Update GitHub Secret |
| GitHub Action failing | Check [Actions tab](https://github.com/prekyba3000-bit/Seimas.v2/actions?query=workflow%3A%22Sync%20Figma%22) for errors |
| Styles not found | Ensure styles are applied to objects in Figma |

---

## 📋 Checklist

- ✅ GitHub Secrets set (`FIGMA_API_KEY`, `FIGMA_FILE_ID`)
- ✅ `.env` file created with credentials
- ✅ `npm run sync:tokens` works locally
- ✅ GitHub Action configured (`.github/workflows/sync-figma-tokens.yml`)
- ✅ Figma styles created and applied to objects
- ✅ Team members notified of new workflow
