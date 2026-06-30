# FinSight — Personal Finance Intelligence Platform

> Final Year Dissertation · BSc Computing Systems · Ulster University · 2026

![Status](https://img.shields.io/badge/status-live-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Python](https://img.shields.io/badge/python-3.12-blue)
![Flask](https://img.shields.io/badge/flask-3.x-lightgrey)
![React](https://img.shields.io/badge/react-18-61DAFB)
![TypeScript](https://img.shields.io/badge/typescript-5.x-3178C6)
![MongoDB](https://img.shields.io/badge/mongodb-atlas-47A248)
![Auth0](https://img.shields.io/badge/auth0-secured-EB5424)
![Groq](https://img.shields.io/badge/groq-llama--3.1-orange)
![Vercel](https://img.shields.io/badge/deployed-vercel-black)
![PyPI](https://img.shields.io/badge/pypi-fintech--llm--guard-blueviolet)

A production-grade personal finance web application built as a university dissertation project. FinSight combines secure transaction tracking, intelligent budget planning, savings goal management, explainable AI spending predictions, statistical anomaly detection, proactive alerting, and a privacy-aware financial assistant — all within a modern, accessible, mobile-first interface.

## Live Demo

[finance-tracker-five-umber.vercel.app](https://finance-tracker-five-umber.vercel.app)

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [System Architecture](#system-architecture)
- [AI Safety Research — fintech-llm-guard](#ai-safety-research--fintech-llm-guard)
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

FinSight addresses a clear gap in the personal finance market: most budgeting tools are either too complex for everyday users or too shallow for meaningful financial insight, and almost none explain their predictions or proactively flag unusual activity in a way users can trust. FinSight sits in the middle — offering bank-grade security, real-time spending analysis, explainable AI forecasting, statistical anomaly detection, and a financial assistant that speaks plain English.

The project was designed and built to demonstrate full-stack engineering competence, secure system design, applied machine learning, and human-centred product thinking at a dissertation level.

---

## Features

### Core Features

| Feature | Description |
|---|---|
| Secure Authentication | JWT-based auth with Auth0 OAuth hybrid login, role-based access control separating admin and standard users |
| Transaction Management | Full CRUD on income and expenses, category tagging, search and filtering |
| Budget Planner | Monthly category budgets with real-time spend tracking, percentage utilisation and alert thresholds |
| Savings Goals | Goal-based saving with progress tracking, deposit history and deadline projection |
| AI Financial Assistant | Groq-powered Llama 3.1 chatbot with personal financial context and persistent, MongoDB-backed chat history |
| Chat Message Management | Per-message deletion of a user message and its paired AI response, plus full history clearing |
| Explainable Spending Predictions | Random Forest regression forecasting with SHAP feature-attribution explanations, showing which categories drove a prediction |
| Anomaly Detection | Statistical threshold detection (mean + 2 standard deviations) flagging unusual transactions per category, with human-readable explanations |
| Intelligent Alerts | Aggregated alert feed combining budget overspending, transaction anomalies and at-risk savings goals, surfaced on the dashboard |
| Data Export | CSV (Excel-ready, UTF-8 BOM) and branded PDF statement export of transaction history |
| GDPR Data Portability | Full personal data export under Article 20, covering profile, transactions, budgets, goals and a redacted audit log |
| Admin Dashboard | Platform-wide analytics across all users, account suspension, theme and display settings |
| In-App Usability Testing | iOS-style System Usability Scale questionnaire built into Settings, with results delivered live via Telegram |
| Profile and Security Centre | Biometric toggle, fraud alerts, active session display, account deletion |
| Theme System | Five colour palettes with dark and light mode, persisted to localStorage |

### Security Features

- AES-256 data encryption in transit (HTTPS)
- Bcrypt password hashing with cost factor 12
- JWT access tokens (1 hour) and refresh tokens (7 days)
- Rate limiting on all authentication endpoints
- CORS restricted to known frontend origins
- GDPR-compliant data export and account deletion
- Auth0 integration for OAuth flows
- AI safety middleware — see [AI Safety Research](#ai-safety-research--fintech-llm-guard) below

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
    G2["Insights / Predictions"]
    H2["Alerts Banner"]
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
    N2["insights routes"]
    O2["alerts routes"]
  end

  subgraph AI["AI Layer"]
    N["Groq API"]
    O["Llama 3.1 8B Instant"]
  end

  subgraph ML["Insights Layer"]
    P2["Random Forest Regressor"]
    Q2["SHAP Explainer"]
    R2["Anomaly Detector - mean plus 2SD"]
  end

  subgraph DB["Database Layer"]
    P["MongoDB Atlas"]
    Q["users"]
    R["transactions"]
    S["budgets"]
    T["goals"]
    U2["chat_messages"]
  end

  A -->|"OAuth flow"| G
  G -->|"issues"| H
  H -->|"Bearer token"| API

  B --> J
  C --> K
  D --> L
  E --> M
  G2 --> N2
  H2 --> O2
  O2 --> R2

  M -->|"prompt + context"| N
  N --> O
  O -->|"AI reply"| M

  N2 --> P2
  P2 --> Q2
  Q2 -->|"feature attribution"| N2
  N2 --> R2
  R2 -->|"flagged transactions"| O2

  I & J & K & L & M & N2 & O2 --> P
  P --> Q & R & S & T & U2
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
    +float alert_threshold
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
    +datetime timestamp
  }

  User "1" --> "many" Transaction : owns
  User "1" --> "many" Budget : owns
  User "1" --> "many" Goal : owns
  User "1" --> "many" ChatMessage : owns
```

---

## AI Safety Research — fintech-llm-guard

FinSight is the live proof-of-concept for **fintech-llm-guard**, an open-source Python package (published to PyPI, v0.3.0) implementing a multi-layer guardrail pipeline for large language models in financial applications. The package was developed alongside this dissertation and underpins a paper submitted to **GSAM 2026** under the theme of trustworthy AI for intelligent systems.

The pipeline implements:

- **Layer 0** — Provenance tracking and risk scoring of incoming messages
- **Layer 1** — Input sanitiser for prompt-injection detection
- **Layer 2** — Structural separator, keeping user data and model instructions apart
- **Layer 3** — PII redaction and pseudonymisation before any data reaches the LLM
- **Layer 4** — Output validator and action allow-list on the model's response
- **Canary tokens** — Detection of system-prompt exfiltration attempts

```mermaid
flowchart LR
  MSG["User Message"] --> L0["Layer 0 - Provenance + Risk Scoring"]
  L0 --> L1["Layer 1 - Input Sanitiser"]
  L1 --> L2["Layer 2 - Structural Separator"]
  L2 --> L3["Layer 3 - PII Redaction"]
  L3 --> LLM["LLM via Groq Adapter"]
  LLM --> L4["Layer 4 - Output Validator"]
  L4 --> CAN["Canary - Context Leakage Check"]
  CAN --> OUT["Safe Response to User"]
```

**Production status:** The guardrail's NLP dependencies (spaCy and associated language models) could not be co-located with the SHAP and scikit-learn forecasting stack inside a single process under the 512 MB memory ceiling of the Render free tier. The pipeline is fully implemented, unit-tested, and demonstrated locally; the production deployment currently calls the Groq API directly while preserving the privacy-first posture through strict payload minimisation (a rolling window of recent transactions, no user identifiers transmitted). This trade-off, and the four-tier hybrid privacy model adopted in response, is documented in **ADR-002** and discussed further under [Roadmap](#roadmap).

PyPI package: `pip install fintech-llm-guard`

---

## Mobile Deployment (iOS)

FinSight ships as a native iOS app via Capacitor, wrapping the production React build for App Store-style distribution alongside the web and API deployments.

**Architecture decision:** the Capacitor WebView loads the built frontend bundle locally on-device (`webDir: dist`) rather than pointing to the live Vercel URL via `server.url`. Loading a remote origin from within `WKWebView` triggered ATS/origin-resolution failures that produced a persistent blank render with no recoverable native error — serving the bundle locally and routing only API calls over HTTPS to the Render backend avoided this class of failure entirely while keeping a single source of truth for the UI codebase.

**Notable issue resolved:** an early `ios/` platform scaffold was missing its window/root-view-controller wiring (no `UIApplicationSceneManifest`, empty `UIMainStoryboardFile`, default `AppDelegate` returning `true` with no `CAPBridgeViewController` instantiation) — a state that produces an identical blank screen to the ATS issue above but with a completely different root cause, since no WebView is ever attached to a window. Diagnosed via Safari Web Inspector reporting no inspectable application (confirming no WebView existed, vs. a WebView existing but failing to render), then resolved by regenerating the platform (`npx cap add ios`) from a clean `capacitor.config.ts`.

Build asset paths use Vite's relative `base: './'` to ensure correct resolution under Capacitor's local file-serving scheme, and the Flask backend's CORS allowlist includes `capacitor://localhost` alongside the web origins.

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
| jsPDF | Client-side branded PDF statement generation |

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

### Machine Learning and Explainability

| Technology | Purpose |
|---|---|
| scikit-learn | Random Forest regression for spending forecasts |
| SHAP | Feature-attribution explanations for predictions |
| pandas / NumPy | Feature engineering, lazily loaded to control memory footprint |
| Statistical anomaly detection | Mean + 2 standard deviation threshold per category, no training required |
| fintech-llm-guard | LLM guardrail middleware — prompt-injection detection, PII redaction, output validation (local/research environment) |

### Infrastructure

| Technology | Purpose |
|---|---|
| MongoDB Atlas | Cloud-hosted NoSQL database |
| Auth0 | Identity and access management |
| Vercel | Frontend hosting with CI/CD |
| Render | Backend hosting with auto-deploy |
| GitHub Actions | Automated testing and deployment pipeline |

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
VITE_TELEGRAM_BOT_TOKEN=your-telegram-bot-token
VITE_TELEGRAM_CHAT_ID=your-telegram-chat-id
```

---

## API Reference

All protected endpoints require an `Authorization: Bearer <token>` header.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login and receive tokens |
| POST | `/api/auth/auth0-login` | Exchange Auth0 session for FinSight JWT |
| GET | `/api/auth/me` | Get current authenticated user |
| GET | `/api/auth/export` | GDPR Article 20 — export all personal data as JSON |
| POST | `/api/auth/logout` | Log out and record audit event |

### Transactions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transactions` | List all transactions |
| POST | `/api/transactions` | Create transaction |
| PUT | `/api/transactions/:id` | Update transaction |
| DELETE | `/api/transactions/:id` | Delete transaction (soft delete) |
| GET | `/api/transactions/anomalies` | Statistical anomaly detection on the user's transaction history |

### Budgets

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/budgets` | Get current month budgets with actual spend |
| POST | `/api/budgets` | Create budget category |
| PUT | `/api/budgets/:id` | Update budget limit or alert threshold |
| DELETE | `/api/budgets/:id` | Delete budget category |

### Goals

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/goals` | List all savings goals |
| POST | `/api/goals` | Create savings goal |
| PUT | `/api/goals/:id` | Update goal |
| DELETE | `/api/goals/:id` | Delete goal |

### AI Chat

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/chat` | Send message to AI assistant, receive contextual reply |
| GET | `/api/chat/history` | Load persisted conversation history |
| DELETE | `/api/chat/history` | Clear all conversation history |
| DELETE | `/api/chat/message/:id` | Delete a message and its paired AI response |

### Insights

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/insights/predict` | Generate next-month spending forecast with SHAP explanation and flagged anomalies |

### Alerts

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/alerts` | Aggregated alert feed — overspending, anomalies and at-risk savings goals, sorted by severity |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/charts` | Platform-wide analytics across all users |
| GET | `/api/admin/users/:id` | Inspect a specific user's profile and activity |
| PUT | `/api/admin/users/:id/ban` | Suspend a user account |

---

## Security

FinSight was designed with a security-first approach aligned to OWASP Top 10 and UK GDPR principles.

- **A01 Broken Access Control** — JWT auth guard on all private routes, user-scoped queries enforce data isolation, role-based access separates admin and standard users
- **A02 Cryptographic Failures** — AES-256 in transit via HTTPS, bcrypt cost factor 12 for password storage
- **A03 Injection** — Pydantic v2 validates and sanitises all inputs before they reach the database layer
- **A07 Auth Failures** — Rate limiting on login and register endpoints, short-lived access tokens
- **GDPR** — Data export endpoint (Article 20), account deletion (Article 17), consent captured at registration
- **AI Safety** — fintech-llm-guard middleware for prompt-injection detection and PII redaction; see [AI Safety Research](#ai-safety-research--fintech-llm-guard)

---

## Dissertation Context

This project was developed as a final-year Computing Systems dissertation at Ulster University. The system demonstrates competence across the following assessed areas.

| Area | Implementation |
|---|---|
| Full-stack development | React frontend, Flask REST API, MongoDB database |
| Security engineering | JWT, bcrypt, rate limiting, OWASP alignment |
| AI integration | Groq Llama 3.1 with financial context injection |
| Explainable AI | SHAP-based feature attribution for spending forecasts, statistical anomaly detection, aggregated proactive alerting — full AT2 Must Have coverage |
| Research contribution | fintech-llm-guard PyPI package and accompanying GSAM 2026 paper submission |
| System design | Modular blueprint architecture, factory pattern |
| DevOps | Docker, GitHub Actions CI/CD, cloud deployment |
| UX design | Mobile-first, accessible interface with structured SUS usability testing |

---

## Roadmap

- Restore the on-device guardrail pipeline in production via service decomposition, separating the lightweight API from the memory-intensive ML and NLP stack
- Formal adversarial evaluation of fintech-llm-guard — prompt-injection block rate, PII leakage reduction, response-quality trade-off — for the GSAM 2026 paper
- What-if spending simulation (e.g. model the effect of a percentage reduction in a category)
- Open Banking integration via TrueLayer, read-only and consent-gated
- Federated learning for spending forecasting, improving the global model without centralising raw transaction data
- Push notifications for budget alerts
- Multi-currency and locale support
- Shared household budgets

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

Built by Farhan Bin Hossain as part of a BSc Computing Systems dissertation.