# Akash Infrastructure Deployment
## Complete Decentralized Backend for OpenClaw + n8n + LLM

---

## Architecture

```
┌─────────────────────────────────────────┐
│         FRONTEND (Netlify - FREE)       │
│  FunnelSwift, WorkflowSwift, ADASwift,  │
│  MissedCallResponder, Multi-Directory   │
└─────────────┬───────────────────────────┘
              │ API Calls
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
│      DATABASE (Supabase)                │
│  • Free tier (500MB, 2GB bandwidth)     │
│  • Then $25/month Pro                   │
│  • Scales automatically                 │
└─────────────────────────────────────────┘
```

---

## Cost Comparison

| Current Setup | Monthly Cost | New Setup | Monthly Cost |
|---------------|--------------|-----------|--------------|
| Hyonix VPS | $50-100 | Akash (OpenClaw + n8n) | $10-15 |
| Moonshot API | $100-300 | Vast.ai LLM | $50-100 |
| Anthropic API | $50-200 | — | — |
| **Total** | **$200-600** | **Total** | **$60-115** |

**Monthly Savings: $140-485**

---

## Phase 1: Deploy OpenClaw on Akash

### Step 1: Install Akash CLI
```bash
# Linux/Mac
curl -sSfL https://raw.githubusercontent.com/akash-network/provider/main/install.sh | sh

# Verify
akash version
```

### Step 2: Create Wallet
```bash
# Create new wallet
akash keys add deployer

# Save mnemonic securely!
# Get address
akash keys show deployer -a

# Fund with AKT (buy on Coinbase, transfer)
# Or use credit card via Akash Console
```

### Step 3: OpenClaw Deployment SDL

Create `openclaw-deploy.yml`:

```yaml
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
      - DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres
      - REDIS_URL=redis://default:[PASSWORD]@[HOST]:6379
      - LLM_PROVIDER=ollama
      - LLM_URL=http://llm-proxy:8080
      - N8N_WEBHOOK_URL=https://n8n.[YOUR_DOMAIN]/webhook
    params:
      storage:
        data:
          mount: /data
          readOnly: false
    depends_on:
      - llm-proxy

  llm-proxy:
    image: litellm/litellm:latest
    expose:
      - port: 8080
        as: 8080
        to:
          - service: openclaw
    env:
      - LITELLM_MASTER_KEY=[YOUR_API_KEY]
      - MODEL_NAME=llama3.1:70b
      - OLLAMA_API_BASE=http://[VAST_AI_IP]:11434

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
          - "akash18qa2a2ltfyvkyj0ggj3hkvuj6twzyumuaru9s4"
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
```

### Step 4: Deploy
```bash
# Create deployment
akash tx deployment create openclaw-deploy.yml --from deployer --node https://rpc.akash.forbole.com:443 --chain-id akashnet-2 --fees 5000uakt

# Get bids
akash query market bid list --owner [YOUR_ADDRESS] --node https://rpc.akash.forbole.com:443

# Choose provider and create lease
akash tx market lease create --owner [YOUR_ADDRESS] --dseq [DSEQ] --gseq 1 --oseq 1 --provider [PROVIDER] --from deployer --node https://rpc.akash.forbole.com:443 --chain-id akashnet-2 --fees 5000uakt

# Get manifest
akash provider lease-status --owner [YOUR_ADDRESS] --dseq [DSEQ] --gseq 1 --oseq 1 --provider [PROVIDER] --node https://rpc.akash.forbole.com:443
```

---

## Phase 2: Deploy n8n on Akash

### n8n Deployment SDL

Create `n8n-deploy.yml`:

```yaml
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
      - N8N_BASIC_AUTH_PASSWORD=[STRONG_PASSWORD]
      - N8N_HOST=n8n.[YOUR_DOMAIN]
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - NODE_ENV=production
      - WEBHOOK_URL=https://n8n.[YOUR_DOMAIN]/
      - GENERIC_TIMEZONE=America/New_York
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=[PROJECT].supabase.co
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=postgres
      - DB_POSTGRESDB_USER=postgres
      - DB_POSTGRESDB_PASSWORD=[PASSWORD]
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
```

---

## Phase 3: Deploy Rust CRM on Akash

### Rust CRM Deployment SDL

Create `rust-crm-deploy.yml`:

