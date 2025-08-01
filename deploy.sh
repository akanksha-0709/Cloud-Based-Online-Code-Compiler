#!/bin/bash

# Deploy script for Online Code Compiler to AWS
set -e

PROJECT_NAME="code-compiler"
AWS_REGION="us-east-1"
STACK_NAME="${PROJECT_NAME}-stack"

echo "🚀 Starting deployment of Online Code Compiler..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is logged in to AWS
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ You are not logged in to AWS. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI is configured"

# Step 1: Deploy CloudFormation stack
echo "📦 Deploying CloudFormation stack..."
aws cloudformation deploy \
    --template-file infrastructure/cloudformation.yaml \
    --stack-name $STACK_NAME \
    --parameter-overrides ProjectName=$PROJECT_NAME \
    --capabilities CAPABILITY_IAM \
    --region $AWS_REGION

echo "✅ CloudFormation stack deployed"

# Step 2: Get stack outputs
LAMBDA_FUNCTION_NAME=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`LambdaFunctionName`].OutputValue' \
    --output text)

API_ENDPOINT=$(aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' \
    --output text)

echo "📝 Lambda Function: $LAMBDA_FUNCTION_NAME"
echo "📝 API Endpoint: $API_ENDPOINT"

# Step 3: Build and deploy Lambda function
echo "🔨 Building Lambda function..."
cd aws-lambda
npm install --production

# Create deployment package
zip -r deployment.zip . -x "*.git*" "node_modules/.cache/*"

echo "📤 Uploading Lambda function..."
aws lambda update-function-code \
    --function-name $LAMBDA_FUNCTION_NAME \
    --zip-file fileb://deployment.zip \
    --region $AWS_REGION

echo "✅ Lambda function deployed"

# Step 4: Build Docker images and push to ECR (optional)
echo "🐳 Building Docker images..."
cd ../docker

# Create ECR repositories if they don't exist
for lang in python cpp java nodejs; do
    REPO_NAME="${PROJECT_NAME}-${lang}"
    
    # Check if repository exists
    if ! aws ecr describe-repositories --repository-names $REPO_NAME --region $AWS_REGION &> /dev/null; then
        echo "Creating ECR repository: $REPO_NAME"
        aws ecr create-repository --repository-name $REPO_NAME --region $AWS_REGION
    fi
    
    # Get ECR login token
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com
    
    # Build and push image
    ECR_URI=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.$AWS_REGION.amazonaws.com/$REPO_NAME:latest
    
    docker build -f Dockerfile.$lang -t $REPO_NAME:latest .
    docker tag $REPO_NAME:latest $ECR_URI
    docker push $ECR_URI
    
    echo "✅ Pushed $lang image to ECR"
done

cd ..

# Step 5: Update frontend configuration
echo "⚙️  Updating frontend configuration..."
cat > src/config/aws.ts << EOF
export const AWS_CONFIG = {
  API_ENDPOINT: '$API_ENDPOINT',
  REGION: '$AWS_REGION'
};
EOF

echo "✅ Frontend configuration updated"

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "   • Lambda Function: $LAMBDA_FUNCTION_NAME"
echo "   • API Endpoint: $API_ENDPOINT"
echo "   • Region: $AWS_REGION"
echo ""
echo "🔗 Next steps:"
echo "   1. Update your frontend to use the new API endpoint"
echo "   2. Test the deployment with some sample code"
echo "   3. Monitor CloudWatch logs for any issues"
echo ""
echo "📊 Monitoring:"
echo "   • CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=$AWS_REGION#logsV2:log-groups"
echo "   • Lambda Console: https://console.aws.amazon.com/lambda/home?region=$AWS_REGION"
echo "   • ECS Console: https://console.aws.amazon.com/ecs/v2/clusters"
