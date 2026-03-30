# Accessibility Plan (WCAG): Skaidrus Seimas

## Overview
To comply with NGI Zero "internet commons" standards, Skaidrus Seimas must be accessible to all users. This plan outlines the technical requirements for the data layer and future UI.

## Data Layer Alignment
To support accessible UIs, the following fields have been added to the `politicians` table:
- `photo_url`: To provide visual identification.
- `bio`: To provide context and text-based descriptions.

### Alt-Text Strategy
- For politician photos, the frontend **MUST** use the `display_name` (e.g., "Nuotrauka: [Vardas Pavardė]") as alt-text.
- For charts and data visualizations, a tabular data alternative **MUST** be provided for screen readers.

## UI Compliance Goals (WCAG 2.1 AA)
1. **Perceivable**: 
   - Text alternatives for non-text content.
   - High contrast themes (already targeted by Glassmorphism design).
2. **Operable**:
   - Keyboard navigation for all search and filter components.
   - No time-limited interactions.
3. **Understandable**:
   - Clear language (Lithuanian) with proper `<html lang="lt">` tags.
   - Consistent navigation.
4. **Robust**:
   - Valid HTML structure to support assistive technologies.

## Summary of Action Items
- [x] Add photo and bio fields to database.
- [ ] Update ingestion scripts to fetch MP photos.
- [ ] Audit frontend components for keyboard trap and contrast.
