# Agentic RAG Assistant - PDF Chat & Knowledge Mind-Map

A production-ready, full-stack, responsive **Agentic Retrieval-Augmented Generation (RAG)** web application. Users can upload various knowledge bases (such as PDFs, Text documents, and Markdown files), manage multiple threads synced securely with **Firebase**, and engage in semantic conversation with intelligent automated fallback mechanics.

---

## 🚀 Key Features

*   **Smart Document Management**: Drag-and-drop or manual upload of PDFs and text files. Chunks are generated, embedded, and stored inside a local vector engine or linked with your own Pinecone Database.
*   **Fully Responsive Dashboard**: Designed desktop-first with elegant mobile adaptation. Fluid toggle drawers allow you to inspect the knowledge base and swap chat sessions on small-screen viewports without layout breaking.
*   **Persistent Multi-Session Threads**: Seamlessly create, select, and delete multiple chat threads. All sessions and thread histories are synced securely to a persistent **Firebase Firestore** backend.
*   **Resilient API Fallbacks**: Integrated automatic fallback routing for API rate limits (`429`) or server overloads (`503`), dynamically downshifting from `gemini-3.5-flash` through flash-lite models to guarantee continuous uptime.
*   **Interactive Inline Confirmations**: Direct visual confirmations inside the document list (to replace intrusive or iframe-blocked `window.confirm` popups).

---

## 🛠️ Tech Stack

### Frontend
*   **Framework**: [React 18+](https://react.dev/) with [Vite](https://vite.dev/) (lightning-fast bundling and Dev Server)
*   **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict type-safety)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (Fluid utility-first adaptive layouts)
*   **Icons**: [Lucide React](https://lucide.dev/) (Clean SVG icons)

### Backend
*   **Server Engine**: [Express](https://expressjs.com/) (Custom Node.js server)
*   **AI Engine**: [@google/genai SDK](https://github.com/google/generative-ai-js) (Official Gemini client using unified API endpoints)
*   **Database & Auth**: [Firebase](https://firebase.google.com/) (Firestore NoSQL Database and secure Firebase Authentication)
*   **Vector Storage**: local JSON embedding database with optional hook-in to [Pinecone DB](https://www.pinecone.io/) for enterprise-scale indexing.

---

## 💻 Local Development Setup

To run this project on your physical machine, follow these steps:

### Prerequisites
Make sure you have [Node.js (v18 or higher)](https://nodejs.org/) and `npm` installed.

### 1. Clone the Repository & Install Dependencies
```bash
# Install core and backend packages
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in your root folder (reference the `.env.example` if available):
```env
# Gemini API Access
GEMINI_API_KEY=your_gemini_api_key_here

# Firebase Web App Config (Optional for persistence, falls back to guest storage)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### 3. Start Development Server
```bash
npm run dev
```
The server will boot up and be accessible locally at `http://localhost:3000`.

---

## ☁️ Deployment on Render

This application uses a full-stack unified architecture (where Express proxies requests and serves Vite's static front-end bundle). This makes it highly compatible with **Render** as a single **Web Service**.

### Step 1: Create a New Web Service on Render
1. Log in to your [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
2. Connect your GitHub repository containing this codebase.

### Step 2: Configure Build and Start Settings
Configure the build properties with the following standard settings:

*   **Runtime**: `Node`
*   **Build Command**: 
    ```bash
    npm run build
    ```
    *(This builds the static React app into the `dist/` folder and compiles the custom backend `server.ts` into single-bundle CommonJS output via esbuild.)*
*   **Start Command**:
    ```bash
    npm run start
    ```
    *(Runs the unified compiled Node server via `node dist/server.cjs` on port `3000`.)*

### Step 3: Configure Environment Variables
Under the **Environment** tab in Render, add your runtime secrets:
*   `GEMINI_API_KEY` (Your Google Gemini AI developer API token)
*   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, etc. (Your Firebase Client credentials so your production users can register and login securely)

Click **Deploy Web Service**, and your Agentic RAG application will be live!
