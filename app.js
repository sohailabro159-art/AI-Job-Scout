/**
 * Personal AI Job Hunter - Complete Application Core
 * filename: app.js
 */

// ==========================================
// 1. UTILITIES & STORAGE
// ==========================================

class LocalStorageDB {
    constructor(namespace = 'AI_Job_Hunter') {
        this.namespace = namespace;
    }

    get(key, defaultValue = null) {
        try {
            const data = localStorage.getItem(`${this.namespace}_${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) {
            console.error(`Error reading ${key} from storage`, e);
            return defaultValue;
        }
    }

    set(key, value) {
        try {
            localStorage.setItem(`${this.namespace}_${key}`, JSON.stringify(value));
        } catch (e) {
            console.error(`Error saving ${key} to storage`, e);
        }
    }

    remove(key) {
        localStorage.removeItem(`${this.namespace}_${key}`);
    }

    clearAll() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.namespace)) {
                localStorage.removeItem(key);
            }
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
            theme: 'system', // 'light', 'dark', 'system'
            notifications: {
                email: true,
                push: true,
                deadlineReminders: true,
                interviewReminders: true,
                newJobs: true
            },
            storage: {
                autoBackup: true,
                retentionDays: 30
            }
        };
        this.settings = db.get('settings', this.defaultSettings);
    }

    updateSetting(category, key, value) {
        if (this.settings[category]) {
            this.settings[category][key] = value;
        } else {
            this.settings[category] = value; // For root level settings like theme
        }
        this.save();
    }

    save() {
        db.set('settings', this.settings);
    }

    reset() {
        this.settings = { ...this.defaultSettings };
        this.save();
    }
}

// ==========================================
// 3. PROFILE MANAGER
// ==========================================

class ProfileManager {
    constructor() {
        this.profile = db.get('profile', this.getEmptyProfile());
    }

    getEmptyProfile() {
        return {
            personalInfo: { name: '', email: '', phone: '', linkedin: '', github: '' },
            education: [],
            skills: [],
            experience: [],
            preferredJobs: [],
            preferredCities: [],
            preferredCategories: [],
            targetSalary: { min: 0, currency: 'USD' },
            resumeMetadata: null
        };
    }

    update(section, data) {
        this.profile[section] = data;
        this.save();
    }

    getProfile() {
        return this.profile;
    }

    save() {
        db.set('profile', this.profile);
    }
}

// ==========================================
// 4. RESUME PROCESSOR
// ==========================================

class ResumeProcessor {
    constructor(profileManager) {
        this.profileManager = profileManager;
        this.supportedFormats = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    }

    async processUpload(file) {
        if (!this.supportedFormats.includes(file.type)) {
            throw new Error('Unsupported file format. Please upload PDF, DOCX, or TXT.');
        }
        
        // Mocking file reading and extraction
        const rawText = await this.extractTextMock(file);
        const analysis = this.analyzeTextMock(rawText);
        
        const resumeData = {
            fileName: file.name,
            uploadDate: new Date().toISOString(),
            extractedSkills: analysis.skills,
            extractedEducation: analysis.education,
            extractedExperience: analysis.experience
        };

        this.profileManager.update('resumeMetadata', resumeData);
        return resumeData;
    }

    async extractTextMock(file) {
        return new Promise(resolve => {
            setTimeout(() => resolve(`Extracted text from ${file.name}... Includes skills like JavaScript, Python, React.`), 500);
        });
    }

    analyzeTextMock(text) {
        // Placeholder for NLP/AI text analysis
        return {
            skills: ['JavaScript', 'Python', 'React', 'Node.js', 'Project Management'],
            education: [{ degree: 'BSc Computer Science', institution: 'Tech University', year: 2020 }],
            experience: [{ role: 'Software Engineer', company: 'TechCorp', years: 3 }]
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
        const prefs = this.settings.settings.notifications;
        
        // Check preferences
        if (type === 'deadline' && !prefs.deadlineReminders) return;
        if (type === 'interview' && !prefs.interviewReminders) return;
        if (type === 'newJob' && !prefs.newJobs) return;

        const note = {
            id: Date.now().toString(),
            type,
            message,
            metadata,
            read: false,
            date: new Date().toISOString()
        };

        this.notifications.unshift(note);
        this.save();
        this.triggerSystemNotification(note);
    }

    triggerSystemNotification(note) {
        // Mock system/browser notification
        console.log(`[NOTIFICATION: ${note.type.toUpperCase()}] ${note.message}`);
    }

    markAsRead(id) {
        const note = this.notifications.find(n => n.id === id);
        if (note) note.read = true;
        this.save();
    }

    save() {
        db.set('notifications', this.notifications);
    }
}

// ==========================================
// 6. JOB SOURCES (CONNECTORS)
// ==========================================

class JobSource {
    constructor(id, name, type, website) {
        this.id = id;
        this.name = name;
        this.type = type; // Government, NGO, Portal, Company, etc.
        this.website = website;
        this.enabled = true;
        this.lastScan = null;
        this.status = 'Idle'; // Idle, Scanning, Error
    }

    // To be overridden by specific connectors
    async fetchJobs() { return []; }
    parseJobs(rawJobs) { return []; }
    normalizeJobs(parsedJobs) { return []; }
    
    async execute() {
        try {
            this.status = 'Scanning';
            const raw = await this.fetchJobs();
            const parsed = this.parseJobs(raw);
            const normalized = this.normalizeJobs(parsed);
            this.lastScan = new Date().toISOString();
            this.status = 'Idle';
            return normalized;
        } catch (error) {
            this.status = 'Error';
            console.error(`Source ${this.name} failed:`, error);
            return [];
        }
    }
}

// --- Specific Mock Connectors ---

class BPSCConnector extends JobSource {
    constructor() { super('bpsc', 'BPSC (Government)', 'Government', 'https://bpsc.gov.pk'); }
    async fetchJobs() { return [{ title: 'Assistant Director (IT)', dept: 'IT Board', location: 'Quetta', reqs: 'BSc CS, 2 yrs exp' }]; }
    normalizeJobs(jobs) { return jobs.map(j => ({ sourceId: this.id, sourceName: this.name, title: j.title, company: j.dept, location: j.location, description: j.reqs, url: this.website })); }
}

class UNCareersConnector extends JobSource {
    constructor() { super('un', 'UN Careers', 'NGO', 'https://careers.un.org'); }
    async fetchJobs() { return [{ title: 'Information Systems Officer', dept: 'UN Secretariat', location: 'New York', reqs: 'MSc, 5 yrs exp, Python, Data Analysis' }]; }
    normalizeJobs(jobs) { return jobs.map(j => ({ sourceId: this.id, sourceName: this.name, title: j.title, company: j.dept, location: j.location, description: j.reqs, url: this.website })); }
}

class RozeeConnector extends JobSource {
    constructor() { super('rozee', 'Rozee.pk', 'Job Portal', 'https://rozee.pk'); }
    async fetchJobs() { return [{ title: 'Frontend Developer', comp: 'StartupX', loc: 'Lahore', detail: 'React, Vue, 3 yrs exp, Salary 150k' }]; }
    normalizeJobs(jobs) { return jobs.map(j => ({ sourceId: this.id, sourceName: this.name, title: j.title, company: j.comp, location: j.loc, description: j.detail, url: this.website })); }
}

class SourceManager {
    constructor() {
        const savedStates = db.get('sources_state', {});
        
        // Initialize available connectors
        this.sources = [
            new BPSCConnector(),
            new UNCareersConnector(),
            new RozeeConnector(),
            // Placeholders for architecture scalability
            new JobSource('fpsc', 'FPSC', 'Government', 'fpsc.gov.pk'),
            new JobSource('spsc', 'SPSC', 'Government', 'spsc.gov.pk'),
            new JobSource('njp', 'National Job Portal', 'Government', 'njp.gov.pk'),
            new JobSource('who', 'WHO Careers', 'NGO', 'who.int/careers'),
            new JobSource('mercycorps', 'Mercy Corps', 'NGO', 'mercycorps.org')
        ];

        // Restore enabled states
        this.sources.forEach(src => {
            if (savedStates[src.id] !== undefined) src.enabled = savedStates[src.id];
        });
    }

    toggleSource(id, isEnabled) {
        const source = this.sources.find(s => s.id === id);
        if (source) {
            source.enabled = isEnabled;
            this.saveStates();
        }
    }

    saveStates() {
        const states = {};
        this.sources.forEach(s => states[s.id] = s.enabled);
        db.set('sources_state', states);
    }

    getEnabledSources() {
        return this.sources.filter(s => s.enabled);
    }
}

// ==========================================
// 7. MATCH ENGINE
// ==========================================

class MatchEngine {
    constructor(profileManager) {
        this.profileManager = profileManager;
    }

    calculateMatch(job) {
        const profile = this.profileManager.getProfile();
        let score = 0;
        let explanations = [];

        const jobText = `${job.title} ${job.description}`.toLowerCase();

        // 1. Keyword / Skills Match (40%)
        let matchedSkills = 0;
        if (profile.skills.length > 0) {
            profile.skills.forEach(skill => {
                if (jobText.includes(skill.toLowerCase())) {
                    matchedSkills++;
                    explanations.push(`Skill matched: ${skill}`);
                }
            });
            score += (matchedSkills / Math.max(profile.skills.length, 1)) * 40;
        }

        // 2. Preferred Cities (20%)
        if (profile.preferredCities.length > 0 && job.location) {
            const locMatch = profile.preferredCities.some(city => job.location.toLowerCase().includes(city.toLowerCase()));
            if (locMatch) {
                score += 20;
                explanations.push('Location matches preferences.');
            } else {
                explanations.push('Location is outside preferred cities.');
            }
        } else {
            score += 10; // Neutral fallback
        }

        // 3. Preferred Categories / Roles (20%)
        if (profile.preferredJobs.length > 0) {
            const roleMatch = profile.preferredJobs.some(role => job.title.toLowerCase().includes(role.toLowerCase()));
            if (roleMatch) {
                score += 20;
                explanations.push('Job title aligns with target roles.');
            }
        }

        // 4. Experience & Salary (Mock analysis) (20%)
        score += 15; // Placeholder for complex NLP experience extraction match
        explanations.push('Experience level appears compatible.');

        return {
            score: Math.min(Math.round(score), 100),
            explanation: explanations
        };
    }
}

// ==========================================
// 8. APPLICATION TRACKER
// ==========================================

class ApplicationTracker {
    constructor() {
        // Status enum: Saved, Applied, Assessment, Interview, Offer, Rejected, Accepted
        this.applications = db.get('applications', []);
    }

    addJob(job, matchData) {
        // Deduplication check
        if (this.applications.find(a => a.url === job.url || (a.title === job.title && a.company === job.company))) {
            return false; 
        }

        const newApp = {
            ...job,
            jobId: Date.now().toString() + Math.random().toString(16).slice(2),
            matchScore: matchData.score,
            matchExplanation: matchData.explanation,
            status: 'Saved',
            dateAdded: new Date().toISOString(),
            dateApplied: null,
            notes: []
        };

        this.applications.push(newApp);
        this.save();
        return true;
    }

    updateStatus(jobId, newStatus) {
        const app = this.applications.find(a => a.jobId === jobId);
        if (app) {
            app.status = newStatus;
            if (newStatus === 'Applied') app.dateApplied = new Date().toISOString();
            this.save();
        }
    }

    addNote(jobId, note) {
        const app = this.applications.find(a => a.jobId === jobId);
        if (app) {
            app.notes.push({ text: note, date: new Date().toISOString() });
            this.save();
        }
    }

    getApplicationsByStatus(status) {
        return this.applications.filter(a => a.status === status).sort((a, b) => b.matchScore - a.matchScore);
    }

    save() {
        db.set('applications', this.applications);
    }
}

// ==========================================
// 9. AI ASSISTANT (MOCKS)
// ==========================================

class AIAssistant {
    constructor(profileManager, tracker) {
        this.profileManager = profileManager;
        this.tracker = tracker;
    }

    async recommendJobs() {
        // In a real app, sends profile data to LLM to get search keywords/strategies
        return "Based on your profile, I recommend looking into 'Full Stack Developer' roles emphasizing React and Node.js in the FinTech sector.";
    }

    async improveResume() {
        return "AI Suggestion: Quantify your achievements. Instead of 'Improved performance', write 'Improved load time by 30% using Redis caching'.";
    }

    async generateCoverLetter(jobId) {
        const job = this.tracker.applications.find(j => j.jobId === jobId);
        if (!job) return "Job not found.";
        const profile = this.profileManager.getProfile();
        return `Dear Hiring Manager at ${job.company},\n\nI am excited to apply for the ${job.title} position... [AI Generated text based on ${profile.personalInfo.name}'s skills matching ${job.description}]`;
    }

    async prepareInterview(jobId) {
        const job = this.tracker.applications.find(j => j.jobId === jobId);
        return `Interview Prep for ${job ? job.title : 'this role'}:\n1. Explain a time you resolved a technical conflict.\n2. How does your experience align with ${job ? job.company : 'our company'}?`;
    }

    async careerAdvice() {
        return "AI Advice: The market for your skills is growing in remote sectors. Consider obtaining an AWS certification to boost your Match Scores for cloud-native roles.";
    }
}

// ==========================================
// 10. JOB HUNTER (PIPELINE)
// ==========================================

class JobHunter {
    constructor(sourceManager, matchEngine, tracker, notifier) {
        this.sourceManager = sourceManager;
        this.matchEngine = matchEngine;
        this.tracker = tracker;
        this.notifier = notifier;
        this.isHunting = false;
    }

    async startHunting() {
        if (this.isHunting) return;
        this.isHunting = true;
        console.log("Starting AI Job Hunt...");

        const sources = this.sourceManager.getEnabledSources();
        let newJobsFound = 0;

        for (const source of sources) {
            console.log(`Scanning ${source.name}...`);
            const jobs = await source.execute();
            
            // Normalize & Deduplicate happens inherently in tracker.addJob
            for (const job of jobs) {
                // Analyze requirements and Compare with profile
                const matchData = this.matchEngine.calculateMatch(job);
                
                // Add to tracker (returns true if new, false if duplicate)
                const added = this.tracker.addJob(job, matchData);
                if (added) newJobsFound++;
            }
        }

        if (newJobsFound > 0) {
            this.notifier.add('newJob', `Hunt completed. Found ${newJobsFound} new jobs matching your profile!`);
        }

        console.log("Job Hunt Complete.");
        this.isHunting = false;
    }
}

// ==========================================
// 11. DATA EXPORT / IMPORT
// ==========================================

class DataExportImport {
    exportJSON() {
        const backup = {
            profile: db.get('profile'),
            applications: db.get('applications'),
            settings: db.get('settings'),
            sources: db.get('sources_state'),
            exportDate: new Date().toISOString()
        };
        this.downloadFile(JSON.stringify(backup, null, 2), 'JobHunter_Backup.json', 'application/json');
    }

    exportCSV() {
        const apps = db.get('applications', []);
        if (apps.length === 0) return;
        
        const headers = ['Title', 'Company', 'Location', 'Status', 'Match Score', 'Date Added'];
        const rows = apps.map(a => [
            `"${a.title}"`, `"${a.company}"`, `"${a.location}"`, 
            `"${a.status}"`, a.matchScore, a.dateAdded
        ]);
        
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        this.downloadFile(csvContent, 'JobHunter_Applications.csv', 'text/csv');
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
                    if (data.sources) db.set('sources_state', data.sources);
                    resolve(true);
                } catch (err) {
                    reject(new Error("Invalid backup file format."));
                }
            };
            reader.readAsText(file);
        });
    }

    downloadFile(content, fileName, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// ==========================================
// 12. APP INITIALIZATION & CONTROLLER
// ==========================================

class App {
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

        this.init();
    }

    init() {
        this.checkProfileCompleteness();
        console.log("Personal AI Job Hunter Initialized Successfully.");
    }

    checkProfileCompleteness() {
        const prof = this.profile.getProfile();
        if (!prof.personalInfo.name || prof.skills.length === 0) {
            this.notifications.add('profile', 'Your profile is incomplete. Please add skills and personal information to improve match scores.');
        }
        if (!prof.resumeMetadata) {
            this.notifications.add('resume', 'No resume detected. Please upload your latest PDF/DOCX resume.');
        }
    }

    // Public API to be attached to UI framework (React/Vue/Vanilla HTML)
    startAutomatedSearch() {
        this.hunter.startHunting().then(() => {
            // Re-render UI callback would go here
            console.log("Search phase finished. Check the Tracker for updates.");
        });
    }
}

// Instantiate the application
const JobHunterApp = new App();

// Exporting to global window for testing or UI binding
if (typeof window !== 'undefined') {
    window.JobHunterApp = JobHunterApp;
}
