import * as XLSX from 'xlsx';
import { BookData } from './bookExtractor';

export class ExcelExporter {
    static exportToExcel(books: BookData[], filePath: string): void {
        const worksheet = XLSX.utils.json_to_sheet(books);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Book Matches');
        XLSX.writeFile(workbook, filePath);
    }
    
    static exportToCSV(books: BookData[], filePath: string): void {
        const worksheet = XLSX.utils.json_to_sheet(books);
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        require('fs').writeFileSync(filePath, csv);
    }
}