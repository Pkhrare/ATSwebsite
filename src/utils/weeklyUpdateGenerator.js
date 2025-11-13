import { jsPDF } from 'jspdf';
import { format, subDays, parseISO } from 'date-fns';
import ApiCaller from '../components/apiCall/ApiCaller';

/**
 * Fetches updates from the updates table for a given project
 * @param {string} projectId - The human-readable Project ID
 * @returns {Promise<Array>} Array of update records
 */
export const fetchProjectUpdates = async (projectId) => {
    try {
        const updatesResponse = await ApiCaller(`/records/filter/${projectId}/updates`);
        return updatesResponse?.records || [];
    } catch (error) {
        console.error('Error fetching updates:', error);
        throw new Error('Failed to fetch project updates');
    }
};

/**
 * Filters updates to only include those from the last 7 days
 * @param {Array} allUpdates - Array of all update records
 * @returns {Array} Filtered array of recent updates
 */
export const filterRecentUpdates = (allUpdates) => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);

    const recentUpdates = allUpdates.filter(update => {
        const updateDate = update.fields?.Update || update.createdTime;
        if (!updateDate) return false;
        
        // Extract date from Update field (which contains timestamp) or use createdTime
        let dateStr = '';
        if (typeof updateDate === 'string') {
            // Try to parse the date from the Update field
            const dateMatch = updateDate.match(/\d{4}-\d{2}-\d{2}/);
            if (dateMatch) {
                dateStr = dateMatch[0];
            } else {
                // Use createdTime as fallback
                dateStr = format(parseISO(update.createdTime), 'yyyy-MM-dd');
            }
        } else {
            dateStr = format(parseISO(update.createdTime), 'yyyy-MM-dd');
        }

        const updateDateObj = parseISO(dateStr);
        return updateDateObj >= sevenDaysAgo && updateDateObj <= today;
    });

    // Sort updates by date (oldest first)
    recentUpdates.sort((a, b) => {
        const dateA = a.fields?.Update || a.createdTime;
        const dateB = b.fields?.Update || b.createdTime;
        return new Date(dateA) - new Date(dateB);
    });

    return recentUpdates;
};

/**
 * Gets AI summary for a single update
 * @param {Object} update - The update record
 * @param {string} projectId - The project record ID (Airtable ID)
 * @param {Object} projectData - The project data object
 * @returns {Promise<string>} AI-generated summary
 */
export const getUpdateSummary = async (update, projectId, projectData) => {
    try {
        const updateText = update.fields?.Content || 'No content available';
        const updateType = update.fields?.Update || 'Update';
        
        // Use AI to summarize this update
        const summaryResponse = await ApiCaller(`/ai/consultant/project/${projectId}/assist`, {
            method: 'POST',
            body: JSON.stringify({
                message: `Please provide a brief, professional summary (2-3 sentences) of this project update: "${updateType}: ${updateText}"`,
                sender: 'Consultant',
                executeActions: false,
                context: {
                    projectData: projectData,
                    updateType: updateType,
                    updateContent: updateText
                },
                userChatIdentifier: `weekly-update-${Date.now()}`
            })
        });

        let summary = '';
        if (summaryResponse?.message) {
            if (typeof summaryResponse.message === 'string') {
                summary = summaryResponse.message;
            } else if (summaryResponse.message?.fields?.message) {
                summary = summaryResponse.message.fields.message;
            } else if (summaryResponse.message?.fields?.message_text) {
                summary = summaryResponse.message.fields.message_text;
            }
        }

        return summary || updateText.substring(0, 200) + '...'; // Fallback to truncated content
    } catch (error) {
        console.error('Error summarizing update:', error);
        return update.fields?.Content || 'Unable to generate summary.';
    }
};

/**
 * Gets AI summaries for all updates
 * @param {Array} updates - Array of update records
 * @param {string} projectId - The project record ID (Airtable ID)
 * @param {Object} projectData - The project data object
 * @returns {Promise<Array>} Array of objects with update and summary
 */
export const getAllUpdateSummaries = async (updates, projectId, projectData) => {
    const updateSummaries = [];
    
    for (const update of updates) {
        const summary = await getUpdateSummary(update, projectId, projectData);
        updateSummaries.push({
            update: update,
            summary: summary
        });
    }
    
    return updateSummaries;
};

/**
 * Generates a combined executive summary from all update summaries
 * @param {Array} updateSummaries - Array of objects with update and summary
 * @param {string} projectId - The project record ID (Airtable ID)
 * @param {Object} projectData - The project data object
 * @returns {Promise<string>} Combined executive summary
 */
export const getCombinedSummary = async (updateSummaries, projectId, projectData) => {
    try {
        const allSummaries = updateSummaries.map((item, idx) => 
            `${idx + 1}. ${item.update.fields?.Update || 'Update'}: ${item.summary}`
        ).join('\n\n');

        const combinedResponse = await ApiCaller(`/ai/consultant/project/${projectId}/assist`, {
            method: 'POST',
            body: JSON.stringify({
                message: `Based on these project updates from the last 7 days, provide a comprehensive executive summary (3-4 paragraphs) highlighting the key changes, progress made, and overall project status:\n\n${allSummaries}`,
                sender: 'Consultant',
                executeActions: false,
                context: {
                    projectData: projectData,
                    updates: updateSummaries
                },
                userChatIdentifier: `weekly-update-combined-${Date.now()}`
            })
        });

        if (combinedResponse?.message) {
            if (typeof combinedResponse.message === 'string') {
                return combinedResponse.message;
            } else if (combinedResponse.message?.fields?.message) {
                return combinedResponse.message.fields.message;
            } else if (combinedResponse.message?.fields?.message_text) {
                return combinedResponse.message.fields.message_text;
            }
        }
        
        return 'Unable to generate combined summary.';
    } catch (error) {
        console.error('Error generating combined summary:', error);
        return 'Unable to generate combined summary.';
    }
};

