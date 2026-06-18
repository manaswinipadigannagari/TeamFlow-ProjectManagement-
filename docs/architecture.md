# TeamFlow System Architecture Documentation

TeamFlow is a Jira-style agile project management and team collaboration dashboard designed for modern development groups.

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, TypeScript, React Router, TanStack React Query, Lucide Icons, Zustand (State Management), React Hook Form, Zod (Validation).
- **Backend**: Node.js, Express.js, TypeScript, Mongoose, Socket.io, Winston Logger, JWT.
- **Database**: MongoDB (Local or Atlas).

## Folder Structure

```
/
├── client/                 # React frontend
│   ├── src/
│   │   ├── app/            # App entrypoint and CSS
│   │   ├── components/     # Reusable global UI components (Toast, etc)
│   │   ├── features/       # Feature-sliced modules (auth, board, sprints, settings, etc)
│   │   ├── layouts/        # Layout shells (DashboardLayout)
│   │   ├── lib/            # Axios API instances, utility hooks
│   │   ├── stores/         # Zustand global state (auth, presence)
│   │   └── types/          # Re-exported shared typings
│   └── eslint.config.js    # Client lint config
│
├── server/                 # Express backend
│   ├── src/
│   │   ├── config/         # DB connection, Socket.io, Mailer configurations
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth checks, errorHandler, RBAC middleware
│   │   ├── models/         # MongoDB schemas and models
│   │   ├── routes/         # Express endpoint definitions
│   │   ├── schemas/        # Request body validator schemas
│   │   ├── scripts/        # Seeding and script triggers
│   │   └── utils/          # Helpers for JWT, notifications, error handlers
│   └── eslint.config.js    # Server lint config
│
├── shared/                 # Reusable monorepo TypeScript schemas
│   └── index.ts            # Exported interfaces
│
└── docs/                   # System and Deployment documentation
    └── architecture.md     # This document
```

## Authentication Flow

1. **Sign In / Registration**: Client submits payload to `/api/v1/auth/login` or `/api/v1/auth/register`.
2. **Access Token**: Server issues a short-lived JWT Access Token in the JSON payload response.
3. **Refresh Token**: Server issues a long-lived JWT Refresh Token inside an HTTP-only secure cookie.
4. **Token Refresh**: Client's Axios interceptors capture any 401 errors, trigger `/api/v1/auth/refresh`, and transparently retry the failed request using the new access token.

## Websocket Presence & Real-time Collaboration

- **Socket Rooms**: Users join workspace and project rooms inside Socket.io.
- **Activity Stream**: Moves or additions of task cards trigger event broadcasts to sync Kanban board states in real-time.
- **Online Presence**: Tracks who is active inside the workspace.

## CI/CD Pipeline

We configure automated checks using **GitHub Actions** to compile, lint, and run tests.

- **Frontend** is deployed automatically to **Vercel** on pushes to the `main` branch.
- **Backend** is deployed to **Render** with MongoDB Atlas acting as the database layer.
