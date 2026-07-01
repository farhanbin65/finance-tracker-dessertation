# FinSight — Setup & Installation Guide

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js 18 or above
- Python 3.11 or above
- Git
- A MongoDB Atlas account (free tier is sufficient)
- A Groq API key — free at [console.groq.com](https://console.groq.com)
- An Auth0 account — free at [auth0.com](https://auth0.com)

---

## 1. Clone the Repository

```bash
git clone https://github.com/farhanbin65/finance-tracker-dessertation.git
cd finance-tracker-dessertation
```

---

## 2. Backend Setup

```bash
cd backend
```

**Create and activate a virtual environment:**

```bash
# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate

# Windows
python -m venv .venv
source .venv/Scripts/activate
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

**Configure environment variables:**

```bash
cp .env.example .env
```

Open `.env` and fill in the following values:

```bash
# MongoDB
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
MONGO_DB_NAME=finsight_db

# JWT
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_ACCESS_EXPIRY_HOURS=1
JWT_REFRESH_EXPIRY_DAYS=7

# Auth0
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=your-auth0-client-id

# Groq AI
GROQ_API_KEY=gsk_your_groq_api_key_here
GROQ_MODEL=llama-3.1-8b-instant

# LLM Provider (groq or ollama)
LLM_PROVIDER=groq

# Ollama (only needed if LLM_PROVIDER=ollama)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

# App
FLASK_DEBUG=true
FRONTEND_URL=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

**Start the backend server:**

```bash
# macOS / Linux
python3 -m app.main

# Windows
python -m app.main
```

Backend runs at `http://localhost:5000`

---

## 3. Frontend Setup

Open a new terminal tab:

```bash
cd frontend
```

**Install dependencies:**

```bash
npm install
```

**Configure environment variables:**

```bash
cp .env.example .env
```

Open `.env` and fill in:

```bash
VITE_API_URL=http://localhost:5000
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_CALLBACK_URL=http://localhost:5173/callback
```

**Start the frontend dev server:**

```bash
npm run dev
```

Frontend runs at `http://localhost:5173`

---

## 4. Seed Demo Data (Optional)

To populate the database with sample transactions, budgets and goals for testing:

```bash
cd backend
python3 seed_data.py
python3 seed_goals.py
```

---

## 5. Create Admin Account

To create an admin user for the admin dashboard:

```bash
cd backend
python3 create_admin.py
```

---

## 6. Local LLM with Ollama (Optional)

To run the chatbot fully locally with no data leaving your machine:

**Install Ollama:**
- macOS: `brew install ollama`
- Windows: Download from [ollama.com/download](https://ollama.com/download)

**Pull the model:**

```bash
ollama pull llama3.1
```

**Update your backend `.env`:**

```bash
LLM_PROVIDER=ollama
```

Restart the backend — the chatbot will now use your local Llama 3.1 model.

---

## Test Credentials

### Standard User
| Field | Value |
|---|---|
| Email | `test@finsght.com` |
| Password | `Test1234!` |

### Admin User
| Field | Value |
|---|---|
| Email | `admin@finsight.com` |
| Password | `Admin1234!` |

### Demo Users
All demo accounts use the password: `Demo1234!`

---

## Live Demo

[finance-tracker-five-umber.vercel.app](https://finance-tracker-five-umber.vercel.app)

---

## Verify Everything is Working

Once both servers are running, open `http://localhost:5173` in your browser and log in with the test credentials above. You should see the dashboard with spending data loaded.

To verify the API is healthy:

```bash
curl http://localhost:5000/api/transactions/meta/categories
```

Expected response: a JSON object with categories and types arrays.