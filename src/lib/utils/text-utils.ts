/**
 * Normalize text for comparison by:
 * - Converting to lowercase
 * - Removing extra whitespace
 * - Removing punctuation
 * - Trimming
 */
export function normalizeText(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^\w\s]/g, "") // Remove punctuation
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy matching of user responses
 */
function levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    matrix[i][j - 1] + 1, // insertion
                    matrix[i - 1][j] + 1 // deletion
                );
            }
        }
    }

    return matrix[str2.length][str1.length];
}

/**
 * Calculate similarity between two strings (0-1 scale)
 * 1 = identical, 0 = completely different
 */
export function calculateSimilarity(str1: string, str2: string): number {
    const normalized1 = normalizeText(str1);
    const normalized2 = normalizeText(str2);

    if (normalized1 === normalized2) {
        return 1;
    }

    const maxLength = Math.max(normalized1.length, normalized2.length);
    if (maxLength === 0) {
        return 1;
    }

    const distance = levenshteinDistance(normalized1, normalized2);
    return 1 - distance / maxLength;
}

/**
 * Validate if user's response is close enough to the expected text
 * Returns true if similarity is above threshold (default 85%)
 */
export function validateResponse(
    userResponse: string,
    expectedText: string,
    threshold: number = 0.85
): boolean {
    const similarity = calculateSimilarity(userResponse, expectedText);
    return similarity >= threshold;
}

/**
 * Extract the first N words from a text
 */
export function getFirstWords(text: string, count: number): string {
    const words = text.split(/\s+/);
    return words.slice(0, count).join(" ");
}

/**
 * Count total words in a text
 */
export function countWords(text: string): number {
    return text.trim().split(/\s+/).length;
}
