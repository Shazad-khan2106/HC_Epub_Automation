import { GoogleGenerativeAI } from "@google/generative-ai";
import { BookData } from "./bookExtractor";

export interface BookAnalysisResult {
    bookTitle: string;
    overallScore: number;
    sectionScores: Array<{section: string; score: number; feedback: string}>;
    detailedFeedback: string[];
    improvementSuggestions: string[];
}

export interface AIAnalysisResult {
    query: string;
    overallScore: number;
    bookAnalyses: BookAnalysisResult[];
    summaryFeedback: string[];
    improvementSuggestions: string[];
}

export class GeminiService {
    private genAI: GoogleGenerativeAI;
    private model: any;
    private readonly maxRetries = 3;
    private readonly baseDelay = 2000; // 2 seconds

    constructor() {
        const apiKey = 'AIzaSyCN6q7xeIAdIns9REfA7TagfoRY3ljHw90';
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    }

    /**
     * Analyze response relevance to query using Gemini AI - Now with per-book analysis
     */
    async analyzeResponseRelevance(query: string, response: string, books: BookData[]): Promise<AIAnalysisResult> {
        let lastError: Error | null = null;
        
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                console.log(`🤖 Gemini AI Analysis Attempt ${attempt}/${this.maxRetries}`);
                
                const prompt = this.buildPerBookAnalysisPrompt(query, response, books);
                const result = await this.model.generateContent(prompt);
                const responseText = await result.response.text();
                
                console.log(`✅ Gemini AI Analysis successful on attempt ${attempt}`);
                return this.parseGeminiResponse(responseText);
                
            } catch (error: any) {
                lastError = error;
                console.error(`❌ Gemini AI Analysis attempt ${attempt} failed:`, error.message);
                
                // Check if it's a retryable error (503, 429, etc.)
                if (this.isRetryableError(error) && attempt < this.maxRetries) {
                    const delay = this.baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    console.log(`⏳ Retrying in ${delay}ms...`);
                    await this.delay(delay);
                } else if (attempt === this.maxRetries) {
                    console.error(`💥 All ${this.maxRetries} attempts failed`);
                    break;
                }
            }
        }
        
        // If all retries failed, return fallback result
        console.error('🎯 Using fallback analysis due to persistent API errors');
        return this.getDefaultErrorResult(query, books, lastError || undefined);
    }

    private isRetryableError(error: any): boolean {
        // Retry on these status codes
        const retryableStatusCodes = [429, 500, 502, 503, 504];
        const retryableMessages = [
            'overloaded',
            'rate limit',
            'too many requests',
            'service unavailable',
            'internal error'
        ];
        
        if (error.status && retryableStatusCodes.includes(error.status)) {
            return true;
        }
        
        if (error.message) {
            const lowerMessage = error.message.toLowerCase();
            return retryableMessages.some(msg => lowerMessage.includes(msg));
        }
        
        return false;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private buildPerBookAnalysisPrompt(query: string, response: string, books: BookData[]): string {
        const booksInfo = books.map((book, index) => `
BOOK ${index + 1}: "${book.bookTitle}"
- Relevance Score: ${book.relevanceScore}%
- Why Match: ${book.whyMatch}
- Gap: ${book.gap}
- Reasons: ${book.reasons.join('; ')}
`).join('\n');

        // Shorten the response if it's too long to avoid token limits
        const shortenedResponse = response.length > 2000 ? 
            response.substring(0, 2000) + "... [response truncated]" : 
            response;

        return `
You are a QA validation assistant analyzing BookGenie responses. 
Evaluate how well EACH INDIVIDUAL BOOK addresses the original query.
Focus on these sections for EACH BOOK: Author information, Publishing date, "Why this is a match" explanations, Relevance scores.

QUERY: "${query}"

RESPONSE TO ANALYZE:
${shortenedResponse}

BOOKS TO ANALYZE INDIVIDUALLY:
${booksInfo}

Please analyze EACH BOOK separately and provide:
1. Overall relevance score for each book (0-100%)
2. For each book, section-specific scores:
   - Author Information: completeness and relevance to query
   - Publishing Date: appropriateness and accuracy  
   - Why Match Explanations: quality and justification
   - Relevance Scores: proper justification with respect to query
3. Detailed feedback for each book
4. Specific improvement suggestions for each book
5. Overall summary and general improvement suggestions

Return your analysis in the following JSON format ONLY, no other text:
{
    "query": "${query}",
    "overallScore": 85,
    "bookAnalyses": [
        {
            "bookTitle": "${books[0]?.bookTitle || 'Book 1'}",
            "overallScore": 90,
            "sectionScores": [
                {"section": "Author Information", "score": 95, "feedback": "Author is clearly identified and highly relevant"},
                {"section": "Publishing Date", "score": 85, "feedback": "Date is appropriate and matches context"},
                {"section": "Why Match Explanations", "score": 90, "feedback": "Clear and specific explanations provided"},
                {"section": "Relevance Scores", "score": 90, "feedback": "Score well justified for this query"}
            ],
            "detailedFeedback": [
                "Excellent match for the query criteria",
                "All required information is clearly presented"
            ],
            "improvementSuggestions": [
                "Could include more specific award details"
            ]
        }
    ],
    "summaryFeedback": [
        "Overall good response with relevant book selections",
        "Most books directly address the query requirements"
    ],
    "improvementSuggestions": [
        "Include more specific award details for authors",
        "Provide clearer timeline context for publishing dates"
    ]
}

Ensure the response is valid JSON and all scores are between 0-100.
Analyze all ${books.length} books individually.
`;
    }

    private parseGeminiResponse(responseText: string): AIAnalysisResult {
        try {
            const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanedText);
            
            // Validate the parsed structure
            if (!parsed.bookAnalyses || !Array.isArray(parsed.bookAnalyses)) {
                throw new Error('Invalid response structure: missing bookAnalyses array');
            }
            
            return parsed;
        } catch (parseError) {
            console.error('Error parsing Gemini response:', parseError);
            console.log('Raw response:', responseText.substring(0, 500) + '...');
            throw new Error('Failed to parse AI response: ' + (parseError as Error).message);
        }
    }

    private getDefaultErrorResult(query: string, books: BookData[], error?: Error): AIAnalysisResult {
        console.log('🔄 Generating fallback analysis due to API failure');
        
        // Create basic analyses for each book with default scores
        const defaultBookAnalyses: BookAnalysisResult[] = books.map((book, index) => ({
            bookTitle: book.bookTitle,
            overallScore: 70, // Default neutral score
            sectionScores: [
                {section: "Author Information", score: 70, feedback: "Analysis unavailable - API error"},
                {section: "Publishing Date", score: 70, feedback: "Analysis unavailable - API error"},
                {section: "Why Match Explanations", score: 70, feedback: "Analysis unavailable - API error"},
                {section: "Relevance Scores", score: 70, feedback: "Analysis unavailable - API error"}
            ],
            detailedFeedback: ['AI analysis temporarily unavailable due to service overload'],
            improvementSuggestions: ['Retry analysis when service is available']
        }));

        const errorMessage = error ? error.message : 'Service temporarily overloaded';
        
        return {
            query,
            overallScore: 70, // Default neutral overall score
            bookAnalyses: defaultBookAnalyses,
            summaryFeedback: [
                'AI analysis service is temporarily overloaded',
                'Using fallback analysis with neutral scores',
                `Error: ${errorMessage}`
            ],
            improvementSuggestions: [
                'Retry the analysis when Gemini API is less busy',
                'Consider running tests during off-peak hours',
                'Check Google AI status page for service updates'
            ]
        };
    }

    /**
     * Generate test queries using Gemini
     */
    async generateTestQueries(category: string, count: number = 5): Promise<string[]> {
        try {
            const prompt = `Generate ${count} diverse book search queries in the category: "${category}"`;
            
            const result = await this.model.generateContent(prompt);
            const responseText = await result.response.text();
            
            return responseText.split('\n')
                .filter((line: string) => line.trim().length > 0)
                .map((line: string) => line.replace(/^\d+\.\s*/, '').trim())
                .slice(0, count);
                
        } catch (error) {
            console.error('Gemini query generation error:', error);
            return [`Books about ${category}`, `Popular ${category} books`];
        }
    }
     async analyzeCitationMatch(reasonText: string, citationText: string): Promise<{ 
        isValid: boolean; 
        similarityScore: number; 
        matchPercentage: number; 
        aiConfidence: number 
    }> {
        try {
            const prompt = this.buildCitationValidationPrompt(reasonText, citationText);
            const result = await this.model.generateContent(prompt);
            const responseText = await result.response.text();
            
            return this.parseCitationValidationResponse(responseText);
            
        } catch (error) {
            console.error('Citation validation AI analysis failed:', error);
            return {
                isValid: false,
                similarityScore: 0,
                matchPercentage: 0,
                aiConfidence: 0
            };
        }
    }

    private buildCitationValidationPrompt(reasonText: string, citationText: string): string {
        return `
You are a citation validation assistant. Your task is to determine if the REASON text and CITATION text convey the same meaning despite minor wording differences.

REASON TEXT:
"${reasonText}"

CITATION TEXT:
"${citationText}"

ANALYSIS CRITERIA:
1. Check if both texts are talking about the same concept/idea
2. Allow for minor wording variations, synonyms, and grammatical differences
3. Focus on semantic similarity rather than exact text matching

VALIDATION RULES:
- PASS if the citation text represents the same core idea as the reason text
- PASS if there are minor wording differences but the meaning is identical
- FAIL only if the citation text describes a completely different concept

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

    private parseCitationValidationResponse(responseText: string): { 
        isValid: boolean; 
        similarityScore: number; 
        matchPercentage: number; 
        aiConfidence: number 
    } {
        try {
            const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
            const parsed = JSON.parse(cleanedText);
            
            return {
                isValid: parsed.isValid === true,
                similarityScore: parsed.similarityScore || (parsed.isValid ? 0.9 : 0),
                matchPercentage: parsed.matchPercentage || (parsed.isValid ? 90 : 0),
                aiConfidence: parsed.aiConfidence || 80
            };
            
        } catch (parseError) {
            console.error('Error parsing citation validation response:', parseError);
            return {
                isValid: false,
                similarityScore: 0,
                matchPercentage: 0,
                aiConfidence: 0
            };
        }
    }
}