# Phase 1 Deployment Playbook
## Complete Copy-Paste Guide for Akash + Vast.ai Setup

**Your Role:** Copy/paste commands, fill in blanks, follow steps
**My Role:** Provide every command, config file, and instruction

---

## Prerequisites Checklist

Before starting, you need:
- [ ] Linux/Mac terminal (or WSL on Windows)
- [ ] Credit card or crypto (AKT, USDC)
- [ ] Domain name (optional but recommended)

---

## Step 1: Install Akash CLI (5 minutes)

**Copy and paste this entire block:**

```bash
# Install Akash CLI
curl -sSfL https://raw.githubusercontent.com/akash-network/provider/main/install.sh | sh

# Add to PATH
export PATH="$PATH:$HOME/.akash/bin"
echo 'export PATH="$PATH:$HOME/.akash/bin"' >> ~/.bashrc

# Verify installation
akash version
```

**Expected output:** `v0.36.0` or similar version number

---

## Step 2: Create Akash Wallet (10 minutes)

**Step 2a: Create wallet**
```bash
# Create new wallet (SAVE THE MNEMONIC!)
akash keys add deployer

# Get your wallet address
akash keys show deployer -a
```

**Save this information:**
- **Address:** `akash1...` (copy this)
- **Mnemonic:** 24 words (WRITE THIS DOWN SECURELY)

**Step 2b: Fund your wallet**

Option A: Buy AKT on Coinbase → Withdraw to your address
Option B: Use Akash Console (credit card)

**Check balance:**
```bash
akash query bank balances $(akash keys show deployer -a) --node https://rpc.akash.forbole.com:443
```

**You need:** At least 10 AKT (~$3-5) to start

---

## Step 3: Create Deployment Files (15 minutes)

**Create a folder for your deployment:**
```bash
mkdir ~/akash-deployment && cd ~/akash-deployment
```

**Step 3a: Create OpenClaw deployment file**

Copy this ENTIRE block (creates the file):

```bash
cat > openclaw-deploy.yml << 'EOF'
---
version: "2.0"

services:
  openclaw:
    image: openclaw/openclaw:latest
    expose:
      - port: 3000
        as: 80
        to:
          - global: true
    env:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@YOUR_PROJECT.supabase.co:5432/postgres
      - LLM_PROVIDER=ollama
      - LLM_URL=http://llm-proxy:8080
      - N8N_WEBHOOK_URL=https://n8n.YOUR_DOMAIN/webhook
    params:
      storage:
        data:
          mount: /data
          readOnly: false

  llm-proxy:
    image: litellm/litellm:latest
    expose:
      - port: 8080
        as: 8080
        to:
          - service: openclaw
    env:
      - LITELLM_MASTER_KEY=YOUR_LITELLM_KEY
      - MODEL_NAME=llama3.1:70b
      - OLLAMA_API_BASE=http://YOUR_VAST_IP:11434

profiles:
  compute:
    openclaw:
      resources:
        cpu:
          units: 2
        memory:
          size: 4Gi
        storage:
          - size: 10Gi
          - name: data
            size: 20Gi
            attributes:
              persistent: true
              class: beta3
    llm-proxy:
      resources:
        cpu:
          units: 1
        memory:
          size: 2Gi
        storage:
          size: 5Gi

  placement:
    dcloud:
      attributes:
        host: akash
      signedBy:
        anyOf:
          - "akash1365yvmc4s7awdyj3n2sav7xfx76adc6dnmlx63"
      pricing:
        openclaw:
          denom: uakt
          amount: 5000
        llm-proxy:
          denom: uakt
          amount: 2000

deployment:
  dcloud:
    dcloud:
      profile: dcloud
      count: 1
EOF
```

**Step 3b: Create n8n deployment file**

