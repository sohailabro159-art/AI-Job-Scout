/* =========================================================
   AI JOB SCOUT — DESIGN SYSTEM
   Apple / Notion / Linear / Arc / Raycast inspired
   ========================================================= */

/* ---------------------------------------------------------
   1. DESIGN TOKENS
   --------------------------------------------------------- */
:root {
  /* Color — surfaces */
  --bg-primary: #F5F5F7;
  --bg-secondary: #FFFFFF;
  --bg-elevated: #FCFCFD;
  --bg-sidebar: rgba(255, 255, 255, 0.72);
  --bg-overlay: rgba(29, 29, 31, 0.45);

  /* Color — text */
  --text-primary: #1D1D1F;
  --text-secondary: #6E6E73;
  --text-tertiary: #A1A1A6;
  --text-on-accent: #FFFFFF;

  /* Color — borders */
  --border-subtle: #E5E5E7;
  --border-strong: #D2D2D7;

  /* Color — brand / accent */
  --blue: #0071E3;
  --blue-hover: #0062C4;
  --blue-tint: rgba(0, 113, 227, 0.1);

  /* Color — semantic */
  --success: #34C759;
  --success-tint: rgba(52, 199, 89, 0.12);
  --warning: #FF9F0A;
  --warning-tint: rgba(255, 159, 10, 0.12);
  --danger: #FF453A;
  --danger-tint: rgba(255, 69, 58, 0.12);
  --info: #5AC8FA;
  --info-tint: rgba(90, 200, 250, 0.12);

  /* Priority colors (kanban / job cards) */
  --priority-high: var(--danger);
  --priority-high-tint: var(--danger-tint);
  --priority-medium: var(--warning);
  --priority-medium-tint: var(--warning-tint);
  --priority-low: var(--success);
  --priority-low-tint: var(--success-tint);

  /* Typography */
  --font-family: -apple-system, "SF Pro Display", "SF Pro Text", "Inter", "Segoe UI", Helvetica, Arial, sans-serif;
  --font-mono: "SF Mono", "IBM Plex Mono", ui-monospace, monospace;

  --text-display: 34px;
  --text-heading: 26px;
  --text-title: 20px;
  --text-subtitle: 17px;
  --text-body: 15px;
  --text-caption: 13px;
  --text-label: 12px;
  --text-small: 11px;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  --leading-tight: 1.2;
  --leading-normal: 1.5;
  --leading-relaxed: 1.7;

  /* Spacing scale (4px base) */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;

  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 999px;

  /* Shadows */
  --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 16px 40px rgba(0, 0, 0, 0.12);
  --shadow-focus: 0 0 0 4px var(--blue-tint);

  /* Blur */
  --blur-sm: blur(8px);
  --blur-md: blur(16px);
  --blur-lg: blur(28px);

  /* Opacity */
  --opacity-disabled: 0.45;
  --opacity-hover: 0.85;
  --opacity-subtle: 0.6;

  /* Transitions */
  --ease: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;
  --duration-slow: 340ms;

  /* Z-index scale */
  --z-base: 1;
  --z-sidebar: 10;
  --z-header: 20;
  --z-dropdown: 30;
  --z-modal: 100;
  --z-toast: 200;

  /* Layout */
  --sidebar-width: 264px;
  --container-max: 1280px;
  --header-height: 72px;
}

@media (prefers-color-scheme: dark) {
  /* Reserved for future dark theme — current build ships light, Apple-style */
}

/* ---------------------------------------------------------
   2. RESET & BASE
   --------------------------------------------------------- */
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-family: var(--font-family);
  font-size: var(--text-body);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

h1, h2, h3, h4, p, ul, table {
  margin: 0;
}

button, input, select, textarea {
  font-family: inherit;
  color: inherit;
}

a {
  color: var(--blue);
  text-decoration: none;
}
a:hover { text-decoration: underline; }

