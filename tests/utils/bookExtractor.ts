export interface BookData {
    question: string;
    bookTitle: string;
    whyMatch: string;
    relevanceScore: string;
    gap: string;
    reasons: string[];
    highlightedTexts: string[];
}

export class BookExtractor {
    static extractBooksFromHTML(htmlContent: string): BookData[] {
        const books: BookData[] = [];
        
        this.log('Starting HTML content extraction');
        this.log(`HTML content length: ${htmlContent.length} characters`);

        const questionMatch = htmlContent.match(/<summary[^>]*>.*?<span[^>]*>([^<]+)<\/span>/);
        const question = questionMatch ? questionMatch[1].trim() : 'Unknown Query';
        
        this.log(`Extracted question: "${question}"`);

        const bookSections = this.splitBookSections(htmlContent);
        this.log(`Found ${bookSections.length} book sections`);

        for (const [index, section] of bookSections.entries()) {
            try {
                this.log(`Processing book section ${index + 1}`);
                
                const bookTitle = this.extractBookTitle(section);
                if (!bookTitle) {
                    this.log(`Skipping section ${index + 1} - no title found`);
                    continue;
                }

                this.log(`Extracting data for: "${bookTitle}"`);

                const reasonsData = this.extractReasonsWithCitations(section);
                this.log(`Found ${reasonsData.length} reasons for "${bookTitle}"`);

                const bookData: BookData = {
                    question,
                    bookTitle,
                    whyMatch: reasonsData.map(r => r.reason).join(' | '),
                    relevanceScore: this.extractRelevanceScore(section),
                    gap: this.extractGap(section) || 'No gap mentioned',
                    reasons: reasonsData.map(r => r.reason),
                    highlightedTexts: reasonsData.map(r => r.highlightedText)
                };

                books.push(bookData);
                this.log(`Successfully extracted data for "${bookTitle}"`);

            } catch (error) {
                this.log(`Error parsing book section ${index + 1}: ${error}`);
            }
        }
        
        this.log(`Completed extraction. Total books: ${books.length}`);
        return books;
    }

     private static extractReasonsWithCitations(section: string): { reason: string; highlightedText: string }[] {
        const reasons: { reason: string; highlightedText: string }[] = [];
        
        this.log('Extracting reasons with citations from section');

        const whyStart = section.indexOf('Why this book is the');
        if (whyStart === -1) {
            this.log('No "Why this book is the match" section found');
            return reasons;
        }

        const whyEnd = section.indexOf('</ol>', whyStart);
        if (whyEnd === -1) {
            this.log('No closing </ol> tag found for reasons section');
            return reasons;
        }

        const whySection = section.substring(whyStart, whyEnd);
        this.log(`Why section length: ${whySection.length} characters`);

        // Extract all list items - FIXED: removed 's' flag since we're not using dotAll
        const liMatches = [...whySection.matchAll(/<li>(.*?)<\/li>/gi)];
        
        for (let i = 0; i < liMatches.length; i++) {
            const liContent = liMatches[i][1];
            let reasonText = '';
            let highlightedText = '';

            // Check if highlighted text exists (condition 1a) - FIXED: removed 'g' flag since we want first match
            const highlightMatch = liContent.match(/<span[^>]*text-\[\#d63384\][^>]*>([^<]*)<\/span>/);
            if (highlightMatch && highlightMatch.length > 0) {
                // Extract just the highlighted word
                const cleanHighlight = highlightMatch[1].trim();
                reasonText = cleanHighlight;
                highlightedText = cleanHighlight;
                this.log(`Extracted highlighted text: "${cleanHighlight}"`);
            } else {
                // Condition 1b: Extract text until first "(" character
                const textUntilBracket = liContent.split('(')[0].trim();
                const cleanText = textUntilBracket.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
                reasonText = cleanText;
                highlightedText = `Full_Reason_${i + 1}`;
                this.log(`Extracted text until bracket: "${cleanText.substring(0, 50)}..."`);
            }

            if (reasonText) {
                reasons.push({
                    reason: reasonText,
                    highlightedText: highlightedText
                });
            }
        }

        this.log(`Total reasons extracted: ${reasons.length}`);
        return reasons;
    } 

    private static splitBookSections(htmlContent: string): string[] {
        const sections: string[] = [];
        
        this.log('Splitting HTML into book sections');

        // Find each book section starting with details containing a number
        const bookStartRegex = /<details[^>]*>\s*<summary[^>]*>.*?\d+\.\s*[^<]*/gi;
        const matches = [...htmlContent.matchAll(bookStartRegex)];
        
        this.log(`Found ${matches.length} potential book sections`);

        for (let i = 0; i < matches.length; i++) {
            const start = matches[i].index;
            const end = i < matches.length - 1 ? matches[i + 1].index : htmlContent.length;
            const section = htmlContent.substring(start, end);
            
            if (section.length > 100) { // Minimum section length
                sections.push(section);
            }
        }

        this.log(`Valid book sections: ${sections.length}`);
        return sections;
    }

    private static extractBookTitle(section: string): string {
        const titleMatch = section.match(/Book Title:.*?<\/p>\s*([^<]+)/);
        const title = titleMatch ? titleMatch[1].trim() : '';
        
        if (title) {
            this.log(`Extracted book title: "${title}"`);
        } else {
            this.log('No book title found in section');
        }
        
        return title;
    }

    private static extractRelevanceScore(section: string): string {
        const scoreMatch = section.match(/Relevance Score:.*?<\/p>\s*([^<]+)/);
        const score = scoreMatch ? scoreMatch[1].trim() : '0';
        
        this.log(`Extracted relevance score: ${score}%`);
        return score;
    }

    private static extractGap(section: string): string {
        const gapStart = section.indexOf('The Gap</span>');
        if (gapStart === -1) {
            this.log('No gap section found');
            return '';
        }

        const gapEnd = section.indexOf('</ol>', gapStart);
        if (gapEnd === -1) {
            this.log('No closing tag for gap section');
            return '';
        }

        const gapSection = section.substring(gapStart, gapEnd);
        const gapItems: string[] = [];
        
        let liStart = gapSection.indexOf('<li>');
        while (liStart !== -1) {
            const liEnd = gapSection.indexOf('</li>', liStart);
            if (liEnd === -1) break;

            const liContent = gapSection.substring(liStart + 4, liEnd);
            const cleanText = liContent.replace(/<[^>]*>/g, '').trim();
            
            if (cleanText) {
                gapItems.push(cleanText);
            }
            
            liStart = gapSection.indexOf('<li>', liEnd);
        }

        const gapText = gapItems.join(' | ');
        this.log(`Extracted gap: ${gapText.substring(0, 50)}...`);
        
        return gapText;
    }

    private static log(message: string): void {
        console.log(`[BookExtractor] ${message}`);
    }
}