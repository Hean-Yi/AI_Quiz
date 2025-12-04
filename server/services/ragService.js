const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { HNSWLib } = require("@langchain/community/vectorstores/hnswlib");
const { OpenAIEmbeddings } = require("@langchain/openai");
const path = require('path');
const fs = require('fs');

const VECTOR_STORE_PATH = path.join(__dirname, '../data/vectors');

// 确保向量存储目录存在
if (!fs.existsSync(VECTOR_STORE_PATH)) {
    fs.mkdirSync(VECTOR_STORE_PATH, { recursive: true });
}

/**
 * 创建或加载向量存储
 * @param {string} pdfId - PDF 文件 ID
 * @param {Array} pages - PDF 页面文本数组
 * @param {Object} config - AI 配置 (apiKey, baseURL)
 */
const getOrCreateIndex = async (pdfId, pages, config) => {
    const saveDir = path.join(VECTOR_STORE_PATH, pdfId);
    const embeddings = new OpenAIEmbeddings({
        openAIApiKey: config.apiKey,
        configuration: {
            baseURL: config.baseURL || 'https://api.openai.com/v1'
        }
    });

    // 如果已存在索引，直接加载
    if (fs.existsSync(path.join(saveDir, 'args.json'))) {
        console.log(`Loading existing vector store for ${pdfId}`);
        return await HNSWLib.load(saveDir, embeddings);
    }

    console.log(`Creating new vector store for ${pdfId}`);
    
    // 1. 准备文档
    const docs = [];
    for (let i = 0; i < pages.length; i++) {
        const pageText = pages[i];
        if (!pageText.trim()) continue;

        // 使用 TextSplitter 切片
        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });

        const chunks = await splitter.createDocuments([pageText]);
        
        // 添加 Metadata
        chunks.forEach(chunk => {
            chunk.metadata = {
                pageNumber: i + 1,
                source: pdfId
            };
            docs.push(chunk);
        });
    }

    // 2. 创建向量存储
    const vectorStore = await HNSWLib.fromDocuments(docs, embeddings);
    
    // 3. 保存到磁盘
    await vectorStore.save(saveDir);
    
    return vectorStore;
};

/**
 * 检索相关上下文
 * @param {string} pdfId 
 * @param {string} query 
 * @param {Object} config 
 * @param {Array} pages - 如果需要新建索引，必须传入 pages
 */
const retrieveContext = async (pdfId, query, config, pages = []) => {
    try {
        const vectorStore = await getOrCreateIndex(pdfId, pages, config);
        
        // 检索 Top 5
        const results = await vectorStore.similaritySearch(query, 5);
        
        // 格式化输出
        return results.map(doc => ({
            content: doc.pageContent,
            page: doc.metadata.pageNumber
        }));
    } catch (error) {
        console.error('RAG Retrieval Error:', error);
        // 降级处理：如果 RAG 失败，返回空数组，让 AI 使用纯文本或报错
        return [];
    }
};

module.exports = {
    retrieveContext
};
