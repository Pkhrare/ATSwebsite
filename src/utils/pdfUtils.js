import jsPDF from 'jspdf';
import { loadContent } from './contentUtils';

// New, robust text extraction function
const extractTextFromLexical = (lexicalContent) => {
    try {
        let content = null;
        if (typeof lexicalContent === 'string') {
            try {
                content = JSON.parse(lexicalContent);
            } catch (parseError) {
                // If parsing fails, return the original string for basic cleaning.
                return lexicalContent;
            }
        } else if (typeof lexicalContent === 'object' && lexicalContent !== null) {
            content = lexicalContent;
        } else {
            return '';
        }

        if (!content || !content.root || !content.root.children) {
            return '';
        }

        const extractTextFromNode = (node) => {
            if (!node) return '';

            if (node.type === 'text') {
                return node.text || '';
            }

            let childrenText = '';
            if (node.children && Array.isArray(node.children)) {
                childrenText = node.children.map(extractTextFromNode).join('');
            }

            switch (node.type) {
                case 'root':
                    return childrenText;
                case 'paragraph':
                case 'heading':
                    return childrenText + '\n\n';
                case 'list':
                    // The list node itself doesn't add whitespace; list items do.
                    return childrenText;
                case 'listitem':
                    // Add a marker for bullet points to be handled later.
                    return `__BULLET__${childrenText}\n`;
                case 'linebreak':
                    return '\n';
                case 'link':
                    return childrenText;
                case 'youtube':
                case 'image':
                    return ''; // Images and videos are excluded from the text PDF.
                default:
                    return childrenText;
            }
        };

        return extractTextFromNode(content.root);
    } catch (error) {
        console.error('Error extracting text from Lexical content:', error);
        // Fallback for any other errors.
        return typeof lexicalContent === 'string' ? lexicalContent : '';
    }
};