/* Custom scrollbar — Apple style */
* {
  scrollbar-width: thin;
  scrollbar-color: var(--border-strong) transparent;
}
*::-webkit-scrollbar { width: 8px; height: 8px; }
*::-webkit-scrollbar-track { background: transparent; }
*::-webkit-scrollbar-thumb {
  background: var(--border-strong);
  border-radius: var(--radius-full);
  border: 2px solid transparent;
  background-clip: padding-box;
}
*::-webkit-scrollbar-thumb:hover { background: var(--text-tertiary); }

/* Focus visibility */
:focus-visible {
  outline: 2px solid var(--blue);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.001ms !important;
    scroll-behavior: auto !important;
  }
}

/* ---------------------------------------------------------
   3. LAYOUT SHELL
   --------------------------------------------------------- */
#app {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  min-height: 100vh;
}

.main-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.main {
  padding: var(--space-8) var(--space-10) var(--space-16);
  max-width: var(--container-max);
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.view.hidden { display: none; }
.view { animation: fadeSlideIn var(--duration-slow) var(--ease); }

@keyframes fadeSlideIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------------------------------------------------------
   4. SIDEBAR
   --------------------------------------------------------- */
.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  z-index: var(--z-sidebar);
  background: var(--bg-sidebar);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border-right: 1px solid var(--border-subtle);
  padding: var(--space-6) var(--space-4);
  display: flex;
  flex-direction: column;
}

.brand {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-2);
  margin-bottom: var(--space-8);
}

.brand-mark {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--blue), #47A6FF);
  color: #fff;
  font-weight: var(--weight-semibold);
  font-size: var(--text-caption);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.brand-text { display: flex; flex-direction: column; line-height: 1.3; }
.brand-title { font-size: var(--text-subtitle); font-weight: var(--weight-semibold); letter-spacing: -0.01em; }
.brand-sub { font-size: var(--text-small); color: var(--text-secondary); }

.nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  font-weight: var(--weight-medium);
  text-align: left;
  padding: 10px var(--space-3);
  border-radius: var(--radius-sm);
  cursor: pointer;
  position: relative;
  transition: background var(--duration-fast) var(--ease), color var(--duration-fast) var(--ease);
}

.nav-icon {
  width: 18px;
  text-align: center;
  font-size: 15px;
  opacity: var(--opacity-subtle);
}

.nav-item:hover {
  background: rgba(0, 0, 0, 0.045);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--blue-tint);
  color: var(--blue);
}
.nav-item.active .nav-icon { opacity: 1; }

.nav-item.active::before {
  content: "";
  position: absolute;
  left: -8px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  border-radius: var(--radius-full);
  background: var(--blue);
}

.sidebar-footer {
  border-top: 1px solid var(--border-subtle);
  padding-top: var(--space-4);
  margin-top: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.sidebar-profile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-md);
}

.sidebar-avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #1D1D1F, #48484A);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-caption);
  font-weight: var(--weight-semibold);
  flex-shrink: 0;
}
.sidebar-avatar.small { width: 26px; height: 26px; font-size: var(--text-small); }

.sidebar-profile-text { display: flex; flex-direction: column; line-height: 1.3; }
.sidebar-profile-name { font-size: var(--text-caption); font-weight: var(--weight-semibold); }
.sidebar-profile-role { font-size: var(--text-small); color: var(--text-secondary); }

.storage-status {
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--text-tertiary);
  line-height: 1.5;
  padding: var(--space-2);
  background: rgba(0, 0, 0, 0.03);
  border-radius: var(--radius-sm);
}
.storage-status.ok { color: var(--success); }
.storage-status.warn { color: var(--warning); }

.sidebar-version {
  font-size: var(--text-small);
  color: var(--text-tertiary);
  padding: 0 var(--space-2);
}

/* ---------------------------------------------------------
   5. TOP HEADER
   --------------------------------------------------------- */
.topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-header);
  display: flex;
  align-items: center;
  gap: var(--space-6);
  height: var(--header-height);
  padding: 0 var(--space-10);
  background: rgba(245, 245, 247, 0.78);
  backdrop-filter: var(--blur-md);
  -webkit-backdrop-filter: var(--blur-md);
  border-bottom: 1px solid transparent;
  transition: border-color var(--duration-base) var(--ease), box-shadow var(--duration-base) var(--ease);
}

.topbar.scrolled {
  border-bottom-color: var(--border-subtle);
  box-shadow: var(--shadow-xs);
}

.topbar-greeting { line-height: 1.3; min-width: 0; }
.topbar-greeting h1 { font-size: var(--text-title); font-weight: var(--weight-semibold); letter-spacing: -0.01em; white-space: nowrap; }
.topbar-date { font-size: var(--text-caption); color: var(--text-secondary); }

.topbar-search {
  flex: 1;
  max-width: 420px;
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: var(--space-3);
  color: var(--text-tertiary);
  font-size: 14px;
  pointer-events: none;
}
.topbar-search input {
  width: 100%;
  padding: 9px var(--space-3) 9px 36px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  font-size: var(--text-caption);
  transition: border-color var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease);
}
.topbar-search input:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: var(--shadow-focus);
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-left: auto;
}

.icon-btn {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-full);
  border: 1px solid var(--border-subtle);
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: transform var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease);
}
.icon-btn:hover { transform: translateY(-1px); box-shadow: var(--shadow-sm); }
.icon-btn:active { transform: translateY(0); }

.notif-dot {
  position: absolute;
  top: 8px;
  right: 9px;
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: var(--danger);
  border: 1.5px solid var(--bg-secondary);
}

.avatar-btn { padding: 0; border-radius: var(--radius-full); }

/* ---------------------------------------------------------
   6. TYPOGRAPHY UTILITIES
   --------------------------------------------------------- */
.eyebrow {
  font-size: var(--text-small);
  font-weight: var(--weight-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--blue);
  margin-bottom: var(--space-2);
}

.page-head { margin-bottom: var(--space-2); }
.page-head-row { display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: var(--space-4); }
.page-head h2 { font-size: var(--text-heading); font-weight: var(--weight-semibold); letter-spacing: -0.015em; }
.page-sub { font-size: var(--text-caption); color: var(--text-secondary); margin-top: var(--space-2); max-width: 640px; line-height: var(--leading-relaxed); }

h3 { font-size: var(--text-subtitle); font-weight: var(--weight-semibold); letter-spacing: -0.01em; }

.empty-note { font-size: var(--text-caption); color: var(--text-tertiary); font-style: normal; padding: var(--space-4) 0; }

/* ---------------------------------------------------------
   7. CARDS & PANELS
   --------------------------------------------------------- */
