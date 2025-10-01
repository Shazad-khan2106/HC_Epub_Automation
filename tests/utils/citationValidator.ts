import { GeminiService } from './geminiService';

export interface CitationValidationResult {
    reasonText: string;
    citationText: string;
    similarityScore: number;
    isValid: boolean;
    matchPercentage: number;
    errors: string[];
    reasonNumber: number;
    bookTitle: string;
    aiValidated?: boolean;
    aiConfidence?: number;
}

export class CitationValidator {
    private static geminiService: GeminiService = new GeminiService();

    static async validateCitationMatch(
        reasonText: string, 
        citationText: string, 
        reasonNumber: number, 
        bookTitle: string
    ): Promise<CitationValidationResult> {
        const result: CitationValidationResult = {
            reasonText,
            citationText,
            similarityScore: 0,
            isValid: false,
            matchPercentage: 0,
            errors: [],
            reasonNumber,
            bookTitle
        };

        try {
            this.validateInputs(reasonText, citationText, result);
            
            if (result.errors.length > 0) {
                return result;
            }

            const normalizedReason = this.normalizeText(reasonText);
            const normalizedCitation = this.normalizeText(citationText);

            // Primary validation: Check if reason contains citation text
            const containsCitation = normalizedReason.includes(normalizedCitation);
            
            if (containsCitation) {
                result.similarityScore = 1.0;
                result.matchPercentage = 100;
                result.isValid = true;
            } else {
                // Primary validation failed - try AI validation as fallback
                result.similarityScore = 0;
                result.matchPercentage = 0;
                result.isValid = false;
                result.errors.push(`Citation text not found in reason: "${citationText}"`);
                
                // Attempt AI validation for minor differences
                const aiValidationResult = await this.validateWithAI(reasonText, citationText, bookTitle, reasonNumber);
                if (aiValidationResult.isValid) {
                    // AI validation passed - override the result
                    result.similarityScore = aiValidationResult.similarityScore;
                    result.matchPercentage = aiValidationResult.matchPercentage;
                    result.isValid = aiValidationResult.isValid;
                    result.aiValidated = true;
                    result.aiConfidence = aiValidationResult.aiConfidence;
                    result.errors = []; // Clear errors since AI validation passed
                }
            }

        } catch (error) {
            result.errors.push(`Validation error: ${error}`);
        }

        return result;
    }

    private static async validateWithAI(
        reasonText: string, 
        citationText: string, 
        bookTitle: string, 
        reasonNumber: number
    ): Promise<{ isValid: boolean; similarityScore: number; matchPercentage: number; aiConfidence: number }> {
        try {
            console.log(`🤖 Attempting AI validation for "${bookTitle}" - Reason ${reasonNumber}`);
            
            const prompt = this.buildCitationValidationPrompt(reasonText, citationText, bookTitle, reasonNumber);
            const result = await this.geminiService.analyzeCitationMatch(reasonText, citationText);
            
            return result;
            
        } catch (error) {
            console.error(`❌ AI validation failed: ${error}`);
            return {
                isValid: false,
                similarityScore: 0,
                matchPercentage: 0,
                aiConfidence: 0
            };
        }
    }

    private static buildCitationValidationPrompt(
        reasonText: string, 
        citationText: string, 
        bookTitle: string, 
        reasonNumber: number
    ): string {
        return `
You are a citation validation assistant. Your task is to determine if the REASON text and CITATION text convey the same meaning despite minor wording differences.

CONTEXT:
- Book: "${bookTitle}"
- Reason Number: ${reasonNumber}

REASON TEXT:
"${reasonText}"

CITATION TEXT:
"${citationText}"

ANALYSIS CRITERIA:
1. Check if both texts are talking about the same concept/idea
2. Allow for minor wording variations, synonyms, and grammatical differences
3. Focus on semantic similarity rather than exact text matching
4. Consider context - both should refer to the same aspect of the book

VALIDATION RULES:
- PASS if the citation text represents the same core idea as the reason text
- PASS if there are minor wording differences but the meaning is identical
- FAIL only if the citation text describes a completely different concept

EXAMPLES:
Example 1 (PASS):
Reason: "The book posits that during the Christmas season, even the most cynical hearts become open to wondrous occurences"
Citation: "Christmas season, even the most cynical hearts become open to wondrous occurrences"
Analysis: Minor spelling difference "occurences" vs "occurrences" - same meaning

Example 2 (PASS):
Reason: "It gathers tales of some of the worst Christmases ever from some of the best writers around"
Citation: "worst Christmases ever"
Analysis: Citation is a subset of reason - same concept

Example 3 (FAIL):
Reason: "This book discusses Christmas traditions"
Citation: "summer vacation activities"
Analysis: Completely different concepts

RESPONSE FORMAT (JSON only):
{
    "isValid": true,
    "similarityScore": 0.95,
    "matchPercentage": 95,
    "aiConfidence": 90,
    "explanation": "Brief explanation of why they match despite differences"
}

Provide your analysis in the specified JSON format only.
`;
    }

    private static validateInputs(reasonText: string, citationText: string, result: CitationValidationResult): void {
        if (!reasonText || reasonText.trim().length === 0) {
            result.errors.push('Reason text is empty or invalid');
        }

        if (!citationText || citationText.trim().length === 0) {
            result.errors.push('Citation text is empty or invalid');
        }

        if (citationText.includes('Citation text not found') || citationText.includes('Error:')) {
            result.errors.push(`Citation extraction failed: ${citationText}`);
        }
    }

    private static normalizeText(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    static generateValidationReport(validationResults: { [bookTitle: string]: CitationValidationResult[] }): string {
        let report = 'CITATION VALIDATION DETAILED REPORT\n';
        report += '='.repeat(80) + '\n\n';
        
        let totalReasons = 0;
        let passedReasons = 0;
        let aiValidatedReasons = 0;
        
        Object.entries(validationResults).forEach(([bookTitle, results]) => {
            report += `BOOK: ${bookTitle}\n`;
            report += '-'.repeat(60) + '\n';
            
            results.forEach(result => {
                totalReasons++;
                const status = result.isValid ? 'PASS' : 'FAIL';
                const icon = result.isValid ? '✅' : '❌';
                const aiIndicator = result.aiValidated ? '🤖' : '';
                
                report += `${icon}${aiIndicator} Reason ${result.reasonNumber}: ${status} (${result.matchPercentage}%)`;
                
                if (result.aiValidated) {
                    report += ` [AI Validated - Confidence: ${result.aiConfidence}%]`;
                    aiValidatedReasons++;
                }
                report += '\n';
                
                if (!result.isValid) {
                    report += `   📝 Reason: ${result.reasonText.substring(0, 100)}...\n`;
                    report += `   📚 Citation: ${result.citationText.substring(0, 100)}...\n`;
                    result.errors.forEach(error => report += `   ⚠️  ${error}\n`);
                } else if (result.aiValidated) {
                    report += `   🤖 AI determined texts convey same meaning despite wording differences\n`;
                } else {
                    report += `   ✅ Citation found in reason\n`;
                }
                report += '\n';
                
                if (result.isValid) passedReasons++;
            });
            report += '\n';
        });
        
        const passRate = totalReasons > 0 ? (passedReasons / totalReasons) * 100 : 0;
        report += `SUMMARY: ${passedReasons}/${totalReasons} reasons passed (${passRate.toFixed(1)}%)\n`;
        report += `AI VALIDATED: ${aiValidatedReasons} reasons\n`;
        report += `OVERALL STATUS: ${passRate >= 80 ? 'PASS' : 'FAIL'}\n`;
        
        return report;
    }
}