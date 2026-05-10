/**
 * Repairs common JSON export defects from AI / manual edits before JSON.parse.
 */
export function normalizeQuestionBankJson(raw) {
    let t = String(raw).trim();

    if (t.charCodeAt(0) === 0xfeff) t = t.slice(1);

    // ── Specific broken rows ───────────────────────────────────────────────────
    t = t.replace(
        /\{ "question": "What is the most common side effect of oral Iron supplementation\?", \{ "text": "Weight gain"/,
        '{ "question": "What is the most common side effect of oral Iron supplementation?", "topic": "Pharmacology", "difficulty": "Easy", "year": "2024-2025", "image_reference": false, "options": [ { "text": "Weight gain"'
    );
    t = t.replace(
        /"Dry mouth", "correct": false, "rationale": "Not a classic iron side effect\." \}, "topic": "Pharmacology"/,
        '"Dry mouth", "correct": false, "rationale": "Not a classic iron side effect." } ], "topic": "Pharmacology"'
    );

    // Trailing garbage on last line
    t = t.replace(/\}\s*\]\s*\}\s*"\s*$/m, '} ] }');

    // Standard field typos (missing quotes around key names)
    t = t.replace(/"year:\s*2024-2025"/g, '"year": "2024-2025"');
    t = t.replace(/"difficulty:\s*(Easy|Moderate|Hard)"/g, '"difficulty": "$1"');
    t = t.replace(/"topic:\s*([^"]+?)"/g, (_, topic) => `"topic": "${String(topic).trim()}"`);

    // Unquoted `topic:` at line start (common in broken exports)
    t = t.replace(/(^|\n)(\s*)topic:\s*"/g, '$1$2"topic": "');

    t = t.replace(/"image_reference:\s*false"/g, '"image_reference": false');
    t = t.replace(/"image_reference:\s*true"/g, '"image_reference": true');
    t = t.replace(/"image_reference:\s*false,/g, '"image_reference": false,');
    t = t.replace(/"image_reference:\s*true,/g, '"image_reference": true,');

    t = t.replace(/"options:\s*\[/g, '"options": [');

    // `correct` written without quotes on key
    t = t.replace(/"correct:\s*(true|false)/g, '"correct": $1');
    t = t.replace(/, correct:\s*(true|false)/g, ', "correct": $1');

    // `rationale` key missing quotes: , rationale: "text  OR  , rationale: bare text"
    t = t.replace(/, rationale:\s*"/g, ', "rationale": "');
    t = t.replace(/, rationale:\s+([^"]+?)"/g, ', "rationale": "$1"');

    // Broken `"rationale: text"` (single key string)
    t = t.replace(/"rationale:\s*/g, '"rationale": "');

    // Erroneous `]"` line endings after options array
    t = t.replace(/\]\s*"\s*\n/g, ']\n');

    t = t.replace(/\}\s*\]\s*\}\s*"/g, '} ] }');

    return t;
}

export function parseQuestionFile(raw, label = '') {
    const normalized = normalizeQuestionBankJson(raw);
    try {
        return JSON.parse(normalized);
    } catch (e) {
        const err = new Error(`${label || 'JSON'}: ${e.message}`);
        err.cause = e;
        const pos = Number((e.message.match(/position (\d+)/) || [])[1]);
        if (!Number.isNaN(pos)) {
            err.snippet = normalized.slice(Math.max(0, pos - 100), pos + 100);
        }
        throw err;
    }
}
