A couple of things worth spelling out beyond the diagrams:
Why the sidebar doesn't flicker/reload on navigation: App.js has two nested <Routes> — an outer one that decides "logged in or not," and an inner one (inside ProtectedAppLayout) that only swaps what's in the content Box. Sidebar and Topbar live outside that inner <Routes>, so React never unmounts them — only the page content underneath changes. That's the whole trick behind why it feels like an app instead of a website with page reloads.
Quick "where do I look" reference:
You want to...	Touch these files
Add a brand-new page	New file in scenes/<name>/index.jsx → add <Route> in App.js → add <Item> in Sidebar.jsx
Edit an existing page's content	Just that page's file in scenes/ — nothing else
Change the nav menu structure	Sidebar.jsx only
Change search/notifications/profile menu	Topbar.jsx only
Change colors/fonts app-wide	theme.js
Change login/auth behavior	context/AuthContext.jsx, components/ProtectedRoute.jsx
Add/edit a home dashboard section	data/homeDashboardMockData.js (the data) + scenes/home/index.jsx (which sections show) — DashboardSection.jsx itself rarely needs touching
Add a DB column	db/schema.sql (or a migration file, per our earlier conversation) — then wherever you map a DB row to the shape a component expects
That last row is really the guardrail for the "growing monster" feeling: as long as new features follow this same pattern (a scenes/ file for the page, a line in App.js, a line in Sidebar.jsx), the project stays flat and predictable no matter how many pages you add — the complexity doesn't compound, it just adds one more row to that table.