import { BookData } from './bookExtractor';

export interface ValidationResult {
    bookTitle: string;
    isValid: boolean;
    details: {
        titleMatch: { isValid: boolean; message: string };
        scoreMatch: { isValid: boolean; message: string };
        gapMatch: { isValid: boolean; message: string };
        whyMatch: { isValid: boolean; message: string };
    };
    errors: string[];
}

export class AssertionUtils {
    static validateBooksComprehensive(extractedBooks: BookData[], expectedBooks: BookData[], log: (message: string) => void): ValidationResult[] {
        log('=== STARTING COMPREHENSIVE BOOK VALIDATION ===');
        
        const validationResults: ValidationResult[] = [];

        // Validate each book individually
        expectedBooks.forEach((expectedBook, index) => {
            log(`\n🔍 Validating Book ${index + 1}: ${expectedBook.bookTitle}`);
            
            const extractedBook = extractedBooks[index];
            const result: ValidationResult = {
                bookTitle: expectedBook.bookTitle,
                isValid: true,
                details: {
                    titleMatch: { isValid: false, message: '' },
                    scoreMatch: { isValid: false, message: '' },
                    gapMatch: { isValid: false, message: '' },
                    whyMatch: { isValid: false, message: '' }
                },
                errors: []
            };

            if (!extractedBook) {
                result.isValid = false;
                result.errors.push('Book not found in extracted results');
                validationResults.push(result);
                return;
            }

            // 1. Validate book title
            const titleResult = this.validateTitle(extractedBook.bookTitle, expectedBook.bookTitle);
            result.details.titleMatch = titleResult;
            if (!titleResult.isValid) {
                result.isValid = false;
                result.errors.push(titleResult.message);
            }
            log(`📖 ${titleResult.message}`);

            // 2. Validate relevance score
            const scoreResult = this.validateScore(extractedBook.relevanceScore, expectedBook.relevanceScore);
            result.details.scoreMatch = scoreResult;
            if (!scoreResult.isValid) {
                result.isValid = false;
                result.errors.push(scoreResult.message);
            }
            log(`📊 ${scoreResult.message}`);

            // 3. Validate gap information
            // In validateBooksComprehensive method, update the gap validation call:
            const gapResult = this.validateGap(extractedBook.gap, expectedBook.gap, extractedBook.relevanceScore);
            result.details.gapMatch = gapResult;
            if (!gapResult.isValid) {
                result.isValid = false;
                result.errors.push(gapResult.message);
            }
            log(`⚡ ${gapResult.message}`);

            // 4. Validate why match
            const whyMatchResult = this.validateWhyMatch(extractedBook.whyMatch, expectedBook.whyMatch);
            result.details.whyMatch = whyMatchResult;
            if (!whyMatchResult.isValid) {
                result.isValid = false;
                result.errors.push(whyMatchResult.message);
            }
            log(`❓ ${whyMatchResult.message}`);

            validationResults.push(result);
            
            if (result.isValid) {
                log(`✅ Book "${expectedBook.bookTitle}" - ALL VALIDATIONS PASSED`);
            } else {
                log(`❌ Book "${expectedBook.bookTitle}" - VALIDATION FAILED`);
                result.errors.forEach(error => log(`   - ${error}`));
            }
        });

        // Summary
        const passedCount = validationResults.filter(r => r.isValid).length;
        const totalCount = validationResults.length;
        
        log(`\n📈 VALIDATION SUMMARY: ${passedCount}/${totalCount} books passed validation`);
        
        if (passedCount === totalCount) {
            log('🎉 ALL BOOKS VALIDATED SUCCESSFULLY!');
        } else {
            log('💥 SOME VALIDATIONS FAILED:');
            validationResults.filter(r => !r.isValid).forEach(result => {
                log(`   - "${result.bookTitle}": ${result.errors.join(', ')}`);
            });
        }

        return validationResults;
    }

    private static validateTitle(extractedTitle: string, expectedTitle: string): { isValid: boolean; message: string } {
        const extracted = extractedTitle.trim();
        const expected = expectedTitle.trim();
        
        if (extracted === expected) {
            return { isValid: true, message: `Title matches: "${extracted}"` };
        } else {
            return { isValid: false, message: `Title mismatch: Expected "${expected}", found "${extracted}"` };
        }
    }

    private static validateScore(extractedScore: string, expectedScore: string): { isValid: boolean; message: string } {
        const extracted = parseInt(extractedScore) || 0;
        const expected = parseInt(expectedScore) || 0;
        
        if (Math.abs(extracted - expected) <= 5) { // Allow 5% difference
            return { isValid: true, message: `Score matches: ${extracted}% (expected ${expected}%)` };
        } else {
            return { isValid: false, message: `Score mismatch: Expected ${expected}%, found ${extracted}%` };
        }
    }

    private static validateGap(extractedGap: string, expectedGap: string, relevanceScore: string): { isValid: boolean; message: string } {
    const score = parseInt(relevanceScore) || 0;
    
    // New validation: If score is 100%, there should be no gap mentioned
    if (score === 100) {
        if (extractedGap && extractedGap !== 'No gap mentioned' && extractedGap.trim().length > 0) {
            return { 
                isValid: false, 
                message: `Perfect score (100%) but gap is mentioned: "${extractedGap}"` 
            };
        } else {
            return { 
                isValid: true, 
                message: 'Perfect score (100%) - no gap mentioned as expected' 
            };
        }
    }

    // Existing gap validation for scores < 100%
    if (!expectedGap || expectedGap === 'No gap mentioned') {
        return { isValid: true, message: 'No gap expected - validation skipped' };
    }

    if (!extractedGap || extractedGap === 'No gap mentioned') {
        return { isValid: false, message: 'Gap information missing' };
    }

    const similarity = this.calculateSimilarity(extractedGap, expectedGap);
    if (similarity > 0.6) {
        return { isValid: true, message: `Gap matches (similarity: ${(similarity * 100).toFixed(1)}%)` };
    } else {
        return { isValid: false, message: `Gap mismatch (similarity: ${(similarity * 100).toFixed(1)}%)` };
    }
}

    private static validateWhyMatch(extractedWhy: string, expectedWhy: string): { isValid: boolean; message: string } {
        if (!expectedWhy) {
            return { isValid: true, message: 'No why-match expected - validation skipped' };
        }

        if (!extractedWhy) {
            return { isValid: false, message: 'Why-match information missing' };
        }

        const expectedPoints = expectedWhy.split('|').length;
        const extractedPoints = extractedWhy.split('|').length;
        
        if (extractedPoints >= expectedPoints) {
            return { isValid: true, message: `Why-match points: ${extractedPoints} (expected ${expectedPoints})` };
        } else {
            return { isValid: false, message: `Why-match points insufficient: Found ${extractedPoints}, expected ${expectedPoints}` };
        }
    }

    private static calculateSimilarity(text1: string, text2: string): number {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        
        const commonWords = words1.filter(word => words2.includes(word));
        return commonWords.length / Math.max(words1.length, words2.length);
    }
}