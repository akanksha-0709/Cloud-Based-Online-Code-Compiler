# AWS CLI Installation and Setup Guide

## Step 1: Install AWS CLI

### Option 1: MSI Installer (Recommended for Windows)
1. Download from: https://awscli.amazonaws.com/AWSCLIV2.msi
2. Run the installer
3. Restart PowerShell/Command Prompt

### Option 2: Using Chocolatey
```powershell
# Install Chocolatey first if you don't have it
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install AWS CLI
choco install awscli
```

### Option 3: Using winget
```powershell
winget install Amazon.AWSCLI
```

## Step 2: Configure AWS CLI

After installation, restart your terminal and run:

```powershell
aws configure
```

You'll need:
- **AWS Access Key ID**: Get from AWS Console > IAM > Users > Security credentials
- **AWS Secret Access Key**: Generated with the Access Key
- **Default region**: e.g., `us-east-1`, `us-west-2`, etc.
- **Default output format**: `json`

## Step 3: Verify Setup

```powershell
aws sts get-caller-identity
```

Should return your account details.

## Step 4: Required Permissions

Your AWS user needs these permissions:
- **IAM**: Create roles and policies
- **Lambda**: Create and manage functions
- **ECR**: Create repositories and push images
- **API Gateway**: Create and configure APIs
- **CloudFormation**: Deploy stacks
- **EC2**: VPC and networking (for Lambda)
- **CloudWatch**: Logs and monitoring

For learning/development, you can use the `AdministratorAccess` policy.

## Step 5: Install Docker Desktop

1. Download from: https://www.docker.com/products/docker-desktop/
2. Install and start Docker Desktop
3. Verify: `docker --version`

## After Setup

Once you have AWS CLI and Docker installed, run:

```powershell
cd "c:\Users\Radharapu Shiva\Desktop\Projects\Cloud Online Code Compiler\project"
.\deploy-aws.ps1
```

This will deploy your entire cloud infrastructure!
