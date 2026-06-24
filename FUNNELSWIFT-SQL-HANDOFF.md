# FunnelSwift SQL Migrations - Handoff for SwiftSoftware

**Date:** June 24, 2026  
**From:** OpenClaw (main session)  
**To:** SwiftSoftware (Linux bot)  
**Priority:** HIGH

---

## Status

**Migration 1 COMPLETED** ✅  
- SwiftImpact Schema (contacts, tags, pipelines, deals, activities, questionnaires)
- All tables created with RLS policies

**Migrations 2-37 PENDING** ⏳  
- 36 more migrations need to be run
- Located in: `funnelswift-github/supabase/migrations/`

---

## Database Connection

**Supabase Project:** https://supabase.com/dashboard/project/wtlbpeoabwneitawrrtz  
**Service Role Key:** Available in N8N-SETUP-TASKS.md

---

## Remaining Migrations (Run in Order)

Run these SQL files in sequence:

1. ✅ `20260610003641_001_swiftimpact_schema.sql` - DONE
2. `20260610010000_add_superadmin.sql`
3. `20240617_add_superadmin_function.sql`
4. `20260610172000_integration_events.sql`
5. `20260610180000_tenant_integrations.sql`
6. `20260611000000_system_tags_configurable.sql`
7. `20260611000001_master_lead_tracking.sql`
8. `20260611000002_questionnaire_system.sql`
9. `20260611000003_campaigns_and_domains.sql`
10. `20260611000004_campaign_assignments.sql`
11. `20260611000005_tag_integration_triggers.sql`
12. `20260611000006_affiliate_tax_info.sql`
13. `20260611000007_legal_pages.sql`
14. `20260611000008_team_access.sql`
15. `20260611000009_adaswift_trigger.sql`
16. `20260611000010_email_templates.sql`
17. `20260612000000_lead_forms.sql`
18. `20260612000000_lead_forms_fixed.sql`
19. `20260612000001_cross_system_affiliate_tracking.sql`
20. `20260612000002_funnelswift_plans_and_dynamic_commissions.sql`
21. `20260612000003_dynamic_features_and_pricing.sql`
22. `20260612000004_super_affiliate_overrides.sql`
23. `20260613000000_event_dispatch_trigger.sql`
24. `20260615000000_tag_groups.sql`
25. `20260615000001_plan_tag_mapping.sql`
26. `20260615000002_payout_lifecycle.sql`
27. `20260616000001_lead_creation_transaction.sql`
28. `20260618000000_footer_settings.sql`
29. `20260618000001_plans_table.sql`
30. `20260619000000_affiliate_user_link.sql`
31. `20260619000000_simplify_tenants_for_prospects.sql`
32. `20260619000001_create_portfolio_table.sql`
33. `20260620000000_create_affiliate_profiles.sql`
34. `20260621000000_add_tenant_id_to_affiliates.sql`

---

## How to Run

1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/wtlbpeoabwneitawrrtz/sql/new
2. Read each migration file from `funnelswift-github/supabase/migrations/`
3. Copy/paste SQL into editor
4. Run each migration in order
5. If errors occur (e.g., "already exists"), skip and continue to next

---

## Notes

- Some migrations may already be partially applied (RLS policies, etc.)
- Watch for "already exists" errors — these are safe to skip
- David wants these done but doesn't want to run manually
- Each migration should be run in chunks if too long

---

## Related

- WorkflowSwift migrations: ALREADY COMPLETE ✅
- CRM Swift: Not deployed yet (no SQL needed)
- Next: Cloudflare + Hetzner deployment after SQL is done

---

**Action Required:** Run remaining 36 FunnelSwift migrations  
**Assigned To:** SwiftSoftware (Linux bot)  
**Priority:** HIGH
