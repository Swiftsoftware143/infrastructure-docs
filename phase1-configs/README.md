# Phase 1 Infrastructure Configs

Complete configuration files for deploying OpenClaw + n8n + LLM on decentralized infrastructure.

## What's Included

| File | Purpose |
|------|---------|
| `openclaw-deploy.yml` | Akash deployment for OpenClaw + LiteLLM proxy |
| `n8n-deploy.yml` | Akash deployment for n8n workflows |
| `litellm-config.yaml` | LiteLLM proxy configuration |
| `supabase-schema.sql` | Database schema for credit system |
| `openclaw-config.json` | OpenClaw configuration template |
| `deploy.sh` | Automated deployment script |
| `vast-setup.sh` | Vast.ai LLM setup script |

## Quick Start

1. **Fill in the variables** in all `{{VARIABLE}}` placeholders
2. **Run the deployment script**: `./deploy.sh`
3. **Set up Vast.ai**: `./vast-setup.sh`
4. **Update configs** with Vast IP
5. **Test everything**

## Variables to Fill In

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `{{SUPABASE_PASSWORD}}` | Supabase database password | Supabase dashboard |
| `{{SUPABASE_PROJECT}}` | Supabase project ID | Supabase dashboard |
| `{{REDIS_PASSWORD}}` | Redis password | Upstash dashboard |
| `{{REDIS_HOST}}` | Redis host | Upstash dashboard |
| `{{LITELLM_KEY}}` | API key for LiteLLM | Generate random string |
| `{{DOMAIN}}` | Your domain | Your DNS provider |
| `{{VAST_IP}}` | Vast.ai instance IP | From `vast-setup.sh` |
| `{{N8N_PASSWORD}}` | n8n admin password | Create strong password |
| `{{N8N_API_KEY}}` | n8n API key | From n8n settings |
| `{{JWT_SECRET}}` | JWT signing secret | Generate random string |
| `{{ENCRYPTION_KEY}}` | Encryption key | 32 character random string |

## Cost Breakdown

| Component | Platform | Monthly Cost |
|-----------|----------|--------------|
| OpenClaw | Akash | $3-5 |
| n8n | Akash | $3-5 |
| LLM | Vast.ai | $50-100 |
| Database | Supabase | Free-$25 |
| **Total** | | **$60-140** |

**vs Current:** $200-600/month
**Savings:** $140-460/month

## Deployment Order

1. **Supabase** (5 min) - Run SQL schema
2. **Akash** (30 min) - Deploy OpenClaw + n8n
3. **Vast.ai** (15 min) - Set up LLM
4. **Testing** (10 min) - Verify everything works

**Total Time:** ~1 hour

## Support

See `PHASE1-DEPLOYMENT-PLAYBOOK.md` for detailed step-by-step instructions.

---

*Last Updated: June 15, 2026*