.card, .panel {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-xs);
  transition: box-shadow var(--duration-base) var(--ease), transform var(--duration-base) var(--ease), border-color var(--duration-base) var(--ease);
}
.card:hover, .panel:hover {
  box-shadow: var(--shadow-sm);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.table-card { padding: 0; overflow: hidden; }

/* Hero card */
.hero-card {
  background: linear-gradient(135deg, #1D1D1F 0%, #2C2C2E 100%);
  color: #fff;
  border-radius: var(--radius-xl);
  padding: var(--space-8) var(--space-8);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-8);
  box-shadow: var(--shadow-md);
  flex-wrap: wrap;
}
.hero-text { max-width: 480px; }
.hero-card .eyebrow { color: #8FCBFF; }
.hero-card h2 { font-size: var(--text-display); font-weight: var(--weight-semibold); letter-spacing: -0.02em; color: #fff; }
.hero-sub { color: rgba(255,255,255,0.68); font-size: var(--text-body); margin-top: var(--space-3); line-height: var(--leading-relaxed); }

.hero-goal-card {
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  min-width: 220px;
  backdrop-filter: var(--blur-sm);
}
.goal-label { font-size: var(--text-small); color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.05em; }
.goal-value { font-size: var(--text-title); font-weight: var(--weight-semibold); color: #fff; margin: var(--space-2) 0 var(--space-3); }
.goal-progress { height: 6px; border-radius: var(--radius-full); background: rgba(255,255,255,0.15); overflow: hidden; }
.goal-progress-fill { height: 100%; background: var(--blue); border-radius: var(--radius-full); transition: width var(--duration-slow) var(--ease); }

/* ---------------------------------------------------------
   8. DASHBOARD GRIDS
   --------------------------------------------------------- */
.stat-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: var(--space-4);
}
.stat-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  box-shadow: var(--shadow-xs);
  transition: transform var(--duration-base) var(--ease), box-shadow var(--duration-base) var(--ease);
}
.stat-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }
.stat-num { display: block; font-size: var(--text-heading); font-weight: var(--weight-bold); letter-spacing: -0.02em; color: var(--text-primary); font-variant-numeric: tabular-nums; }
.stat-label { font-size: var(--text-caption); color: var(--text-secondary); }

.dash-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-5); }
.dash-grid-secondary { grid-template-columns: repeat(2, 1fr); }

.mini-list { display: flex; flex-direction: column; gap: var(--space-2); }
.mini-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease), transform var(--duration-fast) var(--ease);
}
.mini-item:hover { border-color: var(--blue); transform: translateX(2px); }
.mini-item .tag {
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-weight: var(--weight-semibold);
  padding: 3px 9px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.placeholder-list { display: flex; flex-direction: column; gap: var(--space-2); }
.placeholder-item {
  background: var(--blue-tint);
  color: var(--text-primary);
  font-size: var(--text-caption);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  line-height: var(--leading-normal);
}

.task-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--text-caption);
  padding: var(--space-2) var(--space-1);
  cursor: pointer;
}
.task-item input[type="checkbox"] { width: 17px; height: 17px; accent-color: var(--blue); cursor: pointer; }

.quick-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }

/* ---------------------------------------------------------
   9. BUTTONS
   --------------------------------------------------------- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  font-size: var(--text-caption);
  font-weight: var(--weight-medium);
  padding: 10px var(--space-5);
  border-radius: var(--radius-full);
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: transform var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease), background var(--duration-fast) var(--ease), opacity var(--duration-fast) var(--ease);
}
.btn:active { transform: scale(0.97); }
.btn:disabled { opacity: var(--opacity-disabled); cursor: not-allowed; pointer-events: none; }

.btn-primary { background: var(--blue); color: #fff; box-shadow: var(--shadow-xs); }
.btn-primary:hover { background: var(--blue-hover); box-shadow: var(--shadow-sm); }

.btn-secondary { background: var(--bg-secondary); color: var(--text-primary); border-color: var(--border-strong); }
.btn-secondary:hover { border-color: var(--text-secondary); box-shadow: var(--shadow-xs); }

.btn-outline { background: transparent; color: var(--blue); border-color: var(--blue); }
.btn-outline:hover { background: var(--blue-tint); }

.btn-ghost { background: none; border: none; color: var(--text-secondary); text-decoration: underline; padding: var(--space-1) var(--space-2); }
.btn-ghost:hover { color: var(--blue); }

.btn-success { background: var(--success); color: #fff; }
.btn-danger { color: var(--danger); }
.btn-danger.btn-secondary:hover { border-color: var(--danger); color: var(--danger); }

.btn-small { padding: 6px var(--space-3); font-size: var(--text-label); }

.btn-loading { color: transparent !important; pointer-events: none; position: relative; }
.btn-loading::after {
  content: "";
  position: absolute;
  width: 16px; height: 16px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

/* Floating action button (mobile) */
.fab {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  width: 56px; height: 56px;
  border-radius: var(--radius-full);
  background: var(--blue);
  color: #fff;
  display: none;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  z-index: var(--z-header);
  cursor: pointer;
  font-size: 22px;
}

