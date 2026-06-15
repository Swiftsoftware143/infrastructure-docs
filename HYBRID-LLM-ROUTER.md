# Hybrid LLM Router System
## Smart Routing Between Your Custom LLM + Claude/Moonshot

---

## Architecture

```
┌─────────────────────────────────────────┐
│         Customer Request                │
│  "Build me a lead capture workflow"     │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│      API Gateway + Credit Check         │
│  • Verify customer has credits          │
│  • Deduct credits (5-10 per query)      │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         Intent Classifier               │
│  (Your LLM - fast & cheap)              │
│                                         │
│  • Automation task? → Your LLM          │
│  • Complex code? → Claude               │
│  • Real-time data? → Claude + Web       │
│  • General knowledge? → Claude          │
└─────────────┬───────────────────────────┘
              │
    ┌─────────┼─────────┐
    ▼         ▼         ▼
┌────────┐ ┌────────┐ ┌────────┐
│ Your   │ │ Claude │ │ Web    │
│ Custom │ │ API    │ │ Search │
│ LLM    │ │        │ │        │
└───┬────┘ └───┬────┘ └───┬────┘
    │          │          │
    └──────────┼──────────┘
               ▼
┌─────────────────────────────────────────┐
│      Response Formatter                 │
│  • Add citations                        │
│  • Format for customer's tools          │
│  • Log for analytics                    │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│         Customer Gets Answer            │
└─────────────────────────────────────────┘
```

---

## Routing Logic

### Intent Categories

| Intent | Keywords | Route To | Credits |
|--------|----------|----------|---------|
| **Automation** | "workflow", "n8n", "automation", "trigger", "webhook" | Your Custom LLM | 5 |
| **Your Tools** | "FunnelSwift", "WorkflowSwift", "ZaarHub", "Global Control" | Your Custom LLM | 5 |
| **Debug** | "fix", "debug", "error", "not working" | Your Custom LLM | 5 |
| **Code Gen** | "Python", "JavaScript", "script", "function" | Claude | 10 |
| **Architecture** | "design", "structure", "best practice" | Claude | 10 |
| **Real-time** | "today", "current", "latest", "news" | Claude + Web | 15 |
| **General** | (everything else) | Claude | 10 |

### Routing Code (Node.js/TypeScript)

```typescript
// router.ts
interface RoutingDecision {
  provider: 'custom-llm' | 'claude' | 'claude-web';
  model: string;
  credits: number;
  reason: string;
}

async function routeRequest(
  query: string,
  customerId: string,
  customerTier: 'basic' | 'pro' | 'enterprise'
): Promise<RoutingDecision> {
  
  // Step 1: Check credits
  const hasCredits = await checkCredits(customerId, 5);
  if (!hasCredits) {
    throw new Error('Insufficient credits');
  }
  
  // Step 2: Classify intent (using lightweight model)
  const intent = await classifyIntent(query);
  
  // Step 3: Route based on intent + tier
  switch (intent) {
    case 'automation':
    case 'your-tools':
    case 'debug':
      return {
        provider: 'custom-llm',
        model: 'llama3.1-8b-automation',
        credits: 5,
        reason: 'Customer automation query - using specialist model'
      };
      
    case 'code-gen':
    case 'architecture':
      if (customerTier === 'basic') {
        return {
          provider: 'custom-llm',
          model: 'llama3.1-8b-automation',
          credits: 5,
          reason: 'Basic tier - using custom LLM for code'
        };
      }
      return {
        provider: 'claude',
        model: 'claude-3-sonnet-20240229',
        credits: 10,
        reason: 'Complex coding - using Claude'
      };
      
    case 'real-time':
      if (customerTier !== 'enterprise') {
        return {
          provider: 'claude',
          model: 'claude-3-sonnet-20240229',
          credits: 10,
          reason: 'Real-time query - Claude without web (tier limited)'
        };
      }
      return {
        provider: 'claude-web',
        model: 'claude-3-sonnet-20240229',
        credits: 15,
        reason: 'Real-time query - Claude with web search'
      };
      
    default:
      return {
        provider: 'claude',
        model: 'claude-3-sonnet-20240229',
        credits: 10,
        reason: 'General query - using Claude'
      };
  }
}

async function classifyIntent(query: string): Promise<string> {
  // Use simple keyword matching + lightweight LLM
  const lowerQuery = query.toLowerCase();
  
  // Fast keyword matching
  if (lowerQuery.includes('workflow') || 
      lowerQuery.includes('n8n') || 
      lowerQuery.includes('automation')) {
    return 'automation';
  }
  
  if (lowerQuery.includes('funnelswift') || 
      lowerQuery.includes('workflowswift') || 
      lowerQuery.includes('zaarhub')) {
    return 'your-tools';
  }
  
  if (lowerQuery.includes('fix') || 
      lowerQuery.includes('debug') || 
      lowerQuery.includes('error')) {
    return 'debug';
  }
  
  if (lowerQuery.includes('python') || 
      lowerQuery.includes('javascript') || 
      lowerQuery.includes('script')) {
    return 'code-gen';
  }
  
  if (lowerQuery.includes('today') || 
      lowerQuery.includes('current') || 
      lowerQuery.includes('latest')) {
    return 'real-time';
  }
  
  // Default to general
  return 'general';
}
```

