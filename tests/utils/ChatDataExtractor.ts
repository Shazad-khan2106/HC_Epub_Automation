export interface ChatBookData {
    bookTitle: string;
    author: string;
    publishingDate: string;
    imprint: string;
    relevanceScore: string;
    whyMatchReasons: string[];
}

export class ChatDataExtractor {
    static extractBooksFromChatHTML(htmlContent: string): ChatBookData[] {
        const books: ChatBookData[] = [];
        
        console.log('🔍 Starting chat data extraction from left-side panel');
        console.log(`HTML content length: ${htmlContent.length} characters`);

        const bookSections = this.splitBookSections(htmlContent);
        console.log(`Found ${bookSections.length} book sections in chat`);

        for (const [index, section] of bookSections.entries()) {
            try {
                console.log(`Processing chat book section ${index + 1}`);
                
                const bookTitle = this.extractBookTitle(section);
                if (!bookTitle) {
                    this.debugExtraction(section);
                    console.log(`Skipping chat section ${index + 1} - no title found`);
                    continue;
                }

                console.log(`Extracting chat data for: "${bookTitle}"`);

                const bookData: ChatBookData = {
                    bookTitle,
                    author: this.extractAuthor(section),
                    publishingDate: this.extractPublishingDate(section),
                    imprint: this.extractImprint(section),
                    relevanceScore: this.extractRelevanceScore(section),
                    whyMatchReasons: this.extractWhyMatchReasons(section)
                };

                books.push(bookData);
                console.log(`✅ Successfully extracted chat data for "${bookTitle}"`);

            } catch (error) {
                console.log(`Error parsing chat book section ${index + 1}: ${error}`);
            }
        }
        
        console.log(`✅ Completed chat extraction. Total books: ${books.length}`);
        return books;
    }
private static debugExtraction(section: string): void {
    console.log('=== DEBUG EXTRACTION ===');
    console.log('Book Title match:', section.match(/<summary[^>]*>\s*<span[^>]*>\d+\.\s*([^<]+)<\/span>/));
    console.log('Author match:', section.match(/Author:.*?<\/p>\s*([^<]+)/));
    console.log('Publishing Date match:', section.match(/Publishing Date:.*?<\/p>\s*([^<]+)/));
    console.log('Imprint match:', section.match(/Imprint:.*?<\/p>\s*([^<]+)/));
    console.log('Relevance Score match:', section.match(/Relevance Score:.*?<\/p>\s*([^<]+)/));
    console.log('Has Why Match section:', section.includes('Why this book is the'));
    console.log('=== END DEBUG ===');
}
    private static splitBookSections(htmlContent: string): string[] {
        const sections: string[] = [];
        
        // Find each book section in the chat - look for details that contain book information
        // Match from opening <details> to closing </details> for each book
        const bookSectionRegex = /<details[^>]*>\s*<summary[^>]*>.*?\d+\.\s*[^<]*<\/summary>[\s\S]*?<\/details>/gi;
        const matches = [...htmlContent.matchAll(bookSectionRegex)];
        
        console.log(`Found ${matches.length} potential book sections in chat`);

        for (const match of matches) {
            const section = match[0];
            // Check if this section contains book data (has Book Title, Author, etc.)
            if (section.includes('Book Title:') && section.length > 100) {
                sections.push(section);
            }
        }

        console.log(`Valid chat book sections: ${sections.length}`);
        return sections;
    }

    private static extractBookTitle(section: string): string {
        // Extract from: <summary><span class="truncate">1. All American Christmas</span></summary>
        const titleMatch = section.match(/<summary[^>]*>\s*<span[^>]*>\d+\.\s*([^<]+)<\/span>/);
        if (titleMatch && titleMatch[1]) {
            const title = titleMatch[1].trim();
            console.log(`✅ Extracted chat book title: "${title}"`);
            return title;
        }
        
        console.log('❌ No book title found in chat section');
        return '';
    }

