/**
 * Resolves stored MCQ metadata (letter key and/or options[].correct) to the real answer string.
 * Firestore uploads set `correct_answer` to "A"–"E"; authoritative text is on the flagged option.
 */

export function resolveCorrectAnswerText(data) {
    if (!data) return '';
    const options = Array.isArray(data.options) ? data.options : [];
    const flagged = options.find((o) => o.correct === true);
    if (flagged?.text && String(flagged.text).trim()) {
        return String(flagged.text).trim();
    }
    const raw = String(data.correct_answer ?? data.correctAnswer ?? '').trim();
    if (/^[A-Z]$/i.test(raw) && options.length > 0) {
        const idx = raw.toUpperCase().charCodeAt(0) - 65;
        if (idx >= 0 && idx < options.length && options[idx]?.text) {
            return String(options[idx].text).trim();
        }
    }
    if (raw.length > 1) return raw;
    return '';
}

/** For admin labels: "B — Full option text" when letter is known */
export function formatCorrectAnswerForAdmin(data) {
    const text = resolveCorrectAnswerText(data);
    const raw = String(data?.correct_answer ?? data?.correctAnswer ?? '').trim();
    if (/^[A-Z]$/i.test(raw) && text) {
        return `${raw.toUpperCase()}. ${text}`;
    }
    return text || raw || 'N/A';
}
