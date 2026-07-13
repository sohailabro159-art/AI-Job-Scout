/* =========================================================================
   AI JOB SCOUT — APPLICATION LOGIC
   A personal AI-powered job hunting assistant.
   Organized into sections: Configuration, State, Storage, Utilities,
   AI Client, Job Manager, Search/Filter/Sort, Dashboard, Analytics,
   Application Tracker, Document Generation, AI Assistant, Notifications,
   Import/Export, Modal Manager, Settings, Initialization.
   ========================================================================= */

/* ---------------------------------------------------------------------
   1. CONFIGURATION
   --------------------------------------------------------------------- */
const CONFIG = {
  MODEL: "claude-sonnet-4-6",
  STORAGE_VERSION: 2,
  STORAGE_KEYS: {
    JOBS: "jobs",
    PROFILE: "profile",
    SOURCES: "sources",
    SETTINGS: "settings",
    NOTES: "notes",
    META: "meta"
  },
  STAGES: [
    "saved", "applying", "applied", "shortlisted", "assessment",
    "interview_scheduled", "interview_completed", "offer",
    "accepted", "rejected", "archived"
  ],
  ACTIVE_STAGES: ["saved", "applying", "applied", "shortlisted", "assessment", "interview_scheduled", "interview_completed", "offer"],
  CLOSED_STAGES: ["accepted", "rejected", "archived"],
  DEADLINE_SOON_DAYS: 5
};

/* ---------------------------------------------------------------------
   2. STATE
   --------------------------------------------------------------------- */
const DEFAULT_PROFILE = {
  name: "Suhail",
  location: "Hyderabad, Sindh",
  education: "BS English (Literature & Linguistics), NUML Hyderabad",
  salary: "PKR 30,000–50,000+",
  phone: "",
  email: "",
  roles: "Computer Operator, Admin Officer, Data Entry Operator, Front Desk, Coordinator",
  skills: "MS Word, Excel, PowerPoint, internet research, AI tools, administration, data handling, multilingual communication",
  experience: "School administration and computer operations; managed a family business; independent commodity trading; organised a Ramadan food distribution initiative.",
  languages: "Urdu, English, Sindhi, Saraiki, Balochi"
};

const DEFAULT_SETTINGS = {
  theme: "light",
  notificationsEnabled: true,
  deadlineReminderDays: CONFIG.DEADLINE_SOON_DAYS
};

const AppState = {
  profile: { ...DEFAULT_PROFILE },
  sources: [],
  jobs: [],
  settings: { ...DEFAULT_SETTINGS },
  notes: [],
  ui: {
    currentView: "dashboard",
    boardFilterApply: "all",
    boardFilterStatus: "active",
    globalSearchTerm: "",
    applicationsSearchTerm: "",
    modalJobId: null,
    chatHistory: [] // { role: 'user'|'assistant', content: string }
  }
};

/* ---------------------------------------------------------------------
   3. STORAGE LAYER (window.storage, with graceful in-memory fallback)
   --------------------------------------------------------------------- */
const Storage = {
  mode: "checking",

  async get(key, fallback) {
    try {
      if (window.storage) {
        const res = await window.storage.get(key);
        return res ? JSON.parse(res.value) : fallback;
      }
    } catch (e) { /* key not found, or storage unavailable */ }
    return fallback;
  },

  async set(key, value) {
    try {
      if (window.storage) {
        await window.storage.set(key, JSON.stringify(value));
        return true;
      }
    } catch (e) {
      console.error("Storage write failed:", e);
    }
    return false;
  },

  async init() {
    const el = document.getElementById("storageStatus");
    if (window.storage) {
      this.mode = "persistent";
      if (el) { el.textContent = "● saved automatically"; el.classList.add("ok"); }
    } else {
      this.mode = "memory";
      if (el) {
        el.textContent = "⚠ no persistent storage this session — open inside Claude for saving to work";
        el.classList.add("warn");
      }
    }
  },

  async loadAll() {
    AppState.profile = await this.get(CONFIG.STORAGE_KEYS.PROFILE, { ...DEFAULT_PROFILE });
    AppState.sources = await this.get(CONFIG.STORAGE_KEYS.SOURCES, []);
    AppState.jobs = await this.get(CONFIG.STORAGE_KEYS.JOBS, []);
    AppState.settings = await this.get(CONFIG.STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
    AppState.notes = await this.get(CONFIG.STORAGE_KEYS.NOTES, []);
    await this.migrate();
  },

  async saveJobs() { await this.set(CONFIG.STORAGE_KEYS.JOBS, AppState.jobs); },
  async saveProfile() { await this.set(CONFIG.STORAGE_KEYS.PROFILE, AppState.profile); },
  async saveSources() { await this.set(CONFIG.STORAGE_KEYS.SOURCES, AppState.sources); },
  async saveSettings() { await this.set(CONFIG.STORAGE_KEYS.SETTINGS, AppState.settings); },
  async saveNotes() { await this.set(CONFIG.STORAGE_KEYS.NOTES, AppState.notes); },

  /** Migrate older job records to the current schema without losing data. */
  async migrate() {
    const meta = await this.get(CONFIG.STORAGE_KEYS.META, { version: 1 });
    if (meta.version >= CONFIG.STORAGE_VERSION) return;

    AppState.jobs = AppState.jobs.map(j => JobManager.withDefaults(j));
    await this.saveJobs();
    await this.set(CONFIG.STORAGE_KEYS.META, { version: CONFIG.STORAGE_VERSION });
  }
};

/* ---------------------------------------------------------------------
   4. UTILITIES
   --------------------------------------------------------------------- */
const Utils = {
  uid() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  },

  escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  },

  /** Strip anything resembling HTML/script tags from free-text input before storage. */
  sanitize(str) {
    if (!str) return "";
    return String(str).replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<[^>]+>/g, "");
  },

  debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  },

  formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  },

  daysUntil(dateStr) {
    if (!dateStr) return null;
    const target = new Date(dateStr);
    if (isNaN(target)) return null;
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);
    return Math.round((target - now) / 86400000);
  },

  clamp(n, min, max) { return Math.max(min, Math.min(max, n)); },

  downloadFile(filename, content, mime = "application/json") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  toCSV(rows, columns) {
    const header = columns.join(",");
    const lines = rows.map(row => columns.map(c => {
      const val = (row[c] ?? "").toString().replace(/"/g, '""');
      return `"${val}"`;
    }).join(","));
    return [header, ...lines].join("\n");
  },

  parseJsonLoose(text) {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const braceStart = cleaned.indexOf("{");
    const bracketStart = cleaned.indexOf("[");
    const start = (braceStart === -1) ? bracketStart : (bracketStart === -1 ? braceStart : Math.min(braceStart, bracketStart));
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    return JSON.parse(cleaned.slice(start, end + 1));
  }
};

/* ---------------------------------------------------------------------
   5. NOTIFICATION CENTER (toasts + bell dropdown)
   --------------------------------------------------------------------- */
class NotificationCenter {
  constructor() {
    this.items = []; // { id, message, type, time }
    this.panelOpen = false;
  }