    private static extractAuthor(section: string): string {
        // Extract from the pattern: <p><p class="py-2 font-bold inline-flex gap-1">Author:</p> Rachel Campos-Duffy and Sean Duffy</p>
        // Look for the text after "Author:" and before the next tag
        const authorMatch = section.match(/Author:.*?<\/p>\s*([^<]+)/);
        if (authorMatch && authorMatch[1]) {
            const author = authorMatch[1].trim();
            console.log(`✅ Extracted chat author: "${author}"`);
            return author;
        }
        
        console.log('❌ No author found in chat section');
        return '';
    }

    private static extractPublishingDate(section: string): string {
        // Extract from: <p><p class="py-2 font-bold inline-flex gap-1">Publishing Date:</p> NOV-16-2021</p>
        const dateMatch = section.match(/Publishing Date:.*?<\/p>\s*([^<]+)/);
        if (dateMatch && dateMatch[1]) {
            const publishingDate = dateMatch[1].trim();
            console.log(`✅ Extracted chat publishing date: "${publishingDate}"`);
            return publishingDate;
        }
        
        console.log('❌ No publishing date found in chat section');
        return '';
    }

    private static extractImprint(section: string): string {
        // Extract from: <p><p class="py-2 font-bold inline-flex gap-1">Imprint:</p> Broadside e-books</p>
        const imprintMatch = section.match(/Imprint:.*?<\/p>\s*([^<]+)/);
        if (imprintMatch && imprintMatch[1]) {
            const imprint = imprintMatch[1].trim();
            console.log(`✅ Extracted chat imprint: "${imprint}"`);
            return imprint;
        }
        
        console.log('❌ No imprint found in chat section');
        return '';
    }

    private static extractRelevanceScore(section: string): string {
        // Extract from: <p><p class="py-2 font-bold inline-flex gap-1">Relevance Score:</p> 95%</p>
        const scoreMatch = section.match(/Relevance Score:.*?<\/p>\s*([^<]+)/);
        if (scoreMatch && scoreMatch[1]) {
            const score = scoreMatch[1].trim();
            console.log(`✅ Extracted chat relevance score: ${score}%`);
            return score;
        }
        
        console.log('❌ No relevance score found in chat section, defaulting to 0');
        return '0';
    }

    private static extractWhyMatchReasons(section: string): string[] {
        const reasons: string[] = [];
        
        console.log('Extracting why match reasons from chat section');

        // Find the "Why this book is the match" section
        const whyMatchRegex = /Why this book is the[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>/;
        const whyMatchSection = section.match(whyMatchRegex);
        
        if (!whyMatchSection) {
            console.log('No "Why this book is the match" section found in chat');
            return reasons;
        }

        const reasonsContent = whyMatchSection[1];
        console.log(`Chat why section length: ${reasonsContent.length} characters`);

        // Extract all list items - get the full text content
        const liMatches = [...reasonsContent.matchAll(/<li>([\s\S]*?)<\/li>/gi)];
        
        console.log(`Found ${liMatches.length} list items in reasons section`);
        
        for (let i = 0; i < liMatches.length; i++) {
            const liContent = liMatches[i][1];
            
            // Clean the reason text - remove HTML tags, citations, and keep the actual text
            let reasonText = liContent
                // Remove citation spans with all their content
                .replace(/<span class="BookCitation-module_relativeWrapper__jFpTh"[^>]*>[\s\S]*?<\/span>/g, '')
                // Remove highlighted text spans but keep their text content
                .replace(/<span class="font-content text-\[\#d63384\]"[^>]*>.*?<p[^>]*>([^<]*)<\/p><\/span>/g, '$1')
                // Remove all remaining HTML tags
                .replace(/<[^>]*>/g, '')
                // Clean up whitespace
                .replace(/\s+/g, ' ')
                // Remove any trailing parentheses and metadata/manuscript markers
                .replace(/\s*\(\s*\)\s*/, '')
                .replace(/\s*,\s*$/, '')
                .trim();

            if (reasonText) {
                reasons.push(reasonText);
                console.log(`✅ Extracted chat reason ${i + 1}: "${reasonText.substring(0, 80)}..."`);
            } else {
                console.log(`⚠️ Reason ${i + 1} text is empty after cleaning`);
            }
        }

        console.log(`✅ Total chat reasons extracted: ${reasons.length}`);
        return reasons;
    }
}