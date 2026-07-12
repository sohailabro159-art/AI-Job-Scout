/* =========================================================
   Case File — Personal Job Assistant
   ========================================================= */

const MODEL = "claude-sonnet-4-6";

/* ---------- Storage layer (window.storage with in-memory fallback) ---------- */
let storageMode = "checking";
let memoryFallback = { profile: null, sources: [], jobs: [] };

async function storageGet(key, fallback) {
  try {
    if (window.storage) {
      const res = await window.storage.get(key);
      return res ? JSON.parse(res.value) : fallback;
    }
  } catch (e) { /* key not found or storage unavailable */ }
  return fallback;
}

async function storageSet(key, value) {
  try {
    if (window.storage) {
      await window.storage.set(key, JSON.stringify(value));
      return true;
    }
  } catch (e) { console.error("storage set failed", e); }
  return false;
}

async function initStorage() {
  const el = document.getElementById("storageStatus");
  if (window.storage) {
    storageMode = "persistent";
    el.textContent = "● saved automatically";
    el.classList.add("ok");
  } else {
    storageMode = "memory";
    el.textContent = "⚠ no persistent storage — data will not survive a page reload. Open this inside Claude for saving to work.";
    el.classList.add("warn");
  }
}

/* ---------- State ---------- */
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

let state = {
  profile: DEFAULT_PROFILE,
  sources: [],
  jobs: []
};

async function loadState() {
  state.profile = await storageGet("profile", DEFAULT_PROFILE);
  state.sources = await storageGet("sources", []);
  state.jobs = await storageGet("jobs", []);
}

async function saveProfile() { await storageSet("profile", state.profile); }
async function saveSources() { await storageSet("sources", state.sources); }
async function saveJobs() { await storageSet("jobs", state.jobs); }

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }

/* ---------- Toast ---------- */
function toast(msg, ms = 3200) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.remove("hidden");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add("hidden"), ms);
}

/* ---------- Claude API call ---------- */
async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!response.ok) throw new Error("API request failed: " + response.status);
  const data = await response.json();
  const textBlock = data.content.find(b => b.type === "text");
  if (!textBlock) throw new Error("No text in response");
  return textBlock.text;
}

