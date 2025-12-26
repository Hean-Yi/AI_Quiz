# AI Quiz 项目完整解析与说明文档

本文档面向首次接触该项目的维护者，尽量用通俗的语言解释“这个项目是做什么的、每个文件夹和重要文件负责什么、核心流程怎么运作”，并在关键位置附上源码片段，便于你对照理解。文档覆盖前端（Vue + Vite + Tailwind + Capacitor）与后端（Express + LangChain + OpenAI 兼容接口）全流程，并补充 Android 打包与本地数据存储说明。

---

## 1. 项目概览（先看这一段能快速理解整体）

AI Quiz 是一个“把 PDF 学习资料变成互动测验题”的全栈应用：
- 前端：上传 PDF、选择题型/数量、开始测验、查看解析、记录错题，并可询问 AI。
- 后端：解析 PDF → 构建向量索引（RAG）→ 组装 Prompt → 调用大模型生成题目。
- 移动端：通过 Capacitor 打包 Android App，支持从其他 App（如微信）直接打开 PDF 到 AI Quiz。

一句话总结核心路径：
**上传 PDF → 服务端解析 → 向量索引（RAG）→ Prompt 模板 → LLM 生成题目 → 前端答题 → 错题与历史记录持久化。**

---

## 2. 目录结构总览（简化树）

```
AI_Quiz/
├── client/                 # 前端 Vue + Vite + Tailwind + Capacitor
├── server/                 # 后端 Express + LangChain + OpenAI 兼容
├── build_apk.ps1            # Windows 一键打包 Android APK 脚本
├── AI_Quiz_Debug.apk        # 已构建的调试 APK（产物）
├── README.md                # 英文说明
├── README_zh-CN.md           # 中文说明
├── AGENTS.md                # 项目贡献/规范说明（写代码时一定要看）
├── package.json             # 根目录依赖（目前仅少量）
├── package-lock.json
└── node_modules/            # 根目录依赖缓存（通常不提交）
```

下面逐项解释每个目录与重要文件。

---

## 3. 根目录逐项说明

### 3.1 `AGENTS.md`
- 项目规范说明，非常关键。
- 包含：项目结构、命名规范、运行命令、测试方式、提交规范、重要目录的非提交规则（如 `server/uploads/`、`server/data/vectors/`）。

### 3.2 `README.md` 与 `README_zh-CN.md`
- 面向使用者的快速说明文档。
- 包含功能、技术栈、运行方式、APK 构建步骤等。

### 3.3 `build_apk.ps1`
- Windows 的 APK 构建脚本，自动执行：
  1) Vue 打包
  2) Capacitor 同步
  3) Gradle 打包 APK
- 额外处理 Java 版本兼容（强制改成 17）。

**关键源码片段**：
```powershell
# build_apk.ps1 (节选)
Set-Location "client"
npm run build
npx cap sync android
./gradlew assembleDebug
```

### 3.4 `AI_Quiz_Debug.apk`
- 构建产物（调试版 APK）。非源码，通常无需修改。

### 3.5 `package.json` / `package-lock.json`（根目录）
- 根目录仅保留少量依赖（当前只有 `@capacitor-community/file-opener`）。
- 主要依赖在 `client/` 与 `server/` 各自的 package.json 中。

### 3.6 `.gitignore` / `.vscode/` / `node_modules/`
- `.gitignore` 控制不提交文件（如 `node_modules/`、`server/uploads/`、`server/data/vectors/`）。
- `.vscode` 为编辑器设置。
- `node_modules` 是依赖缓存目录，非源码。

---

## 4. client/ 前端详解（Vite + Vue 3 + Pinia + Tailwind + Capacitor）

前端负责 UI、交互、配置保存、题目展示、PDF 预览、AI 问答、错题本等。下面分层说明。

### 4.1 构建与配置文件

#### `client/package.json`
- 运行脚本：`dev`、`build`、`preview`。
- 主要依赖：Vue、Pinia、Vue Router、Tailwind、pdfjs-dist、Capacitor 等。

#### `client/vite.config.js`
- Vite 配置。
- 设置 `/api` 与 `/uploads` 代理到后端，解决开发阶段跨域。

```js
// client/vite.config.js (节选)
server: {
  proxy: {
    '/api': { target: 'http://localhost:3000', changeOrigin: true },
    '/uploads': { target: 'http://localhost:3000', changeOrigin: true }
  }
}
```

