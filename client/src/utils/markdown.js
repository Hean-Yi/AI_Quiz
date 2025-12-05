import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// Configure marked
marked.setOptions({
    gfm: true,
    breaks: true
});

/**
 * Render Markdown string to HTML with LaTeX support
 * @param {string} text 
 * @returns {string}
 */
export const renderMarkdown = (text) => {
    if (!text) return '';

    // 1. Pre-process LaTeX to protect it from markdown parsing? 
    // Or render it after? 
    // Common strategy: Render LaTeX first to HTML, then let marked handle the rest.
    // But marked might escape HTML.
    // Better strategy: Use a tokenizer extension for marked.
    
    // Simple approach: 
    // Replace $$...$$ and $...$ with placeholders, render markdown, then restore and render LaTeX.
    // OR: Just use a simple regex replacer if the content is simple.
    
    // Let's try to render LaTeX first, but wrap it in a way marked ignores? No.
    
    // Let's use the "render after" approach, but we need to ensure marked didn't escape the $ signs.
    // Marked usually doesn't escape $ unless it's in a code block.
    
    // Let's try a custom renderer for marked or just a simple replacement loop.
    
    const mathExpressions = [];
    
    // Protect math blocks
    let protectedText = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, tex) => {
        mathExpressions.push({ type: 'display', tex });
        return `___MATH_DISPLAY_${mathExpressions.length - 1}___`;
    });
    
    protectedText = protectedText.replace(/\$([^$]+?)\$/g, (match, tex) => {
        mathExpressions.push({ type: 'inline', tex });
        return `___MATH_INLINE_${mathExpressions.length - 1}___`;
    });
    
    // Render Markdown
    let html = marked(protectedText);
    
    // Restore and render Math
    mathExpressions.forEach((item, index) => {
        try {
            const rendered = katex.renderToString(item.tex, {
                displayMode: item.type === 'display',
                throwOnError: false
            });
            const placeholder = item.type === 'display' 
                ? `___MATH_DISPLAY_${index}___` 
                : `___MATH_INLINE_${index}___`;
            
            html = html.replace(placeholder, rendered);
        } catch (e) {
            console.error('KaTeX error:', e);
        }
    });
    
    return html;
};
