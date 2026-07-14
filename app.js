/**
 * Personal AI Job Hunter — Application Core + UI Controller
 * filename: app.js
 *
 * Everything here is 100% client-side. There is no backend/database — all
 * data lives in this browser's localStorage. AI features call the Claude
 * API endpoint that is proxied by this environment (see AIAssistant).
 *
 * Job-source connectors below return realistic MOCK data. Real government/
 * NGO/portal sites either require official APIs or restrict scraping, so
 * each connector is a clean, swappable slot: fetchJobs() -> parseJobs() ->
 * normalizeJobs(). Swap the body of fetchJobs() for a real API/RSS call
 * later without touching anything else in the app.
 */

(function () {
'use strict';

// ==========================================
// 0. UTILITIES
// ==========================================

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(iso) {
    if (!iso) return 'never';
    const then = new Date(iso).getTime();
    if (isNaN(then)) return 'never';
    const diff = Math.max(0, Date.now() - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(iso);
}

function daysUntil(iso) {
    if (!iso) return null;
    const target = new Date(iso).setHours(0, 0, 0, 0);
    const today = new Date().setHours(0, 0, 0, 0);
    return Math.round((target - today) / 86400000);
}

function initials(name) {
    if (!name || !name.trim()) return '?';
    return name.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

// ==========================================
// 1. STORAGE
// ==========================================

class LocalStorageDB {
    constructor(namespace = 'AI_Job_Hunter') { this.namespace = namespace; }
    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(`${this.namespace}_${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) { console.error(`Error reading ${key}`, e); return defaultValue; }
    }
    set(key, value) {
        try { localStorage.setItem(`${this.namespace}_${key}`, JSON.stringify(value)); return true; }
        catch (e) { console.error(`Error saving ${key}`, e); return false; }
    }
    remove(key) { localStorage.removeItem(`${this.namespace}_${key}`); }
    clearAll() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.namespace)) localStorage.removeItem(key);
        });
    }
}
const db = new LocalStorageDB();

// ==========================================
// 2. SETTINGS MANAGER
// ==========================================

class SettingsManager {
    constructor() {
        this.defaultSettings = {
            theme: 'light',
            notifications: { newJobs: true, deadlineReminders: true, interviewReminders: true, profileReminders: true }
        };
        this.settings = db.get('settings', this.defaultSettings);
        if (!this.settings.notifications) this.settings.notifications = this.defaultSettings.notifications;
    }
    updateSetting(category, key, value) {
        if (typeof this.settings[category] === 'object' && this.settings[category] !== null) {
            this.settings[category][key] = value;
        } else {
            this.settings[category] = key === null ? value : { [key]: value };
        }
        this.save();
    }
    save() { db.set('settings', this.settings); }
    reset() { this.settings = JSON.parse(JSON.stringify(this.defaultSettings)); this.save(); }
}

// ==========================================
// 3. PROFILE MANAGER
// ==========================================

class ProfileManager {
    constructor() { this.profile = db.get('profile', this.getEmptyProfile()); }

    getEmptyProfile() {
        return {
            setupComplete: false,
            personalInfo: { name: '', email: '', phone: '', country: '', province: '', city: '', address: '', photo: '' },
            education: { degree: '', university: '', passingYear: '', cgpa: '' },
            certificates: [],
            skills: [],
            experience: [],
            preferredCategories: [],
            preferredCities: [],
            sourceCategories: ['government', 'ngo', 'organizations', 'portals', 'career_pages'],
            resumeMetadata: null,
            resumeHistory: []
        };
    }

    update(section, data) { this.profile[section] = data; this.save(); }
    getProfile() { return this.profile; }
    save() { db.set('profile', this.profile); }
    isComplete() {
        const p = this.profile;
        return !!(p.personalInfo.name && (p.skills.length > 0 || p.experience.length > 0));
    }
    summaryText() {
        const p = this.profile;
        return [
            `Name: ${p.personalInfo.name || 'Not provided'}`,
            `Location: ${[p.personalInfo.city, p.personalInfo.province, p.personalInfo.country].filter(Boolean).join(', ') || 'Not provided'}`,
            `Education: ${p.education.degree || ''} ${p.education.university ? 'from ' + p.education.university : ''}`.trim(),
            `Skills: ${p.skills.join(', ') || 'None listed'}`,
            `Experience: ${p.experience.map(e => `${e.role} at ${e.org} (${e.duration})`).join('; ') || 'None listed'}`,
            `Preferred categories: ${p.preferredCategories.join(', ') || 'Any'}`,
            `Preferred cities: ${p.preferredCities.join(', ') || 'Any'}`
        ].join('\n');
    }
}

// ==========================================
// 4. RESUME PROCESSOR
// ==========================================

class ResumeProcessor {
    constructor(profileManager) {
        this.profileManager = profileManager;
        this.supportedFormats = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
        this.lastRawFile = null; // kept in memory only, not persisted
    }

    validFile(file) {
        if (this.supportedFormats.includes(file.type)) return true;
        // Fallback to extension check since some browsers misreport MIME type
        return /\.(pdf|docx|txt)$/i.test(file.name);
    }

    async processUpload(file) {
        if (!this.validFile(file)) throw new Error('Unsupported file format. Please upload a PDF, DOCX, or TXT file.');
        this.lastRawFile = file;

        const rawText = await this.extractText(file);
        const analysis = this.analyzeTextHeuristic(rawText);

        const resumeData = {
            id: uid(),
            fileName: file.name,
            fileSize: file.size,
            uploadDate: new Date().toISOString(),
            extractedText: rawText.slice(0, 6000),
            extractedSkills: analysis.skills,
            extractedEducation: analysis.education,
            extractedExperience: analysis.experience
        };

        this.profileManager.update('resumeMetadata', resumeData);
        const history = this.profileManager.profile.resumeHistory || [];
        history.unshift({ id: resumeData.id, fileName: resumeData.fileName, uploadDate: resumeData.uploadDate, fileSize: resumeData.fileSize });
        this.profileManager.update('resumeHistory', history.slice(0, 10));

        return resumeData;
    }

    // TXT files are read for real; PDF/DOCX text extraction needs a parsing
    // library we don't have here, so we fall back to a labeled placeholder
    // that still lets the rest of the pipeline (matching, AI analysis) run.
    async extractText(file) {
        if (file.type === 'text/plain' || /\.txt$/i.test(file.name)) {
            return await file.text();
        }
        return `[Binary ${file.name.split('.').pop().toUpperCase()} file "${file.name}" — full text extraction requires a PDF/DOCX parser. Using filename and any manually entered profile data for matching instead.]`;
    }

    analyzeTextHeuristic(text) {
        const profile = this.profileManager.getProfile();
        // Best-effort heuristic extraction; real NLP extraction is a good future upgrade.
        return {
            skills: profile.skills.length ? profile.skills : [],
            education: profile.education.degree ? [profile.education] : [],
            experience: profile.experience || []
        };
    }
}

// ==========================================
// 5. NOTIFICATIONS
// ==========================================

class NotificationSystem {
    constructor(settingsManager) {
        this.settings = settingsManager;
        this.notifications = db.get('notifications', []);
    }
    add(type, message, metadata = {}) {
        const prefs = this.settings.settings.notifications || {};
        if (type === 'deadline' && prefs.deadlineReminders === false) return;
        if (type === 'interview' && prefs.interviewReminders === false) return;
        if (type === 'newJob' && prefs.newJobs === false) return;
        if ((type === 'profile' || type === 'resume') && prefs.profileReminders === false) return;

        // Avoid duplicate spam of the same message
        if (this.notifications.some(n => n.message === message && !n.read)) return;

        const note = { id: uid(), type, message, metadata, read: false, date: new Date().toISOString() };
        this.notifications.unshift(note);
        this.notifications = this.notifications.slice(0, 50);
        this.save();
        return note;
    }
    markAllRead() { this.notifications.forEach(n => n.read = true); this.save(); }
    clearAll() { this.notifications = []; this.save(); }
    unreadCount() { return this.notifications.filter(n => !n.read).length; }
    save() { db.set('notifications', this.notifications); }
}

// ==========================================
// 6. JOB SOURCES (CONNECTORS)
// ==========================================

class JobSource {
    constructor(id, name, type, website, category) {
        this.id = id; this.name = name; this.type = type; this.website = website;
        this.category = category || 'other';
        this.enabled = true; this.lastScan = null; this.status = 'Idle'; this.custom = false;
    }
    async fetchJobs() { return []; }
    parseJobs(raw) { return raw; }
    normalizeJobs(parsed) { return parsed; }
    calculateTrust() { return this.custom ? 60 : 85; }
    async execute() {
        try {
            this.status = 'Scanning';
            const raw = await this.fetchJobs();
            const parsed = this.parseJobs(raw);
            const normalized = this.normalizeJobs(parsed);
            this.lastScan = new Date().toISOString();
            this.status = 'Idle';
            return normalized;
        } catch (e) {
            this.status = 'Error'; console.error(`Source ${this.name} failed:`, e); return [];
        }
    }
}

function makeNormalizer(source) {
    return (jobs) => jobs.map(j => ({
        sourceId: source.id, sourceName: source.name, sourceCategory: source.category,
        title: j.title, company: j.company, location: j.location,
        description: j.description, salary: j.salary || '', deadline: j.deadline || '',
        url: j.url || source.website, applyMethod: j.applyMethod || 'website'
    }));
}

class GovernmentConnector extends JobSource {
    constructor(id, name, website, mock) { super(id, name, 'Government', website, 'government'); this._mock = mock; }
    async fetchJobs() { return this._mock; }
    normalizeJobs(jobs) { return makeNormalizer(this)(jobs); }
}
class NGOConnector extends JobSource {
    constructor(id, name, website, mock) { super(id, name, 'NGO', website, 'ngo'); this._mock = mock; }
    async fetchJobs() { return this._mock; }
    normalizeJobs(jobs) { return makeNormalizer(this)(jobs); }
}
class PortalConnector extends JobSource {
    constructor(id, name, website, mock) { super(id, name, 'Job Portal', website, 'portals'); this._mock = mock; }
    async fetchJobs() { return this._mock; }
    normalizeJobs(jobs) { return makeNormalizer(this)(jobs); }
}
class OrganizationConnector extends JobSource {
    constructor(id, name, website, mock) { super(id, name, 'Organization', website, 'organizations'); this._mock = mock; }
    async fetchJobs() { return this._mock; }
    normalizeJobs(jobs) { return makeNormalizer(this)(jobs); }
}
class CareerPageConnector extends JobSource {
    constructor(id, name, website, mock) { super(id, name, 'Company Career Page', website, 'career_pages'); this._mock = mock; }
    async fetchJobs() { return this._mock; }
    normalizeJobs(jobs) { return makeNormalizer(this)(jobs); }
}

class SourceManager {
    constructor() {
        const savedStates = db.get('sources_state', {});
        const custom = db.get('sources_custom', []);

        this.sources = [
            new GovernmentConnector('bpsc', 'BPSC', 'https://bpsc.gov.pk', [
                { title: 'Assistant Director (IT)', company: 'IT Board', location: 'Quetta', description: 'BSc CS, 2 yrs experience, MS Office, networking basics.', deadline: '' }
            ]),
            new GovernmentConnector('spsc', 'SPSC', 'https://spsc.gov.pk', [
                { title: 'Computer Operator', company: 'Sindh Public Service Commission', location: 'Hyderabad', description: 'Intermediate/BA, typing speed 30wpm, MS Office, data entry.', deadline: '' }
            ]),
            new GovernmentConnector('fpsc', 'FPSC', 'https://fpsc.gov.pk', [
                { title: 'Data Entry Operator', company: 'Federal Government', location: 'Islamabad', description: 'Bachelor degree, MS Excel, MS Word, attention to detail.', deadline: '' }
            ]),
            new GovernmentConnector('njp', 'National Job Portal', 'https://njp.gov.pk', [
                { title: 'Office Assistant', company: 'National Job Portal Listing', location: 'Sindh', description: 'Bachelor degree, admin support, correspondence, filing.', deadline: '' }
            ]),
            new NGOConnector('un', 'UN Careers', 'https://careers.un.org', [
                { title: 'Information Systems Officer', company: 'UN Secretariat', location: 'Remote / New York', description: 'MSc, 5 yrs exp, Python, Data Analysis.', deadline: '' }
            ]),
            new NGOConnector('who', 'WHO Careers', 'https://who.int/careers', [
                { title: 'Administrative Assistant', company: 'World Health Organization', location: 'Karachi', description: 'Bachelor degree, MS Office, correspondence, multilingual.', deadline: '' }
            ]),
            new NGOConnector('unicef', 'UNICEF', 'https://unicef.org/careers', [
                { title: 'Field Coordinator', company: 'UNICEF', location: 'Hyderabad', description: 'BS in Social Sciences, community outreach, Urdu/Sindhi/English.', deadline: '' }
            ]),
            new NGOConnector('reliefweb', 'ReliefWeb', 'https://reliefweb.int/jobs', [
                { title: 'Program Support Officer', company: 'Mercy Corps', location: 'Sindh', description: 'BA/BS, coordination, reporting, local language skills.', deadline: '' }
            ]),
            new NGOConnector('acted', 'ACTED', 'https://acted.org', [
                { title: 'Admin & HR Officer', company: 'ACTED', location: 'Hyderabad', description: 'Bachelor degree, HR admin, MS Office, English/Sindhi.', deadline: '' }
            ]),
            new NGOConnector('savechildren', 'Save the Children', 'https://savethechildren.net/careers', [
                { title: 'Front Desk Officer', company: 'Save the Children', location: 'Hyderabad', description: 'Bachelor degree, front desk, visitor management, phone etiquette.', deadline: '' }
            ]),
            new OrganizationConnector('nadra', 'NADRA', 'https://nadra.gov.pk', [
                { title: 'Data Entry Operator', company: 'NADRA', location: 'Hyderabad', description: 'Intermediate, fast typing, data verification.', deadline: '' }
            ]),
            new OrganizationConnector('sbp', 'State Bank of Pakistan', 'https://sbp.org.pk', [
                { title: 'Coordinator', company: 'State Bank of Pakistan', location: 'Karachi', description: 'Bachelor degree, coordination, MS Office, communication.', deadline: '' }
            ]),
            new OrganizationConnector('ogdcl', 'OGDCL', 'https://ogdcl.com', [
                { title: 'Admin Officer', company: 'OGDCL', location: 'Hyderabad', description: 'Bachelor degree, admin operations, MS Office.', deadline: '' }
            ]),
            new OrganizationConnector('railways', 'Pakistan Railways', 'https://pakrail.gov.pk', [
                { title: 'Clerk', company: 'Pakistan Railways', location: 'Sindh', description: 'Intermediate, record keeping, correspondence.', deadline: '' }
            ]),
            new OrganizationConnector('ptcl', 'PTCL', 'https://ptcl.com.pk', [
                { title: 'Customer Support Officer', company: 'PTCL', location: 'Hyderabad', description: 'Bachelor degree, communication, multilingual, customer handling.', deadline: '' }
            ]),
            new PortalConnector('rozee', 'Rozee.pk', 'https://rozee.pk', [
                { title: 'Front Desk Officer', company: 'Local Business', location: 'Hyderabad', description: 'Intermediate/Bachelor, front desk, MS Office, English/Urdu.', deadline: '' }
            ]),
            new PortalConnector('brightspyre', 'BrightSpyre', 'https://brightspyre.com', [
                { title: 'Admin Coordinator', company: 'Private Company', location: 'Hyderabad', description: 'Bachelor degree, admin support, scheduling.', deadline: '' }
            ]),
            new PortalConnector('mustakbil', 'Mustakbil', 'https://mustakbil.com', [
                { title: 'Computer Operator', company: 'Private Company', location: 'Sindh', description: 'MS Office, typing, data entry.', deadline: '' }
            ]),
            new CareerPageConnector('uni_career', 'University Career Pages', 'https://example-university.edu.pk/careers', [
                { title: 'Office Coordinator', company: 'Local University', location: 'Jamshoro', description: 'Bachelor degree, scheduling, correspondence, MS Office.', deadline: '' }
            ]),
            new CareerPageConnector('hospital_career', 'Hospital Career Pages', 'https://example-hospital.pk/careers', [
                { title: 'Computer Operator', company: 'AIMS Hospital', location: 'Hyderabad', description: 'Intermediate/Bachelor, data entry, MS Office, patient records.', deadline: '' }
            ])
        ];

        // Restore enabled states
        this.sources.forEach(src => { if (savedStates[src.id] !== undefined) src.enabled = savedStates[src.id]; });

        // Restore custom sources (Facebook groups, WhatsApp channels, etc. — manual-only, never scraped)
        custom.forEach(c => {
            const s = new JobSource(c.id, c.name, c.type, c.website, 'custom');
            s.custom = true; s.enabled = c.enabled !== false;
            this.sources.push(s);
        });
    }

    addCustom(name, website, type) {
        const s = new JobSource(uid(), name, type, website, 'custom');
        s.custom = true;
        this.sources.push(s);
        this.saveCustom();
        this.saveStates();
        return s;
    }

    removeCustom(id) {
        this.sources = this.sources.filter(s => s.id !== id);
        this.saveCustom();
    }

    toggleSource(id, isEnabled) {
        const s = this.sources.find(s => s.id === id);
        if (s) { s.enabled = isEnabled; this.saveStates(); }
    }

    saveStates() {
        const states = {}; this.sources.forEach(s => states[s.id] = s.enabled);
        db.set('sources_state', states);
    }
    saveCustom() {
        db.set('sources_custom', this.sources.filter(s => s.custom).map(s => ({ id: s.id, name: s.name, type: s.type, website: s.website, enabled: s.enabled })));
    }
    getEnabledSources() { return this.sources.filter(s => s.enabled && !s.custom); }
    getByCategory(profileCategories) {
        if (!profileCategories || !profileCategories.length) return this.sources;
        return this.sources.filter(s => profileCategories.includes(s.category) || s.custom);
    }
}

// ==========================================
// 7. MATCH ENGINE
// ==========================================

class MatchEngine {
    constructor(profileManager) { this.profileManager = profileManager; }

    calculateMatch(job) {
        const profile = this.profileManager.getProfile();
        let score = 0;
        const explanations = [];
        const jobText = `${job.title || ''} ${job.description || ''}`.toLowerCase();

        // Skills (40%)
        if (profile.skills && profile.skills.length > 0) {
            const matched = profile.skills.filter(s => jobText.includes(s.toLowerCase()));
            score += (matched.length / profile.skills.length) * 40;
            if (matched.length) explanations.push(`Matched skills: ${matched.join(', ')}`);
            else explanations.push('No listed skills matched this posting\'s text.');
        } else {
            explanations.push('Add skills to your profile for a more accurate score.');
        }

        // Location (20%)
        if (profile.preferredCities && profile.preferredCities.length > 0 && job.location) {
            const hit = profile.preferredCities.some(c => job.location.toLowerCase().includes(c.toLowerCase()));
            if (hit) { score += 20; explanations.push('Location matches your preferences.'); }
            else explanations.push('Location is outside your preferred cities.');
        } else {
            score += 10;
        }

        // Category / role (20%)
        if (profile.preferredCategories && profile.preferredCategories.length > 0) {
            const catWords = { government: 'government', ngo: 'ngo', private: 'private', teaching: 'teach', administration: 'admin', hr: 'hr', it: 'it', data_entry: 'data entry', customer_support: 'customer', remote: 'remote' };
            const hit = profile.preferredCategories.some(c => jobText.includes((catWords[c] || c).toLowerCase()) || (job.sourceCategory && job.sourceCategory === c));
            if (hit) { score += 20; explanations.push('Matches one of your preferred categories.'); }
        } else {
            score += 10;
        }

        // Experience / education presence (20%)
        if (profile.experience && profile.experience.length > 0) { score += 12; explanations.push('Your experience is relevant background for this role.'); }
        if (profile.education && profile.education.degree) { score += 8; explanations.push(`Education (${profile.education.degree}) noted.`); }

        return { score: Math.max(0, Math.min(100, Math.round(score))), explanation: explanations };
    }
}

// ==========================================
// 8. APPLICATION TRACKER
// Stages (lowercase, map 1:1 to #stage-<status> elements):
// saved, applied, assessment, interview, offer, rejected, accepted, archived
// ==========================================

class ApplicationTracker {
    constructor() { this.applications = db.get('applications', []); }

    addJob(job, matchData) {
        const dup = this.applications.find(a => (job.url && a.url === job.url) || (a.title === job.title && a.company === job.company));
        if (dup) return null;

        const newApp = {
            ...job,
            jobId: uid(),
            matchScore: matchData.score,
            matchExplanation: matchData.explanation,
            status: 'saved',
            dateAdded: new Date().toISOString(),
            dateApplied: null,
            interviewDate: null,
            interviewType: '',
            interviewNotes: '',
            notes: []
        };
        this.applications.unshift(newApp);
        this.save();
        return newApp;
    }

    updateJob(jobId, patch) {
        const app = this.applications.find(a => a.jobId === jobId);
        if (!app) return null;
        Object.assign(app, patch);
        this.save();
        return app;
    }

    updateStatus(jobId, newStatus) {
        const app = this.applications.find(a => a.jobId === jobId);
        if (app) {
            app.status = newStatus;
            if (newStatus === 'applied' && !app.dateApplied) app.dateApplied = new Date().toISOString();
            this.save();
        }
        return app;
    }

    addNote(jobId, note) {
        const app = this.applications.find(a => a.jobId === jobId);
        if (app) { app.notes.push({ text: note, date: new Date().toISOString() }); this.save(); }
    }

    removeJob(jobId) {
        this.applications = this.applications.filter(a => a.jobId !== jobId);
        this.save();
    }

    getByStatus(status) {
        return this.applications.filter(a => a.status === status).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }

    save() { db.set('applications', this.applications); }
}

// ==========================================
// 9. AI ASSISTANT — calls the real Claude API
// ==========================================

class AIAssistant {
    constructor(profileManager, tracker) {
        this.profileManager = profileManager;
        this.tracker = tracker;
    }

    async callClaude(systemContext, userMessage) {
        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 1000,
                    messages: [
                        { role: 'user', content: `${systemContext}\n\n---\n\n${userMessage}` }
                    ]
                })
            });
            if (!response.ok) throw new Error(`API error ${response.status}`);
            const data = await response.json();
            const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
            return text || "I couldn't generate a response for that — try rephrasing.";
        } catch (e) {
            console.error('AI call failed:', e);
            return "I couldn't reach the AI service just now. Please check your connection and try again in a moment.";
        }
    }

    async chat(message) {
        const profile = this.profileManager.getProfile();
        const recentJobs = this.tracker.applications.slice(0, 5)
            .map(j => `- ${j.title} at ${j.company} (${j.matchScore}% match, status: ${j.status})`).join('\n') || 'No jobs tracked yet.';
        const context = `You are a friendly, practical career assistant inside a personal job-hunting app. Keep replies concise and actionable (plain text, no markdown headers). Here is the user's profile:\n${this.profileManager.summaryText()}\n\nRecent tracked jobs:\n${recentJobs}`;
        return this.callClaude(context, message);
    }

    async recommendJobs() {
        return this.chat('Based on my profile, what specific job titles and sectors should I focus my search on right now, and why? Keep it to a short list with brief reasons.');
    }

    async improveResume(resumeText) {
        const context = `You are a resume coach. Give 4-6 specific, prioritized suggestions to improve this resume for entry-level/junior roles. Be concrete, not generic.`;
        return this.callClaude(context, resumeText || this.profileManager.summaryText());
    }

    async analyzeResume(resumeText) {
        const context = `You are a resume analyst. Assess this resume/profile for strengths, gaps, and 3 concrete next steps. Keep it under 200 words, plain text.`;
        return this.callClaude(context, resumeText || this.profileManager.summaryText());
    }

    async generateCoverLetter(job) {
        if (!job) return 'Pick a job first, then ask me to write a cover letter for it.';
        const context = `Write a short, natural, conversational cover letter (not overly formal, no clichés) for this applicant applying to the job below. Sign off with the applicant's name if known.\n\nApplicant profile:\n${this.profileManager.summaryText()}`;
        const jobText = `Job: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nDescription: ${job.description}`;
        return this.callClaude(context, jobText);
    }

    async prepareInterview(job) {
        const context = `You are an interview coach. Give 5 likely interview questions for this role plus one short tip per question on how to answer well, tailored to the applicant's background below.\n\nApplicant profile:\n${this.profileManager.summaryText()}`;
        const jobText = job ? `Job: ${job.title} at ${job.company}\nDescription: ${job.description}` : 'General entry-level office/admin role.';
        return this.callClaude(context, jobText);
    }

    async careerAdvice() {
        return this.chat('Give me practical career advice for my next 30 days of job searching, specific to my background and location preferences.');
    }

    async explainMatch(job) {
        const context = `Briefly explain in 2-3 sentences why this job is or isn't a good fit for the applicant below, and name the single biggest missing qualification if any.\n\nApplicant profile:\n${this.profileManager.summaryText()}`;
        const jobText = `Job: ${job.title} at ${job.company}\nDescription: ${job.description}\nHeuristic match score: ${job.matchScore}%`;
        return this.callClaude(context, jobText);
    }
}

// ==========================================
// 10. JOB HUNTER (PIPELINE)
// ==========================================

class JobHunter {
    constructor(sourceManager, matchEngine, tracker, notifier) {
        this.sourceManager = sourceManager; this.matchEngine = matchEngine;
        this.tracker = tracker; this.notifier = notifier; this.isHunting = false;
    }

    async startHunting(profile, onStep) {
        if (this.isHunting) return { newJobsFound: 0 };
        this.isHunting = true;
        let newJobsFound = 0;
        try {
            onStep && onStep('scan');
            const sources = this.sourceManager.getByCategory(profile.sourceCategories).filter(s => s.enabled);
            const collected = [];
            for (const source of sources) {
                const jobs = await source.execute();
                collected.push(...jobs);
            }

            onStep && onStep('analyze');
            await new Promise(r => setTimeout(r, 250));

            onStep && onStep('match');
            const scored = collected.map(job => ({ job, match: this.matchEngine.calculateMatch(job) }));

            onStep && onStep('rank');
            scored.sort((a, b) => b.match.score - a.match.score);

            onStep && onStep('save');
            for (const { job, match } of scored) {
                const added = this.tracker.addJob(job, match);
                if (added) newJobsFound++;
            }

            if (newJobsFound > 0) {
                this.notifier.add('newJob', `Hunt completed — found ${newJobsFound} new job${newJobsFound === 1 ? '' : 's'} matching your profile.`);
            }
        } finally {
            this.isHunting = false;
        }
        return { newJobsFound };
    }
}

// ==========================================
// 11. DATA EXPORT / IMPORT
// ==========================================

class DataExportImport {
    exportJSON() {
        const backup = {
            profile: db.get('profile'), applications: db.get('applications'),
            settings: db.get('settings'), sourcesState: db.get('sources_state'),
            sourcesCustom: db.get('sources_custom'), notifications: db.get('notifications'),
            exportDate: new Date().toISOString()
        };
        this.downloadFile(JSON.stringify(backup, null, 2), `JobHunter_Backup_${new Date().toISOString().slice(0, 10)}.json`, 'application/json');
    }

    exportCSV(apps) {
        if (!apps || !apps.length) return false;
        const headers = ['Title', 'Company', 'Location', 'Status', 'Match Score', 'Date Added'];
        const rows = apps.map(a => [a.title, a.company, a.location, a.status, a.matchScore, a.dateAdded]
            .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`));
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        this.downloadFile(csv, 'JobHunter_Applications.csv', 'text/csv');
        return true;
    }

    async importJSON(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (data.profile) db.set('profile', data.profile);
                    if (data.applications) db.set('applications', data.applications);
                    if (data.settings) db.set('settings', data.settings);
                    if (data.sourcesState) db.set('sources_state', data.sourcesState);
                    if (data.sourcesCustom) db.set('sources_custom', data.sourcesCustom);
                    if (data.notifications) db.set('notifications', data.notifications);
                    resolve(true);
                } catch (err) { reject(new Error('Invalid backup file.')); }
            };
            reader.onerror = () => reject(new Error('Could not read file.'));
            reader.readAsText(file);
        });
    }

    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// ==========================================
// 12. UI CONTROLLER
// ==========================================

class UIController {
    constructor() {
        this.settings = new SettingsManager();
        this.profile = new ProfileManager();
        this.resume = new ResumeProcessor(this.profile);
        this.notifications = new NotificationSystem(this.settings);
        this.sources = new SourceManager();
        this.matchEngine = new MatchEngine(this.profile);
        this.tracker = new ApplicationTracker();
        this.ai = new AIAssistant(this.profile, this.tracker);
        this.hunter = new JobHunter(this.sources, this.matchEngine, this.tracker, this.notifications);
        this.io = new DataExportImport();

        this.wizardStep = 1;
        this.wizardData = null; // scratch profile object while wizard is open
        this.wizardResumeFile = null;
        this.currentView = 'dashboard';

        this.init();
    }

    $(id) { return document.getElementById(id); }

    init() {
        this.applyTheme();
        this.bindGlobalUI();
        this.bindWizard();
        this.bindNav();
        this.bindDashboard();
        this.bindProfilePage();
        this.bindResumePage();
        this.bindSourcesPage();
        this.bindHunterPage();
        this.bindMatchedPage();
        this.bindApplicationsPage();
        this.bindInterviewsPage();
        this.bindAssistantPage();
        this.bindSettingsPage();
        this.bindModal();

        if (!this.profile.profile.setupComplete) {
            this.openWizard();
        } else {
            this.showApp();
        }
        this.checkProfileCompleteness();
        console.log('Personal AI Job Hunter initialized.');
    }

    // ---------- Theme ----------
    applyTheme() {
        document.body.classList.toggle('theme-dark', this.settings.settings.theme === 'dark');
    }

    // ---------- Toast / Modal ----------
    toast(message, timeout = 3200) {
        const el = this.$('toast');
        el.textContent = message;
        el.classList.remove('hidden');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => el.classList.add('hidden'), timeout);
    }

    bindModal() {
        this.$('modalClose').addEventListener('click', () => this.closeModal());
        this.$('modalOverlay').addEventListener('click', (e) => { if (e.target.id === 'modalOverlay') this.closeModal(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.closeModal(); });
    }
    openModal(html) {
        this.$('modalContent').innerHTML = html;
        this.$('modalOverlay').classList.remove('hidden');
    }
    closeModal() { this.$('modalOverlay').classList.add('hidden'); }

    // ---------- Global UI (search, notifications, nav buttons in topbar) ----------
    bindGlobalUI() {
        this.$('globalSearch').addEventListener('input', debounce((e) => this.handleGlobalSearch(e.target.value), 250));

        const bell = this.$('notificationBell');
        const panel = this.$('notifPanel');
        bell.addEventListener('click', (e) => {
            e.stopPropagation();
            const willOpen = panel.classList.contains('hidden');
            panel.classList.toggle('hidden');
            bell.setAttribute('aria-expanded', String(willOpen));
            if (willOpen) { this.renderNotifPanel(); this.notifications.markAllRead(); this.updateNotifDot(); }
        });
        document.addEventListener('click', () => panel.classList.add('hidden'));
        panel.addEventListener('click', (e) => e.stopPropagation());
        this.$('btnClearNotifs').addEventListener('click', () => { this.notifications.clearAll(); this.renderNotifPanel(); this.updateNotifDot(); });

        this.updateNotifDot();
        this.updateTopbar();
        setInterval(() => this.updateTopbar(), 60000);
    }

    updateTopbar() {
        const p = this.profile.getProfile();
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const name = p.personalInfo.name ? p.personalInfo.name.split(' ')[0] : '';
        this.$('greetingText').textContent = name ? `${greeting}, ${name}` : greeting;
        this.$('todayDateHeader').textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

        const initialsTxt = initials(p.personalInfo.name);
        this.$('sidebarAvatarInitial').textContent = initialsTxt;
        this.$('topbarAvatarInitial').textContent = initialsTxt;
        this.$('sidebarProfileName').textContent = p.personalInfo.name || 'Set up your profile';
        this.$('sidebarProfileLocation').textContent = [p.personalInfo.city, p.personalInfo.country].filter(Boolean).join(', ') || '—';

        const appCount = this.tracker.applications.length;
        const status = this.$('storageStatus');
        status.textContent = `Saved locally · ${appCount} application${appCount === 1 ? '' : 's'}`;
        status.classList.add('ok');
    }

    updateNotifDot() {
        this.$('notifDot').classList.toggle('hidden', this.notifications.unreadCount() === 0);
    }

    renderNotifPanel() {
        const list = this.$('notifPanelList');
        if (!this.notifications.notifications.length) {
            list.innerHTML = '<p class="empty-note">You\'re all caught up.</p>';
            return;
        }
        list.innerHTML = this.notifications.notifications.slice(0, 20).map(n => `
            <div class="notif-item ${n.read ? '' : 'unread'}">
                ${escapeHTML(n.message)}
                <span class="notif-time">${timeAgo(n.date)}</span>
            </div>
        `).join('');
    }

    handleGlobalSearch(q) {
        q = q.trim().toLowerCase();
        if (!q) return;
        this.switchView('matched');
        const grid = this.$('matchedGrid');
        const cards = grid.querySelectorAll('.job-card');
        cards.forEach(c => { c.style.display = c.dataset.searchText.includes(q) ? '' : 'none'; });
    }

    // ---------- Navigation ----------
    bindNav() {
        document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });
    }

    switchView(view) {
        this.currentView = view;
        document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
        const target = this.$(`view-${view}`);
        if (target) target.classList.remove('hidden');

        document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
            const active = btn.dataset.view === view;
            btn.classList.toggle('active', active);
            if (btn.classList.contains('nav-item') && btn.closest('.nav')) {
                if (active) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
            }
        });

        const renderers = {
            dashboard: () => this.renderDashboard(),
            profile: () => this.loadProfileForm(),
            resume: () => this.renderResumePage(),
            sources: () => this.renderSources(),
            hunter: () => {},
            matched: () => this.renderMatched(),
            applications: () => this.renderApplicationsBoard(),
            interviews: () => this.renderInterviews(),
            analytics: () => this.renderAnalytics(),
            assistant: () => {},
            settings: () => this.loadSettingsForm()
        };
        (renderers[view] || (() => {}))();
    }

    checkProfileCompleteness() {
        const p = this.profile.getProfile();
        if (!p.personalInfo.name || p.skills.length === 0) {
            this.notifications.add('profile', 'Your profile is incomplete — add skills and personal info to improve match scores.');
        }
        if (!p.resumeMetadata) {
            this.notifications.add('resume', 'No resume uploaded yet. Add one from the Resume page for better-tailored applications.');
        }
        this.updateNotifDot();
    }

    // ==========================================
    // WIZARD
    // ==========================================
    bindWizard() {
        this.$('wizardNext').addEventListener('click', () => this.wizardGoTo(this.wizardStep + 1));
        this.$('wizardBack').addEventListener('click', () => this.wizardGoTo(this.wizardStep - 1));
        this.$('wizardSkip').addEventListener('click', () => this.wizardFinish(true));
        this.$('wizardFinish').addEventListener('click', () => this.wizardFinish(false));

        this.wizardTagList('wSkillInput', 'wSkillAdd', 'wSkillList', () => this.wizardData.skills);
        this.wizardTagList('wCertInput', 'wCertAdd', 'wCertList', () => this.wizardData.certificates);
        this.wizardTagList('wCityInput', 'wCityAdd', 'wCityList', () => this.wizardData.preferredCities);

        this.$('wExpAdd').addEventListener('click', () => {
            const role = this.$('wExpRole').value.trim();
            const org = this.$('wExpOrg').value.trim();
            if (!role || !org) { this.toast('Add at least a role and organisation.'); return; }
            this.wizardData.experience.push({
                id: uid(), type: this.$('wExpType').value, role, org,
                duration: this.$('wExpDuration').value.trim(), desc: this.$('wExpDesc').value.trim()
            });
            ['wExpRole', 'wExpOrg', 'wExpDuration', 'wExpDesc'].forEach(id => this.$(id).value = '');
            this.renderExperienceList('wExpList', this.wizardData.experience);
        });

        const dz = this.$('wResumeDropzone');
        const fileInput = this.$('wResumeFile');
        dz.addEventListener('click', () => fileInput.click());
        dz.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
        dz.addEventListener('drop', (e) => {
            e.preventDefault(); dz.classList.remove('dragover');
            if (e.dataTransfer.files[0]) this.wizardSetResumeFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => { if (fileInput.files[0]) this.wizardSetResumeFile(fileInput.files[0]); });
    }

    wizardSetResumeFile(file) {
        if (!this.resume.validFile(file)) { this.toast('Please upload a PDF, DOCX, or TXT file.'); return; }
        this.wizardResumeFile = file;
        const chip = this.$('wResumeFileName');
        chip.textContent = `📄 ${file.name}`;
        chip.classList.remove('hidden');
    }

    wizardTagList(inputId, addId, listId, arrayGetter) {
        const input = this.$(inputId);
        const commit = () => {
            const val = input.value.trim();
            if (!val) return;
            const arr = arrayGetter();
            if (!arr.includes(val)) arr.push(val);
            input.value = '';
            this.renderTagList(listId, arr);
        };
        this.$(addId).addEventListener('click', commit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    }

    renderTagList(listId, arr) {
        const el = this.$(listId);
        el.innerHTML = arr.map((v, i) => `
            <span class="tag-chip">${escapeHTML(v)}<button type="button" data-idx="${i}" aria-label="Remove ${escapeHTML(v)}">&times;</button></span>
        `).join('');
        el.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => {
            arr.splice(Number(btn.dataset.idx), 1);
            this.renderTagList(listId, arr);
        }));
    }

    renderExperienceList(listId, arr) {
        const el = this.$(listId);
        if (!arr.length) { el.innerHTML = ''; return; }
        el.innerHTML = arr.map((exp, i) => `
            <div class="entry-card">
                <button type="button" class="entry-remove" data-idx="${i}" aria-label="Remove">&times;</button>
                <strong>${escapeHTML(exp.role)}</strong> — ${escapeHTML(exp.org)}
                <div class="entry-meta">${escapeHTML(exp.type)} · ${escapeHTML(exp.duration || '')}</div>
                ${exp.desc ? `<div class="entry-meta">${escapeHTML(exp.desc)}</div>` : ''}
            </div>
        `).join('');
        el.querySelectorAll('.entry-remove').forEach(btn => btn.addEventListener('click', () => {
            arr.splice(Number(btn.dataset.idx), 1);
            this.renderExperienceList(listId, arr);
        }));
    }

    openWizard(prefill) {
        const base = this.profile.getEmptyProfile();
        this.wizardData = prefill ? JSON.parse(JSON.stringify(prefill)) : base;
        if (!this.wizardData.certificates) this.wizardData.certificates = [];
        if (!this.wizardData.preferredCities) this.wizardData.preferredCities = [];
        if (!this.wizardData.skills) this.wizardData.skills = [];
        if (!this.wizardData.experience) this.wizardData.experience = [];
        this.wizardResumeFile = null;

        // Populate fields
        this.$('wName').value = this.wizardData.personalInfo.name || '';
        this.$('wEmail').value = this.wizardData.personalInfo.email || '';
        this.$('wPhone').value = this.wizardData.personalInfo.phone || '';
        this.$('wCountry').value = this.wizardData.personalInfo.country || '';
        this.$('wProvince').value = this.wizardData.personalInfo.province || '';
        this.$('wCity').value = this.wizardData.personalInfo.city || '';
        this.$('wAddress').value = this.wizardData.personalInfo.address || '';
        this.$('wDegree').value = this.wizardData.education.degree || '';
        this.$('wUniversity').value = this.wizardData.education.university || '';
        this.$('wPassingYear').value = this.wizardData.education.passingYear || '';
        this.$('wCgpa').value = this.wizardData.education.cgpa || '';
        this.renderTagList('wCertList', this.wizardData.certificates);
        this.renderTagList('wSkillList', this.wizardData.skills);
        this.renderTagList('wCityList', this.wizardData.preferredCities);
        this.renderExperienceList('wExpList', this.wizardData.experience);
        document.querySelectorAll('#wCategoryGrid input').forEach(cb => cb.checked = this.wizardData.preferredCategories.includes(cb.value));
        document.querySelectorAll('#wSourceCategoryGrid input').forEach(cb => cb.checked = this.wizardData.sourceCategories.includes(cb.value));
        this.$('wResumeFileName').classList.add('hidden');

        this.wizardGoTo(1);
        this.$('setupWizard').classList.remove('hidden');
        this.$('app').classList.add('hidden');
    }

    wizardGoTo(step) {
        const total = 8;
        step = Math.max(1, Math.min(total, step));
        if (step === this.wizardStep && step !== 1) { /* still allow re-entry */ }
        this.wizardStep = step;

        document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
        this.$(`wizardStep${step}`).classList.add('active');
        document.querySelectorAll('.wizard-step-dot').forEach(d => {
            const dStep = Number(d.dataset.step);
            d.classList.toggle('active', dStep === step);
            d.classList.toggle('done', dStep < step);
        });
        this.$('wizardBack').disabled = step === 1;
        this.$('wizardNext').classList.toggle('hidden', step === total);
        this.$('wizardFinish').classList.toggle('hidden', step !== total);
    }

    async wizardFinish(skipped) {
        if (!skipped) {
            this.wizardData.personalInfo = {
                name: this.$('wName').value.trim(), email: this.$('wEmail').value.trim(), phone: this.$('wPhone').value.trim(),
                country: this.$('wCountry').value.trim(), province: this.$('wProvince').value.trim(),
                city: this.$('wCity').value.trim(), address: this.$('wAddress').value.trim(), photo: this.wizardData.personalInfo.photo || ''
            };
            this.wizardData.education = {
                degree: this.$('wDegree').value.trim(), university: this.$('wUniversity').value.trim(),
                passingYear: this.$('wPassingYear').value.trim(), cgpa: this.$('wCgpa').value.trim()
            };
            this.wizardData.preferredCategories = Array.from(document.querySelectorAll('#wCategoryGrid input:checked')).map(cb => cb.value);
            this.wizardData.sourceCategories = Array.from(document.querySelectorAll('#wSourceCategoryGrid input:checked')).map(cb => cb.value);
        }
        this.wizardData.setupComplete = true;
        this.profile.profile = this.wizardData;
        this.profile.save();

        if (!skipped && this.wizardResumeFile) {
            try { await this.resume.processUpload(this.wizardResumeFile); } catch (e) { console.error(e); }
        }

        this.$('setupWizard').classList.add('hidden');
        this.showApp();
        this.toast(skipped ? 'Setup skipped — you can finish it anytime from Settings.' : 'Profile saved. Welcome aboard!');
        this.checkProfileCompleteness();
    }

    showApp() {
        this.$('app').classList.remove('hidden');
        this.switchView(this.currentView || 'dashboard');
        this.updateTopbar();
    }

    // ==========================================
    // DASHBOARD
    // ==========================================
    bindDashboard() {
        // quickAddJobBtn and avatar button already handled by generic nav binding (they carry .nav-item + data-view)
    }

    renderDashboard() {
        const p = this.profile.getProfile();
        const apps = this.tracker.applications;
        const today = new Date().toDateString();
        const foundToday = apps.filter(a => new Date(a.dateAdded).toDateString() === today).length;

        this.$('heroSubtext').textContent = this.profile.isComplete()
            ? 'Your profile is set — run the Job Hunter to find fresh matches today.'
            : 'Finish setting up your profile to start matching real jobs against your background.';
        this.$('jobsFoundToday').textContent = String(foundToday);
        this.$('jobsFoundProgress').style.width = `${Math.min(100, foundToday * 20)}%`;

        const avgMatch = apps.length ? Math.round(apps.reduce((s, a) => s + (a.matchScore || 0), 0) / apps.length) : 0;
        const highMatches = apps.filter(a => (a.matchScore || 0) >= 75).length;
        const interviews = apps.filter(a => a.status === 'interview').length;

        this.$('statRow').innerHTML = [
            ['Total applications', apps.length],
            ['Average match score', `${avgMatch}%`],
            ['High-match jobs', highMatches],
            ['Interviews scheduled', interviews]
        ].map(([label, val]) => `<div class="stat-card"><span class="stat-num">${val}</span><span class="stat-label">${label}</span></div>`).join('');

        // Best matches
        const best = [...apps].sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0)).slice(0, 5);
        this.$('bestMatches').innerHTML = best.length ? best.map(a => this.miniItem(a, `${a.matchScore}%`, this.scoreClass(a.matchScore))).join('')
            : '<p class="empty-note">No matched jobs yet — run the Job Hunter to find some.</p>';
        this.bindMiniItems('bestMatches', best);

        // Deadlines
        const withDeadline = apps.filter(a => a.deadline).map(a => ({ ...a, _d: daysUntil(a.deadline) })).filter(a => a._d !== null && a._d >= 0).sort((a, b) => a._d - b._d).slice(0, 5);
        this.$('deadlineList').innerHTML = withDeadline.length ? withDeadline.map(a => this.miniItem(a, a._d === 0 ? 'Today' : `${a._d}d left`, a._d <= 2 ? 'badge-danger' : 'badge-warning')).join('')
            : '<p class="empty-note">No upcoming deadlines tracked.</p>';
        this.bindMiniItems('deadlineList', withDeadline);

        // Interviews
        const upcoming = apps.filter(a => a.interviewDate && daysUntil(a.interviewDate) >= 0).sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate)).slice(0, 5);
        this.$('interviewList').innerHTML = upcoming.length ? upcoming.map(a => this.miniItem(a, formatDate(a.interviewDate), 'badge-info')).join('')
            : '<p class="empty-note">No interviews scheduled yet.</p>';
        this.bindMiniItems('interviewList', upcoming);

        // Recently applied
        const applied = apps.filter(a => a.status === 'applied').sort((a, b) => new Date(b.dateApplied || 0) - new Date(a.dateApplied || 0)).slice(0, 5);
        this.$('appliedRecent').innerHTML = applied.length ? applied.map(a => this.miniItem(a, timeAgo(a.dateApplied), 'badge-success')).join('')
            : '<p class="empty-note">No applications sent yet.</p>';
        this.bindMiniItems('appliedRecent', applied);

        // AI suggestions (heuristic, instant — no API call on every dashboard render)
        const tips = [];
        if (!p.resumeMetadata) tips.push('Upload your resume so the assistant can tailor cover letters and match scores.');
        if (p.skills.length < 5) tips.push('Add more skills to your profile — more skills means more accurate matching.');
        if (!p.preferredCities.length) tips.push('Add preferred cities so location matching works for you.');
        if (apps.length === 0) tips.push('Run the Job Hunter from the sidebar to pull in your first batch of matches.');
        if (!tips.length) tips.push('Your profile looks solid — open the AI Assistant for personalized career advice.');
        this.$('aiSuggestions').innerHTML = tips.map(t => `<div class="placeholder-item">${escapeHTML(t)}</div>`).join('');

        // Recent activity
        const notes = this.notifications.notifications.slice(0, 6);
        this.$('recentActivity').innerHTML = notes.length ? notes.map(n => `
            <div class="mini-item"><span>${escapeHTML(n.message)}</span><span class="tag badge-info">${timeAgo(n.date)}</span></div>
        `).join('') : '<p class="empty-note">Nothing yet — activity will show up here.</p>';
    }

    scoreClass(score) { return score >= 75 ? 'badge-success' : score >= 50 ? 'badge-warning' : 'badge-danger'; }

    miniItem(app, rightText, badgeClass) {
        return `<div class="mini-item" data-job-id="${app.jobId}"><span>${escapeHTML(app.title)} · ${escapeHTML(app.company || '')}</span><span class="tag ${badgeClass}">${escapeHTML(String(rightText))}</span></div>`;
    }

    bindMiniItems(containerId, apps) {
        this.$(containerId).querySelectorAll('.mini-item[data-job-id]').forEach(el => {
            el.addEventListener('click', () => this.openJobModal(el.dataset.jobId));
        });
    }

    // ==========================================
    // PROFILE PAGE
    // ==========================================
    bindProfilePage() {
        this.$('btnSaveProfile').addEventListener('click', () => this.saveProfileForm());

        this.tagListBinder('pSkillInput', 'pSkillAdd', 'pSkillList', 'skills');
        this.tagListBinder('pCertInput', 'pCertAdd', 'pCertList', 'certificates');
        this.tagListBinder('pCityInput', 'pCityAdd', 'pCityList', 'preferredCities');

        this.$('pExpAdd').addEventListener('click', () => {
            const role = this.$('pExpRole').value.trim();
            const org = this.$('pExpOrg').value.trim();
            if (!role || !org) { this.toast('Add at least a role and organisation.'); return; }
            this.profile.profile.experience.push({
                id: uid(), type: this.$('pExpType').value, role, org,
                duration: this.$('pExpDuration').value.trim(), desc: this.$('pExpDesc').value.trim()
            });
            this.profile.save();
            ['pExpRole', 'pExpOrg', 'pExpDuration', 'pExpDesc'].forEach(id => this.$(id).value = '');
            this.renderExperienceList('pExpList', this.profile.profile.experience);
        });

        this.$('btnUploadPic').addEventListener('click', () => this.$('profilePicInput').click());
        this.$('profilePicInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                this.profile.profile.personalInfo.photo = reader.result;
                this.profile.save();
                this.renderProfilePic();
                this.updateTopbar();
            };
            reader.readAsDataURL(file);
        });
        this.$('btnRemovePic').addEventListener('click', () => {
            this.profile.profile.personalInfo.photo = '';
            this.profile.save();
            this.renderProfilePic();
            this.updateTopbar();
        });
    }

    tagListBinder(inputId, addId, listId, profileField) {
        const input = this.$(inputId);
        const commit = () => {
            const val = input.value.trim();
            if (!val) return;
            if (!this.profile.profile[profileField].includes(val)) this.profile.profile[profileField].push(val);
            this.profile.save();
            input.value = '';
            this.renderTagList(listId, this.profile.profile[profileField]);
        };
        this.$(addId).addEventListener('click', commit);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
    }

    renderProfilePic() {
        const photo = this.profile.profile.personalInfo.photo;
        const preview = this.$('profilePicPreview');
        if (photo) { preview.style.backgroundImage = `url(${photo})`; preview.style.backgroundSize = 'cover'; preview.style.backgroundPosition = 'center'; preview.textContent = ''; }
        else { preview.style.backgroundImage = ''; preview.textContent = initials(this.profile.profile.personalInfo.name); }
    }

    loadProfileForm() {
        const p = this.profile.getProfile();
        this.$('pName').value = p.personalInfo.name || '';
        this.$('pEmail').value = p.personalInfo.email || '';
        this.$('pPhone').value = p.personalInfo.phone || '';
        this.$('pCountry').value = p.personalInfo.country || '';
        this.$('pProvince').value = p.personalInfo.province || '';
        this.$('pCity').value = p.personalInfo.city || '';
        this.$('pAddress').value = p.personalInfo.address || '';
        this.$('pDegree').value = p.education.degree || '';
        this.$('pUniversity').value = p.education.university || '';
        this.$('pPassingYear').value = p.education.passingYear || '';
        this.$('pCgpa').value = p.education.cgpa || '';
        this.renderTagList('pCertList', p.certificates);
        this.renderTagList('pSkillList', p.skills);
        this.renderTagList('pCityList', p.preferredCities);
        this.renderExperienceList('pExpList', p.experience);
        document.querySelectorAll('#pCategoryGrid input').forEach(cb => cb.checked = p.preferredCategories.includes(cb.value));
        this.renderProfilePic();
    }

    saveProfileForm() {
        const p = this.profile.profile;
        p.personalInfo = {
            name: this.$('pName').value.trim(), email: this.$('pEmail').value.trim(), phone: this.$('pPhone').value.trim(),
            country: this.$('pCountry').value.trim(), province: this.$('pProvince').value.trim(),
            city: this.$('pCity').value.trim(), address: this.$('pAddress').value.trim(), photo: p.personalInfo.photo || ''
        };
        p.education = {
            degree: this.$('pDegree').value.trim(), university: this.$('pUniversity').value.trim(),
            passingYear: this.$('pPassingYear').value.trim(), cgpa: this.$('pCgpa').value.trim()
        };
        p.preferredCategories = Array.from(document.querySelectorAll('#pCategoryGrid input:checked')).map(cb => cb.value);
        this.profile.save();
        this.updateTopbar();
        this.toast('Profile saved.');
    }

    // ==========================================
    // RESUME PAGE
    // ==========================================
    bindResumePage() {
        const dz = this.$('resumeDropzone');
        const fileInput = this.$('resumeFileInput');
        dz.addEventListener('click', () => fileInput.click());
        dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
        dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('dragover'); if (e.dataTransfer.files[0]) this.handleResumeUpload(e.dataTransfer.files[0]); });
        fileInput.addEventListener('change', () => { if (fileInput.files[0]) this.handleResumeUpload(fileInput.files[0]); });

        this.$('btnReplaceResume').addEventListener('click', () => fileInput.click());

        this.$('btnExtractResume').addEventListener('click', async () => {
            const file = this.resume.lastRawFile;
            if (!file) { this.toast('Upload a resume first.'); return; }
            await this.handleResumeUpload(file);
            this.toast('Details extracted from your resume.');
        });

        this.$('btnAnalyzeResume').addEventListener('click', async () => {
            const meta = this.profile.profile.resumeMetadata;
            const resultEl = this.$('resumeAnalysisResult');
            resultEl.textContent = 'Analyzing…';
            const text = meta ? meta.extractedText : this.profile.summaryText();
            const analysis = await this.ai.analyzeResume(text);
            resultEl.textContent = analysis;
        });
    }

    async handleResumeUpload(file) {
        try {
            const data = await this.resume.processUpload(file);
            this.renderResumePage();
            this.toast(`Resume "${data.fileName}" saved.`);
        } catch (e) {
            this.toast(e.message);
        }
    }

    renderResumePage() {
        const meta = this.profile.profile.resumeMetadata;
        const info = this.$('currentResumeInfo');
        if (meta) {
            info.classList.remove('hidden');
            info.innerHTML = `📄 <strong>${escapeHTML(meta.fileName)}</strong> — uploaded ${formatDate(meta.uploadDate)}`;
        } else {
            info.classList.add('hidden');
        }
        const history = this.profile.profile.resumeHistory || [];
        this.$('resumeHistoryList').innerHTML = history.length ? history.map(h => `
            <div class="entry-card"><strong>${escapeHTML(h.fileName)}</strong><div class="entry-meta">${formatDate(h.uploadDate)}</div></div>
        `).join('') : '<p class="empty-note">Previous resume versions will appear here.</p>';
    }

    // ==========================================
    // SOURCES PAGE
    // ==========================================
    bindSourcesPage() {
        this.$('btnAddSource').addEventListener('click', () => {
            const name = this.$('sourceNameInput').value.trim();
            const link = this.$('sourceLinkInput').value.trim();
            const type = this.$('sourceTypeInput').value;
            if (!name) { this.toast('Give the source a name.'); return; }
            this.sources.addCustom(name, link, type);
            this.$('sourceNameInput').value = ''; this.$('sourceLinkInput').value = '';
            this.renderSources();
            this.toast(`Added "${name}" to your sources.`);
        });
    }

    renderSources() {
        const list = this.$('sourceList');
        list.innerHTML = this.sources.sources.map(s => `
            <div class="source-card" data-id="${s.id}">
                <div class="source-card-top">
                    <div class="source-card-logo">${escapeHTML(initials(s.name))}</div>
                    <div style="flex:1">
                        <strong>${escapeHTML(s.name)}</strong>
                        <div class="entry-meta"><span class="stype">${escapeHTML(s.type)}</span>${s.website ? `<a href="${escapeHTML(s.website)}" target="_blank" rel="noopener">${escapeHTML(s.website)}</a>` : ''}</div>
                    </div>
                    <label class="switch"><input type="checkbox" data-toggle="${s.id}" ${s.enabled ? 'checked' : ''}><span class="switch-track"></span></label>
                </div>
                <div class="entry-meta">Status: ${escapeHTML(s.status)} · Last scan: ${timeAgo(s.lastScan)}${s.custom ? ' · Custom source (manual entry only)' : ''}</div>
                ${s.custom ? `<button class="btn btn-ghost btn-small" data-remove="${s.id}" type="button">Remove</button>` : ''}
            </div>
        `).join('');

        list.querySelectorAll('[data-toggle]').forEach(cb => cb.addEventListener('change', () => {
            this.sources.toggleSource(cb.dataset.toggle, cb.checked);
        }));
        list.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => {
            this.sources.removeCustom(btn.dataset.remove);
            this.renderSources();
        }));
    }

    // ==========================================
    // HUNTER PAGE
    // ==========================================
    bindHunterPage() {
        this.$('btnStartHunting').addEventListener('click', () => this.runHunt());

        document.querySelectorAll('.tab-btn[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
                tab.classList.add('active'); tab.setAttribute('aria-selected', 'true');
                document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden'));
                this.$(`tab-${tab.dataset.tab}`).classList.remove('hidden');
            });
        });

        this.$('btnProcessPaste').addEventListener('click', () => {
            const text = this.$('pasteInput').value.trim();
            if (!text) { this.toast('Paste a job posting first.'); return; }
            const source = this.$('pasteSource').value.trim() || 'Manual paste';
            const lines = text.split('\n').filter(Boolean);
            const job = { sourceId: 'manual', sourceName: source, sourceCategory: 'custom', title: lines[0] || 'Untitled role', company: source, location: '', description: text, applyMethod: 'manual', url: '' };
            this.processManualJob(job);
            this.$('pasteInput').value = '';
        });

        this.$('btnProcessBulk').addEventListener('click', () => {
            const raw = this.$('bulkInput').value.trim();
            if (!raw) { this.toast('Paste at least one job posting.'); return; }
            const source = this.$('bulkSource').value.trim() || 'Bulk import';
            const chunks = raw.split(/\n---+\n|\n{2,}---+\n{0,2}/).map(c => c.trim()).filter(Boolean);
            const items = chunks.length ? chunks : [raw];
            let added = 0;
            items.forEach(chunk => {
                const lines = chunk.split('\n').filter(Boolean);
                const job = { sourceId: 'manual', sourceName: source, sourceCategory: 'custom', title: lines[0] || 'Untitled role', company: source, location: '', description: chunk, applyMethod: 'manual', url: '' };
                if (this.processManualJob(job, true)) added++;
            });
            this.$('bulkInput').value = '';
            this.toast(`Processed ${items.length} posting(s), added ${added} new.`);
            this.renderIntakeStatus(`Bulk import complete — ${added} new job(s) added.`);
        });

        this.$('btnProcessForm').addEventListener('click', () => {
            const title = this.$('fTitle').value.trim();
            const company = this.$('fCompany').value.trim();
            if (!title || !company) { this.toast('Job title and company are required.'); return; }
            const job = {
                sourceId: 'manual', sourceName: 'Manual entry', sourceCategory: 'custom',
                title, company, location: this.$('fLocation').value.trim(),
                salary: this.$('fSalary').value.trim(), deadline: this.$('fDeadline').value,
                applyMethod: this.$('fApplyMethod').value, url: '',
                description: this.$('fDesc').value.trim() + (this.$('fContact').value.trim() ? `\nContact: ${this.$('fContact').value.trim()}` : '')
            };
            this.processManualJob(job);
            ['fTitle', 'fCompany', 'fLocation', 'fSalary', 'fDeadline', 'fContact', 'fDesc'].forEach(id => this.$(id).value = '');
        });
    }

    processManualJob(job, silent) {
        const match = this.matchEngine.calculateMatch(job);
        const added = this.tracker.addJob(job, match);
        if (!silent) {
            if (added) {
                this.renderIntakeStatus(`Added "${job.title}" — match score ${match.score}%.`);
                this.toast(`Job scored and saved (${match.score}% match).`);
            } else {
                this.renderIntakeStatus(`"${job.title}" looks like a duplicate of something already tracked.`);
            }
        }
        if (added) {
            const results = this.$('intakeResults');
            results.insertAdjacentHTML('afterbegin', this.jobCardHTML(added));
            results.querySelector('.job-card').addEventListener('click', () => this.openJobModal(added.jobId));
        }
        this.updateTopbar();
        return !!added;
    }

    renderIntakeStatus(text) {
        const el = this.$('intakeStatus');
        el.textContent = text; el.classList.remove('hidden');
    }

    async runHunt() {
        const btn = this.$('btnStartHunting');
        btn.disabled = true; btn.classList.add('btn-loading');
        document.querySelectorAll('.pipeline-step').forEach(s => s.classList.remove('active', 'done'));
        this.$('hunterResultSummary').textContent = 'Hunting…';

        const steps = ['scan', 'analyze', 'match', 'rank', 'save'];
        const onStep = (step) => {
            const idx = steps.indexOf(step);
            steps.forEach((s, i) => {
                const el = document.querySelector(`.pipeline-step[data-step="${s}"]`);
                if (!el) return;
                el.classList.toggle('done', i < idx);
                el.classList.toggle('active', i === idx);
            });
        };

        const result = await this.hunter.startHunting(this.profile.getProfile(), onStep);
        document.querySelectorAll('.pipeline-step').forEach(s => s.classList.add('done'));

        btn.disabled = false; btn.classList.remove('btn-loading');
        this.$('hunterResultSummary').textContent = result.newJobsFound > 0
            ? `Hunt complete — found ${result.newJobsFound} new matching job${result.newJobsFound === 1 ? '' : 's'}. Check Matched Jobs.`
            : 'Hunt complete — no new jobs this time (sources return demo data; enable more sources or check back later).';
        this.toast('Job hunt finished.');
        this.updateTopbar();
        if (this.currentView === 'dashboard') this.renderDashboard();
    }

    // ==========================================
    // MATCHED JOBS
    // ==========================================
    bindMatchedPage() {
        this.$('filterApply').addEventListener('change', () => this.renderMatched());
        this.$('filterStatus').addEventListener('change', () => this.renderMatched());
    }

    jobCardHTML(a) {
        const cls = a.matchScore >= 75 ? 'high' : a.matchScore >= 50 ? 'medium' : 'low';
        const priority = a.matchScore >= 75 ? 'priority-high' : a.matchScore >= 50 ? 'priority-medium' : 'priority-low';
        const applyAuto = a.applyMethod && a.applyMethod !== 'manual';
        const searchText = `${a.title} ${a.company} ${a.location} ${a.sourceName || ''}`.toLowerCase();
        return `
            <div class="job-card ${priority}" data-job-id="${a.jobId}" data-search-text="${escapeHTML(searchText)}">
                <div class="job-card-top">
                    <div>
                        <div class="job-title">${escapeHTML(a.title)}</div>
                        <div class="job-company">${escapeHTML(a.company || '')}</div>
                    </div>
                    <span class="score-badge ${cls}">${a.matchScore}%</span>
                </div>
                <div class="job-meta">
                    ${a.location ? `<span>📍 ${escapeHTML(a.location)}</span>` : ''}
                    ${a.sourceName ? `<span>🔗 ${escapeHTML(a.sourceName)}</span>` : ''}
                </div>
                ${a.deadline ? `<div class="deadline-flag">Deadline: ${formatDate(a.deadline)}</div>` : ''}
                <span class="apply-pill ${applyAuto ? 'auto' : 'manual'}">${applyAuto ? 'Auto-apply' : 'Manual apply'}</span>
            </div>
        `;
    }

    renderMatched() {
        const applyFilter = this.$('filterApply').value;
        const statusFilter = this.$('filterStatus').value;
        let apps = [...this.tracker.applications];
        if (statusFilter === 'active') apps = apps.filter(a => !['rejected', 'archived'].includes(a.status));
        if (applyFilter === 'auto') apps = apps.filter(a => a.applyMethod && a.applyMethod !== 'manual');
        if (applyFilter === 'manual') apps = apps.filter(a => !a.applyMethod || a.applyMethod === 'manual');
        apps.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        const grid = this.$('matchedGrid');
        grid.innerHTML = apps.length ? apps.map(a => this.jobCardHTML(a)).join('') : '<p class="empty-note">No jobs yet — run the Job Hunter or add one manually.</p>';
        grid.querySelectorAll('.job-card').forEach(card => card.addEventListener('click', () => this.openJobModal(card.dataset.jobId)));
    }

    // ==========================================
    // APPLICATIONS BOARD
    // ==========================================
    bindApplicationsPage() {
        this.$('applicationsSearch').addEventListener('input', debounce(() => this.renderApplicationsBoard(), 200));
    }

    renderApplicationsBoard() {
        const q = this.$('applicationsSearch').value.trim().toLowerCase();
        const stages = ['saved', 'applied', 'assessment', 'interview', 'offer', 'rejected', 'accepted', 'archived'];
        stages.forEach(stage => {
            let apps = this.tracker.getByStatus(stage);
            if (q) apps = apps.filter(a => `${a.title} ${a.company}`.toLowerCase().includes(q));
            const col = this.$(`stage-${stage}`);
            col.innerHTML = apps.length ? apps.map(a => this.boardCardHTML(a)).join('') : '';
            col.querySelectorAll('[data-job-id]').forEach(el => el.addEventListener('click', () => this.openJobModal(el.dataset.jobId)));
        });
    }

    boardCardHTML(a) {
        return `<div class="job-card" style="padding:12px 14px" data-job-id="${a.jobId}">
            <div class="job-title" style="font-size:14px">${escapeHTML(a.title)}</div>
            <div class="job-company">${escapeHTML(a.company || '')}</div>
            <span class="score-badge ${this.scoreClass(a.matchScore).replace('badge-', '')}" style="margin-top:8px;display:inline-block">${a.matchScore}%</span>
        </div>`;
    }

    // ==========================================
    // INTERVIEWS
    // ==========================================
    bindInterviewsPage() {}

    renderInterviews() {
        const apps = this.tracker.applications.filter(a => a.interviewDate).sort((a, b) => new Date(a.interviewDate) - new Date(b.interviewDate));
        const el = this.$('interviewCards');
        el.innerHTML = apps.length ? apps.map(a => `
            <div class="entry-card" data-job-id="${a.jobId}" style="cursor:pointer">
                <strong>${escapeHTML(a.title)}</strong> — ${escapeHTML(a.company || '')}
                <div class="entry-meta">${formatDate(a.interviewDate)} ${a.interviewType ? '· ' + escapeHTML(a.interviewType) : ''}</div>
                ${a.interviewNotes ? `<div class="entry-meta">${escapeHTML(a.interviewNotes)}</div>` : ''}
            </div>
        `).join('') : '<p class="empty-note">No interviews scheduled yet — set an interview date from a job\'s details.</p>';
        el.querySelectorAll('[data-job-id]').forEach(card => card.addEventListener('click', () => this.openJobModal(card.dataset.jobId)));
    }

    // ==========================================
    // ANALYTICS
    // ==========================================
    renderAnalytics() {
        const apps = this.tracker.applications;
        const avg = apps.length ? Math.round(apps.reduce((s, a) => s + (a.matchScore || 0), 0) / apps.length) : 0;
        const accepted = apps.filter(a => a.status === 'accepted').length;
        const decided = apps.filter(a => ['accepted', 'rejected'].includes(a.status)).length;
        const successRate = decided ? Math.round((accepted / decided) * 100) : 0;

        this.$('statAvgMatch').textContent = apps.length ? `${avg}%` : '—';
        this.$('statSuccessRate').textContent = decided ? `${successRate}%` : '—';
        this.$('statTotalApps').textContent = String(apps.length);
    }

    // ==========================================
    // AI ASSISTANT
    // ==========================================
    bindAssistantPage() {
        this.$('chatInputRow').addEventListener('submit', (e) => {
            e.preventDefault();
            const input = this.$('chatInput');
            const text = input.value.trim();
            if (!text) return;
            input.value = '';
            this.sendChat(text);
        });
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', () => this.sendChat(chip.dataset.prompt));
        });
    }

    appendChatBubble(text, who) {
        const wrap = this.$('chatMessages');
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble chat-bubble-${who}`;
        bubble.textContent = text;
        wrap.appendChild(bubble);
        wrap.scrollTop = wrap.scrollHeight;
        return bubble;
    }

    async sendChat(text) {
        this.appendChatBubble(text, 'user');
        const thinking = this.appendChatBubble('Thinking…', 'ai');
        this.$('chatSendBtn').disabled = true;
        try {
            const reply = await this.ai.chat(text);
            thinking.textContent = reply;
        } catch (e) {
            thinking.textContent = "Something went wrong reaching the AI service.";
        } finally {
            this.$('chatSendBtn').disabled = false;
            this.$('chatMessages').scrollTop = this.$('chatMessages').scrollHeight;
        }
    }

    // ==========================================
    // SETTINGS
    // ==========================================
    bindSettingsPage() {
        this.$('settingsNotifToggle').addEventListener('change', (e) => {
            this.settings.updateSetting('notifications', 'newJobs', e.target.checked);
            this.settings.updateSetting('notifications', 'deadlineReminders', e.target.checked);
            this.settings.updateSetting('notifications', 'interviewReminders', e.target.checked);
        });
        this.$('settingsThemeToggle').addEventListener('change', (e) => {
            this.settings.updateSetting('theme', null, e.target.checked ? 'dark' : 'light');
            this.applyTheme();
        });
        this.$('btnRerunWizard').addEventListener('click', () => this.openWizard(this.profile.getProfile()));
        this.$('btnResetProfile').addEventListener('click', () => {
            if (confirm('This clears everything — profile, applications, notifications, sources. This cannot be undone. Continue?')) {
                db.clearAll();
                location.reload();
            }
        });
        this.$('btnExportJSON').addEventListener('click', () => { this.io.exportJSON(); this.toast('Backup downloaded.'); });
        this.$('btnExportCSV').addEventListener('click', () => {
            const ok = this.io.exportCSV(this.tracker.applications);
            this.toast(ok ? 'CSV downloaded.' : 'No applications to export yet.');
        });
        this.$('btnImportJSON').addEventListener('click', () => this.$('importFileInput').click());
        this.$('importFileInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                await this.io.importJSON(file);
                this.toast('Backup restored. Reloading…');
                setTimeout(() => location.reload(), 1000);
            } catch (err) {
                this.toast(err.message);
            }
        });
    }

    loadSettingsForm() {
        const prefs = this.settings.settings.notifications || {};
        this.$('settingsNotifToggle').checked = prefs.newJobs !== false;
        this.$('settingsThemeToggle').checked = this.settings.settings.theme === 'dark';
    }

    // ==========================================
    // JOB DETAIL MODAL
    // ==========================================
    openJobModal(jobId) {
        const job = this.tracker.applications.find(a => a.jobId === jobId);
        if (!job) return;
        const stages = ['saved', 'applied', 'assessment', 'interview', 'offer', 'rejected', 'accepted', 'archived'];

        this.openModal(`
            <h2>${escapeHTML(job.title)}</h2>
            <p class="job-company">${escapeHTML(job.company || '')}${job.location ? ' · ' + escapeHTML(job.location) : ''}</p>
            <span class="score-badge ${this.scoreClass(job.matchScore).replace('badge-', '')}" style="margin-top:8px;display:inline-block">${job.matchScore}% match</span>

            <div class="modal-section">
                <h3>Description</h3>
                <p style="white-space:pre-wrap;font-size:14px;line-height:1.6">${escapeHTML(job.description || 'No description provided.')}</p>
            </div>

            <div class="modal-section">
                <h3>Why this score</h3>
                <ul style="font-size:13px;color:var(--text-secondary);padding-left:18px;line-height:1.7">
                    ${(job.matchExplanation || []).map(e => `<li>${escapeHTML(e)}</li>`).join('')}
                </ul>
                <button class="btn btn-outline btn-small" id="mBtnExplain" type="button" style="margin-top:8px">Ask AI to explain fit</button>
                <p id="mExplainResult" class="hint" style="margin-top:8px"></p>
            </div>

            <div class="modal-section">
                <h3>Stage</h3>
                <div class="quick-actions">
                    ${stages.map(s => `<button class="btn ${job.status === s ? 'btn-primary' : 'btn-secondary'} btn-small" data-stage="${s}" type="button">${s.charAt(0).toUpperCase() + s.slice(1)}</button>`).join('')}
                </div>
            </div>

            <div class="modal-section">
                <h3>Interview</h3>
                <div class="form-grid">
                    <label class="field-row"><span>Date</span><input type="date" id="mInterviewDate" value="${job.interviewDate ? job.interviewDate.slice(0, 10) : ''}"></label>
                    <label class="field-row"><span>Type</span><input type="text" id="mInterviewType" placeholder="e.g. In-person, phone" value="${escapeHTML(job.interviewType || '')}"></label>
                    <label class="field-row full"><span>Notes</span><textarea id="mInterviewNotes" rows="2">${escapeHTML(job.interviewNotes || '')}</textarea></label>
                </div>
                <button class="btn btn-secondary btn-small" id="mBtnSaveInterview" type="button">Save interview details</button>
            </div>

            <div class="modal-section">
                <h3>AI tools</h3>
                <div class="quick-actions">
                    <button class="btn btn-outline btn-small" id="mBtnCoverLetter" type="button">Generate cover letter</button>
                    <button class="btn btn-outline btn-small" id="mBtnPrepInterview" type="button">Prepare interview Qs</button>
                </div>
                <p id="mAiResult" class="hint" style="white-space:pre-wrap;margin-top:8px"></p>
            </div>

            <div class="modal-btn-row">
                ${job.url ? `<a class="btn btn-primary" href="${escapeHTML(job.url)}" target="_blank" rel="noopener">Open posting</a>` : ''}
                <button class="btn btn-danger btn-secondary" id="mBtnRemove" type="button">Remove from tracker</button>
            </div>
        `);

        document.querySelectorAll('#modalContent [data-stage]').forEach(btn => btn.addEventListener('click', () => {
            this.tracker.updateStatus(job.jobId, btn.dataset.stage);
            this.toast(`Moved to ${btn.dataset.stage}.`);
            this.closeModal();
            this.refreshCurrentView();
        }));

        this.$('mBtnSaveInterview').addEventListener('click', () => {
            const date = this.$('mInterviewDate').value;
            this.tracker.updateJob(job.jobId, {
                interviewDate: date ? new Date(date).toISOString() : null,
                interviewType: this.$('mInterviewType').value.trim(),
                interviewNotes: this.$('mInterviewNotes').value.trim()
            });
            if (date) this.tracker.updateStatus(job.jobId, 'interview');
            this.toast('Interview details saved.');
            this.closeModal();
            this.refreshCurrentView();
        });

        this.$('mBtnExplain').addEventListener('click', async () => {
            const el = this.$('mExplainResult');
            el.textContent = 'Thinking…';
            el.textContent = await this.ai.explainMatch(job);
        });

        this.$('mBtnCoverLetter').addEventListener('click', async () => {
            const el = this.$('mAiResult');
            el.textContent = 'Writing…';
            el.textContent = await this.ai.generateCoverLetter(job);
        });
        this.$('mBtnPrepInterview').addEventListener('click', async () => {
            const el = this.$('mAiResult');
            el.textContent = 'Preparing…';
            el.textContent = await this.ai.prepareInterview(job);
        });

        this.$('mBtnRemove').addEventListener('click', () => {
            if (confirm('Remove this job from your tracker?')) {
                this.tracker.removeJob(job.jobId);
                this.closeModal();
                this.refreshCurrentView();
                this.toast('Job removed.');
            }
        });
    }

    refreshCurrentView() {
        this.switchView(this.currentView);
        this.updateTopbar();
    }
}

// ==========================================
// BOOT
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    window.JobHunterApp = new UIController();
});

})();
