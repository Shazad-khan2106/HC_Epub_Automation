import { CardContentData, WhyMatchReason } from './CardContentExtractor';

export interface CardValidationResult {
    isValid: boolean;
    bookTitle: { isValid: boolean; message: string };
    authors: { isValid: boolean; message: string };
    relevanceScore: { isValid: boolean; message: string };
    coverImage: { isValid: boolean; message: string };
    description: { isValid: boolean; message: string };
    whyMatchReasons: { isValid: boolean; message: string; reasons: ReasonValidationResult[] };
    highlightedTexts: { isValid: boolean; message: string };
    errors: string[];
}

export interface ReasonValidationResult {
    reasonNumber: number;
    isValid: boolean;
    reasonText: { isValid: boolean; message: string };
    highlightedText: { isValid: boolean; message: string };
    citationType: { isValid: boolean; message: string };
}

export class CardContentValidator {
    static validateCardContent(extractedData: CardContentData, expectedData: CardContentData): CardValidationResult {
        console.log('🔍 Starting comprehensive card content validation');
        
        const result: CardValidationResult = {
            isValid: true,
            bookTitle: { isValid: false, message: '' },
            authors: { isValid: false, message: '' },
            relevanceScore: { isValid: false, message: '' },
            coverImage: { isValid: false, message: '' },
            description: { isValid: false, message: '' },
            whyMatchReasons: { isValid: false, message: '', reasons: [] },
            highlightedTexts: { isValid: false, message: '' },
            errors: []
        };

        // Validate book title
        result.bookTitle = this.validateBookTitle(extractedData.bookTitle, expectedData.bookTitle);
        if (!result.bookTitle.isValid) {
            result.isValid = false;
            result.errors.push(result.bookTitle.message);
        }

        // Validate authors
        result.authors = this.validateAuthors(extractedData.authors, expectedData.authors);
        if (!result.authors.isValid) {
            result.isValid = false;
            result.errors.push(result.authors.message);
        }

        // Validate relevance score
        

        // Validate why match reasons
        const reasonsValidation = this.validateWhyMatchReasons(extractedData.whyMatchReasons, expectedData.whyMatchReasons);
        result.whyMatchReasons = reasonsValidation;
        if (!reasonsValidation.isValid) {
            result.isValid = false;
            result.errors.push(reasonsValidation.message);
        }

        // Validate highlighted texts
        result.highlightedTexts = this.validateHighlightedTexts(extractedData.highlightedTexts, expectedData.highlightedTexts);
        if (!result.highlightedTexts.isValid) {
            result.isValid = false;
            result.errors.push(result.highlightedTexts.message);
        }

        console.log(`✅ Card validation completed: ${result.isValid ? 'PASS' : 'FAIL'}`);
        return result;
    }

    private static validateBookTitle(extracted: string, expected: string): { isValid: boolean; message: string } {
        const extractedClean = extracted.trim();
        const expectedClean = expected.trim();
        
        if (extractedClean === expectedClean) {
            return { isValid: true, message: `Book title matches: "${extractedClean}"` };
        } else {
            return { isValid: false, message: `Book title mismatch: Expected "${expectedClean}", found "${extractedClean}"` };
        }
    }

    private static validateAuthors(extracted: string, expected: string): { isValid: boolean; message: string } {
        const extractedClean = extracted.trim();
        const expectedClean = expected.trim();
        
        if (extractedClean === expectedClean) {
            return { isValid: true, message: `Authors match: "${extractedClean}"` };
        } else {
            return { isValid: false, message: `Authors mismatch: Expected "${expectedClean}", found "${extractedClean}"` };
        }
    }

    private static validateRelevanceScore(extracted: string, expected: string): { isValid: boolean; message: string } {
        const extractedNum = parseInt(extracted) || 0;
        const expectedNum = parseInt(expected) || 0;
        
        if (Math.abs(extractedNum - expectedNum) <= 5) {
            return { isValid: true, message: `Relevance score matches: ${extractedNum}% (expected ${expectedNum}%)` };
        } else {
            return { isValid: false, message: `Relevance score mismatch: Expected ${expectedNum}%, found ${extractedNum}%` };
        }
    }

    private static validateCoverImage(coverImageUrl: string): { isValid: boolean; message: string } {
        if (coverImageUrl && coverImageUrl.startsWith('http')) {
            return { isValid: true, message: 'Cover image URL is valid' };
        } else {
            return { isValid: false, message: 'Cover image URL is invalid or missing' };
        }
    }

    private static validateDescription(extracted: string, expected: string): { isValid: boolean; message: string } {
        if (!extracted || extracted.trim().length === 0) {
            return { isValid: false, message: 'Description is empty or missing' };
        }

        // For description, we might want to check for similarity rather than exact match
        const similarity = this.calculateSimilarity(extracted, expected);
        if (similarity > 0.7) {
            return { isValid: true, message: `Description matches (similarity: ${(similarity * 100).toFixed(1)}%)` };
        } else {
            return { isValid: false, message: `Description mismatch (similarity: ${(similarity * 100).toFixed(1)}%)` };
        }
    }