/* ---------------------------------------------------------
   10. INPUTS & FORMS
   --------------------------------------------------------- */
textarea, input[type="text"], input[type="date"], input[type="email"], select {
  width: 100%;
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: var(--text-caption);
  padding: 11px var(--space-3);
  border-radius: var(--radius-md);
  transition: border-color var(--duration-fast) var(--ease), box-shadow var(--duration-fast) var(--ease);
}
textarea { font-family: var(--font-mono); resize: vertical; line-height: var(--leading-relaxed); }

textarea:focus, input:focus, select:focus {
  outline: none;
  border-color: var(--blue);
  box-shadow: var(--shadow-focus);
}

textarea.error, input.error { border-color: var(--danger); box-shadow: 0 0 0 4px var(--danger-tint); }
textarea.success, input.success { border-color: var(--success); box-shadow: 0 0 0 4px var(--success-tint); }

.field-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: var(--space-3); }
.field-row > span, .field-row label { font-size: var(--text-label); font-weight: var(--weight-medium); color: var(--text-secondary); }
.field-row textarea, .field-row input, .field-row select { margin: 0; }

.field-row-inline { display: flex; gap: var(--space-3); flex-wrap: wrap; align-items: center; }
.field-row-inline input, .field-row-inline select { width: auto; flex: 1; min-width: 160px; margin: 0; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 var(--space-4); }
.form-grid .full { grid-column: 1 / -1; }

.hint { font-size: var(--text-caption); color: var(--text-secondary); line-height: var(--leading-relaxed); max-width: 640px; margin-bottom: var(--space-4); }
.hint code { background: rgba(0,0,0,0.06); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); color: var(--text-primary); }

/* Toggle switch */
.switch { position: relative; display: inline-block; width: 42px; height: 25px; cursor: pointer; }
.switch input { opacity: 0; width: 0; height: 0; }
.switch-track {
  position: absolute; inset: 0;
  background: var(--border-strong);
  border-radius: var(--radius-full);
  transition: background var(--duration-base) var(--ease);
}
.switch-track::before {
  content: "";
  position: absolute;
  height: 21px; width: 21px;
  left: 2px; top: 2px;
  background: #fff;
  border-radius: 50%;
  box-shadow: var(--shadow-sm);
  transition: transform var(--duration-base) var(--ease);
}
.switch input:checked + .switch-track { background: var(--success); }
.switch input:checked + .switch-track::before { transform: translateX(17px); }

.pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: var(--text-caption);
}
.pref-row:last-child { border-bottom: none; }

/* ---------------------------------------------------------
   11. TABS
   --------------------------------------------------------- */
.tabs {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}
.tab-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: var(--text-caption);
  font-weight: var(--weight-medium);
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color var(--duration-fast) var(--ease), border-color var(--duration-fast) var(--ease);
}
.tab-btn:hover { color: var(--text-primary); }
.tab-btn.active { color: var(--blue); border-bottom-color: var(--blue); }
.tab-panel.hidden { display: none; }

.intake-status {
  font-size: var(--text-caption);
  color: var(--warning);
  padding: var(--space-3) var(--space-4);
  background: var(--warning-tint);
  border-left: 3px solid var(--warning);
  margin: var(--space-4) 0;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
}
.intake-status.hidden { display: none; }
.intake-results { display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-4); }

/* ---------------------------------------------------------
   12. JOB CARDS & BADGES
   --------------------------------------------------------- */
.job-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-4) var(--space-5);
  cursor: pointer;
  position: relative;
  box-shadow: var(--shadow-xs);
  border-left: 3px solid var(--priority-low);
  transition: transform var(--duration-fast) var(--ease), box-shadow var(--duration-base) var(--ease), border-color var(--duration-fast) var(--ease);
  animation: fadeSlideIn var(--duration-slow) var(--ease);
}
.job-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }

