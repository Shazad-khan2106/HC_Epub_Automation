import { Then } from "@cucumber/cucumber";
import { expect } from "@playwright/test";
import { CustomWorld } from "../../support/world";
import { CardContentExtractor, CardContentData } from "../utils/CardContentExtractor";
import { ChatDataExtractor, ChatBookData } from "../utils/ChatDataExtractor";
import { BookData, BookExtractor } from "../utils/bookExtractor";

Then('I should see book cards', async function (this: CustomWorld) {
    this.addHeaderLog('🔍 CHECKING FOR BOOK CARDS');
    
    try {
        this.addInfoLog('Waiting for book cards to be visible');
        
        // Wait for book cards to appear
        const cardLocators = this.page.locator('.p-card');
        await cardLocators.first().waitFor({ state: 'visible', timeout: 30000 });
        
        const cardCount = await cardLocators.count();
        
        if (cardCount === 0) {
            throw new Error('No book cards found on the page');
        }
        
        this.addSuccessLog(`✅ Found ${cardCount} book cards`);
        
        // Take a screenshot for verification
        await this.page.screenshot({ path: `book-cards-${Date.now()}.png` });
        
    } catch (error) {
        this.addErrorLog(`❌ Error finding book cards: ${error}`);
        await this.page.screenshot({ path: `no-book-cards-${Date.now()}.png` });
        throw error;
    }
});

Then('I extract detailed content from the book card', async function (this: CustomWorld) {
    this.addHeaderLog('📖 EXTRACTING DETAILED CARD CONTENT');
    
    try {
        this.addInfoLog('Locating all book card containers');
        const cardLocators = this.page.locator('.p-card');
        const cardCount = await cardLocators.count();
        
        this.addInfoLog(`Found ${cardCount} book cards`);
        
        this.allCardContents = [];
        
        for (let i = 0; i < cardCount; i++) {
            this.addHeaderLog(`📖 PROCESSING BOOK CARD ${i + 1}/${cardCount}`);
            
            try {
                const cardLocator = cardLocators.nth(i);
                
                // Scroll to ensure the card is visible
                await cardLocator.scrollIntoViewIfNeeded();
                await this.page.waitForTimeout(1000);
                
                // Find and click the "Why this book is the match" button to open the accordion
                const whyMatchButton = cardLocator.locator('button:has(h2:has-text("Why this book is the"))');
                
                if (await whyMatchButton.count() > 0) {
                    this.addInfoLog(`Opening "Why this book is the match" section for card ${i + 1}`);
                    
                    // Get the current state
                    const buttonState = await whyMatchButton.getAttribute('data-state');
                    const ariaExpanded = await whyMatchButton.getAttribute('aria-expanded');
                    
                    this.addInfoLog(`Button state: data-state="${buttonState}", aria-expanded="${ariaExpanded}"`);
                    
                    // Click to open the accordion if it's closed
                    if (buttonState === 'closed' || ariaExpanded === 'false') {
                        await whyMatchButton.click();
                        // Wait for the animation and content to load
                        await this.page.waitForTimeout(2000);
                    }
                } else {
                    this.addWarningLog(`⚠️ Why match button not found in card ${i + 1}`);
                }

                // FIRST: Click all citation buttons to reveal highlighted text
                this.addInfoLog(`Clicking citation buttons to reveal highlighted text for card ${i + 1}`);
                const highlightedTexts = await this.extractHighlightedTextsFromCitations(cardLocator);
                
                // SECOND: Extract HTML content after citations are clicked
                this.addInfoLog(`Extracting HTML content from card ${i + 1} (after clicking citations)`);
                const htmlContent = await cardLocator.innerHTML();
                this.addInfoLog(`Card ${i + 1} HTML length: ${htmlContent.length} chars`);
                
                // Extract card content WITH PAGE CONTEXT for locator-based extraction - NOW AWAIT THIS CALL
                const cardContent = await CardContentExtractor.extractCardContent(htmlContent, this.page);
                
                // Update the card content with actual highlighted texts
                cardContent.highlightedTexts = highlightedTexts;
                
                // Also update the reasons with actual highlighted text
                if (highlightedTexts.length > 0) {
                    cardContent.whyMatchReasons.forEach((reason, index) => {
                        if (highlightedTexts[index]) {
                            reason.highlightedText = highlightedTexts[index];
                        } else if (highlightedTexts.length > index) {
                            reason.highlightedText = highlightedTexts[index];
                        }
                    });
                }
                
                this.allCardContents.push(cardContent);
                this.addSuccessLog(`✅ Book ${i + 1} content extracted: "${cardContent.bookTitle}"`);
                this.addInfoLog(`   - Authors: ${cardContent.authors}`);
                this.addInfoLog(`   - Imprint: ${cardContent.imprint}`);
                this.addInfoLog(`   - Relevance Score: ${cardContent.relevanceScore}`);
                this.addInfoLog(`   - Reasons found: ${cardContent.whyMatchReasons.length}`);
                this.addInfoLog(`   - Highlighted texts extracted: ${highlightedTexts.length}`);
                
                // Log the actual highlighted texts for debugging
                if (highlightedTexts.length > 0) {
                    highlightedTexts.forEach((text, idx) => {
                        this.addInfoLog(`   - Highlighted ${idx + 1}: "${text.substring(0, 60)}..."`);
                    });
                }
                
            } catch (error) {
                this.addErrorLog(`❌ Failed to extract content from book card ${i + 1}: ${error}`);
                // Continue with next card
            }
        }
        
        this.addSuccessLog(`🎉 Successfully extracted content from ${this.allCardContents.length}/${cardCount} book cards`);
        
        // Generate summary report
        const summaryReport = this.generateCardContentSummary(this.allCardContents);
        await this.attach(summaryReport, 'text/plain');
        
    } catch (error) {
        this.addErrorLog(`❌ Error extracting card contents: ${error}`);
        await this.page.screenshot({ path: `card-content-error-${Date.now()}.png` });
        throw error;
    }
});

