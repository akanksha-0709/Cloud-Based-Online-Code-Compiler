Write-Host "Testing AWS permissions..." -ForegroundColor Yellow

Write-Host "Testing CloudFormation..." -ForegroundColor Cyan
try {
    aws cloudformation describe-stacks --region us-east-1 2>$null
    Write-Host "✅ CloudFormation access: OK" -ForegroundColor Green
} catch {
    Write-Host "❌ CloudFormation access: DENIED" -ForegroundColor Red
}

Write-Host "Testing ECR..." -ForegroundColor Cyan
try {
    aws ecr describe-repositories --region us-east-1 2>$null
    Write-Host "✅ ECR access: OK" -ForegroundColor Green
} catch {
    Write-Host "❌ ECR access: DENIED" -ForegroundColor Red
}

Write-Host "Testing Lambda..." -ForegroundColor Cyan
try {
    aws lambda list-functions --region us-east-1 2>$null
    Write-Host "✅ Lambda access: OK" -ForegroundColor Green
} catch {
    Write-Host "❌ Lambda access: DENIED" -ForegroundColor Red
}

Write-Host "`nIf all show ✅, you're ready to deploy!" -ForegroundColor Yellow
Write-Host "Run: .\deploy-clean.ps1 -ProjectName 'my-compiler' -AwsRegion 'us-east-1'" -ForegroundColor Cyan