/**
 * Generates and downloads a PDF weekly update report
 * @param {Object} projectData - The project data object
 * @param {Array} updateSummaries - Array of objects with update and summary
 * @param {string} combinedSummary - The combined executive summary
 * @returns {void} Downloads the PDF file
 */
export const generateWeeklyUpdatePDF = (projectData, updateSummaries, combinedSummary) => {
    const today = new Date();
    const sevenDaysAgo = subDays(today, 7);
    
    const doc = new jsPDF();
    let yPosition = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    const lineHeight = 7;
    const sectionSpacing = 10;

    // Helper function to add text with word wrap
    const addWrappedText = (text, x, y, maxWidth, fontSize = 10) => {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return lines.length * lineHeight;
    };

    // Helper function to check if we need a new page
    const checkNewPage = (requiredSpace) => {
        if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
            doc.addPage();
            yPosition = 20;
            return true;
        }
        return false;
    };

    // Header
    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('Weekly Project Update', margin, yPosition);
    yPosition += 10;

    // Project Information
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Project Information', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const projectInfo = [
        `Project Name: ${projectData.fields['Project Name'] || 'N/A'}`,
        `Project ID: ${projectData.fields['Project ID'] || 'N/A'}`,
        `Status: ${projectData.fields['Status'] || 'N/A'}`,
        `Assigned Consultant: ${projectData.fields['Assigned Consultant'] || 'N/A'}`,
        `Date Range: ${format(sevenDaysAgo, 'MMM dd, yyyy')} - ${format(today, 'MMM dd, yyyy')}`
    ];

    projectInfo.forEach(info => {
        checkNewPage(8);
        doc.text(info, margin, yPosition);
        yPosition += 6;
    });

    yPosition += sectionSpacing;

    // Executive Summary
    checkNewPage(30);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Executive Summary', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    const summaryHeight = addWrappedText(combinedSummary || 'No summary available.', margin, yPosition, contentWidth);
    yPosition += summaryHeight + sectionSpacing;

    // Individual Updates
    checkNewPage(20);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Detailed Updates', margin, yPosition);
    yPosition += 8;

    updateSummaries.forEach((item, index) => {
        checkNewPage(40);
        
        // Update number and type
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        const updateHeader = `Update ${index + 1}: ${item.update.fields?.Update || 'Update'}`;
        doc.text(updateHeader, margin, yPosition);
        yPosition += 8;

        // Original content
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.text('Original Change:', margin, yPosition);
        yPosition += 6;
        
        doc.setFont(undefined, 'normal');
        const originalContent = item.update.fields?.Content || 'No content available.';
        const originalHeight = addWrappedText(originalContent, margin, yPosition, contentWidth, 9);
        yPosition += originalHeight + 4;

        // AI Summary
        doc.setFontSize(9);
        doc.setFont(undefined, 'italic');
        doc.text('AI Summary:', margin, yPosition);
        yPosition += 6;

        doc.setFont(undefined, 'normal');
        const summaryHeight = addWrappedText(item.summary, margin, yPosition, contentWidth, 9);
        yPosition += summaryHeight + sectionSpacing;
    });

    // Footer
    const totalPages = doc.internal.pages.length - 1;
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text(
            `Generated on ${format(today, 'MMMM dd, yyyy')} | Page ${i} of ${totalPages}`,
            margin,
            doc.internal.pageSize.getHeight() - 10
        );
    }

    // Download PDF
    const fileName = `Weekly_Update_${projectData.fields['Project ID']}_${format(today, 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);
};

/**
 * Main function to generate weekly update
 * @param {Object} projectData - The project data object
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<void>}
 */
export const generateWeeklyUpdate = async (projectData, onProgress) => {
    if (!projectData?.fields?.['Project ID']) {
        throw new Error('Project ID is required to generate weekly update.');
    }

    try {
        // Step 1: Fetch updates
        if (onProgress) onProgress('Fetching updates...');
        const allUpdates = await fetchProjectUpdates(projectData.fields['Project ID']);

        // Step 2: Filter to last 7 days
        if (onProgress) onProgress('Filtering recent updates...');
        const recentUpdates = filterRecentUpdates(allUpdates);

        if (recentUpdates.length === 0) {
            throw new Error('No updates found for the last 7 days.');
        }

        // Step 3: Get AI summaries for each update
        if (onProgress) onProgress('Generating AI summaries...');
        const updateSummaries = await getAllUpdateSummaries(
            recentUpdates,
            projectData.id,
            projectData
        );

        // Step 4: Generate combined summary
        if (onProgress) onProgress('Creating executive summary...');
        const combinedSummary = await getCombinedSummary(
            updateSummaries,
            projectData.id,
            projectData
        );

        // Step 5: Generate and download PDF
        if (onProgress) onProgress('Generating PDF...');
        generateWeeklyUpdatePDF(projectData, updateSummaries, combinedSummary);

    } catch (error) {
        console.error('Error generating weekly update:', error);
        throw error;
    }
};