Then('I extract expected data from the left-side chat panel', async function (this: CustomWorld) {
    this.addHeaderLog('💬 EXTRACTING EXPECTED DATA FROM CHAT PANEL');
    
    try {
        this.addInfoLog('Locating left-side chat panel');
        
        // Wait for chat panel to be visible
        const chatPanel = this.page.locator('.accordion').first();
        await chatPanel.waitFor({ state: 'visible', timeout: 30000 });
        
        // Verify/expand all sections if needed
        this.addInfoLog('Verifying all sections are expanded...');
        await this.expandAllChatSections(chatPanel);
        
        this.addInfoLog('Extracting HTML content from chat panel');
        const htmlContent = await chatPanel.innerHTML();
        this.addInfoLog(`Chat HTML content extracted - Length: ${htmlContent.length} characters`);
        
        this.addInfoLog('Parsing HTML to extract expected book data using BookExtractor');
        const extractedBooks = BookExtractor.extractBooksFromHTML(htmlContent);
        
        // Convert BookData[] to ChatBookData[]
        this.chatBooks = extractedBooks.map(book => ({
            bookTitle: book.bookTitle,
            author: book.author,
            publishingDate: book.publishingDate,
            imprint: book.imprint,
            relevanceScore: book.relevanceScore,
            whyMatchReasons: this.extractCompleteReasons(book) // Use improved reason extraction
        }));
        
        this.addSuccessLog(`✅ SUCCESSFULLY EXTRACTED EXPECTED DATA FROM CHAT`);
        this.addInfoLog(`Found ${this.chatBooks.length} books in chat panel`);
        
        // Generate and attach chat data report
        const chatReport = this.generateChatDataSummary(this.chatBooks);
        await this.attach(chatReport, 'text/plain');
        
    } catch (error) {
        this.addErrorLog(`❌ Error extracting chat data: ${error}`);
        await this.page.screenshot({ path: `chat-data-error-${Date.now()}.png` });
        throw error;
    }
});

// Improved method to extract complete reasons from BookData
CustomWorld.prototype.extractCompleteReasons = function(book: BookData): string[] {
    const completeReasons: string[] = [];
    
    try {
        this.addInfoLog(`Extracting complete reasons for: "${book.bookTitle}"`);
        
        // If the book has the full whyMatch field, split it by the separator
        if (book.whyMatch && book.whyMatch !== '') {
            // Split by the pipe separator used in BookExtractor
            const reasons = book.whyMatch.split(' | ').filter(reason => reason.trim() !== '');
            
            if (reasons.length > 0) {
                this.addInfoLog(`Found ${reasons.length} reasons from whyMatch field`);
                completeReasons.push(...reasons);
            }
        }
        
        // If we still don't have reasons, try to extract from the original HTML
        if (completeReasons.length === 0 && book.reasons && book.reasons.length > 0) {
            this.addInfoLog(`Using ${book.reasons.length} reasons from reasons field`);
            completeReasons.push(...book.reasons);
        }
        
        // Log what we found
        completeReasons.forEach((reason, index) => {
            this.addInfoLog(`✅ Reason ${index + 1}: "${reason.substring(0, 80)}..."`);
        });
        
    } catch (error) {
        this.addWarningLog(`Error extracting complete reasons: ${error}`);
    }
    
    return completeReasons;
};

// Debug method to understand the structure
CustomWorld.prototype.debugChatStructure = async function(chatPanel: any): Promise<void> {
    this.addInfoLog('=== DEBUG CHAT STRUCTURE ===');
    
    // Count main accordions
    const mainAccordions = chatPanel.locator('details.accordion');
    const mainCount = await mainAccordions.count();
    this.addInfoLog(`Main accordions: ${mainCount}`);
    
    // Count book sections (nested accordions)
    const bookSections = chatPanel.locator('details.accordion > details.accordion');
    const bookCount = await bookSections.count();
    this.addInfoLog(`Book sections: ${bookCount}`);
    
    // Log each book title
    for (let i = 0; i < bookCount; i++) {
        const bookSection = bookSections.nth(i);
        const titleElement = bookSection.locator('summary span.truncate');
        if (await titleElement.count() > 0) {
            const title = await titleElement.textContent();
            this.addInfoLog(`Book ${i + 1}: "${title}"`);
        }
    }
    
    this.addInfoLog('=== END DEBUG ===');
};

// Fixed method to extract chat books using correct locators based on the HTML structure
CustomWorld.prototype.extractChatBooksWithLocators = async function(chatPanel: any): Promise<ChatBookData[]> {
    const chatBooks: ChatBookData[] = [];
    
    try {
        // Find all book sections - these are the nested details inside the main accordion
        // The structure is: details.accordion > details.accordion (for each book)
        const bookSections = chatPanel.locator('details.accordion > details.accordion');
        const bookCount = await bookSections.count();
        
        this.addInfoLog(`Found ${bookCount} book sections in chat panel`);
        
        for (let i = 0; i < bookCount; i++) {
            const bookSection = bookSections.nth(i);
            
            try {
                // Extract book title from the summary
                const bookTitle = await this.extractChatBookTitle(bookSection);
                if (!bookTitle) {
                    this.addWarningLog(`Skipping book ${i + 1} - no title found`);
                    continue;
                }
                
                this.addInfoLog(`Extracting data for: "${bookTitle}"`);
                
                // Extract all other fields
                const bookData: ChatBookData = {
                    bookTitle,
                    author: await this.extractChatAuthor(bookSection),
                    publishingDate: await this.extractChatPublishingDate(bookSection),
                    imprint: await this.extractChatImprint(bookSection),
                    relevanceScore: await this.extractChatRelevanceScore(bookSection),
                    whyMatchReasons: await this.extractChatWhyMatchReasons(bookSection)
                };
                
                chatBooks.push(bookData);
                this.addSuccessLog(`✅ Extracted data for "${bookTitle}"`);
                
            } catch (error) {
                this.addWarningLog(`Error processing book ${i + 1}: ${error}`);
            }
        }
        
    } catch (error) {
        this.addErrorLog(`Error extracting chat books with locators: ${error}`);
    }
    
    return chatBooks;
};

// Fixed book title extraction
CustomWorld.prototype.extractChatBookTitle = async function(bookSection: any): Promise<string> {
    try {
        // Extract from: <summary><span class="truncate">1. Araminta Spookie 3: Frognapped</span></summary>
        const titleElement = bookSection.locator('summary span.truncate');
        if (await titleElement.count() > 0) {
            const fullTitle = await titleElement.textContent();
            if (fullTitle) {
                // Remove the numbering (e.g., "1. " from "1. Araminta Spookie 3: Frognapped")
                const title = fullTitle.replace(/^\d+\.\s*/, '').trim();
                this.addInfoLog(`✅ Extracted book title: "${title}"`);
                return title;
            }
        }
    } catch (error) {
        this.addWarningLog(`Error extracting book title: ${error}`);
    }
    return '';
};

