// ===================================
// CONTENT UTILITIES FOR ATTACHMENT-BASED STORAGE
// ===================================

import ApiCaller from '../components/apiCall/ApiCaller';

/**
 * Load content from attachment or fallback to old field
 * @param {string} tableName - The Airtable table name
 * @param {string} recordId - The record ID
 * @param {string} fieldName - The field name (Notes, description, pageContent)
 * @returns {Promise<string|null>} - The content as string or null
 */
export const loadContent = async (tableName, recordId, fieldName) => {
    try {
        console.log(`Loading content for ${tableName}.${fieldName}, record: ${recordId}`);
        
        const response = await ApiCaller(`/get-content-hybrid/${tableName}/${recordId}/${fieldName}`);
        
        if (response.content) {
            console.log(`Content loaded from ${response.source} for ${tableName}.${fieldName}`);
            
            // Handle double-encoded content (content that has been JSON.stringify'd twice)
            let content = response.content;
            
            // Check if the content is double-encoded (starts and ends with quotes and has escaped quotes)
            if (typeof content === 'string' && content.startsWith('"') && content.endsWith('"') && content.includes('\\"')) {
                try {
                    // Parse the outer JSON string to get the inner JSON string
                    content = JSON.parse(content);
                    console.log('Fixed double-encoded content');
                } catch (parseError) {
                    console.warn('Failed to parse double-encoded content, using as-is:', parseError);
                }
            }
            
            return content;
        }
        
        console.log(`No content found for ${tableName}.${fieldName}, record: ${recordId}`);
        return null;
        
    } catch (error) {
        console.error(`Failed to load content for ${tableName}.${fieldName}:`, error);
        return null;
    }
};

/**
 * Save content as attachment
 * @param {string} tableName - The Airtable table name
 * @param {string} recordId - The record ID
 * @param {string} fieldName - The field name (Notes, description, pageContent)
 * @param {string} content - The content to save (usually JSON string from Lexical)
 * @returns {Promise<boolean>} - Success status
 */
export const saveContent = async (tableName, recordId, fieldName, content) => {
    try {
        console.log(`Saving content for ${tableName}.${fieldName}, record: ${recordId}`);
        
        const response = await ApiCaller('/save-content-attachment', {
            method: 'POST',
            body: JSON.stringify({
                recordId,
                tableName,
                fieldName,
                content
            })
        });
        
        console.log(`Content saved successfully for ${tableName}.${fieldName}: ${response.url}`);
        return true;
        
    } catch (error) {
        console.error(`Failed to save content for ${tableName}.${fieldName}:`, error);
        throw error;
    }
};

/**
 * Helper to convert legacy content to the new system
 * This is useful for existing content that needs to be migrated
 */
export const migrateLegacyContent = async (tableName, recordId, fieldName, legacyContent) => {
    if (!legacyContent) return null;
    
    try {
        // If it's already a JSON string from Lexical, use it directly
        if (typeof legacyContent === 'string' && legacyContent.startsWith('{')) {
            await saveContent(tableName, recordId, fieldName, legacyContent);
            return legacyContent;
        }
        
        // If it's plain text, we need to convert it to a basic Lexical format
        const basicLexicalContent = {
            root: {
                children: [{
                    children: [{
                        detail: 0,
                        format: 0,
                        mode: "normal",
                        style: "",
                        text: legacyContent,
                        type: "text",
                        version: 1
                    }],
                    direction: "ltr",
                    format: "",
                    indent: 0,
                    type: "paragraph",
                    version: 1
                }],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "root",
                version: 1
            }
        };
        
        const contentString = JSON.stringify(basicLexicalContent);
        await saveContent(tableName, recordId, fieldName, contentString);
        return contentString;
        
    } catch (error) {
        console.error('Failed to migrate legacy content:', error);
        return legacyContent; // Return original on failure
    }
};

/**
 * Helper function for backward compatibility
 * Converts old text content to Lexical format if needed
 */
export const ensureLexicalFormat = (content) => {
    if (!content) return null;
    
    // If it's already a JSON string, return as-is
    if (typeof content === 'string' && content.startsWith('{')) {
        return content;
    }
    
    // Convert plain text to basic Lexical format
    const basicLexicalContent = {
        root: {
            children: [{
                children: [{
                    detail: 0,
                    format: 0,
                    mode: "normal",
                    style: "",
                    text: content,
                    type: "text",
                    version: 1
                }],
                direction: "ltr",
                format: "",
                indent: 0,
                type: "paragraph",
                version: 1
            }],
            direction: "ltr",
            format: "",
            indent: 0,
            type: "root",
            version: 1
        }
    };
    
    return JSON.stringify(basicLexicalContent);
};
