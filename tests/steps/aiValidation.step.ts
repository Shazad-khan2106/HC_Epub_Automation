import { Then } from "@cucumber/cucumber";
import { CustomWorld } from "../../support/world";
import { locators } from '../locator/locators';

// Update the step implementation to use the correct types
Then('I validate BookGenie response relevance with AI for query {string}', 
async function (this: CustomWorld, query: string) {
    this.addHeaderLog('🤖 VALIDATING RESPONSE RELEVANCE WITH GEMINI AI - PER BOOK ANALYSIS');
    
    if (!this.bookGeniePage || !this.extractedBooks) {
        this.addErrorLog('❌ BookGenie page not initialized or no books extracted');
        return;
    }

    try {
        this.addInfoLog('Starting Gemini AI per-book relevance validation...');
        
        // Get the latest response text for analysis
        const responseLocator = this.page.locator(locators.chatResponse).last();
        await responseLocator.waitFor({ state: 'visible', timeout: 30000 });
        const responseText = await responseLocator.textContent();
        
        if (!responseText) {
            this.addErrorLog('❌ No response text found for AI validation');
            return;
        }

        // Perform AI validation with Gemini - now passing books data
        const validationResult = await this.bookGeniePage.validateResponseRelevanceWithAI(
            query, 
            responseText, 
            this.extractedBooks
        );
        
        // Store results for reporting
        this.aiValidationResult = validationResult;
        
        // Generate and attach reports
        const textReport = generatePerBookAIValidationReport(validationResult);
        await this.attach(textReport, 'text/plain');
        
        const htmlReport = generatePerBookAIValidationHtmlReport(validationResult);
        await this.attach(htmlReport, 'text/html');
        
        // Soft assertion - log but don't throw
        if (validationResult.overallScore >= 80) {
            this.addSuccessLog(`✅ GEMINI AI VALIDATION PASSED: ${validationResult.overallScore}% relevance score`);
        } else {
            this.addErrorLog(`❌ GEMINI AI VALIDATION FAILED: ${validationResult.overallScore}% relevance score (required: 80%)`);
            this.addInfoLog('Continuing execution due to soft assertion...');
        }
        
    } catch (error) {
        this.addErrorLog(`💥 Gemini AI Validation error: ${error}`);
        this.addInfoLog('Continuing execution despite AI validation error...');
    }
});
// Helper functions (outside the step definition)
function generatePerBookAIValidationReport(result: any): string {
    let report = `PER-BOOK AI VALIDATION REPORT - Query: "${result.query}"\n`;
    report += '='.repeat(80) + '\n\n';
    
    report += `OVERALL RELEVANCE SCORE: ${result.overallScore}%\n`;
    report += `STATUS: ${result.overallScore >= 80 ? 'PASS' : 'FAIL'}\n`;
    report += `BOOKS ANALYZED: ${result.bookAnalyses.length}\n\n`;
    
    // Individual book analyses
    result.bookAnalyses.forEach((bookAnalysis: any, index: number) => {
        report += `BOOK ${index + 1}: "${bookAnalysis.bookTitle}"\n`;
        report += '-'.repeat(60) + '\n';
        report += `Overall Score: ${bookAnalysis.overallScore}%\n\n`;
        
        report += 'SECTION SCORES:\n';
        bookAnalysis.sectionScores.forEach((section: any) => {
            report += `  ${section.section}: ${section.score}% - ${section.feedback}\n`;
        });
        
        report += '\nDETAILED FEEDBACK:\n';
        bookAnalysis.detailedFeedback.forEach((feedback: string) => {
            report += `  • ${feedback}\n`;
        });
        
        if (bookAnalysis.improvementSuggestions.length > 0) {
            report += '\nIMPROVEMENT SUGGESTIONS:\n';
            bookAnalysis.improvementSuggestions.forEach((suggestion: string) => {
                report += `  • ${suggestion}\n`;
            });
        }
        report += '\n' + '='.repeat(80) + '\n\n';
    });
    
    // Summary
    report += 'SUMMARY FEEDBACK:\n';
    report += '-'.repeat(40) + '\n';
    result.summaryFeedback.forEach((feedback: string) => {
        report += `• ${feedback}\n`;
    });
    
    if (result.improvementSuggestions.length > 0) {
        report += '\nOVERALL IMPROVEMENT SUGGESTIONS:\n';
        report += '-'.repeat(40) + '\n';
        result.improvementSuggestions.forEach((suggestion: string) => {
            report += `• ${suggestion}\n`;
        });
    }
    
    return report;
}

function generatePerBookAIValidationHtmlReport(result: any): string {
    const statusColor = result.overallScore >= 80 ? '#28a745' : '#dc3545';
    const statusText = result.overallScore >= 80 ? 'PASS' : 'FAIL';
    
    let html = `
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .header { background: #6932E2; color: white; padding: 20px; border-radius: 10px; margin-bottom: 20px; }
            .score-card { background: white; padding: 20px; border-radius: 5px; margin: 15px 0; border-left: 5px solid ${statusColor}; }
            .book-analysis { background: white; margin: 20px 0; padding: 15px; border-radius: 5px; border-left: 5px solid #17a2b8; }
            .section { background: #f8f9fa; margin: 10px 0; padding: 10px; border-radius: 3px; }
            .pass { color: #28a745; }
            .fail { color: #dc3545; }
            .suggestion { background: #fff3cd; padding: 8px; margin: 5px 0; border-radius: 3px; }
            .book-header { background: #e8f4fd; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>🤖 PER-BOOK AI Response Relevance Validation</h1>
            <p><strong>Query:</strong> "${result.query}"</p>
        </div>
        
        <div class="score-card">
            <h2>Overall Relevance Score: <span style="color: ${statusColor}">${result.overallScore}%</span></h2>
            <h3 style="color: ${statusColor}">Status: ${statusText}</h3>
            <p>Books Analyzed: ${result.bookAnalyses.length}</p>
        </div>
        
        <h2>Individual Book Analyses</h2>
    `;
    
    result.bookAnalyses.forEach((bookAnalysis: any, index: number) => {
        const bookStatusColor = bookAnalysis.overallScore >= 80 ? '#28a745' : '#dc3545';
        html += `
        <div class="book-analysis">
            <div class="book-header">
                <h3 style="color: ${bookStatusColor}">📖 Book ${index + 1}: "${bookAnalysis.bookTitle}" - ${bookAnalysis.overallScore}%</h3>
            </div>
        `;
        
        bookAnalysis.sectionScores.forEach((section: any) => {
            const sectionStatus = section.score >= 80 ? 'pass' : 'fail';
            html += `
            <div class="section">
                <h4 class="${sectionStatus}">${section.section}: ${section.score}%</h4>
                <p>${section.feedback}</p>
            </div>
            `;
        });
        
        if (bookAnalysis.improvementSuggestions.length > 0) {
            html += `<h4>Improvement Suggestions:</h4>`;
            bookAnalysis.improvementSuggestions.forEach((suggestion: string) => {
                html += `<div class="suggestion">💡 ${suggestion}</div>`;
            });
        }
        
        html += `</div>`;
    });
    
    html += `<h2>Summary Feedback</h2>`;
    result.summaryFeedback.forEach((feedback: string) => {
        html += `<p>• ${feedback}</p>`;
    });
    
    if (result.improvementSuggestions.length > 0) {
        html += `<h2>Overall Improvement Suggestions</h2>`;
        result.improvementSuggestions.forEach((suggestion: string) => {
            html += `<div class="suggestion">💡 ${suggestion}</div>`;
        });
    }
    
    html += `</body></html>`;
    return html;
}