// Fixed author extraction
CustomWorld.prototype.extractChatAuthor = async function(bookSection: any): Promise<string> {
    try {
        // Look for the paragraph containing "Author:" text
        // The structure is: <p><p class="py-2 font-bold inline-flex gap-1">Author:</p> Angie Sage and Jimmy Pickering</p>
        const authorElements = bookSection.locator('p:has-text("Author:")');
        if (await authorElements.count() > 0) {
            // Get the parent paragraph that contains both the label and the value
            const authorParagraph = authorElements.first();
            const authorText = await authorParagraph.textContent();
            if (authorText) {
                // Extract text after "Author:"
                const author = authorText.replace('Author:', '').trim();
                this.addInfoLog(`✅ Extracted author: "${author}"`);
                return author;
            }
        }
    } catch (error) {
        this.addWarningLog(`Error extracting author: ${error}`);
    }
    return '';
};

// Fixed publishing date extraction
CustomWorld.prototype.extractChatPublishingDate = async function(bookSection: any): Promise<string> {
    try {
        // Look for the paragraph containing "Publishing Date:" text
        const dateElements = bookSection.locator('p:has-text("Publishing Date:")');
        if (await dateElements.count() > 0) {
            const dateParagraph = dateElements.first();
            const dateText = await dateParagraph.textContent();
            if (dateText) {
                // Extract text after "Publishing Date:"
                const publishingDate = dateText.replace('Publishing Date:', '').trim();
                this.addInfoLog(`✅ Extracted publishing date: "${publishingDate}"`);
                return publishingDate;
            }
        }
    } catch (error) {
        this.addWarningLog(`Error extracting publishing date: ${error}`);
    }
    return '';
};

// Fixed imprint extraction
CustomWorld.prototype.extractChatImprint = async function(bookSection: any): Promise<string> {
    try {
        // Look for the paragraph containing "Imprint:" text
        const imprintElements = bookSection.locator('p:has-text("Imprint:")');
        if (await imprintElements.count() > 0) {
            const imprintParagraph = imprintElements.first();
            const imprintText = await imprintParagraph.textContent();
            if (imprintText) {
                // Extract text after "Imprint:"
                const imprint = imprintText.replace('Imprint:', '').trim();
                this.addInfoLog(`✅ Extracted imprint: "${imprint}"`);
                return imprint;
            }
        }
    } catch (error) {
        this.addWarningLog(`Error extracting imprint: ${error}`);
    }
    return '';
};

// Fixed relevance score extraction
CustomWorld.prototype.extractChatRelevanceScore = async function(bookSection: any): Promise<string> {
    try {
        // Look for the paragraph containing "Relevance Score:" text
        const scoreElements = bookSection.locator('p:has-text("Relevance Score:")');
        if (await scoreElements.count() > 0) {
            const scoreParagraph = scoreElements.first();
            const scoreText = await scoreParagraph.textContent();
            if (scoreText) {
                // Extract text after "Relevance Score:" and remove % if present
                const score = scoreText.replace('Relevance Score:', '').replace('%', '').trim();
                this.addInfoLog(`✅ Extracted relevance score: ${score}%`);
                return score;
            }
        }
    } catch (error) {
        this.addWarningLog(`Error extracting relevance score: ${error}`);
    }
    return '0';
};

// Fixed why match reasons extraction
CustomWorld.prototype.extractChatWhyMatchReasons = async function(bookSection: any): Promise<string[]> {
    const reasons: string[] = [];
    
    try {
        // Find the "Why this book is the match" section within this book section
        const whyMatchSection = bookSection.locator('details.accordion:has(summary:has-text("Why this book is the"))');
        
        if (await whyMatchSection.count() > 0) {
            // Get all list items from the ordered list
            const reasonItems = whyMatchSection.locator('ol li');
            const reasonCount = await reasonItems.count();
            
            this.addInfoLog(`Found ${reasonCount} reason items`);
            
            for (let i = 0; i < reasonCount; i++) {
                const reasonItem = reasonItems.nth(i);
                const reasonText = await reasonItem.textContent();
                
                if (reasonText) {
                    // Clean the reason text - remove citation markers and extra spaces
                    let cleanReason = reasonText
                        .replace(/\(metadata\)/gi, '')
                        .replace(/\(manuscript\)/gi, '')
                        .replace(/\[metadata\]/gi, '')
                        .replace(/\[manuscript\]/gi, '')
                        .replace(/\s+/g, ' ')
                        .trim();
                    
                    if (cleanReason) {
                        reasons.push(cleanReason);
                        this.addInfoLog(`✅ Extracted reason ${i + 1}: "${cleanReason.substring(0, 80)}..."`);
                    }
                }
            }
        } else {
            this.addWarningLog('No "Why this book is the match" section found in this book');
        }
        
    } catch (error) {
        this.addWarningLog(`Error extracting why match reasons: ${error}`);
    }
    
    this.addInfoLog(`Total reasons extracted: ${reasons.length}`);
    return reasons;
};

