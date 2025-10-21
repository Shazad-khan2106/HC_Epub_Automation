import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config();
const { testData } = require('../test_data/properties');
import { CustomWorld } from '../../support/world'; 
import { locators } from '../locator/locators';
import { BookData, BookExtractor } from '../utils/bookExtractor';
import { ExcelExporter } from '../utils/excelExporter';
import { DatabaseReader } from '../utils/databaseReader';
import { CitationValidator, CitationValidationResult } from '../utils/citationValidator';
import { GeminiService, AIAnalysisResult, BookAnalysisResult } from '../utils/geminiService';


export class BookGeniePage {
        private geminiService: GeminiService;

    constructor(private world: CustomWorld) {
        this.geminiService = new GeminiService();

    }

    private get page() {
        return this.world.page;
    }
    

    async clickOnModeSelectionDropdown() {
        this.world.addInfoLog('Clicking on mode selection dropdown');
        await this.page.locator(locators.modeSelectionDropdown).waitFor({ state: 'visible' });
        await this.page.locator(locators.modeSelectionDropdown).click();
        this.world.addSuccessLog('Mode selection dropdown clicked successfully');
    }

    async checkModeVisiblity(mode: string) {
        this.world.addInfoLog(`Checking visibility of mode: ${mode}`);
        await this.page.getByText(mode).waitFor({ state: 'visible' });
        const visible = await this.page.getByText(mode).isVisible();
        
        if (visible) {
            this.world.addSuccessLog(`Mode "${mode}" is visible`);
        } else {
            this.world.addErrorLog(`Mode "${mode}" is not visible`);
        }
        return visible;
    }

    async selectMode(mode: string) {
        this.world.addInfoLog(`Selecting mode: ${mode}`);
        await this.page.getByText(mode).waitFor({ state: 'visible' });
        await this.page.getByText(mode).click();
        this.world.addSuccessLog(`Mode "${mode}" selected successfully`);
        
        await this.page.waitForTimeout(2000);
        this.world.addInfoLog('Waiting for mode transition to complete');
    }

    async typeQuery(query: string) {
        
        try {   
            await this.page.getByText('✅Welcome to the BookGenie Mode').waitFor({ state: 'visible', timeout: 30000 });
            this.world.addSuccessLog( 'Book Genie welcome message appears');
        } catch (error) {
            this.world.addWarningLog('⚠Book Genie mode did not loaded')
        }
        this.world.addInfoLog(`Preparing to type query: "${query}"`);
        
        this.world.addInfoLog('Waiting for chat input to be visible');
        await this.page.locator(locators.chatInput).waitFor({ state: 'visible', timeout: 30000 });
        
        this.world.addInfoLog('Clearing chat input');
        await this.page.locator(locators.chatInput).clear();
        
        this.world.addInfoLog(`Typing query: "${query}"`);
        await this.page.locator(locators.chatInput).fill(query);
        
        await this.page.waitForTimeout(1000);
        
        this.world.addInfoLog('Pressing Enter to submit query');
        await this.page.locator(locators.chatInput).press('Enter');
        
        this.world.addSuccessLog(`Query submitted successfully: "${query}"`);
    }

