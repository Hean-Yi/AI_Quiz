# AI Quiz 系统设计报告

## 1. 项目概述

### 1.1 项目背景
在数字化学习时代，学生和职场人士拥有大量的 PDF 学习资料（课件、论文、手册），但缺乏高效的自测手段。传统的学习方式往往是“只读不练”，效率低下。AI Quiz 旨在利用大语言模型（LLM）的理解与生成能力，将静态的 PDF 文档瞬间转化为互动式的测验题，帮助用户通过“以测代练”的方式巩固知识。

### 1.2 设计目标
*   **自动化**: 用户只需上传文件，无需人工干预即可生成题目。
*   **准确性**: 利用 RAG（检索增强生成）技术，确保题目基于文档真实内容，减少 AI 幻觉。
*   **移动化**: 提供 Android 客户端，支持从微信等社交软件直接打开 PDF 进行学习。
*   **个性化**: 支持多种题型（选择、判断、简答）及难度调整，提供错题本功能。

## 2. 系统架构设计

本系统采用经典的前后端分离架构，结合本地向量库实现轻量级的 RAG 流程。

```mermaid
graph TD
    User[用户 (Android/Web)] -->|上传 PDF| Server[Express 后端]
    User -->|配置出题参数| Server
    
    subgraph "服务端 (Node.js)"
        Server -->|解析文本| PDFService[PDF 解析服务]
        Server -->|向量化 & 存储| VectorDB[(HNSWLib 本地向量库)]
        Server -->|构建 Prompt| AIService[AI 服务]
        
        AIService -->|检索上下文| VectorDB
        AIService -->|API 调用| LLM[大语言模型 (OpenAI/DeepSeek)]
    end
    
    subgraph "客户端 (Vue 3 + Capacitor)"
        View[界面层] --> Store[Pinia 状态管理]
        Store --> API[Axios 请求]
        Native[原生插件] -->|Intent Filter| View
    end
```

## 3. 核心功能模块

### 3.1 客户端 (Client)
*   **技术栈**: Vue 3, Vite, Tailwind CSS, Pinia, Capacitor。
*   **功能**:
    *   **文件导入**: 支持拖拽上传及 Android Intent 深度链接（从外部应用打开）。
    *   **答题交互**: 卡片式 UI，支持左滑/右滑切换题目，实时反馈正误。
    *   **错题管理**: 本地持久化存储错题记录，支持移除已掌握题目。
    *   **原生适配**: 处理 Android 软键盘布局遮挡问题，沉浸式状态栏。

### 3.2 服务端 (Server)
*   **技术栈**: Node.js, Express.js。
*   **功能**:
    *   **API 接口**: 提供文件上传、题目生成、Prompt 管理等 RESTful 接口。
    *   **任务调度**: 处理并发的 AI 请求，支持分批次生成题目以突破 Token 限制。
    *   **错误处理**: 包含 JSON 格式修复机制（JSON5），应对 LLM 输出格式不规范的情况。

### 3.3 AI 与 RAG 引擎
*   **技术栈**: LangChain.js, pdf-parse, HNSWLib。
*   **流程**:
    1.  **文档切片**: 使用 `RecursiveCharacterTextSplitter` 将 PDF 文本按 1000 字符切块，保留 200 字符重叠。
    2.  **向量索引**: 调用 Embedding API 将文本块转化为向量，存储于本地文件系统 (`server/data/vectors/`)。
    3.  **语义检索**: 根据出题意图（如“生成核心概念的选择题”）构造 Query，检索 Top-K 相关片段。
    4.  **上下文注入**: 将检索到的片段作为 Context 注入 System Prompt，要求 AI 引用页码。

## 4. 关键技术实现

### 4.1 检索增强生成 (RAG)
为了解决 LLM 无法处理超长文档及容易产生幻觉的问题，项目实现了完整的 RAG 链路。
*   **精准溯源**: 系统强制要求 AI 在生成题目时标注 `[Page X]`，前端解析该标记并提供原文跳转（逻辑预留）。
*   **本地化存储**: 使用 HNSWLib 替代昂贵的云端向量数据库，降低了部署成本和延迟，适合个人知识库场景。

### 4.2 Android 深度集成
通过配置 `AndroidManifest.xml` 的 `intent-filter`，实现了系统级的文件关联。
*   **Scheme**: 支持 `content://` 和 `file://` 协议。
*   **MimeType**: 注册 `application/pdf`。
这使得 AI Quiz 可以作为一个标准的 PDF 阅读器选项出现在系统菜单中，极大提升了用户体验。

### 4.3 鲁棒的 AI 响应解析
针对 LLM 输出 JSON 格式不稳定的痛点，设计了多级解析策略：
1.  尝试标准 `JSON.parse`。
2.  失败则使用 `JSON5.parse`（支持尾随逗号、单引号等）。
3.  再次失败则使用正则提取核心内容进行修复。

## 5. 数据设计

### 5.1 向量存储
*   **位置**: `server/data/vectors/<pdf_filename>/`
*   **结构**: 包含 `hnswlib.index` (二进制索引) 和 `docstore.json` (文本映射)。

### 5.2 临时文件
*   **上传区**: `server/uploads/` (任务完成后自动清理)。

## 6. 总结
AI Quiz 展示了如何将前沿的 GenAI 技术与传统的移动应用开发相结合。通过 RAG 技术解决了知识准确性问题，通过 Capacitor 解决了跨平台分发问题。项目结构清晰，扩展性强，是一个具有实用价值的 AI 落地案例。
