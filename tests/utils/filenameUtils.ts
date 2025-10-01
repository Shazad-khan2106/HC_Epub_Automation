export class FilenameUtils {
    static sanitizeForFilename(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')  // Replace non-alphanumeric with underscores
            .replace(/_+/g, '_')         // Replace multiple underscores with single
            .replace(/^_+|_+$/g, '')     // Remove leading/trailing underscores
            .substring(0, 50);           // Limit length to 50 characters
    }

    static queryToFilename(query: string): string {
        const sanitized = this.sanitizeForFilename(query);
        return sanitized || 'book_query_results';
    }
}