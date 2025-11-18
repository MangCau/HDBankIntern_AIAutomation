# HDBank AI Automation

A full-stack web application for AI-powered automation at HDBank.

## Project Structure

```
HDBank AIAutomation/
├── backend/          # Node.js/Express API server
├── frontend/         # React + TypeScript frontend
├── n8n/             # N8N workflow automation
└── README.md
```

## Tech Stack

### Backend
- Node.js
- Express.js
- MongoDB (Mongoose)
- JWT Authentication
- Winston (Logging)

### Frontend
- React 19
- TypeScript
- Vite
- React Router
- Axios
- Zustand (State Management)

### Automation
- N8N (Workflow Automation)
- Docker

## Quick Start

### Prerequisites

- Node.js (v20 or higher)
- MongoDB
- Docker and Docker Compose (for N8N)
- npm or yarn

### Installation

1. Clone the repository

2. Set up Backend:
```bash
cd backend
npm install
cp .env.example .env
# Update .env with your configuration
npm run dev
```

3. Set up Frontend:
```bash
cd frontend
npm install
cp .env.example .env
# Update .env with your configuration
npm run dev
```

4. Set up N8N:
```bash
cd n8n
cp .env.example .env
# Update .env with your configuration
docker-compose up -d
```

## Access Points

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- N8N UI: http://localhost:5678

## Development

### Backend Development
```bash
cd backend
npm run dev    # Start with nodemon (auto-reload)
npm test       # Run tests
npm run lint   # Run ESLint
```

### Frontend Development
```bash
cd frontend
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

## Project Features

- User Authentication (JWT)
- RESTful API
- Responsive UI
- Workflow Automation
- Logging and Error Handling
- TypeScript Support

## Environment Variables

Each component has its own `.env.example` file. Copy these to `.env` and update with your configuration:

- [backend/.env.example](backend/.env.example)
- [frontend/.env.example](frontend/.env.example)
- [n8n/.env.example](n8n/.env.example)

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Submit a pull request

## License

ISC
