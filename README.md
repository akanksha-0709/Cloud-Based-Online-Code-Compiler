# 🚀 Cloud Online Code Compiler

A modern, serverless online code compiler that runs Python, Java, C++, and JavaScript code in AWS Lambda containers.

## ✨ Features

- **4 Programming Languages**: Python, Java, C++, JavaScript
- **Serverless Architecture**: AWS Lambda with Docker containers
- **Real-time Execution**: Sub-second code execution times
- **Secure Isolation**: Each execution runs in isolated containers
- **Modern UI**: React + TypeScript + Tailwind CSS
- **Cost Effective**: Pay only for executions

## 🏗️ Architecture

- **Frontend**: React.js with TypeScript and Tailwind CSS
- **Backend**: AWS Lambda functions with Docker containers
- **Infrastructure**: CloudFormation (Infrastructure as Code)
- **Container Registry**: Amazon ECR
- **API**: AWS API Gateway with CORS support

## 🚀 Quick Start

### Prerequisites

1. **AWS Account** with programmatic access
2. **AWS CLI** installed and configured
3. **Docker Desktop** installed and running
4. **Node.js** (v18 or later)

### Local Development

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd cloud-online-code-compiler
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local development server**:
   ```bash
   npm run dev
   ```

4. **Start local backend** (for development):
   ```bash
   cd server
   npm install
   npm start
   ```

### AWS Deployment

1. **Configure environment**:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your AWS settings
   ```

2. **Deploy to AWS**:
   ```powershell
   # Windows PowerShell
   .\deploy-clean.ps1 -ProjectName "my-compiler" -AwsRegion "us-east-1"
   ```

3. **Update frontend config**:
   - The deployment script automatically updates `src/config/aws.ts`
   - Your frontend will now use AWS Lambda endpoints

## 🔧 Configuration

### Environment Variables

Create a `.env.local` file (copy from `.env.example`):

```env
VITE_API_ENDPOINT=https://your-api-id.execute-api.us-east-1.amazonaws.com/prod
VITE_AWS_REGION=us-east-1
VITE_NODE_ENV=development
```

### AWS Requirements

Your AWS user needs these permissions:
- `PowerUserAccess` (recommended)
- OR specific policies: Lambda, ECR, CloudFormation, API Gateway, CloudWatch

## 📦 Project Structure

```
project/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── services/          # API services
│   ├── config/            # Configuration
│   └── types/             # TypeScript types
├── server/                # Local development server
├── docker/                # Lambda Docker containers
│   ├── Dockerfile.python  # Python executor
│   ├── Dockerfile.java    # Java executor
│   ├── Dockerfile.cpp     # C++ executor
│   ├── Dockerfile.nodejs  # Node.js executor
│   └── lambda-handlers/   # Lambda function code
├── infrastructure/        # AWS CloudFormation
└── docs/                 # Documentation
```

## 🐳 Docker Containers

Each language runs in its own optimized Lambda container:

- **Python**: Amazon Linux 2 + Python 3.9
- **Java**: Amazon Corretto JDK 11
- **C++**: GCC compiler + development tools
- **Node.js**: Node.js 18 LTS

## 🔒 Security Features

- **Container Isolation**: Each execution runs in a fresh container
- **Code Validation**: Blocks dangerous imports and system calls
- **Timeout Protection**: 30-second execution limit
- **Memory Limits**: 512MB per execution
- **Network Isolation**: No external network access during execution

## 💰 Cost Estimation

AWS Lambda pricing (us-east-1):
- **Requests**: $0.20 per 1M requests
- **Duration**: $0.0000166667 per GB-second
- **Typical cost**: ~$1-2 per month for moderate usage

## 🛠️ Development

### Adding New Languages

1. Create `docker/Dockerfile.newlang`
2. Add handler in `docker/lambda-handlers/newlang-handler.py`
3. Update CloudFormation template
4. Add language to frontend constants

### Local Testing

```bash
# Test individual containers
docker build -f docker/Dockerfile.python -t test-python docker/
docker run --rm test-python

# Test API endpoints
npm run test:api
```

## 🚀 Deployment Options

### Development
- Local server with Docker containers
- Hot reload for frontend changes

### Production (AWS)
- Serverless Lambda functions
- Global CDN distribution
- Auto-scaling and high availability

## 📚 Documentation

- [AWS Setup Guide](AWS_SETUP.md)
- [Deployment Guide](AWS_LAMBDA_DEPLOYMENT.md)
- [Troubleshooting](TROUBLESHOOTING.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AWS Lambda team for serverless container support
- React and TypeScript communities
- Docker for containerization technology

---

**⚠️ Security Notice**: Never commit AWS credentials to the repository. Use environment variables and IAM roles for production deployments.