// Improved expand method with correct selectors
CustomWorld.prototype.expandAllChatSections = async function(chatPanel: any): Promise<void> {
    try {
        // Since all sections are already open (open attribute is present), we don't need to click
        // But let's verify they are open and log the structure
        
        // Find all book sections
        const bookSections = chatPanel.locator('details.accordion > details.accordion');
        const bookCount = await bookSections.count();
        
        this.addInfoLog(`Found ${bookCount} book sections (already expanded)`);
        
        for (let i = 0; i < bookCount; i++) {
            const bookSection = bookSections.nth(i);
            
            // Check if the book section is open
            const isBookOpen = await bookSection.getAttribute('open');
            if (isBookOpen) {
                this.addInfoLog(`Book section ${i + 1} is already expanded`);
            } else {
                this.addWarningLog(`Book section ${i + 1} is not expanded, clicking...`);
                const bookSummary = bookSection.locator('summary');
                await bookSummary.click();
                await this.page.waitForTimeout(500);
            }
            
            // Check and expand "Why this book is the match" sections if needed
            const whyMatchSections = bookSection.locator('details.accordion:has(summary:has-text("Why this book is the"))');
            const whyMatchCount = await whyMatchSections.count();
            
            for (let j = 0; j < whyMatchCount; j++) {
                const whyMatchSection = whyMatchSections.nth(j);
                const isWhyMatchOpen = await whyMatchSection.getAttribute('open');
                
                if (isWhyMatchOpen) {
                    this.addInfoLog(`"Why this book is the match" section ${j + 1} for book ${i + 1} is already expanded`);
                } else {
                    this.addInfoLog(`Expanding "Why this book is the match" section ${j + 1} for book ${i + 1}`);
                    const whyMatchSummary = whyMatchSection.locator('summary');
                    await whyMatchSummary.click();
                    await this.page.waitForTimeout(500);
                }
            }
        }
        
        this.addSuccessLog('✅ All chat sections verified/expanded successfully');
        
    } catch (error) {
        this.addWarningLog(`⚠️ Error expanding chat sections: ${error}`);
    }
};

Then('I validate book titles of all cards against chat data', async function (this: CustomWorld) {
    this.addHeaderLog('📚 VALIDATING BOOK TITLES AGAINST CHAT');
    
    if (!this.allCardContents || this.allCardContents.length === 0) {
        throw new Error('No card contents extracted. Please run "I extract detailed content from the book card" first.');
    }

    if (!this.chatBooks || this.chatBooks.length === 0) {
        throw new Error('No chat data loaded. Please run "I extract expected data from the left-side chat panel" first.');
    }

    try {
        const validationResults = this.validateBookTitlesAgainstChat(this.allCardContents, this.chatBooks);
        const report = this.generateBookTitlesValidationReport(validationResults);
        await this.attach(report, 'text/plain');

        const failedValidations = validationResults.filter(r => !r.isValid);
        if (failedValidations.length > 0) {
            throw new Error(`${failedValidations.length} book title validations failed`);
        }
        
        this.addSuccessLog(`✅ ALL BOOK TITLES VALIDATED SUCCESSFULLY AGAINST CHAT`);
        
    } catch (error) {
        this.addErrorLog(`❌ Book titles validation error: ${error}`);
        throw error;
    }
});

Then('I validate authors of all cards against chat data', async function (this: CustomWorld) {
    this.addHeaderLog('👥 VALIDATING AUTHORS AGAINST CHAT');
    
    if (!this.allCardContents || this.allCardContents.length === 0) {
        throw new Error('No card contents extracted. Please run "I extract detailed content from the book card" first.');
    }

    if (!this.chatBooks || this.chatBooks.length === 0) {
        throw new Error('No chat data loaded. Please run "I extract expected data from the left-side chat panel" first.');
    }

    try {
        const validationResults = this.validateAuthorsAgainstChat(this.allCardContents, this.chatBooks);
        const report = this.generateAuthorsValidationReport(validationResults);
        await this.attach(report, 'text/plain');

        const failedValidations = validationResults.filter(r => !r.isValid);
        if (failedValidations.length > 0) {
            throw new Error(`${failedValidations.length} author validations failed`);
        }
        
        this.addSuccessLog(`✅ ALL AUTHORS VALIDATED SUCCESSFULLY AGAINST CHAT`);
        
    } catch (error) {
        this.addErrorLog(`❌ Authors validation error: ${error}`);
        throw error;
    }
});

Then('I validate relevance scores of all cards against chat data', async function (this: CustomWorld) {
    this.addHeaderLog('📊 VALIDATING RELEVANCE SCORES AGAINST CHAT');
    
    if (!this.allCardContents || this.allCardContents.length === 0) {
        throw new Error('No card contents extracted. Please run "I extract detailed content from the book card" first.');
    }

    if (!this.chatBooks || this.chatBooks.length === 0) {
        throw new Error('No chat data loaded. Please run "I extract expected data from the left-side chat panel" first.');
    }

    try {
        const validationResults = this.validateRelevanceScoresAgainstChat(this.allCardContents, this.chatBooks);
        const report = this.generateRelevanceScoresValidationReport(validationResults);
        await this.attach(report, 'text/plain');

        const failedValidations = validationResults.filter(r => !r.isValid);
        if (failedValidations.length > 0) {
            throw new Error(`${failedValidations.length} relevance score validations failed`);
        }
        
        this.addSuccessLog(`✅ ALL RELEVANCE SCORES VALIDATED SUCCESSFULLY AGAINST CHAT`);
        
    } catch (error) {
        this.addErrorLog(`❌ Relevance scores validation error: ${error}`);
        throw error;
    }
});

Then('I validate why match reasons of all cards against chat data', async function (this: CustomWorld) {
    this.addHeaderLog('🔍 VALIDATING WHY MATCH REASONS AGAINST CHAT');
    
    if (!this.allCardContents || this.allCardContents.length === 0) {
        throw new Error('No card contents extracted. Please run "I extract detailed content from the book card" first.');
    }

    if (!this.chatBooks || this.chatBooks.length === 0) {
        throw new Error('No chat data loaded. Please run "I extract expected data from the left-side chat panel" first.');
    }

    try {
        const validationResults = this.validateWhyMatchReasonsAgainstChat(this.allCardContents, this.chatBooks);
        const report = this.generateWhyMatchReasonsValidationReport(validationResults);
        await this.attach(report, 'text/plain');

        const failedValidations = validationResults.filter(r => !r.isValid);
        if (failedValidations.length > 0) {
            throw new Error(`${failedValidations.length} why match reasons validations failed`);
        }
        
        this.addSuccessLog(`✅ ALL WHY MATCH REASONS VALIDATED SUCCESSFULLY AGAINST CHAT`);
        
    } catch (error) {
        this.addErrorLog(`❌ Why match reasons validation error: ${error}`);
        throw error;
    }
});

