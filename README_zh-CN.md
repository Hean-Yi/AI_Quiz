# AI Quiz - 智能测验生成器

[English](README.md) | [中文](README_zh-CN.md)

AI Quiz 是一个全栈应用程序，利用 AI 技术将 PDF 学习资料转化为互动式测验。它包含一个 Vue 3 前端（可通过 Capacitor 打包为 Android 应用）和一个基于 OpenAI/LangChain 的 Express/Node.js 后端。

## 🌟 功能特性

*   **PDF 解析**: 支持上传 PDF 课件或文档。
*   **AI 智能出题**: 根据文档内容自动生成单选题、判断题和简答题。
*   **交互式测验 UI**:
    *   动态题目卡片设计。
    *   实时进度追踪。
    *   **错题本**: 自动记录错题，方便复习。
    *   成绩分析与详细解析。
*   **RAG (检索增强生成)**: 使用向量搜索技术，为题目提供准确的上下文依据。
*   **移动端优先**: 专为移动设备优化，并支持打包为 Android APK。
*   **深度链接 (Deep Linking)**: 支持从其他应用（如微信）直接打开 PDF 文件并跳转到 AI Quiz 进行解析。

## 🛠️ 技术栈

### 客户端 (Client)
*   **框架**: Vue 3 + Vite
*   **状态管理**: Pinia
*   **样式**: Tailwind CSS
*   **移动端运行时**: Capacitor (Android)

### 服务端 (Server)
*   **运行时**: Node.js + Express
*   **AI/LLM**: LangChain.js + OpenAI API
*   **PDF 处理**: pdf-parse
*   **向量存储**: HNSWLib (本地向量存储)

## 🚀 快速开始

### 前置要求
*   Node.js (v18+)
*   Android Studio (用于构建 APK)

### 安装步骤

1.  **克隆仓库**
    ```bash
    git clone https://github.com/Hean-Yi/AI_Quiz.git
    cd AI_Quiz
    ```

2.  **配置服务端**
    ```bash
    cd server
    npm install
    # 如果需要，创建 .env 文件配置 API Key 等信息
    npm run dev
    ```

3.  **配置客户端**
    ```bash
    cd client
    npm install
    npm run dev
    ```

### 构建 Android APK

1.  **构建前端资源**
    ```bash
    cd client
    npm run build
    ```

2.  **同步 Capacitor 配置**
    ```bash
    npx cap sync
    ```

3.  **构建 APK**
    你可以使用提供的 PowerShell 脚本 (Windows):
    ```powershell
    ./build_apk.ps1
    ```
    或者打开 Android Studio 进行构建:
    ```bash
    npx cap open android
    ```

## 📱 使用指南

1.  打开应用 (Web 端或 Android 端)。
2.  上传一个 PDF 文件 (或从微信等应用通过“用其他应用打开”导入)。
3.  配置测验设置 (选择题型、题目数量、难度等)。
4.  点击生成，开始测验！
5.  测验结束后，可以在“错题本”中回顾做错的题目。

## 📄 许可证

[MIT](LICENSE)
