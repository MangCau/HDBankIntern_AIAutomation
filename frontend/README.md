# HDBank AI Automation - Frontend

React + TypeScript frontend for HDBank AI Automation platform built with Vite.

## Tech Stack

- React 18
- TypeScript
- Vite 5
- React Router
- Axios
- Zustand (State Management)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update environment variables in `.env`

4. Start the development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
```

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── hooks/           # Custom React hooks
│   ├── context/         # React context
│   ├── types/           # TypeScript types
│   ├── utils/           # Helper functions
│   ├── assets/          # Static assets
│   ├── App.tsx          # Root component
│   └── main.tsx         # Entry point
├── public/              # Public assets
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
