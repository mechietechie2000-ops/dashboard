# Question the overall font size is small, where is that configured for Dashboard Items? give me the line number and property
Two places control this, depending on scope you want:

Global base size (affects body1/body2 everywhere, so all dashboard item text scales up):
frontend/src/theme.js, line 167 — fontSize: 12 inside the typography block. MUI derives body1/body2 etc. from this base. Bump it (e.g. to 14).

Dashboard-items-only (scoped, doesn't touch the rest of the app):
frontend/src/components/DashboardSection.jsx:

Line 49 — the primary text <Typography> has no variant set (defaults to body1). Add variant="body1" explicitly, or just set sx={{ fontSize: "0.95rem" }} there.
Line 62 — secondary text, variant="body2" — change to a larger variant or add sx={{ fontSize: "0.85rem" }}.
Line 75 — meta text (the date/price on the right), same variant="body2" — same fix.
If you want it dashboard-wide but not global-global, DashboardSection's three Typography lines (49, 62, 75) are the ones to touch. If you're fine with it affecting the whole app's body text, line 167 in theme.js is the one-line fix.

# Ques: Can it be increased only for mobile view but not for web?

Yes — the app already uses MUI's responsive object syntax ({ xs: ..., sm: ... }) elsewhere, so the cleanest fix is the same pattern, scoped to DashboardSection.jsx (not the global theme.js, since that would need a full breakpoint-aware typography override — messier).

In frontend/src/components/DashboardSection.jsx, change the sx (or add one) on the three Typography elements to a responsive fontSize object:

```
sx={{
  fontSize: { xs: "1rem", sm: "0.875rem" },   // bigger on mobile, normal on desktop
  wordBreak: "break-word",
  overflowWrap: "anywhere",
}}
```
Line 53 (primary) — merge into its existing sx block, e.g. fontSize: { xs: "1.25rem", sm: "0.875rem" }
Line 64 (secondary) — same object, e.g. { xs: "0.9rem", sm: "0.75rem" }
Line 78 (meta) — currently sx={{ flexShrink: 0 }} — add fontSize: { xs: "0.9rem", sm: "0.75rem" } alongside flexShrink: 0
xs = mobile breakpoint (<600px), sm and up = your normal web size — MUI applies whichever matches the current viewport automatically, no JS/useMediaQuery needed.


# Ques: On mobile I see the vertical gap on both side of the screen, I want to lower that gap to fill the screen with content? what changes I need, give me file and line number ?

Found it — frontend/src/scenes/home/index.jsx, line 51:

```
<Box m="20px">
This is a fixed 20px margin on all four sides, same on mobile and desktop. On a narrow phone screen, 20px left+right eats a much bigger share of the width than it does on desktop, which is the "vertical gap on both sides" you're seeing.
```

Fix — make it responsive, smaller on mobile, same as before on desktop:

```
<Box m={{ xs: "8px", sm: "20px" }}>
Same pattern as the other responsive spots in this file (line 56, 94). xs = mobile, tightens the side gaps; sm and up keeps your current desktop spacing untouched.
```

Careful — line 94 wasn't a page-gap property, it's the Modal box width (the popup for adding a renewal/reminder/etc.), and setting it to "0px" will make that popup invisible on mobile (zero width). Revert that one:

jsx
width: { xs: "90%", sm: 420 },

Line 56 is unrelated to spacing/gaps — it's gridTemplateColumns, controlling how many dashboard-item columns show per breakpoint (1fr = 1 column on mobile, 2 on tablet, 3 on desktop). Leave it as-is; it's already correct and isn't causing the gap issue.

So net: only line 51 (m={{ xs: "0px", sm: "20px" }}) was the actual fix for the side-gap problem. Line 94 needs reverting back to "90%" or your modal will disappear on mobile.


how can I make the grid box curved at edges? which line?


Ran a command, viewed a file
Ran a command, viewed a file
Found it — frontend/src/components/DashboardSection.jsx, line 89:

jsx
borderRadius="4px"
This is the outer card box for every dashboard item (Routine, Reminders, Renewals, etc.) — it already has rounded corners, just a subtle 4px. Increase the value for a more visibly curved look, e.g.:

jsx
borderRadius="16px"
That's the only line that controls it — one shared component, so it updates every grid box at once.