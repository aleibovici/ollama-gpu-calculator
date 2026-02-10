# Ollama GPU Calculator — UI/UX Analysis & Improvement Proposals

## Executive summary

The calculator is functional and uses a clear compatibility (green / yellow / red) pattern. Main opportunities: **clearer hierarchy**, **better form feedback**, **less cognitive load** (especially in results and notes), **stronger mobile behavior**, and **fixing a few concrete bugs** that affect clarity and robustness.

---

## 1. Information architecture & visual hierarchy

### Current state
- Single long page: hero/title → CTA links → form → results → long notes.
- No clear “above the fold” value statement.
- Results and notes compete for attention; notes are very long.

### Proposals
- **Add a one-line value proposition** under the title, e.g.  
  *“Check if your GPU can run Ollama models and see estimated VRAM, performance, and power.”*
- **Visually separate sections**: wrap “Inputs” and “Results” in distinct cards or panels (reuse `--bg-card`, `--border-color`) so the flow is: configure → see outcome.
- **Short summary at top of results**: e.g. “**12 GB VRAM** needed · **Compatible**” before the detailed breakdown, so the answer is visible without scrolling.

---

## 2. Form UX

### 2.1 Model parameters input (bug + clarity)
- **Bug**: `onChange` uses `setParameters(parseFloat(e.target.value))`. Clearing the field gives `parseFloat('')` → `NaN`, and `value={parameters}` can show “NaN” in the input.
- **Fix**: Keep the value as a string in state, or coerce empty to `''` and only parse on calculate; display `value={parameters === '' || Number.isNaN(parameters) ? '' : parameters}` (or equivalent) so the field never shows “NaN”.
- **Clarity**: Add a short hint under the input: “e.g. 7 for Llama 7B, 70 for Llama 70B” and optionally show min/max (0.1–200) in the placeholder or hint.

### 2.2 GPU selection
- **Problem**: One long flat list of 50+ GPUs is hard to scan.
- **Proposals**:
  - **Group by vendor/generation** in the dropdown (e.g. “NVIDIA — Ada”, “NVIDIA — Ampere”, “AMD — RDNA4”, “Apple Silicon”). Use `<optgroup>` or a custom select with sections.
  - **Search/filter**: For a single native `<select>`, consider a combobox pattern (input + filtered list) so users can type “RTX 40” or “M3” and narrow options.
- **Small fix**: Ensure the first option is “Select GPU model” and that it’s obvious the field is required (e.g. inline validation message when “Calculate” or auto-run happens with no GPU selected).

### 2.3 Quantization & context length
- **Problem**: Terms like “4-bit (INT4)” and “32k tokens” may be unclear to some users.
- **Proposals**:
  - **Short inline hints**: e.g. under Quantization: “Lower bits = less VRAM, faster, slight quality tradeoff.” Under Context length: “Longer context = more VRAM.”
  - **Associate labels with controls**: Give the Context Length `<select>` an `id` and use `<label htmlFor="context-length">` so screen readers and clicks work correctly.

### 2.4 GPU rows (add/remove)
- “Add Another GPU” is clear. Consider an icon (e.g. “+”) next to the text for quick recognition.
- **Remove**: For “Remove”, ensure the button has an `aria-label` that includes which GPU (e.g. “Remove GPU 2”) when there are multiple rows.

---

## 3. Results section

### 3.1 Compatibility message (strength)
- The three states (Compatible / Borderline / Insufficient VRAM) with color and icon are clear. Keep this pattern.

### 3.2 Results card density
- **Problem**: Required VRAM, Available VRAM, System RAM, tokens/sec, and power are all in one block with similar visual weight.
- **Proposals**:
  - **Primary metric first**: e.g. one big “Required: 12 GB” and “You have: 24 GB” (or a small “12 GB needed” + “Compatible” badge).
  - **Group by meaning**: e.g. “VRAM” (required + available + margin), “System” (system RAM), “Performance” (tokens/s), “Power” (total + breakdown). Use subheadings or a simple grid.
  - **Progressive disclosure**: Optional “Show breakdown” to expand base model size, KV cache, power per GPU, etc., so the first view is a quick summary.

### 3.3 Power consumption
- The per-GPU and system overhead breakdown is useful. Consider a small bar or visual (e.g. “GPU 350W ████████ System 75W ██”) so power distribution is scannable.

---

## 4. Notes section

### Current state
- Many bullets (20+) in one list; important for power users but overwhelming for quick checks.

### Proposals
- **Collapse by default**: “Notes & tips” as a collapsible section (expanded on first visit or when user clicks).
- **Group bullets**: e.g. “Requirements”, “Platform (OS/CPU)”, “Performance tips”, “Power & multi-GPU”. Shorter sub-lists are easier to scan.
- **Move some content**: Put “Minimum system: 8 GB RAM, 10 GB storage” and “Supported OS: …” near the system RAM result or in a small “System requirements” callout so they’re visible without expanding notes.

---

## 5. Feedback & validation

### 5.1 Replace `alert()` with inline validation
- **Current**: Validation uses `alert()` (e.g. invalid parameters, no GPU selected). Alerts are blocking and not ideal for accessibility or modern UX.
- **Proposal**: Show inline messages next to the relevant field (e.g. under “Model Parameters” or under “GPU Configuration”) and optionally a small banner at the top: “Please fix the issues below.” Keep focus in the form; avoid stealing focus with a modal.