#### `client/tailwind.config.js`
- Tailwind 扫描路径、主题扩展、动画配置。
- 定义主色 `klein-blue` 与动画 `enter` 等。

#### `client/postcss.config.js`
- PostCSS 插件：Tailwind + Autoprefixer。

#### `client/capacitor.config.json`
- Capacitor 基本配置：应用 ID、应用名、Web 目录、Android 网络策略。

#### `client/index.html`
- 前端入口 HTML。
- 使用 FontAwesome CDN。

---

### 4.2 `client/src/` 核心源码

#### 4.2.1 `client/src/main.js`
- Vue 应用入口。
- 注册 Pinia、Router。
- 生产环境配置 Axios baseURL。

```js
// client/src/main.js (节选)
const envBaseUrl = import.meta.env.VITE_API_BASE_URL
if (import.meta.env.PROD && envBaseUrl) {
  axios.defaults.baseURL = envBaseUrl
}
```

#### 4.2.2 `client/src/App.vue`（应用壳，重要）
- 控制全局布局（桌面/移动）。
- 处理路由动画。
- 监听 Android 深度链接（打开 PDF）。

```js
// client/src/App.vue (节选)
App.addListener('appUrlOpen', async (data) => {
  if (data.url && (data.url.startsWith('content://') || data.url.startsWith('file://'))) {
    const response = await fetch(data.url)
    const blob = await response.blob()
    const file = new File([blob], 'imported_document.pdf', { type: "application/pdf" })
    quizStore.pendingFile = file
    router.push(withLayout('/'))
  }
})
```

#### 4.2.3 `client/src/router/index.js`（路由）
- 定义 Home/Quiz/Settings/Mistakes/Profile/Onboarding。
- 自动添加 `/desktop`、`/mobile` 前缀。
- Onboarding 未完成时强制跳转。

```js
// client/src/router/index.js (节选)
const routes = baseRoutes.map((route) => ({
  ...route,
  alias: [`/desktop${basePath}`, `/mobile${basePath}`]
}))

router.beforeEach((to, from, next) => {
  const hasOnboarded = localStorage.getItem('ai_quiz_onboarded')
  if (!hasOnboarded && to.name !== 'Onboarding') {
    next('/onboarding')
  } else {
    next()
  }
})
```

#### 4.2.4 `client/src/stores/quizStore.js`（Pinia 状态，重要）
- 维护题目、当前题号、得分、错题、历史记录、当前 PDF。
- 错题与历史会存入 localStorage。

```js
// client/src/stores/quizStore.js (节选)
const submitQuiz = () => {
  let correctCount = 0
  const newMistakes = []
  questions.value.forEach(q => {
    const isCorrect = q.userAnswer?.trim().toLowerCase() === q.correctAnswer?.trim().toLowerCase()
    if (!isCorrect) newMistakes.push({ ...q, dateAdded: new Date().toISOString() })
  })
  score.value = Math.round((correctCount / questions.value.length) * 100)
  isSubmitted.value = true
  localStorage.setItem('ai_quiz_mistakes', JSON.stringify(mistakes.value))
}
```

#### 4.2.5 `client/src/utils/layout.js`
- 用于判断当前布局前缀（/desktop 或 /mobile）。
- 让路由跳转时保持一致的布局模式。

#### 4.2.6 `client/src/utils/markdown.js`
- Markdown + LaTeX 渲染工具。
- 保护数学公式后再渲染，避免被 Markdown 破坏。

```js
// client/src/utils/markdown.js (节选)
const mathExpressions = []
let protectedText = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
  mathExpressions.push({ type: 'display', tex })
  return `___MATH_DISPLAY_${mathExpressions.length - 1}___`
})
let html = marked(protectedText)
```

#### 4.2.7 `client/src/style.css`（全局样式，重要）
- 定义全局主题、桌面模式 UI、Tailwind 组件类。
- 常用类：`.glass-card`、`.glass-input`、`.primary-btn`。

---

### 4.3 `client/src/components/` 组件层

#### `ConfirmModal.vue`
- 通用确认弹窗。

#### `PdfPreviewModal.vue`（重要）
- Web 端 PDF 预览，使用 `pdfjs-dist` 渲染 Canvas。