Then('I validate all card contents comprehensively against chat data', async function (this: CustomWorld) {
    this.addHeaderLog('🏆 COMPREHENSIVE VALIDATION AGAINST CHAT');
    
    if (!this.allCardContents || this.allCardContents.length === 0) {
        throw new Error('No card contents extracted. Please run "I extract detailed content from the book card" first.');
    }

    if (!this.chatBooks || this.chatBooks.length === 0) {
        throw new Error('No chat data loaded. Please run "I extract expected data from the left-side chat panel" first.');
    }

    try {
        const comprehensiveResults = this.validateAllFieldsAgainstChat(this.allCardContents, this.chatBooks);
        const report = this.generateComprehensiveValidationReport(comprehensiveResults);
        await this.attach(report, 'text/plain');

        const failedValidations = comprehensiveResults.filter(r => !r.isValid);
        if (failedValidations.length > 0) {
            throw new Error(`${failedValidations.length} comprehensive validations failed`);
        }
        
        this.addSuccessLog(`🎉 ALL COMPREHENSIVE VALIDATIONS PASSED AGAINST CHAT`);
        
    } catch (error) {
        this.addErrorLog(`❌ Comprehensive validation error: ${error}`);
        throw error;
    }
});

// Helper method to click citation buttons
CustomWorld.prototype.clickCitationButtons = async function(cardLocator: any): Promise<void> {
    try {
        const citationButtons = cardLocator.locator('.BookCitation-module_citationButton__8U9MO');
        const buttonCount = await citationButtons.count();
        
        if (buttonCount > 0) {
            this.addInfoLog(`Found ${buttonCount} citation buttons, clicking to reveal text...`);
            
            for (let i = 0; i < buttonCount; i++) {
                const button = citationButtons.nth(i);
                await button.click();
                await this.page.waitForTimeout(500); // Wait for citation to appear
            }
            
            this.addInfoLog('✅ All citation buttons clicked');
        }
    } catch (error) {
        this.addWarningLog(`⚠️ Could not click citation buttons: ${error}`);
    }
};

// Improved method to extract highlighted texts from citations
CustomWorld.prototype.extractHighlightedTextsFromCitations = async function(cardLocator: any): Promise<string[]> {
    const highlightedTexts: string[] = [];
    
    try {
        this.addInfoLog('🔍 Looking for citation buttons to extract highlighted text...');
        
        // Use the specific locator for citation buttons - these are the clickable [metadata] or [manuscript] buttons
        const citationButtons = cardLocator.locator('div[class="pb-4 pt-4"] span[class*="BookCitation-module_citationText"]');
        const buttonCount = await citationButtons.count();
        
        if (buttonCount > 0) {
            this.addSuccessLog(`✅ Found ${buttonCount} citation buttons in the card`);
            
            for (let i = 0; i < buttonCount; i++) {
                const button = citationButtons.nth(i);
                
                try {
                    this.addInfoLog(`📝 Processing citation button ${i + 1}/${buttonCount}`);
                    
                    // Get the citation type before clicking
                    const citationType = await button.textContent();
                    this.addInfoLog(`   - Citation type: ${citationType}`);
                    
                    // Click the citation button to open the tooltip/popover
                    await button.click();
                    await this.page.waitForTimeout(1500); // Wait for tooltip to appear
                    
                    // Now look for the highlighted text in the tooltip/popover
                    // The highlighted text should be visible after clicking the citation
                    let highlightedText = '';
                    
                    // Try multiple selectors for the highlighted text content
                    const highlightedTextSelectors = [
                        'span[id*=quotes-citations]',
                        '[style*="background-color:#eaea79"]',
                        '[style*="display:inline"]',
                    ];
                    
                    for (const selector of highlightedTextSelectors) {
                        const element = this.page.locator(selector).first().filter({ hasText: /.+/ }); // Only elements with text
                        if (await element.count() > 0) {
                            const text = await element.textContent();
                            if (text && text.trim() && !text.includes('metadata') && !text.includes('manuscript')) {
                                highlightedText = text.trim();
                                this.addSuccessLog(`✅ Found highlighted text using selector: ${selector}`);
                                break;
                            }
                        }
                    }
                    
                    // If we still haven't found the text, try to get any newly visible text in the card
                    if (!highlightedText) {
                        // Look for any text that might have appeared after clicking
                        const allVisibleTexts = cardLocator.locator('*:visible').filter({ hasText: /.+/ });
                        const visibleCount = await allVisibleTexts.count();
                        
                        for (let j = 0; j < visibleCount; j++) {
                            const text = await allVisibleTexts.nth(j).textContent();
                            if (text && text.trim() && 
                                !text.includes('metadata') && 
                                !text.includes('manuscript') &&
                                !text.includes('Why this book') &&
                                text.length > 10) {
                                highlightedText = text.trim();
                                break;
                            }
                        }
                    }
                    
                    if (highlightedText) {
                        // Clean up the text - remove any citation markers
                        highlightedText = highlightedText
                            .replace(/\(metadata\)/gi, '')
                            .replace(/\(manuscript\)/gi, '')
                            .replace(/\[metadata\]/gi, '')
                            .replace(/\[manuscript\]/gi, '')
                            .trim();
                        
                        highlightedTexts.push(highlightedText);
                        this.addSuccessLog(`✅ Extracted highlighted text ${i + 1}: "${highlightedText.substring(0, 80)}..."`);
                    } else {
                        this.addWarningLog(`⚠️ Could not extract highlighted text for citation ${i + 1}`);
                        highlightedTexts.push(`[No highlighted text found for ${citationType}]`);
                    }
                    
                    // Click again to close the citation (if needed)
                    await button.click();
                    await this.page.waitForTimeout(500);
                    
                } catch (error) {
                    this.addWarningLog(`⚠️ Error processing citation button ${i + 1}: ${error}`);
                    highlightedTexts.push(`[Error extracting citation ${i + 1}]`);
                }
            }
        } else {
            this.addWarningLog('⚠️ No citation buttons found using the specified locator');
            
            // Try alternative selectors for citation buttons
            const alternativeButtons = cardLocator.locator('[class*="citation"], button, span').filter({ 
                hasText: /metadata|manuscript/i 
            });
            const altCount = await alternativeButtons.count();
            
            if (altCount > 0) {
                this.addInfoLog(`🔧 Found ${altCount} citation buttons using alternative selector`);
                
                for (let i = 0; i < altCount; i++) {
                    const button = alternativeButtons.nth(i);
                    await button.click();
                    await this.page.waitForTimeout(1000);
                    
                    // Try to extract text after clicking
                    const visibleText = cardLocator.locator('*:visible').first();
                    const text = await visibleText.textContent();
                    highlightedTexts.push(text || `[Alternative citation ${i + 1}]`);
                    
                    await button.click();
                    await this.page.waitForTimeout(500);
                }
            }
        }
        
        this.addSuccessLog(`🎯 Total highlighted texts extracted: ${highlightedTexts.length}`);
        
    } catch (error) {
        this.addErrorLog(`❌ Error extracting highlighted texts from citations: ${error}`);
    }
    
    return highlightedTexts;
};
CustomWorld.prototype.expandAllChatSections = async function(chatPanel: any): Promise<void> {
    try {
        // Find all book sections (details that contain book information)
        const bookSections = chatPanel.locator('details:has-text("Book Title:")');
        const bookCount = await bookSections.count();
        
        this.addInfoLog(`Found ${bookCount} book sections to expand`);
        
        for (let i = 0; i < bookCount; i++) {
            const bookSection = bookSections.nth(i);
            
            // Get the main book summary (the one with the numbered title)
            const bookSummary = bookSection.locator('summary:has(span.truncate):not(:has-text("Why this book is the"))');
            
            if (await bookSummary.count() > 0) {
                // Check if the book section is closed (has angle-down icon)
                const angleDownIcon = bookSummary.locator('.pi.pi-angle-down');
                
                if (await angleDownIcon.count() > 0) {
                    this.addInfoLog(`Expanding book section ${i + 1}`);
                    await bookSummary.click();
                    await this.page.waitForTimeout(1000);
                } else {
                    this.addInfoLog(`Book section ${i + 1} is already expanded`);
                }
                
                // Now expand the "Why this book is the match" section inside this book
                const whyMatchSummary = bookSection.locator('summary:has-text("Why this book is the")');
                const whyMatchCount = await whyMatchSummary.count();
                
                for (let j = 0; j < whyMatchCount; j++) {
                    const whyMatchSection = whyMatchSummary.nth(j);
                    const whyMatchAngleDown = whyMatchSection.locator('.pi.pi-angle-down');
                    
                    if (await whyMatchAngleDown.count() > 0) {
                        this.addInfoLog(`Expanding "Why this book is the match" section for book ${i + 1}`);
                        await whyMatchSection.click();
                        await this.page.waitForTimeout(1000);
                    } else {
                        this.addInfoLog(`"Why this book is the match" section for book ${i + 1} is already expanded`);
                    }
                }
            }
        }
        
        this.addSuccessLog('✅ All chat sections expanded successfully');
        
    } catch (error) {
        this.addWarningLog(`⚠️ Error expanding chat sections: ${error}`);
    }
};

