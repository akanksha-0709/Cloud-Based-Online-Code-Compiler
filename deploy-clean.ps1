param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectName,
    
    [Parameter(Mandatory=$true)]
    [string]$AwsRegion
)

Write-Host "🚀 Starting AWS Lambda Deployment" -ForegroundColor Cyan
Write-Host "Project: $ProjectName" -ForegroundColor Yellow
Write-Host "Region: $AwsRegion" -ForegroundColor Yellow
Write-Host ""

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI is available" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first." -ForegroundColor Red
    exit 1
}

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Check if user is logged in to AWS
try {
    aws sts get-caller-identity | Out-Null
    $AccountId = (aws sts get-caller-identity --query Account --output text)
    Write-Host "✅ AWS CLI is configured - Account: $AccountId" -ForegroundColor Green
} catch {
    Write-Host "❌ You are not logged in to AWS. Please run 'aws configure' first." -ForegroundColor Red
    exit 1
}

$StackName = "$ProjectName-stack"

# Step 1: Deploy CloudFormation stack
Write-Host ""
Write-Host "📦 Deploying CloudFormation stack..." -ForegroundColor Yellow
aws cloudformation deploy `
    --template-file infrastructure/cloudformation.yaml `
    --stack-name $StackName `
    --capabilities CAPABILITY_IAM `
    --region $AwsRegion `
    --parameter-overrides ProjectName=$ProjectName

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CloudFormation deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ CloudFormation stack deployed" -ForegroundColor Green

# Step 2: Get ECR login and repositories
Write-Host ""
Write-Host "🔐 Logging into ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ECR login failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Logged into ECR" -ForegroundColor Green

# Step 3: Build and push Docker images
$Languages = @("python", "java", "cpp", "nodejs")

foreach ($Language in $Languages) {
    Write-Host ""
    Write-Host "🐳 Building $Language container..." -ForegroundColor Yellow
    
    $ImageName = "$ProjectName-$Language"
    $EcrUri = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$ImageName"
    
    # Build the Docker image
    docker build -f "docker/Dockerfile.$Language" -t "$ImageName:latest" docker/
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to build $Language image" -ForegroundColor Red
        exit 1
    }
    
    # Tag for ECR
    docker tag "$ImageName:latest" "$EcrUri:latest"
    
    # Push to ECR
    Write-Host "📤 Pushing $Language image to ECR..." -ForegroundColor Yellow
    docker push "$EcrUri:latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to push $Language image" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ $Language image pushed successfully" -ForegroundColor Green
}

# Step 4: Update Lambda functions with new images
Write-Host ""
Write-Host "⚡ Updating Lambda functions..." -ForegroundColor Yellow

foreach ($Language in $Languages) {
    $FunctionName = "$ProjectName-$Language"
    $EcrUri = "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com/$ProjectName-$Language:latest"
    
    Write-Host "🔄 Updating $FunctionName..." -ForegroundColor Yellow
    
    aws lambda update-function-code `
        --function-name $FunctionName `
        --image-uri $EcrUri `
        --region $AwsRegion
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to update $FunctionName" -ForegroundColor Red
        exit 1
    }
    
    # Wait for function to be ready
    aws lambda wait function-updated --function-name $FunctionName --region $AwsRegion
    
    Write-Host "✅ $FunctionName updated" -ForegroundColor Green
}

# Step 5: Get API Gateway endpoint
Write-Host ""
Write-Host "🌐 Getting API Gateway endpoint..." -ForegroundColor Yellow

$ApiEndpoint = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $AwsRegion `
    --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" `
    --output text

if ([string]::IsNullOrEmpty($ApiEndpoint)) {
    Write-Host "❌ Could not retrieve API endpoint" -ForegroundColor Red
    exit 1
}

Write-Host "✅ API Endpoint: $ApiEndpoint" -ForegroundColor Green

# Step 6: Update frontend configuration
Write-Host ""
Write-Host "🔧 Updating frontend configuration..." -ForegroundColor Yellow

$ConfigDir = "src/config"
if (!(Test-Path $ConfigDir)) {
    New-Item -Path $ConfigDir -ItemType Directory -Force
}

