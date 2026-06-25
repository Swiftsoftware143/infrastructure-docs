# ADASwift Console - Complete Recovery Documentation

**Project:** SwiftImpact ADA Console  
**Status:** Full codebase exists in workspace  
**Location:** `/root/.openclaw/workspace/ada-console/`  
**Stack:** React + TailwindCSS + Supabase + Netlify Functions  

---

## 📋 Project Overview

ADASwift Console is a client management dashboard for SwiftImpact's ADA compliance widget service. It allows you to:

- Manage clients and their widget configurations
- Generate embed codes for client websites
- Run automated ADA compliance scans (Pa11y integration)
- Generate PDF scan reports
- Manage legal pages (Terms, Privacy, etc.)
- Track widget requests and personal websites
- Integration with FunnelSwift for lead tracking

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ADASwift Console                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ React App   │  │ Supabase    │  │ Netlify Functions   │  │
│  │ (Frontend)  │  │ (Database)  │  │ (Backend API)       │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘  │
└─────────┼────────────────┼───────────────────────────────────┘
          │                │
          ▼                ▼
    ┌─────────────────────────────────────┐
    │  Pa11y Scanner (Self-hosted)        │
    │  - Monthly ADA compliance scans     │
    │  - PDF report generation            │
    └─────────────────────────────────────┘
