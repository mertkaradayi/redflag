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
- **Framework**: Express.js with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Privy (planned)
- **Deployment**: Railway

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

3. Set up environment variables:
```bash
# Backend environment setup
# Create backend/.env with the following variables:
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Frontend environment setup
# Create frontend/.env.local with:
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## 🗄️ Supabase Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and sign up
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `redflag-db` (or your preferred name)
   - **Database Password**: Generate a strong password
   - **Region**: Choose closest to your users
5. Click "Create new project"

### 2. Get Supabase Credentials
1. Go to your project dashboard
2. Click "Settings" (gear icon) → "API"
3. Copy the following values:
   - **Project URL** → Use as `SUPABASE_URL`
   - **service_role key** (secret) → Use as `SUPABASE_SERVICE_KEY`

### 3. Configure Environment Variables
Add these to your `backend/.env` file:
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

### 4. Test Connection
- Start your backend: `yarn dev:backend`
- Visit: `http://localhost:3001/api/supabase/health`
- Or use the frontend test button on the homepage

## 🔧 Environment Setup

### Local Development

The project is configured to work with local development by default:

- **Frontend**: `http://localhost:3000` (connects to local backend)
- **Backend**: `http://localhost:3001` (accepts requests from localhost:3000)

### Environment Variables

#### Backend (`.env`)
```bash
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

#### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

### Production Environment Variables

#### Vercel (Frontend)
Set these in your Vercel dashboard under Project Settings → Environment Variables:

```bash
NEXT_PUBLIC_BACKEND_URL=https://backend-production-6d04.up.railway.app
```

#### Railway (Backend)
Set these in your Railway dashboard under your service → Variables:

```bash
FRONTEND_URL=https://redflag-liart.vercel.app
NODE_ENV=production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
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
   - `FRONTEND_URL=https://redflag-liart.vercel.app`
6. **Deploy**: Railway will automatically build and deploy your backend
7. **Get Backend URL**: Railway will provide a URL like `https://your-backend.railway.app`

### Frontend (Vercel)
The frontend is configured for deployment on Vercel:

1. **Connect GitHub**: Link your GitHub account and select this repository
2. **Configure Project**:
   - Framework: Next.js (auto-detected)
   - Root Directory: `frontend`
   - Build Command: `yarn build` (runs in frontend directory)
   - Output Directory: `.next`
3. **Set Environment Variables**:
   - `NEXT_PUBLIC_BACKEND_URL=https://backend-production-6d04.up.railway.app`
4. **Deploy**: Vercel will automatically build and deploy your frontend

### Backend API Endpoints
Once deployed, your backend will have:
- **Health Check**: `GET /health` - Returns service status
- **API Status**: `GET /api/status` - Returns API information
- **Supabase Health**: `GET /api/supabase/health` - Tests Supabase database connection

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

## 🐛 Troubleshooting

### CORS Issues
If you see CORS errors in the browser console:
1. Ensure your backend is running on `http://localhost:3001`
2. Check that `FRONTEND_URL` in backend `.env` is set to `http://localhost:3000`
3. Verify the backend CORS configuration includes your frontend URL

### Connection Issues
If the frontend can't connect to the backend:
1. Check that `NEXT_PUBLIC_BACKEND_URL` in frontend `.env.local` is set to `http://localhost:3001`
2. Ensure the backend is running and accessible at the configured URL
3. Check browser network tab for failed requests

### Production Deployment Issues
1. **Vercel**: Ensure `NEXT_PUBLIC_BACKEND_URL` is set in Vercel dashboard
2. **Railway**: Ensure `FRONTEND_URL` and `NODE_ENV` are set in Railway dashboard
3. **CORS**: Verify Railway backend allows your Vercel domain in CORS configuration

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Please follow the established coding standards and use the provided linting configuration.