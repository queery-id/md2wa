/**
 * Markdown to WhatsApp - Core Application
 * Converts LLM markdown output to WhatsApp-friendly format
 */

// DOM Elements
const $ = (id) => document.getElementById(id);
const input = $('input');
const output = $('output');
const wordCount = $('wordCount');
const status = $('status');
const btnProcess = $('btnProcess');
const btnCopy = $('btnCopy');
const btnShare = $('btnShare');
const btnClear = $('btnClear');
const outputContainer = $('outputContainer');

// ========================================
// Markdown Conversion Rules
// ========================================

const conversionRules = [
    // --- Humanize Punctuation ---
    // Em dash: kata—kata -> kata — kata
    { name: 'emDash', pattern: /([0-9A-Za-zÀ-ÖØ-öø-ÿ])—([0-9A-Za-zÀ-ÖØ-öø-ÿ])/g, replacement: '$1 — $2' },
    // En dash
    { name: 'enDash', pattern: /([0-9A-Za-zÀ-ÖØ-öø-ÿ])–([0-9A-Za-zÀ-ÖØ-öø-ÿ])/g, replacement: '$1 — $2' },
    // Double hyphen
    { name: 'doubleHyphen', pattern: /([0-9A-Za-zÀ-ÖØ-öø-ÿ])-\s*-([0-9A-Za-zÀ-ÖØ-öø-ÿ])/g, replacement: '$1 — $2' },
    // Normalize em dash spacing
    { name: 'dashSpacing', pattern: /\s*—\s*/g, replacement: ' — ' },

    // --- Code Blocks (must be before other rules) ---
    // Fenced code blocks: ```lang\ncode\n``` -> code
    { name: 'codeBlockFenced', pattern: /```[\w]*\n?([\s\S]*?)```/g, replacement: '$1' },
    // Inline code: `code` -> code
    { name: 'inlineCode', pattern: /`([^`]+)`/g, replacement: '$1' },

    // --- Headings ---
    // Remove markdown headings (##### to #)
    { name: 'heading5', pattern: /^#####\s+/gm, replacement: '' },
    { name: 'heading4', pattern: /^####\s+/gm, replacement: '' },
    { name: 'heading3', pattern: /^###\s+/gm, replacement: '' },
    { name: 'heading2', pattern: /^##\s+/gm, replacement: '' },
    { name: 'heading1', pattern: /^#\s+/gm, replacement: '' },

    // --- Text Formatting ---
    // Bold+Italic: ***text*** -> *text*
    { name: 'boldItalic', pattern: /\*\*\*([^*]+)\*\*\*/g, replacement: '*$1*' },
    // Bold: **text** -> *text* (WA bold)
    { name: 'bold', pattern: /\*\*([^*]+)\*\*/g, replacement: '*$1*' },
    // Italic underscore: _text_ -> _text_ (keep for WA)
    // Strikethrough: ~~text~~ -> ~text~ (WA format)
    { name: 'strikethrough', pattern: /~~([^~]+)~~/g, replacement: '~$1~' },

    // --- Links ---
    // Perplexity format: [n](url) at start of line -> [n] url
    // Must be before general inlineLink to avoid double processing
    { name: 'perplexityUrl', pattern: /^\s*\[(\d+)\]\((https?:\/\/[^)]+)\)\s*$/gm, replacement: '[$1] $2' },
    // Inline link: [text](url) -> text (url) - but NOT for numbered refs
    { name: 'inlineLink', pattern: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '$1 ($2)' },
    // Reference link with label: [1] [url](url) -> [1] url
    { name: 'refLinkDuplicate', pattern: /^\s*(\[\d+\])\s*\[(https?:\/\/[^\]\s]+)\]\(\2\)\s*$/gm, replacement: '$1 $2' },
    // Reference link bracket: [1] [url] -> [1] url
    { name: 'refLinkBracket', pattern: /^\s*(\[\d+\])\s*\[(https?:\/\/[^\]\s]+)\]\s*$/gm, replacement: '$1 $2' },
    // Reference style: [1]: url "title" -> [1] url
    { name: 'refStyle', pattern: /^\s*\[(\d+)\]:\s*(https?:\/\/\S+)(?:\s+"[^"]*")?\s*$/gm, replacement: '[$1] $2' },

    // --- Lists ---
    // Bullet: - item or * item -> • item
    { name: 'bulletDash', pattern: /^(\s*)[-]\s+/gm, replacement: '$1• ' },
    { name: 'bulletAsterisk', pattern: /^(\s*)\*\s+(?!\*)/gm, replacement: '$1• ' },
    // Numbered list: keep as is, just normalize
    { name: 'numberedList', pattern: /^(\s*)(\d+)\.\s+/gm, replacement: '$1$2. ' },

    // --- Blockquotes ---
    // > quote -> » quote
    { name: 'blockquote', pattern: /^>\s*/gm, replacement: '» ' },

    // --- Separators ---
    // Horizontal rules: --- or *** or ___ -> _____
    { name: 'hrDash', pattern: /^\s*-{3,}\s*$/gm, replacement: '_____' },
    { name: 'hrAsterisk', pattern: /^\s*\*{3,}\s*$/gm, replacement: '_____' },
    { name: 'hrUnderscore', pattern: /^\s*_{3,}\s*$/gm, replacement: '_____' },

    // --- URL Cleanup ---
    // Clean Amazon S3 URLs (remove AWS auth params)
    { name: 's3Cleanup', pattern: /(https?:\/\/[^\/]*\.s3\.amazonaws\.com\/[^?\s]+)\?[^\s\])]+/g, replacement: '$1' },
    // Remove utm_source=chatgpt.com
    { name: 'utmChatgpt', pattern: /\?utm_source=chatgpt\.com(?=[\s"'()\]]|$)/g, replacement: '' },
    { name: 'utmChatgptAmp', pattern: /&utm_source=chatgpt\.com(?=[\s"'()\]]|$)/g, replacement: '' },
    // Remove general utm_* parameters
    { name: 'utmGeneral', pattern: /(\?|&)(utm_[^=]+=[^&#\s"]+)/g, replacement: '' },
    // Clean leftover query strings
    { name: 'queryCleanup1', pattern: /\?&/g, replacement: '?' },
    { name: 'queryCleanup2', pattern: /&&/g, replacement: '&' },
    { name: 'queryCleanup3', pattern: /(\?|&)(?=[\s"'()\]]|$)/g, replacement: '' },

    // --- Whitespace ---
    // Multiple empty lines -> max 2
    { name: 'emptyLines', pattern: /((\r?\n)[ \t]*){3,}/g, replacement: '\n\n' },
    // Add blank line before first URL reference (when after paragraph content)
    { name: 'refListStart', pattern: /([^\n\[\d])(\r?\n)(\s*\[\d+\]\s+(?:https?:\/\/|\S))/gm, replacement: '$1$2$2$3' },
    // Ensure single blank line between consecutive URL refs (when directly adjacent)
    { name: 'refSpacing', pattern: /(\[\d+\][^\n]+)(\r?\n)(?=\[\d+\])/gm, replacement: '$1$2$2' },

    // --- Escape Cleanup ---
    // \$ -> $
    { name: 'escapeDollar', pattern: /\\\$/g, replacement: '$' },
    // Remove stray backslashes
    { name: 'escapeBackslash', pattern: /\\/g, replacement: '' },

    // --- Final Cleanup ---
    // Trim leading/trailing whitespace
    { name: 'trimStart', pattern: /^\s+/, replacement: '' },
    { name: 'trimEnd', pattern: /\s+$/, replacement: '' },
];

// ========================================
// Core Functions
// ========================================

/**
 * Process text through all conversion rules
 */
function processText(text) {
    if (!text || !text.trim()) return '';

    let result = text;

    for (const rule of conversionRules) {
        result = result.replace(rule.pattern, rule.replacement);
    }

    return result;
}

/**
 * Count words in text
 */
function countWords(text) {
    const matches = (text || '').trim().match(/\S+/g);
    return matches ? matches.length : 0;
}

/**
 * Update word counter display
 */
function updateWordCount() {
    const count = countWords(input.value);
    wordCount.textContent = `${count} kata`;

    // Warning if too many words
    if (count > 5000) {
        wordCount.style.color = 'var(--accent-red)';
    } else if (count > 3000) {
        wordCount.style.color = 'var(--accent-yellow)';
    } else {
        wordCount.style.color = '';
    }
}

/**
 * Show status message
 */
function showStatus(message, type = 'success') {
    status.textContent = message;
    status.className = 'status';
    if (type === 'error') status.classList.add('error');
    if (type === 'warning') status.classList.add('warning');

    // Auto-hide after 3 seconds
    setTimeout(() => {
        status.textContent = '';
    }, 3000);
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    if (!text) {
        showStatus('Output kosong.', 'warning');
        return false;
    }

    try {
        // Modern Clipboard API
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        throw new Error('Clipboard API not available');
    } catch (e) {
        // Fallback for older browsers
        try {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', '');
            textarea.style.position = 'absolute';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            return success;
        } catch (fallbackError) {
            return false;
        }
    }
}

/**
 * Select all text in output
 */
function selectOutput() {
    const range = document.createRange();
    range.selectNodeContents(output);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

/**
 * Share to WhatsApp
 */
function shareToWhatsApp() {
    const text = output.textContent;
    if (!text) {
        showStatus('Output kosong.', 'warning');
        return;
    }

    // Encode text for URL
    const encoded = encodeURIComponent(text);
    const waUrl = `https://wa.me/?text=${encoded}`;

    // Open in new tab/window
    window.open(waUrl, '_blank');
    showStatus('Membuka WhatsApp...');
}

// ========================================
// Event Handlers
// ========================================

// Process button
btnProcess.addEventListener('click', () => {
    const result = processText(input.value);
    output.textContent = result;
    showStatus('✓ Berhasil diproses!');
});

// Copy button
btnCopy.addEventListener('click', async () => {
    const text = output.textContent;
    const success = await copyToClipboard(text);
    if (success) {
        showStatus('✓ Disalin ke clipboard!');
    } else {
        showStatus('Gagal menyalin.', 'error');
    }
});

// Share button
btnShare.addEventListener('click', shareToWhatsApp);

// Clear button
btnClear.addEventListener('click', () => {
    input.value = '';
    output.textContent = '';
    updateWordCount();
    showStatus('Dibersihkan.');
});

// Output container click - select all
outputContainer.addEventListener('click', selectOutput);

// Input change - update word count
input.addEventListener('input', updateWordCount);

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+Enter = Process
    if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        btnProcess.click();
    }

    // Ctrl+Shift+C = Copy output
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        btnCopy.click();
    }
});

// ========================================
// Initialization
// ========================================

// Initialize word counter
updateWordCount();

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('SW registered'))
            .catch(err => console.log('SW registration failed'));
    });
}

console.log('MD2WA v2.0 loaded');