### 5.2 Auto-calculation feedback
- Results update on change (good). If calculations ever become heavier, consider a short “Updating…” state or a debounce so the UI doesn’t feel laggy. For current speed this may be optional.

---

## 6. Accessibility

### Strengths
- Dark mode toggle has `aria-label`, `role="switch"`, `aria-checked`, and keyboard support.
- Labels are present for most inputs.

### Improvements
- **Link hover**: Reddit/GitHub buttons use `onMouseEnter={(e) => { e.target.style... }}`. If the link contains nested elements, `e.target` can be the child; use `e.currentTarget` so the link itself is always styled.
- **Focus visibility**: Ensure all interactive elements (inputs, selects, buttons, links) have a visible focus ring (e.g. `outline: 2px solid var(--accent-primary)`). Dark mode already has `.dark-mode *:focus`; ensure light mode has an equivalent.
- **Contrast**: Verify success/warning/error text and backgrounds against WCAG 2.1 AA (e.g. 4.5:1 for normal text). Current CSS variables look reasonable but should be checked with a contrast checker.
- **Reduced motion**: `@media (prefers-reduced-motion: reduce)` is present; ensure any custom animations (e.g. on the dark mode icon) are also disabled when this preference is set.

---

## 7. Visual design & layout

### 7.1 Typography
- **Inconsistency**: Calculator uses `fontFamily: 'Arial, sans-serif'`; `index.css` uses system font stack. Unify on one (e.g. system stack everywhere) for a more cohesive feel.

### 7.2 Dark mode toggle
- **Overlap risk**: Fixed position (top-right) can overlap content on small viewports or when zoomed.
- **Proposal**: On narrow screens (e.g. `< 480px`), consider moving the toggle into the main content flow (e.g. top of the calculator card) or reducing size so it doesn’t cover the form.

### 7.3 CTA links (Reddit / GitHub)
- Styling is consistent. Ensure they don’t wrap awkwardly on mobile; “Discuss on Reddit” and “Star on GitHub” can sit on two lines with a small gap if needed.

---

## 8. Mobile & responsive

### Current state
- `maxWidth: 600px` keeps content readable; good base.

### Proposals
- **GPU row on small screens**: The row (GPU select + count + Remove) can be tight. Consider stacking: e.g. first row = GPU select (full width), second row = count + Remove. Or use a smaller count control (e.g. 1–4 as compact buttons).
- **Touch targets**: Buttons and selects have sufficient height (e.g. 50px); keep minimum 44px for touch.
- **Viewport**: Confirm `viewport` meta tag is set (already in `index.html`); ensure no horizontal scroll on 320px width.

---

## 9. Technical robustness

### 9.1 Select dropdown arrow (potential bug)
- **Current**: Custom dropdown arrow uses  
  `getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')` in an inline SVG data URL.  
  - If run before DOM is ready or in SSR, `document.documentElement` may not have computed styles.  
  - `.slice(1)` assumes the value is a hex color (`#xxx`); it can break with `rgb()` or if the variable has spaces.
- **Proposal**: Use a static fallback color in the SVG (e.g. `%236b7280` for gray) or a CSS-based chevron (e.g. `background-image` from a small SVG file or a pseudo-element) so the arrow never depends on runtime `getComputedStyle` or hex parsing.

### 9.2 Initial dark mode state
- `useState(getStoredPreference)` relies on React’s lazy initializer behavior (function is called once). Code is correct; no change needed. If you ever add SSR, ensure the initial HTML doesn’t flash the wrong theme (e.g. inject a script in `<head>` that sets a class based on `localStorage` before first paint).

---

## 10. Prioritized action list

| Priority | Area              | Action |
|----------|-------------------|--------|
| P0       | Form / bug        | Fix parameters input so it never shows “NaN”; keep empty state as empty string. |
| P0       | Validation        | Replace `alert()` with inline validation messages. |
| P1       | Hierarchy         | Add one-line value proposition; separate Input vs Results with clear sections. |
| P1       | Results           | Add a one-line summary at top of results (e.g. “12 GB needed · Compatible”). |
| P1       | A11y              | Use `e.currentTarget` for link hovers; ensure all controls have visible focus. |
| P2       | GPU select         | Group GPUs with `<optgroup>` (or add search) to make selection easier. |
| P2       | Notes             | Make notes collapsible and optionally group by topic. |
| P2       | Select arrow      | Replace dynamic getComputedStyle arrow with CSS or static SVG. |
| P3       | Quantization/context | Add short hints under Quantization and Context length. |
| P3       | Mobile            | Adjust GPU row layout on narrow screens; ensure dark mode toggle doesn’t overlap. |
| P3       | Typography        | Use one consistent font stack (e.g. system stack) across the app. |

---

## Summary

Focusing on **P0** (parameters NaN fix and inline validation) and **P1** (value proposition, sectioning, results summary, and link/focus behavior) will give the biggest UX gain with minimal risk. **P2** improves discoverability (GPU list, notes) and robustness (dropdown arrow). **P3** polishes clarity and responsiveness. The existing compatibility message and dark mode are solid foundations to build on.
