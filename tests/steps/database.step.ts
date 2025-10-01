import { Given, Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../support/world";
import { DatabaseReader } from "../utils/databaseReader";

Then('I verify database connectivity', async function (this: CustomWorld) {
    this.addInfoLog('Checking database connectivity...');
    
    try {
        const databaseInfo = DatabaseReader.getDatabaseInfo();
        this.addSuccessLog(`✅ Database connected successfully`);
        this.addInfoLog(`Database path: ${databaseInfo.path}`);
        this.addInfoLog(`Total books: ${databaseInfo.bookCount}`);
    } catch (error) {
        this.addErrorLog(`❌ Database connection failed: ${error}`);
        throw error;
    }
});

Then('database should contain {int} books', async function (this: CustomWorld, minBookCount: number) {
    const bookTitles = DatabaseReader.getAllBookTitles();
    const actualCount = bookTitles.length;
    
    this.addMetricLog(`Database contains ${actualCount} books`);
    
    if (actualCount < minBookCount) {
        throw new Error(`Database has only ${actualCount} books, but expected at least ${minBookCount}`);
    }
    
    this.addSuccessLog(`✅ Database book count requirement met: ${actualCount} >= ${minBookCount}`);
});

Then('I display database statistics', async function (this: CustomWorld) {
    const bookTitles = DatabaseReader.getAllBookTitles();
    
    this.addHeaderLog('DATABASE STATISTICS');
    this.addMetricLog(`Total books: ${bookTitles.length}`);
    this.addInfoLog('Sample of books in database:');
    
    // Show first 10 books as sample
    bookTitles.slice(0, 10).forEach((title, index) => {
        this.addInfoLog(`  ${index + 1}. ${title}`);
    });
    
    if (bookTitles.length > 10) {
        this.addInfoLog(`  ... and ${bookTitles.length - 10} more books`);
    }
});