# Sahayak AI (सहायक / సహాయక్)
### *Your Everyday Multilingual Voice Assistant*

> **Speak → Understand → Get Help → Take Action**

Sahayak AI is a responsive, voice-first multilingual everyday assistant designed for students, working professionals, parents, small business owners, and senior citizens. It bridges the digital divide across Indian languages, enabling anyone to understand documents, manage daily tasks, translate information, and take action effortlessly in their preferred language.

---

## 🌟 Key Features

### 🎙️ 1. Voice Assistant (Gnani Prisma & Timbre)
- **Microphone Recording:** Browser-native recording via the MediaRecorder API.
- **Prisma Speech-to-Text:** Converts user speech across 10+ Indian languages (Hindi, Telugu, Tamil, Kannada, Marathi, Gujarati, Bengali, Malayalam, Punjabi, English) into text.
- **Conversational Intelligence:** Evon reasons over queries, asks clarifying questions, and provides conversational guidance.
- **Timbre Text-to-Speech:** AI responses are read aloud naturally with customizable speed and language-specific voices.
- **Interactive Controls:** Waveform visualizer, replay audio, and instant stop-speaking control.

### 📄 2. Document Intelligence & OCR
- **Multi-Format Support:** PDFs, scanned documents, electricity bills, bank statements, school notices, invoices, and images (JPG, PNG, WEBP).
- **Hybrid Extraction Pipeline:**
  - **Selectable PDFs:** Direct layout and text extraction with **PyMuPDF**.
  - **Scanned Documents & Images:** Preprocessed with **OpenCV** (resizing, grayscale conversion, bilateral filter noise reduction, deskewing, and Otsu adaptive thresholding) followed by **Tesseract OCR**.
- **Editable OCR Correction:** Displays extracted text in an editable area allowing users to fix any OCR discrepancies before analysis.
- **Intelligent Grounding:**
  - Executive Summaries
  - Explanations in simple, non-technical language
  - Financial Extraction (total payable amount, due dates, billing periods, penalties)
  - Date & Deadline Identification
  - Custom Question-Answering strictly grounded on document content.

### ✅ 3. Everyday Task Manager
- **Natural Language & Voice Extraction:** Automatically detects tasks and deadlines (e.g., *"Remind me to pay my electricity bill on Monday"* → Task: *Pay electricity bill*, Due: *Monday*).
- **Confirmation Safeguard:** Prompts the user to confirm extracted details before committing to the database.
- **Persistent Storage:** MongoDB storage for tasks, due dates, categories, and completion states.
- **Filters & Status:** Easily toggle tasks between pending and completed, filter by status, and track upcoming deadlines.

### 🌐 4. Translation & Message Drafting
- **Multilingual Support:** Translate between Hindi, Telugu, Tamil, Kannada, Marathi, and English.
- **Tone Customization:** Rewrite text in *Polite*, *Formal*, *Simple*, or *Casual* styles.
- **Everyday Templates:** Pre-built templates for office leave requests, polite invoices, and courteous greetings.
- **Spoken Pronunciation:** Listen to translated text read aloud with Gnani Timbre.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide React, Axios, MediaRecorder API |
| **Backend** | Python 3.12, FastAPI, Uvicorn, Pydantic, HTTPX, python-multipart |
| **Database** | MongoDB Atlas (with automatic in-memory fallback for local development) |
| **Document Processing** | PyMuPDF, OpenCV (`opencv-python`), Tesseract OCR (`pytesseract`), Pillow |
| **Voice & AI** | Gnani.ai **Prisma** (STT), **Evon** (LLM), and **Timbre** (TTS) |

---

## 📂 Project Structure

```
d:\Folders\SAHAYAK\
├── backend/
│   ├── .env                   # Environment variables (configured with placeholders)
│   ├── .env.example           # Environment variables template
│   ├── requirements.txt       # Python dependencies
│   ├── config.py              # Application configuration & settings
│   ├── main.py                # FastAPI application entry point
│   ├── database/
│   │   ├── __init__.py
│   │   └── mongo.py           # MongoDB connection & resilient CRUD operations
│   ├── models/
│   │   ├── chat.py            # Chat & translation schemas
│   │   ├── document.py        # Document upload & action schemas
│   │   └── task.py            # Task CRUD & extraction schemas
│   ├── routes/
│   │   ├── voice.py           # STT (Prisma) & TTS (Timbre) endpoints
│   │   ├── chat.py            # Conversational Evon endpoints & history
│   │   ├── documents.py       # Upload, OCR, and document analysis endpoints
│   │   └── tasks.py           # Task management endpoints
│   ├── services/
│   │   ├── prisma_service.py   # Gnani Prisma STT integration
│   │   ├── timbre_service.py   # Gnani Timbre TTS integration
│   │   ├── evon_service.py     # Gnani Evon LLM & reasoning integration
│   │   ├── ocr_service.py      # OpenCV image preprocessing & Tesseract OCR
│   │   └── document_service.py # PyMuPDF text extraction pipeline
│   ├── utils/
│   │   └── validators.py      # File & input validation
│   ├── uploads/               # Local document uploads directory
│   └── tests/
│       ├── test_unit.py       # Comprehensive unit tests
│       └── test_fastapi_asgi.py# FastAPI ASGI endpoint test suite
└── frontend/
    ├── package.json           # Node.js dependencies & scripts
    ├── vite.config.js         # Vite configuration with API proxy
    ├── tailwind.config.js     # Custom Sahayak theme colors & animations
    ├── postcss.config.js      # PostCSS configuration
    ├── index.html             # HTML entry point with Indic fonts
    └── src/
        ├── main.jsx           # React app mount
        ├── App.jsx            # Main app shell with sidebar & tab panels
        ├── index.css          # Tailwind base & custom utility styles
        ├── context/
        │   └── AppContext.jsx # Global state (language, audio, tasks, toasts)
        ├── services/
        │   └── api.js         # Axios API client methods
        └── components/
            ├── Sidebar.jsx            # Collapsible navigation drawer
            ├── Dashboard.jsx          # Warm landing hub with voice card & previews
            ├── VoiceInteractionArea.jsx# Interactive mic button, waveform & states
            ├── ChatInterface.jsx      # Conversational UI with Timbre playback
            ├── DocumentWorkspace.jsx  # Drag & drop upload, OCR editor & actions
            ├── TaskPanel.jsx          # To-do management & voice extraction
            ├── TranslationPanel.jsx   # Polite drafting & translation module
            ├── AudioWaveform.jsx      # Animated SVG waveform visualizer
            └── LanguageSelector.jsx   # Multilingual dropdown
```

