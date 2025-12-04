# 🎮 Code and Conquer

A competitive coding platform that combines LeetCode-style programming challenges with tower defense gameplay mechanics. Solve problems, earn resources, and defend your base!

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-19.x-blue.svg)

## ✨ Features

### 🧩 Coding Challenges
- **1000+ Problems** - Wide variety of algorithmic challenges
- **Multiple Languages** - JavaScript, Python, Java, C++, Go, Rust, and more
- **Real-time Execution** - Docker-based sandboxed code execution
- **Test Cases** - Visible and hidden test cases for thorough validation
- **Complexity Analysis** - Automatic time and space complexity estimation

### 🏰 Tower Defense Game
- **Strategic Gameplay** - Build towers, defend your base
- **Code-to-Combat** - Solving problems earns resources for gameplay
- **Multiple Towers** - Unlock different tower types with unique abilities
- **Hero System** - Choose heroes with special powers

### 🎯 Competitive Features
- **1v1 Matches** - Real-time competitive matches
- **Leaderboards** - Global and friends rankings
- **Daily Challenges** - Fresh problems every day
- **Progression System** - XP, levels, and unlockables

### 🔐 Authentication & Accounts
- **Multiple Auth Options** - Email, Google, GitHub, Discord
- **User Profiles** - Customizable profiles and avatars
- **Premium Features** - Optional paid tier with extra benefits

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works)
- Docker (optional, for code execution)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-repo/code-and-conquer.git
cd code-and-conquer

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Configuration

1. **Backend Configuration**

```bash
cd backend
cp env.example .env
# Edit .env with your Supabase credentials
```

2. **Frontend Configuration**

```bash
cd frontend
cp env.example .env
# Edit .env with your API and Supabase URLs
```

### Running Locally

```bash
# Terminal 1 - Start backend
cd backend
npm run dev

# Terminal 2 - Start frontend
cd frontend
npm run dev
```

Visit `http://localhost:3000` to access the application.

## 🏗 Architecture

```
code-and-conquer/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── config/         # Database & Supabase config
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # Data models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── utils/          # Utilities
│   ├── scripts/            # Database & maintenance scripts
│   └── judge/              # Code execution Docker images
│
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # React contexts
│   │   ├── game/           # 3D game engine (Three.js)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── pages/          # Page components
│   │   └── services/       # API clients
│   └── public/             # Static assets
│
├── docker-compose.yml      # Full-stack Docker setup
├── fly.toml                # Fly.io deployment config
└── render.yaml             # Render deployment config
```

## 🛠 Tech Stack

### Backend
- **Runtime:** Node.js 20
- **Framework:** Express.js
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **WebSocket:** Socket.IO
- **Code Execution:** Docker containers
- **Payments:** Stripe

### Frontend
- **Framework:** React 19
- **Build Tool:** Vite 7
- **Routing:** React Router 7
- **3D Graphics:** Three.js
- **Code Editor:** Monaco Editor
- **Charts:** Recharts
- **Styling:** CSS Modules

## 📦 Deployment

### Docker Compose (Recommended)

```bash
# Build and run all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Cloud Platforms

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to:
- **Fly.io** - Recommended for backend
- **Railway** - Easy full-stack deployment
- **Render** - Free tier available
- **DigitalOcean App Platform**

## 🔧 API Endpoints

### Problems
- `GET /api/problems` - List all problems
- `GET /api/problems/:id` - Get problem details
- `POST /api/problems` - Create problem (admin)

### Submissions
- `POST /api/submissions/submit` - Submit solution
- `POST /api/submissions/run` - Run code without submitting
- `GET /api/submissions/:id` - Get submission details

### Users
- `GET /api/users/:id/stats` - Get user statistics
- `GET /api/leaderboard` - Get global leaderboard

### Health
- `GET /api/health` - Service health check
- `GET /api/ready` - Readiness probe

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by LeetCode and competitive programming platforms
- Tower defense mechanics inspired by classic TD games
- Thanks to all contributors and testers

---

Made with ❤️ by the Code and Conquer Team

