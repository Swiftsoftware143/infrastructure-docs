#!/bin/bash
# Phase 1 Deployment Script
# Run this after filling in all the {{VARIABLES}}

set -e

echo "=== Phase 1 Deployment Script ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Akash CLI is installed
if ! command -v akash &> /dev/null; then
    echo -e "${RED}Error: Akash CLI not found${NC}"
    echo "Install with: curl -sSfL https://raw.githubusercontent.com/akash-network/provider/main/install.sh | sh"
    exit 1
fi

# Check if wallet exists
if ! akash keys show deployer &> /dev/null; then
    echo -e "${RED}Error: No 'deployer' wallet found${NC}"
    echo "Create with: akash keys add deployer"
    exit 1
fi

WALLET_ADDRESS=$(akash keys show deployer -a)
echo -e "${GREEN}Using wallet:${NC} $WALLET_ADDRESS"

# Check balance
echo "Checking balance..."
BALANCE=$(akash query bank balances $WALLET_ADDRESS --node https://rpc.akash.forbole.com:443 -o json | jq -r '.balances[0].amount // "0"')
echo "Balance: $BALANCE uakt"

if [ "$BALANCE" -lt 1000000 ]; then
    echo -e "${YELLOW}Warning: Low balance. You may need more AKT.${NC}"
    echo "Get AKT from: https://app.osmosis.zone or https://coinbase.com"
fi

# Deploy OpenClaw
echo ""
echo -e "${GREEN}=== Deploying OpenClaw ===${NC}"
akash tx deployment create openclaw-deploy.yml \
  --from deployer \
  --node https://rpc.akash.forbole.com:443 \
  --chain-id akashnet-2 \
  --fees 5000uakt \
  --yes

echo ""
echo -e "${YELLOW}Waiting 30 seconds for bids...${NC}"
sleep 30

# Get DSEQ
DSEQ=$(akash query deployment list --owner $WALLET_ADDRESS --node https://rpc.akash.forbole.com:443 -o json | jq -r '.deployments[0].deployment.deployment_id.dseq')
echo "DSEQ: $DSEQ"

# List bids
echo ""
echo -e "${GREEN}=== Available Bids ===${NC}"
akash query market bid list --owner $WALLET_ADDRESS --dseq $DSEQ --node https://rpc.akash.forbole.com:443

# Prompt for provider
read -p "Enter provider address to lease: " PROVIDER

# Create lease
echo ""
echo -e "${GREEN}=== Creating Lease ===${NC}"
akash tx market lease create \
  --owner $WALLET_ADDRESS \
  --dseq $DSEQ \
  --gseq 1 \
  --oseq 1 \
  --provider $PROVIDER \
  --from deployer \
  --node https://rpc.akash.forbole.com:443 \
  --chain-id akashnet-2 \
  --fees 5000uakt \
  --yes

# Get lease status
echo ""
echo -e "${GREEN}=== Lease Status ===${NC}"
sleep 10
akash provider lease-status \
  --owner $WALLET_ADDRESS \
  --dseq $DSEQ \
  --gseq 1 \
  --oseq 1 \
  --provider $PROVIDER \
  --node https://rpc.akash.forbole.com:443

echo ""
echo -e "${GREEN}=== OpenClaw Deployed! ===${NC}"
echo "Save the URL from above. You'll need it for the next steps."
echo ""

# Deploy n8n
echo -e "${GREEN}=== Deploying n8n ===${NC}"
akash tx deployment create n8n-deploy.yml \
  --from deployer \
  --node https://rpc.akash.forbole.com:443 \
  --chain-id akashnet-2 \
  --fees 5000uakt \
  --yes

echo ""
echo -e "${YELLOW}Waiting 30 seconds for bids...${NC}"
sleep 30

# Get n8n DSEQ
N8N_DSEQ=$(akash query deployment list --owner $WALLET_ADDRESS --node https://rpc.akash.forbole.com:443 -o json | jq -r '.deployments[0].deployment.deployment_id.dseq')
echo "n8n DSEQ: $N8N_DSEQ"

# List bids
echo ""
echo -e "${GREEN}=== n8n Bids ===${NC}"
akash query market bid list --owner $WALLET_ADDRESS --dseq $N8N_DSEQ --node https://rpc.akash.forbole.com:443

# Prompt for provider
read -p "Enter provider address for n8n lease: " N8N_PROVIDER

# Create lease
echo ""
echo -e "${GREEN}=== Creating n8n Lease ===${NC}"
akash tx market lease create \
  --owner $WALLET_ADDRESS \
  --dseq $N8N_DSEQ \
  --gseq 1 \
  --oseq 1 \
  --provider $N8N_PROVIDER \
  --from deployer \
  --node https://rpc.akash.forbole.com:443 \
  --chain-id akashnet-2 \
  --fees 5000uakt \
  --yes

# Get lease status
echo ""
echo -e "${GREEN}=== n8n Lease Status ===${NC}"
sleep 10
akash provider lease-status \
  --owner $WALLET_ADDRESS \
  --dseq $N8N_DSEQ \
  --gseq 1 \
  --oseq 1 \
  --provider $N8N_PROVIDER \
  --node https://rpc.akash.forbole.com:443

echo ""
echo -e "${GREEN}=== Deployment Complete! ===${NC}"
echo ""
echo "Next steps:"
echo "1. Save the URLs from above"
echo "2. Set up Vast.ai LLM instance"
echo "3. Update configs with Vast IP"
echo "4. Test everything"
echo ""
