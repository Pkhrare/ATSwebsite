import React, { useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { html } from '@codemirror/lang-html';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import DOMPurify from 'dompurify';
import { colorClasses } from '../../utils/colorUtils';

const CodeEditorModal = ({ isOpen, onClose, onSave, initialContent }) => {
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      console.log('CodeEditorModal opened with initialContent:', initialContent);
      
      // Ensure initialContent is a string
      const contentStr = typeof initialContent === 'string' ? initialContent : (initialContent ? JSON.stringify(initialContent) : '');
      console.log('Content as string:', contentStr);
      
      // Extract code from wrapper if it exists
      if (contentStr && contentStr.includes('code-content')) {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(contentStr, 'text/html');
          const codeElement = doc.querySelector('.code-content');
          if (codeElement) {
            console.log('Found code-content element, innerHTML:', codeElement.innerHTML);
            setCode(codeElement.innerHTML);
          } else {
            console.log('No code-content element found, using full content');
            setCode(contentStr);
          }
        } catch (error) {
          console.error('Error parsing initial content:', error);
          setCode(contentStr);
        }
      } else {
        console.log('No code-content wrapper found, using content as is');
        setCode(contentStr || '');
      }
      setIsPreviewMode(false);
      setErrors([]);
    }
  }, [isOpen, initialContent]);

  const validateCode = () => {
    const newErrors = [];
    
    // Basic HTML validation
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(code, 'text/html');
      const parserErrors = doc.querySelectorAll('parsererror');
      
      if (parserErrors.length) {
        newErrors.push({ 
          type: 'HTML', 
          message: 'HTML parsing error. Check for unclosed tags or invalid syntax.' 
        });
      }
    } catch (error) {
      newErrors.push({ type: 'HTML', message: `HTML error: ${error.message}` });
    }

    // Basic CSS validation
    try {
      const cssRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
      const cssMatches = [...code.matchAll(cssRegex)];
      
      cssMatches.forEach(match => {
        const cssContent = match[1];
        try {
          const testStyle = document.createElement('style');
          testStyle.textContent = cssContent;
          document.head.appendChild(testStyle);
          document.head.removeChild(testStyle);
        } catch (error) {
          newErrors.push({ type: 'CSS', message: `CSS error: ${error.message}` });
        }
      });
    } catch (error) {
      // Ignore general CSS extraction errors
    }

    // Basic JavaScript validation
    try {
      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      const scriptMatches = [...code.matchAll(scriptRegex)];
      
      scriptMatches.forEach(match => {
        const jsContent = match[1];
        try {
          // eslint-disable-next-line no-new-func
          new Function(jsContent);
        } catch (error) {
          newErrors.push({ type: 'JavaScript', message: `JavaScript error: ${error.message}` });
        }
      });
    } catch (error) {
      // Ignore general JS extraction errors
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    validateCode();
    
    // Wrap code in the special container
    const wrappedCode = `<div class="code-content">${code}</div>`;
    console.log('Saving wrapped code:', wrappedCode);
    
    try {
      // Call onSave with the wrapped code
      onSave(wrappedCode);
      
      // Don't close the modal if there are errors
      if (errors.length === 0) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving code:', error);
      alert('There was an error saving your code. Please try again.');
    }
  };

  const togglePreview = () => {
    setIsPreviewMode(!isPreviewMode);
  };

  const renderPreview = () => {
    const sanitizedHtml = DOMPurify.sanitize(code, {
      ADD_TAGS: ['script', 'style'],
      ADD_ATTR: ['onclick', 'onload']
    });

    return (
      <div className="bg-white rounded-md border p-4 w-full h-full overflow-auto">
        <div 
          className="preview-container"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold">
            {isPreviewMode ? 'Code Preview' : 'HTML/CSS/JS Editor'}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={togglePreview}
              className={`px-3 py-1 rounded-md text-sm font-medium ${colorClasses.button.secondary}`}
            >
              {isPreviewMode ? 'Edit Code' : 'Preview'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isPreviewMode ? (
            renderPreview()
          ) : (
            <div className="bg-slate-800 h-full">
              <div className="p-2 bg-slate-700 text-white text-xs">
                <p className="mb-1">Tips:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Include external libraries with <code className="bg-slate-600 px-1 rounded">&lt;script src="https://..."&gt;&lt;/script&gt;</code></li>
                  <li>For animations, try using CSS animations or libraries like GSAP or Anime.js</li>
                  <li>Sandbox mode is the default for better compatibility with animations and external libraries</li>
                  <li>Tailwind CSS is automatically loaded when you use <code className="bg-slate-600 px-1 rounded">class="..."</code> attributes</li>
                </ul>
              </div>
              <CodeMirror
                value={code}
                height="450px"
                extensions={[html({ css: true, javascript: true }), javascript(), css()]}
                onChange={(value) => {
                  setCode(value);
                  // Clear errors when editing
                  if (errors.length > 0) {
                    setErrors([]);
                  }
                }}
                theme="dark"
                className="h-full code-editor-gray"
                style={{
                  backgroundColor: '#1e293b', // Tailwind slate-800
                  fontSize: '14px'
                }}
              />
            </div>
          )}
        </div>

        {/* Error display */}
        {errors.length > 0 && !isPreviewMode && (
          <div className="p-4 bg-red-900/20 border-t border-red-800 max-h-32 overflow-y-auto">
            <h3 className="text-sm font-medium text-red-300 mb-2">Code validation errors:</h3>
            <ul className="list-disc pl-5 space-y-1">
              {errors.map((error, index) => (
                <li key={index} className="text-xs text-red-300">
                  <span className="font-semibold">{error.type}:</span> {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t">
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-md text-sm font-medium ${colorClasses.button.neutral}`}
          >
            Cancel
          </button>
          {!isPreviewMode && (
            <button
              onClick={handleSave}
              className={`px-4 py-2 rounded-md text-sm font-medium ${colorClasses.button.success}`}
            >
              Save Code
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodeEditorModal;
