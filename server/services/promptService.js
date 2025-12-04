const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const DEFAULT_PROMPT_FILE = path.join(DATA_DIR, 'prompt_template.txt');

// 映射类型到文件名
const PROMPT_FILES = {
    'default': 'prompt_template.txt',
    'multiple_choice': 'prompt_multiple_choice.txt',
    'true_false': 'prompt_true_false.txt',
    'short_answer': 'prompt_short_answer.txt'
};

// 确保目录存在
const ensureDir = async () => {
    try {
        await fs.access(DATA_DIR);
    } catch {
        await fs.mkdir(DATA_DIR, { recursive: true });
    }
};

const getPrompt = async (type = 'default') => {
    try {
        await ensureDir();
        const filename = PROMPT_FILES[type] || PROMPT_FILES['default'];
        const filePath = path.join(DATA_DIR, filename);
        
        try {
            const data = await fs.readFile(filePath, 'utf-8');
            return data;
        } catch (err) {
            // 如果特定类型文件不存在，尝试回退到默认
            if (type !== 'default') {
                return getPrompt('default');
            }
            return "默认 Prompt: 请根据上下文生成题目..."; 
        }
    } catch (error) {
        console.error(`Error reading prompt for type ${type}:`, error);
        throw new Error('Failed to read prompt file');
    }
};

const getAllPrompts = async () => {
    const prompts = {};
    for (const type of Object.keys(PROMPT_FILES)) {
        prompts[type] = await getPrompt(type);
    }
    return prompts;
};

const savePrompt = async (content, type = 'default') => {
    try {
        await ensureDir();
        const filename = PROMPT_FILES[type] || PROMPT_FILES['default'];
        const filePath = path.join(DATA_DIR, filename);
        
        await fs.writeFile(filePath, content, 'utf-8');
        return true;
    } catch (error) {
        console.error(`Error saving prompt for type ${type}:`, error);
        throw new Error('Failed to save prompt file');
    }
};

module.exports = {
    getPrompt,
    getAllPrompts,
    savePrompt
};