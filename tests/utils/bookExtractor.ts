export interface BookData {
    question: string;
    bookTitle: string;
    author: string;
    publishingDate: string;
    imprint: string;
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

        // Extract question - fixed pattern
        const questionMatch = htmlContent.match(/<summary[^>]*>\s*<span[^>]*>([^<]+)<\/span>/);
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
                    author: this.extractAuthor(section),
                    publishingDate: this.extractPublishingDate(section),
                    imprint: this.extractImprint(section),
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

    private static extractAuthor(section: string): string {
        // Fixed pattern for author extraction
        const authorMatch = section.match(/Author:.*?<\/p><\/span>\s*([^<]+)/);
        const author = authorMatch ? authorMatch[1].trim() : '';
        
        if (author) {
            this.log(`Extracted author: "${author}"`);
        } else {
            this.log('No author found in section');
        }
        
        return author;
    }

    private static extractPublishingDate(section: string): string {
        // Fixed pattern for publishing date
        const dateMatch = section.match(/Publishing Date:.*?<\/p><\/span>\s*([^<]+)/);
        const publishingDate = dateMatch ? dateMatch[1].trim() : '';
        
        if (publishingDate) {
            this.log(`Extracted publishing date: "${publishingDate}"`);
        } else {
            this.log('No publishing date found in section');
        }
        
        return publishingDate;
    }

    private static extractImprint(section: string): string {
        // Fixed pattern for imprint
        const imprintMatch = section.match(/Imprint:.*?<\/p><\/span>\s*([^<]+)/);
        const imprint = imprintMatch ? imprintMatch[1].trim() : '';
        
        if (imprint) {
            this.log(`Extracted imprint: "${imprint}"`);
        } else {
            this.log('No imprint found in section');
        }
        
        return imprint;
    }

    private static extractReasonsWithCitations(section: string): { reason: string; highlightedText: string }[] {
        const reasons: { reason: string; highlightedText: string }[] = [];
        
        this.log('Extracting reasons with citations from section');

        // Find the "Why this book is the" section
        const whyMatch = section.match(/Why this book is the.*?Match<\/span><\/summary>\s*<ol[^>]*>([\s\S]*?)<\/ol>/);
        if (!whyMatch) {
            this.log('No "Why this book is the match" section found');
            return reasons;
        }

        const whySection = whyMatch[1];
        this.log(`Why section length: ${whySection.length} characters`);

        // Extract all list items
        const liMatches = [...whySection.matchAll(/<li>([\s\S]*?)<\/li>/gi)];
        
        for (let i = 0; i < liMatches.length; i++) {
            const liContent = liMatches[i][1];
            
            // Extract the complete reason text by removing citation spans and HTML tags
            let reasonText = liContent
                .replace(/<span class="BookCitation[^>]*>.*?<\/span>/g, '') // Remove citation spans
                .replace(/<[^>]*>/g, '') // Remove all remaining HTML tags
                .replace(/\s+/g, ' ') // Normalize whitespace
                .trim();

            // Extract highlighted text - look for text inside the pink colored spans
            const highlightMatches = [...liContent.matchAll(/<span[^>]*text-\[\#d63384\][^>]*>.*?<p[^>]*>([^<]*)<\/p><\/span>/g)];
            let highlightedText = '';
            
            if (highlightMatches.length > 0) {
                // Combine all highlighted texts from this list item
                highlightedText = highlightMatches.map(match => match[1].trim()).join(' | ');
                this.log(`Extracted highlighted text: "${highlightedText}"`);
            }

            if (reasonText && reasonText.length > 10) {
                reasons.push({
                    reason: reasonText,
                    highlightedText: highlightedText
                });
                this.log(`Extracted complete reason ${i + 1}: "${reasonText.substring(0, 80)}..."`);
            }
        }

        this.log(`Total reasons extracted: ${reasons.length}`);
        return reasons;
    }

    private static splitBookSections(htmlContent: string): string[] {
        const sections: string[] = [];
        
        this.log('Splitting HTML into book sections');

        // Find each book section starting with details that contain a number in the summary
        // Fixed pattern to match the actual HTML structure
        const bookStartRegex = /<details[^>]*>\s*<summary[^>]*>\s*<span[^>]*>\d+\.\s*[^<]*<\/span>/gi;
        const matches = [...htmlContent.matchAll(bookStartRegex)];
        
        this.log(`Found ${matches.length} potential book sections using regex`);

        // Alternative approach: look for book titles directly
        if (matches.length === 0) {
            this.log('Trying alternative section splitting approach');
            // Look for any details that contain book title patterns
            const altMatches = [...htmlContent.matchAll(/<details[^>]*>\s*<summary[^>]*>\s*<span[^>]*>[\d\w\s\.]+<\/span>/gi)];
            this.log(`Found ${altMatches.length} sections with alternative approach`);
            
            for (let i = 0; i < altMatches.length; i++) {
                const start = altMatches[i].index;
                let end = htmlContent.length;
                
                if (i < altMatches.length - 1) {
                    end = altMatches[i + 1].index;
                }
                
                const section = htmlContent.substring(start, end);
                
                // Only include if it has book metadata
                if (section.includes('Book Title:') && section.length > 200) {
                    sections.push(section);
                }
            }
        } else {
            for (let i = 0; i < matches.length; i++) {
                const start = matches[i].index;
                let end = htmlContent.length;
                
                if (i < matches.length - 1) {
                    end = matches[i + 1].index;
                }
                
                const section = htmlContent.substring(start, end);
                
                if (section.includes('Book Title:') && section.length > 200) {
                    sections.push(section);
                }
            }
        }

        this.log(`Valid book sections: ${sections.length}`);
        return sections;
    }

    private static extractBookTitle(section: string): string {
        // Fixed pattern for book title
        const titleMatch = section.match(/Book Title:.*?<\/p><\/span>\s*([^<]+)/);
        const title = titleMatch ? titleMatch[1].trim() : '';
        
        if (title) {
            this.log(`Extracted book title: "${title}"`);
        } else {
            this.log('No book title found in section');
        }
        
        return title;
    }

    private static extractRelevanceScore(section: string): string {
        // Fixed pattern for relevance score
        const scoreMatch = section.match(/Relevance Score:.*?<\/p><\/span>\s*<p[^>]*>([^<%]+)/);
        let score = scoreMatch ? scoreMatch[1].replace('%', '').trim() : '0';
        
        // Alternative pattern
        if (score === '0') {
            const altScoreMatch = section.match(/Relevance Score:.*?(\d+)%/);
            score = altScoreMatch ? altScoreMatch[1] : '0';
        }
        
        this.log(`Extracted relevance score: ${score}%`);
        return score;
    }

    private static extractGap(section: string): string {
        const gapMatch = section.match(/The Gap<\/span><\/summary>\s*<ol[^>]*>([\s\S]*?)<\/ol>/);
        if (!gapMatch) {
            this.log('No gap section found');
            return '';
        }

        const gapSection = gapMatch[1];
        const gapItems: string[] = [];
        
        // Extract list items from gap section
        const liMatches = [...gapSection.matchAll(/<li>([\s\S]*?)<\/li>/gi)];
        
        for (const match of liMatches) {
            const liContent = match[1];
            // Clean the text by removing HTML tags and citations
            const cleanText = liContent
                .replace(/<span class="BookCitation[^>]*>.*?<\/span>/g, '')
                .replace(/<[^>]*>/g, '')
                .replace(/\s+/g, ' ')
                .trim();
            
            if (cleanText) {
                gapItems.push(cleanText);
            }
        }

        const gapText = gapItems.join(' | ');
        if (gapText) {
            this.log(`Extracted gap: ${gapText.substring(0, 50)}...`);
        } else {
            this.log('No gap text extracted');
        }
        
        return gapText;
    }

    private static log(message: string): void {
        console.log(`[BookExtractor] ${message}`);
    }
}