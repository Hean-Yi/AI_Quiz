const OpenAI = require('openai');
const JSON5 = require('json5');
const ragService = require('./ragService');

/**
 * AI 服务工厂
 */
class AIServiceFactory {
    static createService(config) {
        switch (config.provider) {
            case 'openai':
            case 'deepseek': // 兼容
                return new OpenAICompatibleService(config);
            case 'anthropic':
                throw new Error('Anthropic provider not implemented yet');
            case 'google':
                throw new Error('Google provider not implemented yet');
            default:
                // 默认为 OpenAI 兼容模式
                return new OpenAICompatibleService(config);
        }
    }
}

/**
 * OpenAI 兼容服务 (支持 OpenAI, DeepSeek, Qwen, GLM 等)
 */
class OpenAICompatibleService {
    constructor(config) {
        this.apiKey = config.apiKey;
        this.baseURL = config.baseURL || 'https://api.openai.com/v1';
        this.model = config.model || 'gpt-3.5-turbo';
        
        this.client = new OpenAI({
            apiKey: this.apiKey,
            baseURL: this.baseURL,
            timeout: 300000, // 设置 5 分钟超时
            maxRetries: 2,   // 失败重试 2 次
        });
    }

    async generateQuiz(prompt) {
        try {
            // 强制要求 JSON 格式
            const finalPrompt = prompt + `\n\nIMPORTANT: You must respond with a valid JSON object containing a "questions" array. Do not include markdown formatting (like \`\`\`json). Each object in the array should have: "type" (string), "content" (string), "options" (array of strings, if applicable), "correctAnswer" (string), "explanation" (string).`;

            let completion;
            
            // 智能判断：只有 OpenAI 官方模型或明确支持 json_object 的模型才使用该参数
            // 避免非兼容模型（如 GLM, Qwen 等）因参数不支持而报错，导致不必要的重试耗时
            const isOpenAIModel = this.model.startsWith('gpt-') || this.model.startsWith('o1-');
            
            if (isOpenAIModel) {
                try {
                    // 尝试使用 JSON 模式
                    completion = await this.client.chat.completions.create({
                        messages: [
                            { role: "system", content: "你是一个基于知识库的助教。请仅根据以下提供的【参考上下文】回答问题或生成题目。如果上下文中没有答案，请直接说明无法回答。在回答中，必须引用参考上下文的页码，格式为 [Page X]。" },
                            { role: "user", content: finalPrompt }
                        ],
                        model: this.model,
                        response_format: { type: "json_object" }, 
                        temperature: 0.7,
                    });
                } catch (apiError) {
                    console.warn("API call with json_object failed, retrying without it...", apiError.message);
                    // 降级重试：不带 response_format
                    completion = await this.client.chat.completions.create({
                        messages: [
                            { role: "system", content: "你是一个基于知识库的助教。请仅根据以下提供的【参考上下文】回答问题或生成题目。如果上下文中没有答案，请直接说明无法回答。在回答中，必须引用参考上下文的页码，格式为 [Page X]。" },
                            { role: "user", content: finalPrompt }
                        ],
                        model: this.model,
                        // response_format: { type: "json_object" }, // 移除
                        temperature: 0.7,
                    });
                }
            } else {
                // 非 OpenAI 模型，直接不使用 json_object 参数，避免报错重试
                completion = await this.client.chat.completions.create({
                    messages: [
                        { role: "system", content: "你是一个基于知识库的助教。请仅根据以下提供的【参考上下文】回答问题或生成题目。如果上下文中没有答案，请直接说明无法回答。在回答中，必须引用参考上下文的页码，格式为 [Page X]。" },
                        { role: "user", content: finalPrompt }
                    ],
                    model: this.model,
                    temperature: 0.7,
                });
            }

            const content = completion.choices[0].message.content;
            return this.parseResponse(content);

        } catch (error) {
            console.error("AI Service Error:", error);
            throw error;
        }
    }

