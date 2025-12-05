import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// 导入服务
import * as pdfService from './services/pdfService.js';
import * as promptService from './services/promptService.js';
import * as aiService from './services/aiService.js';
import * as ragService from './services/ragService.js';

// 模拟 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// --- 中间件配置 ---
app.use(cors());
app.use(express.json()); // 解析 JSON Body

// 静态资源
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}
app.use('/uploads', express.static(uploadDir));

// --- Multer 文件上传配置 ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // 保留原始扩展名，并处理文件名中的中文等特殊字符
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } 
});

// --- API 路由 ---

// 1. 健康检查
app.get('/', (req, res) => {
    res.send({ status: 'ok', message: 'AI Quiz Backend is running' });
});

// 2. Prompt 管理接口 (新增)
app.get('/api/system/prompt', async (req, res) => {
    try {
        const type = req.query.type || 'default';
        const content = await promptService.getPrompt(type);
        res.json({ success: true, prompt: content, type });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/system/prompt', async (req, res) => {
    try {
        const { prompt, type } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt content is required' });
        
        await promptService.savePrompt(prompt, type || 'default');
        res.json({ success: true, message: 'Prompt saved successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// 3. 上传 PDF (支持多文件)
app.post('/api/pdf/upload', upload.array('pdfFiles', 5), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const results = [];

        for (const file of req.files) {
            console.log(`Processing file: ${file.filename}`);
            const parsedData = await pdfService.parsePdf(file.path);

            // 解决中文文件名乱码问题
            let originalName = file.originalname;
            try {
                originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
            } catch (e) {
                console.warn('Filename encoding fix failed:', e);
            }

            results.push({
                pdfId: file.filename,
                originalName: originalName,
                totalPages: parsedData.totalPages,
                previewText: parsedData.text.substring(0, 150) + '...',
                fileUrl: `/uploads/${file.filename}`
            });
        }

        res.json({
            success: true,
            data: results
        });

    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to process PDFs' });
    }
});

// 4. 生成题目
app.post('/api/quiz/generate', async (req, res) => {
    try {
        // 接收前端传来的完整配置
        // pdfIds: string[], types: string[], quantity: number, customRequirements: string
        const { pdfIds, types, typeCounts, quantity, customRequirements, apiKey, provider, baseURL, model, domain, role, difficulty } = req.body;

        if (!pdfIds || !pdfIds.length || !types || !types.length || !apiKey) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        // 1. 聚合所有 PDF 文本和页面
        let allPdfText = "";
        let allPages = [];
        
        // 遍历处理每个 PDF
        for (const pdfId of pdfIds) {
            const filePath = path.join(__dirname, 'uploads', pdfId);
            if (fs.existsSync(filePath)) {
                const parsedData = await pdfService.parsePdf(filePath);
                allPdfText += parsedData.text + "\n\n";
                // 为页面添加 source 标识，方便 RAG 区分
                const taggedPages = parsedData.pages.map(p => `[Source: ${pdfId}] ${p}`);
                allPages = [...allPages, ...taggedPages];

                // 立即创建向量索引并删除文件 (释放服务器空间)
                try {
                    await ragService.getOrCreateIndex(pdfId, parsedData.pages, { apiKey, baseURL });
                    fs.unlinkSync(filePath);
                    console.log(`Processed and deleted file: ${pdfId}`);
                } catch (e) {
                    console.error(`Error processing/deleting ${pdfId}:`, e);
                }
            }
        }

        if (!allPdfText) {
             return res.status(404).json({ error: 'No valid PDF content found' });
        }

        // 3. 获取 Prompt 模板
        const promptTemplates = await promptService.getAllPrompts();

        // 4. 组装 Config 对象
        const config = {
            apiKey,
            provider: provider || 'openai',
            baseURL: baseURL,
            model: model
        };

        // 5. 调用 AI 生成题目
        // 注意：这里传入的是数组 pdfIds
        const questions = await aiService.generateQuiz(
            allPdfText, 
            types, 
            quantity || 10, 
            customRequirements, 
            config, 
            promptTemplates, // 传入所有模板
            pdfIds, 
            allPages,
            typeCounts, // 传入 typeCounts
            { domain, role, difficulty } // 传入 Persona 对象
        );

        // 6. 清理上传的 PDF 文件 (释放服务器空间)
        // 仅在生成成功后删除，如果生成失败保留以便排查(或者也删除?)
        // 用户要求: "在每个用户完成请求, 不再有预览pdf的需要的时间释放掉占用"
        // 此时前端已经缓存了文件，或者不需要预览了。
        for (const pdfId of pdfIds) {
            const filePath = path.join(uploadDir, pdfId);
            if (fs.existsSync(filePath)) {
                fs.unlink(filePath, (err) => {
                    if (err) console.error(`Failed to delete file ${pdfId}:`, err);
                    else console.log(`Deleted temporary file: ${pdfId}`);
                });
            }
        }

        res.json({
            success: true,
            data: questions
        });

    } catch (error) {
        console.error('Quiz generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 5. AI 问答接口 (新增)
app.post('/api/quiz/chat', async (req, res) => {
    try {
        const { question, userQuery, pdfId, apiKey, provider, baseURL, model } = req.body;

        if (!question || !userQuery || !apiKey) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }

        const config = {
            apiKey,
            provider: provider || 'openai',
            baseURL: baseURL,
            model: model
        };

        const reply = await aiService.chatWithAI(question, userQuery, config, pdfId);

        res.json({
            success: true,
            reply: reply
        });

    } catch (error) {
        console.error('AI Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
});