# Decentralized Infrastructure Playbook
## OpenClaw + n8n + LLM on Akash & Vast.ai

**No crypto purchasing instructions included** — funding methods are your responsibility.

---

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         FRONTEND (Netlify - FREE)       │
│    (FunnelSwift, WorkflowSwift, etc.)   │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      BACKEND (Akash Network)            │
│                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │OpenClaw │ │   n8n   │ │Rust CRM │   │
│  │ Gateway │ │Workflows│ │+Automation│  │
│  │$3-5/mo  │ │$3-5/mo  │ │$3-5/mo  │   │
│  └────┬────┘ └────┬────┘ └────┬────┘   │
│       │           │           │         │
│       └───────────┼───────────┘         │
│                   │                     │
│                   ▼                     │
│         ┌─────────────┐                 │
│         │  Vast.ai    │                 │
│         │  LLM Proxy  │                 │
│         │ ($50-100/mo)│                 │
│         └─────────────┘                 │
│                                         │
│         Total: $65-120/month            │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      DATABASE (Supabase - FREE tier)    │
│   (Persistent storage for all apps)     │
└─────────────────────────────────────────┘
```

---

## Prerequisites

Before starting, ensure you have:
- [ ] Akash Network account with AKT tokens
- [ ] Vast.ai account with payment method
- [ ] Supabase project created
- [ ] Domain name (optional)
- [ ] Linux/Mac terminal or WSL on Windows

---

## Step 1: Install Akash CLI

```bash
# Install Akash CLI
curl -sSfL https://raw.githubusercontent.com/akash-network/provider/main/install.sh | sh

# Add to PATH
export PATH="$PATH:$HOME/.akash/bin"
echo 'export PATH="$PATH:$HOME/.akash/bin"' >> ~/.bashrc

# Verify
akash version
```

---

## Step 2: Configure Wallet

```bash
# Create wallet (if not exists)
akash keys add deployer

# Get address
akash keys show deployer -a

# Check balance
akash query bank balances $(akash keys show deployer -a) --node https://rpc.akash.forbole.com:443
```

---

## Step 3: Download Configuration Files

```bash
# Clone repository
git clone https://github.com/Swiftsoftware143/infrastructure-docs.git
cd infrastructure-docs/phase1-configs

# Make scripts executable
chmod +x *.sh
```

---

## Step 4: Fill in Environment Variables

Edit these files and replace `{{VARIABLE}}` placeholders:

### openclaw-deploy.yml
- `{{SUPABASE_PASSWORD}}` — Your Supabase password
- `{{SUPABASE_PROJECT}}` — Your Supabase project ID
- `{{REDIS_PASSWORD}}` — Your Redis password
- `{{REDIS_HOST}}` — Your Redis host
- `{{LITELLM_KEY}}` — Generate: `openssl rand -hex 32`
- `{{DOMAIN}}` — Your domain or leave for Akash URL
- `{{JWT_SECRET}}` — Generate: `openssl rand -hex 32`
- `{{ENCRYPTION_KEY}}` — Generate: `openssl rand -hex 16`

### n8n-deploy.yml
- `{{SUPABASE_PASSWORD}}` — Same as above
- `{{SUPABASE_PROJECT}}` — Same as above
- `{{N8N_PASSWORD}}` — Strong password for n8n login
- `{{DOMAIN}}` — Same as above

---

## Step 5: Deploy OpenClaw

```bash
# Create deployment
akash tx deployment create openclaw-deploy.yml \
  --from deployer \
  --node https://rpc.akash.forbole.com:443 \
  --chain-id akashnet-2 \
  --fees 5000uakt \
  --yes

# Note the DSEQ from output
# Wait 30 seconds for bids
sleep 30

# List bids
akash query market bid list \
  --owner $(akash keys show deployer -a) \
  --node https://rpc.akash.forbole.com:443

# Create lease (replace DSEQ and PROVIDER)
akash tx market lease create \
  --owner $(akash keys show deployer -a) \
  --dseq YOUR_DSEQ \
  --gseq 1 \
  --oseq 1 \
  --provider PROVIDER_ADDRESS \
  --from deployer \
  --node https://rpc.akash.forbole.com:443 \
  --chain-id akashnet-2 \
  --fees 5000uakt \
  --yes

# Get deployment URL
akash provider lease-status \
  --owner $(akash keys show deployer -a) \
  --dseq YOUR_DSEQ \
  --gseq 1 \
  --oseq 1 \
  --provider PROVIDER_ADDRESS \
  --node https://rpc.akash.forbole.com:443
```

**Save the URL from output.**

---

## Step 6: Deploy n8n

Repeat Step 5 commands using `n8n-deploy.yml` instead of `openclaw-deploy.yml`.

---

## Step 7: Set Up Vast.ai LLM

```bash
# Install Vast CLI
pip install vastai

# Set API key
vastai set api-key YOUR_VAST_API_KEY

# Search for GPU
vastai search offers 'gpu_ram>=24 compute_cap>=800' --order 'dph' --limit 5

# Create instance (replace INSTANCE_ID)
vastai create instance INSTANCE_ID \
  --image ollama/ollama:latest \
  --disk 100 \
  --env '-p 11434:11434' \
  --onstart-cmd 'ollama pull llama3.1:70b && ollama serve' \
  --direct

# Get IP address
vastai show instances
```

**Save the IP address.**

---

## Step 8: Update Configs with Vast IP

Edit `openclaw-deploy.yml` and replace `{{VAST_IP}}` with your actual IP.

Then update deployment:

```bash
akash tx deployment update openclaw-deploy.yml \
  --owner $(akash keys show deployer -a) \
  --dseq YOUR_DSEQ \
  --from deployer \
  --node https://rpc.akash.forbole.com:443 \
  --chain-id akashnet-2 \
  --fees 5000uakt \
  --yes
```

---

## Step 9: Run Supabase Schema

1. Go to https://app.supabase.io
2. Select your project
3. Open SQL Editor
4. Copy contents of `supabase-schema.sql`
5. Run the SQL

---

## Step 10: Test Everything

```bash
# Test OpenClaw
curl https://YOUR_OPENCLAW_URL/health

# Test n8n
curl https://YOUR_N8N_URL/healthz

# Test LLM
curl http://YOUR_VAST_IP:11434/api/tags
```

All should return success responses.

---

## Cost Summary

| Component | Platform | Monthly Cost |
|-----------|----------|--------------|
| OpenClaw | Akash | $3-5 |
| n8n | Akash | $3-5 |
| LLM | Vast.ai | $50-100 |
| Database | Supabase | Free-$25 |
| **Total** | | **$60-140** |

**vs Current:** $200-600/month
**Savings:** $140-460/month

---

## Troubleshooting

### "Insufficient funds"
Add more AKT to your wallet.

### "No bids found"
Wait 2-3 minutes and retry. Or increase price in SDL file.

### "Cannot connect to Vast.ai"
Check firewall rules. Ensure port 11434 is open.

### "LLM not responding"
SSH into Vast instance: `docker logs ollama`

---

## Next Steps

1. [ ] Update your SaaS apps to use new endpoints
2. [ ] Import existing n8n workflows
3. [ ] Test credit system
4. [ ] Cancel old services (Hyonix, Moonshot, Anthropic)

---

## Files Reference

All configuration files available at:
https://github.com/Swiftsoftware143/infrastructure-docs/tree/main/phase1-configs

---

*Last Updated: June 15, 2026*