```yaml
---
version: "2.0"

services:
  rust-crm:
    image: your-registry/rust-crm:latest
    expose:
      - port: 8080
        as: 80
        to:
          - global: true
    env:
      - DATABASE_URL=postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres
      - REDIS_URL=redis://default:[PASSWORD]@[HOST]:6379
      - LLM_URL=http://llm-proxy:8080
      - LLM_API_KEY=[LITELLM_KEY]
      - RUST_LOG=info
      - PORT=8080
      - JWT_SECRET=[STRONG_SECRET]
      - ENCRYPTION_KEY=[32_CHAR_KEY]
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
          - service: rust-crm
    env:
      - LITELLM_MASTER_KEY=[YOUR_API_KEY]
      - MODEL_NAME=llama3.1:70b
      - OLLAMA_API_BASE=http://[VAST_AI_IP]:11434

profiles:
  compute:
    rust-crm:
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
        rust-crm:
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
```

### Build Rust CRM Docker Image

```dockerfile
# Dockerfile
FROM rust:1.75 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y ca-certificates
COPY --from=builder /app/target/release/rust-crm /usr/local/bin/rust-crm
EXPOSE 8080
CMD ["rust-crm"]
```

```bash
# Build and push
docker build -t your-registry/rust-crm:latest .
docker push your-registry/rust-crm:latest
```

### CRM Features on Akash

| Feature | Implementation | Cost |
|---------|----------------|------|
| Contact Management | Rust + Supabase | Included |
| Workflow Automation | Rust async + Tokio | Included |
| AI Integration | LiteLLM proxy | Included |
| Real-time Updates | WebSocket | Included |
| File Storage | IPFS or S3 | $5-10/mo |
| Email Sending | SMTP/Resend | Pay per use |

---

## Phase 4: Set Up LLM on Vast.ai

### Step 1: Create Vast.ai Account
```bash
# Sign up at vast.ai
# Add payment method
# Get API key
```

### Step 2: Deploy Ollama Instance
```bash
# Install Vast CLI
pip install vastai

# Search for cheap RTX 4090
vastai search offers 'gpu_ram>=24 compute_cap>=800'

# Create instance with Ollama
vastai create instance [INSTANCE_ID] \
  --image ollama/ollama:latest \
  --disk 100 \
  --env '-p 11434:11434' \
  --onstart-cmd 'ollama pull llama3.1:70b && ollama serve'

# Get instance IP
vastai show instances
```

### Step 3: Configure LiteLLM Proxy
```yaml
# litellm-config.yaml
model_list:
  - model_name: llama3.1-70b
    litellm_params:
      model: ollama/llama3.1:70b
      api_base: http://[VAST_AI_IP]:11434
      timeout: 120

  - model_name: llama3.1-8b
    litellm_params:
      model: ollama/llama3.1:8b
      api_base: http://[VAST_AI_IP]:11434
      timeout: 60

  - model_name: qwen2.5-72b
    litellm_params:
      model: ollama/qwen2.5:72b
      api_base: http://[VAST_AI_IP]:11434
      timeout: 120

litellm_settings:
  drop_params: true
  set_verbose: false
  num_retries: 3
  request_timeout: 120
```

---

### Rust CRM + Automation Features

The Rust CRM includes:

1. **Contact Management**
   - Full CRUD operations
   - Advanced search/filtering
   - Tagging system
   - Custom fields

2. **Workflow Automation Engine**
   - Trigger-based automation
   - Condition evaluation
   - Action execution
   - Scheduled workflows

3. **AI Integration**
   - LLM-powered insights
   - Sentiment analysis
   - Auto-categorization
   - Smart recommendations

4. **Credit System Integration**
   - Deduct credits per action
   - Track usage per user
   - Billing integration
   - Margin tracking

---

## Phase 5: Connect Everything

### Update OpenClaw Config
```json
{
  "llm": {
    "provider": "litellm",
    "base_url": "https://llm-proxy.[AKASH_URL]",
    "api_key": "[YOUR_LITELLM_KEY]",
    "model": "llama3.1-70b",
    "fallback_model": "llama3.1-8b"
  },
  "n8n": {
    "webhook_url": "https://n8n.[AKASH_URL]/webhook",
    "api_key": "[N8N_API_KEY]"
  },
  "database": {
    "url": "postgresql://postgres:[PASSWORD]@[PROJECT].supabase.co:5432/postgres"
  }
}
```

### Update n8n Credentials
```json
{
  "ollama": {
    "baseUrl": "https://llm-proxy.[AKASH_URL]",
    "apiKey": "[LITELLM_KEY]"
  }
}
```

