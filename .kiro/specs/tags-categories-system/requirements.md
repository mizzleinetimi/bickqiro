# Requirements Document

## Introduction

This document specifies the requirements for the Tags/Categories System feature in Bickqr. The system enables users to organize, discover, and browse audio clips (bicks) through a tagging mechanism. Tags provide SEO-optimized categorization, improve discoverability through autocomplete suggestions, and enable browsing via dedicated tag landing pages.

## Glossary

- **Tag_System**: The complete tagging infrastructure including storage, API, and UI components
- **Tag_Input**: The UI component for adding and managing tags on bicks
- **Tag_Autocomplete**: The component that suggests existing tags as users type
- **Tag_Display**: Components that render tags on bick cards and detail pages
- **Tag_Page**: SEO-optimized landing page for browsing bicks by tag
- **Popular_Tags**: Section displaying trending or frequently-used tags
- **Bick_Owner**: The authenticated user who uploaded a specific bick

## Requirements

### Requirement 1: Tag Input During Upload

**User Story:** As a user uploading a bick, I want to add tags during the upload process, so that my bick is discoverable by relevant topics.

#### Acceptance Criteria

1. WHEN a user is on the metadata step of upload, THE Tag_Input SHALL display a tag input field with placeholder text
2. WHEN a user types in the tag input field, THE Tag_Autocomplete SHALL suggest existing tags matching the input after 2 or more characters
3. WHEN a user presses Enter or clicks Add with valid input, THE Tag_Input SHALL add the tag to the selected tags list
4. WHEN a user attempts to add a tag with invalid characters, THE Tag_Input SHALL reject the input and display an error message
5. WHEN a user attempts to add more than 10 tags, THE Tag_Input SHALL prevent addition and display a limit message
6. WHEN a user clicks the remove button on a tag, THE Tag_Input SHALL remove that tag from the selected list
7. WHEN a user submits the upload form with tags, THE Tag_System SHALL associate all selected tags with the bick

### Requirement 2: Tag Management on Existing Bicks

**User Story:** As a bick owner, I want to add or edit tags on my existing bicks, so that I can improve discoverability after upload.

#### Acceptance Criteria

1. WHEN a Bick_Owner views their bick detail page, THE Tag_System SHALL display an edit tags button
2. WHEN a Bick_Owner clicks edit tags, THE Tag_Input SHALL appear with current tags pre-populated
3. WHEN a Bick_Owner saves tag changes, THE Tag_System SHALL update the bick-tag associations in the database
4. WHEN a non-owner views a bick detail page, THE Tag_System SHALL NOT display the edit tags button
5. WHEN tag changes are saved, THE Tag_System SHALL update tag counts accordingly

### Requirement 3: Tag Autocomplete

**User Story:** As a user adding tags, I want to see suggestions based on existing tags, so that I can use consistent terminology and discover popular tags.

#### Acceptance Criteria

1. WHEN a user types 2 or more characters in the tag input, THE Tag_Autocomplete SHALL query for matching tags
2. WHEN matching tags exist, THE Tag_Autocomplete SHALL display up to 10 suggestions ordered by bick_count descending
3. WHEN a user clicks a suggestion, THE Tag_Input SHALL add that tag to the selected list
4. WHEN a user presses arrow keys, THE Tag_Autocomplete SHALL navigate through suggestions
5. WHEN a user presses Enter with a suggestion highlighted, THE Tag_Input SHALL add the highlighted tag
6. WHEN no matching tags exist, THE Tag_Autocomplete SHALL display a message indicating the tag will be created

### Requirement 4: Tag Display on Bick Cards

**User Story:** As a user browsing bicks, I want to see tags on bick cards, so that I can quickly understand what each bick is about.

#### Acceptance Criteria

1. WHEN a bick has tags, THE Tag_Display SHALL show up to 3 tags on the bick card
2. WHEN a bick has more than 3 tags, THE Tag_Display SHALL show a count indicator for remaining tags
3. WHEN a user clicks a tag on a bick card, THE Tag_System SHALL navigate to that tag's page
4. WHEN a bick has no tags, THE Tag_Display SHALL NOT render a tags section

### Requirement 5: Tag Display on Bick Detail Page

**User Story:** As a user viewing a bick, I want to see all tags and navigate to related content, so that I can discover similar bicks.

#### Acceptance Criteria

1. WHEN viewing a bick detail page, THE Tag_Display SHALL show all tags associated with the bick
2. WHEN a user clicks a tag, THE Tag_System SHALL navigate to that tag's page
3. THE Tag_Display SHALL render tags as clickable links with appropriate styling

### Requirement 6: Popular Tags Section

**User Story:** As a user, I want to see popular tags on the homepage and trending page, so that I can discover trending topics.

#### Acceptance Criteria

1. WHEN a user visits the homepage, THE Popular_Tags section SHALL display up to 12 tags ordered by bick_count descending
2. WHEN a user visits the trending page, THE Popular_Tags section SHALL display up to 12 tags ordered by bick_count descending
3. WHEN a user clicks a popular tag, THE Tag_System SHALL navigate to that tag's page
4. WHEN no tags exist with bick_count greater than 0, THE Popular_Tags section SHALL NOT be displayed

### Requirement 7: Tag Search

**User Story:** As a user, I want to search for tags, so that I can find specific topics quickly.

#### Acceptance Criteria

1. WHEN a user types a tag name in the search input, THE Tag_System SHALL include tag results in search suggestions
2. WHEN tag results are displayed, THE Tag_System SHALL show the tag name and bick count
3. WHEN a user selects a tag from search results, THE Tag_System SHALL navigate to that tag's page

### Requirement 8: Tag Count Management

**User Story:** As a system administrator, I want tag counts to stay accurate, so that popular tags are correctly identified.

#### Acceptance Criteria

1. WHEN a tag is added to a bick, THE Tag_System SHALL increment that tag's bick_count
2. WHEN a tag is removed from a bick, THE Tag_System SHALL decrement that tag's bick_count
3. WHEN a bick is deleted, THE Tag_System SHALL decrement bick_count for all associated tags
4. WHEN a bick status changes from live to non-live, THE Tag_System SHALL decrement bick_count for associated tags
5. WHEN a bick status changes to live, THE Tag_System SHALL increment bick_count for associated tags

### Requirement 9: Tag API Routes

**User Story:** As a developer, I want well-defined API routes for tag operations, so that the frontend can interact with tag data efficiently.

#### Acceptance Criteria

1. THE Tag_System SHALL provide a GET endpoint for searching tags by prefix
2. THE Tag_System SHALL provide a GET endpoint for fetching popular tags
3. THE Tag_System SHALL provide a PUT endpoint for updating tags on a bick (owner only)
4. WHEN an unauthenticated user calls the PUT endpoint, THE Tag_System SHALL return a 401 error
5. WHEN a non-owner calls the PUT endpoint, THE Tag_System SHALL return a 403 error
6. THE Tag_System SHALL validate all tag inputs against the format rules (alphanumeric and hyphens only)