    async waitForAIResponse(): Promise<void> {
        this.world.addHeaderLog('WAITING FOR AI RESPONSE');
        this.world.addInfoLog('Looking for AI thinking indicator...');
        
        const thinkingIndicator = this.page.getByText('Creative Workspace AI is thinking', { exact: false });
        
        try {
            this.world.addInfoLog('Waiting for thinking indicator to appear (max 2 minutes)');
            await thinkingIndicator.waitFor({ state: 'visible', timeout: 600000 });
            this.world.addSuccessLog('✓ AI thinking indicator appeared - AI is processing the request');
            
            this.world.addInfoLog('Waiting for thinking indicator to disappear (max 5 minutes)');
            await thinkingIndicator.waitFor({ state: 'hidden', timeout: 1200000 });
            this.world.addSuccessLog('✓ AI thinking completed - Response should be ready');
            
            // NEW: Check for "None of the above" option after thinking completes
            const handledNoneOfTheAbove = await this.checkAndHandleNoneOfTheAbove();
            
            if (handledNoneOfTheAbove) {
                this.world.addMetricLog('"None of the above" option was handled successfully');
            }
            
            this.world.addInfoLog('Allowing additional time for response rendering');
            await this.page.waitForTimeout(3000);
            
        } catch (error) {
            this.world.addErrorLog('AI thinking indicator not found or timeout occurred');
            this.world.addInfoLog('Falling back to 2-minute wait');
            await this.page.waitForTimeout(120000);
            
            // NEW: Even in fallback, check for "None of the above" option
            const handledNoneOfTheAbove = await this.checkAndHandleNoneOfTheAbove();
            
            if (handledNoneOfTheAbove) {
                this.world.addMetricLog('"None of the above" option was handled during fallback');
            }
            
            this.world.addInfoLog('Fallback wait completed');
        }
        
        this.world.addSuccessLog('AI response wait process completed');
    }
    // ENHANCED VERSION with better error handling and logging
// UPDATED METHOD: Check and handle "None of the above, just" option with sibling span
private async checkAndHandleNoneOfTheAbove(): Promise<boolean> {
    try {
        this.world.addInfoLog('🔍 Checking for "None of the above, just" option...');
        
        // Define the locator for "None of the above, just" text
        const noneOfTheAboveText = this.page.locator('p:has-text("None of the above, just")');
        
        // Check if the element exists and is visible
        const isVisible = await noneOfTheAboveText.isVisible().catch(() => false);
        
        if (!isVisible) {
            this.world.addInfoLog('✓ "None of the above, just" option not present - proceeding normally');
            return false;
        }
        
        this.world.addInfoLog('✓ "None of the above, just" option found - looking for sibling span to click');
        
        // Find the sibling span that contains the clickable element
        // The span is a sibling of the <p> element that contains "None of the above, just"
        const clickableSpan = this.page.locator('p:has-text("None of the above, just") + span span.bg-\\[#DBEAFE\\]');
        
        // Alternative selectors if the above doesn't work:
        // const clickableSpan = this.page.locator('span.bg-\\[#DBEAFE\\]:has-text("Search through the")');
        // const clickableSpan = this.page.locator('span:has-text("Search through the HarperCollins book catalog")');
        
        const isSpanVisible = await clickableSpan.isVisible().catch(() => false);
        
        if (!isSpanVisible) {
            this.world.addWarningLog('Clickable span not found for "None of the above, just" option');
            return false;
        }
        
        this.world.addInfoLog('✓ Found clickable span - preparing to click');
        
        // Ensure the span is still visible before clicking
        await clickableSpan.waitFor({ state: 'visible', timeout: 5000 });
        
        // Get the text content of the span for logging
        const spanText = await clickableSpan.textContent().catch(() => 'unknown');
        this.world.addInfoLog(`Clicking on span with text: "${spanText}"`);
        
        // Click on the span
        await clickableSpan.click();
        this.world.addSuccessLog('✅ Clicked on "None of the above, just" option span');
        
        // Wait for the elements to disappear after clicking
        try {
            await noneOfTheAboveText.waitFor({ state: 'hidden', timeout: 10000 });
            this.world.addInfoLog('✓ "None of the above, just" text disappeared after click');
        } catch {
            this.world.addWarningLog('"None of the above, just" text still visible after click');
        }
        
        try {
            await clickableSpan.waitFor({ state: 'hidden', timeout: 10000 });
            this.world.addInfoLog('✓ Clickable span disappeared after click');
        } catch {
            this.world.addWarningLog('Clickable span still visible after click');
        }
        
        // Wait for AI to process the selection - check for thinking indicator
        this.world.addInfoLog('⏳ Waiting for AI to process "None of the above, just" selection...');
        
        const thinkingIndicator = this.page.getByText('Creative Workspace AI is thinking', { exact: false });
        
        try {
            // Wait for thinking indicator to appear (if it does)
            await thinkingIndicator.waitFor({ state: 'visible', timeout: 30000 });
            this.world.addInfoLog('✓ AI thinking indicator appeared after "None of the above, just" selection');
            
            // Wait for thinking to complete again
            await thinkingIndicator.waitFor({ state: 'hidden', timeout: 180000 });
            this.world.addSuccessLog('✅ AI thinking completed after "None of the above, just" selection');
            
        } catch (thinkError) {
            this.world.addWarningLog('No thinking indicator appeared after "None of the above, just" selection');
            this.world.addInfoLog('Waiting additional time for response processing...');
            await this.page.waitForTimeout(5000);
        }
        
        // Final wait for response rendering
        await this.page.waitForTimeout(2000);
        this.world.addSuccessLog('✅ "None of the above, just" handling completed successfully');
        return true;
        
    } catch (error) {
        this.world.addErrorLog(`❌ Error handling "None of the above, just" option: ${error}`);
        
        // Try alternative approach if the first one fails
        this.world.addInfoLog('Trying alternative selector...');
        return await this.tryAlternativeSelector();
    }
}

// Alternative method in case the primary selector fails
private async tryAlternativeSelector(): Promise<boolean> {
    try {
        // Try multiple alternative selectors
        const alternativeSelectors = [
            'span.bg-\\[#DBEAFE\\]',
            'span:has-text("Search through the")',
            'span.inline-flex.space-x-1.items-center span',
            '[class*="bg-[#DBEAFE]"]'
        ];
        
        for (const selector of alternativeSelectors) {
            try {
                const element = this.page.locator(selector).first();
                if (await element.isVisible({ timeout: 2000 })) {
                    this.world.addInfoLog(`Found element with alternative selector: ${selector}`);
                    
                    const text = await element.textContent();
                    this.world.addInfoLog(`Clicking on: "${text}"`);
                    
                    await element.click();
                    this.world.addSuccessLog(`✅ Clicked using alternative selector: ${selector}`);
                    
                    // Wait for processing
                    await this.page.waitForTimeout(3000);
                    return true;
                }
            } catch {
                continue;
            }
        }
        
        this.world.addErrorLog('All alternative selectors failed');
        return false;
        
    } catch (error) {
        this.world.addErrorLog(`Alternative selector approach also failed: ${error}`);
        return false;
    }
}

    async validateResponse(query: string) {
        this.world.addHeaderLog(`VALIDATING RESPONSE FOR QUERY: "${query}"`);
        
        this.world.addInfoLog('Locating the latest response in chat');
        const responseLocator = this.page.locator(locators.chatResponse).last();
        
        this.world.addInfoLog('Waiting for response to be visible (max 30 seconds)');
        await responseLocator.waitFor({ state: 'visible', timeout: 30000 });
        
        const responseText = await responseLocator.textContent();
        const responseLength = responseText ? responseText.length : 0;
        
        this.world.addSuccessLog(`Response received - Length: ${responseLength} characters`);
        
        if (responseText && responseLength > 0) {
            this.world.addInfoLog(`Response preview: ${responseText.substring(0, 100)}...`);
            return true;
        } else {
            this.world.addErrorLog('Empty or invalid response received');
            return false;
        }
    }

    async extractBooksFromBookGenieResponse(): Promise<BookData[]> {
        this.world.addHeaderLog('EXTRACTING BOOK DATA FROM RESPONSE');
        
        try {
            this.world.addInfoLog('Locating BookGenie response container');
            const bookGenieResponseLocator = this.page.locator(locators.chatResponse).last();
            await bookGenieResponseLocator.waitFor({ state: 'visible', timeout: 30000 });
            
            this.world.addInfoLog('Extracting HTML content from response');
            const htmlContent = await bookGenieResponseLocator.innerHTML();
            this.world.addInfoLog(`HTML content extracted - Length: ${htmlContent.length} characters`);
            
            this.world.addInfoLog('Parsing HTML to extract book data');
            const books = BookExtractor.extractBooksFromHTML(htmlContent);
            
            this.world.addSuccessLog(`SUCCESSFULLY EXTRACTED ${books.length} BOOKS`);
            
            // Detailed book logging
            this.world.addHeaderLog('EXTRACTED BOOKS SUMMARY');
            books.forEach((book, index) => {
                this.world.addBookLog(`${index + 1}. "${book.bookTitle}" - Score: ${book.relevanceScore}%`);
            });
            
            this.world.addMetricLog(`Total books extracted: ${books.length}`);
            this.world.addMetricLog(`Average relevance score: ${this.calculateAverageScore(books)}%`);
            
            return books;
        } catch (error) {
            this.world.addErrorLog(`Error extracting books: ${error}`);
            this.world.addInfoLog('Capturing screenshot for debugging');
            await this.page.screenshot({ path: `extraction-error-${Date.now()}.png` });
            return [];
        }
    }

