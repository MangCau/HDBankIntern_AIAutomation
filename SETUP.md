# Setup Guide - HDBank AI Automation

Step-by-step guide to set up the complete project.

## Prerequisites Checklist

- [ ] Node.js v20+ installed
- [ ] MongoDB installed and running
- [ ] Docker and Docker Compose installed
- [ ] npm or yarn installed

## Step-by-Step Setup

### 1. Backend Setup

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file and update:
# - MONGODB_URI (your MongoDB connection string)
# - JWT_SECRET (generate a random secret key)
# - N8N_API_KEY (will get this from N8N setup)

# Create logs directory
mkdir logs

# Start the backend server
npm run dev
```

Backend should now be running on http://localhost:5000

### 2. Frontend Setup

```bash
# Navigate to frontend folder
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env file and update:
# - VITE_API_URL (should be http://localhost:5000)

# Start the frontend development server
npm run dev
```

Frontend should now be running on http://localhost:5173

### 3. N8N Setup

```bash
# Navigate to n8n folder
cd n8n

# Create environment file
cp .env.example .env

# Edit .env file and update:
# - N8N_BASIC_AUTH_USER (choose a username)
# - N8N_BASIC_AUTH_PASSWORD (choose a strong password)

# Start N8N using Docker
docker-compose up -d

# Check if N8N is running
docker-compose ps

# View logs (optional)
docker-compose logs -f
```

N8N UI should now be accessible at http://localhost:5678

### 4. Verify Setup

1. **Backend Health Check:**
   ```bash
   curl http://localhost:5000/health
   ```
   Expected response: `{"status":"OK","message":"Server is running"}`

2. **Frontend:**
   - Open http://localhost:5173 in browser
   - You should see the React app running

3. **N8N:**
   - Open http://localhost:5678 in browser
   - Login with credentials from n8n/.env
   - You should see the N8N dashboard

## Common Issues

### Backend won't start

- **MongoDB not running:** Ensure MongoDB is installed and running
  ```bash
  # On Windows with MongoDB service:
  net start MongoDB

  # On Mac/Linux:
  sudo systemctl start mongod
  ```

- **Port 5000 already in use:** Change PORT in backend/.env

### Frontend won't start

- **Port 5173 already in use:** Vite will automatically use next available port
- **Dependencies issue:** Delete node_modules and run `npm install` again

### N8N won't start

- **Docker not running:** Start Docker Desktop
- **Port 5678 in use:** Change port in n8n/docker-compose.yml and n8n/.env

## Next Steps

After successful setup:

1. **Configure Database Models**
   - Add your MongoDB models in `backend/src/models/`

2. **Create API Routes**
   - Add routes in `backend/src/routes/`
   - Add controllers in `backend/src/controllers/`

3. **Build Frontend Pages**
   - Create pages in `frontend/src/pages/`
   - Create components in `frontend/src/components/`

4. **Set up N8N Workflows**
   - Create workflows in N8N UI
   - Export and save to `n8n/workflows/`

## Development Workflow

### Running in Development Mode

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - N8N (if needed)
cd n8n && docker-compose up
```

### Making Changes

1. Backend changes auto-reload with nodemon
2. Frontend has hot module replacement (HMR)
3. N8N changes are saved in the container

## Production Build

### Backend
```bash
cd backend
NODE_ENV=production npm start
```

### Frontend
```bash
cd frontend
npm run build
# Serve the dist/ folder with your web server
```

## Support

For issues or questions:
- Check component-specific READMEs
- Review logs in `backend/logs/`
- Check N8N logs: `docker-compose logs`
