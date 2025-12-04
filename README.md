# AI Quiz - Intelligent Quiz Generator

[中文文档](README_zh-CN.md)

AI Quiz is a full-stack application that transforms PDF study materials into interactive quizzes using AI. It features a Vue 3 frontend (packaged as an Android app via Capacitor) and an Express/Node.js backend powered by OpenAI/LangChain.

## 🌟 Features

*   **PDF Parsing**: Upload PDF courseware or documents.
*   **AI Question Generation**: Automatically generates Multiple Choice, True/False, and Short Answer questions based on the content.
*   **Interactive Quiz UI**:
    *   Dynamic question cards.
    *   Real-time progress tracking.
    *   Mistake Book (错题本) for review.
    *   Score analysis and explanations.
*   **RAG (Retrieval-Augmented Generation)**: Uses vector search to provide accurate context for questions.
*   **Mobile First**: Optimized for mobile devices and ready to be deployed as an Android APK.
*   **Deep Linking**: Supports opening PDF files directly from other apps (like WeChat) into AI Quiz on Android.

## 🛠️ Tech Stack

### Client
*   **Framework**: Vue 3 + Vite
*   **State Management**: Pinia
*   **Styling**: Tailwind CSS
*   **Mobile Runtime**: Capacitor (Android)

### Server
*   **Runtime**: Node.js + Express
*   **AI/LLM**: LangChain.js + OpenAI API
*   **PDF Processing**: pdf-parse
*   **Vector Store**: HNSWLib (Local vector storage)

## 🚀 Getting Started

### Prerequisites
*   Node.js (v18+)
*   Android Studio (for APK build)

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Hean-Yi/AI_Quiz.git
    cd AI_Quiz
    ```

2.  **Setup Server**
    ```bash
    cd server
    npm install
    # Create a .env file if needed (see server/config)
    npm run dev
    ```

3.  **Setup Client**
    ```bash
    cd client
    npm install
    npm run dev
    ```

### Building Android APK

1.  **Build Frontend**
    ```bash
    cd client
    npm run build
    ```

2.  **Sync Capacitor**
    ```bash
    npx cap sync
    ```

3.  **Build APK**
    You can use the provided PowerShell script (Windows):
    ```powershell
    ./build_apk.ps1
    ```
    Or open Android Studio:
    ```bash
    npx cap open android
    ```

## 📱 Usage

1.  Open the app (Web or Android).
2.  Upload a PDF file.
3.  Configure quiz settings (Question types, quantity, difficulty).
4.  Start the quiz!
5.  Review mistakes in the "Mistake Book".

## 📄 License

[MIT](LICENSE)