  toast(message, ms = 3200) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = message;
    t.classList.remove("hidden");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.add("hidden"), ms);
  }

  push(message, type = "info") {
    this.items.unshift({ id: Utils.uid(), message, type, time: new Date().toISOString() });
    this.items = this.items.slice(0, 30);
    this.renderDot();
  }

  renderDot() {
    const bell = document.getElementById("notificationBell");
    if (!bell) return;
    const dot = bell.querySelector(".notif-dot");
    if (dot) dot.style.display = this.items.length ? "block" : "none";
  }

  togglePanel() {
    let panel = document.getElementById("notifPanel");
    if (panel) { panel.remove(); this.panelOpen = false; return; }
    this.panelOpen = true;

    panel = document.createElement("div");
    panel.id = "notifPanel";
    Object.assign(panel.style, {
      position: "absolute", top: "64px", right: "40px", width: "300px",
      maxHeight: "360px", overflowY: "auto", background: "var(--bg-secondary)",
      border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)",
      boxShadow: "var(--shadow-lg)", zIndex: "30", padding: "12px"
    });

    if (!this.items.length) {
      panel.innerHTML = `<p style="font-size:13px;color:var(--text-secondary);padding:8px">No notifications yet. You'll see deadline and task reminders here.</p>`;
    } else {
      panel.innerHTML = this.items.map(n => `
        <div style="padding:10px;border-bottom:1px solid var(--border-subtle);font-size:13px">
          <div>${Utils.escapeHtml(n.message)}</div>
          <div style="font-size:11px;color:var(--text-tertiary);margin-top:4px">${new Date(n.time).toLocaleString()}</div>
        </div>
      `).join("");
    }
    document.body.appendChild(panel);

    const closeOnOutside = (e) => {
      if (!panel.contains(e.target) && e.target.id !== "notificationBell") {
        panel.remove();
        this.panelOpen = false;
        document.removeEventListener("click", closeOnOutside);
      }
    };
    setTimeout(() => document.addEventListener("click", closeOnOutside), 0);
  }

  /** Scan jobs for deadlines/follow-ups and push reminders. Called on load and periodically. */
  scanForReminders(jobs) {
    const days = AppState.settings.deadlineReminderDays ?? CONFIG.DEADLINE_SOON_DAYS;
    jobs.forEach(job => {
      if (job.deadline && CONFIG.ACTIVE_STAGES.includes(job.status)) {
        const d = Utils.daysUntil(job.deadline);
        if (d !== null && d >= 0 && d <= days) {
          this.push(`Deadline in ${d} day${d === 1 ? "" : "s"}: ${job.title} at ${job.company}`, "warning");
        }
      }
      if (job.interviewDate) {
        const d = Utils.daysUntil(job.interviewDate);
        if (d === 0) this.push(`Interview today: ${job.title} at ${job.company}`, "info");
        if (d === 1) this.push(`Interview tomorrow: ${job.title} at ${job.company}`, "info");
      }
      if (job.followUpDate) {
        const d = Utils.daysUntil(job.followUpDate);
        if (d !== null && d <= 0 && job.status !== "archived") {
          this.push(`Follow up today: ${job.title} at ${job.company}`, "info");
        }
      }
    });
  }
}
const Notifications = new NotificationCenter();

/* ---------------------------------------------------------------------
   6. AI CLIENT — thin wrapper around Claude's Messages API
   --------------------------------------------------------------------- */
const AIClient = {
  async send(systemPrompt, userPrompt, maxTokens = 2000) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: maxTokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });
    if (!response.ok) throw new Error("AI request failed: " + response.status);
    const data = await response.json();
    const textBlock = data.content.find(b => b.type === "text");
    if (!textBlock) throw new Error("No text in AI response");
    return textBlock.text;
  },

  /** Multi-turn chat used by the AI Assistant page. */
  async chat(systemPrompt, history) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CONFIG.MODEL,
        max_tokens: 1200,
        system: systemPrompt,
        messages: history.map(h => ({ role: h.role, content: h.content }))
      })
    });
    if (!response.ok) throw new Error("AI chat request failed: " + response.status);
    const data = await response.json();
    const textBlock = data.content.find(b => b.type === "text");
    return textBlock ? textBlock.text : "";
  }
};

/* ---------------------------------------------------------------------
   7. JOB MANAGER — schema, CRUD, scoring, extraction
   --------------------------------------------------------------------- */
const JobManager = {
  /** Canonical job schema. Fills in any missing fields (also used for storage migration). */
  withDefaults(job) {
    return {
      id: job.id || Utils.uid(),
      title: job.title || "Untitled role",
      company: job.company || "Unknown",
      location: job.location || "",
      salary: job.salary || null,
      category: job.category || "unspecified", // government | private | ngo | internship | unspecified
      employmentType: job.employmentType || "onsite", // remote | onsite | hybrid
      experience: job.experience || "entry-level",
      education: job.education || "",
      skills: job.skills || [],
      description: job.description || job.rawText || "",
      summary: job.summary || "",
      aiScore: typeof job.aiScore === "number" ? job.aiScore : (typeof job.score === "number" ? job.score : 0),
      priority: job.priority || "low",
      deadline: job.deadline || null,
      status: job.status && CONFIG.STAGES.includes(job.status) ? job.status : this.legacyStatusToStage(job.status),
      notes: job.notes || "",
      resumeVersion: job.resumeVersion || null,
      coverLetter: job.coverLetter || null,
      applicationEmail: job.applicationEmail || null,
      website: job.website || job.contact || null,
      source: job.source || "unspecified",
      trustScore: typeof job.trustScore === "number" ? job.trustScore : 70,
      matchExplanation: job.matchExplanation || job.matchReasons || [],
      concerns: job.concerns || [],
      applyType: job.applyType || "manual",
      applyMethod: job.applyMethod || "unclear",
      contact: job.contact || null,
      dateAdded: job.dateAdded || new Date().toISOString(),
      lastUpdated: job.lastUpdated || job.dateAdded || new Date().toISOString(),
      dateApplied: job.dateApplied || null,
      favorite: !!job.favorite,
      interviewDate: job.interviewDate || null,
      followUpDate: job.followUpDate || null,
      documents: job.documents || null,
      rawText: job.rawText || job.description || ""
    };
  },

  legacyStatusToStage(oldStatus) {
    const map = { new: "saved", reviewing: "applying", applied: "applied", rejected: "rejected", expired: "archived" };
    return map[oldStatus] || "saved";
  },

  add(job) {
    const full = this.withDefaults(job);
    AppState.jobs.unshift(full);
    return full;
  },

  update(id, patch) {
    const job = this.get(id);
    if (!job) return null;
    Object.assign(job, patch, { lastUpdated: new Date().toISOString() });
    return job;
  },

  remove(id) {
    AppState.jobs = AppState.jobs.filter(j => j.id !== id);
  },

  get(id) {
    return AppState.jobs.find(j => j.id === id) || null;
  },

  list() {
    return AppState.jobs;
  },

  setStage(id, stage) {
    const job = this.get(id);
    if (!job) return;
    job.status = stage;
    job.lastUpdated = new Date().toISOString();
    if (stage === "applied" && !job.dateApplied) job.dateApplied = new Date().toISOString();
  },

  toggleFavorite(id) {
    const job = this.get(id);
    if (!job) return;
    job.favorite = !job.favorite;
  },

  /* ---------- Extraction & scoring (real AI call) ---------- */
  extractionSystemPrompt() {
    const p = AppState.profile;
    return `You are a job-matching assistant for one specific candidate. Extract structured data from raw job posting text and score how well it fits the candidate.

Candidate profile:
- Name: ${p.name}
- Location: ${p.location}
- Education: ${p.education}
- Target roles: ${p.roles}
- Skills: ${p.skills}
- Experience: ${p.experience}
- Languages: ${p.languages}
- Target salary: ${p.salary}

For EACH job posting given, return an object with exactly these fields:
{
 "title": string,
 "company": string,
 "location": string,
 "salary": string or null,
 "category": one of "government","private","ngo","internship","unspecified",
 "employmentType": one of "remote","onsite","hybrid",
 "experience": string (e.g. "entry-level", "1-2 years"),
 "education": string (required education if stated, else ""),
 "skills": array of short strings (skills/requirements mentioned),
 "deadline": "YYYY-MM-DD" or null,
 "applyMethod": one of "email","whatsapp","website","inperson","unclear",
 "contact": string or null,
 "summary": string (1-2 sentence plain summary of the role),
 "score": integer 0-100 (fit for this candidate),
 "priority": one of "high","medium","low",
 "applyType": one of "auto","manual",
 "trustScore": integer 0-100 (how legitimate/trustworthy this posting looks — lower for vague postings, requests for payment, or suspicious offers),
 "matchExplanation": array of short strings (why it fits),
 "concerns": array of short strings (mismatches, missing info, or red flags — empty array if none)
}

Scoring guide: 80-100 strong fit (entry-level admin/office/coordinator role, Hyderabad/Sindh area, salary in or near range, matches skills). 50-79 plausible but some mismatch. Below 50 poor fit.

Respond ONLY with valid JSON, no markdown fences, no commentary. If given a single job, return a single JSON object. If given multiple jobs, return a JSON array of objects in the same order.`;
  },

  async extractSingle(rawText, source) {
    const text = await AIClient.send(this.extractionSystemPrompt(), `Source: ${source || "unspecified"}\n\nJob posting text:\n${rawText}`);
    const obj = Utils.parseJsonLoose(text);
    return this.buildFromExtraction(obj, rawText, source);
  },

  async extractBulk(rawTexts, source) {
    const joined = rawTexts.map((t, i) => `--- JOB ${i + 1} ---\n${t}`).join("\n\n");
    const text = await AIClient.send(this.extractionSystemPrompt(), `Source: ${source || "unspecified"}\n\nThere are ${rawTexts.length} separate job postings below. Return a JSON array with one object per job, same order.\n\n${joined}`, 4000);
    const arr = Utils.parseJsonLoose(text);
    return arr.map((obj, i) => this.buildFromExtraction(obj, rawTexts[i], source));
  },

  buildFromExtraction(obj, rawText, source) {
    return this.withDefaults({
      title: obj.title, company: obj.company, location: obj.location,
      salary: obj.salary, category: obj.category, employmentType: obj.employmentType,
      experience: obj.experience, education: obj.education, skills: obj.skills || [],
      deadline: obj.deadline, applyMethod: obj.applyMethod, contact: obj.contact,
      summary: obj.summary, aiScore: obj.score, priority: obj.priority,
      applyType: obj.applyType, trustScore: obj.trustScore,
      matchExplanation: obj.matchExplanation || [], concerns: obj.concerns || [],
      source: source || "unspecified", rawText, description: rawText,
      status: "saved"
    });
  }
};