// Helper methods - World interface extension
declare module "../../support/world" {
    interface CustomWorld {
        extractedCardContent?: CardContentData;
        expectedCardContent?: CardContentData;
        allCardContents?: CardContentData[];
        chatBooks?: ChatBookData[];
        cardValidationResult?: any;
        
        // Add helper methods to World interface
        logCardContent(cardContent: CardContentData): void;
        generateCardContentSummary(allCardContents: CardContentData[]): string;
        generateChatDataSummary(chatBooks: ChatBookData[]): string;
        clickCitationButtons(cardLocator: any): Promise<void>;
        extractHighlightedTextsFromCitations(cardLocator: any): Promise<string[]>;
        expandAllChatSections(chatPanel: any): Promise<void>;
        
        // Chat validation methods
        validateBookTitlesAgainstChat(extractedCards: CardContentData[], chatBooks: ChatBookData[]): any[];
        validateAuthorsAgainstChat(extractedCards: CardContentData[], chatBooks: ChatBookData[]): any[];
        validateRelevanceScoresAgainstChat(extractedCards: CardContentData[], chatBooks: ChatBookData[]): any[];
        validateWhyMatchReasonsAgainstChat(extractedCards: CardContentData[], chatBooks: ChatBookData[]): any[];
        validateAllFieldsAgainstChat(extractedCards: CardContentData[], chatBooks: ChatBookData[]): any[];
        
        // Report generation methods
        generateBookTitlesValidationReport(results: any[]): string;
        generateAuthorsValidationReport(results: any[]): string;
        generateRelevanceScoresValidationReport(results: any[]): string;
        generateWhyMatchReasonsValidationReport(results: any[]): string;
        generateComprehensiveValidationReport(results: any[]): string;
        generateFieldValidationReport(results: any[], title: string, fieldType: string): string;

        // Utility methods
        calculateSimilarity(text1: string, text2: string): number;
        findMatchingChatBook(bookTitle: string, chatBooks: ChatBookData[]): ChatBookData | undefined;

        // The new locator-based extraction methods
        extractChatBooksWithLocators(chatPanel: any): Promise<ChatBookData[]>;
        extractChatBookTitle(bookSection: any): Promise<string>;
        extractChatAuthor(bookSection: any): Promise<string>;
        extractChatPublishingDate(bookSection: any): Promise<string>;
        extractChatImprint(bookSection: any): Promise<string>;
        extractChatRelevanceScore(bookSection: any): Promise<string>;
        extractChatWhyMatchReasons(bookSection: any): Promise<string[]>;
        expandAllChatSections(chatPanel: any): Promise<void>;
        debugChatStructure(chatPanel: any): Promise<void>;
        extractCompleteReasons(book: BookData): string[];
    }
}

// Implement helper methods on CustomWorld prototype
CustomWorld.prototype.logCardContent = function(cardContent: CardContentData): void {
    this.addInfoLog(`📖 Book: "${cardContent.bookTitle}"`);
    this.addInfoLog(`👥 Authors: ${cardContent.authors}`);
    this.addInfoLog(`🏷️ Imprint: ${cardContent.imprint}`);
    this.addInfoLog(`📊 Score: ${cardContent.relevanceScore || 'N/A'}%`);
    this.addInfoLog(`🔍 Reasons: ${cardContent.whyMatchReasons.length}`);
    
    cardContent.whyMatchReasons.forEach((reason: any, index: number) => {
        this.addInfoLog(`   ${index + 1}. ${reason.reasonText}`);
        this.addInfoLog(`      → Highlighted: "${reason.highlightedText}"`);
        this.addInfoLog(`      → Citation: ${reason.citationType}`);
    });
    
    this.addInfoLog(`🎯 Highlighted Texts: ${cardContent.highlightedTexts.length}`);
    cardContent.highlightedTexts.forEach((text: string, index: number) => {
        this.addInfoLog(`   ${index + 1}. "${text}"`);
    });
};

