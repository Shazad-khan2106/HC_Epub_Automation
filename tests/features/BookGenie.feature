Feature: Book Genie Mode - Automated Testing with Detailed Reporting

Background: Login to Creative Workspace
    When I open the Creative Workspace login page
    Then I should see the homepage

Scenario Outline: Book Genie Response Validation with Citation Verification
    When I click on the mode selection dropdown
    Then I can see the "BookGenieQA" mode
    And I select the "BookGenieQA" mode
    Then I type "<query>" on chat input element
    And I wait for AI to complete thinking
    And I validate the response is visible for "<query>"
    And I extract book data from BookGenie response
    And I save BookGenie book data to Excel file for query "<query>"
    And I validate each book individually against Excel file for query "<query>"
    And I validate that reason texts match citation texts with 80% similarity
    And I generate detailed citation validation report
    Then I verify database connectivity
    And database should contain 10032 books
    And I validate extracted books individually against database
    And I validate BookGenie response relevance with AI for query "<query>"
    Then I should see book cards
    And I extract detailed content from the book card
    And I extract expected data from the left-side chat panel
    And I validate book titles of all cards against chat data
    And I validate authors of all cards against chat data
    And I validate relevance scores of all cards against chat data
    And I validate why match reasons of all cards against chat data
    And I validate all card contents comprehensively against chat data
    
    Examples:
        | query                                      |
        | Suggest 5 books on christmas            |
        | Suggest 3 books for childrens            |
