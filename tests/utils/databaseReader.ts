import * as XLSX from 'xlsx';
import * as path from 'path';

export class DatabaseReader {
    private static databasePath = path.join(__dirname, '../test_data/database.xlsx');

    static getAllBookTitles(): string[] {
        try {
            this.validateDatabaseFile();
            
            const workbook = XLSX.readFile(this.databasePath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // Convert sheet to JSON and extract book titles
            const data: any[] = XLSX.utils.sheet_to_json(worksheet);
            const bookTitles = data.map(row => row['Book Title']?.toString().trim())
                                  .filter(title => title && title.length > 0);
            
            console.log(`📚 Loaded ${bookTitles.length} book titles from database`);
            return bookTitles;
        } catch (error) {
            console.error('❌ Error reading database file:', error);
            return [];
        }
    }

    static validateBookTitle(bookTitle: string): boolean {
        const allTitles = this.getAllBookTitles();
        const normalizedInput = bookTitle.trim().toLowerCase();
        
        return allTitles.some(dbTitle => 
            dbTitle.toLowerCase().includes(normalizedInput) || 
            normalizedInput.includes(dbTitle.toLowerCase())
        );
    }

    static findMatchingBooks(extractedTitles: string[]): { found: string[]; missing: string[] } {
        const dbTitles = this.getAllBookTitles();
        const found: string[] = [];
        const missing: string[] = [];

        extractedTitles.forEach(extractedTitle => {
            const normalizedExtracted = extractedTitle.trim().toLowerCase();
            const match = dbTitles.find(dbTitle => 
                dbTitle.toLowerCase().includes(normalizedExtracted) ||
                normalizedExtracted.includes(dbTitle.toLowerCase())
            );
            
            if (match) {
                found.push(`${extractedTitle} → ${match}`);
            } else {
                missing.push(extractedTitle);
            }
        });

        return { found, missing };
    }

    private static validateDatabaseFile(): void {
        const fs = require('fs');
        if (!fs.existsSync(this.databasePath)) {
            throw new Error(`Database file not found at: ${this.databasePath}`);
        }
    }

    static getDatabaseInfo(): { path: string; bookCount: number } {
        const bookTitles = this.getAllBookTitles();
        return {
            path: this.databasePath,
            bookCount: bookTitles.length
        };
    }
}