function parseJsonLoose(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{") === -1 ? cleaned.indexOf("[") : cleaned.indexOf("{");
  const endBrace = cleaned.lastIndexOf("}");
  const endBracket = cleaned.lastIndexOf("]");
  const end = Math.max(endBrace, endBracket);
  return JSON.parse(cleaned.slice(start, end + 1));
}

/* ---------- Extraction + scoring ---------- */
function extractionSystemPrompt() {
  const p = state.profile;
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
 "deadline": "YYYY-MM-DD" or null,
 "applyMethod": one of "email","whatsapp","website","inperson","unclear",
 "contact": string or null (email address, phone number, or link found in the text),
 "summary": string (1-2 sentence plain summary of the role),
 "score": integer 0-100 (fit for this candidate),
 "priority": one of "high","medium","low",
 "applyType": one of "auto","manual" (auto = simple email/WhatsApp/direct contact application; manual = website form, account creation, portal, or complex multi-step process),
 "matchReasons": array of short strings (why it fits),
 "concerns": array of short strings (mismatches or missing info, empty array if none)
}

Scoring guide: 80-100 strong fit (entry-level admin/office/coordinator role, Hyderabad/Sindh area, salary in or near range, matches skills). 50-79 plausible but some mismatch (wrong city but remote-friendly, salary unclear, adjacent skillset). Below 50 poor fit (unrelated field, senior-only, far outside salary/location, requires unrelated technical degree).

Respond ONLY with valid JSON, no markdown fences, no commentary. If given a single job, return a single JSON object. If given multiple jobs, return a JSON array of objects in the same order.`;
}

async function extractSingle(rawText, source) {
  const text = await callClaude(extractionSystemPrompt(), `Source: ${source || "unspecified"}\n\nJob posting text:\n${rawText}`);
  const obj = parseJsonLoose(text);
  return buildJobFromExtraction(obj, rawText, source);
}

async function extractBulk(rawTexts, source) {
  const joined = rawTexts.map((t, i) => `--- JOB ${i + 1} ---\n${t}`).join("\n\n");
  const text = await callClaude(extractionSystemPrompt(), `Source: ${source || "unspecified"}\n\nThere are ${rawTexts.length} separate job postings below. Return a JSON array with one object per job, same order.\n\n${joined}`);
  const arr = parseJsonLoose(text);
  return arr.map((obj, i) => buildJobFromExtraction(obj, rawTexts[i], source));
}

function buildJobFromExtraction(obj, rawText, source) {
  return {
    id: uid(),
    title: obj.title || "Untitled role",
    company: obj.company || "Unknown",
    location: obj.location || "",
    salary: obj.salary || null,
    deadline: obj.deadline || null,
    applyMethod: obj.applyMethod || "unclear",
    contact: obj.contact || null,
    summary: obj.summary || "",
    score: typeof obj.score === "number" ? obj.score : 0,
    priority: obj.priority || "low",
    applyType: obj.applyType || "manual",
    matchReasons: obj.matchReasons || [],
    concerns: obj.concerns || [],
    rawText,
    source: source || "unspecified",
    status: "new", // new | reviewing | applied | rejected | expired
    documents: null,
    dateAdded: new Date().toISOString(),
    dateApplied: null
  };
}

/* ---------- Document generation ---------- */
async function generateDocuments(job) {
  const p = state.profile;
  const system = `You write tailored job application material for one candidate. Be natural and conversational, not stiff or template-sounding — this candidate prefers direct, human writing over formal boilerplate. Keep everything honest: never invent employers, dates, or skills not in the candidate profile.

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
 "cvSummary": string (a tailored one-paragraph professional summary + 4-6 bullet points reframing the candidate's real experience for THIS specific role, plain text with line breaks, no markdown symbols),
 "coverLetter": string (a short natural cover letter, 150-220 words, conversational tone),
 "email": string (a ready-to-send application email including a natural subject line as the first line prefixed "Subject: ", then the email body),
 "whatsapp": string (a short, friendly WhatsApp application message, under 80 words, appropriate for messaging an employer directly)
}`;

  const user = `Job title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nApply method: ${job.applyMethod}\nJob summary: ${job.summary}\n\nOriginal posting text:\n${job.rawText}`;

  const text = await callClaude(system, user);
  return parseJsonLoose(text);
}

/* ---------- View switching ---------- */
function switchView(view) {
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById("view-" + view).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  if (view === "dashboard") renderDashboard();
  if (view === "board") renderBoard();
  if (view === "applied") renderApplied();
  if (view === "sources") renderSources();
  if (view === "settings") renderSettings();
}

/* ---------- Dashboard ---------- */
function renderDashboard() {
  document.getElementById("todayDate").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const jobs = state.jobs;
  const todayISO = new Date().toISOString().slice(0, 10);
  const newToday = jobs.filter(j => j.dateAdded.slice(0, 10) === todayISO).length;
  const bestMatches = jobs.filter(j => j.status !== "applied" && j.status !== "rejected").sort((a, b) => b.score - a.score).slice(0, 5);
  const manual = jobs.filter(j => j.applyType === "manual" && j.status !== "applied" && j.status !== "rejected");
  const applied = jobs.filter(j => j.status === "applied").sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
  const withDeadline = jobs.filter(j => j.deadline && j.status !== "applied" && j.status !== "rejected")
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const stats = [
    { num: jobs.length, label: "Total filed" },
    { num: newToday, label: "Added today" },
    { num: jobs.filter(j => j.priority === "high" && j.status !== "applied" && j.status !== "rejected").length, label: "High priority open" },
    { num: manual.length, label: "Need manual action" },
    { num: applied.length, label: "Applied so far" }
  ];
  document.getElementById("statRow").innerHTML = stats.map(s => `
    <div class="stat-card"><span class="stat-num">${s.num}</span><span class="stat-label">${s.label}</span></div>
  `).join("");

  document.getElementById("bestMatches").innerHTML = listOrEmpty(bestMatches, j => miniItem(j, `${j.score}`));
  document.getElementById("manualQueue").innerHTML = listOrEmpty(manual, j => miniItem(j, j.applyMethod));
  document.getElementById("deadlineList").innerHTML = listOrEmpty(withDeadline.slice(0, 6), j => miniItem(j, j.deadline));
  document.getElementById("appliedRecent").innerHTML = listOrEmpty(applied.slice(0, 6), j => miniItem(j, j.status));

  attachMiniItemHandlers();
}

function listOrEmpty(arr, itemFn) {
  if (!arr.length) return `<div class="empty-note">Nothing here yet.</div>`;
  return arr.map(itemFn).join("");
}

function miniItem(job, tagText) {
  return `<div class="mini-item" data-job="${job.id}"><span>${escapeHtml(job.title)} — ${escapeHtml(job.company)}</span><span class="tag" style="background:${priorityColor(job.priority)}22;color:${priorityColor(job.priority)}">${escapeHtml(String(tagText))}</span></div>`;
}

function attachMiniItemHandlers() {
  document.querySelectorAll(".mini-item").forEach(el => {
    el.onclick = () => openJobModal(el.dataset.job);
  });
}

function priorityColor(p) {
  return p === "high" ? "#b5533c" : p === "medium" ? "#e0a458" : "#3fa796";
}

/* ---------- Intake ---------- */
function initIntakeTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p => p.classList.add("hidden"));
      btn.classList.add("active");
      document.getElementById("tab-" + btn.dataset.tab).classList.remove("hidden");
    };
  });
}

function setIntakeStatus(msg) {
  const el = document.getElementById("intakeStatus");
  if (!msg) { el.classList.add("hidden"); return; }
  el.classList.remove("hidden");
  el.innerHTML = `<span class="spinner"></span>${msg}`;
}

async function processPaste() {
  const text = document.getElementById("pasteInput").value.trim();
  const source = document.getElementById("pasteSource").value.trim();
  if (!text) { toast("Paste a job posting first."); return; }
  setIntakeStatus("Extracting details and scoring against your profile…");
  try {
    const job = await extractSingle(text, source);
    state.jobs.unshift(job);
    await saveJobs();
    document.getElementById("pasteInput").value = "";
    renderIntakeResults([job]);
    toast("Job filed: " + job.title);
  } catch (e) {
    console.error(e);
    setIntakeStatus("");
    toast("Couldn't process this job. If you're viewing this outside Claude, the AI step won't work — see Settings.", 5000);
    return;
  }
  setIntakeStatus("");
}

async function processBulk() {
  const raw = document.getElementById("bulkInput").value.trim();
  const source = document.getElementById("bulkSource").value.trim();
  if (!raw) { toast("Paste at least one job posting."); return; }
  const parts = raw.split(/\n-{3,}\n/).map(s => s.trim()).filter(Boolean);
  if (!parts.length) { toast("Couldn't split any jobs out — check your --- separators."); return; }
  setIntakeStatus(`Processing ${parts.length} job${parts.length > 1 ? "s" : ""}…`);
  try {
    const jobs = await extractBulk(parts, source);
    jobs.forEach(j => state.jobs.unshift(j));
    await saveJobs();
    document.getElementById("bulkInput").value = "";
    renderIntakeResults(jobs);
    toast(`Filed ${jobs.length} job${jobs.length > 1 ? "s" : ""}.`);
  } catch (e) {
    console.error(e);
    setIntakeStatus("");
    toast("Couldn't process this batch. If you're viewing this outside Claude, the AI step won't work.", 5000);
    return;
  }
  setIntakeStatus("");
}

async function processForm() {
  const title = document.getElementById("fTitle").value.trim();
  const company = document.getElementById("fCompany").value.trim();
  if (!title || !company) { toast("Title and company are required."); return; }
  const rawText = `${title} at ${company}. ${document.getElementById("fDesc").value.trim()}`;
  setIntakeStatus("Scoring this job against your profile…");
  try {
    const job = await extractSingle(rawText, "Manual entry");
    // override with explicit form fields where provided
    job.title = title;
    job.company = company;
    job.location = document.getElementById("fLocation").value.trim() || job.location;
    job.salary = document.getElementById("fSalary").value.trim() || job.salary;
    job.deadline = document.getElementById("fDeadline").value || job.deadline;
    job.applyMethod = document.getElementById("fApplyMethod").value;
    job.contact = document.getElementById("fContact").value.trim() || job.contact;
    state.jobs.unshift(job);
    await saveJobs();
    renderIntakeResults([job]);
    toast("Job filed: " + job.title);
  } catch (e) {
    console.error(e);
    setIntakeStatus("");
    toast("Couldn't score this job automatically. Filed without a score.", 5000);
    const job = {
      id: uid(), title, company,
      location: document.getElementById("fLocation").value.trim(),
      salary: document.getElementById("fSalary").value.trim() || null,
      deadline: document.getElementById("fDeadline").value || null,
      applyMethod: document.getElementById("fApplyMethod").value,
      contact: document.getElementById("fContact").value.trim() || null,
      summary: document.getElementById("fDesc").value.trim(),
      score: 0, priority: "low", applyType: "manual",
      matchReasons: [], concerns: ["Not auto-scored — API unavailable"],
      rawText, source: "Manual entry", status: "new", documents: null,
      dateAdded: new Date().toISOString(), dateApplied: null
    };
    state.jobs.unshift(job);
    await saveJobs();
    renderIntakeResults([job]);
    return;
  }
  setIntakeStatus("");
}

function renderIntakeResults(jobs) {
  const el = document.getElementById("intakeResults");
  el.innerHTML = jobs.map(j => jobCardHtml(j)).join("") + el.innerHTML;
  attachJobCardHandlers();
}

/* ---------- Job card ---------- */
function jobCardHtml(job) {
  const deadlineFlag = job.deadline ? `<div class="deadline-flag">Deadline: ${job.deadline}</div>` : "";
  return `<div class="job-card priority-${job.priority}" data-job="${job.id}">
    <div class="job-card-top">
      <div>
        <p class="job-title">${escapeHtml(job.title)}</p>
        <p class="job-company">${escapeHtml(job.company)}${job.location ? " · " + escapeHtml(job.location) : ""}</p>
      </div>
      <span class="score-badge">${job.score}</span>
    </div>
    <div class="job-meta">
      ${job.salary ? `<span>${escapeHtml(job.salary)}</span>` : ""}
      <span>${escapeHtml(job.source)}</span>
    </div>
    <span class="apply-pill ${job.applyType}">${job.applyType === "auto" ? "Auto-apply" : "Manual-apply"}</span>
    ${deadlineFlag}
  </div>`;
}

function attachJobCardHandlers() {
  document.querySelectorAll(".job-card").forEach(el => {
    el.onclick = () => openJobModal(el.dataset.job);
  });
}

/* ---------- Board ---------- */
function renderBoard() {
  const applyFilter = document.getElementById("filterApply").value;
  const statusFilter = document.getElementById("filterStatus").value;
  let jobs = [...state.jobs];
  if (applyFilter !== "all") jobs = jobs.filter(j => j.applyType === applyFilter);
  if (statusFilter === "active") jobs = jobs.filter(j => j.status !== "applied" && j.status !== "rejected");

  ["high", "medium", "low"].forEach(p => {
    const col = document.getElementById("col-" + p);
    const subset = jobs.filter(j => j.priority === p).sort((a, b) => b.score - a.score);
    col.innerHTML = subset.length ? subset.map(jobCardHtml).join("") : `<div class="empty-note">No jobs here.</div>`;
  });
  attachJobCardHandlers();
}

/* ---------- Applied ---------- */
function renderApplied() {
  const applied = state.jobs.filter(j => j.status === "applied").sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
  const body = document.getElementById("appliedTableBody");
  if (!applied.length) {
    body.innerHTML = `<tr><td colspan="6" class="empty-note">No applications logged yet.</td></tr>`;
    return;
  }
  body.innerHTML = applied.map(j => `
    <tr>
      <td>${escapeHtml(j.title)}</td>
      <td>${escapeHtml(j.company)}</td>
      <td>${j.dateApplied ? new Date(j.dateApplied).toLocaleDateString() : "—"}</td>
      <td>${escapeHtml(j.applyMethod)}</td>
      <td><span class="status-pill">${escapeHtml(j.status)}</span></td>
      <td><button class="btn-ghost" data-job="${j.id}">View</button></td>
    </tr>
  `).join("");
  body.querySelectorAll("button[data-job]").forEach(b => b.onclick = () => openJobModal(b.dataset.job));
}

/* ---------- Sources ---------- */
function renderSources() {
  const el = document.getElementById("sourceList");
  if (!state.sources.length) { el.innerHTML = `<div class="empty-note">No sources added yet.</div>`; return; }
  el.innerHTML = state.sources.map(s => `
    <div class="source-item">
      <div><span class="stype">${escapeHtml(s.type)}</span>${escapeHtml(s.name)} ${s.link ? `<a href="${escapeHtml(s.link)}" target="_blank" rel="noopener">open ↗</a>` : ""}</div>
      <button class="btn-ghost btn-danger" data-id="${s.id}">Remove</button>
    </div>
  `).join("");
  el.querySelectorAll("button[data-id]").forEach(b => {
    b.onclick = async () => {
      state.sources = state.sources.filter(s => s.id !== b.dataset.id);
      await saveSources();
      renderSources();
    };
  });
}

async function addSource() {
  const name = document.getElementById("sourceNameInput").value.trim();
  const link = document.getElementById("sourceLinkInput").value.trim();
  const type = document.getElementById("sourceTypeInput").value;
  if (!name) { toast("Give the source a name."); return; }
  state.sources.unshift({ id: uid(), name, link, type });
  await saveSources();
  document.getElementById("sourceNameInput").value = "";
  document.getElementById("sourceLinkInput").value = "";
  renderSources();
}

/* ---------- Settings ---------- */
function renderSettings() {
  const p = state.profile;
  document.getElementById("pName").value = p.name || "";
  document.getElementById("pLocation").value = p.location || "";
  document.getElementById("pEducation").value = p.education || "";
  document.getElementById("pSalary").value = p.salary || "";
  document.getElementById("pPhone").value = p.phone || "";
  document.getElementById("pEmail").value = p.email || "";
  document.getElementById("pRoles").value = p.roles || "";
  document.getElementById("pSkills").value = p.skills || "";
  document.getElementById("pExperience").value = p.experience || "";
  document.getElementById("pLanguages").value = p.languages || "";
}

async function saveProfileFromForm() {
  state.profile = {
    name: document.getElementById("pName").value.trim(),
    location: document.getElementById("pLocation").value.trim(),
    education: document.getElementById("pEducation").value.trim(),
    salary: document.getElementById("pSalary").value.trim(),
    phone: document.getElementById("pPhone").value.trim(),
    email: document.getElementById("pEmail").value.trim(),
    roles: document.getElementById("pRoles").value.trim(),
    skills: document.getElementById("pSkills").value.trim(),
    experience: document.getElementById("pExperience").value.trim(),
    languages: document.getElementById("pLanguages").value.trim()
  };
  await saveProfile();
  toast("Profile saved.");
}

/* ---------- Job modal ---------- */
let currentModalJobId = null;

async function openJobModal(jobId) {
  const job = state.jobs.find(j => j.id === jobId);
  if (!job) return;
  currentModalJobId = jobId;
  renderModal(job);
  document.getElementById("modalOverlay").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.add("hidden");
  currentModalJobId = null;
}

function renderModal(job) {
  const content = document.getElementById("modalContent");
  content.innerHTML = `
    <p class="eyebrow" style="color:#2c7b6f">${job.applyType === "auto" ? "Auto-apply" : "Manual-apply"} · Score ${job.score} · ${job.priority} priority</p>
    <h2>${escapeHtml(job.title)}</h2>
    <p style="color:#555;margin-top:2px">${escapeHtml(job.company)}${job.location ? " · " + escapeHtml(job.location) : ""}${job.salary ? " · " + escapeHtml(job.salary) : ""}</p>
    ${job.deadline ? `<p style="color:#b5533c;font-family:var(--mono);font-size:12.5px;margin-top:6px">Deadline: ${job.deadline}</p>` : ""}
    <p style="margin-top:14px;font-size:13.5px;line-height:1.6">${escapeHtml(job.summary)}</p>

    ${job.matchReasons.length ? `<div class="modal-section"><h3>Why it fits</h3><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">${job.matchReasons.map(r => `<li>${escapeHtml(r)}</li>`).join("")}</ul></div>` : ""}
    ${job.concerns.length ? `<div class="modal-section"><h3>Watch out for</h3><ul style="margin:0;padding-left:18px;font-size:13px;line-height:1.7">${job.concerns.map(r => `<li>${escapeHtml(r)}</li>`).join("")}</ul></div>` : ""}

    <div class="modal-section">
      <h3>Contact / apply</h3>
      <p style="font-size:13px">${job.contact ? escapeHtml(job.contact) : "Not captured — check the original posting."} <span style="color:#888">(${escapeHtml(job.applyMethod)})</span></p>
    </div>

    <div class="modal-section" id="docSection">
      <h3>Application documents</h3>
      ${job.documents ? renderDocs(job.documents, job) : `<button class="btn btn-secondary btn-small" id="btnGenDocs">Generate CV, cover letter, email &amp; WhatsApp message</button>`}
    </div>

    <div class="modal-btn-row">
      <select id="statusSelect">
        <option value="new" ${job.status === "new" ? "selected" : ""}>New</option>
        <option value="reviewing" ${job.status === "reviewing" ? "selected" : ""}>Reviewing</option>
        <option value="applied" ${job.status === "applied" ? "selected" : ""}>Applied</option>
        <option value="rejected" ${job.status === "rejected" ? "selected" : ""}>Not pursuing</option>
        <option value="expired" ${job.status === "expired" ? "selected" : ""}>Expired</option>
      </select>
      <button class="btn btn-primary btn-small" id="btnSaveStatus">Update status</button>
      <button class="btn btn-secondary btn-small btn-danger" id="btnDeleteJob">Delete job</button>
    </div>
  `;

  const genBtn = document.getElementById("btnGenDocs");
  if (genBtn) genBtn.onclick = () => generateDocsForModal(job);

  document.getElementById("btnSaveStatus").onclick = async () => {
    const newStatus = document.getElementById("statusSelect").value;
    job.status = newStatus;
    if (newStatus === "applied" && !job.dateApplied) job.dateApplied = new Date().toISOString();
    await saveJobs();
    toast("Status updated.");
    renderModal(job);
    refreshCurrentView();
  };

  document.getElementById("btnDeleteJob").onclick = async () => {
    if (!confirm("Delete this job permanently?")) return;
    state.jobs = state.jobs.filter(j => j.id !== job.id);
    await saveJobs();
    closeModal();
    refreshCurrentView();
    toast("Job deleted.");
  };
}

function renderDocs(docs, job) {
  return `
    <div style="margin-bottom:14px">
      <strong style="font-size:12.5px">CV summary &amp; bullets</strong>
      <div class="doc-box">${escapeHtml(docs.cvSummary)}</div>
      <div class="doc-actions"><button class="btn-ghost" data-copy="cvSummary">Copy</button></div>
    </div>
    <div style="margin-bottom:14px">
      <strong style="font-size:12.5px">Cover letter</strong>
      <div class="doc-box">${escapeHtml(docs.coverLetter)}</div>
      <div class="doc-actions"><button class="btn-ghost" data-copy="coverLetter">Copy</button></div>
    </div>
    <div style="margin-bottom:14px">
      <strong style="font-size:12.5px">Email</strong>
      <div class="doc-box">${escapeHtml(docs.email)}</div>
      <div class="doc-actions">
        <button class="btn-ghost" data-copy="email">Copy</button>
        ${job.contact && job.applyMethod === "email" ? `<a class="btn btn-small btn-secondary" href="mailto:${encodeURIComponent(job.contact)}?subject=${encodeURIComponent(extractSubject(docs.email))}&body=${encodeURIComponent(stripSubject(docs.email))}">Open in email app</a>` : ""}
      </div>
    </div>
    <div>
      <strong style="font-size:12.5px">WhatsApp message</strong>
      <div class="doc-box">${escapeHtml(docs.whatsapp)}</div>
      <div class="doc-actions">
        <button class="btn-ghost" data-copy="whatsapp">Copy</button>
        ${job.contact && job.applyMethod === "whatsapp" ? `<a class="btn btn-small btn-secondary" href="https://wa.me/${escapeHtml(job.contact.replace(/[^0-9]/g, ""))}?text=${encodeURIComponent(docs.whatsapp)}" target="_blank" rel="noopener">Open in WhatsApp</a>` : ""}
      </div>
    </div>
  `;
}

function extractSubject(emailText) {
  const m = emailText.match(/^Subject:\s*(.+)$/mi);
  return m ? m[1].trim() : "Job Application";
}
function stripSubject(emailText) {
  return emailText.replace(/^Subject:.*\n+/i, "");
}

async function generateDocsForModal(job) {
  const section = document.getElementById("docSection");
  section.innerHTML = `<h3>Application documents</h3><div class="intake-status" style="display:block"><span class="spinner"></span>Writing tailored CV, cover letter, email and WhatsApp message…</div>`;
  try {
    const docs = await generateDocuments(job);
    job.documents = docs;
    await saveJobs();
    renderModal(job);
  } catch (e) {
    console.error(e);
    section.innerHTML = `<h3>Application documents</h3><p style="color:#b5533c;font-size:13px">Couldn't generate documents. If you're viewing this file outside Claude, this AI step won't respond.</p><button class="btn btn-secondary btn-small" id="btnGenDocs">Try again</button>`;
    document.getElementById("btnGenDocs").onclick = () => generateDocsForModal(job);
  }
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-copy]");
  if (!btn || !currentModalJobId) return;
  const job = state.jobs.find(j => j.id === currentModalJobId);
  if (!job || !job.documents) return;
  navigator.clipboard.writeText(job.documents[btn.dataset.copy]).then(() => toast("Copied to clipboard."));
});

function refreshCurrentView() {
  const activeBtn = document.querySelector(".nav-item.active");
  if (activeBtn) switchView(activeBtn.dataset.view);
}

/* ---------- Utils ---------- */
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
}

/* ---------- Init ---------- */
async function init() {
  await initStorage();
  await loadState();

  document.querySelectorAll(".nav-item").forEach(btn => {
    btn.onclick = () => switchView(btn.dataset.view);
  });

  initIntakeTabs();
  document.getElementById("btnProcessPaste").onclick = processPaste;
  document.getElementById("btnProcessBulk").onclick = processBulk;
  document.getElementById("btnProcessForm").onclick = processForm;

  document.getElementById("filterApply").onchange = renderBoard;
  document.getElementById("filterStatus").onchange = renderBoard;

  document.getElementById("btnAddSource").onclick = addSource;
  document.getElementById("btnSaveProfile").onclick = saveProfileFromForm;
  document.getElementById("btnRefreshReport").onclick = renderDashboard;

  document.getElementById("modalClose").onclick = closeModal;
  document.getElementById("modalOverlay").onclick = (e) => { if (e.target.id === "modalOverlay") closeModal(); };

  renderDashboard();
}

init();
