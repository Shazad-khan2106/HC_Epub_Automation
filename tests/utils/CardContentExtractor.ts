export interface CardContentData {
    bookTitle: string;
    authors: string;
    imprint: string;
    whyMatchReasons: WhyMatchReason[];
    highlightedTexts: string[];
    relevanceScore: string;
}

export interface WhyMatchReason {
    reasonText: string;
    highlightedText: string;
    citationType: 'metadata' | 'manuscript';
}

export class CardContentExtractor {
    static async extractCardContent(htmlContent: string, page?: any): Promise<CardContentData> {
        console.log('🔍 Starting detailed card content extraction');
        
        // Extract relevance score - handle both sync and async cases
        let relevanceScore: string;
        if (page) {
            relevanceScore = await this.extractRelevanceScoreWithLocator(page);
        } else {
            relevanceScore = this.extractRelevanceScore(htmlContent);
        }
        
        const cardData: CardContentData = {
            bookTitle: this.extractBookTitle(htmlContent),
            authors: this.extractAuthors(htmlContent),
            imprint: this.extractImprint(htmlContent),
            whyMatchReasons: this.extractWhyMatchReasons(htmlContent),
            highlightedTexts: this.extractHighlightedTexts(htmlContent),
            relevanceScore: relevanceScore
        };

        this.validateCardContent(cardData);
        console.log('✅ Card content extracted successfully');
        
        return cardData;
    }

    private static extractBookTitle(htmlContent: string): string {
        // Extract from: <h3 title="All American Christmas" class="text-base font-content font-bold text-[#17212B] mb-1 truncate">1. All American Christmas</h3>
        const titleMatch = htmlContent.match(/<h3[^>]*title="([^"]*)"[^>]*>(\d+\.\s*[^<]*)<\/h3>/);
        if (titleMatch && titleMatch[1]) {
            const title = titleMatch[1].trim();
            console.log(`✅ Book title extracted: "${title}"`);
            return title;
        }

        // Alternative: Extract from h3 content
        const titleMatch2 = htmlContent.match(/<h3[^>]*>(\d+\.\s*[^<]*)<\/h3>/);
        if (titleMatch2 && titleMatch2[1]) {
            const title = titleMatch2[1].replace(/^\d+\.\s*/, '').trim();
            console.log(`✅ Book title extracted: "${title}"`);
            return title;
        }