---

## Credit System Implementation

### Database Schema (Supabase)

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
  service TEXT NOT NULL, -- 'openclaw', 'n8n', 'llm'
  action TEXT NOT NULL, -- 'inference', 'workflow', 'agent'
  credits_used INTEGER NOT NULL,
  cost_usd DECIMAL(10,6), -- Your actual cost
  revenue_usd DECIMAL(10,2), -- What you charged
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
```

### Credit Deduction Function
```sql
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
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM user_credits
  WHERE user_id = p_user_id;
  
  -- Check if enough credits
  IF v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Deduct credits
  UPDATE user_credits
  SET balance = balance - p_amount,
      lifetime_used = lifetime_used + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Record transaction
  INSERT INTO credit_transactions (user_id, type, amount, description)
  VALUES (p_user_id, 'usage', -p_amount, p_description);
  
  -- Record usage
  INSERT INTO credit_usage (user_id, service, action, credits_used)
  VALUES (p_user_id, p_service, p_action, p_amount);
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

---

## Monitoring & Alerts

### Health Check Endpoint
```javascript
// health-check.js
const axios = require('axios');

async function healthCheck() {
  const checks = {
    openclaw: await checkEndpoint('https://openclaw.[AKASH_URL]/health'),
    n8n: await checkEndpoint('https://n8n.[AKASH_URL]/healthz'),
    llm: await checkLLM(),
    database: await checkDatabase()
  };
  
  const allHealthy = Object.values(checks).every(c => c.status === 'ok');
  
  if (!allHealthy) {
    await sendAlert(checks);
  }
  
  return checks;
}

async function checkLLM() {
  try {
    const response = await axios.post('https://llm-proxy.[AKASH_URL]/chat/completions', {
      model: 'llama3.1-8b',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 10
    }, {
      headers: { 'Authorization': 'Bearer [KEY]' },
      timeout: 30000
    });
    return { status: 'ok', latency: response.duration };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
}
```

---

## Growth Roadmap

### Phase 1: Launch ($0-10K MRR)
- **Users:** 0-10,000
- **Cost:** $100-150/month
- **Setup:** Single Akash deployment, one Vast.ai GPU
- **Margin:** 90%+

### Phase 2: Growth ($10K-50K MRR)
- **Users:** 10,000-50,000
- **Cost:** $300-500/month
- **Add:** Load balancer, read replicas, second GPU
- **Margin:** 80%+

### Phase 3: Scale ($50K-200K MRR)
- **Users:** 50,000-200,000
- **Cost:** $1,000-2,000/month
- **Add:** Kubernetes cluster, GPU cluster (4-8 GPUs), CDN
- **Margin:** 70%+

### Phase 4: Enterprise ($200K+ MRR)
- **Users:** 200,000+
- **Cost:** $5,000-10,000/month
- **Setup:** Multi-region, dedicated infrastructure
- **Margin:** 60%+

---

## Next Steps

1. [ ] Create Akash wallet and fund with AKT
2. [ ] Deploy OpenClaw to Akash
3. [ ] Deploy n8n to Akash
4. [ ] Deploy Rust CRM to Akash
5. [ ] Set up Vast.ai account
6. [ ] Deploy Ollama + Llama on Vast.ai
7. [ ] Create Supabase tables for credit system
8. [ ] Update OpenClaw config to use new endpoints
9. [ ] Connect Rust CRM to LLM proxy
10. [ ] Test end-to-end
11. [ ] Migrate from Hyonix/Moonshot/Anthropic
12. [ ] Launch credit system in your SaaS apps

---

## Complete Infrastructure Summary

| Component | Platform | Monthly Cost | Purpose |
|-----------|----------|--------------|---------|
| Frontend | Netlify | FREE | All SaaS UIs |
| OpenClaw | Akash | $3-5 | AI orchestration |
| n8n | Akash | $3-5 | Workflow automation |
| Rust CRM | Akash | $3-5 | Contact management + automation |
| LLM | Vast.ai | $50-100 | Self-hosted AI inference |
| Database | Supabase | FREE-$25 | Persistent storage |
| **Total** | | **$65-140** | **Complete backend** |

**vs Current:** $200-600/month
**Savings:** $135-460/month + 100% credit revenue

---

*Last Updated: June 15, 2026*
*Status: Ready for deployment*

---

*Ready to deploy? Start with Step 1: Create Akash wallet.*