$ConfigContent = @'
// AWS Configuration - Updated by deployment script
export const AWS_CONFIG = {
  API_ENDPOINT: '$ApiEndpoint',
  REGION: '$AwsRegion',
  
  // For development, you can override these
  IS_DEVELOPMENT: import.meta.env.DEV || false,
  LOCAL_API_URL: 'http://localhost:3001/api'
};

// Environment detection
export const getApiEndpoint = () => {
  if (AWS_CONFIG.IS_DEVELOPMENT) {
    return AWS_CONFIG.LOCAL_API_URL;
  }
  return AWS_CONFIG.API_ENDPOINT;
};
'@

$ConfigContent = $ConfigContent.Replace('$ApiEndpoint', $ApiEndpoint).Replace('$AwsRegion', $AwsRegion)
$ConfigContent | Out-File -FilePath "$ConfigDir/aws.ts" -Encoding UTF8

Write-Host "✅ Frontend configuration updated" -ForegroundColor Green

# Step 7: Update API service
Write-Host ""
Write-Host "🔧 Updating API service..." -ForegroundColor Yellow

$ApiServiceContent = @'
import axios from 'axios';
import { CodeExecutionRequest, CodeExecutionResponse } from '../types';
import { getApiEndpoint } from '../config/aws';

const API_BASE_URL = getApiEndpoint();

// Language-specific endpoint mapping
const LANGUAGE_ENDPOINTS = {
  python: '/execute/python',
  java: '/execute/java',
  cpp: '/execute/cpp',
  c: '/execute/cpp',  // C uses the same endpoint as C++
  javascript: '/execute/javascript'
};

export const executeCode = async (request: CodeExecutionRequest): Promise<CodeExecutionResponse> => {
  try {
    const endpoint = LANGUAGE_ENDPOINTS[request.language as keyof typeof LANGUAGE_ENDPOINTS];
    
    if (!endpoint) {
      throw new Error(`Unsupported language: ${request.language}`);
    }
    
    const response = await axios.post(`${API_BASE_URL}${endpoint}`, request, {
      timeout: 35000, // 35 seconds timeout for Lambda execution
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        return error.response.data;
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - code execution took too long');
      }
    }
    if (error instanceof Error) {
      throw new Error(`Network error: ${error.message}`);
    }
    throw new Error('Unknown network error occurred');
  }
};
'@

$ApiServiceContent | Out-File -FilePath "src/services/api.ts" -Encoding UTF8

Write-Host "✅ API service updated" -ForegroundColor Green

# Step 8: Test API endpoints
Write-Host ""
Write-Host "🧪 Testing API endpoints..." -ForegroundColor Yellow

$TestPayload = @{
    code = "print('Hello from AWS Lambda!')"
    input = ""
} | ConvertTo-Json

try {
    $TestResponse = Invoke-RestMethod -Uri "$ApiEndpoint/execute/python" -Method POST -Body $TestPayload -ContentType "application/json" -TimeoutSec 30
    
    if ($TestResponse.success) {
        Write-Host "✅ API test successful!" -ForegroundColor Green
        Write-Host "   Output: $($TestResponse.output)" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️ API test returned error: $($TestResponse.error)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ API test failed (this is normal if functions are still warming up): $($_.Exception.Message)" -ForegroundColor Yellow
}

# Final summary
Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Deployment Summary:" -ForegroundColor Cyan
Write-Host "   🌐 API Endpoint: $ApiEndpoint" -ForegroundColor White
Write-Host "   📍 Region: $AwsRegion" -ForegroundColor White
Write-Host "   📦 Stack Name: $StackName" -ForegroundColor White
Write-Host "   🔧 Lambda Functions:" -ForegroundColor White

foreach ($Language in $Languages) {
    $FunctionName = "$ProjectName-$Language"
    Write-Host "      • $FunctionName" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start your frontend: npm run dev" -ForegroundColor White
Write-Host "   2. Test all languages in the browser" -ForegroundColor White
Write-Host "   3. Monitor with: aws logs tail /aws/lambda/$ProjectName-python --follow" -ForegroundColor White

Write-Host ""
Write-Host "💰 Cost Note: Remember to delete the stack when done testing:" -ForegroundColor Yellow
Write-Host "   aws cloudformation delete-stack --stack-name $StackName --region $AwsRegion" -ForegroundColor Yellow

Write-Host ""
Write-Host "✨ Your serverless code compiler is now live on AWS Lambda! ✨" -ForegroundColor Green
