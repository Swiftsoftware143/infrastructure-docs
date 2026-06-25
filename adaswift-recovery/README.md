# ADASwift Console - Recovery Package

**Recovered:** June 25, 2026  
**Source:** OpenClaw workspace archive  
**Status:** Complete codebase recovery

---

## 📁 What's Included

### Documentation
- `ADASwift-RECOVERY.md` - Complete architecture and recovery documentation
- `design_guidelines.json` - UI/UX design system

### Database Schema (Supabase)
- `SUPABASE_SETUP.sql` - Initial setup and RLS policies
- `legal-pages-schema.sql` - Editable legal pages system
- `scan-reports-schema.sql` - ADA scan reports schema
- `integration-events-schema.sql` - FunnelSwift integration tracking

### Frontend (React + TailwindCSS)
**Core Files:**
- `frontend/src/App.js` - Main application router
- `frontend/src/index.js` - Application entry point
- `frontend/package.json` - Dependencies
- `frontend/tailwind.config.js` - Tailwind configuration

**Pages:**
- `frontend/src/pages/Clients.jsx` - Client management
- `frontend/src/pages/ClientDetail.jsx` - Client detail & widget settings
- `frontend/src/pages/PersonalWebsites.jsx` - Website management
- `frontend/src/pages/PersonalWebsiteDetail.jsx` - Website detail
- `frontend/src/pages/WidgetRequests.jsx` - Widget request handling
- `frontend/src/pages/ScanReports.jsx` - ADA scan reports
- `frontend/src/pages/AutomationDashboard.jsx` - Automation controls
- `frontend/src/pages/AdminLegalPages.jsx` - Legal pages admin
- `frontend/src/pages/PlanSettings.jsx` - Plan configuration
- `frontend/src/pages/Login.jsx` - Authentication

**Components:**
- `frontend/src/components/Sidebar.jsx` - Navigation sidebar
- `frontend/src/components/ClientFormModal.jsx` - Add/edit client modal
- `frontend/src/components/MasterToggle.jsx` - Widget master toggle

### Backend (Netlify Functions)
- `netlify/functions/trigger-scan.js` - Manual scan trigger
- `netlify/functions/monthly-scan-cron.js` - Monthly automated scans
- `netlify/functions/funnelswift-webhook.js` - FunnelSwift integration
- `netlify/functions/widget-automation.js` - Widget automation logic

---

## 🚀 Quick Setup

1. **Supabase Setup**
   ```bash
   # Run SQL files in Supabase SQL Editor
   # 1. SUPABASE_SETUP.sql
   # 2. legal-pages-schema.sql
   # 3. scan-reports-schema.sql
   # 4. integration-events-schema.sql
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

3. **Environment Variables**
   ```
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run Development**
   ```bash
   npm start
   ```

---

## 🏗️ Architecture Overview

```
ADASwift Console
├── React Frontend (Port 3000)
│   ├── Client Management
│   ├── Widget Configuration
│   ├── ADA Scan Reports
│   └── Legal Pages
├── Supabase Backend
│   ├── PostgreSQL Database
│   ├── Auth (Email)
│   └── Storage (Reports)
└── Netlify Functions
    ├── Pa11y Scanning
    ├── PDF Generation
    └── Webhook Handlers
```

---

## 📊 Features

### Widget System
- **5 Accessibility Profiles:** Blind, Motor, Cognitive, Seizure, ADHD
- **10 Features:** Contrast, text size, animations, cursor, etc.
- **Embed Code Generation** for client websites

### ADA Compliance Scanning
- **Pa11y Integration** for WCAG 2.1 AA testing
- **Monthly Automated Scans**
- **PDF Report Generation**
- **Email Delivery** to clients

### Client Management
- Multi-tenant client system
- Per-client and per-website widget settings
- Plan tier management
- FunnelSwift lead integration

---

## 🔗 Links

- **Repository:** https://github.com/Swiftsoftware143/infrastructure-docs
- **Recovery Location:** `/adaswift-recovery/`
- **Full Documentation:** See `ADASwift-RECOVERY.md`

---

## ⚠️ Note

This is a complete recovery of the ADASwift Console codebase. All original functionality, design specifications, and database schemas have been preserved.

For questions or issues, refer to the main recovery documentation.
