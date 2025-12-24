# 💬 Anonymous Chat Application

A real-time, anonymous chat application enabling private conversations between two users via room codes. Built with **NestJS**, **MongoDB**, **Redis**, **Vue 3**, and **Socket.io**.

![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![NestJS](https://img.shields.io/badge/NestJS-11.x-red?logo=nestjs)
![Vue](https://img.shields.io/badge/Vue-3.5-green?logo=vue.js)
![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green?logo=mongodb)
![Redis](https://img.shields.io/badge/Redis-7.x-red?logo=redis)
![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [API Documentation](#-api-documentation)
- [WebSocket Events](#-websocket-events)
- [Project Structure](#-project-structure)
- [Environment Variables](#-environment-variables)
- [Screenshots](#-screenshots)

---

## ✨ Features

### Core Features
- **🔒 Anonymous Chat** - No registration required, privacy-first design
- **🎫 Room Codes** - Create/join rooms with 6-character unique codes
- **💬 Real-time Messaging** - Instant message delivery via WebSocket
- **😀 Emoji Support** - Full emoji picker with emoji-only message detection
- **⌨️ Typing Indicators** - See when the other person is typing
- **👍 Message Reactions** - React to messages (like, love, laugh, wow, sad, angry)
- **🗑️ Message Deletion** - Soft delete with "This message was deleted" placeholder
- **📜 Chat History** - View, archive, and delete past conversations
- **🚪 Chat Closure** - Close chats manually or auto-close when both leave

### Technical Features
- **🔄 Horizontal Scaling** - Redis adapter for multi-instance WebSocket support
- **⚡ Background Jobs** - BullMQ for async message processing
- **🛡️ Rate Limiting** - HTTP & WebSocket throttling protection
- **🔐 Security Hardened** - XSS sanitization, Helmet headers, CORS
- **📊 Caching** - Redis caching for rooms and sessions
- **🎨 Atomic Design** - Component library (atoms/molecules/organisms)

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|------------|---------|
| **NestJS 11** | API framework with modular architecture |
| **MongoDB 7** | Primary database for messages and rooms |
| **Redis 7** | Caching, sessions, Pub/Sub for WebSocket |
| **Socket.io** | Real-time bidirectional communication |
| **BullMQ** | Background job processing |
| **Mongoose** | MongoDB ODM with schema validation |

### Frontend
| Technology | Purpose |
|------------|---------|
| **Vue 3.5** | Composition API with `<script setup>` |
| **TypeScript 5.9** | Type-safe development |
| **Pinia 3** | State management |
| **Tailwind CSS 4** | Utility-first styling |
| **Socket.io Client** | Real-time communication |
| **Vue Router 4** | SPA routing |

### DevOps
| Technology | Purpose |
|------------|---------|
| **Docker Compose** | Container orchestration |
| **Nginx** | Frontend static serving & reverse proxy |
| **Husky** | Git hooks for commit linting |

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (Vue 3)                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  HomeView   │  │  ChatView   │  │ HistoryView │  │    Pinia Stores     │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  │ (Session/Room/Chat) │ │
│                                                     └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                    │ REST API              │ WebSocket (Socket.io)
                    ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BACKEND (NestJS)                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         API Gateway Layer                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ RoomCtrl    │  │ MessageCtrl │  │ HistoryCtrl │  │ ChatGateway │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                         Service Layer                                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │ RoomService │  │ MsgService  │  │ SessionSvc  │  │ HistorySvc  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                       Repository Layer                               │   │
│  │  ┌────────────────────────────────┐  ┌──────────────────────────────┐│   │
│  │  │       RoomRepository           │  │      MessageRepository       ││   │
│  │  └────────────────────────────────┘  └──────────────────────────────┘│   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
          │                    │                    │
          ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────────────┐
│    MongoDB      │  │     Redis       │  │           BullMQ                │
│  (Persistence)  │  │ (Cache/Pub-Sub) │  │  (Message & Room Processors)    │
└─────────────────┘  └─────────────────┘  └─────────────────────────────────┘
```

### Horizontal Scaling Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         LOAD BALANCER (Nginx)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   NestJS API    │         │   NestJS API    │         │   NestJS API    │
│   Instance 1    │         │   Instance 2    │         │   Instance N    │
└─────────────────┘         └─────────────────┘         └─────────────────┘
          │                           │                           │
          └───────────────────────────┼───────────────────────────┘
                                      │
     ┌────────────────────────────────┼────────────────────────────────┐
     │                                │                                │
     ▼                                ▼                                ▼
┌──────────────┐              ┌──────────────┐               ┌──────────────┐
│    Redis     │◄────────────►│   MongoDB    │◄─────────────►│   BullMQ     │
│   Cluster    │              │   Replica    │               │   Workers    │
└──────────────┘              └──────────────┘               └──────────────┘
        │
        │ Pub/Sub for cross-instance
        │ WebSocket event broadcasting
        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Socket.io Redis Adapter                              │
│           Enables real-time events across all server instances              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Design Patterns
- **Repository Pattern** - Data access abstraction
- **Service Layer** - Business logic isolation
- **Gateway Pattern** - WebSocket event handling
- **Atomic Design** - Component organization (atoms → molecules → organisms)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20.x or 22.x
- pnpm 8.x+
- Docker & Docker Compose (for containerized setup)

### Quick Start with Docker

```bash
# Clone the repository
git clone https://github.com/your-username/anonymous-chat.git
cd anonymous-chat

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

Access the app at: **http://localhost:3000**

### Local Development

#### 1. Start Infrastructure
```bash
# Start MongoDB and Redis
docker-compose up -d mongodb redis
```

#### 2. Backend Setup
```bash
cd backend

# Install dependencies
pnpm install

# Create environment file
cp .env.example .env

# Start development server
pnpm start:dev
```

Backend runs at: **http://localhost:4000**

#### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Frontend runs at: **http://localhost:5173**

---

## 📡 API Documentation

### Base URL
```
http://localhost:4000/api/v1
```

### Authentication
All endpoints require `X-Session-Id` header (auto-generated UUID stored in localStorage).

### Room Endpoints

#### Create Room
```http
POST /rooms/create
Content-Type: application/json
X-Session-Id: <session-id>

{
  "displayName": "Anonymous User"
}
```

**Response (201)**
```json
{
  "success": true,
  "data": {
    "roomId": "019123ab-cdef-7000-8000-000000000001",
    "roomCode": "ABC123",
    "createdAt": "2025-12-18T10:00:00.000Z"
  }
}
```

#### Join Room
```http
POST /rooms/join
Content-Type: application/json
X-Session-Id: <session-id>

{
  "roomCode": "ABC123",
  "displayName": "Anonymous User 2"
}
```

#### Get Room Details
```http
GET /rooms/:roomId
X-Session-Id: <session-id>
```

#### Leave Room
```http
POST /rooms/:roomId/leave
X-Session-Id: <session-id>
```

#### Close Room
```http
POST /rooms/:roomId/close
X-Session-Id: <session-id>
```

---

### Message Endpoints

#### Send Message
```http
POST /messages
Content-Type: application/json
X-Session-Id: <session-id>

{
  "roomId": "019123ab-cdef-7000-8000-000000000001",
  "content": "Hello! 👋",
  "contentType": "text"
}
```

#### Get Messages (Paginated)
```http
GET /messages?roomId=<roomId>&limit=50&before=<messageId>
X-Session-Id: <session-id>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "messageId": "...",
        "roomId": "...",
        "senderId": "...",
        "senderName": "Anonymous User",
        "content": "Hello! 👋",
        "contentType": "text",
        "isDeleted": false,
        "reactions": [
          { "type": "like", "count": 1, "userReacted": false }
        ],
        "createdAt": "2025-12-18T10:00:00.000Z"
      }
    ],
    "hasMore": false,
    "nextCursor": null
  }
}
```

#### Delete Message
```http
DELETE /messages/:messageId
X-Session-Id: <session-id>
```

#### Add Reaction
```http
POST /messages/:messageId/reactions
Content-Type: application/json
X-Session-Id: <session-id>

{
  "type": "like"
}
```

#### Remove Reaction
```http
DELETE /messages/:messageId/reactions/:type
X-Session-Id: <session-id>
```

---

### History Endpoints

#### Get Chat History
```http
GET /history?includeArchived=false
X-Session-Id: <session-id>
```

**Response (200)**
```json
{
  "success": true,
  "data": {
    "chats": [
      {
        "roomId": "...",
        "roomCode": "ABC123",
        "otherParticipant": "Anonymous User 2",
        "lastMessage": "See you later!",
        "lastMessageAt": "2025-12-18T10:00:00.000Z",
        "status": "active",
        "isArchived": false,
        "createdAt": "2025-12-18T09:00:00.000Z"
      }
    ]
  }
}
```

#### Archive Chat
```http
POST /history/:roomId/archive
X-Session-Id: <session-id>
```

#### Unarchive Chat
```http
POST /history/:roomId/unarchive
X-Session-Id: <session-id>
```

#### Delete from History
```http
DELETE /history/:roomId
X-Session-Id: <session-id>
```

---

## 🔌 WebSocket Events

### Connection
```javascript
import { io } from 'socket.io-client'

const socket = io('http://localhost:4000/chat', {
  auth: { sessionId: 'your-session-id' }
})
```

### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join_room` | `{ roomId: string }` | Join a chat room |
| `leave_room` | `{ roomId: string }` | Leave a chat room |
| `send_message` | `{ roomId, content, contentType }` | Send a message |
| `typing` | `{ roomId, isTyping: boolean }` | Typing indicator |
| `add_reaction` | `{ messageId, type }` | Add reaction to message |
| `remove_reaction` | `{ messageId, type }` | Remove reaction |
| `delete_message` | `{ messageId }` | Delete a message |

### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `user_joined` | `{ roomId, userId, displayName, participantCount }` | User joined room |
| `user_left` | `{ roomId, userId, displayName, participantCount }` | User left room |
| `new_message` | `Message object` | New message received |
| `message_deleted` | `{ messageId, roomId, deletedBy }` | Message was deleted |
| `reaction_added` | `{ messageId, type, userId, count }` | Reaction added |
| `reaction_removed` | `{ messageId, type, userId, count }` | Reaction removed |
| `user_typing` | `{ roomId, userId, displayName, isTyping }` | Typing status |
| `room_closed` | `{ roomId, closedBy }` | Room was closed |
| `error` | `{ message, code }` | Error occurred |

---

## 📁 Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── common/                 # Shared utilities
│   │   │   ├── decorators/         # Custom decorators
│   │   │   ├── exceptions/         # Business exceptions
│   │   │   ├── filters/            # Exception filters
│   │   │   ├── guards/             # Auth & throttle guards
│   │   │   ├── interceptors/       # Logging & transform
│   │   │   ├── pipes/              # Validation & sanitization
│   │   │   └── utils/              # Helper functions
│   │   ├── config/                 # Redis module config
│   │   ├── gateways/               # WebSocket gateway
│   │   ├── modules/
│   │   │   ├── history/            # History management
│   │   │   ├── message/            # Message CRUD & reactions
│   │   │   ├── room/               # Room management
│   │   │   └── session/            # Session handling
│   │   ├── queues/                 # BullMQ processors
│   │   ├── app.module.ts           # Root module
│   │   └── main.ts                 # Entry point
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── atoms/              # Button, Input, Badge, Avatar
│   │   │   ├── molecules/          # Modal, MessageBubble, Toast
│   │   │   └── organisms/          # ChatHeader, MessageList, MessageInput
│   │   ├── layouts/                # DefaultLayout
│   │   ├── router/                 # Vue Router config
│   │   ├── services/
│   │   │   ├── api/                # REST API clients
│   │   │   └── socket.ts           # Socket.io client
│   │   ├── stores/                 # Pinia stores
│   │   ├── types/                  # TypeScript interfaces
│   │   ├── utils/                  # Formatters & constants
│   │   ├── views/                  # Page components
│   │   ├── App.vue
│   │   └── main.ts
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml              # Production compose
├── docker-compose.dev.yml          # Development compose
└── README.md
```

---

## ⚙️ Environment Variables

### Backend (.env)
```bash
# Server
NODE_ENV=development
PORT=4000
API_PREFIX=api/v1

# Database
MONGODB_URI=mongodb://admin:password123@localhost:27017/anonymous_chat?authSource=admin

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100
```

### Frontend (.env)
```bash
VITE_API_URL=http://localhost:4000/api/v1
VITE_SOCKET_URL=http://localhost:4000
```

---

## 📸 Screenshots

### Home Page
Create a new room or join an existing one with a room code.

### Chat Room
Real-time messaging with emoji picker, typing indicators, and reactions.

### History View
View past conversations, archive, or delete them.

---

## 🧪 Testing

### Backend
```bash
cd backend

# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:cov
```

### Frontend
```bash
cd frontend

# Unit tests
pnpm test:unit

# E2E tests
pnpm test:e2e
```

---

## 📝 License

MIT © Jatin Suneja

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request