---

## Customer Tiers

### Basic Tier ($29/month)
- **Models:** Your Custom LLM only
- **Credits:** 500/month
- **Cost per query:** 5 credits
- **Best for:** Small businesses, simple automations

### Pro Tier ($99/month)
- **Models:** Your Custom LLM + Claude
- **Credits:** 2,000/month
- **Cost per query:** 5-10 credits
- **Best for:** Growing businesses, need coding help

### Enterprise Tier ($299/month)
- **Models:** All + Custom Training
- **Credits:** 10,000/month
- **Cost per query:** 5-15 credits
- **Best for:** Agencies, complex needs

---

## Customer-Specific Training (Enterprise)

### Per-Customer Fine-Tuning

```typescript
// customer-training.ts

interface CustomerTrainingConfig {
  customerId: string;
  businessName: string;
  industry: string;
  workflows: string[];
  documents: string[];
}

async function trainCustomerModel(config: CustomerTrainingConfig) {
  // Step 1: Extract customer data
  const trainingData = await extractCustomerData(config);
  
  // Step 2: Format for training
  const formattedData = formatForTraining(trainingData);
  
  // Step 3: Fine-tune base model
  const modelId = await fineTuneModel({
    baseModel: 'llama3.1-8b',
    trainingData: formattedData,
    customerId: config.customerId
  });
  
  // Step 4: Deploy customer-specific endpoint
  await deployCustomerModel(modelId, config.customerId);
  
  return modelId;
}

// Cost: ~$50-100 per customer (one-time)
// Hosting: Included in Enterprise tier
```

### RAG (Retrieval Augmented Generation)

For customers who don't need full fine-tuning:

```typescript
// rag-system.ts

async function customerRAGQuery(
  query: string,
  customerId: string
) {
  // Step 1: Search customer's knowledge base
  const relevantDocs = await searchCustomerDocs(query, customerId);
  
  // Step 2: Build context
  const context = relevantDocs.map(doc => doc.content).join('\n\n');
  
  // Step 3: Query LLM with context
  const response = await queryCustomLLM({
    query,
    context,
    systemPrompt: `You are an automation expert for ${customerId}. Use the provided context to answer.`
  });
  
  return response;
}
```

---

## API Implementation

### Express.js Route

```typescript
// api/routes/llm.ts
import { Router } from 'express';
import { routeRequest } from '../router';
import { deductCredits } from '../credits';

const router = Router();

router.post('/query', async (req, res) => {
  try {
    const { query, customerId } = req.body;
    
    // Get customer info
    const customer = await getCustomer(customerId);
    
    // Route to appropriate model
    const decision = await routeRequest(query, customerId, customer.tier);
    
    // Deduct credits
    const hasCredits = await deductCredits(customerId, decision.credits);
    if (!hasCredits) {
      return res.status(402).json({
        error: 'Insufficient credits',
        upgradeUrl: '/billing/upgrade'
      });
    }
    
    // Execute query
    let response;
    switch (decision.provider) {
      case 'custom-llm':
        response = await queryCustomLLM(query, customerId);
        break;
      case 'claude':
        response = await queryClaude(query);
        break;
      case 'claude-web':
        response = await queryClaudeWithWeb(query);
        break;
    }
    
    // Log for analytics
    await logQuery({
      customerId,
      query,
      provider: decision.provider,
      credits: decision.credits,
      timestamp: new Date()
    });
    
    res.json({
      response,
      creditsUsed: decision.credits,
      creditsRemaining: customer.credits - decision.credits,
      provider: decision.provider
    });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

---

## Cost Analysis

### Your Costs

| Component | Monthly Cost |
|-----------|--------------|
| Your Custom LLM (hosting) | $150 |
| Claude API (Pro/Enterprise) | $100-300 |
| Web Search API | $50 |
| **Total** | **$300-500** |

### Revenue

| Tier | Price | Customers | Monthly Revenue |
|------|-------|-----------|-----------------|
| Basic | $29 | 50 | $1,450 |
| Pro | $99 | 30 | $2,970 |
| Enterprise | $299 | 10 | $2,990 |
| **Total** | | **90** | **$7,410** |

**Profit Margin:** 85-90%

---

## Files to Create

1. `router.ts` - Routing logic
2. `intent-classifier.ts` - Query classification
3. `credit-system.ts` - Credit management
4. `custom-llm-client.ts` - Your LLM integration
5. `claude-client.ts` - Claude API integration
6. `api/routes/llm.ts` - Express routes
7. `customer-training.ts` - Per-customer training
8. `rag-system.ts` - Document retrieval

Want me to build all these files?
