# Waiverlyn AI Chatbot Integration

This directory contains the frontend components and utilities for the Waiverlyn AI chatbot integration.

## Components

### AIToggle.jsx
A toggle component that allows users to switch between Consultant and AI (Waiverlyn) chat modes.

**Props:**
- `isAIMode` (boolean): Whether AI mode is currently active
- `onToggle` (function): Callback when toggle state changes
- `disabled` (boolean): Whether the toggle should be disabled
- `className` (string): Additional CSS classes

### AITypingIndicator.jsx
Shows a typing indicator when Waiverlyn is processing a request.

**Props:**
- `isTyping` (boolean): Whether Waiverlyn is currently typing
- `className` (string): Additional CSS classes

### AIMessage.jsx
Renders AI messages with special styling and metadata display.

**Props:**
- `message` (object): The message object containing AI response data
- `className` (string): Additional CSS classes

## Utilities

### aiUtils.js
Contains utility functions for AI message handling, validation, and styling.

**Key Functions:**
- `isAIMessage(message)`: Check if a message is from Waiverlyn
- `isConsultantMessage(message)`: Check if a message is from a consultant
- `isClientMessage(message, projectName)`: Check if a message is from a client
- `getMessageStyling(message, userRole, projectName)`: Get appropriate styling for messages
- `shouldTriggerAI(message, aiModeEnabled)`: Determine if AI should respond to a message
- `validateAIRequest(projectId, message, sender)`: Validate AI request parameters
- `createAIRequestPayload(projectId, message, sender)`: Create properly formatted AI request
- `debounce(func, wait)`: Debounce function to prevent rapid AI requests

## Integration

The AI chatbot is integrated into both:
- `ProjectCard.jsx` - For consultant view
- `ClientCard.jsx` - For client view

### Features
- **Toggle between AI and Consultant modes**
- **Real-time typing indicators**
- **Debounced AI requests** (2-second delay)
- **Context-aware responses** using project data
- **Error handling and fallbacks**
- **Message styling** with distinct AI appearance
- **Attachment support** for AI messages

### Socket Events
- `waiverlyn:request` - Send AI request
- `waiverlyn:response` - Receive AI response
- `waiverlyn:typing` - Typing indicator updates
- `waiverlyn:error` - AI error handling

### Backend Requirements
The backend must implement:
- Socket.IO handlers for AI events
- Gemini API integration
- Project context building
- Data redaction for privacy
- Message storage with `is_ai` field

## Usage

1. Users can toggle between Consultant and AI modes using the toggle component
2. When in AI mode, messages automatically trigger AI responses (with debouncing)
3. AI responses appear with distinct purple styling and metadata
4. Typing indicators show when Waiverlyn is processing
5. Error handling provides user feedback for failed requests

## Security

- All sensitive data is redacted on the backend before sending to AI
- Client names, IRS identifiers, and financial data are excluded
- Consultant names are anonymized
- AI responses are clearly marked and distinguished from human messages

