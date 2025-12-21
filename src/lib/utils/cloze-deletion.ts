import { countWords } from "./text-utils";

/**
 * Progressive cloze deletion algorithm
 * Gradually removes words from a verse over 7 steps
 * 
 * Step 1: Full verse (100% visible)
 * Step 2: ~85% visible
 * Step 3: ~70% visible
 * Step 4: ~55% visible
 * Step 5: ~40% visible
 * Step 6: ~25% visible
 * Step 7: ~10% visible (only first few words as hint)
 */

export interface ClozeResult {
    displayText: string;
    step: number;
    totalSteps: number;
    percentageVisible: number;
}

const TOTAL_STEPS = 7;

/**
 * Calculate how many words should be visible at each step
 */
function calculateVisibleWords(totalWords: number, step: number): number {
    if (step === 1) {
        return totalWords; // Show full verse
    }

    // Progressive reduction: 85%, 70%, 55%, 40%, 25%, 10%
    const percentages = [1.0, 0.85, 0.70, 0.55, 0.40, 0.25, 0.10];
    const percentage = percentages[step - 1] || 0.10;

    const visibleWords = Math.max(2, Math.ceil(totalWords * percentage));
    return visibleWords;
}

/**
 * Generate cloze-deleted version of text for a given step
 */
export function generateClozeText(verseText: string, step: number): ClozeResult {
    const words = verseText.split(/\s+/);
    const totalWords = words.length;
    const visibleWords = calculateVisibleWords(totalWords, step);

    let displayText: string;
    let percentageVisible: number;

    if (step === 1) {
        // Step 1: Show full verse
        displayText = verseText;
        percentageVisible = 100;
    } else {
        // Show first N words, replace rest with blanks
        const visiblePart = words.slice(0, visibleWords).join(" ");
        const hiddenCount = totalWords - visibleWords;
        const blanks = "_____".repeat(Math.min(hiddenCount, 5)); // Show up to 5 blanks

        displayText = `${visiblePart} ${blanks}`;
        percentageVisible = Math.round((visibleWords / totalWords) * 100);
    }

    return {
        displayText,
        step,
        totalSteps: TOTAL_STEPS,
        percentageVisible,
    };
}

/**
 * Get the expected full text for validation
 * (Always the complete verse, regardless of step)
 */
export function getExpectedText(verseText: string): string {
    return verseText;
}

/**
 * Check if user has completed all steps
 */
export function isComplete(currentStep: number): boolean {
    return currentStep >= TOTAL_STEPS;
}

/**
 * Get next step number
 */
export function getNextStep(currentStep: number): number {
    return Math.min(currentStep + 1, TOTAL_STEPS);
}

/**
 * Generate a hint for the user (show a bit more of the verse)
 */
export function generateHint(verseText: string, currentStep: number): string {
    const words = verseText.split(/\s+/);
    const totalWords = words.length;
    const currentVisible = calculateVisibleWords(totalWords, currentStep);

    // Show 2-3 more words as a hint
    const hintWords = Math.min(currentVisible + 3, totalWords);
    return words.slice(0, hintWords).join(" ") + "...";
}

/**
 * Create structured cloze test data for interactive components
 */
/**
 * Create structured cloze test data for interactive components
 */
export function createClozeTest(verseText: string, step: number) {
    const words = verseText.split(/\s+/);
    const totalWords = words.length;

    // Calculate how many words to hide based on step
    // Step 1: 0% hidden
    // Step 7: 90% hidden
    const percentages = [0, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90];
    const hidePercentage = percentages[step - 1] || 0;

    const wordsToHideCount = Math.floor(totalWords * hidePercentage);

    // Create an array of indices [0, 1, ... totalWords-1]
    const indices = Array.from({ length: totalWords }, (_, i) => i);

    // Shuffle indices to pick random words to hide
    // We use a seeded-like approach based on step to keep it consistent if re-rendered?
    // Actually, for a practice session, random is fine.
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    // Take the first N indices as the ones to hide
    const indicesToHide = new Set(indices.slice(0, wordsToHideCount));

    const parts = words.map((word, index) => {
        return {
            word: word,
            hidden: indicesToHide.has(index)
        };
    });

    return {
        parts,
        step,
        totalWords,
        hiddenCount: wordsToHideCount
    };
}
