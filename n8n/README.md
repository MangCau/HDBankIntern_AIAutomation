# HDBank AI Automation - N8N Workflows

This folder contains N8N workflow automation configurations for HDBank AI Automation.

## What is N8N?

n8n is a workflow automation tool that allows you to connect various services and automate tasks. It's used in this project for:
- API integrations
- Data processing workflows
- Scheduled tasks
- Event-driven automation

## Getting Started

### Prerequisites

- Docker and Docker Compose installed

### Running N8N

1. Create `.env` file:
```bash
cp .env.example .env
```

2. Update environment variables in `.env` (especially username and password)

3. Start N8N:
```bash
docker-compose up -d
```

4. Access N8N UI:
```
http://localhost:5678
```

5. Stop N8N:
```bash
docker-compose down
```

## Folder Structure

```
n8n/
├── workflows/        # N8N workflow JSON files
├── credentials/      # Credentials (gitignored)
├── custom-nodes/     # Custom N8N nodes
├── data/            # N8N data (gitignored)
├── docker-compose.yml
└── .env.example
```

## Importing Workflows

1. Access N8N UI at http://localhost:5678
2. Go to "Workflows" tab
3. Click "Import from File"
4. Select workflow JSON file from `workflows/` folder

## Exporting Workflows

1. Open the workflow in N8N UI
2. Click the three dots menu
3. Select "Download"
4. Save to `workflows/` folder

## Security Notes

- Never commit `.env` file or credentials
- Change default username and password
- Use strong passwords for production
- Consider using external database for production

## Integration with Backend

The backend API can trigger N8N workflows via webhooks:
- Webhook URL format: `http://localhost:5678/webhook/{workflow-id}`
- Configure webhook credentials in backend `.env`
