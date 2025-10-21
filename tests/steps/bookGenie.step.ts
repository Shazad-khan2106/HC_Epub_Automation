import { Given, When, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../support/world";
import { BookGeniePage } from "../pages/BookGeniePage";
import { BookData } from "../utils/bookExtractor";
import { ExcelReader } from "../utils/excelReader";
import { FilenameUtils } from "../utils/filenameUtils";

const { testData } = require('../test_data/properties');

When('I click on the mode selection dropdown', async function (this: CustomWorld) {
    this.bookGeniePage = new BookGeniePage(this);
    await this.bookGeniePage.clickOnModeSelectionDropdown();
});

Then('I can see the {string} mode', async function (this: CustomWorld, mode: string) {
    await this.bookGeniePage.checkModeVisiblity(mode);
});

Then('I select the {string} mode', async function (this: CustomWorld, mode: string) {
    await this.bookGeniePage.selectMode(mode);
});

Then('I type {string} on chat input element', async function (this: CustomWorld, query: string) {
    this.addInfoLog(`Typing query: "${query}"`);
    await this.bookGeniePage.typeQuery(query);
});

Then('I wait for AI to complete thinking', async function (this: CustomWorld) {
    this.addInfoLog('Waiting for AI to complete thinking...');
    await this.bookGeniePage.waitForAIResponse();
});

Then('I validate the response is visible for {string}', async function (this: CustomWorld, query: string) {
    this.addInfoLog(`Validating response for query: "${query}"`);
    await this.bookGeniePage.validateResponse(query);
});

When('I extract book data from BookGenie response', async function (this: CustomWorld) {
    this.addInfoLog('Extracting book data from response...');
    this.extractedBooks = await this.bookGeniePage.extractBooksFromBookGenieResponse();
    this.addSuccessLog(`Extracted ${this.extractedBooks.length} books from response`);
});

Then('I save BookGenie book data to Excel file for query {string}', async function (this: CustomWorld, query: string) {
    if (!this.extractedBooks || this.extractedBooks.length === 0) {
        throw new Error('No book data extracted from BookGenie response.');
    }
    
    const fileName = FilenameUtils.queryToFilename(query) + '.xlsx';
    const filePath = `test_results/${fileName}`;
    
    this.addInfoLog(`Saving ${this.extractedBooks.length} books to Excel file: ${filePath}`);
    await this.bookGeniePage.saveBooksToExcel(this.extractedBooks, filePath);
});

Then('I validate each book individually against Excel file for query {string}', async function (this: CustomWorld, query: string) {
    if (!this.extractedBooks) {
        throw new Error('No book data extracted. Please run "I extract book data from BookGenie response" first.');
    }

    const fileName = FilenameUtils.queryToFilename(query) + '.xlsx';
    const excelFilePath = `test_results/${fileName}`;
    
    const expectedBooks = ExcelReader.readBooksFromExcel(excelFilePath);
    if (expectedBooks.length === 0) {
        throw new Error(`No books found in Excel file: ${excelFilePath}`);
    }

    this.addHeaderLog(`STARTING INDIVIDUAL BOOK VALIDATION (${expectedBooks.length} books) for query: "${query}"`);
    
    let allBooksValid = true;
    const validationResults: {book: string; passed: boolean}[] = [];

    for (let i = 0; i < expectedBooks.length; i++) {
        const expectedBook = expectedBooks[i];
        const extractedBook = this.extractedBooks[i];
        
        if (!extractedBook) {
            this.addErrorLog(`Book ${i + 1}: "${expectedBook.bookTitle}" - NOT FOUND IN RESPONSE`);
            validationResults.push({ book: expectedBook.bookTitle, passed: false });
            allBooksValid = false;
            continue;
        }

        const isValid = await this.bookGeniePage.validateIndividualBook(extractedBook, expectedBook, i + 1);
        validationResults.push({ book: expectedBook.bookTitle, passed: isValid });
        
        if (!isValid) {
            allBooksValid = false;
        }
    }

    // Summary
    this.addMetricLog(`VALIDATION SUMMARY: ${validationResults.filter(r => r.passed).length}/${validationResults.length} books passed`);
    
    if (!allBooksValid) {
        const failedBooks = validationResults.filter(r => !r.passed).map(r => r.book);
        this.addErrorLog(`VALIDATION FAILED for: ${failedBooks.join(', ')}`);
        throw new Error(`Book validation failed for: ${failedBooks.join(', ')}`);
    }
    
    this.addSuccessLog('ALL BOOKS VALIDATED SUCCESSFULLY!');
});

Then('I validate extracted books individually against database', async function (this: CustomWorld) {
    if (!this.extractedBooks || this.extractedBooks.length === 0) {
        throw new Error('No book data extracted. Please run "I extract book data from BookGenie response" first.');
    }

    this.addHeaderLog('🔍 VALIDATING EXTRACTED BOOKS INDIVIDUALLY AGAINST DATABASE');
    
    let allBooksValid = true;
    const validationResults: { book: string; exists: boolean; matchedTitle?: string }[] = [];

    for (let i = 0; i < this.extractedBooks.length; i++) {
        const book = this.extractedBooks[i];
        this.addInfoLog(`Checking book ${i + 1}/${this.extractedBooks.length}: "${book.bookTitle}"`);
        
        const result = await this.bookGeniePage.checkIndividualBookInDatabase(book.bookTitle);
        validationResults.push({
            book: book.bookTitle,
            exists: result.exists,
            matchedTitle: result.matchedTitle
        });

        if (!result.exists) {
            allBooksValid = false;
        }
    }

    // Summary
    const validCount = validationResults.filter(r => r.exists).length;
    const totalCount = validationResults.length;
    
    this.addMetricLog(`INDIVIDUAL DATABASE VALIDATION SUMMARY: ${validCount}/${totalCount} books found in database`);
    
    if (allBooksValid) {
        this.addSuccessLog('🎉 ALL BOOKS VALIDATED SUCCESSFULLY AGAINST DATABASE!');
    } else {
        const missingBooks = validationResults.filter(r => !r.exists).map(r => r.book);
        this.addErrorLog(`❌ Books not found in database: ${missingBooks.join(', ')}`);
        throw new Error(`${missingBooks.length} books not found in database`);
    }
});

// Add to World interface
declare module "../../support/world" {
    interface CustomWorld {
        databaseValidation?: {
            validCount: number;
            invalidCount: number;
            validBooks: string[];
            invalidBooks: string[];
            databaseInfo: { path: string; bookCount: number };
        };
    }
}