.job-card.priority-high { border-left-color: var(--priority-high); }
.job-card.priority-medium { border-left-color: var(--priority-medium); }
.job-card.priority-low { border-left-color: var(--priority-low); }

.job-card-top { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-2); }
.job-title { font-size: var(--text-subtitle); font-weight: var(--weight-semibold); letter-spacing: -0.01em; margin-bottom: 2px; }
.job-company { font-size: var(--text-label); color: var(--text-secondary); }

.score-badge {
  font-family: var(--font-mono);
  font-weight: var(--weight-semibold);
  font-size: var(--text-label);
  background: var(--text-primary);
  color: #fff;
  padding: 3px 10px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.job-meta { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-3); font-size: var(--text-small); color: var(--text-secondary); }

.apply-pill {
  font-size: 10px;
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 3px 9px;
  border-radius: var(--radius-full);
  margin-top: var(--space-3);
  display: inline-block;
}
.apply-pill.auto { background: var(--success-tint); color: #1E8E3E; }
.apply-pill.manual { background: var(--warning-tint); color: #B36B00; }

.deadline-flag {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  color: var(--danger);
  margin-top: var(--space-2);
}

/* Generic status/priority badges (reusable) */
.badge {
  display: inline-flex;
  align-items: center;
  font-size: var(--text-small);
  font-weight: var(--weight-semibold);
  padding: 3px 10px;
  border-radius: var(--radius-full);
}
.badge-success { background: var(--success-tint); color: #1E8E3E; }
.badge-warning { background: var(--warning-tint); color: #B36B00; }
.badge-danger { background: var(--danger-tint); color: #C4291F; }
.badge-info { background: var(--info-tint); color: #0B7FAF; }

/* ---------------------------------------------------------
   13. KANBAN BOARD
   --------------------------------------------------------- */
.board-filters { display: flex; gap: var(--space-3); }
.board-filters select { width: auto; padding: 8px var(--space-3); font-size: var(--text-label); }

.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-5);
  align-items: start;
}
.board-col {
  background: rgba(0,0,0,0.02);
  border: 1px dashed var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  min-height: 120px;
  transition: background var(--duration-base) var(--ease);
}
.board-col:hover { background: rgba(0,0,0,0.035); }

.col-title {
  font-size: var(--text-label);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-3);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}
.col-title::before {
  content: "";
  width: 8px; height: 8px;
  border-radius: 50%;
}
.col-high { color: var(--priority-high); }
.col-high::before { background: var(--priority-high); }
.col-medium { color: var(--priority-medium); }
.col-medium::before { background: var(--priority-medium); }
.col-low { color: var(--priority-low); }
.col-low::before { background: var(--priority-low); }

.col-body { display: flex; flex-direction: column; gap: var(--space-3); min-height: 60px; }

/* ---------------------------------------------------------
   14. TABLES
   --------------------------------------------------------- */
.applied-table { width: 100%; border-collapse: collapse; font-size: var(--text-caption); }
.applied-table thead { position: sticky; top: 0; background: var(--bg-elevated); z-index: 1; }
.applied-table th {
  text-align: left;
  font-size: var(--text-small);
  font-weight: var(--weight-semibold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-secondary);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}
.applied-table td { padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--border-subtle); }
.applied-table tr { transition: background var(--duration-fast) var(--ease); }
.applied-table tr:hover td { background: rgba(0, 113, 227, 0.035); }
.applied-table tr:last-child td { border-bottom: none; }

.status-pill {
  font-size: var(--text-small);
  font-weight: var(--weight-semibold);
  padding: 3px 10px;
  border-radius: var(--radius-full);
  background: var(--info-tint);
  color: #0B7FAF;
  text-transform: capitalize;
}

/* ---------------------------------------------------------
   15. SOURCES
   --------------------------------------------------------- */
.source-list { display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-4); }
.source-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  font-size: var(--text-caption);
  transition: box-shadow var(--duration-base) var(--ease);
}
.source-item:hover { box-shadow: var(--shadow-sm); }
.source-item .stype {
  font-family: var(--font-mono);
  font-size: var(--text-small);
  color: var(--blue);
  text-transform: uppercase;
  margin-right: var(--space-3);
}
.source-item a { color: var(--text-secondary); font-size: var(--text-label); }

