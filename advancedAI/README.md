# AI Assistant Architecture

This directory contains the AI assistant system, which is split into two separate AI implementations:

## Structure

### Client AI (Read-Only, Informational Only)
- **System Prompt**: `clientAISystemPrompt.js`
- **Handler**: `clientAIHandler.js`
- **Endpoint**: `POST /api/ai/client/project/:projectId/assist`
- **Capabilities**: 
  - Answer questions about projects and tasks
  - Provide guidance on how to complete tasks
  - Explain what tasks are for and why they matter
  - Help clients understand their project status and progress
  - **CANNOT** create or modify any project elements

### Consultant AI (Full Action Capabilities)
- **System Prompt**: `aiSystemPrompt.js` (existing, consultant AI)
- **Handler**: `aiEnhancedHandler.js` (existing, consultant AI)
- **Endpoint**: `POST /api/ai/consultant/project/:projectId/assist`
- **Capabilities**:
  - All client AI capabilities
  - Create new tasks, forms, checklists, attachments, approvals, and actions
  - Edit existing tasks, forms, checklists, attachments, approvals, and actions
  - Transfer data between tasks, projects, and forms
  - Update task status, descriptions, and metadata
  - Create form submissions and link them to tasks
  - Generate form structures based on requirements
  - Edit text in-place using AI (edit_text action)

## Storage

Both AI systems use the same storage table (`enhanced_ai`) for messages, allowing for a unified chat history regardless of which AI is used.

## Frontend Integration

The frontend automatically routes to the correct AI endpoint based on the user's role:
- **Clients** → `/api/ai/client/project/:projectId/assist`
- **Consultants** → `/api/ai/consultant/project/:projectId/assist`

This is handled in:
- `src/components/aiAssistant/AIAssistant.jsx`
- `src/utils/quickPromptHandler.js`
- `src/components/aiAssistant/AITextEditModal.jsx` (consultant only)

## Backend Files Location

All backend files are in the `project_manager/` directory (same level as `src/`):
- `project_manager/advancedAI/clientAISystemPrompt.js`
- `project_manager/advancedAI/clientAIHandler.js`
- `project_manager/advancedAI/aiSystemPrompt.js` (consultant)
- `project_manager/advancedAI/aiEnhancedHandler.js` (consultant)
- `project_manager/index.js` (main backend file with endpoints)

## Isolation

The two AI systems are completely isolated:
1. Different system prompts with different capabilities
2. Different handlers with different logic
3. Different endpoints
4. Frontend automatically routes based on user role
5. Client AI cannot execute actions even if requested
6. Consultant AI has full action capabilities