```js
// client/src/components/PdfPreviewModal.vue (节选)
pdfDoc = await getDocument(docSource).promise
const page = await pdfDoc.getPage(safePageNumber)
renderTask = page.render({ canvasContext: context, viewport })
```

#### `AiChatModal.vue`（重要）
- AI 问答弹窗，调用 `/api/quiz/chat`。

```js
// client/src/components/AiChatModal.vue (节选)
const res = await axios.post('/api/quiz/chat', {
  question: props.question,
  userQuery: content,
  pdfId: props.pdfId,
  apiKey, provider, baseURL: baseUrl, model: modelName
})
```

---

### 4.4 `client/src/views/` 页面层（核心页面）

#### `Home.vue`（核心）
- PDF 上传、题型选择、题量设置、生成题目。
- 支持多文件上传与本地预览缓存。

```js
// client/src/views/Home.vue (节选)
const response = await axios.post('/api/pdf/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  onUploadProgress: (e) => { progress.value = Math.round((e.loaded * 100) / e.total) }
})

const res = await axios.post('/api/quiz/generate', {
  pdfIds: parsedFiles.value.map(f => f.pdfId),
  types: selectedTypes.value,
  typeCounts: typeCounts.value,
  quantity: questionQuantity.value,
  customRequirements: finalCustomReq,
  apiKey, provider, baseURL: baseUrl, model: modelName,
  domain, role, difficulty
}, { timeout: 300000 })
```

移动端还会尝试把 PDF 写入本地缓存，方便预览或离线读取：
```js
// client/src/views/Home.vue (节选)
const reader = new FileReader()
reader.onload = async (e) => {
  const base64Data = e.target.result.split(',')[1]
  const fileName = `cached_${Date.now()}_${file.name}`
  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64Data,
    directory: Directory.Data
  })
  localPreviewsMap[file.name] = result.uri
}
```

#### `Quiz.vue`
- 展示题目、提交评分、显示解析、跳转 PDF 页码、AI 问答。

