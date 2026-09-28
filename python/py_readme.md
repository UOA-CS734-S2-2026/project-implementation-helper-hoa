# MCP Chatbot Setup

## Environment Configuration

Create a `.env` file in the project root:

```dotenv
UOA_API_KEY=your_uoa_api_key
FIREBASE_WEB_API_KEY=your_firebase_web_api_key
FIREBASE_PROJECT_ID=helperhoa-cef06
PORT=3000
NODE_ENV=development
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
ALLOWED_ORIGIN=http://localhost:3000
```

Generate the authentication token:

```powershell
npx tsx src/scripts/get-token.ts
```

Add the generated token to `.env`:

```dotenv
TOKEN=generated_token
```

## Install Python Dependencies

```powershell
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r python\requirements.txt
```

## Run the Backend

In Terminal 1:

```powershell
npm install
npm run dev
```

## Run the MCP Chatbot

In Terminal 2:

```powershell
.\.venv\Scripts\Activate.ps1
python python\chatbot.py
```

## Run Tests

In Terminal 3:

```powershell
.\.venv\Scripts\Activate.ps1
python -m test.py
```

Never commit `.env`, API keys, tokens, or `service-account.json`.