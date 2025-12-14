
# Chat Interface

> **Note:** This is a hobby project created for learning Rust and experimenting with running LLMs locally. It is not intended for anything else.

A real-time chat application featuring multiple chat rooms, WebSocket-based messaging, and AI-powered autocomplete suggestions using a locally-run LLM (Ollama).

## Features

- **Real-time messaging** via WebSockets with Redis pub/sub for cross-instance communication
- **User authentication** with JWT tokens and secure password hashing (bcrypt)
- **Chat room management** - create, browse, and join chat rooms
- **AI autocomplete suggestions** - get context-aware message completions powered by Ollama (llama3.1:8b)
- **Scalable architecture** - run multiple API instances behind a custom load balancer
- **Consistent hash-based routing** - users are consistently routed to the same backend server
- **User presence tracking** - see who's online in each chat room with join/leave notifications
- **Rate limiting** - built-in protection against abuse

## Architecture

```
                    ┌─────────────────┐
                    │    Frontend     │
                    │  React + Vite   │
                    │   (Port 3000)   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │   Rust/Axum     │
                    │   (Port 8080)   │
                    └────────┬────────┘
                             │
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
      ┌─────────┐       ┌─────────┐       ┌─────────┐
      │  API 1  │       │  API 2  │       │  API N  │
      │  :8001  │       │  :8002  │       │  :800N  │
      └────┬────┘       └────┬────┘       └────┬────┘
           │                 │                 │
           └─────────────────┴─────────────────┘
                             │
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
      ┌─────────┐       ┌─────────┐       ┌─────────┐
      │Postgres │       │  Redis  │       │ Ollama  │
      │  :5434  │       │  :6379  │       │ :11434  │
      └─────────┘       └─────────┘       └─────────┘
```

### Components

| Component | Technology | Description |
|-----------|------------|-------------|
| **Frontend** | React 19, TypeScript, Vite, styled-components | Modern SPA with real-time WebSocket integration |
| **Load Balancer** | Rust, Axum, Tower | Custom LB with hash ring routing, health checks, rate limiting |
| **API Backend** | Rust, Axum, SeaORM | RESTful API + WebSocket handlers, JWT auth, Ollama integration |
| **Database** | PostgreSQL 16 | Persistent storage for users, chats, and messages |
| **Cache/PubSub** | Redis 7 | Session caching and real-time message broadcasting |
| **LLM** | Ollama (llama3.1:8b) | Local LLM for chat autocomplete suggestions |

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Rust](https://rustup.rs/) (edition 2024)
- [Node.js](https://nodejs.org/) (v18+)
- [Ollama](https://ollama.ai/) (optional, for AI suggestions)

## Getting Started

### 1. Start Infrastructure

Start PostgreSQL, Redis, and run database migrations:

```bash
docker-compose up -d
```

### 2. Start the Backend

```bash
# Terminal 1 - API server
cd api
DOMAIN=http://localhost:3000 cargo run

# Terminal 2 - Load balancer
cd load-balancer
cargo run
```

### 3. Start the Frontend

```bash
cd ui
npm install
npm run dev
```

The app will be available at **http://localhost:3000**

### 4. (Optional) AI Autocomplete with Ollama

For AI-powered message suggestions, install [Ollama](https://ollama.ai/) and run:

```bash
ollama pull llama3.1:8b
ollama serve
```

When typing in a chat, pause a bit to see suggestions. Press **Tab** to accept.

## License

This project is for educational purposes.

