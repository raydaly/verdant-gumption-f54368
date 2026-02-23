export function parseTags(str) {
    if (!str) return [];
    const VALID_PREFIXES = ['#', '@', '&', '!', '$'];
    const SYSTEM_KEYWORDS = ['legacy', 'daily', 'previewdays', 'special', 'owner', 'level5', 'level15', 'level50', 'level150'];

    return str.split(/[\s,]+/)
        .map(t => {
            let input = t.trim().toLowerCase();
            if (!input) return null;

            // Strip ALL existing prefixes to find the clean word
            let word = input;
            let foundPrefix = null;

            // Peek at the very first char
            const firstChar = input[0];
            if (VALID_PREFIXES.includes(firstChar)) {
                foundPrefix = firstChar;
                while (word.length > 0 && VALID_PREFIXES.includes(word[0])) {
                    foundPrefix = word[0];
                    word = word.substring(1);
                }
            }

            // Handle system keywords aggressively
            if (SYSTEM_KEYWORDS.includes(word)) {
                if (word === 'special') word = 'previewdays';
                return '&' + word;
            }
            if (word === 'specialevents') return '&previewdays';

            // Return with existing prefix or default to #
            if (foundPrefix) return foundPrefix + word;
            return '#' + word;
        })
        .filter(t => t && t.length > 1)
        .filter((t, i, arr) => arr.indexOf(t) === i);
}