    async saveBooksToExcel(books: BookData[], fileName: string = 'bookgenie_matches.xlsx'): Promise<void> {
        this.world.addHeaderLog('SAVING BOOKS TO EXCEL FILE');
        
        const filePath = fileName.includes('test_results') ? fileName : `./test_results/${fileName}`;
        
        this.world.addInfoLog(`Target file path: ${filePath}`);
        
        const fs = require('fs');
        const dir = './test_results';
        if (!fs.existsSync(dir)) {
            this.world.addInfoLog('Creating test_results directory');
            fs.mkdirSync(dir, { recursive: true });
            this.world.addSuccessLog('test_results directory created');
        }

        this.world.addInfoLog(`Exporting ${books.length} books to Excel format`);
        ExcelExporter.exportToExcel(books, filePath);
        this.world.addSuccessLog(`Book data saved to: ${filePath}`);
        
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            this.world.addMetricLog(`File verified - Size: ${(stats.size / 1024).toFixed(2)} KB`);
            this.world.addSuccessLog('✓ Excel file creation verified successfully');
        } else {
            this.world.addErrorLog('✗ Excel file was not created successfully');
        }
    }

    // Individual validation methods with enhanced logging
    async validateBookTitle(extractedBook: BookData, expectedBook: BookData): Promise<boolean> {
        const extracted = extractedBook.bookTitle.trim();
        const expected = expectedBook.bookTitle.trim();
        
        this.world.addInfoLog(`Validating title: "${extracted}" vs expected: "${expected}"`);
        
        if (extracted === expected) {
            this.world.addSuccessLog(`✅ TITLE VALIDATION PASSED: "${extracted}"`);
            return true;
        } else {
            this.world.addErrorLog(`❌ TITLE VALIDATION FAILED: Expected "${expected}", found "${extracted}"`);
            return false;
        }
    }

    async validateRelevanceScore(extractedBook: BookData, expectedBook: BookData): Promise<boolean> {
        const extracted = parseInt(extractedBook.relevanceScore) || 0;
        const expected = parseInt(expectedBook.relevanceScore) || 0;
        
        this.world.addInfoLog(`Validating score: ${extracted}% vs expected: ${expected}%`);
        
        if (Math.abs(extracted - expected) <= 5) {
            this.world.addSuccessLog(`✅ SCORE VALIDATION PASSED: ${extracted}% (expected ${expected}%)`);
            return true;
        } else {
            this.world.addErrorLog(`❌ SCORE VALIDATION FAILED: Expected ${expected}%, found ${extracted}%`);
            return false;
        }
    }

    async validateGapInformation(extractedBook: BookData, expectedBook: BookData): Promise<boolean> {
    const score = parseInt(extractedBook.relevanceScore) || 0;
    
    // New validation: If score is 100%, there should be no gap mentioned
    if (score === 100) {
        if (extractedBook.gap && extractedBook.gap !== 'No gap mentioned' && extractedBook.gap.trim().length > 0) {
            this.world.addErrorLog(`❌ PERFECT SCORE GAP VALIDATION: Book has 100% score but gap is mentioned: "${extractedBook.gap}"`);
            return false;
        } else {
            this.world.addSuccessLog(`✅ PERFECT SCORE GAP VALIDATION: Book has 100% score and no gap mentioned`);
            return true;
        }
    }

    // Existing validation for scores < 100%
    if (!expectedBook.gap || expectedBook.gap === 'No gap mentioned') {
        this.world.addInfoLog('ℹ️ GAP VALIDATION SKIPPED: No gap expected in reference data');
        return true;
    }

    if (!extractedBook.gap || extractedBook.gap === 'No gap mentioned') {
        this.world.addErrorLog('❌ GAP VALIDATION FAILED: Gap information missing in extracted data');
        return false;
    }

    const similarity = this.calculateSimilarity(extractedBook.gap, expectedBook.gap);
    this.world.addInfoLog(`Gap similarity calculated: ${(similarity * 100).toFixed(1)}%`);
    
    if (similarity > 0.6) {
        this.world.addSuccessLog(`✅ GAP VALIDATION PASSED: Similarity ${(similarity * 100).toFixed(1)}%`);
        return true;
    } else {
        this.world.addErrorLog(`❌ GAP VALIDATION FAILED: Similarity ${(similarity * 100).toFixed(1)}% (threshold: 60%)`);
        return false;
    }
}
    async validateWhyMatch(extractedBook: BookData, expectedBook: BookData): Promise<boolean> {
        if (!expectedBook.whyMatch) {
            this.world.addInfoLog('ℹ️ WHY-MATCH VALIDATION SKIPPED: No why-match expected in reference data');
            return true;
        }

        if (!extractedBook.whyMatch) {
            this.world.addErrorLog('❌ WHY-MATCH VALIDATION FAILED: Why-match information missing in extracted data');
            return false;
        }

        const expectedPoints = expectedBook.whyMatch.split('|').length;
        const extractedPoints = extractedBook.whyMatch.split('|').length;
        
        this.world.addInfoLog(`Why-match points: extracted ${extractedPoints} vs expected ${expectedPoints}`);
        
        if (extractedPoints >= expectedPoints) {
            this.world.addSuccessLog(`✅ WHY-MATCH VALIDATION PASSED: ${extractedPoints} points (expected ${expectedPoints})`);
            return true;
        } else {
            this.world.addErrorLog(`❌ WHY-MATCH VALIDATION FAILED: Found ${extractedPoints} points, expected ${expectedPoints}`);
            return false;
        }
    }

    async validateIndividualBook(extractedBook: BookData, expectedBook: BookData, bookNumber: number): Promise<boolean> {
        this.world.addHeaderLog(`📚 VALIDATING BOOK ${bookNumber}: "${expectedBook.bookTitle}"`);
        
        this.world.addInfoLog('Starting comprehensive book validation');
        
        const titleValid = await this.validateBookTitle(extractedBook, expectedBook);
        const scoreValid = await this.validateRelevanceScore(extractedBook, expectedBook);
        const gapValid = await this.validateGapInformation(extractedBook, expectedBook);
        const whyValid = await this.validateWhyMatch(extractedBook, expectedBook);
        
        const allValid = titleValid && scoreValid && gapValid && whyValid;
        
        if (allValid) {
            this.world.addSuccessLog(`🎉 BOOK ${bookNumber} VALIDATION: ALL CHECKS PASSED!`);
        } else {
            this.world.addErrorLog(`💥 BOOK ${bookNumber} VALIDATION: SOME CHECKS FAILED`);
        }
        
        this.world.addInfoLog(`Book ${bookNumber} validation completed`);
        return allValid;
    }

    // Utility methods
    private calculateSimilarity(text1: string, text2: string): number {
        const words1 = text1.toLowerCase().split(/\s+/);
        const words2 = text2.toLowerCase().split(/\s+/);
        
        const commonWords = words1.filter(word => words2.includes(word));
        return commonWords.length / Math.max(words1.length, words2.length);
    }

    private calculateAverageScore(books: BookData[]): number {
        if (books.length === 0) return 0;
        
        const totalScore = books.reduce((sum, book) => {
            return sum + (parseInt(book.relevanceScore) || 0);
        }, 0);
        
        return Math.round(totalScore / books.length);
    }

    // Database Validation Methods
    async validateBooksAgainstDatabase(extractedBooks: BookData[]): Promise<{
        validCount: number;
        invalidCount: number;
        validBooks: string[];
        invalidBooks: string[];
        databaseInfo: { path: string; bookCount: number };
    }> {
        this.world.addHeaderLog('🏛️ VALIDATING BOOKS AGAINST DATABASE');
        
        const databaseInfo = DatabaseReader.getDatabaseInfo();
        this.world.addInfoLog(`Database Path: ${databaseInfo.path}`);
        this.world.addInfoLog(`Total books in database: ${databaseInfo.bookCount}`);
        
        const extractedTitles = extractedBooks.map(book => book.bookTitle);
        const validationResult = DatabaseReader.findMatchingBooks(extractedTitles);
        
        this.world.addMetricLog(`DATABASE VALIDATION RESULTS:`);
        this.world.addSuccessLog(`✅ Books found in database: ${validationResult.found.length}`);
        this.world.addErrorLog(`❌ Books missing from database: ${validationResult.missing.length}`);
        
        // Log found books
        if (validationResult.found.length > 0) {
            this.world.addInfoLog('📖 BOOKS FOUND IN DATABASE:');
            validationResult.found.forEach((match, index) => {
                this.world.addSuccessLog(`  ${index + 1}. ${match}`);
            });
        }
        
        // Log missing books
        if (validationResult.missing.length > 0) {
            this.world.addInfoLog('🔍 BOOKS MISSING FROM DATABASE:');
            validationResult.missing.forEach((missingTitle, index) => {
                this.world.addErrorLog(`  ${index + 1}. ${missingTitle}`);
            });
        }
        
        // Calculate match percentage
        const matchPercentage = (validationResult.found.length / extractedTitles.length) * 100;
        this.world.addMetricLog(`🎯 Match Percentage: ${matchPercentage.toFixed(1)}%`);
        
        if (matchPercentage < 80) {
            this.world.addErrorLog(`⚠️ Low database match rate: ${matchPercentage.toFixed(1)}%`);
        } else {
            this.world.addSuccessLog(`🎉 Excellent database match rate: ${matchPercentage.toFixed(1)}%`);
        }
        
        return {
            validCount: validationResult.found.length,
            invalidCount: validationResult.missing.length,
            validBooks: validationResult.found,
            invalidBooks: validationResult.missing,
            databaseInfo
        };
    }

    async checkIndividualBookInDatabase(bookTitle: string): Promise<{ exists: boolean; matchedTitle?: string }> {
        this.world.addInfoLog(`Checking if book exists in database: "${bookTitle}"`);
        
        const dbTitles = DatabaseReader.getAllBookTitles();
        const normalizedInput = bookTitle.trim().toLowerCase();
        
        const match = dbTitles.find(dbTitle => 
            dbTitle.toLowerCase().includes(normalizedInput) ||
            normalizedInput.includes(dbTitle.toLowerCase())
        );
        
        if (match) {
            this.world.addSuccessLog(`✅ Database match: "${bookTitle}" → "${match}"`);
            return { exists: true, matchedTitle: match };
        } else {
            this.world.addErrorLog(`❌ Not found in database: "${bookTitle}"`);
            return { exists: false };
        }
    }

