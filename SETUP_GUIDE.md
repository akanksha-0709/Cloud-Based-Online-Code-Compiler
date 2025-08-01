# 🚀 AWS Setup Guide - Step by Step

## ✅ Step 1: Install AWS CLI

### Download and Install AWS CLI
1. **Download AWS CLI v2 for Windows**:
   - Go to: https://awscli.amazonaws.com/AWSCLIV2.msi
   - Download the installer

2. **Run the installer**:
   - Double-click `AWSCLIV2.msi`
   - Follow the installation wizard
   - Click "Next" → "Next" → "Install" → "Finish"

3. **Restart PowerShell**:
   - Close this VS Code terminal
   - Open a new terminal to refresh PATH

4. **Verify installation**:
   ```powershell
   aws --version
   ```
   Should show something like: `aws-cli/2.x.x Python/3.x.x Windows/10`

## ✅ Step 2: Install Docker Desktop

### Download and Install Docker
1. **Download Docker Desktop**:
   - Go to: https://www.docker.com/products/docker-desktop/
   - Click "Download for Windows"
   - Download `Docker Desktop Installer.exe`

2. **Run the installer**:
   - Double-click `Docker Desktop Installer.exe`
   - Follow installation wizard
   - **Important**: Enable "Use WSL 2 instead of Hyper-V" if prompted
   - Restart computer when prompted

3. **Start Docker Desktop**:
   - Launch Docker Desktop from Start menu
   - Wait for Docker to start (whale icon in system tray)
   - You may need to accept terms and create/sign in to Docker account

4. **Verify installation**:
   ```powershell
   docker --version
   ```
   Should show: `Docker version 24.x.x, build xxxxxxx`

## ✅ Step 3: Configure AWS CLI

### Get Your AWS Credentials
You need an AWS account with programmatic access. If you don't have one:

1. **Create AWS Account**: https://aws.amazon.com/
2. **Create IAM User**:
   - Go to AWS Console → IAM → Users → Create User
   - Username: `code-compiler-deploy`
   - Attach policies: `PowerUserAccess` (or create custom policy)
   - Create Access Key → Command Line Interface (CLI)
   - **Save the Access Key ID and Secret Access Key!**

### Configure AWS CLI
```powershell
aws configure
```

Enter these values:
- **AWS Access Key ID**: `AKIA...` (from step above)
- **AWS Secret Access Key**: `...` (from step above)  
- **Default region name**: `us-east-1` (recommended)
- **Default output format**: `json`

### Test AWS Connection
```powershell
aws sts get-caller-identity
```
Should show your AWS account details.

## ✅ Step 4: Pre-deployment Check

Run this command to verify everything is ready:
```powershell
# Check AWS CLI
aws --version

# Check Docker
docker --version

# Check AWS credentials
aws sts get-caller-identity

# Check Docker is running
docker ps
```

## 🎯 Ready for Deployment!

Once all steps are complete, you can deploy:
```powershell
cd "c:\Users\Radharapu Shiva\Desktop\Projects\Cloud Online Code Compiler\project"
.\deploy.ps1 -ProjectName "my-compiler" -AwsRegion "us-east-1"
```

## 🚨 Common Issues & Solutions

### Issue: "Docker daemon not running"
**Solution**: Start Docker Desktop and wait for it to fully load

### Issue: "AWS credentials not found"
**Solution**: Re-run `aws configure` with correct credentials

### Issue: "Permission denied" on Windows
**Solution**: Run PowerShell as Administrator

### Issue: "Docker build failed"
**Solution**: Ensure Docker Desktop is running and you have internet connection

---

## 📋 Quick Checklist
- [ ] AWS CLI installed and configured
- [ ] Docker Desktop installed and running
- [ ] AWS credentials with proper permissions
- [ ] Internet connection for downloading dependencies

**Next**: Run the deployment script!