CustomWorld.prototype.generateCardContentSummary = function(allCardContents: CardContentData[]): string {
    let summary = `CARD CONTENT EXTRACTION SUMMARY\n`;
    summary += `================================\n`;
    summary += `Total Books: ${allCardContents.length}\n\n`;
    
    allCardContents.forEach((content: CardContentData, index: number) => {
        summary += `BOOK ${index + 1}:\n`;
        summary += `  Title: ${content.bookTitle}\n`;
        summary += `  Authors: ${content.authors}\n`;
        summary += `  Imprint: ${content.imprint}\n`;
        summary += `  Relevance Score: ${content.relevanceScore || 'N/A'}%\n`;
        summary += `  Why Match Reasons (${content.whyMatchReasons.length}):\n`;
        
        // Display each reason with numbering
        content.whyMatchReasons.forEach((reason, reasonIndex) => {
            summary += `    ${reasonIndex + 1}. ${reason.reasonText}\n`;
            summary += `       → Citation Type: ${reason.citationType}\n`;
            summary += `       → Highlighted Text: ${reason.highlightedText}\n`;
        });
        
        summary += `  Highlighted Texts (${content.highlightedTexts.length}):\n`;
        content.highlightedTexts.forEach((text, textIndex) => {
            summary += `    ${textIndex + 1}. ${text}\n`;
        });
        
        summary += `---\n`;
    });
    
    return summary;
};

CustomWorld.prototype.generateChatDataSummary = function(chatBooks: ChatBookData[]): string {
    let summary = `CHAT DATA SUMMARY\n`;
    summary += `================\n`;
    summary += `Total Books: ${chatBooks.length}\n\n`;
    
    chatBooks.forEach((book: ChatBookData, index: number) => {
        summary += `BOOK ${index + 1}:\n`;
        summary += `  Title: ${book.bookTitle}\n`;
        summary += `  Author: ${book.author}\n`;
        summary += `  Publishing Date: ${book.publishingDate}\n`;
        summary += `  Imprint: ${book.imprint}\n`;
        summary += `  Score: ${book.relevanceScore}%\n`;
        summary += `  Reasons (${book.whyMatchReasons.length}):\n`;
        
        // Show actual reason texts with numbering
        book.whyMatchReasons.forEach((reason, reasonIndex) => {
            summary += `    ${reasonIndex + 1}. ${reason}\n`;
        });
        
        summary += `---\n`;
    });
    
    return summary;
};

// Validation Methods Implementation
CustomWorld.prototype.validateBookTitlesAgainstChat = function(extractedCards: CardContentData[], chatBooks: ChatBookData[]): any[] {
    const results: any[] = [];
    
    extractedCards.forEach(extractedCard => {
        const chatBook = this.findMatchingChatBook(extractedCard.bookTitle, chatBooks);
        if (chatBook) {
            const isValid = extractedCard.bookTitle === chatBook.bookTitle;
            results.push({
                bookTitle: extractedCard.bookTitle,
                extractedTitle: extractedCard.bookTitle,
                expectedTitle: chatBook.bookTitle,
                isValid,
                error: isValid ? '' : `Book title mismatch: Expected "${chatBook.bookTitle}", Found "${extractedCard.bookTitle}"`
            });
        } else {
            results.push({
                bookTitle: extractedCard.bookTitle,
                extractedTitle: extractedCard.bookTitle,
                expectedTitle: 'Not found in chat',
                isValid: false,
                error: `Book not found in chat data: "${extractedCard.bookTitle}"`
            });
        }
    });
    
    return results;
};

CustomWorld.prototype.validateAuthorsAgainstChat = function(extractedCards: CardContentData[], chatBooks: ChatBookData[]): any[] {
    const results: any[] = [];
    
    extractedCards.forEach(extractedCard => {
        const chatBook = this.findMatchingChatBook(extractedCard.bookTitle, chatBooks);
        if (chatBook) {
            const isValid = extractedCard.authors === chatBook.author;
            results.push({
                bookTitle: extractedCard.bookTitle,
                extractedAuthor: extractedCard.authors,
                expectedAuthor: chatBook.author,
                isValid,
                error: isValid ? '' : `Author mismatch: Expected "${chatBook.author}", Found "${extractedCard.authors}"`
            });
        }
    });
    
    return results;
};

CustomWorld.prototype.validateRelevanceScoresAgainstChat = function(extractedCards: CardContentData[], chatBooks: ChatBookData[]): any[] {
    const results: any[] = [];
    
    extractedCards.forEach(extractedCard => {
        const chatBook = this.findMatchingChatBook(extractedCard.bookTitle, chatBooks);
        if (chatBook) {
            const extractedScore = parseInt(extractedCard.relevanceScore || '0') || 0;
            const expectedScore = parseInt(chatBook.relevanceScore) || 0;
            const isValid = Math.abs(extractedScore - expectedScore) <= 5; // Allow 5% tolerance
            
            results.push({
                bookTitle: extractedCard.bookTitle,
                extractedScore: extractedCard.relevanceScore || 'N/A',
                expectedScore: chatBook.relevanceScore,
                isValid,
                error: isValid ? '' : `Relevance score mismatch: Expected ${expectedScore}%, Found ${extractedScore}%`
            });
        }
    });
    
    return results;
};

CustomWorld.prototype.validateWhyMatchReasonsAgainstChat = function(extractedCards: CardContentData[], chatBooks: ChatBookData[]): any[] {
    const results: any[] = [];
    
    extractedCards.forEach(extractedCard => {
        const chatBook = this.findMatchingChatBook(extractedCard.bookTitle, chatBooks);
        if (chatBook) {
            const extractedReasons = extractedCard.whyMatchReasons.map(r => r.reasonText);
            const expectedReasons = chatBook.whyMatchReasons;
            
            let matchedReasons = 0;
            const reasonErrors: string[] = [];
            
            expectedReasons.forEach((expectedReason, index) => {
                const found = extractedReasons.some(extractedReason => 
                    extractedReason.includes(expectedReason.trim()) || 
                    this.calculateSimilarity(extractedReason, expectedReason.trim()) > 0.7
                );
                
                if (found) {
                    matchedReasons++;
                } else {
                    reasonErrors.push(`Reason not found: "${expectedReason}"`);
                }
            });
            
            const isValid = matchedReasons === expectedReasons.length;
            
            results.push({
                bookTitle: extractedCard.bookTitle,
                extractedReasonCount: extractedReasons.length,
                expectedReasonCount: expectedReasons.length,
                matchedReasons,
                isValid,
                errors: reasonErrors,
                error: isValid ? '' : `Reason mismatch: ${matchedReasons}/${expectedReasons.length} reasons matched`
            });
        }
    });
    
    return results;
};