async performCompleteCitationValidation(): Promise<{ [bookTitle: string]: CitationValidationResult[] }> {
    this.world.addHeaderLog('🚀 STARTING COMPLETE CITATION VALIDATION WORKFLOW');
    
    try {
        // Step 1: Extract books from response
        this.world.addInfoLog('Step 1: Extracting books from AI response');
        const books = await this.extractBooksFromBookGenieResponse();
        
        if (books.length === 0) {
            throw new Error('No books extracted from response');
        }

        // Step 2: Extract citation texts from book elements using proper workflow
        this.world.addInfoLog('Step 2: Extracting citation texts from book elements');
        const citationTexts = await this.extractCitationTextsFromBookElements();

        // Step 3: Validate matches - ADD AWAIT HERE
        this.world.addInfoLog('Step 3: Validating reason-citation matches');
        const validationResults = await this.validateReasonCitationMatches(books, citationTexts);

        // Step 4: Generate and attach report
        this.world.addInfoLog('Step 4: Generating detailed report');
        const report = this.generateCitationValidationReport(validationResults);
        await this.world.attach(report, 'text/plain');

        this.world.addSuccessLog('✅ Citation validation workflow completed successfully');
        return validationResults;

    } catch (error) {
        this.world.addErrorLog(`❌ Citation validation workflow failed: ${error}`);
        throw error;
    }
}

    async extractCitationTextsFromBookElements(): Promise<{ [bookTitle: string]: string[] }> {
        this.world.addHeaderLog('📚 EXTRACTING CITATION TEXTS FROM BOOK ELEMENTS');
        
        const citationTexts: { [bookTitle: string]: string[] } = {};
        
        try {
            // Step 1: Wait for the main book section to be visible
            this.world.addInfoLog('Step 1: Waiting for main book section');
            await this.page.waitForSelector('details.accordion', { timeout: 10000 });
            
            // Step 2: Get ALL book sections (both main and individual books)
            const allSections = await this.page.locator('details.accordion').all();
            this.world.addInfoLog(`Found ${allSections.length} total accordion sections`);
            
            // Step 3: Identify and process individual book sections
            const bookSections: any[] = [];
            
            for (const section of allSections) {
                const summaryText = await this.getSummaryText(section);
                if (summaryText && await this.isIndividualBookSection(summaryText)) {
                    bookSections.push(section);
                    this.world.addInfoLog(`Found individual book: "${summaryText}"`);
                }
            }
            
            this.world.addInfoLog(`Processing ${bookSections.length} individual book sections`);
            
            // Step 4: Process each individual book section
            for (let i = 0; i < bookSections.length; i++) {
                const bookSection = bookSections[i];
                const bookTitle = await this.extractBookTitleFromSummary(bookSection);
                
                this.world.addHeaderLog(`📖 PROCESSING BOOK ${i + 1}: "${bookTitle}"`);
                
                // Expand the individual book section
                await this.expandIndividualBookSection(bookSection, bookTitle);
                
                // Expand the "Why this book is match" section
                await this.expandWhyMatchSection(bookSection, bookTitle);
                
                // Extract citations for this book
                citationTexts[bookTitle] = await this.extractCitationsForBook(bookSection, bookTitle);
                
                // Collapse the individual book section
                await this.collapseIndividualBookSection(bookSection, bookTitle);
                
                this.world.addSuccessLog(`✅ Completed processing "${bookTitle}" - ${citationTexts[bookTitle].length} citations extracted`);
            }
            
            this.world.addSuccessLog(`🎉 Successfully extracted citations from ${Object.keys(citationTexts).length} books`);

        } catch (error) {
            this.world.addErrorLog(`❌ Error extracting citation texts: ${error}`);
            throw error;
        }
        
        return citationTexts;
    }

    private async isIndividualBookSection(summaryText: string): Promise<boolean> {
        if (!summaryText) return false;
        
        const lowerText = summaryText.toLowerCase();
        
        // Individual book sections have numbered prefixes like "1.", "2.", etc.
        const hasNumberedPrefix = /^\d+\./.test(summaryText);
        
        // Exclude main sections that contain these phrases
        const mainSectionIndicators = [
            'books by',
            'award-winning',
            'recommended',
            'suggested',
            'matched',
            'results for',
            'query:',
            'watch me work',
            'interpreting context',
            'retrieving relevant'
        ];
        
        const isMainSection = mainSectionIndicators.some(indicator => 
            lowerText.includes(indicator)
        );
        
        return hasNumberedPrefix && !isMainSection;
    }

    private async getSummaryText(section: any): Promise<string> {
        try {
            const summaryElement = section.locator('summary span.truncate');
            const summaryCount = await summaryElement.count();
            
            if (summaryCount > 0) {
                const summaryText = await summaryElement.first().textContent();
                return summaryText ? summaryText.trim() : '';
            }
            return '';
        } catch (error) {
            return '';
        }
    }

    private async extractBookTitleFromSummary(bookSection: any): Promise<string> {
        try {
            // Extract from the summary text
            const summaryElement = bookSection.locator('summary span.truncate');
            const summaryCount = await summaryElement.count();
            
            if (summaryCount > 0) {
                const summaryText = await summaryElement.first().textContent();
                if (summaryText) {
                    // For book sections, extract title from "1. The Giver" format
                    const title = summaryText.replace(/^\d+\.\s*/, '').trim();
                    return title;
                }
            }
            
            return `Book_${Date.now()}`;
        } catch (error) {
            this.world.addErrorLog(`Error extracting book title from summary: ${error}`);
            return `Book_${Date.now()}`;
        }
    }

    private async expandIndividualBookSection(bookSection: any, bookTitle: string): Promise<void> {
        try {
            // Check if already expanded by looking for the open attribute
            const isExpanded = await bookSection.getAttribute('open') !== null;
            
            if (!isExpanded) {
                this.world.addInfoLog(`Expanding book section: "${bookTitle}"`);
                
                // Click on the summary to expand
                const summaryElement = bookSection.locator('summary').first();
                await summaryElement.scrollIntoViewIfNeeded();
                await this.page.waitForTimeout(1000);
                
                // Click with retry logic
                let clicked = false;
                for (let attempt = 0; attempt < 3; attempt++) {
                    try {
                        await summaryElement.click({ timeout: 5000 });
                        await this.page.waitForTimeout(2000);
                        
                        // Verify expansion by checking if details are visible
                        const bookDetails = bookSection.locator('p:has-text("Book Title:")');
                        await bookDetails.first().waitFor({ state: 'visible', timeout: 5000 });
                        clicked = true;
                        break;
                    } catch (clickError) {
                        this.world.addWarningLog(`Click attempt ${attempt + 1} failed for "${bookTitle}", retrying...`);
                        await this.page.waitForTimeout(1000);
                    }
                }
                
                if (!clicked) {
                    throw new Error(`Failed to expand book section after 3 attempts: "${bookTitle}"`);
                }
                
                this.world.addSuccessLog(`Book section expanded: "${bookTitle}"`);
            } else {
                this.world.addInfoLog(`Book section already expanded: "${bookTitle}"`);
            }
        } catch (error) {
            this.world.addErrorLog(`Error expanding book section "${bookTitle}": ${error}`);
            throw error;
        }
    }

    private async expandWhyMatchSection(bookSection: any, bookTitle: string): Promise<void> {
        try {
            // Find the "Why this book is the match" section within this book section
            const whyMatchSummary = bookSection.locator('summary:has-text("Why this book is the")');
            const whyMatchCount = await whyMatchSummary.count();
            
            if (whyMatchCount > 0) {
                const firstWhyMatch = whyMatchSummary.first();
                
                // Check if already expanded
                const parentDetails = firstWhyMatch.locator('xpath=./..');
                const isWhyExpanded = await parentDetails.getAttribute('open') !== null;
                
                if (!isWhyExpanded) {
                    this.world.addInfoLog(`Expanding "Why this book is the match" section for: "${bookTitle}"`);
                    
                    // Scroll and click
                    await firstWhyMatch.scrollIntoViewIfNeeded();
                    await this.page.waitForTimeout(1000);
                    
                    let clicked = false;
                    for (let attempt = 0; attempt < 3; attempt++) {
                        try {
                            await firstWhyMatch.click({ timeout: 5000 });
                            await this.page.waitForTimeout(2000);
                            
                            // Verify expansion by checking if reasons are visible
                            const reasons = bookSection.locator('ol.list-decimal li');
                            await reasons.first().waitFor({ state: 'visible', timeout: 5000 });
                            clicked = true;
                            break;
                        } catch (clickError) {
                            this.world.addWarningLog(`Why-match click attempt ${attempt + 1} failed for "${bookTitle}", retrying...`);
                            await this.page.waitForTimeout(1000);
                        }
                    }
                    
                    if (!clicked) {
                        throw new Error(`Failed to expand why-match section after 3 attempts: "${bookTitle}"`);
                    }
                    
                    this.world.addSuccessLog(`"Why this book is the match" section expanded for: "${bookTitle}"`);
                } else {
                    this.world.addInfoLog(`"Why this book is the match" section already expanded for: "${bookTitle}"`);
                }
            } else {
                this.world.addWarningLog(`"Why this book is the match" section not found for: "${bookTitle}"`);
            }
        } catch (error) {
            this.world.addErrorLog(`Error expanding why match section for "${bookTitle}": ${error}`);
            throw error;
        }
    }

    private async extractCitationsForBook(bookSection: any, bookTitle: string): Promise<string[]> {
        const citations: string[] = [];
        
        try {
            // Find all citation buttons within this book section
            const citationButtons = bookSection.locator('.BookCitation-module_citationButton__8U9MO');
            const citationCount = await citationButtons.count();
            
            this.world.addInfoLog(`Found ${citationCount} citation buttons for "${bookTitle}"`);

            if (citationCount === 0) {
                this.world.addWarningLog(`No citation buttons found for "${bookTitle}"`);
                return citations;
            }

            // Extract each citation
            for (let i = 0; i < citationCount; i++) {
                try {
                    this.world.addInfoLog(`Extracting citation ${i + 1}/${citationCount} for "${bookTitle}"`);
                    
                    const citationText = await this.extractSingleCitation(bookSection, i, bookTitle);
                    if (citationText && citationText !== 'Citation text not found' && !citationText.startsWith('Error:')) {
                        citations.push(citationText);
                        this.world.addInfoLog(`✅ Citation ${i + 1} extracted successfully (length: ${citationText.length})`);
                    } else {
                        this.world.addWarningLog(`⚠️ Citation ${i + 1} extraction failed or returned empty`);
                    }
                } catch (citationError) {
                    this.world.addErrorLog(`❌ Error extracting citation ${i + 1} for "${bookTitle}": ${citationError}`);
                }
            }

        } catch (error) {
            this.world.addErrorLog(`Error extracting citations for "${bookTitle}": ${error}`);
        }

        return citations;
    }

    private async extractSingleCitation(bookSection: any, index: number, bookTitle: string): Promise<string> {
        try {
            // Get the specific citation button
            const citationButtons = bookSection.locator('.BookCitation-module_citationButton__8U9MO');
            const specificButton = citationButtons.nth(index);
            
            // Get citation type for logging
            const citationTypeElement = specificButton.locator('span.BookCitation-module_citationText__aH2j-');
            const citationType = await citationTypeElement.textContent() || 'unknown';
            
            this.world.addInfoLog(`Processing ${citationType} citation ${index + 1} for "${bookTitle}"`);

            // Scroll to the button
            await specificButton.scrollIntoViewIfNeeded();
            await this.page.waitForTimeout(1000);

            // Check current state by looking for arrow direction
            const arrowIcon = specificButton.locator('i[class*="pi-angle"]');
            const arrowCount = await arrowIcon.count();
            let isCurrentlyOpen = false;
            
            if (arrowCount > 0) {
                const currentArrowClass = await arrowIcon.getAttribute('class');
                isCurrentlyOpen = currentArrowClass?.includes('pi-angle-up') || false;
            }

            // If already open, close it first to ensure clean state
            if (isCurrentlyOpen) {
                this.world.addInfoLog(`Citation ${index + 1} is already open, closing first...`);
                await specificButton.click();
                await this.page.waitForTimeout(1500);
            }

            // Click to open the citation
            this.world.addInfoLog(`Clicking to OPEN ${citationType} citation ${index + 1}`);
            await specificButton.click();
            await this.page.waitForTimeout(2000);

            // Wait for citation text to appear - look for the expanded wrapper
            const citationTextElement = this.page.locator('[class*="BookCitation-module_paragraph"] span[id*="quotes-citations"]').first();
            await citationTextElement.waitFor({ state: 'visible', timeout: 10000 });

            // Extract the citation text
            const citationText = await citationTextElement.innerText();
            const extractedText = citationText ? citationText.trim() : 'Citation text not found';

            this.world.addInfoLog(`Extracted citation text (first 100 chars): ${extractedText.substring(0, 100)}...`);

            // Close the citation by clicking the same button again
            this.world.addInfoLog(`Clicking to CLOSE ${citationType} citation ${index + 1}`);
            await specificButton.click();
            await this.page.waitForTimeout(1500);

            // Verify it's closed
            try {
                await citationTextElement.waitFor({ state: 'hidden', timeout: 3000 });
                this.world.addSuccessLog(`✅ ${citationType} citation ${index + 1} closed successfully`);
            } catch (error) {
                this.world.addWarningLog(`⚠️ ${citationType} citation ${index + 1} might not have closed properly`);
                // Try escape key as fallback
                await this.page.keyboard.press('Escape');
                await this.page.waitForTimeout(1000);
            }

            return extractedText;

        } catch (error) {
            this.world.addErrorLog(`Error extracting citation ${index + 1} for "${bookTitle}": ${error}`);
            return `Error: ${error}`;
        }
    }

    private async collapseIndividualBookSection(bookSection: any, bookTitle: string): Promise<void> {
        try {
            const isExpanded = await bookSection.getAttribute('open') !== null;
            
            if (isExpanded) {
                this.world.addInfoLog(`Collapsing book section: "${bookTitle}"`);
                
                const summaryElement = bookSection.locator('summary').first();
                await summaryElement.scrollIntoViewIfNeeded();
                await this.page.waitForTimeout(500);
                
                await summaryElement.click();
                await this.page.waitForTimeout(1000);
                
                this.world.addSuccessLog(`Book section collapsed: "${bookTitle}"`);
            } else {
                this.world.addInfoLog(`Book section already collapsed: "${bookTitle}"`);
            }
        } catch (error) {
            this.world.addWarningLog(`Error collapsing book section "${bookTitle}": ${error}`);
            // Continue anyway - don't fail the whole process
        }
    }

    async validateReasonCitationMatches(
        books: any[], 
        citationTexts: { [bookTitle: string]: string[] }
    ): Promise<{ [bookTitle: string]: CitationValidationResult[] }> {
        this.world.addHeaderLog('🔍 VALIDATING REASON-CITATION MATCHES (80% THRESHOLD)');
        
        const validationResults: { [bookTitle: string]: CitationValidationResult[] } = {};
        let totalValidations = 0;
        let passedValidations = 0;

        for (const book of books) {
            const bookCitations = citationTexts[book.bookTitle] || [];
            validationResults[book.bookTitle] = [];

            this.world.addInfoLog(`📖 Validating ${book.reasons.length} reasons for: "${book.bookTitle}"`);

            for (let i = 0; i < book.reasons.length; i++) {
                const reason = book.reasons[i];
                const citation = i < bookCitations.length ? bookCitations[i] : 'No citation found';

                this.world.addInfoLog(`   Reason ${i + 1}: Checking match...`);

                const validationResult =  await CitationValidator.validateCitationMatch(
                    reason, citation, i + 1, book.bookTitle
                );

                validationResults[book.bookTitle].push(validationResult);
                totalValidations++;

                this.logCitationValidationResult(validationResult);

                if (validationResult.isValid) {
                    passedValidations++;
                }
            }
        }

        this.logCitationValidationSummary(totalValidations, passedValidations);
        return validationResults;
    }

    private logCitationValidationResult(result: CitationValidationResult): void {
        const percentage = result.matchPercentage;
        const bookInfo = `"${result.bookTitle}" - Reason ${result.reasonNumber}`;

        if (result.isValid) {
            this.world.addSuccessLog(`   ✅ ${bookInfo}: ${percentage}% match - PASS`);
        } else {
            this.world.addErrorLog(`   ❌ ${bookInfo}: ${percentage}% match - FAIL`);
            result.errors.forEach(error => {
                this.world.addErrorLog(`      ⚠️  ${error}`);
            });
        }
    }

    private logCitationValidationSummary(total: number, passed: number): void {
        const passRate = total > 0 ? (passed / total) * 100 : 0;
        
        this.world.addMetricLog(`📊 CITATION VALIDATION SUMMARY: ${passed}/${total} passed (${passRate.toFixed(1)}%)`);

        if (passRate >= 80) {
            this.world.addSuccessLog('🎉 REASON-CITATION VALIDATION: OVERALL PASSED');
        } else {
            this.world.addErrorLog('💥 REASON-CITATION VALIDATION: OVERALL FAILED');
        }
    }

    private generateCitationValidationReport(validationResults: { [bookTitle: string]: CitationValidationResult[] }): string {
        this.world.addHeaderLog('📋 GENERATING CITATION VALIDATION REPORT');
        
        let report = 'CITATION VALIDATION DETAILED REPORT\n';
        report += '='.repeat(80) + '\n\n';
        
        let totalReasons = 0;
        let passedReasons = 0;
        
        Object.entries(validationResults).forEach(([bookTitle, results]) => {
            report += `BOOK: ${bookTitle}\n`;
            report += '-'.repeat(60) + '\n';
            
            results.forEach(result => {
                totalReasons++;
                const status = result.isValid ? 'PASS' : 'FAIL';
                const icon = result.isValid ? '✅' : '❌';
                
                report += `${icon} Reason ${result.reasonNumber}: ${status} (${result.matchPercentage}%)\n`;
                
                if (!result.isValid) {
                    report += `   📝 Reason: ${result.reasonText.substring(0, 100)}...\n`;
                    report += `   📚 Citation: ${result.citationText.substring(0, 100)}...\n`;
                    result.errors.forEach(error => report += `   ⚠️  ${error}\n`);
                }
                report += '\n';
                
                if (result.isValid) passedReasons++;
            });
            report += '\n';
        });
        
        const passRate = totalReasons > 0 ? (passedReasons / totalReasons) * 100 : 0;
        report += `SUMMARY: ${passedReasons}/${totalReasons} reasons passed (${passRate.toFixed(1)}%)\n`;
        report += `OVERALL STATUS: ${passRate >= 80 ? 'PASS' : 'FAIL'}\n`;
        
        this.world.addInfoLog(`Report generated: ${passedReasons}/${totalReasons} reasons passed`);
        return report;
    }

    async generateDetailedCitationHtmlReport(validationResults: { [bookTitle: string]: CitationValidationResult[] }): Promise<string> {
        this.world.addInfoLog('Generating HTML citation validation report');
        
        let htmlReport = `
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
                .header { background: #6932E2; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
                .book-section { background: white; margin: 15px 0; padding: 15px; border-radius: 5px; border-left: 5px solid #6932E2; }
                .reason-pass { color: #28a745; margin: 8px 0; padding: 5px; background: #f8fff9; border-left: 3px solid #28a745; }
                .reason-fail { color: #dc3545; margin: 8px 0; padding: 5px; background: #fff5f5; border-left: 3px solid #dc3545; }
                .error { color: #fd7e14; margin-left: 20px; font-size: 0.9em; padding: 2px 0; }
                .summary { background: #e8f4fd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #17a2b8; }
                .metric { font-size: 1.2em; font-weight: bold; margin: 10px 0; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>📊 Citation Validation Report</h1>
                <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
        `;

        let totalReasons = 0;
        let passedReasons = 0;

        Object.entries(validationResults).forEach(([bookTitle, results]) => {
            htmlReport += `<div class="book-section"><h2>📖 ${bookTitle}</h2>`;
            
            results.forEach((result: CitationValidationResult) => {
                totalReasons++;
                const statusClass = result.isValid ? 'reason-pass' : 'reason-fail';
                const statusIcon = result.isValid ? '✅' : '❌';
                
                htmlReport += `
                    <div class="${statusClass}">
                        <strong>${statusIcon} Reason ${result.reasonNumber}: ${result.matchPercentage}% match</strong>
                `;
                
                if (!result.isValid) {
                    result.errors.forEach(error => {
                        htmlReport += `<div class="error">⚠️ ${error}</div>`;
                    });
                }
                
                htmlReport += `</div>`;
                
                if (result.isValid) passedReasons++;
            });
            
            htmlReport += `</div>`;
        });

        const passRate = totalReasons > 0 ? (passedReasons / totalReasons) * 100 : 0;
        const overallStatus = passRate >= 80 ? 'PASS' : 'FAIL';
        const statusColor = passRate >= 80 ? '#28a745' : '#dc3545';

        htmlReport += `
            <div class="summary" style="border-left: 5px solid ${statusColor};">
                <h2>📈 Validation Summary</h2>
                <div class="metric">Total Reasons Validated: ${totalReasons}</div>
                <div class="metric" style="color: #28a745;">Passed: ${passedReasons}</div>
                <div class="metric" style="color: #dc3545;">Failed: ${totalReasons - passedReasons}</div>
                <div class="metric" style="color: ${statusColor}; font-size: 1.4em;">Pass Rate: ${passRate.toFixed(1)}%</div>
                <div class="metric" style="color: ${statusColor}; font-size: 1.4em;">Overall Status: ${overallStatus}</div>
            </div>
        </body>
        </html>
        `;

        this.world.addSuccessLog(`Generated HTML report for ${totalReasons} reasons`);
        return htmlReport;
    }
    async validateResponseRelevanceWithAI(query: string, responseText: string, books: BookData[]): Promise<AIAnalysisResult> {
    this.world.addHeaderLog('🤖 ANALYZING RESPONSE RELEVANCE WITH GEMINI AI - PER BOOK ANALYSIS');
    
    try {
        this.world.addInfoLog('Starting Gemini AI analysis with retry logic...');
        
        const analysis = await this.geminiService.analyzeResponseRelevance(query, responseText, books);
        
        // Check if this is a fallback result due to API errors
        const isFallbackResult = analysis.summaryFeedback.some(feedback => 
            feedback.includes('fallback') || feedback.includes('unavailable') || feedback.includes('overload')
        );
        
        if (isFallbackResult) {
            this.world.addWarningLog(`⚠️ GEMINI VALIDATION: Using fallback analysis due to API issues`);
            this.world.addInfoLog(`Overall Score: ${analysis.overallScore}% (Fallback)`);
        } else {
            this.world.addMetricLog(`Gemini AI Overall Relevance Score: ${analysis.overallScore}%`);
            this.world.addMetricLog(`Analyzed ${analysis.bookAnalyses.length} books individually`);
            
            if (analysis.overallScore >= 80) {
                this.world.addSuccessLog(`✅ GEMINI VALIDATION: Response is relevant to query (${analysis.overallScore}%)`);
            } else {
                this.world.addErrorLog(`❌ GEMINI VALIDATION: Response relevance below threshold (${analysis.overallScore}%)`);
            }
        }
        
        // Log individual book analyses
        analysis.bookAnalyses.forEach((bookAnalysis: BookAnalysisResult) => {
            this.world.addHeaderLog(`📖 ANALYSIS FOR: "${bookAnalysis.bookTitle}" - Score: ${bookAnalysis.overallScore}%`);
            
            bookAnalysis.sectionScores.forEach((section: {section: string; score: number; feedback: string}) => {
                const status = section.score >= 80 ? '✅' : '❌';
                this.world.addInfoLog(`${status} ${section.section}: ${section.score}% - ${section.feedback}`);
            });
            
            if (bookAnalysis.improvementSuggestions.length > 0) {
                this.world.addInfoLog('💡 Book-specific improvements:');
                bookAnalysis.improvementSuggestions.forEach((suggestion: string) => {
                    this.world.addInfoLog(`   - ${suggestion}`);
                });
            }
        });
        
        // Log summary
        if (analysis.summaryFeedback.length > 0) {
            this.world.addInfoLog('📊 SUMMARY FEEDBACK:');
            analysis.summaryFeedback.forEach((feedback: string) => {
                this.world.addInfoLog(`   • ${feedback}`);
            });
        }
        
        return analysis;
        
    } catch (error) {
        this.world.addErrorLog(`Gemini AI Analysis failed completely: ${error}`);
        
        // Return a comprehensive fallback result
        return {
            query,
            overallScore: 0,
            bookAnalyses: books.map(book => ({
                bookTitle: book.bookTitle,
                overallScore: 0,
                sectionScores: [
                    {section: "Author Information", score: 0, feedback: "Analysis failed - service unavailable"},
                    {section: "Publishing Date", score: 0, feedback: "Analysis failed - service unavailable"},
                    {section: "Why Match Explanations", score: 0, feedback: "Analysis failed - service unavailable"},
                    {section: "Relevance Scores", score: 0, feedback: "Analysis failed - service unavailable"}
                ],
                detailedFeedback: ['AI analysis service is currently overloaded and unavailable'],
                improvementSuggestions: ['Try again later when the service is less busy']
            })),
            summaryFeedback: [
                'Gemini AI service is currently overloaded',
                'All analysis attempts failed despite retry logic',
                'Consider running this test during off-peak hours'
            ],
            improvementSuggestions: [
                'Check Google AI status page for service updates',
                'Retry the test during non-peak hours',
                'Consider using a different AI service if available'
            ]
        };
    }
}
}