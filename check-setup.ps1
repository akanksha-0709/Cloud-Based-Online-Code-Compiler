# Quick verification script
Write-Host "🔍 Checking AWS CLI installation..." -ForegroundColor Yellow
try {
    $awsVersion = aws --version 2>&1
    Write-Host "✅ AWS CLI: $awsVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ AWS CLI not found. Please install from: https://awscli.amazonaws.com/AWSCLIV2.msi" -ForegroundColor Red
}

Write-Host "`n🔍 Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "✅ Docker: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker not found. Please install Docker Desktop" -ForegroundColor Red
}

Write-Host "`n🔍 Checking AWS credentials..." -ForegroundColor Yellow
try {
    $identity = aws sts get-caller-identity 2>&1
    if ($identity -like "*error*" -or $identity -like "*Unable*") {
        Write-Host "❌ AWS credentials not configured. Run: aws configure" -ForegroundColor Red
    } else {
        Write-Host "✅ AWS credentials configured" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Cannot check AWS credentials. Configure with: aws configure" -ForegroundColor Red
}

Write-Host "`n🔍 Checking Docker daemon..." -ForegroundColor Yellow
try {
    $dockerPs = docker ps 2>&1
    if ($dockerPs -like "*error*" -or $dockerPs -like "*Cannot connect*") {
        Write-Host "❌ Docker daemon not running. Start Docker Desktop" -ForegroundColor Red
    } else {
        Write-Host "✅ Docker daemon running" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Docker daemon not accessible. Start Docker Desktop" -ForegroundColor Red
}

Write-Host "`n🎯 Setup Status:" -ForegroundColor Cyan
Write-Host "Once all items show ✅, you can run:" -ForegroundColor White
Write-Host ".\deploy.ps1 -ProjectName 'my-compiler' -AwsRegion 'us-east-1'" -ForegroundColor Yellow