/* ---------------------------------------------------------------------
   8. SEARCH, FILTER, SORT
   --------------------------------------------------------------------- */
const Query = {
  search(jobs, term) {
    if (!term) return jobs;
    const q = term.toLowerCase();
    return jobs.filter(j =>
      j.title.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      (j.location || "").toLowerCase().includes(q) ||
      (j.salary || "").toLowerCase().includes(q) ||
      (j.category || "").toLowerCase().includes(q) ||
      (j.skills || []).some(s => s.toLowerCase().includes(q)) ||
      (j.status || "").toLowerCase().includes(q) ||
      (j.source || "").toLowerCase().includes(q)
    );
  },

  filter(jobs, filters) {
    let result = jobs;
    if (filters.applyType && filters.applyType !== "all") {
      result = result.filter(j => j.applyType === filters.applyType);
    }
    if (filters.statusScope === "active") {
      result = result.filter(j => CONFIG.ACTIVE_STAGES.includes(j.status));
    }
    if (filters.category) result = result.filter(j => j.category === filters.category);
    if (filters.employmentType) result = result.filter(j => j.employmentType === filters.employmentType);
    if (filters.city) result = result.filter(j => (j.location || "").toLowerCase().includes(filters.city.toLowerCase()));
    if (filters.minScore != null) result = result.filter(j => j.aiScore >= filters.minScore);
    if (filters.priority) result = result.filter(j => j.priority === filters.priority);
    return result;
  },

  sort(jobs, mode) {
    const arr = [...jobs];
    switch (mode) {
      case "newest": return arr.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
      case "oldest": return arr.sort((a, b) => new Date(a.dateAdded) - new Date(b.dateAdded));
      case "highest-match": return arr.sort((a, b) => b.aiScore - a.aiScore);
      case "lowest-match": return arr.sort((a, b) => a.aiScore - b.aiScore);
      case "deadline": return arr.sort((a, b) => (a.deadline ? new Date(a.deadline) : Infinity) - (b.deadline ? new Date(b.deadline) : Infinity));
      case "company": return arr.sort((a, b) => a.company.localeCompare(b.company));
      case "alphabetical": return arr.sort((a, b) => a.title.localeCompare(b.title));
      case "priority": {
        const order = { high: 0, medium: 1, low: 2 };
        return arr.sort((a, b) => order[a.priority] - order[b.priority]);
      }
      default: return arr;
    }
  }
};

/* ---------------------------------------------------------------------
   9. DASHBOARD
   --------------------------------------------------------------------- */