    parseResponse(content) {
        // 清洗函数
        const cleanJson = (text) => {
            // 去掉 Markdown 标记
            let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
            return cleaned;
        };

        let parsed;
        try {
            // 尝试使用标准解析
            const cleanedContent = cleanJson(content);
            parsed = JSON.parse(cleanedContent);
        } catch (error) {
            console.warn("标准 JSON 解析失败，尝试使用 JSON5 宽松解析...", error.message);
            try {
                // 【关键】使用 JSON5 进行第二次尝试
                // JSON5 能处理很多标准 JSON 处理不了的格式错误
                const cleanedContent = cleanJson(content);
                parsed = JSON5.parse(cleanedContent);
            } catch (err2) {
                console.error("JSON5 解析也失败了。Raw Output:", content);
                // 最后的兜底：手动修复常见的双引号嵌套问题 (这是针对你这次报错的特异性修复)
                // 警告：这种正则替换有风险，仅作为最后手段
                try {
                    const manualFix = cleanJson(content).replace(/:\s*"([^"]*)"([^",]*)"([^"]*)"/g, ': "$1\'$2\'$3"');
                    parsed = JSON5.parse(manualFix);
                } catch (err3) {
                     // 抛出包含部分原始内容的错误，方便前端展示给用户排查
                    const safeContent = content ? content.substring(0, 500).replace(/\n/g, ' ') : 'Empty response';
                    throw new Error(`Failed to parse AI response. The AI might have returned non-JSON format. Raw output preview: ${safeContent}...`);
                }
            }
        }

        let questions = [];
        
        if (Array.isArray(parsed)) {
            questions = parsed;
        } else if (parsed.questions && Array.isArray(parsed.questions)) {
            questions = parsed.questions;
        } else {
            // 尝试寻找任何数组
            const keys = Object.keys(parsed);
            for (const key of keys) {
                if (Array.isArray(parsed[key])) {
                    questions = parsed[key];
                    break;
                }
            }
        }
        return questions;
    }
    async chatWithAI(context, userQuery) {
        try {
            const systemPrompt = `你是一个专业的AI助教。
请根据以下提供的【题目信息】和【参考上下文】回答用户的问题。
回答要简洁明了，重点解释用户疑惑的点。

【题目信息】
${JSON.stringify(context.question)}

【参考上下文】
${context.ragContext || "无"}
`;

            const completion = await this.client.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userQuery }
                ],
                model: this.model,
                temperature: 0.7,
            });

            return completion.choices[0].message.content;
        } catch (error) {
            console.error("AI Chat Error:", error);
            throw error;
        }
    }
}

/**
 * 统一对外接口
 */
