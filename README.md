# FinSight — Personal Finance Intelligence Platform

![CI](https://github.com/farhanbin65/finance-tracker-dessertation/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.12-blue)
![Flask](https://img.shields.io/badge/flask-3.x-lightgrey)
![React](https://img.shields.io/badge/react-18-61DAFB)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6)
![MongoDB](https://img.shields.io/badge/mongodb-atlas-47A248)
![Auth0](https://img.shields.io/badge/auth0-secured-EB5424)
![Groq](https://img.shields.io/badge/groq-llama--3.1-orange)
![Vercel](https://img.shields.io/badge/deployed-vercel-black)

A production-grade personal finance web application built as a university dissertation project. FinSight combines secure transaction tracking, intelligent budget planning, savings goal management, and an AI-powered financial assistant — all within a modern, accessible, mobile-first interface.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Security](#security)
- [Dissertation Context](#dissertation-context)
- [Roadmap](#roadmap)
- [License](#license)

---

## Overview

FinSight addresses a clear gap in the personal finance market: most budgeting tools are either too complex for everyday users or too shallow for meaningful financial insight. FinSight sits in the middle — offering bank-grade security, real-time spending analysis, and an AI assistant that speaks plain English.

The project was designed and built to demonstrate full-stack engineering competence, secure system design, and human-centred product thinking at a dissertation level.

---

## Features

### Core Features

| Feature | Description |
|---|---|
| Secure Authentication | JWT-based auth with Auth0 OAuth and Google Sign-In |
| Transaction Management | Add, edit, delete and categorise income and expenses |
| Budget Planner | Monthly category budgets with real-time spend tracking |
| Savings Goals | Goal-based saving with progress rings and deposit tracking |
| AI Financial Assistant | Groq-powered Llama 3.1 chatbot with personal financial context |
| Profile and Security Center | Biometric toggle, fraud alerts, GDPR data export, session management |
| Theme System | Five colour palettes with dark and light mode, persisted to localStorage |

### Security Features

- AES-256 data encryption in transit
- Bcrypt password hashing with cost factor 12
- JWT access tokens (1 hour) and refresh tokens (7 days)
- Rate limiting on all authentication endpoints
- CORS restricted to known frontend origins
- GDPR-compliant data export and account deletion
- Auth0 integration for enterprise-grade OAuth flows

---

## System Architecture

```mermaid
flowchart LR
  subgraph Client["Frontend - React + Vite"]
    A["Login / Register"]
    B["Transactions"]
    C["Budget Planner"]
    D["Savings Goals"]
    E["AI Chat"]
    F["Profile / Security"]
  end

  subgraph Auth["Authentication Layer"]
    G["Auth0 OAuth"]
    H["JWT Token"]
  end

  subgraph API["Backend - Flask REST API"]
    I["auth routes"]
    J["transactions routes"]
    K["budgets routes"]
    L["goals routes"]
    M["chat routes"]
  end

  subgraph AI["AI Layer"]
    N["Groq API"]
    O["Llama 3.1 8B Instant"]
  end

  subgraph DB["Database Layer"]
    P["MongoDB Atlas"]
    Q["users"]
    R["transactions"]
    S["budgets"]
    T["goals"]
  end

  A -->|"OAuth flow"| G
  G -->|"issues"| H
  H -->|"Bearer token"| API

  B --> J
  C --> K
  D --> L
  E --> M

  M -->|"prompt + context"| N
  N --> O
  O -->|"AI reply"| M

  I & J & K & L --> P
  P --> Q & R & S & T
```

---

## System Design

### Use Case Diagram
```mermaid
flowchart LR
  Guest["Guest User"]
  AuthUser["Authenticated User"]
  Auth0["Auth0"]
  Groq["Groq AI"]

  subgraph FinSight["FinSight Platform"]
    UC1(("Register account"))
    UC2(("Login with email/password"))
    UC3(("Login with Google/GitHub"))
    UC4(("Reset password"))
    UC5(("Add transaction"))
    UC6(("Edit / delete transaction"))
    UC7(("Search history"))
    UC8(("View monthly summary"))
    UC9(("Create budget"))
    UC10(("Track budget progress"))
    UC11(("Create savings goal"))
    UC12(("Deposit to goal"))
    UC13(("Chat with AI assistant"))
    UC14(("Get spending insights"))
    UC15(("View dashboard"))
    UC16(("Update profile / theme"))
  end

  Guest --> UC1
  Guest --> UC2
  Guest --> UC3
  Guest --> UC4

  AuthUser --> UC5
  AuthUser --> UC6
  AuthUser --> UC7
  AuthUser --> UC8
  AuthUser --> UC9
  AuthUser --> UC10
  AuthUser --> UC11
  AuthUser --> UC12
  AuthUser --> UC13
  AuthUser --> UC14
  AuthUser --> UC15
  AuthUser --> UC16

  UC1 -.-> Auth0
  UC2 -.-> Auth0
  UC3 -.-> Auth0
  UC4 -.-> Auth0
  UC13 -.-> Groq
  UC14 -.-> Groq
```

### Sequence — Auth Flow
![Sequence Diagram: Login & JWT Auth Flow](docs/diagrams/finsight_sequence_auth.svg)

### Sequence — Transaction CRUD
![Sequence Diagram: Transaction CRUD Flow](docs/diagrams/finsight_sequence_transactions.svg)

### Class Diagram
![Class Diagram: Models Layer](docs/diagrams/finsight_class_diagram.svg)

## Tech Stack

### Frontend

| Technology | Purpose |
|---|---|
| React 18 | Component-based UI framework |
| TypeScript 5 | Type safety across all components |
| Vite | Fast build tooling and dev server |
| Tailwind CSS | Utility-first styling |
| React Router v6 | Client-side routing with auth guards |
| Auth0 React SDK | OAuth and session management |

### Backend

| Technology | Purpose |
|---|---|
| Flask 3 | Lightweight Python REST API framework |
| PyMongo | MongoDB driver for Python |
| Pydantic v2 | Request validation and schema enforcement |
| PyJWT | JWT token generation and verification |
| Bcrypt | Secure password hashing |
| Flask-Limiter | Rate limiting on sensitive endpoints |
| Flask-CORS | Cross-origin request handling |
| Groq SDK | AI chat completions via Llama 3.1 |

### Infrastructure

| Technology | Purpose |
|---|---|
| MongoDB Atlas | Cloud-hosted NoSQL database |
| Auth0 | Identity and access management |
| Vercel | Frontend hosting with CI/CD |
| Render | Backend hosting with auto-deploy |
| GitHub Actions | Automated testing and deployment pipeline |

---

## Project Structure

```
finance-tracker-dissertation/
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py           # Register, login, refresh
│   │   │   ├── transactions.py   # CRUD + category filtering
│   │   │   ├── budgets.py        # Monthly budget management
│   │   │   ├── goals.py          # Savings goals + deposits
│   │   │   └── chat.py           # AI chat with Groq
│   │   ├── core/
│   │   │   ├── config.py         # Environment configuration
│   │   │   ├── security.py       # JWT + auth decorators
│   │   │   └── logging.py        # Structured JSON logging
│   │   ├── db/
│   │   │   └── mongo.py          # MongoDB connection + ping
│   │   ├── models/
│   │   │   ├── transaction.py    # Pydantic transaction schema
│   │   │   ├── budget.py         # Pydantic budget schema
│   │   │   ├── goal.py           # Pydantic goal schema
│   │   │   └── user.py           # Pydantic user schema
│   │   └── main.py               # App entrypoint
│   ├── .env.example
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   ├── TransactionsPage.tsx
│   │   │   ├── BudgetPage.tsx
│   │   │   ├── GoalsPage.tsx
│   │   │   ├── ChatPage.tsx
│   │   │   └── ProfilePage.tsx
│   │   ├── components/
│   │   │   └── layout/
│   │   │       ├── AppLayout.tsx
│   │   │       ├── TopBar.tsx
│   │   │       └── BottomNav.tsx
│   │   ├── contexts/
│   │   │   └── ThemeContext.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example
│   ├── vercel.json
│   └── package.json
│
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## Getting Started

### Prerequisites

- Node.js 18 or above
- Python 3.12
- MongoDB Atlas account
- Auth0 account
- Groq API key (free at console.groq.com)

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/farhanbin65/finance-tracker-dessertation.git
cd finance-tracker-dessertation/backend

# Create and activate virtual environment
python -m venv .venv
source .venv/Scripts/activate   # Windows
source .venv/bin/activate        # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Copy environment file and fill in values
cp .env.example .env

# Start the development server
python -m app.main
```

Backend runs at `http://localhost:5000`

### Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install

# Copy environment file and fill in values
cp .env.example .env

# Start the development server
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## Environment Variables

### Backend `.env`

```bash
# MongoDB
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGO_DB_NAME=finsight_db

# JWT
JWT_SECRET=your-super-secret-key-here
JWT_ACCESS_EXPIRY_HOURS=1
JWT_REFRESH_EXPIRY_DAYS=7

# Auth0
AUTH0_DOMAIN=your-tenant.uk.auth0.com
AUTH0_AUDIENCE=your-client-id

# AI
GROQ_API_KEY=gsk_your_groq_key_here

# App
FLASK_DEBUG=true
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend `.env`

```bash
VITE_AUTH0_DOMAIN=your-tenant.uk.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_CALLBACK_URL=http://localhost:5173/callback
VITE_API_URL=http://localhost:5000
```

---

## API Reference

All protected endpoints require `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and receive tokens |
| POST | `/api/auth/refresh` | Refresh access token |

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transactions` | List all transactions |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction |
| GET | `/api/transactions/summary/monthly` | Monthly summary |

### Budgets

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/budgets` | Get current month budgets |
| POST | `/api/budgets` | Create budget category |
| PUT | `/api/budgets/:id` | Update budget limit |
| DELETE | `/api/budgets/:id` | Delete budget category |

### Goals

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/goals` | List all savings goals |
| POST | `/api/goals` | Create savings goal |
| POST | `/api/goals/:id/deposit` | Add money to goal |
| PUT | `/api/goals/:id` | Update goal |
| DELETE | `/api/goals/:id` | Delete goal |

### AI Chat

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Send message to AI assistant |

---

## Security

FinSight was designed with a security-first approach aligned to OWASP Top 10 and UK GDPR principles.

- **A01 Broken Access Control** — JWT auth guard on all private routes, user-scoped queries enforce data isolation
- **A02 Cryptographic Failures** — AES-256 in transit via HTTPS, Bcrypt cost factor 12 for password storage
- **A03 Injection** — Pydantic v2 validates and sanitises all inputs before they reach the database layer
- **A07 Auth Failures** — Rate limiting on login and register endpoints, short-lived access tokens
- **GDPR** — Data export endpoint, account deletion, consent captured at registration

---

## Dissertation Context

This project was developed as a final-year Computing Systems dissertation at a UK university. The system demonstrates competence across the following assessed areas.

| Area | Implementation |
|---|---|
| Full-stack development | React frontend, Flask REST API, MongoDB database |
| Security engineering | JWT, Bcrypt, rate limiting, OWASP alignment |
| AI integration | Groq Llama 3.1 with financial context injection |
| System design | Modular blueprint architecture, factory pattern |
| DevOps | Docker, GitHub Actions CI/CD, cloud deployment |
| UX design | Mobile-first, accessible, WCAG-aligned interface |

---

## Roadmap

- Open Banking API integration via TrueLayer
- Spending forecast using ML regression model
- Push notifications for budget alerts
- CSV and PDF export for transaction history
- Multi-currency support
- Shared household budgets

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

Built by Farhan Bin Hossain as part of a BSc Computing Systems dissertation.