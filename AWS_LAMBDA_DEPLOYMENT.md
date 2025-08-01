# AWS Lambda Deployment Guide

## 🎯 What This Deployment Does

This deployment creates a **fully serverless code execution backend** using:
- **AWS Lambda** with Docker containers for each language
- **API Gateway** with separate endpoints per language
- **ECR** repositories for Docker images
- **CloudWatch** logs for monitoring

## 📋 Prerequisites Checklist

### 1. Install AWS CLI
- Download: https://awscli.amazonaws.com/AWSCLIV2.msi
- Run installer and restart PowerShell
- Verify: `aws --version`

### 2. Configure AWS CLI
```powershell
aws configure
```
You need:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region (e.g., `us-east-1`)
- Default output format: `json`

### 3. Install Docker Desktop
- Download: https://www.docker.com/products/docker-desktop/
- Install and start Docker Desktop
- Verify: `docker --version`

### 4. Required AWS Permissions
Your AWS user needs these permissions:
- Lambda (create, update functions)
- ECR (create repositories, push images)
- CloudFormation (deploy stacks)
- API Gateway (create APIs)
- IAM (create roles)
- CloudWatch (logs)

## 🚀 Deployment Steps

### Step 1: Run Deployment Script
```powershell
cd "c:\Users\Radharapu Shiva\Desktop\Projects\Cloud Online Code Compiler\project"
.\deploy.ps1 -ProjectName "my-compiler" -AwsRegion "us-east-1"
```

### Step 2: What Happens During Deployment

1. **Infrastructure Deployment** (CloudFormation)
   - Creates ECR repositories for each language
   - Creates Lambda functions
   - Sets up API Gateway with CORS
   - Creates IAM roles and CloudWatch logs

2. **Docker Image Building**
   - Builds 4 Docker images (Python, Java, C++, Node.js)
   - Pushes images to ECR repositories

3. **Lambda Function Updates**
   - Updates each Lambda function with its Docker image
   - Configures memory (512MB) and timeout (30s)

4. **Frontend Configuration**
   - Updates `src/config/aws.ts` with API endpoint
   - Updates `src/services/api.ts` for language-specific endpoints

## 🔧 Architecture Overview

### API Endpoints Structure
```
https://xxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
├── execute/python      → Python Lambda
├── execute/java        → Java Lambda  
├── execute/cpp         → C++ Lambda (also handles C)
└── execute/javascript  → Node.js Lambda
```

### Request Format
```json
POST /execute/{language}
{
  "code": "print('Hello World')",
  "input": "optional input data"
}
```

### Response Format
```json
{
  "success": true,
  "output": "Hello World\n",
  "executionTime": 245,
  "memoryUsed": 128
}
```

## 🧪 Testing Your Deployment

### 1. Test Frontend Integration
```powershell
cd "c:\Users\Radharapu Shiva\Desktop\Projects\Cloud Online Code Compiler\project"
npm run dev
```

Open http://localhost:5173 and:
- Select "Python" → Write code → Click "Run Code"
- Should see AWS Lambda execution!

### 2. Test API Directly
```powershell
# Test Python endpoint
$endpoint = "https://your-api-id.execute-api.us-east-1.amazonaws.com/prod/execute/python"
$data = @{code="print('Hello Lambda!')"; input=""} | ConvertTo-Json
Invoke-RestMethod -Uri $endpoint -Method POST -Body $data -ContentType "application/json"
```

## 📊 Monitoring & Debugging

### CloudWatch Logs
- Python: `/aws/lambda/code-compiler-python`
- Java: `/aws/lambda/code-compiler-java`
- C++: `/aws/lambda/code-compiler-cpp`
- Node.js: `/aws/lambda/code-compiler-nodejs`

### Common Issues & Solutions

#### 1. "Function not found" Error
```powershell
# Check if functions were created
aws lambda list-functions --region us-east-1 --query 'Functions[?starts_with(FunctionName, `code-compiler`)].FunctionName'
```

#### 2. "Image not found" Error
```powershell
# Check ECR repositories
aws ecr describe-repositories --region us-east-1
```

#### 3. CORS Issues
- Check API Gateway console
- Ensure OPTIONS methods are configured
- Verify response headers

#### 4. Timeout Issues
- Check CloudWatch logs for execution time
- Lambda timeout is 30s, execution should be <25s
- API Gateway timeout is 29s maximum

## 💰 Cost Considerations

### AWS Lambda Pricing (us-east-1)
- **Requests**: $0.20 per 1M requests
- **Duration**: $0.0000166667 per GB-second
- **Free Tier**: 1M requests + 400,000 GB-seconds per month

### Example Cost Calculation
- 1000 code executions per day
- Average 2 seconds execution time
- 512MB memory per function
- **Monthly cost**: ~$1-2

### Cost Optimization Tips
1. Use appropriate memory allocation (512MB is good)
2. Optimize code execution time
3. Clean up unused resources
4. Monitor usage with CloudWatch

## 🔒 Security Features

### Lambda-Level Security
- Container isolation per execution
- Limited memory and CPU
- No persistent storage
- Network isolation

### Code Validation
- Regex pattern matching for dangerous operations
- Blocked imports/includes:
  - Python: `os`, `sys`, `subprocess`
  - Java: `Runtime`, `ProcessBuilder`
  - C++: `<unistd.h>`, `system()` calls
  - Node.js: `fs`, `child_process`

### API Security
- CORS configured for browser access
- No authentication (add API Gateway authorizers for production)
- Rate limiting available via API Gateway

## 🧹 Cleanup

### Delete Everything
```powershell
aws cloudformation delete-stack --stack-name code-compiler-stack --region us-east-1
```

### Delete Just Docker Images
```powershell
# List images
aws ecr list-images --repository-name code-compiler-python --region us-east-1

# Delete all images in repository
aws ecr batch-delete-image --repository-name code-compiler-python --image-ids imageTag=latest --region us-east-1
```

## 🔄 Updating Your Deployment

### Update Lambda Code Only
```powershell
# Rebuild and push specific language
cd docker
docker build -f Dockerfile.python -t code-compiler-python:latest .
docker tag code-compiler-python:latest ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/code-compiler-python:latest
docker push ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/code-compiler-python:latest

# Update Lambda function
aws lambda update-function-code --function-name code-compiler-python --image-uri ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/code-compiler-python:latest
```

### Full Redeployment
```powershell
.\deploy.ps1 -ProjectName "my-compiler" -AwsRegion "us-east-1"
```

## 🎉 Success Indicators

✅ **Deployment Successful** when you see:
- "🎉 Deployment completed successfully!"
- API endpoint URL displayed
- All 4 Lambda functions listed
- Frontend updated with AWS endpoints

✅ **Working Correctly** when:
- Frontend shows "AWS Lambda" in output
- Code executes in ~1-3 seconds
- All 4 languages work from browser
- CloudWatch logs show executions

## 📞 Support

If you encounter issues:
1. Check CloudWatch logs for detailed error messages
2. Verify AWS permissions
3. Ensure Docker is running
4. Check AWS service limits in your region

---

**🎯 Goal Achieved**: Your browser-based code compiler now runs on AWS Lambda with Docker containers, providing secure, scalable, serverless code execution!