/* ---------------------------------------------------------
   16. NOTE BOX
   --------------------------------------------------------- */
.note-box {
  background: var(--info-tint);
  border-left: 3px solid var(--info);
  border-radius: var(--radius-md);
  padding: var(--space-4) var(--space-5);
  font-size: var(--text-caption);
  color: var(--text-primary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--space-6);
}

/* ---------------------------------------------------------
   17. ANALYTICS / CHARTS
   --------------------------------------------------------- */
.chart-panel { display: flex; flex-direction: column; }
.chart-placeholder {
  height: 180px;
  border-radius: var(--radius-md);
  background: repeating-linear-gradient(135deg, rgba(0,0,0,0.02), rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.035) 10px, rgba(0,0,0,0.035) 20px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44px;
  color: var(--text-tertiary);
}

/* Skeleton loading */
.skeleton {
  background: linear-gradient(90deg, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0.09) 37%, rgba(0,0,0,0.05) 63%);
  background-size: 400% 100%;
  animation: skeletonShine 1.4s ease infinite;
  border-radius: var(--radius-sm);
}
@keyframes skeletonShine {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

/* ---------------------------------------------------------
   18. AI ASSISTANT
   --------------------------------------------------------- */
.assistant-layout { display: grid; grid-template-columns: 1fr 260px; gap: var(--space-5); align-items: start; }

.assistant-chat { display: flex; flex-direction: column; height: 560px; padding: var(--space-5); }
.chat-messages { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: var(--space-3); padding-right: var(--space-2); }

.chat-bubble {
  max-width: 78%;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  font-size: var(--text-caption);
  line-height: var(--leading-normal);
  animation: fadeSlideIn var(--duration-base) var(--ease);
}
.chat-bubble-ai {
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  align-self: flex-start;
  border-bottom-left-radius: var(--radius-sm);
}
.chat-bubble-user {
  background: var(--blue);
  color: #fff;
  align-self: flex-end;
  border-bottom-right-radius: var(--radius-sm);
}

.chat-typing { display: inline-flex; gap: 3px; align-items: center; }
.chat-typing span {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--text-tertiary);
  animation: typingPulse 1s infinite ease-in-out;
}
.chat-typing span:nth-child(2) { animation-delay: 0.15s; }
.chat-typing span:nth-child(3) { animation-delay: 0.3s; }
@keyframes typingPulse {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-3px); }
}

.chat-input-row { display: flex; gap: var(--space-3); margin-top: var(--space-4); }
.chat-input-row input { margin: 0; }

.assistant-suggestions { display: flex; flex-direction: column; gap: var(--space-2); }
.assistant-suggestions h3 { font-size: var(--text-caption); color: var(--text-secondary); margin-bottom: var(--space-2); }
.suggestion-chip {
  text-align: left;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-caption);
  cursor: pointer;
  transition: border-color var(--duration-fast) var(--ease), transform var(--duration-fast) var(--ease);
}
.suggestion-chip:hover { border-color: var(--blue); transform: translateX(2px); color: var(--blue); }

/* ---------------------------------------------------------
   19. MODAL
   --------------------------------------------------------- */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg-overlay);
  backdrop-filter: var(--blur-sm);
  -webkit-backdrop-filter: var(--blur-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
  padding: var(--space-6);
  animation: fadeSlideIn var(--duration-base) var(--ease);
}
.modal-overlay.hidden { display: none; }