```

---

## 🎨 Design System

### Branding
- **Name:** SwiftImpact Solutions
- **Logo:** Text-based ("SwiftImpact Solutions")
- **Theme:** Dark mode, Swiss & High-Contrast

### Colors
```css
--background: #0f1117
--sidebar: #1a1d27
--cards: #1e2130
--accent: #007bff
--success: #10b981
--danger: #ef4444
--text-primary: #f8fafc
--text-secondary: #94a3b8
--text-muted: #64748b
--border: #2e3245
--border-hover: #3e445e
```

### Typography
- **Headings:** Outfit
- **Body:** Inter

---

## 📁 Project Structure

```
ada-console/
├── frontend/                 # React application
│   ├── src/
│   │   ├── pages/           # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Clients.jsx
│   │   │   ├── ClientDetail.jsx
│   │   │   ├── PersonalWebsites.jsx
│   │   │   ├── PersonalWebsiteDetail.jsx
│   │   │   ├── WidgetRequests.jsx
│   │   │   ├── ScanReports.jsx
│   │   │   ├── AutomationDashboard.jsx
│   │   │   ├── EmbedCodePage.jsx
│   │   │   ├── AdminLegalPages.jsx
│   │   │   ├── LegalPage.jsx
│   │   │   ├── FooterManagement.jsx
│   │   │   ├── PlanSettings.jsx
│   │   │   ├── Settings.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── Login.jsx
│   │   ├── components/      # Reusable components
│   │   │   ├── Sidebar.jsx
│   │   │   ├── ClientFormModal.jsx
│   │   │   ├── PersonalWebsiteFormModal.jsx
│   │   │   ├── CategoryManager.jsx
│   │   │   ├── MasterToggle.jsx
│   │   │   ├── MasterStatusHero.jsx
│   │   │   ├── EmbedCodeBlock.jsx
│   │   │   └── ui/          # Shadcn UI components
│   │   ├── contexts/        # React contexts
│   │   ├── hooks/           # Custom hooks
│   │   ├── lib/             # Utilities
│   │   ├── api/             # API functions
│   │   └── types/           # TypeScript types
│   ├── public/
│   ├── package.json
│   ├── tailwind.config.js
│   └── netlify.toml
├── backend/                  # Netlify functions
├── memory/                   # Project memory
├── SUPABASE_SETUP.sql       # Database setup
├── legal-pages-schema.sql   # Legal pages system
├── scan-reports-schema.sql  # Scan reports schema
├── integration-events-schema.sql  # FunnelSwift integration
├── scan-report-system.md    # Scan system documentation
└── design_guidelines.json   # Complete design spec
```

---

## 🗄️ Database Schema (Supabase)

### Core Tables

#### 1. clients
```sql
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  email TEXT,
  phone TEXT,
  plan_tier TEXT DEFAULT 'basic',
  status TEXT DEFAULT 'active',
  date_added TIMESTAMPTZ DEFAULT now(),
  -- Widget settings
  widget_enabled BOOLEAN DEFAULT false,
  widget_position TEXT DEFAULT 'bottom-right',
  widget_color TEXT DEFAULT '#007bff',
  -- Default profiles (5 toggles)
  profile_blind BOOLEAN DEFAULT false,
  profile_motor BOOLEAN DEFAULT false,
  profile_cognitive BOOLEAN DEFAULT false,
  profile_seizure BOOLEAN DEFAULT false,
  profile_adhd BOOLEAN DEFAULT false,
  -- Default features (10 toggles)
  feature_contrast BOOLEAN DEFAULT false,
  feature_highlight_links BOOLEAN DEFAULT false,
  feature_text_size BOOLEAN DEFAULT false,
  feature_text_spacing BOOLEAN DEFAULT false,
  feature_pause_animations BOOLEAN DEFAULT false,
  feature_hide_images BOOLEAN DEFAULT false,
  feature_dyslexia_font BOOLEAN DEFAULT false,
  feature_cursor BOOLEAN DEFAULT false,
  feature_tooltips BOOLEAN DEFAULT false,
  feature_reading_mask BOOLEAN DEFAULT false,
  -- Tracking
  funnelswift_contact_id TEXT,
  funnelswift_tracking_id TEXT,
  referred_by_user_id TEXT,
  source TEXT DEFAULT 'manual'
);
```

#### 2. personal_websites
```sql
CREATE TABLE personal_websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  email TEXT,
  status TEXT DEFAULT 'active',
  date_added TIMESTAMPTZ DEFAULT now(),
  -- Widget settings (override client defaults)
  widget_enabled BOOLEAN DEFAULT false,
  widget_position TEXT DEFAULT 'bottom-right',
  widget_color TEXT DEFAULT '#007bff',
  -- Profiles
  profile_blind BOOLEAN DEFAULT false,
  profile_motor BOOLEAN DEFAULT false,
  profile_cognitive BOOLEAN DEFAULT false,
  profile_seizure BOOLEAN DEFAULT false,
  profile_adhd BOOLEAN DEFAULT false,
  -- Features
  feature_contrast BOOLEAN DEFAULT false,
  feature_highlight_links BOOLEAN DEFAULT false,
  feature_text_size BOOLEAN DEFAULT false,
  feature_text_spacing BOOLEAN DEFAULT false,
  feature_pause_animations BOOLEAN DEFAULT false,
  feature_hide_images BOOLEAN DEFAULT false,
  feature_dyslexia_font BOOLEAN DEFAULT false,
  feature_cursor BOOLEAN DEFAULT false,
  feature_tooltips BOOLEAN DEFAULT false,
  feature_reading_mask BOOLEAN DEFAULT false,
  -- Tracking
  funnelswift_tracking_id TEXT,
  referred_by_user_id TEXT
);
```

#### 3. widget_requests
```sql
CREATE TABLE widget_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  domain TEXT,
  message TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 4. client_scan_settings
```sql
CREATE TABLE client_scan_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  monthly_scan_enabled BOOLEAN DEFAULT false,
  scan_frequency TEXT DEFAULT 'monthly',
  last_scan_at TIMESTAMPTZ,
  last_scan_score INTEGER,
  last_scan_report_url TEXT,
  scan_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id)
);
```

