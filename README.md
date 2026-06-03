# FinSight — Personal Finance Intelligence Platform

> Final Year Dissertation · BSc Computing Systems · Ulster University · 2026

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

## 🚀 Live Demo
[finance-tracker-five-umber.vercel.app](https://finance-tracker-five-umber.vercel.app)

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

### Sequence — Auth Flow
```mermaid
sequenceDiagram
  autonumber
  actor Browser
  participant Frontend as React Frontend
  participant Backend as Flask Backend
  participant Auth0 as Auth0
  participant MongoDB as MongoDB Atlas
  participant JWT as PyJWT / localStorage

  Browser->>Frontend: Submit credentials
  Frontend->>Backend: POST /api/auth/login
  Backend->>MongoDB: Find user by email
  MongoDB-->>Backend: User document
  Backend->>Backend: bcrypt.verify(password, hash)
  Backend->>JWT: Encode access + refresh tokens
  JWT-->>Frontend: Access token + refresh token
  Frontend->>JWT: localStorage.setItem('fs_token', ...)
  Frontend-->>Browser: Navigate to /dashboard

  Browser->>Frontend: Click Google / GitHub button
  Frontend->>Auth0: Redirect to Auth0 universal login
  Auth0-->>Frontend: Callback with id_token
  Frontend->>Backend: Auth0 token via hybrid guard
  Backend-->>Frontend: Access granted
  Frontend-->>Browser: Navigate to /dashboard
```

---

### Sequence — Transaction CRUD
```mermaid
sequenceDiagram
  autonumber
  actor User
  participant Frontend as React Frontend
  participant Backend as Flask Backend
  participant MongoDB as MongoDB Atlas

  User->>Frontend: Fill form and tap save
  Frontend->>Backend: POST /api/transactions + Bearer JWT
  Backend->>Backend: Client-side validation (Pydantic schema)
  Backend->>MongoDB: insertOne(transaction)
  MongoDB-->>Backend: inserted_id
  Backend-->>Frontend: 201 Created - new transaction
  Frontend-->>User: Show toast + update list

  User->>Frontend: Open edit modal
  Frontend->>Backend: PUT /api/transactions/:id + Bearer JWT
  Backend->>MongoDB: updateOne({ _id, user_id })
  MongoDB-->>Backend: modified_count: 1
  Backend-->>Frontend: 200 OK - updated document
  Frontend-->>User: Close modal + refresh list

  User->>Frontend: Confirm delete dialog
  Frontend->>Backend: DELETE /api/transactions/:id + Bearer JWT
  Backend->>MongoDB: deleteOne({ _id, user_id })
  MongoDB-->>Backend: deleted_count: 1
  Backend-->>Frontend: 200 OK - success
  Frontend-->>User: Show toast + remove from list
```

---

### Class Diagram
```mermaid
classDiagram
  class User {
    +ObjectId _id
    +str full_name
    +str email
    +str password_hash
    +str currency
    +datetime created_at
  }

  class Transaction {
    +ObjectId _id
    +ObjectId user_id
    +str title
    +float amount
    +str type
    +str category
    +datetime date
    +str notes
  }

  class Budget {
    +ObjectId _id
    +ObjectId user_id
    +str category
    +float limit
    +float spent
    +int month
    +int year
  }

  class Goal {
    +ObjectId _id
    +ObjectId user_id
    +str name
    +float target_amount
    +float saved_amount
    +datetime target_date
    +bool is_completed
  }

  class ChatMessage {
    +ObjectId _id
    +ObjectId user_id
    +str role
    +str content
    +str model
    +datetime created_at
  }

  User "1" --> "many" Transaction : owns
  User "1" --> "many" Budget : owns
  User "1" --> "many" Goal : owns
  User "1" --> "many" ChatMessage : owns
```

---


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