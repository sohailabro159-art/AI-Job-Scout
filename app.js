Transform my current JavaScript into a Personal AI Job Hunter.

Keep existing functionality.

Improve architecture.

Generate ONE COMPLETE app.js.

======================================
USER PROFILE
======================================

Create a profile manager.

Store

Personal Information

Education

Skills

Experience

Preferred Jobs

Preferred Cities

Resume

Settings

Save everything in Local Storage.

======================================
RESUME
======================================

Support

Upload PDF

Upload DOCX

Upload TXT

Extract text from uploaded resume where possible.

Analyze

Skills

Education

Experience

Store results.

======================================
JOB SOURCES
======================================

Allow users to enable/disable sources.

Government

NGOs

Organizations

Hospitals

Universities

Job Portals

Company Career Pages

Each source should store

Name

Website

Enabled

Last Scan

Status

======================================
JOB HUNTER
======================================

When user clicks Start Hunting

Run

Collect jobs

Normalize data

Remove duplicates

Analyze requirements

Compare with profile

Calculate Match Score

Sort by score

Save results

======================================
MATCH SCORE
======================================

Compare

Education

Skills

Experience

Preferred Cities

Preferred Categories

Salary

Keywords

Provide explanation.

======================================
SUPPORTED SOURCES
======================================

Structure the application so future integrations can be added easily.

Examples

BPSC

FPSC

SPSC

NJP

BrightSpyre

Mustakbil

Rozee

ReliefWeb

UN Careers

WHO Careers

UNICEF Careers

Mercy Corps

ACTED

Save the Children

University career portals

Hospital career portals

Company career pages

IMPORTANT

Do NOT actually scrape websites.

Instead create modular connector classes with placeholder functions such as

fetchJobs()

parseJobs()

normalizeJobs()

These should be easy to replace later with real APIs or scrapers.

======================================
APPLICATION TRACKER
======================================

Track

Saved

Applied

Assessment

Interview

Offer

Rejected

Accepted

======================================
AI ASSISTANT
======================================

Create placeholder AI functions

recommendJobs()

improveResume()

generateCoverLetter()

prepareInterview()

careerAdvice()

These should currently return mock data.

======================================
NOTIFICATIONS
======================================

Deadline reminders

Interview reminders

New jobs found

Profile incomplete

Resume outdated

======================================
EXPORT
======================================

Export JSON

CSV

Import JSON

Backup

Restore

======================================
SETTINGS
======================================

Theme

Notifications

Storage

Reset

Backup

======================================
OUTPUT

Return ONE COMPLETE app.js only.