CustomWorld.prototype.validateAllFieldsAgainstChat = function(extractedCards: CardContentData[], chatBooks: ChatBookData[]): any[] {
    const results: any[] = [];
    
    extractedCards.forEach(extractedCard => {
        const chatBook = this.findMatchingChatBook(extractedCard.bookTitle, chatBooks);
        if (chatBook) {
            // Validate all fields
            const titleValid = extractedCard.bookTitle === chatBook.bookTitle;
            const authorValid = extractedCard.authors === chatBook.author;
            
            const extractedScore = parseInt(extractedCard.relevanceScore || '0') || 0;
            const expectedScore = parseInt(chatBook.relevanceScore) || 0;
            const scoreValid = Math.abs(extractedScore - expectedScore) <= 5;
            
            const extractedReasons = extractedCard.whyMatchReasons.map(r => r.reasonText);
            const expectedReasons = chatBook.whyMatchReasons;
            let reasonsValid = true;
            expectedReasons.forEach(expectedReason => {
                const found = extractedReasons.some(extractedReason => 
                    extractedReason.includes(expectedReason.trim()) || 
                    this.calculateSimilarity(extractedReason, expectedReason.trim()) > 0.7
                );
                if (!found) reasonsValid = false;
            });
            
            const isValid = titleValid && scoreValid && authorValid && reasonsValid;
            
            const errors: string[] = [];
            if (!titleValid) errors.push(`Title mismatch`);
            if (!scoreValid) errors.push(`Score mismatch: ${extractedScore}% vs ${expectedScore}%`);
            if (!authorValid) errors.push(`Author mismatch`);
            if (!reasonsValid) errors.push(`Reasons mismatch`);
            
            results.push({
                bookTitle: extractedCard.bookTitle,
                isValid,
                errors,
                error: isValid ? '' : `Comprehensive validation failed: ${errors.join(', ')}`
            });
        } else {
            results.push({
                bookTitle: extractedCard.bookTitle,
                isValid: false,
                errors: ['Book not found in chat'],
                error: `Book not found in chat data: "${extractedCard.bookTitle}"`
            });
        }
    });
    
    return results;
};

// Report Generation Methods
CustomWorld.prototype.generateBookTitlesValidationReport = function(results: any[]): string {
    return this.generateFieldValidationReport(results, 'BOOK TITLES VALIDATION REPORT', 'Title');
};

CustomWorld.prototype.generateAuthorsValidationReport = function(results: any[]): string {
    return this.generateFieldValidationReport(results, 'AUTHORS VALIDATION REPORT', 'Author');
};

CustomWorld.prototype.generateRelevanceScoresValidationReport = function(results: any[]): string {
    return this.generateFieldValidationReport(results, 'RELEVANCE SCORES VALIDATION REPORT', 'Score');
};

CustomWorld.prototype.generateWhyMatchReasonsValidationReport = function(results: any[]): string {
    let report = `WHY MATCH REASONS VALIDATION REPORT\n`;
    report += '='.repeat(50) + '\n';
    
    const passed = results.filter(r => r.isValid).length;
    const failed = results.filter(r => !r.isValid).length;
    
    report += `TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}\n\n`;
    
    results.forEach(result => {
        report += `BOOK: "${result.bookTitle}"\n`;
        report += `  Status: ${result.isValid ? '✅ PASS' : '❌ FAIL'}\n`;
        report += `  Matched: ${result.matchedReasons}/${result.expectedReasonCount} reasons\n`;
        report += `  Extracted: ${result.extractedReasonCount} reasons\n`;
        if (!result.isValid) {
            report += `  Error: ${result.error}\n`;
            if (result.errors && result.errors.length > 0) {
                result.errors.forEach((err: string) => {
                    report += `    - ${err}\n`;
                });
            }
        }
        report += '---\n';
    });
    
    return report;
};

CustomWorld.prototype.generateComprehensiveValidationReport = function(results: any[]): string {
    let report = `COMPREHENSIVE VALIDATION REPORT\n`;
    report += '='.repeat(50) + '\n';
    
    const passed = results.filter(r => r.isValid).length;
    const failed = results.filter(r => !r.isValid).length;
    
    report += `TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}\n\n`;
    
    results.forEach(result => {
        report += `BOOK: "${result.bookTitle}"\n`;
        report += `  Status: ${result.isValid ? '✅ PASS' : '❌ FAIL'}\n`;
        if (!result.isValid) {
            report += `  Errors:\n`;
            result.errors.forEach((err: string) => {
                report += `    - ${err}\n`;
            });
        }
        report += '---\n';
    });
    
    return report;
};

CustomWorld.prototype.generateFieldValidationReport = function(results: any[], title: string, fieldType: string): string {
    let report = `${title}\n`;
    report += '='.repeat(50) + '\n';
    
    const passed = results.filter(r => r.isValid).length;
    const failed = results.filter(r => !r.isValid).length;
    
    report += `TOTAL: ${results.length} | PASSED: ${passed} | FAILED: ${failed}\n\n`;
    
    results.forEach(result => {
        report += `BOOK: "${result.bookTitle}"\n`;
        report += `  Status: ${result.isValid ? '✅ PASS' : '❌ FAIL'}\n`;
        report += `  Extracted: ${result[`extracted${fieldType}`]}\n`;
        report += `  Expected: ${result[`expected${fieldType}`]}\n`;
        if (!result.isValid) {
            report += `  Error: ${result.error}\n`;
        }
        report += '---\n';
    });
    
    return report;
};

// Utility Methods
CustomWorld.prototype.calculateSimilarity = function(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
};

CustomWorld.prototype.findMatchingChatBook = function(bookTitle: string, chatBooks: ChatBookData[]): ChatBookData | undefined {
    return chatBooks.find(book => book.bookTitle === bookTitle);
};