.modal {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: var(--radius-xl);
  max-width: 720px;
  width: 100%;
  max-height: 86vh;
  overflow-y: auto;
  padding: var(--space-8);
  position: relative;
  box-shadow: var(--shadow-lg);
  animation: modalPop var(--duration-slow) var(--ease);
}
@keyframes modalPop {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-close {
  position: absolute;
  top: var(--space-5);
  right: var(--space-5);
  width: 32px; height: 32px;
  border-radius: var(--radius-full);
  border: none;
  background: rgba(0,0,0,0.05);
  font-size: 20px;
  cursor: pointer;
  color: var(--text-secondary);
  line-height: 1;
  transition: background var(--duration-fast) var(--ease);
}
.modal-close:hover { background: rgba(0,0,0,0.09); }

.modal h2 { font-size: var(--text-heading); font-weight: var(--weight-semibold); letter-spacing: -0.015em; }
.modal-section { margin-top: var(--space-5); padding-top: var(--space-4); border-top: 1px solid var(--border-subtle); }
.modal-section h3 { font-size: var(--text-label); text-transform: uppercase; letter-spacing: 0.05em; color: var(--blue); margin-bottom: var(--space-3); }

.doc-box {
  background: var(--bg-primary);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  font-size: var(--text-caption);
  line-height: var(--leading-relaxed);
  white-space: pre-wrap;
  max-height: 260px;
  overflow-y: auto;
}
.doc-actions { display: flex; gap: var(--space-2); margin-top: var(--space-2); }
.modal-btn-row { display: flex; gap: var(--space-3); flex-wrap: wrap; margin-top: var(--space-6); }

/* ---------------------------------------------------------
   20. TOAST
   --------------------------------------------------------- */
.toast {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  background: var(--text-primary);
  color: #fff;
  border: none;
  padding: var(--space-3) var(--space-5);
  border-radius: var(--radius-md);
  font-size: var(--text-caption);
  z-index: var(--z-toast);
  box-shadow: var(--shadow-lg);
  animation: fadeSlideIn var(--duration-base) var(--ease);
}
.toast.hidden { display: none; }

/* ---------------------------------------------------------
   21. SPINNER
   --------------------------------------------------------- */
.spinner {
  display: inline-block;
  width: 13px; height: 13px;
  border: 2px solid var(--border-subtle);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-right: var(--space-2);
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ---------------------------------------------------------
   22. RESPONSIVE
   --------------------------------------------------------- */
@media (max-width: 1180px) {
  .dash-grid, .dash-grid-secondary { grid-template-columns: 1fr; }
  .assistant-layout { grid-template-columns: 1fr; }
}

@media (max-width: 960px) {
  #app { grid-template-columns: 1fr; }
  .sidebar {
    position: relative;
    height: auto;
    flex-direction: row;
    align-items: center;
    padding: var(--space-3) var(--space-4);
  }
  .brand { margin-bottom: 0; margin-right: var(--space-4); }
  .nav { flex-direction: row; overflow-x: auto; }
  .nav-label { display: none; }
  .sidebar-footer { display: none; }
  .topbar { padding: 0 var(--space-4); }
  .topbar-search { display: none; }
  .main { padding: var(--space-5); }
  .board { grid-template-columns: 1fr; }
  .stat-row { grid-template-columns: repeat(2, 1fr); }
  .form-grid { grid-template-columns: 1fr; }
  .hero-card { flex-direction: column; align-items: flex-start; }
}

@media (max-width: 600px) {
  .topbar-greeting h1 { font-size: var(--text-title); }
  .stat-row { grid-template-columns: 1fr; }
  .fab { display: flex; }
  .quickAddJobBtn span.nav-label, #quickAddJobBtn { display: none; }
}

/* ---------------------------------------------------------
   23. PRINT / ACCESSIBILITY EXTRAS
   --------------------------------------------------------- */
button, [role="button"], .nav-item, .tab-btn, .job-card, .mini-item, .suggestion-chip {
  cursor: pointer;
}

::selection { background: var(--blue-tint); color: var(--text-primary); }