export const downloadSignedPDF = async (task, approval, onProgress) => {
    onProgress(10, 'Initializing PDF...');
    const pdf = new jsPDF();
    const margin = 20; // Increased margin for safety
    const pageHeight = pdf.internal.pageSize.height;
    const pageWidth = pdf.internal.pageSize.width;
    const contentWidth = pageWidth - (2 * margin);
    let yPosition = margin;

    // Add Task Title
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    const taskTitle = task.fields.task_title || 'Untitled Task';
    pdf.text(taskTitle, margin, yPosition);
    yPosition += 15;

    // Add date
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    let dateText;
    if (approval.fields['Last Modified']) {
        const lastModified = new Date(approval.fields['Last Modified']);
        dateText = `Last Modified: ${lastModified.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        })}`;
    } else {
        const currentDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        dateText = `Generated on: ${currentDate}`;
    }
    pdf.text(dateText, margin, yPosition);
    yPosition += 20;

    onProgress(30, 'Processing task description...');

    // Add "Task Description" section header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Task Description:', margin, yPosition);
    yPosition += 15;

    // Load description content
    let descriptionContent = null;
    try {
        descriptionContent = await loadContent('tasks', task.id, 'description');
    } catch (error) {
        console.error('Error loading task description:', error);
    }

    if (!descriptionContent) {
        descriptionContent = task.fields.description || '';
    }

    // New extraction and cleaning logic
    const rawText = extractTextFromLexical(descriptionContent);

    // Perform robust cleaning
    const cleanedText = rawText
        // 1. Normalize line endings and remove non-printable characters that break wrapping
        .replace(/\r\n/g, '\n')
        .replace(/[^\x20-\x7E\n]/g, '')

        // 2. Handle list markers and artifacts aggressively
        .replace(/^%Ï\s*\[[\s\S]*?\]/gm, '• ') // Checkbox artifact at the start of a line
        .replace(/__BULLET__/g, '- ')      // Replace list item marker
        .replace(/^%Ï/gm, '• ')            // Dangling artifact at the start of a line
        .replace(/•\s*•/g, '•')          // Consolidate double bullets that might result

        // 3. Fix number spacing issues
        .replace(/(\d)\s+(\d)\s*%/g, '$1$2%') // Handles "1 0 %" -> "10%"
        .replace(/(\d)\s+(\d)/g, '$1$2')      // General number merging "1 5" -> "15"

        // 4. Clean up remaining artifacts
        .replace(/[Ï]/g, '') // Remove any other Ï characters
        
        // 5. General whitespace cleanup
        .replace(/\n\s*\n/g, '\n\n') // Collapse extra newlines
        .replace(/[ \t]+/g, ' ')       // Collapse spaces and tabs
        .replace(/\[\]\[(.*?)\]/g, '$1')
        .replace(/\[\s\]/g, '• ')
        .trim();

    // Add description content to PDF
    if (cleanedText) {
        pdf.setFontSize(12);
        
        const lines = pdf.splitTextToSize(cleanedText, contentWidth);
        
        for (const line of lines) {
            if (yPosition > pageHeight - margin) { // Check against bottom margin
                pdf.addPage();
                yPosition = margin;
            }

            // Check if the line is fully capitalized to make it bold
            const trimmedLine = line.trim();
            // A line is considered "all caps" if it has letters and all of them are uppercase.
            const isAllCapitalized = trimmedLine.length > 1 && 
                                     /[A-Z]/.test(trimmedLine) && 
                                     trimmedLine === trimmedLine.toUpperCase();

            if (isAllCapitalized) {
                pdf.setFont('helvetica', 'bold');
            } else {
                pdf.setFont('helvetica', 'normal');
            }

            pdf.text(line, margin, yPosition);
            yPosition += 5; // Tighter line spacing
        }
        yPosition += 10;
    } else {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No description available.', margin, yPosition);
        yPosition += 20;
    }

    onProgress(60, 'Adding signature section...');

    // Add "Signature Section" header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Signature Section:', margin, yPosition);
    yPosition += 15;

    // Add "Please sign here" line
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Please sign here:', margin, yPosition);
    yPosition += 15;

    // Add signature image if available
    if (approval.fields.signature_attachment && approval.fields.signature_attachment.length > 0) {
        onProgress(80, 'Processing signature image...');
        const signatureUrl = approval.fields.signature_attachment[0].url;
        
        const response = await fetch(signatureUrl);
        const blob = await response.blob();
        const base64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        });

        // Load image to determine original size, then use half the original dimensions (constrained to maximums if desired)
        const img = new window.Image();
        img.src = base64;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });

        // Compute half of original dimensions
        let originalWidth = img.width;
        let originalHeight = img.height;
        let signatureWidth = originalWidth / 5;
        let signatureHeight = originalHeight / 5;

        // Optional: Constrain to max values (optional, comment out if not needed)
        // const maxWidth = 60;
        // const maxHeight = 30;
        // if (signatureWidth > maxWidth) {
        //     signatureHeight = signatureHeight * (maxWidth / signatureWidth);
        //     signatureWidth = maxWidth;
        // }
        // if (signatureHeight > maxHeight) {
        //     signatureWidth = signatureWidth * (maxHeight / signatureHeight);
        //     signatureHeight = maxHeight;
        // }

        pdf.addImage(base64, 'PNG', margin, yPosition, signatureWidth, signatureHeight);
        yPosition += signatureHeight + 10;
        
    } else {
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'italic');
        pdf.text('No signature provided.', margin, yPosition);
        yPosition += 20;
    }

    onProgress(90, 'Generating file name...');
    // Generate file name
    const projectName = task.fields['Project Name (from project_id)']?.[0] || 'Project';
    const sanitizedTaskTitle = task.fields.task_title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s/g, '_');
    const fileName = `${projectName}_${sanitizedTaskTitle}_form.pdf`;

    onProgress(100, 'Download complete!');
    pdf.save(fileName);
};

export const hasSignature = (approval) => {
    return approval.fields.signature_attachment && approval.fields.signature_attachment.length > 0;
};