---

## 🚀 Getting Started

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.12)
- Node.js 18+ and npm
- *(Optional for image OCR)*: [Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki) (Native text PDFs work directly out of the box via PyMuPDF).

---

### 2. Backend Setup

1. Open a terminal in `backend/`:
   ```bash
   cd backend
   ```

2. Review or update `backend/.env`:
   ```env
   HOST=127.0.0.1
   PORT=8000
   DEBUG=True

   # MongoDB Atlas Connection String (Replace placeholder with your real Atlas URI)
   MONGODB_URI=mongodb+srv://<USERNAME>:<PASSWORD>@cluster0.mongodb.net/sahayak_ai?retryWrites=true&w=majority
   MONGODB_DB_NAME=sahayak_ai

   # Gnani.ai API Key
   GNANI_API_KEY=YOUR_GNANI_API_KEY_HERE

   # Gnani Prisma (STT)
   GNANI_PRISMA_URL=https://api.vachana.ai/stt/v3
   GNANI_PRISMA_MODEL=prisma-v3.0

   # Gnani Timbre (TTS)
   GNANI_TIMBRE_URL=https://api.vachana.ai/api/v1/tts/inference
   GNANI_TIMBRE_MODEL=timbre-v2.5
   GNANI_TIMBRE_DEFAULT_VOICE=Nalini

   # Gnani Evon (LLM)
   GNANI_EVON_URL=https://api.vachana.ai/v1/chat/completions
   GNANI_EVON_MODEL=gnani/gnani-evon-v3.3-30B-A3B

   # Tesseract Path (Optional if not in system PATH)
   TESSERACT_CMD=
   ```
   > **Note on MongoDB:** If the Atlas URI contains `<USERNAME>` or `<PASSWORD>` placeholders, Sahayak AI automatically switches to its in-memory MongoDB store, allowing immediate local development and testing without any setup barriers.

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the backend server:
   ```bash
   python main.py
   ```
   The API will start at `http://127.0.0.1:8000`. You can explore interactive Swagger documentation at `http://127.0.0.1:8000/docs`.

---

### 3. Frontend Setup

1. Open a new terminal in `frontend/`:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The web application will open at `http://localhost:5173`.

---

### 4. Running Verification Tests

Run the test suite to verify all backend modules (Voice, Tasks, Translation, Chat, and Documents):
```bash
python backend/tests/test_unit.py
```
Or run the complete ASGI HTTP test:
```bash
cd backend
python tests/test_fastapi_asgi.py
```

---

## 🎨 Design Philosophy

Sahayak AI follows a **warm, minimal, human-centered UI/UX**:
- **Background:** `#F8F7F4` (Warm off-white)
- **Primary:** `#5146E5` (Deep Indigo)
- **Secondary:** `#EAE7FF` (Soft Lavender)
- **Accent:** `#B9F3D0` (Mint Green)
- **Text:** `#20202A` (Dark Charcoal)

Every interaction provides clear sensory feedback:
- **Idle:** Softly pulsing microphone inviting interaction.
- **Recording:** Real-time animated waveform and elapsed time counter.
- **Processing:** Visual thinking indicator informing the user of AI reasoning.
- **Speaking:** Active audio playback with waveform and instant stop control.
   <img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/9579a409-0cae-4ef6-b7ab-66f4f09024f0" />
  <img width="1920" height="1080" alt="Screenshot (610)" src="https://github.com/user-attachments/assets/73a5c8ad-c9d8-47fe-91e5-4eddb9670e3c" />
  <img width="1920" height="1080" alt="Screenshot (612)" src="https://github.com/user-attachments/assets/eba8ef69-7766-4736-81b5-e4547382eb29" />





