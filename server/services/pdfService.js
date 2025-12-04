import fs from 'fs';
import pdf from 'pdf-parse/lib/pdf-parse.js';

/**
 * 解析 PDF 文件内容
 * @param {string} filePath - 上传文件的本地路径
 * @returns {Promise<Object>} - 返回包含文本内容和元数据的对象
 */
export const parsePdf = async (filePath) => {
    try {
        const dataBuffer = fs.readFileSync(filePath);
        
        const pages = [];
        const render_page = (pageData) => {
            return pageData.getTextContent()
            .then(function(textContent) {
                let lastY, text = '';
                for (let item of textContent.items) {
                    if (lastY == item.transform[5] || !lastY){
                        text += item.str;
                    }  
                    else{
                        text += '\n' + item.str;
                    }                                                    
                    lastY = item.transform[5];
                }
                pages.push(text);
                return text;
            });
        }

        // 使用 pdf-parse 读取文件
        const data = await pdf(dataBuffer, { pagerender: render_page });

        return {
            text: data.text,
            totalPages: data.numpages,
            info: data.info,
            pages: pages, // 返回按页分割的文本数组
            paragraphs: splitTextToParagraphs(data.text)
        };
    } catch (error) {
        console.error('Error parsing PDF:', error);
        throw new Error('Failed to parse PDF file');
    }
};

/**
 * 辅助函数：简单的文本分段处理
 * 移除空行，按双换行符分割
 */
const splitTextToParagraphs = (text) => {
    if (!text) return [];
    return text
        .split(/\n\s*\n/) // 按空行分割
        .map(p => p.trim())
        .filter(p => p.length > 0); // 移除空段落
};
