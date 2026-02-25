#!/bin/bash

set -e

REGION="us-east-1"
PROJECT_NAME="DeadlineSync"

echo "======================================"
echo "AWS Cognito Authentication Setup"
echo "======================================"
echo ""

# Check AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI not found. Please install it first:"
    echo "   Mac: brew install awscli"
    echo "   Windows: https://aws.amazon.com/cli/"
    echo "   Linux: sudo apt install awscli"
    exit 1
fi

# Check AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run:"
    echo "   aws configure"
    exit 1
fi

echo "[1/2] Creating Cognito User Pool..."

USER_POOL_ID=$(aws cognito-idp create-user-pool \
    --pool-name "${PROJECT_NAME}-UserPool" \
    --policies '{
        "PasswordPolicy": {
            "MinimumLength": 8,
            "RequireUppercase": true,
            "RequireLowercase": true,
            "RequireNumbers": true,
            "RequireSymbols": false
        }
    }' \
    --auto-verified-attributes email \
    --username-attributes email \
    --schema '[
        {
            "Name": "email",
            "AttributeDataType": "String",
            "Required": true,
            "Mutable": false
        },
        {
            "Name": "name",
            "AttributeDataType": "String",
            "Required": true,
            "Mutable": true
        }
    ]' \
    --region $REGION \
    --query 'UserPool.Id' \
    --output text)

echo "✓ User Pool created: $USER_POOL_ID"

echo "[2/2] Creating User Pool Client..."

USER_POOL_CLIENT_ID=$(aws cognito-idp create-user-pool-client \
    --user-pool-id $USER_POOL_ID \
    --client-name "${PROJECT_NAME}-WebClient" \
    --no-generate-secret \
    --explicit-auth-flows \
        ALLOW_USER_PASSWORD_AUTH \
        ALLOW_REFRESH_TOKEN_AUTH \
        ALLOW_USER_SRP_AUTH \
    --region $REGION \
    --query 'UserPoolClient.ClientId' \
    --output text)

echo "✓ User Pool Client created: $USER_POOL_CLIENT_ID"

echo ""
echo "======================================"
echo "✅ Cognito Setup Complete!"
echo "======================================"
echo ""
echo "📝 Copy these values to .env.local:"
echo "-----------------------------------"
echo "NEXT_PUBLIC_AWS_REGION=$REGION"
echo "NEXT_PUBLIC_USER_POOL_ID=$USER_POOL_ID"
echo "NEXT_PUBLIC_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID"
echo ""
echo "Next steps:"
echo "1. Create .env.local with these values"
echo "2. Add same values to Vercel dashboard"
echo "3. Restart dev server: npm run dev"
echo ""
