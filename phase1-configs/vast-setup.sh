#!/bin/bash
# Vast.ai LLM Setup Script

set -e

echo "=== Vast.ai LLM Setup ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Vast CLI is installed
if ! command -v vastai &> /dev/null; then
    echo -e "${YELLOW}Installing Vast CLI...${NC}"
    pip install vastai
fi

# Check if API key is set
if ! vastai show instances &> /dev/null; then
    echo -e "${RED}Error: Vast API key not set${NC}"
    echo "Get your API key from: https://vast.ai/account"
    read -p "Enter Vast API key: " VAST_KEY
    vastai set api-key $VAST_KEY
fi

echo -e "${GREEN}Authenticated with Vast.ai${NC}"
echo ""

# Search for cheap RTX 4090
echo -e "${GREEN}=== Searching for GPUs ===${NC}"
echo "Looking for RTX 4090 under $0.50/hour..."
echo ""

vastai search offers 'gpu_ram>=24 compute_cap>=800' \
  --order 'dph' \
  --limit 5

echo ""
read -p "Enter instance ID to rent: " INSTANCE_ID
read -p "Enter max price per hour you'll pay (e.g., 0.45): " MAX_PRICE

echo ""
echo -e "${GREEN}=== Creating Instance ===${NC}"
echo "This will start billing immediately."
echo ""

# Create instance
vastai create instance $INSTANCE_ID \
  --image ollama/ollama:latest \
  --disk 100 \
  --env '-p 11434:11434' \
  --onstart-cmd 'ollama pull llama3.1:70b && ollama serve' \
  --price $MAX_PRICE \
  --direct

echo ""
echo -e "${YELLOW}Waiting 60 seconds for instance to start...${NC}"
sleep 60

# Get instance info
echo ""
echo -e "${GREEN}=== Instance Details ===${NC}"
vastai show instances

echo ""
echo -e "${GREEN}=== Getting IP Address ===${NC}"
INSTANCE_IP=$(vastai show instances -q | head -1 | awk '{print $2}')
echo "Instance IP: $INSTANCE_IP"

# Test the LLM
echo ""
echo -e "${GREEN}=== Testing LLM ===${NC}"
echo "Testing connection to Ollama..."

if curl -s "http://$INSTANCE_IP:11434/api/tags" | grep -q "llama"; then
    echo -e "${GREEN}✓ LLM is running!${NC}"
else
    echo -e "${YELLOW}⚠ LLM may still be loading. Wait 2-3 minutes and test again.${NC}"
fi

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Your Vast.ai instance:"
echo "  IP: $INSTANCE_IP"
echo "  Port: 11434"
echo "  Model: llama3.1:70b"
echo ""
echo "Update your configs with this IP:"
echo "  VAST_IP=$INSTANCE_IP"
echo ""
echo "To stop the instance (stop billing):"
echo "  vastai destroy instance $(vastai show instances -q | head -1 | awk '{print $1}')"
echo ""
