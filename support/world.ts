import { setWorldConstructor, World } from '@cucumber/cucumber';
import { Browser, Page, BrowserContext } from 'playwright';
import { HomePage } from '../tests/pages/HomePage';
import { BookGeniePage } from '../tests/pages/BookGeniePage'
import { Expect } from 'playwright/test';
import { BookData } from '../tests/utils/bookExtractor'; // Add this import
import { CardContentData } from '../tests/utils/CardContentExtractor';


export class CustomWorld extends World {
    browser!: Browser;
    context!: BrowserContext;
    page!: Page;
    homePage!: HomePage;
    bookGeniePage!: BookGeniePage;
    logs: string[] = [];
    expect!: Expect;   
    extractedCardContent?: CardContentData;
    expectedCardContent?: CardContentData;
    allCardContents?: CardContentData[];
    cardValidationResult?: any;
    
    
    // Add these properties
    extractedBooks?: BookData[];
    citationValidationResults?: { [bookTitle: string]: any[] };
    aiValidationResult?: any; // Add this for AI validation
    databaseValidation?: {
        validCount: number;
        invalidCount: number;
        validBooks: string[];
        invalidBooks: string[];
        databaseInfo: { path: string; bookCount: number };
    };
    
    
    
  addLog(message: string) {
    const timestamp = new Date().toLocaleTimeString();
    const logMessage = `[${timestamp}] ${message}`;
    this.logs.push(logMessage);
    console.log(logMessage);
  }

  // Helper method to add formatted logs
  addSuccessLog(message: string) {
    this.addLog(`✅ ${message}`);
  }

   addWarningLog(message: string) {
    this.addLog(`⚠ ${message}`);
  }

  addErrorLog(message: string) {
    this.addLog(`❌ ${message}`);
  }

  addInfoLog(message: string) {
    this.addLog(`ℹ️ ${message}`);
  }

  addHeaderLog(message: string) {
    this.addLog(`📋 ${message}`);
  }

  addMetricLog(message: string) {
    this.addLog(`📊 ${message}`);
  }

  addBookLog(message: string) {
    this.addLog(`📚 ${message}`);
  }
}

setWorldConstructor(CustomWorld);