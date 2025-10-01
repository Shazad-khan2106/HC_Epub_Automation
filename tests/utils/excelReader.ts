import * as XLSX from 'xlsx';
import { BookData } from './bookExtractor';
import * as path from 'path';
import * as fs from 'fs';

export class ExcelReader {
    static readBooksFromExcel(filePath: string): BookData[] {
        try {
            // Handle different path formats
            let fullPath = filePath;
            if (!filePath.includes('test_results') && !filePath.startsWith('./') && !filePath.startsWith('../')) {
                fullPath = path.join('test_results', filePath);
            }
            
            // Check if file exists
            if (!fs.existsSync(fullPath)) {
                console.error(`Excel file not found: ${fullPath}`);
                return [];
            }

            const workbook = XLSX.readFile(fullPath);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            const books: BookData[] = XLSX.utils.sheet_to_json(worksheet);
            console.log(`Successfully read ${books.length} books from Excel: ${fullPath}`);
            return books;
        } catch (error) {
            console.error('Error reading Excel file:', error);
            return [];
        }
    }
}