```js
// client/src/views/Quiz.vue (节选)
return html.replace(/Page\s+(\d+)/gi, (match, pageNum) => {
  return `<button onclick=\"window.openPdfPage('${quizStore.currentPdf.pdfId}', ${pageNum})\">P${pageNum}</button>`
})
```

#### `Settings.vue`
- 管理 API Key、BaseURL、模型名称。
- 管理 Prompt 模板（调用 `/api/system/prompt`）。

```js
// client/src/views/Settings.vue (节选)
const res = await axios.get(`/api/system/prompt?type=${type}`)
await axios.post('/api/system/prompt', { prompt: p.content, type })
```

该页面维护一个 `prompts` 对象，用来缓存不同题型的模板编辑状态（含原始内容与是否已加载），确保切换 Tab 时不会丢失用户编辑：
```js
// client/src/views/Settings.vue (节选)
const prompts = ref({
  default: { content: '', original: '', loaded: false },
  multiple_choice: { content: '', original: '', loaded: false },
  true_false: { content: '', original: '', loaded: false },
  short_answer: { content: '', original: '', loaded: false }
})
```

#### `Mistakes.vue`
- 展示错题列表、选择错题自测、AI 问答。
- 允许“选择模式”批量选择错题，点击“开始自测”会调用 `quizStore.startQuizFromMistakes()` 并跳转到 `/quiz`。

```js
// client/src/views/Mistakes.vue (节选)
quizStore.startQuizFromMistakes(selectedMistakes.value)
router.push(withLayout('/quiz'))
```

#### `Profile.vue`
- 用户资料与统计面板（平均分、历史次数、错题数量）。
- 支持编辑昵称/领域/身份/难度，并提供“清除所有数据”的确认弹窗。

```js
// client/src/views/Profile.vue (节选)
localStorage.setItem('ai_quiz_nickname', editForm.value.nickname)
localStorage.setItem('ai_quiz_role', editForm.value.role)
quizStore.clearHistory()
```

#### `Onboarding.vue`
- 第一次使用的引导流程，保存 Persona 与 API Key。
- 采用两步流程：第一步收集用户身份与偏好，第二步配置模型 API。

```js
// client/src/views/Onboarding.vue (节选)
localStorage.setItem('ai_quiz_onboarded', 'true')
router.push(withLayout('/'))
```

---

### 4.5 `client/assets/`
- `README.txt`：提示放置 icon/splash 图。
- `icon.png`：App 图标。

---

### 4.6 `client/android/`（Capacitor Android 工程）

#### Gradle 配置
- `android/build.gradle`：顶层构建配置 + Maven 镜像。
- `android/settings.gradle`：模块注册。
- `android/variables.gradle`：SDK/依赖版本定义。
- `android/gradle.properties`：Gradle JVM 设置。
- `android/gradlew` / `android/gradlew.bat`：Gradle Wrapper。

#### App 模块
- `android/app/build.gradle`：声明依赖（包括 `android-pdf-viewer`）。

```gradle
implementation 'com.github.barteksc:android-pdf-viewer:2.8.2'
```

#### Manifest 与资源
- `android/app/src/main/AndroidManifest.xml`：权限 + 深度链接（PDF 打开）。
- `android/app/src/main/res/layout/activity_main.xml`：WebView 容器。
- `android/app/src/main/res/layout/activity_pdf_viewer.xml`：原生 PDF 阅读界面。
- `android/app/src/main/res/xml/file_paths.xml`：FileProvider 路径配置（配合原生文件访问）。
- `android/app/src/main/res/values/strings.xml` / `styles.xml`：应用名称与主题。
- `android/app/src/main/res/drawable/`、`mipmap/`：图标与启动图。
- `android/app/src/test/java/...` / `androidTest/...`：示例测试文件。

#### Java 原生代码（重要）
- `MainActivity.java`：注册插件 + 修复键盘弹出高度。
- `PdfViewerPlugin.java`：JS 调用的 PDF 打开入口。
- `PdfViewerActivity.java`：原生 PDF 阅读器。

```java
// PdfViewerPlugin.java (节选)
@PluginMethod
public void openPdf(PluginCall call) {
  Intent intent = new Intent(getContext(), PdfViewerActivity.class);
  intent.putExtra("filePath", filePath);
  getContext().startActivity(intent);
}
```

---

## 5. server/ 后端详解（Express + LangChain + OpenAI 兼容）

### 5.1 `server/package.json`
- 依赖：express、multer、pdf-parse、openai、langchain、hnswlib-node、json5。
- `npm run dev` 使用 nodemon 热更新。

### 5.2 `server/app.js`（后端入口，重要）
- 提供接口：
  - `GET /` 健康检查
  - `GET /api/system/prompt` 获取 Prompt
  - `POST /api/system/prompt` 保存 Prompt
  - `POST /api/pdf/upload` 上传并解析 PDF
  - `POST /api/quiz/generate` 生成题目
  - `POST /api/quiz/chat` AI 问答

```js
// server/app.js (节选) 上传 PDF
app.post('/api/pdf/upload', upload.array('pdfFiles', 5), async (req, res) => {
  const parsedData = await pdfService.parsePdf(file.path)
  res.json({ success: true, data: results })
})
```

```js
// server/app.js (节选)
app.post('/api/quiz/generate', async (req, res) => {
  const { pdfIds, types, apiKey } = req.body
  const promptTemplates = await promptService.getAllPrompts()
  const questions = await aiService.generateQuiz(...)
  res.json({ success: true, data: questions })
})
```

### 5.3 `server/services/` 服务层

#### `pdfService.js`
- 解析 PDF 内容，按页提取文本。

```js
// server/services/pdfService.js (节选)
const data = await pdf(dataBuffer, { pagerender: render_page })
return { text: data.text, totalPages: data.numpages, pages }
```

#### `promptService.js`
- 管理 Prompt 文件读取与保存。

```js
// server/services/promptService.js (节选)
export const getPrompt = async (type = 'default') => {
  const filename = PROMPT_FILES[type] || PROMPT_FILES['default']
  const filePath = path.join(DATA_DIR, filename)
  return await fs.readFile(filePath, 'utf-8')
}
```

#### `ragService.js`（RAG 核心）
- 使用 LangChain 的 TextSplitter 分块。
- 使用 HNSWLib 保存向量索引。

```js
// server/services/ragService.js (节选)
const vectorStore = await HNSWLib.fromDocuments(docs, embeddings)
await vectorStore.save(saveDir)
```

#### `aiService.js`（最重要）
- 负责构建 Prompt + 调用 LLM + JSON 解析。
- 支持 OpenAI/DeepSeek/兼容接口。
- JSON 解析失败时使用 JSON5 兜底。

```js
// server/services/aiService.js (节选)
try {
  parsed = JSON.parse(cleanedContent)
} catch {
  parsed = JSON5.parse(cleanedContent)
}
```

### 5.4 `server/data/` 模板与数据目录
- `prompt_template.txt`：默认题目生成模板（混合题型）。
- `prompt_multiple_choice.txt`：单选题模板。
- `prompt_true_false.txt`：判断题模板。
- `prompt_short_answer.txt`：简答题模板。
- `data/vectors/`：向量索引缓存目录（运行时生成，不提交）。

模板文件中包含占位符，如 `${context}`、`${quantity}`、`${type}`，由 `aiService` 替换：
```text
${persona_intro}