const Dashboard = {
  stats() {
    const jobs = AppState.jobs;
    const todayISO = new Date().toISOString().slice(0, 10);
    const active = jobs.filter(j => CONFIG.ACTIVE_STAGES.includes(j.status));
    const applied = jobs.filter(j => j.dateApplied);
    const interviews = jobs.filter(j => j.status === "interview_scheduled" || j.status === "interview_completed");
    const favorites = jobs.filter(j => j.favorite);
    const followUps = jobs.filter(j => j.followUpDate && Utils.daysUntil(j.followUpDate) <= 0 && !CONFIG.CLOSED_STAGES.includes(j.status));
    const avgMatch = jobs.length ? Math.round(jobs.reduce((s, j) => s + j.aiScore, 0) / jobs.length) : 0;
    const successRate = applied.length ? Math.round((jobs.filter(j => j.status === "accepted" || j.status === "offer").length / applied.length) * 100) : 0;

    return [
      { num: jobs.length, label: "Total jobs" },
      { num: jobs.filter(j => j.dateAdded.slice(0, 10) === todayISO).length, label: "New today" },
      { num: applied.length, label: "Applications" },
      { num: avgMatch, label: "Average match" },
      { num: successRate + "%", label: "Success rate" },
      { num: interviews.length, label: "Interviews" },
      { num: favorites.length, label: "Favorites" },
      { num: followUps.length, label: "Pending follow-ups" }
    ];
  },

  render() {
    const dateEl = document.getElementById("todayDateHeader");
    if (dateEl) dateEl.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

    const greetEl = document.getElementById("greetingText");
    if (greetEl) {
      const hour = new Date().getHours();
      const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
      greetEl.textContent = `${part}, ${AppState.profile.name || "there"}`;
    }

    const statRow = document.getElementById("statRow");
    if (statRow) {
      statRow.innerHTML = this.stats().map(s => `
        <div class="stat-card"><span class="stat-num">${s.num}</span><span class="stat-label">${s.label}</span></div>
      `).join("");
    }

    const jobs = AppState.jobs;
    const bestMatches = jobs.filter(j => CONFIG.ACTIVE_STAGES.includes(j.status)).sort((a, b) => b.aiScore - a.aiScore).slice(0, 5);
    const manual = jobs.filter(j => j.applyType === "manual" && CONFIG.ACTIVE_STAGES.includes(j.status));
    const applied = jobs.filter(j => j.dateApplied).sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
    const withDeadline = jobs.filter(j => j.deadline && CONFIG.ACTIVE_STAGES.includes(j.status)).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    this.renderMiniList("bestMatches", bestMatches, j => j.aiScore);
    this.renderMiniList("manualQueue", manual, j => j.applyMethod);
    this.renderMiniList("deadlineList", withDeadline.slice(0, 6), j => j.deadline);
    this.renderMiniList("appliedRecent", applied.slice(0, 6), j => j.status);

    UI.attachMiniItemHandlers();
    Notifications.scanForReminders(jobs);
    Notifications.renderDot();
  },

  renderMiniList(elId, arr, tagFn) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!arr.length) { el.innerHTML = `<div class="empty-note">Nothing here yet.</div>`; return; }
    el.innerHTML = arr.map(j => `
      <div class="mini-item" data-job="${j.id}">
        <span>${Utils.escapeHtml(j.title)} — ${Utils.escapeHtml(j.company)}</span>
        <span class="tag" style="background:${UI.priorityColor(j.priority)}22;color:${UI.priorityColor(j.priority)}">${Utils.escapeHtml(String(tagFn(j)))}</span>
      </div>
    `).join("");
  }
};

/* ---------------------------------------------------------------------
   10. ANALYTICS
   --------------------------------------------------------------------- */
const Analytics = {
  compute() {
    const jobs = AppState.jobs;
    const applied = jobs.filter(j => j.dateApplied);
    const byCategory = {};
    const byCity = {};
    jobs.forEach(j => {
      byCategory[j.category] = (byCategory[j.category] || 0) + 1;
      const city = (j.location || "unspecified").split(",")[0].trim() || "unspecified";
      byCity[city] = (byCity[city] || 0) + 1;
    });
    const avgMatch = jobs.length ? Math.round(jobs.reduce((s, j) => s + j.aiScore, 0) / jobs.length) : 0;
    const interviewCount = jobs.filter(j => ["interview_scheduled", "interview_completed"].includes(j.status)).length;
    const responseCount = jobs.filter(j => !["saved", "applying"].includes(j.status)).length;
    const successRate = applied.length ? Math.round((jobs.filter(j => j.status === "accepted").length / applied.length) * 100) : 0;
    const interviewRate = applied.length ? Math.round((interviewCount / applied.length) * 100) : 0;
    const responseRate = applied.length ? Math.round((responseCount / applied.length) * 100) : 0;

    // Applications per month (last 6 months)
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
      const count = applied.filter(j => {
        const ad = new Date(j.dateApplied);
        return ad.getFullYear() === d.getFullYear() && ad.getMonth() === d.getMonth();
      }).length;
      months.push({ key, count });
    }

    return { byCategory, byCity, avgMatch, successRate, interviewRate, responseRate, months, totalApplied: applied.length };
  },

  render() {
    const a = this.compute();
    const cards = document.querySelectorAll("#view-analytics .stat-card .stat-num");
    if (cards.length >= 3) {
      cards[0].textContent = a.avgMatch;
      cards[1].textContent = a.successRate + "%";
      cards[2].textContent = a.totalApplied;
    }

    const placeholders = document.querySelectorAll("#view-analytics .chart-placeholder");
    if (placeholders[0]) placeholders[0].innerHTML = this.miniBreakdown(a.byCategory);
    if (placeholders[1]) placeholders[1].innerHTML = this.miniBreakdown(a.byCity);
    if (placeholders[2]) placeholders[2].innerHTML = this.miniTrend(a.months);
    if (placeholders[3]) placeholders[3].innerHTML = this.miniTrend(a.months);
  },

  miniBreakdown(obj) {
    const entries = Object.entries(obj).sort((x, y) => y[1] - x[1]).slice(0, 5);
    if (!entries.length) return `<span style="font-size:13px;color:var(--text-tertiary)">No data yet</span>`;
    return `<div style="width:100%;padding:0 16px;font-size:12px;color:var(--text-secondary)">
      ${entries.map(([k, v]) => `<div style="display:flex;justify-content:space-between;padding:4px 0">
        <span>${Utils.escapeHtml(k)}</span><span style="font-family:var(--font-mono)">${v}</span>
      </div>`).join("")}
    </div>`;
  },

  miniTrend(months) {
    const max = Math.max(1, ...months.map(m => m.count));
    return `<div style="display:flex;align-items:flex-end;gap:6px;height:100%;width:100%;padding:0 16px">
      ${months.map(m => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
          <div style="width:100%;background:var(--blue);border-radius:3px 3px 0 0;height:${Math.max(4, (m.count / max) * 100)}px"></div>
          <span style="font-size:10px;color:var(--text-tertiary)">${m.key}</span>
        </div>
      `).join("")}
    </div>`;
  }
};

/* ---------------------------------------------------------------------
   11. DOCUMENT GENERATION (resume, cover letter, email, WhatsApp, LinkedIn,
       follow-up, interview thank-you — all real AI calls)
   --------------------------------------------------------------------- */
const DocumentGenerator = {
  systemPrompt() {
    const p = AppState.profile;
    return `You write tailored job application material for one candidate. Be natural and conversational, not stiff or template-sounding. Keep everything honest: never invent employers, dates, or skills not in the candidate profile.

Candidate profile:
- Name: ${p.name}
- Location: ${p.location}
- Education: ${p.education}
- Skills: ${p.skills}
- Experience: ${p.experience}
- Languages: ${p.languages}
- Phone: ${p.phone || "(not provided)"}
- Email: ${p.email || "(not provided)"}

Return ONLY valid JSON with these fields:
{
 "cvSummary": string (tailored one-paragraph professional summary + 4-6 bullet points for THIS role, plain text, no markdown symbols),
 "coverLetter": string (150-220 words, conversational),
 "email": string (ready-to-send email, first line "Subject: ...", then body),
 "whatsapp": string (under 80 words, friendly, direct),
 "linkedinMessage": string (under 60 words, professional networking tone),
 "followUpEmail": string (short, polite follow-up if no response after ~1 week, first line "Subject: ..."),
 "interviewThankYou": string (short thank-you note to send after an interview)
}`;
  },

  async generate(job) {
    const user = `Job title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nApply method: ${job.applyMethod}\nJob summary: ${job.summary}\n\nOriginal posting text:\n${job.rawText}`;
    const text = await AIClient.send(this.systemPrompt(), user, 2500);
    return Utils.parseJsonLoose(text);
  }
};

/* ---------------------------------------------------------------------
   12. AI ASSISTANT (chat interface + quick-action prompts)
   --------------------------------------------------------------------- */
const AIAssistant = {
  systemPrompt() {
    const p = AppState.profile;
    const jobSummaries = AppState.jobs.slice(0, 25).map(j =>
      `- ${j.title} at ${j.company} (score ${j.aiScore}, priority ${j.priority}, status ${j.status}${j.deadline ? ", deadline " + j.deadline : ""})`
    ).join("\n") || "(no jobs filed yet)";

    return `You are the candidate's personal career assistant inside their job-search dashboard. Be direct, warm, and practical — like a good career coach, not a generic chatbot. Keep responses focused and reasonably short unless asked for detail.

