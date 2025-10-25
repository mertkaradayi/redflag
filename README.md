# RedFlag

A modern full-stack application built with Next.js and TypeScript, organized as a monorepo.

## 🏗️ Project Structure

This project is organized as a monorepo with the following structure:

```
redflag/
├── frontend/          # Next.js frontend application
├── backend/           # Backend API (to be implemented)
├── package.json       # Root package.json with workspace configuration
├── vercel.json        # Vercel deployment configuration
└── yarn.lock          # Yarn lockfile
```

## 🚀 Tech Stack

### Frontend
- **Framework**: Next.js 16.0.0 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **React**: React 19.2.0
- **Linting**: ESLint with Next.js config

### Backend
- **Status**: To be implemented
- **Language**: TypeScript (planned)

### Development Tools
- **Package Manager**: Yarn with workspaces
- **Deployment**: Vercel
- **Monorepo**: Yarn workspaces

## 📦 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd redflag
```

2. Install dependencies:
```bash
yarn install
```

## 🛠️ Development

### Start Development Servers

**Frontend only:**
```bash
yarn dev:frontend
```

**Backend only:**
```bash
yarn dev:backend
```

**Both simultaneously:**
```bash
yarn dev
```

**Both (in separate terminals):**
```bash
# Terminal 1
yarn dev:frontend

# Terminal 2
yarn dev:backend
```

### Build for Production

**Frontend:**
```bash
yarn build:frontend
```

**Backend:**
```bash
yarn build:backend
```

## 🌐 Deployment

### Frontend (Vercel)
This project is configured for deployment on Vercel:

- **Framework**: Next.js
- **Build Command**: `cd frontend && yarn build`
- **Output Directory**: `frontend/.next`
- **Root Directory**: `frontend`

The deployment configuration is defined in `vercel.json`.

### Backend (Railway)
The backend is configured for deployment on Railway:

1. **Create Railway Account**: Go to [railway.app](https://railway.app) and sign up
2. **Connect GitHub**: Link your GitHub account and select this repository
3. **Create New Project**: 
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `redflag` repository
4. **Configure Service**:
   - Set **Root Directory** to `backend`
   - Railway will auto-detect the `railway.json` configuration
5. **Set Environment Variables**:
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-vercel-domain.vercel.app`
6. **Deploy**: Railway will automatically build and deploy your backend
7. **Get Backend URL**: Railway will provide a URL like `https://your-backend.railway.app`

### Backend API Endpoints
Once deployed, your backend will have:
- **Health Check**: `GET /health` - Returns service status
- **API Status**: `GET /api/status` - Returns API information

## 📁 Workspace Commands

The root `package.json` includes convenient scripts for managing the monorepo:

- `yarn dev:frontend` - Start frontend development server
- `yarn dev:backend` - Start backend development server
- `yarn build:frontend` - Build frontend for production
- `yarn build:backend` - Build backend for production

## 🎨 Frontend Features

- Modern Next.js App Router architecture
- TypeScript for type safety
- Tailwind CSS for styling
- Responsive design with dark mode support
- ESLint for code quality

## 🔧 Development Notes

- The project uses the new JSX transform (`"jsx": "react-jsx"`), so React imports are not required in components
- Tailwind CSS v4 is configured for modern styling
- TypeScript is strictly configured for better development experience

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Please follow the established coding standards and use the provided linting configuration.