请根据以下提供的PDF内容片段，生成${quantity}道题目。
题目类型请包含: ${type}。
```

### 5.5 `server/uploads/` 临时文件目录
- 用于存放上传的 PDF 文件。
- 在 `/api/quiz/generate` 成功后会清理这些临时文件。

---

## 6. 核心流程与技术原理（重点理解部分）

### 6.1 Onboarding → 设置保存
- `Onboarding.vue` / `Settings.vue` 将 API Key 和 Persona 存入 localStorage。

### 6.2 上传 PDF → 服务端解析
- 前端：`Home.vue` 上传 FormData。
- 后端：`multer` 保存文件，`pdfService.parsePdf()` 解析文本。

### 6.3 RAG 向量索引
- 文本切片 → Embedding → HNSWLib 保存。
- 查询时取 TopK 相似段落作为上下文。

```js
// server/services/ragService.js (节选)
const results = await vectorStore.similaritySearch(query, 5)
return results.map(doc => ({ content: doc.pageContent, page: doc.metadata.pageNumber }))
```

### 6.4 Prompt 组装 + 调用模型
- `aiService.generateQuiz()` 根据题型模板拼接 Prompt。
- 支持按题型批量生成。
- JSON 输出不合法时使用 JSON5 修复。

```js
// server/services/aiService.js (节选)
let personaIntro = "You are a helpful AI tutor."
if (domain) personaIntro += ` You are an expert in ${domain}.`
if (!contextText) {
  contextText = pdfText.substring(0, 15000)
}
```

生成完成后，后端还会清洗题目中的 `[Page X]` 标记并提取关联页码，方便前端“跳转原文”：
```js
// server/services/aiService.js (节选)
const pageRegex = /\[Page\s+(\d+)\]/gi
const cleanText = (text) => text.replace(pageRegex, () => '').trim()
return {
  ...q,
  relatedPages: Array.from(relatedPages).sort((a, b) => a - b)
}
```

### 6.5 前端答题与评分
- `Quiz.vue` 展示题目并提交。
- `quizStore.submitQuiz()` 计算得分并记录错题。

### 6.6 AI 问答
- 前端 `AiChatModal.vue` 发送 question + userQuery。
- 后端 `aiService.chatWithAI()` 使用题目和上下文生成回答。

### 6.7 PDF 预览与深度链接
- Web：`PdfPreviewModal.vue` + pdfjs。
- Android：PdfViewerPlugin + PdfViewerActivity。
- 深度链接入口在 `App.vue`。

### 6.8 数据持久化
- localStorage：设置、错题、历史。
- server/data/vectors：向量索引。
- server/uploads：上传文件临时存放。

---

## 7. 运行与构建

### 7.1 前端
```bash
cd client
npm install
npm run dev
```

### 7.2 后端
```bash
cd server
npm install
npm run dev
```

### 7.3 Android APK
```powershell
./build_apk.ps1
```

---

## 8. 总结

AI Quiz 的核心逻辑可以概括为：
**PDF → 解析 → RAG 向量索引 → Prompt 模板 → LLM 出题 → 前端互动测验 → 错题与历史沉淀。**

如果要继续扩展功能，优先关注：
- `server/services/aiService.js`（出题与解析逻辑）
- `server/services/ragService.js`（检索增强）
- `client/src/views/Home.vue`（上传与生成）
- `client/src/views/Quiz.vue`（答题与解析）
- `client/src/components/AiChatModal.vue`（问答能力）

如需更细的流程图或架构图（Mermaid），告诉我你想要的视角即可继续补充。