Candidate profile:
- Name: ${p.name}
- Location: ${p.location}
- Education: ${p.education}
- Target roles: ${p.roles}
- Skills: ${p.skills}
- Experience: ${p.experience}
- Languages: ${p.languages}
- Target salary: ${p.salary}

Jobs currently filed in their tracker:
${jobSummaries}

You can help with: finding today's best jobs from what's filed, improving their CV, generating cover letters, interview prep, career advice, and explaining match scores. If asked to draft a document, use the candidate's real profile only — never invent experience.`;
  },

  async ask(userMessage) {
    AppState.ui.chatHistory.push({ role: "user", content: userMessage });
    const reply = await AIClient.chat(this.systemPrompt(), AppState.ui.chatHistory);
    AppState.ui.chatHistory.push({ role: "assistant", content: reply });
    return reply;
  }
};

/* ---------------------------------------------------------------------
   13. IMPORT / EXPORT
   --------------------------------------------------------------------- */
const ImportExport = {
  exportJobsJSON() {
    Utils.downloadFile(`jobs-${Date.now()}.json`, JSON.stringify(AppState.jobs, null, 2));
    Notifications.toast("Jobs exported as JSON.");
  },

  exportJobsCSV() {
    const cols = ["title", "company", "location", "salary", "category", "priority", "aiScore", "status", "deadline", "source", "dateAdded"];
    Utils.downloadFile(`jobs-${Date.now()}.csv`, Utils.toCSV(AppState.jobs, cols), "text/csv");
    Notifications.toast("Jobs exported as CSV.");
  },

  exportApplications() {
    const applied = AppState.jobs.filter(j => j.dateApplied);
    Utils.downloadFile(`applications-${Date.now()}.json`, JSON.stringify(applied, null, 2));
    Notifications.toast("Applications exported.");
  },

  exportSettings() {
    Utils.downloadFile(`settings-${Date.now()}.json`, JSON.stringify({ profile: AppState.profile, settings: AppState.settings, sources: AppState.sources }, null, 2));
    Notifications.toast("Settings exported.");
  },

  async importJSONFile(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const incoming = Array.isArray(data) ? data : (data.jobs || []);
      if (!incoming.length) { Notifications.toast("No jobs found in that file."); return; }
      incoming.forEach(j => AppState.jobs.unshift(JobManager.withDefaults(j)));
      await Storage.saveJobs();
      Notifications.toast(`Imported ${incoming.length} job(s).`);
      UI.refreshCurrentView();
    } catch (e) {
      console.error(e);
      Notifications.toast("Couldn't read that file — make sure it's valid JSON.");
    }
  },

  async importCSVFile(file) {
    try {
      const text = await file.text();
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
      const rows = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.replace(/^"|"$/g, ""));
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i]);
        return obj;
      });
      rows.forEach(r => AppState.jobs.unshift(JobManager.withDefaults(r)));
      await Storage.saveJobs();
      Notifications.toast(`Imported ${rows.length} row(s) from CSV.`);
      UI.refreshCurrentView();
    } catch (e) {
      console.error(e);
      Notifications.toast("Couldn't parse that CSV file.");
    }
  },

  triggerFilePicker(accept, handler) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.style.display = "none";
    input.onchange = () => { if (input.files[0]) handler(input.files[0]); input.remove(); };
    document.body.appendChild(input);
    input.click();
  }
};

/* ---------------------------------------------------------------------
   14. UI — rendering, view switching, event wiring, modal manager
   --------------------------------------------------------------------- */
