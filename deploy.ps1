# PowerShell deployment script for AWS Lambda + Docker
param(
    [string]$ProjectName = "code-compiler",
    [string]$AwsRegion = "us-east-1"
)

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting AWS Lambda + Docker deployment..." -ForegroundColor Green

# Check prerequisites
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
    Write-Host "✅ AWS CLI is available" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "📋 See AWS_SETUP.md for installation instructions" -ForegroundColor Yellow
    exit 1
}

# Check if Docker is installed
try {
    docker --version | Out-Null
    Write-Host "✅ Docker is available" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    Write-Host "📋 Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
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
    --parameter-overrides ProjectName=$ProjectName `
    --capabilities CAPABILITY_IAM `
    --region $AwsRegion

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ CloudFormation deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ CloudFormation stack deployed" -ForegroundColor Green

# Step 2: Get stack outputs
Write-Host ""
Write-Host "📝 Getting stack outputs..." -ForegroundColor Yellow

$ApiEndpoint = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $AwsRegion `
    --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' `
    --output text

$PythonECR = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $AwsRegion `
    --query 'Stacks[0].Outputs[?OutputKey==`PythonECRRepository`].OutputValue' `
    --output text

$JavaECR = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $AwsRegion `
    --query 'Stacks[0].Outputs[?OutputKey==`JavaECRRepository`].OutputValue' `
    --output text

$CppECR = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $AwsRegion `
    --query 'Stacks[0].Outputs[?OutputKey==`CppECRRepository`].OutputValue' `
    --output text

$NodeJSECR = aws cloudformation describe-stacks `
    --stack-name $StackName `
    --region $AwsRegion `
    --query 'Stacks[0].Outputs[?OutputKey==`NodeJSECRRepository`].OutputValue' `
    --output text

Write-Host "� API Endpoint: $ApiEndpoint" -ForegroundColor Cyan

# Step 3: Get ECR login token
Write-Host ""
Write-Host "� Logging into ECR..." -ForegroundColor Yellow
aws ecr get-login-password --region $AwsRegion | docker login --username AWS --password-stdin "$AccountId.dkr.ecr.$AwsRegion.amazonaws.com"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ECR login failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Logged into ECR" -ForegroundColor Green

# Step 4: Build and push Docker images
Write-Host ""
Write-Host "🐳 Building and pushing Docker images..." -ForegroundColor Yellow

Set-Location docker

$languages = @(
    @{name="python"; ecr=$PythonECR; dockerfile="Dockerfile.python"},
    @{name="java"; ecr=$JavaECR; dockerfile="Dockerfile.java"},
    @{name="cpp"; ecr=$CppECR; dockerfile="Dockerfile.cpp"},
    @{name="nodejs"; ecr=$NodeJSECR; dockerfile="Dockerfile.nodejs"}
)

foreach ($lang in $languages) {
    Write-Host "� Building $($lang.name) image..." -ForegroundColor Yellow
    
    docker build -f $($lang.dockerfile) -t "$ProjectName-$($lang.name):latest" .
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to build $($lang.name) image" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📤 Pushing $($lang.name) image to ECR..." -ForegroundColor Yellow
    
    docker tag "$ProjectName-$($lang.name):latest" "$($lang.ecr):latest"
    docker push "$($lang.ecr):latest"
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to push $($lang.name) image" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "✅ $($lang.name) image pushed successfully" -ForegroundColor Green
}

Set-Location ..

# Step 5: Update Lambda functions with new images
Write-Host ""
Write-Host "🔄 Updating Lambda functions..." -ForegroundColor Yellow

$lambdaFunctions = @(
    @{name="$ProjectName-python"; ecr=$PythonECR},
    @{name="$ProjectName-java"; ecr=$JavaECR},
    @{name="$ProjectName-cpp"; ecr=$CppECR},
    @{name="$ProjectName-nodejs"; ecr=$NodeJSECR}
)

foreach ($func in $lambdaFunctions) {
    Write-Host "� Updating $($func.name)..." -ForegroundColor Yellow
    
    aws lambda update-function-code `
        --function-name $($func.name) `
        --image-uri "$($func.ecr):latest" `
        --region $AwsRegion | Out-Null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to update $($func.name)" -ForegroundColor Red
        exit 1
    }
    
    # Wait for function to be updated
    aws lambda wait function-updated --function-name $($func.name) --region $AwsRegion
    
    Write-Host "✅ $($func.name) updated successfully" -ForegroundColor Green
}

# Step 6: Update frontend configuration
Write-Host ""
Write-Host "⚙️  Updating frontend configuration..." -ForegroundColor Yellow

$ConfigDir = "src\config"
if (-not (Test-Path $ConfigDir)) {
    New-Item -Path $ConfigDir -ItemType Directory -Force
}

$ConfigContent = @"
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
"@

$ConfigContent | Out-File -FilePath "$ConfigDir\aws.ts" -Encoding UTF8

Write-Host "✅ Frontend configuration updated" -ForegroundColor Green

# Step 7: Update API service for multiple endpoints
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

$ApiServiceContent | Out-File -FilePath "src\services\api.ts" -Encoding UTF8

Write-Host "✅ API service updated" -ForegroundColor Green

# Step 8: Test API endpoints
Write-Host ""
Write-Host "🧪 Testing API endpoints..." -ForegroundColor Yellow

$testEndpoints = @("/execute/python", "/execute/java", "/execute/cpp", "/execute/javascript")

foreach ($endpoint in $testEndpoints) {
    Write-Host "🔍 Testing $endpoint..." -ForegroundColor Yellow
    
    $testData = @{
        code = "console.log('Hello from Lambda!');"
        input = ""
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$ApiEndpoint$endpoint" -Method POST -Body $testData -ContentType "application/json" -TimeoutSec 30
        if ($response.success -or $response.error) {
            Write-Host "✅ $endpoint is responding" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $endpoint responded but format unexpected" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  $endpoint test failed: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Cyan
Write-Host "   • API Endpoint: $ApiEndpoint" -ForegroundColor White
Write-Host "   • Region: $AwsRegion" -ForegroundColor White
Write-Host "   • Languages: Python, Java, C++/C, JavaScript" -ForegroundColor White
Write-Host ""
Write-Host "🔗 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Your frontend is now configured to use AWS Lambda" -ForegroundColor White
Write-Host "   2. Test your application at http://localhost:5173" -ForegroundColor White
Write-Host "   3. Monitor execution in CloudWatch logs" -ForegroundColor White
Write-Host ""
Write-Host "📊 Monitoring:" -ForegroundColor Cyan
Write-Host "   • CloudWatch Logs: https://console.aws.amazon.com/cloudwatch/home?region=$AwsRegion#logsV2:log-groups" -ForegroundColor White
Write-Host "   • Lambda Console: https://console.aws.amazon.com/lambda/home?region=$AwsRegion" -ForegroundColor White
Write-Host "   • API Gateway: https://console.aws.amazon.com/apigateway/home?region=$AwsRegion" -ForegroundColor White
Write-Host ""
Write-Host "💰 Cost Note: Remember to delete the stack when done testing:" -ForegroundColor Yellow
Write-Host "   aws cloudformation delete-stack --stack-name $StackName --region $AwsRegion" -ForegroundColor White
