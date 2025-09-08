# Security Guidelines

## Environment Variables

This project uses environment variables for sensitive configuration. **Never commit API keys or secrets to the repository.**

### Required Environment Variables

Create a `.env` file in the project root with the following variables:

```bash
# OpenAI Configuration (Required for AI-powered field generation)
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_TEMPERATURE=0.3

# Database Configuration
DATABASE_URL=postgresql://postgres:password@db:5432/docextract

# S3/MinIO Configuration
AWS_ACCESS_KEY_ID=minioadmin
AWS_SECRET_ACCESS_KEY=minioadmin
AWS_ENDPOINT_URL=http://minio:9000
AWS_REGION=us-east-1
S3_BUCKET_NAME=documents

# Ollama Configuration
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=gemma3:4b

# Application Settings
DEBUG=true
MAX_FILE_SIZE=52428800  # 50MB in bytes

# Frontend Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000

# Security (Change in production)
SECRET_KEY=your-secret-key-change-in-production
JWT_SECRET=your-jwt-secret-change-in-production
```

### Quick Setup

Run the setup script to create your `.env` file:

```bash
./setup-env.sh
```

Then edit the `.env` file and replace `your-openai-api-key-here` with your actual OpenAI API key.

### Security Best Practices

1. **Never commit `.env` files** - They are already in `.gitignore`
2. **Use different API keys for different environments** (development, staging, production)
3. **Rotate API keys regularly**
4. **Use environment-specific configuration files** for production deployments
5. **Monitor API key usage** for unusual activity

### Production Deployment

For production deployments:

1. Set `DEBUG=false`
2. Use strong, unique values for `SECRET_KEY` and `JWT_SECRET`
3. Use production-grade database credentials
4. Configure proper CORS origins
5. Enable SSL/TLS
6. Use a secrets management service (AWS Secrets Manager, Azure Key Vault, etc.)

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly by contacting the maintainers directly rather than creating a public issue.