    private static validateWhyMatchReasons(
        extracted: WhyMatchReason[], 
        expected: WhyMatchReason[]
    ): { isValid: boolean; message: string; reasons: ReasonValidationResult[] } {
        if (extracted.length !== expected.length) {
            return {
                isValid: false,
                message: `Reason count mismatch: Expected ${expected.length}, found ${extracted.length}`,
                reasons: []
            };
        }

        const reasonResults: ReasonValidationResult[] = [];
        let allReasonsValid = true;

        for (let i = 0; i < extracted.length; i++) {
            const extractedReason = extracted[i];
            const expectedReason = expected[i];
            
            const reasonValidation = this.validateSingleReason(extractedReason, expectedReason, i + 1);
            reasonResults.push(reasonValidation);

            if (!reasonValidation.isValid) {
                allReasonsValid = false;
            }
        }

        return {
            isValid: allReasonsValid,
            message: allReasonsValid ? 
                `All ${extracted.length} reasons validated successfully` :
                `Some reasons failed validation`,
            reasons: reasonResults
        };
    }

    private static validateSingleReason(
        extracted: WhyMatchReason, 
        expected: WhyMatchReason, 
        reasonNumber: number
    ): ReasonValidationResult {
        const result: ReasonValidationResult = {
            reasonNumber,
            isValid: true,
            reasonText: { isValid: false, message: '' },
            highlightedText: { isValid: false, message: '' },
            citationType: { isValid: false, message: '' }
        };

        // Validate reason text
        const reasonTextSimilarity = this.calculateSimilarity(extracted.reasonText, expected.reasonText);
        result.reasonText = reasonTextSimilarity > 0.6 ? 
            { isValid: true, message: `Reason text matches (similarity: ${(reasonTextSimilarity * 100).toFixed(1)}%)` } :
            { isValid: false, message: `Reason text mismatch (similarity: ${(reasonTextSimilarity * 100).toFixed(1)}%)` };

        // Validate highlighted text
        result.highlightedText = extracted.highlightedText === expected.highlightedText ?
            { isValid: true, message: `Highlighted text matches: "${extracted.highlightedText}"` } :
            { isValid: false, message: `Highlighted text mismatch: Expected "${expected.highlightedText}", found "${extracted.highlightedText}"` };

        // Validate citation type
        result.citationType = extracted.citationType === expected.citationType ?
            { isValid: true, message: `Citation type matches: ${extracted.citationType}` } :
            { isValid: false, message: `Citation type mismatch: Expected ${expected.citationType}, found ${extracted.citationType}` };

        result.isValid = result.reasonText.isValid && result.highlightedText.isValid && result.citationType.isValid;
        
        return result;
    }

    private static validateHighlightedTexts(
        extracted: string[], 
        expected: string[]
    ): { isValid: boolean; message: string } {
        if (extracted.length !== expected.length) {
            return {
                isValid: false,
                message: `Highlighted texts count mismatch: Expected ${expected.length}, found ${extracted.length}`
            };
        }

        for (let i = 0; i < extracted.length; i++) {
            if (extracted[i] !== expected[i]) {
                return {
                    isValid: false,
                    message: `Highlighted text ${i + 1} mismatch: Expected "${expected[i]}", found "${extracted[i]}"`
                };
            }
        }

        return {
            isValid: true,
            message: `All ${extracted.length} highlighted texts match`
        };
    }

    private static calculateSimilarity(text1: string, text2: string): number {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        
        const commonWords = words1.filter(word => words2.includes(word));
        return commonWords.length / Math.max(words1.length, words2.length);
    }

    static generateValidationReport(validationResult: CardValidationResult): string {
        let report = `CARD CONTENT VALIDATION REPORT\n`;
        report += '='.repeat(50) + '\n';
        report += `OVERALL STATUS: ${validationResult.isValid ? '✅ PASS' : '❌ FAIL'}\n\n`;

        report += `BOOK TITLE: ${validationResult.bookTitle.isValid ? '✅' : '❌'} ${validationResult.bookTitle.message}\n`;
        report += `AUTHORS: ${validationResult.authors.isValid ? '✅' : '❌'} ${validationResult.authors.message}\n`;
        report += `RELEVANCE SCORE: ${validationResult.relevanceScore.isValid ? '✅' : '❌'} ${validationResult.relevanceScore.message}\n`;
        report += `COVER IMAGE: ${validationResult.coverImage.isValid ? '✅' : '❌'} ${validationResult.coverImage.message}\n`;
        report += `DESCRIPTION: ${validationResult.description.isValid ? '✅' : '❌'} ${validationResult.description.message}\n`;
        report += `WHY MATCH REASONS: ${validationResult.whyMatchReasons.isValid ? '✅' : '❌'} ${validationResult.whyMatchReasons.message}\n`;
        report += `HIGHLIGHTED TEXTS: ${validationResult.highlightedTexts.isValid ? '✅' : '❌'} ${validationResult.highlightedTexts.message}\n`;

        if (validationResult.whyMatchReasons.reasons.length > 0) {
            report += '\nDETAILED REASON VALIDATION:\n';
            validationResult.whyMatchReasons.reasons.forEach(reason => {
                report += `  Reason ${reason.reasonNumber}: ${reason.isValid ? '✅' : '❌'}\n`;
                if (!reason.reasonText.isValid) report += `    - Reason Text: ${reason.reasonText.message}\n`;
                if (!reason.highlightedText.isValid) report += `    - Highlighted Text: ${reason.highlightedText.message}\n`;
                if (!reason.citationType.isValid) report += `    - Citation Type: ${reason.citationType.message}\n`;
            });
        }

        if (validationResult.errors.length > 0) {
            report += '\nERRORS:\n';
            validationResult.errors.forEach(error => {
                report += `  ❌ ${error}\n`;
            });
        }

        return report;
    }
}