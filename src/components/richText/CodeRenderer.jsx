import React, { useEffect, useRef, useState } from 'react';
import DOMPurify from 'dompurify';
import { colorClasses } from '../../utils/colorUtils';

const CodeRenderer = ({ content, onEdit, showEditButton = true }) => {
  const containerRef = useRef(null);
  const [useSandbox, setUseSandbox] = useState(true); // Default to sandbox mode
  const iframeRef = useRef(null);
  
  // Extract code from wrapper helper function
  const extractCode = (contentStr) => {
    if (!contentStr) return '';
    
    console.log('extractCode - input:', contentStr.substring(0, 200) + '...');
    
    // First, try to clean up the content by removing any extra quotes or backslashes
    let cleanedContent = contentStr;
    
    // If the content is wrapped in quotes, remove them
    if (cleanedContent.startsWith('"') && cleanedContent.endsWith('"')) {
      cleanedContent = cleanedContent.substring(1, cleanedContent.length - 1);
      console.log('extractCode - removed outer quotes');
    }
    
    // Replace escaped quotes with regular quotes
    cleanedContent = cleanedContent.replace(/\\"/g, '"');
    console.log('extractCode - cleaned content:', cleanedContent.substring(0, 200) + '...');
    
    if (cleanedContent.includes('code-content')) {
      try {
        // Try to find the opening div tag with different quote styles
        let openTagIndex = cleanedContent.indexOf('<div class="code-content">');
        if (openTagIndex === -1) {
          openTagIndex = cleanedContent.indexOf("<div class='code-content'>");
        }
        if (openTagIndex === -1) {
          // Try with any whitespace and quotes
          const openTagMatch = cleanedContent.match(/<div[^>]*class=["']code-content["'][^>]*>/);
          if (openTagMatch) {
            openTagIndex = openTagMatch.index;
            const openTagLength = openTagMatch[0].length;
            
            // Find the matching closing div tag
            let depth = 0;
            let currentIndex = openTagIndex;
            let closeTagIndex = -1;
            
            while (currentIndex < cleanedContent.length) {
              if (cleanedContent.substring(currentIndex, currentIndex + 4) === '<div') {
                depth++;
              } else if (cleanedContent.substring(currentIndex, currentIndex + 6) === '</div>') {
                depth--;
                if (depth === 0) {
                  closeTagIndex = currentIndex;
                  break;
                }
              }
              currentIndex++;
            }
            
            if (closeTagIndex !== -1) {
              // Extract the content between the opening and closing tags
              const startIndex = openTagIndex + openTagLength;
              const extracted = cleanedContent.substring(startIndex, closeTagIndex);
              console.log('extractCode - extracted content via complex string manipulation:', extracted.substring(0, 200) + '...');
              return extracted;
            }
          }
        } else {
          // Simple case - standard opening tag found
          // Find the matching closing div tag
          let depth = 0;
          let currentIndex = openTagIndex;
          let closeTagIndex = -1;
          
          while (currentIndex < cleanedContent.length) {
            if (cleanedContent.substring(currentIndex, currentIndex + 4) === '<div') {
              depth++;
            } else if (cleanedContent.substring(currentIndex, currentIndex + 6) === '</div>') {
              depth--;
              if (depth === 0) {
                closeTagIndex = currentIndex;
                break;
              }
            }
            currentIndex++;
          }
          
          if (closeTagIndex !== -1) {
            // Extract the content between the opening and closing tags
            const startIndex = openTagIndex + '<div class="code-content">'.length;
            const extracted = cleanedContent.substring(startIndex, closeTagIndex);
            console.log('extractCode - extracted content via string manipulation:', extracted.substring(0, 200) + '...');
            return extracted;
          }
        }
        
        // Last resort: try regex approach with multiple quote styles
        const regex = /<div[^>]*class=["']code-content["'][^>]*>([\s\S]*?)<\/div>/;
        const match = cleanedContent.match(regex);
        if (match && match[1]) {
          const extracted = match[1];
          console.log('extractCode - extracted content via regex:', extracted.substring(0, 200) + '...');
          return extracted;
        }
        
        console.log('extractCode - could not extract content from wrapper');
        
      } catch (error) {
        console.error('Error parsing code content:', error);
      }
    }
    
    // If we're here, we couldn't extract the content from the wrapper
    // Check if the content itself looks like HTML/JS/CSS code
    if (cleanedContent.includes('<script') || cleanedContent.includes('<style') || cleanedContent.includes('<html')) {
      console.log('extractCode - content appears to be code already, returning cleaned content');
      return cleanedContent;
    }
    
    console.log('extractCode - returning original content');
    return contentStr;
  };

  // Effect for rendering in iframe sandbox mode
  useEffect(() => {
    if (useSandbox && iframeRef.current) {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      const codeToRender = extractCode(contentStr);
      
      console.log('CodeRenderer - contentStr:', contentStr.substring(0, 200) + '...');
      console.log('CodeRenderer - codeToRender:', codeToRender.substring(0, 200) + '...');
      
      // Create a complete HTML document for the iframe
      const iframeContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Code Preview</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            body { 
              margin: 0; 
              padding: 0; 
              font-family: sans-serif; 
              height: 100vh;
              overflow: auto;
            }
            * { box-sizing: border-box; }
            html, body { width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          ${codeToRender}
        </body>
        </html>
      `;
      
      console.log('CodeRenderer - iframeContent length:', iframeContent.length);
      
      // Use srcdoc to avoid cross-origin issues
      iframeRef.current.srcdoc = iframeContent;
    }
  }, [content, useSandbox]);

  // Effect for rendering in direct DOM mode
  useEffect(() => {
    if (!useSandbox && containerRef.current) {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      const codeToRender = extractCode(contentStr);
      
      // Clean up any existing scripts from previous renders
      const existingScripts = document.head.querySelectorAll('[data-script-index]');
      existingScripts.forEach(script => script.remove());
      
      // Sanitize and render the HTML
      const sanitizedHtml = DOMPurify.sanitize(codeToRender, {
        ADD_TAGS: ['script', 'style', 'link', 'meta', 'iframe', 'svg', 'path'],
        ADD_ATTR: [
          'onclick', 'onload', 'onmouseover', 'onmouseout', 'style', 'class', 'id', 
          'src', 'href', 'rel', 'target', 'xmlns', 'viewBox', 'd', 'fill', 'stroke'
        ],
        FORCE_BODY: true,
        WHOLE_DOCUMENT: true,
        SANITIZE_DOM: false
      });
      
      // Create a container for the content
      containerRef.current.innerHTML = sanitizedHtml;
      
      // Process and execute scripts
      const scripts = containerRef.current.querySelectorAll('script');
      scripts.forEach((script, index) => {
        const newScript = document.createElement('script');
        
        // Copy all attributes
        Array.from(script.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        
        // Handle both inline and external scripts
        if (script.src) {
          newScript.src = script.src;
        } else if (script.innerHTML) {
          // Wrap inline scripts in an IIFE to prevent variable redeclaration
          const wrappedScript = `(function() { ${script.innerHTML} })();`;
          newScript.appendChild(document.createTextNode(wrappedScript));
        }
        
        // Add a unique ID to prevent conflicts
        newScript.setAttribute('data-script-index', index);
        
        // Remove the old script and append the new one
        if (script.parentNode) {
          script.parentNode.removeChild(script);
          // Append to document head to avoid execution context issues
          document.head.appendChild(newScript);
        }
      });
    }
    
    // Cleanup function to remove scripts when component unmounts or content changes
    return () => {
      const scripts = document.head.querySelectorAll('[data-script-index]');
      scripts.forEach(script => script.remove());
    };
  }, [content, useSandbox]);
  
  return (
    <div className="relative">
      {/* Edit button - only show if showEditButton is true */}
      {showEditButton && (
        <button
          onClick={onEdit}
          className={`absolute top-2 right-2 z-10 px-2 py-1 rounded-md text-xs font-medium ${colorClasses.button.secondary} opacity-50 hover:opacity-100 transition-opacity`}
          title="Edit Code"
        >
          <span className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Edit
          </span>
        </button>
      )}
      
      {/* Mode toggle button */}
      <button
        onClick={() => setUseSandbox(!useSandbox)}
        className={`absolute top-2 right-16 z-10 px-2 py-1 rounded-md text-xs font-medium ${useSandbox ? colorClasses.button.success : colorClasses.button.accent} opacity-50 hover:opacity-100 transition-opacity`}
        title={useSandbox ? "Currently in sandbox mode (recommended)" : "Switch to direct mode"}
      >
        <span className="flex items-center gap-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          {useSandbox ? "Sandbox" : "Direct"}
        </span>
      </button>
      
      {/* Conditional rendering based on sandbox mode */}
      {useSandbox ? (
        <iframe
          ref={iframeRef}
          className="code-renderer bg-white rounded-md border min-h-[300px] w-full"
          style={{ height: '70vh', border: '1px solid #e5e7eb' }}
          title="Code Preview"
        />
      ) : (
        <div 
          ref={containerRef}
          className="code-renderer bg-white rounded-md border p-4 min-h-[300px] overflow-auto w-full"
          style={{ maxHeight: '70vh' }}
        />
      )}
    </div>
  );
};

export default CodeRenderer;