#### 5. scan_reports
```sql
CREATE TABLE scan_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  scan_date TIMESTAMPTZ DEFAULT now(),
  domain TEXT NOT NULL,
  overall_score INTEGER,
  wcag_aa_score INTEGER,
  error_count INTEGER DEFAULT 0,
  warning_count INTEGER DEFAULT 0,
  notice_count INTEGER DEFAULT 0,
  report_url TEXT,
  report_pdf_path TEXT,
  scan_results JSONB,
  previous_scan_id UUID REFERENCES scan_reports(id),
  improvement_score INTEGER,
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 6. legal_pages
```sql
CREATE TABLE legal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  last_updated TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 7. footer_links
```sql
CREATE TABLE footer_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  column_number INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  link_type TEXT DEFAULT 'custom',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

#### 8. integration_events
```sql
CREATE TABLE integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  website_id UUID REFERENCES personal_websites(id) ON DELETE SET NULL,
  tracking_id TEXT,
  referred_by_user_id UUID,
  funnelswift_contact_id TEXT,
  funnelswift_tenant_id TEXT,
  payload JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  processed_at TIMESTAMPTZ
);
```

---

## 🔑 Key Features

### 1. Client Management
- Add/edit/delete clients
- Configure widget settings per client
- Master toggle for enabling/disabling widgets
- Embed code generation

### 2. Personal Websites
- Each client can have multiple websites
- Individual widget settings per website
- Override client defaults

### 3. Widget Configuration
**Profiles (5):**
- Blind (Screen reader optimized)
- Motor (Keyboard navigation)
- Cognitive (Reading aids)
- Seizure (Animation reduction)
- ADHD (Focus tools)

**Features (10):**
- Contrast adjustment
- Highlight links
- Text size control
- Text spacing
- Pause animations
- Hide images
- Dyslexia-friendly font
- Big cursor
- Tooltips
- Reading mask

### 4. ADA Scan Reports
- Monthly automated scans using Pa11y
- WCAG 2.1 AA compliance checking
- PDF report generation
- Email delivery to clients
- Score tracking over time

### 5. Legal Pages System
- Editable Terms of Service
- Privacy Policy
- Affiliate Disclosure
- Earnings Disclaimer
- Cookie Policy
- Refund Policy

### 6. FunnelSwift Integration
- Lead tracking from FunnelSwift
- Affiliate attribution
- Integration events logging

---

## 🚀 Setup Instructions

### 1. Supabase Setup
1. Create a new Supabase project
2. Run the SQL files in this order:
   - `SUPABASE_SETUP.sql`
   - `legal-pages-schema.sql`
   - `scan-reports-schema.sql`
   - `integration-events-schema.sql`

3. Enable Email provider in Authentication → Providers
4. Create a user: `swiftsoftware143@yahoo.com`

### 2. Frontend Setup
```bash
cd frontend
npm install
```

Create `.env` file:
```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run Development
```bash
npm start
```

### 4. Deploy to Netlify
```bash
netlify deploy --prod
```

---

## 📦 Dependencies

```json
{
  "react": "^18.x",
  "react-router-dom": "^6.x",
  "@supabase/supabase-js": "^2.x",
  "tailwindcss": "^3.x",
  "lucide-react": "latest",
  "sonner": "latest",
  "framer-motion": "latest",
  "@radix-ui/react-*": "various",
  "class-variance-authority": "latest",
  "clsx": "latest",
  "tailwind-merge": "latest"
}
```

---

## 🔧 Widget Embed Code

The widget embed code for clients:

```html
<script>
  (function() {
    var script = document.createElement('script');
    script.src = 'https://your-widget-cdn.com/widget.js';
    script.async = true;
    script.dataset.clientId = 'CLIENT_ID_HERE';
    script.dataset.config = JSON.stringify({
      position: 'bottom-right',
      color: '#007bff',
      profiles: ['blind', 'motor'],
      features: ['contrast', 'text-size']
    });
    document.head.appendChild(script);
  })();
</script>
```

---

## 🔄 Migration to Cloudflare + Hetzner

As part of the infrastructure migration:

1. **Frontend:** Move from Netlify to Cloudflare Pages
2. **Backend:** Deploy Netlify functions to Hetzner VPS
3. **Database:** Keep Supabase (or migrate to self-hosted PostgreSQL)
4. **Scan Service:** Self-host Pa11y on Hetzner

---

## 📝 Notes

- All interactive elements have `data-testid` attributes for testing
- RLS policies are configured for authenticated users
- Design follows Swiss/High-Contrast dark theme
- Widget is fully accessible (ironically, for an ADA compliance tool)

---

**Recovery Date:** 2026-06-25  
**Recovered By:** OpenClaw Agent  
**Source:** `/root/.openclaw/workspace/ada-console/`