const UI = {
  priorityColor(p) {
    return p === "high" ? "#FF453A" : p === "medium" ? "#FF9F0A" : "#34C759";
  },

  switchView(view) {
    document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
    const target = document.getElementById("view-" + view);
    if (target) target.classList.remove("hidden");
    document.querySelectorAll(".nav-item[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    AppState.ui.currentView = view;

    if (view === "dashboard") Dashboard.render();
    if (view === "board") this.renderBoard();
    if (view === "applied") this.renderApplied();
    if (view === "sources") this.renderSources();
    if (view === "settings") this.renderSettings();
    if (view === "analytics") Analytics.render();
  },

  refreshCurrentView() { this.switchView(AppState.ui.currentView); },

  /* ---------- Intake ---------- */
  initIntakeTabs() {
    document.querySelectorAll(".tab-btn").forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll(".tab-btn").forEach(b => { b.classList.remove("active"); b.setAttribute("aria-selected", "false"); });
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
        btn.classList.add("active");
        btn.setAttribute("aria-selected", "true");
        document.getElementById("tab-" + btn.dataset.tab).classList.remove("hidden");
      };
    });
  },

  setIntakeStatus(msg) {
    const el = document.getElementById("intakeStatus");
    if (!el) return;
    if (!msg) { el.classList.add("hidden"); return; }
    el.classList.remove("hidden");
    el.innerHTML = `<span class="spinner"></span>${Utils.escapeHtml(msg)}`;
  },

  async processPaste() {
    const text = Utils.sanitize(document.getElementById("pasteInput").value.trim());
    const source = Utils.sanitize(document.getElementById("pasteSource").value.trim());
    if (!text) { Notifications.toast("Paste a job posting first."); return; }
    this.setIntakeStatus("Extracting details and scoring against your profile…");
    try {
      const job = await JobManager.extractSingle(text, source);
      JobManager.add(job);
      await Storage.saveJobs();
      document.getElementById("pasteInput").value = "";
      this.renderIntakeResults([job]);
      Notifications.toast("Job filed: " + job.title);
      Notifications.push(`New job filed: ${job.title} at ${job.company}`);
    } catch (e) {
      console.error(e);
      Notifications.toast("Couldn't process this job. If you're viewing this outside Claude, the AI step won't work.", 5000);
    }
    this.setIntakeStatus("");
  },

  async processBulk() {
    const raw = Utils.sanitize(document.getElementById("bulkInput").value.trim());
    const source = Utils.sanitize(document.getElementById("bulkSource").value.trim());
    if (!raw) { Notifications.toast("Paste at least one job posting."); return; }
    const parts = raw.split(/\n-{3,}\n/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) { Notifications.toast("Couldn't split any jobs out — check your --- separators."); return; }
    this.setIntakeStatus(`Processing ${parts.length} job${parts.length > 1 ? "s" : ""}…`);
    try {
      const jobs = await JobManager.extractBulk(parts, source);
      jobs.forEach(j => JobManager.add(j));
      await Storage.saveJobs();
      document.getElementById("bulkInput").value = "";
      this.renderIntakeResults(jobs);
      Notifications.toast(`Filed ${jobs.length} job${jobs.length > 1 ? "s" : ""}.`);
    } catch (e) {
      console.error(e);
      Notifications.toast("Couldn't process this batch. If you're viewing this outside Claude, the AI step won't work.", 5000);
    }
    this.setIntakeStatus("");
  },

  async processForm() {
    const title = Utils.sanitize(document.getElementById("fTitle").value.trim());
    const company = Utils.sanitize(document.getElementById("fCompany").value.trim());
    if (!title || !company) { Notifications.toast("Title and company are required."); return; }
    const rawText = `${title} at ${company}. ${Utils.sanitize(document.getElementById("fDesc").value.trim())}`;
    this.setIntakeStatus("Scoring this job against your profile…");
    const overrides = {
      title, company,
      location: document.getElementById("fLocation").value.trim(),
      salary: document.getElementById("fSalary").value.trim() || null,
      deadline: document.getElementById("fDeadline").value || null,
      applyMethod: document.getElementById("fApplyMethod").value,
      contact: document.getElementById("fContact").value.trim() || null
    };
    try {
      const job = await JobManager.extractSingle(rawText, "Manual entry");
      Object.assign(job, overrides);
      JobManager.add(job);
      await Storage.saveJobs();
      this.renderIntakeResults([job]);
      Notifications.toast("Job filed: " + job.title);
    } catch (e) {
      console.error(e);
      const job = JobManager.add(JobManager.withDefaults({
        ...overrides,
        summary: document.getElementById("fDesc").value.trim(),
        rawText, source: "Manual entry",
        matchExplanation: [], concerns: ["Not auto-scored — API unavailable"]
      }));
      await Storage.saveJobs();
      this.renderIntakeResults([job]);
      Notifications.toast("Couldn't score this job automatically. Filed without a score.", 5000);
    }
    this.setIntakeStatus("");
  },

  renderIntakeResults(jobs) {
    const el = document.getElementById("intakeResults");
    if (!el) return;
    el.innerHTML = jobs.map(j => this.jobCardHtml(j)).join("") + el.innerHTML;
    this.attachJobCardHandlers();
  },

  /* ---------- Job cards ---------- */
  jobCardHtml(job) {
    const deadlineFlag = job.deadline ? `<div class="deadline-flag">Deadline: ${Utils.escapeHtml(job.deadline)}</div>` : "";
    const favMark = job.favorite ? "★ " : "";
    return `<div class="job-card priority-${job.priority}" data-job="${job.id}">
      <div class="job-card-top">
        <div>
          <p class="job-title">${favMark}${Utils.escapeHtml(job.title)}</p>
          <p class="job-company">${Utils.escapeHtml(job.company)}${job.location ? " · " + Utils.escapeHtml(job.location) : ""}</p>
        </div>
        <span class="score-badge">${job.aiScore}</span>
      </div>
      <div class="job-meta">
        ${job.salary ? `<span>${Utils.escapeHtml(job.salary)}</span>` : ""}
        <span>${Utils.escapeHtml(job.source)}</span>
      </div>
      <span class="apply-pill ${job.applyType}">${job.applyType === "auto" ? "Auto-apply" : "Manual-apply"}</span>
      ${deadlineFlag}
    </div>`;
  },

  attachJobCardHandlers() {
    document.querySelectorAll(".job-card").forEach(el => {
      el.onclick = () => this.openJobModal(el.dataset.job);
    });
  },

  attachMiniItemHandlers() {
    document.querySelectorAll(".mini-item").forEach(el => {
      el.onclick = () => this.openJobModal(el.dataset.job);
    });
  },

  /* ---------- Board ---------- */
  renderBoard() {
    const applyFilter = document.getElementById("filterApply")?.value || "all";
    const statusFilter = document.getElementById("filterStatus")?.value || "active";
    let jobs = Query.filter(AppState.jobs, { applyType: applyFilter, statusScope: statusFilter });
    jobs = Query.search(jobs, AppState.ui.globalSearchTerm);

    ["high", "medium", "low"].forEach(p => {
      const col = document.getElementById("col-" + p);
      if (!col) return;
      const subset = Query.sort(jobs.filter(j => j.priority === p), "highest-match");
      col.innerHTML = subset.length ? subset.map(j => this.jobCardHtml(j)).join("") : `<div class="empty-note">No jobs here.</div>`;
    });
    this.attachJobCardHandlers();
  },

  /* ---------- Applications ---------- */
  renderApplied() {
    let applied = AppState.jobs.filter(j => j.dateApplied).sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
    applied = Query.search(applied, AppState.ui.applicationsSearchTerm);
    const body = document.getElementById("appliedTableBody");
    if (!body) return;
    if (!applied.length) {
      body.innerHTML = `<tr><td colspan="6" class="empty-note">No applications logged yet.</td></tr>`;
      return;
    }
    body.innerHTML = applied.map(j => `
      <tr>
        <td>${Utils.escapeHtml(j.title)}</td>
        <td>${Utils.escapeHtml(j.company)}</td>
        <td>${Utils.formatDate(j.dateApplied)}</td>
        <td>${Utils.escapeHtml(j.applyMethod)}</td>
        <td><span class="status-pill">${Utils.escapeHtml(j.status.replace(/_/g, " "))}</span></td>
        <td><button class="btn-ghost" data-job="${j.id}">View</button></td>
      </tr>
    `).join("");
    body.querySelectorAll("button[data-job]").forEach(b => b.onclick = () => this.openJobModal(b.dataset.job));
  },

  /* ---------- Sources ---------- */
  renderSources() {
    const el = document.getElementById("sourceList");
    if (!el) return;
    if (!AppState.sources.length) { el.innerHTML = `<div class="empty-note">No sources added yet.</div>`; return; }
    el.innerHTML = AppState.sources.map(s => `
      <div class="source-item">
        <div><span class="stype">${Utils.escapeHtml(s.type)}</span>${Utils.escapeHtml(s.name)} ${s.link ? `<a href="${Utils.escapeHtml(s.link)}" target="_blank" rel="noopener">open ↗</a>` : ""}</div>
        <button class="btn-ghost btn-danger" data-id="${s.id}">Remove</button>
      </div>
    `).join("");
    el.querySelectorAll("button[data-id]").forEach(b => {
      b.onclick = async () => {
        AppState.sources = AppState.sources.filter(s => s.id !== b.dataset.id);
        await Storage.saveSources();
        this.renderSources();
      };
    });
  },

  async addSource() {
    const name = Utils.sanitize(document.getElementById("sourceNameInput").value.trim());
    const link = document.getElementById("sourceLinkInput").value.trim();
    const type = document.getElementById("sourceTypeInput").value;
    if (!name) { Notifications.toast("Give the source a name."); return; }
    AppState.sources.unshift({ id: Utils.uid(), name, link, type });
    await Storage.saveSources();
    document.getElementById("sourceNameInput").value = "";
    document.getElementById("sourceLinkInput").value = "";
    this.renderSources();
  },

  /* ---------- Settings ---------- */
  renderSettings() {
    const p = AppState.profile;
    const map = { pName: "name", pLocation: "location", pEducation: "education", pSalary: "salary", pPhone: "phone", pEmail: "email", pRoles: "roles", pSkills: "skills", pExperience: "experience", pLanguages: "languages" };
    Object.entries(map).forEach(([id, key]) => {
      const el = document.getElementById(id);
      if (el) el.value = p[key] || "";
    });

    const switches = document.querySelectorAll("#view-settings .switch input");
    if (switches[0]) switches[0].checked = AppState.settings.notificationsEnabled;
    if (switches[1]) switches[1].checked = AppState.settings.theme !== "off";

    this.injectDataToolsIfMissing();
  },

  async saveProfileFromForm() {
    AppState.profile = {
      name: Utils.sanitize(document.getElementById("pName").value.trim()),
      location: Utils.sanitize(document.getElementById("pLocation").value.trim()),
      education: Utils.sanitize(document.getElementById("pEducation").value.trim()),
      salary: Utils.sanitize(document.getElementById("pSalary").value.trim()),
      phone: Utils.sanitize(document.getElementById("pPhone").value.trim()),
      email: Utils.sanitize(document.getElementById("pEmail").value.trim()),
      roles: Utils.sanitize(document.getElementById("pRoles").value.trim()),
      skills: Utils.sanitize(document.getElementById("pSkills").value.trim()),
      experience: Utils.sanitize(document.getElementById("pExperience").value.trim()),
      languages: Utils.sanitize(document.getElementById("pLanguages").value.trim())
    };
    const switches = document.querySelectorAll("#view-settings .switch input");
    if (switches[0]) AppState.settings.notificationsEnabled = switches[0].checked;
    if (switches[1]) AppState.settings.theme = switches[1].checked ? "light" : "off";

    await Storage.saveProfile();
    await Storage.saveSettings();
    Notifications.toast("Profile saved.");
    Dashboard.render();
  },

  /** Adds Export/Import controls into the Settings view at runtime (no HTML file edits). */
  injectDataToolsIfMissing() {
    if (document.getElementById("dataToolsCard")) return;
    const settingsView = document.getElementById("view-settings");
    if (!settingsView) return;
    const card = document.createElement("div");
    card.className = "card";
    card.id = "dataToolsCard";
    card.innerHTML = `
      <div class="panel-head"><h3>Data &amp; backup</h3></div>
      <div class="quick-actions">
        <button class="btn btn-secondary btn-small" id="btnExportJobsJSON">Export jobs (JSON)</button>
        <button class="btn btn-secondary btn-small" id="btnExportJobsCSV">Export jobs (CSV)</button>
        <button class="btn btn-secondary btn-small" id="btnExportApplications">Export applications</button>
        <button class="btn btn-secondary btn-small" id="btnExportSettings">Export settings</button>
        <button class="btn btn-secondary btn-small" id="btnImportJSON">Import JSON</button>
        <button class="btn btn-secondary btn-small" id="btnImportCSV">Import CSV</button>
      </div>
    `;
    settingsView.appendChild(card);
    document.getElementById("btnExportJobsJSON").onclick = () => ImportExport.exportJobsJSON();
    document.getElementById("btnExportJobsCSV").onclick = () => ImportExport.exportJobsCSV();
    document.getElementById("btnExportApplications").onclick = () => ImportExport.exportApplications();
    document.getElementById("btnExportSettings").onclick = () => ImportExport.exportSettings();
    document.getElementById("btnImportJSON").onclick = () => ImportExport.triggerFilePicker("application/json", f => ImportExport.importJSONFile(f));
    document.getElementById("btnImportCSV").onclick = () => ImportExport.triggerFilePicker(".csv", f => ImportExport.importCSVFile(f));
  },

  /* ---------- Job modal ---------- */
  openJobModal(jobId) {
    const job = JobManager.get(jobId);
    if (!job) return;
    AppState.ui.modalJobId = jobId;
    this.renderModal(job);
    document.getElementById("modalOverlay").classList.remove("hidden");
  },

  closeModal() {
    document.getElementById("modalOverlay").classList.add("hidden");
    AppState.ui.modalJobId = null;
  },

  renderModal(job) {
    const content = document.getElementById("modalContent");
    const stageOptions = CONFIG.STAGES.map(s => `<option value="${s}" ${job.status === s ? "selected" : ""}>${s.replace(/_/g, " ")}</option>`).join("");

    content.innerHTML = `
      <p class="eyebrow">${job.applyType === "auto" ? "Auto-apply" : "Manual-apply"} · Score ${job.aiScore} · ${job.priority} priority · Trust ${job.trustScore}</p>
      <h2>${Utils.escapeHtml(job.title)} ${job.favorite ? "★" : ""}</h2>
      <p style="color:var(--text-secondary);margin-top:2px">${Utils.escapeHtml(job.company)}${job.location ? " · " + Utils.escapeHtml(job.location) : ""}${job.salary ? " · " + Utils.escapeHtml(job.salary) : ""}</p>
      ${job.deadline ? `<p style="color:var(--danger);font-size:12.5px;margin-top:6px">Deadline: ${Utils.escapeHtml(job.deadline)}</p>` : ""}
      <p style="margin-top:14px;font-size:13.5px;line-height:1.6">${Utils.escapeHtml(job.summary)}</p>

      ${job.matchExplanation.length ? `<div class="modal-section"><h3>Why it fits</h3><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">${job.matchExplanation.map(r => `<li>${Utils.escapeHtml(r)}</li>`).join("")}</ul></div>` : ""}
      ${job.concerns.length ? `<div class="modal-section"><h3>Watch out for</h3><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">${job.concerns.map(r => `<li>${Utils.escapeHtml(r)}</li>`).join("")}</ul></div>` : ""}

      <div class="modal-section">
        <h3>Contact / apply</h3>
        <p style="font-size:13px">${job.contact ? Utils.escapeHtml(job.contact) : "Not captured — check the original posting."} <span style="color:var(--text-tertiary)">(${Utils.escapeHtml(job.applyMethod)})</span></p>
      </div>

      <div class="modal-section" id="docSection">
        <h3>Application documents</h3>
        ${job.documents ? this.renderDocs(job.documents, job) : `<button class="btn btn-secondary btn-small" id="btnGenDocs">Generate CV, cover letter, email &amp; WhatsApp message</button>`}
      </div>

      <div class="modal-section">
        <h3>Notes</h3>
        <textarea id="jobNotesInput" rows="3" placeholder="Private notes about this job…">${Utils.escapeHtml(job.notes)}</textarea>
      </div>

      <div class="modal-btn-row">
        <select id="statusSelect">${stageOptions}</select>
        <button class="btn btn-primary btn-small" id="btnSaveStatus">Update</button>
        <button class="btn btn-secondary btn-small" id="btnToggleFav">${job.favorite ? "Unfavorite" : "★ Favorite"}</button>
        <button class="btn btn-secondary btn-small btn-danger" id="btnDeleteJob">Delete job</button>
      </div>
    `;

    const genBtn = document.getElementById("btnGenDocs");
    if (genBtn) genBtn.onclick = () => this.generateDocsForModal(job);

    document.getElementById("btnSaveStatus").onclick = async () => {
      const stage = document.getElementById("statusSelect").value;
      job.notes = Utils.sanitize(document.getElementById("jobNotesInput").value);
      JobManager.setStage(job.id, stage);
      await Storage.saveJobs();
      Notifications.toast("Status updated.");
      this.renderModal(job);
      this.refreshCurrentView();
    };

    document.getElementById("btnToggleFav").onclick = async () => {
      JobManager.toggleFavorite(job.id);
      await Storage.saveJobs();
      this.renderModal(job);
      this.refreshCurrentView();
    };

    document.getElementById("btnDeleteJob").onclick = async () => {
      if (!confirm("Delete this job permanently?")) return;
      JobManager.remove(job.id);
      await Storage.saveJobs();
      this.closeModal();
      this.refreshCurrentView();
      Notifications.toast("Job deleted.");
    };
  },

  renderDocs(docs, job) {
    const rows = [
      ["cvSummary", "CV summary & bullets"],
      ["coverLetter", "Cover letter"],
      ["email", "Email"],
      ["whatsapp", "WhatsApp message"],
      ["linkedinMessage", "LinkedIn message"],
      ["followUpEmail", "Follow-up email"],
      ["interviewThankYou", "Interview thank-you note"]
    ];
    return rows.filter(([key]) => docs[key]).map(([key, label]) => {
      let extra = "";
      if (key === "email" && job.contact && job.applyMethod === "email") {
        extra = `<a class="btn btn-small btn-secondary" href="mailto:${encodeURIComponent(job.contact)}?subject=${encodeURIComponent(this.extractSubject(docs.email))}&body=${encodeURIComponent(this.stripSubject(docs.email))}">Open in email app</a>`;
      }
      if (key === "whatsapp" && job.contact && job.applyMethod === "whatsapp") {
        extra = `<a class="btn btn-small btn-secondary" href="https://wa.me/${Utils.escapeHtml(job.contact.replace(/[^0-9]/g, ""))}?text=${encodeURIComponent(docs.whatsapp)}" target="_blank" rel="noopener">Open in WhatsApp</a>`;
      }
      return `<div style="margin-bottom:14px">
        <strong style="font-size:12.5px">${label}</strong>
        <div class="doc-box">${Utils.escapeHtml(docs[key])}</div>
        <div class="doc-actions"><button class="btn-ghost" data-copy="${key}">Copy</button>${extra}</div>
      </div>`;
    }).join("");
  },

  extractSubject(emailText) {
    const m = emailText.match(/^Subject:\s*(.+)$/mi);
    return m ? m[1].trim() : "Job Application";
  },
  stripSubject(emailText) {
    return emailText.replace(/^Subject:.*\n+/i, "");
  },

  async generateDocsForModal(job) {
    const section = document.getElementById("docSection");
    section.innerHTML = `<h3>Application documents</h3><div class="intake-status" style="display:flex"><span class="spinner"></span>Writing tailored documents…</div>`;
    try {
      const docs = await DocumentGenerator.generate(job);
      job.documents = docs;
      await Storage.saveJobs();
      this.renderModal(job);
    } catch (e) {
      console.error(e);
      section.innerHTML = `<h3>Application documents</h3><p style="color:var(--danger);font-size:13px">Couldn't generate documents. If you're viewing this file outside Claude, this AI step won't respond.</p><button class="btn btn-secondary btn-small" id="btnGenDocs">Try again</button>`;
      document.getElementById("btnGenDocs").onclick = () => this.generateDocsForModal(job);
    }
  },

  /* ---------- AI Assistant chat UI ---------- */
  appendChatBubble(role, text) {
    const container = document.getElementById("chatMessages");
    if (!container) return;
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble chat-bubble-${role === "user" ? "user" : "ai"}`;
    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return bubble;
  },

  showTyping() {
    const container = document.getElementById("chatMessages");
    if (!container) return null;
    const bubble = document.createElement("div");
    bubble.className = "chat-bubble chat-bubble-ai";
    bubble.id = "typingBubble";
    bubble.innerHTML = `<span class="chat-typing"><span></span><span></span><span></span></span>`;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return bubble;
  },

  async sendChatMessage(message) {
    if (!message.trim()) return;
    this.appendChatBubble("user", message);
    const input = document.getElementById("chatInput");
    if (input) input.value = "";
    const typing = this.showTyping();
    try {
      const reply = await AIAssistant.ask(message);
      typing?.remove();
      this.appendChatBubble("assistant", reply);
    } catch (e) {
      console.error(e);
      typing?.remove();
      this.appendChatBubble("assistant", "I couldn't reach the AI service just now. If you're viewing this file outside Claude, this step won't respond — try again from inside a Claude conversation.");
    }
  }
};

/* ---------------------------------------------------------------------
   15. EVENT WIRING & INITIALIZATION
   --------------------------------------------------------------------- */
async function init() {
  await Storage.init();
  await Storage.loadAll();

  // Sidebar + reused nav-item elements (including header quick-add/avatar buttons)
  document.querySelectorAll(".nav-item[data-view]").forEach(btn => {
    btn.addEventListener("click", () => UI.switchView(btn.dataset.view));
  });

  UI.initIntakeTabs();
  document.getElementById("btnProcessPaste")?.addEventListener("click", () => UI.processPaste());
  document.getElementById("btnProcessBulk")?.addEventListener("click", () => UI.processBulk());
  document.getElementById("btnProcessForm")?.addEventListener("click", () => UI.processForm());

  document.getElementById("filterApply")?.addEventListener("change", () => UI.renderBoard());
  document.getElementById("filterStatus")?.addEventListener("change", () => UI.renderBoard());

  document.getElementById("btnAddSource")?.addEventListener("click", () => UI.addSource());
  document.getElementById("btnSaveProfile")?.addEventListener("click", () => UI.saveProfileFromForm());

  document.getElementById("modalClose")?.addEventListener("click", () => UI.closeModal());
  document.getElementById("modalOverlay")?.addEventListener("click", (e) => { if (e.target.id === "modalOverlay") UI.closeModal(); });

  // Copy-to-clipboard for generated documents (event delegation)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-copy]");
    if (!btn || !AppState.ui.modalJobId) return;
    const job = JobManager.get(AppState.ui.modalJobId);
    if (!job || !job.documents) return;
    navigator.clipboard.writeText(job.documents[btn.dataset.copy]).then(() => Notifications.toast("Copied to clipboard."));
  });

  // Global search (debounced) — filters board + applications live
  const globalSearch = document.getElementById("globalSearch");
  if (globalSearch) {
    globalSearch.addEventListener("input", Utils.debounce((e) => {
      AppState.ui.globalSearchTerm = e.target.value.trim();
      if (AppState.ui.currentView === "board") UI.renderBoard();
    }, 200));
  }

  const applicationsSearch = document.getElementById("applicationsSearch");
  if (applicationsSearch) {
    applicationsSearch.addEventListener("input", Utils.debounce((e) => {
      AppState.ui.applicationsSearchTerm = e.target.value.trim();
      UI.renderApplied();
    }, 200));
  }

  // Notification bell
  document.getElementById("notificationBell")?.addEventListener("click", (e) => {
    e.stopPropagation();
    Notifications.togglePanel();
  });

  // AI Assistant chat
  document.getElementById("chatInputRow")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("chatInput");
    UI.sendChatMessage(input.value);
  });

  document.querySelectorAll(".suggestion-chip").forEach(chip => {
    chip.addEventListener("click", () => UI.sendChatMessage(chip.dataset.prompt));
  });

  // Sticky header scroll shadow
  const topbar = document.querySelector(".topbar");
  const mainScroller = document.querySelector(".main");
  if (topbar) {
    window.addEventListener("scroll", () => topbar.classList.toggle("scrolled", window.scrollY > 4));
  }

  // Keyboard: Escape closes modal / notification panel
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      UI.closeModal();
      const panel = document.getElementById("notifPanel");
      if (panel) panel.remove();
    }
  });

  UI.switchView("dashboard");
}

init().catch(err => {
  console.error("Initialization failed:", err);
  Notifications.toast("Something went wrong starting the app — check the console for details.", 6000);
});