```bash
cat > n8n-deploy.yml << 'EOF'
---
version: "2.0"

services:
  n8n:
    image: n8nio/n8n:latest
    expose:
      - port: 5678
        as: 80
        to:
          - global: true
    env:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=YOUR_N8N_PASSWORD
      - N8N_HOST=n8n.YOUR_DOMAIN
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://n8n.YOUR_DOMAIN/
      - GENERIC_TIMEZONE=America/New_York
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=YOUR_PROJECT.supabase.co
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=postgres
      - DB_POSTGRESDB_USER=postgres
      - DB_POSTGRESDB_PASSWORD=YOUR_PASSWORD
      - N8N_AI_ENABLED=true
      - N8N_AI_PROVIDER=ollama
      - N8N_AI_OLLAMA_BASE_URL=http://llm-proxy:8080
    params:
      storage:
        data:
          mount: /home/node/.n8n
          readOnly: false

profiles:
  compute:
    n8n:
      resources:
        cpu:
          units: 2
        memory:
          size: 4Gi
        storage:
          - size: 5Gi
          - name: data
            size: 20Gi
            attributes:
              persistent: true
              class: beta3

  placement:
    dcloud:
      attributes:
        host: akash
      signedBy:
        anyOf:
          - "akash1365yvmc4s7awdyj3n2sav7xfx76adc6dnmlx63"
      pricing:
        n8n:
          denom: uakt
          amount: 5000

deployment:
  dcloud:
    dcloud:
      profile: dcloud
      count: 1
EOF
```

**Step 3c: Replace placeholder values**

Edit both files and replace:
- `YOUR_PASSWORD` → Your Supabase password
- `YOUR_PROJECT` → Your Supabase project ID
- `YOUR_DOMAIN` → Your domain (or use Akash provider URL)
- `YOUR_LITELLM_KEY` → Generate a random key (e.g., `sk-abc123xyz`)
- `YOUR_VAST_IP` → You'll get this in Step 5
- `YOUR_N8N_PASSWORD` → Strong password for n8n login

---

## Step 4: Deploy OpenClaw to Akash (10 minutes)

**Step 4a: Create the deployment**
```bash
cd ~/akash-deployment

# Create deployment (this spends AKT)
akash tx deployment create openclaw-deploy.yml \
  --from deployer \
  --node https://rpc.akash.forbole.com:443 \
  --chain-id akashnet-2 \
  --fees 5000uakt \
  --yes
```

**Save the DSEQ number** from the output (looks like `1234567`)

**Step 4b: Get provider bids**
```bash
# List bids (wait 30-60 seconds first)
akash query market bid list \
  --owner $(akash keys show deployer -a) \
  --node https://rpc.akash.forbole.com:443
```

**Step 4c: Create lease (choose cheapest provider)**
```bash
# Replace DSEQ with your number from Step 4a
# Replace PROVIDER with provider address from bids

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
```

**Step 4d: Get deployment URL**
```bash
# Get the manifest (contains URL)
akash provider lease-status \
  --owner $(akash keys show deployer -a) \
  --dseq YOUR_DSEQ \
  --gseq 1 \
  --oseq 1 \
  --provider PROVIDER_ADDRESS \
  --node https://rpc.akash.forbole.com:443
```

**Save the URL** (looks like `https://provider.akash.pro:8443/...`)

---

## Step 5: Set Up Vast.ai LLM (15 minutes)

**Step 5a: Create Vast.ai account**
1. Go to https://vast.ai
2. Sign up with email
3. Add payment method (credit card or crypto)
4. Get API key from account settings

**Step 5b: Install Vast CLI**
```bash
pip install vastai

# Login
vastai set api-key YOUR_VAST_API_KEY
```

**Step 5c: Find cheap GPU**
```bash
# Search for RTX 4090 under $0.50/hour
vastai search offers 'gpu_ram>=24 compute_cap>=800' \
  --order 'dph' \
  --limit 10
```

**Step 5d: Create instance**
```bash
# Pick instance ID from search results (e.g., 12345)
# This creates the instance and starts Ollama

vastai create instance INSTANCE_ID \
  --image ollama/ollama:latest \
  --disk 100 \
  --env '-p 11434:11434' \
  --onstart-cmd 'ollama pull llama3.1:70b && ollama serve' \
  --direct
```

**Step 5e: Get instance IP**
```bash
vastai show instances
```

**Save the IP address** (looks like `69.30.85.123`)

**Step 5f: Test the LLM**
```bash
# Replace with your IP
curl http://YOUR_VAST_IP:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:70b",
    "prompt": "Hello, are you working?"
  }'
```

---

## Step 6: Update Configs with Real Values (10 minutes)

**Step 6a: Update OpenClay deployment with Vast IP**
```bash
# Edit the file
nano ~/akash-deployment/openclaw-deploy.yml

# Replace YOUR_VAST_IP with the actual IP from Step 5e
# Save and exit (Ctrl+X, Y, Enter)
```