        throw new Error('❌ Book title not found in card');
    }

    private static extractAuthors(htmlContent: string): string {
        // Extract from: <p class="text-sm text-[#32363E] font-normal font-content mb-3 truncate">by Rachel Campos-Duffy and Sean Duffy, from Imprint: Broadside e-books</p>
        const authorMatch = htmlContent.match(/<p[^>]*class="[^"]*text-sm[^"]*"[^>]*>by\s+([^,]+),/);
        
        if (!authorMatch || !authorMatch[1]) {
            throw new Error('❌ Author information not found in card');
        }
        
        const authors = authorMatch[1].trim();
        console.log(`✅ Authors extracted: "${authors}"`);
        return authors;
    }

    private static extractImprint(htmlContent: string): string {
        // Extract from: <p class="text-sm text-[#32363E] font-normal font-content mb-3 truncate">by Rachel Campos-Duffy and Sean Duffy, from Imprint: Broadside e-books</p>
        const imprintMatch = htmlContent.match(/from Imprint:\s*([^<]+)/);
        
        if (!imprintMatch || !imprintMatch[1]) {
            throw new Error('❌ Imprint information not found in card');
        }
        
        const imprint = imprintMatch[1].trim();
        console.log(`✅ Imprint extracted: "${imprint}"`);
        return imprint;
    }

    private static extractRelevanceScore(htmlContent: string): string {
        // Extract relevance score if available in the card
        const scoreMatch = htmlContent.match(/Relevance Score:.*?(\d+)%/);
        const score = scoreMatch ? scoreMatch[1] : 'N/A';
        
        console.log(`✅ Relevance score extracted: ${score}%`);
        return score;
    }

    // New method using locators
    private static async extractRelevanceScoreWithLocator(page: any): Promise<string> {
        try {
            // Use the locator you specified: [aria-label="Relevance Score"] span
            const relevanceScoreElement = page.locator('[aria-label="Relevance Score"] span');
            
            if (relevanceScoreElement) {
                const elementCount = await relevanceScoreElement.count();
                if (elementCount > 0) {
                    const scoreText = await relevanceScoreElement.first().textContent();
                    if (scoreText) {
                        // Extract just the number (remove % if present)
                        const score = scoreText.replace('%', '').trim();
                        console.log(`✅ Relevance score extracted via locator: ${score}%`);
                        return score;
                    }
                }
            }
        } catch (error) {
            console.log(`❌ Error extracting relevance score with locator: ${error}`);
        }
        
        // Fallback to regex if locator fails
        console.log('⚠️ Falling back to regex for relevance score extraction');
        return 'N/A';
    }

    private static extractWhyMatchReasons(htmlContent: string): WhyMatchReason[] {
        console.log('🔍 Extracting "Why this book is the match" reasons');
        
        const reasons: WhyMatchReason[] = [];
        
        // Look for the accordion section that contains the reasons
        const whyMatchSection = htmlContent.match(/Why this book is the[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>/);
        
        if (whyMatchSection && whyMatchSection[1]) {
            const reasonsContent = whyMatchSection[1];
            
            // Extract list items from the ordered list
            const listItems = reasonsContent.match(/<li[^>]*>([\s\S]*?)<\/li>/g) || [];
            
            let reasonCount = 0;
            for (const liContent of listItems) {
                reasonCount++;
                const liMatch = liContent.match(/<li[^>]*>([\s\S]*?)<\/li>/);
                if (!liMatch) continue;
                
                const reasonData = this.extractSingleReason(liMatch[1], reasonCount);
                if (reasonData) {
                    reasons.push(reasonData);
                }
            }
        } else {
            console.log('No "Why this book is the match" section found in card');
        }

        if (reasons.length === 0) {
            console.warn('⚠️ No reasons found in "Why this book is the match" section');
        } else {
            console.log(`✅ Extracted ${reasons.length} reasons`);
        }

        return reasons;
    }

    private static extractSingleReason(liContent: string, reasonNumber: number): WhyMatchReason | null {
        // Extract the full reason text - everything before the first parenthesis or citation
        let reasonText = liContent.split(/\(|<\/span>/)[0].trim();
        
        // Clean the reason text - remove HTML tags and normalize whitespace
        reasonText = reasonText
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        // Extract citation type
        const citationTypeMatch = liContent.match(/<span[^>]*>(metadata|manuscript)<\/span>/);
        const citationType = citationTypeMatch ? (citationTypeMatch[1] as 'metadata' | 'manuscript') : 'metadata';

        // For highlighted text, we'll extract what we can from static HTML
        // The actual highlighted text will be extracted after clicking citations
        let highlightedText = this.extractHighlightedTextFromReason(liContent);
        if (!highlightedText) {
            highlightedText = `[Requires citation click - Reason ${reasonNumber}]`;
        }

        if (!reasonText) {
            console.warn(`⚠️ Reason ${reasonNumber} text is empty after cleaning`);
            return null;
        }

        console.log(`✅ Reason ${reasonNumber}: "${reasonText.substring(0, 60)}..."`);
        console.log(`   - Citation: ${citationType}`);
        console.log(`   - Highlighted text: ${highlightedText.substring(0, 60)}...`);

        return {
            reasonText,
            highlightedText,
            citationType
        };
    }

    private static extractHighlightedTextFromReason(liContent: string): string {
        // Try to extract highlighted text from the pink colored text
        const highlightMatch = liContent.match(/<span[^>]*text-\[\#d63384\][^>]*>([^<]*)<\/span>/);
        if (highlightMatch && highlightMatch[1]) {
            return highlightMatch[1].trim();
        }
        
        // Alternative: Look for any text with pink color styling
        const alternativeMatch = liContent.match(/style="[^"]*color:.*pink[^"]*"[^>]*>([^<]*)<\/span>/);
        if (alternativeMatch && alternativeMatch[1]) {
            return alternativeMatch[1].trim();
        }
        
        return '';
    }

    private static extractHighlightedTexts(htmlContent: string): string[] {
        // This method extracts what it can from static HTML
        // The actual highlighted texts will be extracted after clicking citations
        const highlightedTexts: string[] = [];
        
        // Extract all pink-colored text spans
        const highlightMatches = htmlContent.matchAll(/<span[^>]*text-\[\#d63384\][^>]*>([^<]*)<\/span>/g);
        for (const match of highlightMatches) {
            if (match[1]) {
                highlightedTexts.push(match[1].trim());
            }
        }
        
        console.log(`⚠️ Extracted ${highlightedTexts.length} highlighted texts from static HTML`);
        return highlightedTexts;
    }

    private static validateCardContent(cardData: CardContentData): void {
        const requiredFields = [
            { field: 'bookTitle', value: cardData.bookTitle },
            { field: 'authors', value: cardData.authors },
            { field: 'imprint', value: cardData.imprint }
        ];

        for (const field of requiredFields) {
            if (!field.value || 
                (Array.isArray(field.value) && field.value.length === 0) ||
                (typeof field.value === 'string' && field.value.trim().length === 0)) {
                throw new Error(`❌ Required field "${field.field}" not properly extracted`);
            }
        }

        // Log warning if no reasons found, but don't fail validation
        if (cardData.whyMatchReasons.length === 0) {
            console.warn('⚠️ No "Why this book is the match" reasons found');
        }

        console.log('🎉 All card content successfully extracted and validated');
    }

    static generateExtractionReport(cardData: CardContentData): string {
        return `
📊 CARD CONTENT EXTRACTION REPORT
=================================
📖 Title: ${cardData.bookTitle}
👥 Authors: ${cardData.authors}
🏷️ Imprint: ${cardData.imprint}
📊 Relevance Score: ${cardData.relevanceScore}

WHY MATCH REASONS (${cardData.whyMatchReasons.length}):
${cardData.whyMatchReasons.map((reason, index) => 
    `  ${index + 1}. ${reason.reasonText}\n     → Citation: ${reason.citationType}\n     → Highlighted: ${reason.highlightedText}`
).join('\n\n')}

HIGHLIGHTED TEXTS (${cardData.highlightedTexts.length}):
${cardData.highlightedTexts.map((text, index) => 
    `  ${index + 1}. ${text}`
).join('\n')}
=================================
        `.trim();
    }
}