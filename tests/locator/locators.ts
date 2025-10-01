export const locators = {
    welcomeMessage : '',
    modeSelectionDropdown: '[data-pc-name="dropdown"]',
    bookGenieMode: '[aria-label="BookGenieQA"]',
    chatInput: '[placeholder="How can I help?"]',
    chatResponse: '[class="max-w-[90%] text-[1rem] flex flex-col gap-y-2 w-[90%]  text-[#344054] rounded-r-[8px] rounded-bl-[8px]"]',
    // citation locators 
    mainBookSection: 'details.accordion:has(summary:has-text("Books by Award-Winning Authors"))',
    individualBookSection: 'details.accordion:has(summary:has-text("1.")), details.accordion:has(summary:has-text("2.")), details.accordion:has(summary:has-text("3.")), details.accordion:has(summary:has-text("4.")), details.accordion:has(summary:has-text("5.")), details.accordion:has(summary:has-text("6.")), details.accordion:has(summary:has-text("7.")), details.accordion:has(summary:has-text("8.")), details.accordion:has(summary:has-text("9.")), details.accordion:has(summary:has-text("10."))',
    bookTitle: 'p:has-text("Book Title:") + p',
    whyMatchSection: 'summary:has-text("Why this book is the")',
    manuscriptCitation: 'span.BookCitation-module_citationText__aH2j-:has-text("manuscript")',
    metadataCitation: 'span.BookCitation-module_citationText__aH2j-:has-text("metadata")',
    citationButton: '.BookCitation-module_citationButton__8U9MO',
    citationText: '[class*="BookCitation-module_paragraph"] span',
    highlightedText: 'span.font-content',
    reasonListItem: 'ol.list-decimal li',
    citationArrow: 'i.pi-angle-down, i.pi-angle-up',
    
    // New locators for the nested structure
    mainBookTitle: 'details.accordion > summary span.truncate:has-text("Books by Award-Winning Authors")',
    individualBookTitle: 'details.accordion details.accordion > summary span.truncate',
}