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

This project is configured for deployment on Vercel:

- **Framework**: Next.js
- **Build Command**: `cd frontend && yarn build`
- **Output Directory**: `frontend/.next`
- **Root Directory**: `frontend`

The deployment configuration is defined in `vercel.json`.

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