const generateQuiz = async (pdfText, types, quantity, customRequirements, config, promptTemplates, pdfIds, pages, typeCounts, persona = {}) => {
    if (!config.apiKey) {
        throw new Error('API Key is required');
    }

    // --- 构建 Persona Intro ---
    let personaIntro = "You are a helpful AI tutor.";
    const { domain, role, difficulty } = persona;

    if (domain) {
        personaIntro += ` You are an expert in ${domain}.`;
    }
    
    if (role) {
        personaIntro += ` Your target audience is a ${role}. Adjust your tone and complexity accordingly.`;
    }

    if (difficulty) {
        personaIntro += ` Please generate questions with ${difficulty} difficulty level.`;
    }

    // --- RAG 流程 ---
    // 构造检索 Query
    const typeStr = types.join(', ');
    const query = `Generate ${typeStr} questions covering key concepts, definitions, and important details from this document.`;
    
    // 简单处理：目前 RAG 还是基于单个 PDF ID 检索，或者我们可以遍历所有 PDF ID
    // 为了简化，我们暂时只对第一个 PDF 进行 RAG 检索，或者如果 pdfIds 是数组，我们可能需要更复杂的 RAG 逻辑
    // 这里做一个简单的聚合：尝试对每个 PDF 检索一点内容
    let contextText = "";
    
    try {
        const allRetrievedDocs = [];
        // 限制 RAG 检索的 PDF 数量，避免过慢
        const targetPdfIds = Array.isArray(pdfIds) ? pdfIds.slice(0, 3) : [pdfIds];
        
        for (const pid of targetPdfIds) {
             console.log(`Retrieving context for PDF: ${pid}`);
             // 注意：ragService.retrieveContext 需要 pages 参数来建立索引
             // 但这里的 pages 是所有 PDF 的页面集合，这可能导致索引建立错误
             // 理想情况下，ragService 应该能处理这种情况，或者我们只传入当前 PDF 的页面
             // 由于时间关系，这里简化处理：如果 pages 是混合的，RAG 可能效果打折，或者我们依赖 fallback
             // 更好的做法是：在 app.js 中不要合并 pages，而是传递结构化的数据
             // 但为了保持兼容性，我们这里主要依赖 pdfText (fallback) 如果 RAG 失败
             
             // 尝试调用 RAG (注意：如果 pages 不匹配 pid，可能会重新建立错误的索引，但内容是基于 pages 的)
             // 修正：我们暂时不传 pages 给 retrieveContext，让它尝试加载已有索引，或者失败降级
             const docs = await ragService.retrieveContext(pid, query, config, []); 
             allRetrievedDocs.push(...docs);
        }

        if (allRetrievedDocs.length > 0) {
            // 去重并选取 Top 10
            const uniqueDocs = [...new Set(allRetrievedDocs.map(d => JSON.stringify(d)))].map(s => JSON.parse(s));
            contextText = uniqueDocs.slice(0, 10).map(doc => `[Page ${doc.page}]: ${doc.content}`).join("\n\n");
        }
    } catch (e) {
        console.warn("RAG retrieval failed", e);
    }

    if (!contextText) {
        // 降级：使用原始文本的前 15000 字符 (稍微增加长度)
        console.warn("RAG returned no results, falling back to truncated text.");
        contextText = pdfText.substring(0, 15000);
    }

    // 创建服务实例
    const service = AIServiceFactory.createService(config);
    
    // --- 并发生成优化 ---
    const requests = [];

    // 策略 A: 如果有明确的 typeCounts，则按题型分批生成
    if (typeCounts && Object.keys(typeCounts).length > 0) {
        console.log("Using type-based batching strategy:", typeCounts);
        
        for (const [type, count] of Object.entries(typeCounts)) {
            if (count <= 0) continue;

            // 选择对应的 Prompt 模板
            let template = promptTemplates[type] || promptTemplates['default'];
            // 如果没有找到特定模板，回退到默认
            if (!template) template = promptTemplates['default'];

            // 每个题型单独生成，如果数量较大(>5)，再拆分
            const BATCH_SIZE = 5;
            const batchCount = Math.ceil(count / BATCH_SIZE);

            for (let i = 0; i < batchCount; i++) {
                const currentBatchSize = (i === batchCount - 1) ? (count - (i * BATCH_SIZE)) : BATCH_SIZE;
                
                let batchPrompt = template
                    .replace('${persona_intro}', personaIntro) // 注入 Persona
                    .replace('${type}', type) // 替换为单一类型 (虽然专用模板可能不需要这个变量，但保留兼容)
                    .replace('${context}', contextText);
                
                // 替换数量
                if (batchPrompt.includes('${quantity}')) {
                    batchPrompt = batchPrompt.replace('${quantity}', currentBatchSize);
                } else {
                    batchPrompt += `\n\n请生成 ${currentBatchSize} 道题目。`;
                }

                // 添加自定义要求
                if (customRequirements) {
                    batchPrompt += `\n\n【额外出题要求】: ${customRequirements}`;
                }

                requests.push(service.generateQuiz(batchPrompt));
            }
        }
    } 
    // 策略 B: 旧逻辑，混合生成
    else {
        console.log("Using mixed batching strategy");
        const TOTAL_QUESTIONS = quantity || 10;
        const BATCH_SIZE = 5;
        const BATCH_COUNT = Math.ceil(TOTAL_QUESTIONS / BATCH_SIZE);
        
        // 使用默认模板
        const template = promptTemplates['default'];

        for (let i = 0; i < BATCH_COUNT; i++) {
            // 计算当前批次的大小 (最后一批可能少于 BATCH_SIZE)
            const currentBatchSize = (i === BATCH_COUNT - 1) ? (TOTAL_QUESTIONS - (i * BATCH_SIZE)) : BATCH_SIZE;

            // 替换模板变量
            let batchPrompt = template
                .replace('${persona_intro}', personaIntro) // 注入 Persona
                .replace('${type}', typeStr) // 替换为多种类型
                .replace('${context}', contextText);
            
            // 处理数量
            if (batchPrompt.includes('${quantity}')) {
                batchPrompt = batchPrompt.replace('${quantity}', currentBatchSize);
            } else {
                batchPrompt += `\n\n请生成 ${currentBatchSize} 道题目。`;
            }

            // 添加自定义要求
            if (customRequirements) {
                batchPrompt += `\n\n【额外出题要求】: ${customRequirements}`;
            }

            requests.push(service.generateQuiz(batchPrompt));
        }
    }

    // 并行执行
    console.log(`Starting ${requests.length} parallel AI requests...`);
    const results = await Promise.all(requests);
    
    // 合并结果
    let allQuestions = results.flat();

    // 后处理：添加 ID，并清洗 [Page X] 标记
    return allQuestions.map((q, index) => {
        // 提取页码引用的正则
        const pageRegex = /\[Page\s+(\d+)\]/gi;
        let relatedPages = new Set();

        // 清洗函数：移除文本中的 [Page X]，并收集页码
        const cleanText = (text) => {
            if (!text) return text;
            return text.replace(pageRegex, (match, pageNum) => {
                relatedPages.add(parseInt(pageNum));
                return ''; // 移除标记
            }).trim();
        };

        // 1. 清洗题干
        const cleanContent = cleanText(q.content);

        // 2. 清洗选项 (如果是数组)
        let cleanOptions = q.options;
        if (Array.isArray(q.options)) {
            cleanOptions = q.options.map(opt => cleanText(opt));
        }

        // 3. 解析 (explanation) 通常保留页码引用，但也收集页码
        if (q.explanation) {
            let match;
            while ((match = pageRegex.exec(q.explanation)) !== null) {
                relatedPages.add(parseInt(match[1]));
            }
        }

        return {
            ...q,
            id: index + 1, // 重新编号
            content: cleanContent,
            options: cleanOptions,
            relatedPages: Array.from(relatedPages).sort((a, b) => a - b), // 存储关联页码
            userAnswer: null
        };
    });
};

const chatWithAI = async (question, userQuery, config, pdfId) => {
    if (!config.apiKey) {
        throw new Error('API Key is required');
    }

    // 1. 尝试检索相关上下文 (可选，增强回答准确性)
    let ragContext = "";
    if (pdfId) {
        try {
            const retrievedDocs = await ragService.retrieveContext(pdfId, userQuery, config);
            if (retrievedDocs.length > 0) {
                ragContext = retrievedDocs.map(doc => `[Page ${doc.page}]: ${doc.content}`).join("\n\n");
            }
        } catch (e) {
            console.warn("Chat RAG failed, proceeding without extra context", e);
        }
    }

    // 2. 创建服务实例
    const service = AIServiceFactory.createService(config);

    // 3. 调用对话
    return await service.chatWithAI({ question, ragContext }, userQuery);
};

module.exports = {
    generateQuiz,
    chatWithAI
};