**Step 6b: Update the deployment**
```bash
# Update deployment with new config
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

## Step 7: Deploy n8n (10 minutes)

**Repeat Step 4 commands but for n8n:**
```bash
cd ~/akash-deployment

# Create deployment
akash tx deployment create n8n-deploy.yml \
  --from deployer \
  --node https://rpc.akash.forbole.com:443 \
  --chain-id akashnet-2 \
  --fees 5000uakt \
  --yes

# Get DSEQ from output, then:
# List bids, create lease, get URL (same as Step 4)
```

---

## Step 8: Test Everything (10 minutes)

**Step 8a: Test OpenClaw**
```bash
# Replace with your Akash URL
curl https://YOUR_OPENCLAW_URL/health
```

Should return: `{"status":"ok"}`

**Step 8b: Test n8n**
```bash
# Replace with your Akash URL
curl https://YOUR_N8N_URL/healthz
```

Should return: `{"status":"ok"}`

**Step 8c: Test LLM through OpenClaw**
```bash
curl https://YOUR_OPENCLAW_URL/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_LITELLM_KEY" \
  -d '{
    "model": "llama3.1:70b",
    "messages": [{"role":"user","content":"Hello"}]
  }'
```

---

## Step 9: Set Up Domain (Optional but Recommended)

**If you have a domain:**

1. Create A records:
   - `openclaw.yourdomain.com` → Akash IP
   - `n8n.yourdomain.com` → Akash IP

2. Get Akash IP:
```bash
# From your deployment URL, extract the IP
# Or use: nslookup provider.akash.pro
```

3. Wait 5-10 minutes for DNS propagation

---

## Step 10: Create Supabase Tables (15 minutes)

**Step 10a: Go to Supabase dashboard**
1. https://app.supabase.io
2. Select your project
3. Go to SQL Editor

**Step 10b: Run this SQL:**

```sql
-- Credits table
CREATE TABLE user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  balance INTEGER DEFAULT 0,
  lifetime_purchased INTEGER DEFAULT 0,
  lifetime_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit transactions
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  type TEXT CHECK (type IN ('purchase', 'usage', 'refund', 'bonus')),
  amount INTEGER NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Credit usage tracking
CREATE TABLE credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  cost_usd DECIMAL(10,6),
  revenue_usd DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pricing tiers
CREATE TABLE credit_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL,
  credits INTEGER NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  bonus_credits INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE
);

-- Insert pricing
INSERT INTO credit_pricing (tier_name, credits, price_usd, bonus_credits) VALUES
  ('Starter', 100, 5.00, 0),
  ('Growth', 500, 20.00, 50),
  ('Pro', 2000, 75.00, 300),
  ('Enterprise', 10000, 300.00, 2000);

-- Function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_service TEXT,
  p_action TEXT,
  p_description TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_balance INTEGER;
BEGIN
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_id = p_user_id;
  
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  UPDATE user_credits
  SET balance = balance - p_amount,
      lifetime_used = lifetime_used + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  INSERT INTO credit_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'usage', -p_amount, p_description);
  
  INSERT INTO credit_usage (user_id, service, action, credits_used)
  VALUES (p_user_id, p_service, p_action, p_amount);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## Troubleshooting

### Problem: "Insufficient funds"
**Solution:** Buy more AKT on Coinbase or use Akash Console with credit card

### Problem: "No bids found"
**Solution:** Wait 2-3 minutes and try again. Or increase your price in the SDL file.

### Problem: "Cannot connect to Vast.ai instance"
**Solution:** Check firewall rules. Make sure port 11434 is open.

### Problem: "LLM not responding"
**Solution:** SSH into Vast instance and check: `docker logs ollama`

---

## Next Steps After Phase 1

1. [ ] Migrate existing n8n workflows
2. [ ] Update OpenClaw config to use new endpoints
3. [ ] Test credit system in your apps
4. [ ] Cancel Hyonix VPS
5. [ ] Cancel Moonshot/Anthropic subscriptions

---

**Total Time:** 2-3 hours
**Total Cost:** $10-15 AKT + $50-100 Vast.ai
**Monthly Savings:** $135-460

Ready to start? Begin with Step 1.
