# AI Assistant Component

A floating, draggable, and resizable AI assistant that provides Cursor-like AI capabilities throughout the application.

## Features

- **Collapsible**: Minimizes to a floating icon in the bottom-right corner
- **Draggable**: Click and drag the header to move the assistant anywhere on screen
- **Resizable**: Drag the bottom-right corner to resize the window
- **Context-Aware**: Automatically collects context from different screens
- **Project-Aware**: Tracks the current project and can access project data
- **Action Execution**: Can execute actions like creating tasks, forms, checklists, etc.

## Usage

### Basic Integration

The AI Assistant is already integrated into the Layout component and will appear on all screens except:
- Login screens (`/consultant-login`, `/client-login`)
- Form pages (`/combined-license-form`, `/enrollment-form`, etc.)
- Success pages (`/submission-success`)
- Landing page (`/`)

### Registering Context from Screens

To make the AI assistant aware of data from your screen, use the provided hooks:

#### For Projects Screen

```jsx
import { useScreenContext } from '../../hooks/useScreenContext';

function Projects() {
    const [projects, setProjects] = useState([]);
    
    // Register projects data
    useScreenContext({
        projects: projects,
        screen: 'Projects'
    });
    
    // ... rest of component
}
```

#### For Project Detail Screen

```jsx
import { useProjectContext } from '../../hooks/useScreenContext';

function ProjectCard({ projectId, projectData }) {
    // This automatically sets the current project and registers context
    useProjectContext(projectId, projectData);
    
    // ... rest of component
}
```

#### For Task Detail Screen

```jsx
import { useTaskContext } from '../../hooks/useScreenContext';

function TaskCard({ taskId, taskData, projectId }) {
    // Register task context
    useTaskContext(taskId, taskData, projectId);
    
    // ... rest of component
}
```

#### Manual Context Registration

```jsx
import { useAIAssistant } from '../../utils/AIAssistantContext';

function MyComponent() {
    const { registerContext } = useAIAssistant();
    
    useEffect(() => {
        registerContext({
            customData: myData,
            formData: formValues,
            // Any other context you want to share
        });
    }, [myData, formValues, registerContext]);
}
```

## API

### AIAssistantContext

The context provides the following:

- `isOpen`: Boolean - Whether the assistant is open
- `isCollapsed`: Boolean - Whether the assistant is collapsed
- `position`: Object - Current position `{ x, y }`
- `size`: Object - Current size `{ width, height }`
- `messages`: Array - Conversation messages
- `isLoading`: Boolean - Whether AI is processing
- `currentProjectId`: String - Current project ID
- `screenContext`: Object - Current screen context
- `toggleOpen()`: Function - Toggle open/closed
- `toggleCollapsed()`: Function - Toggle collapsed/expanded
- `updatePosition(position)`: Function - Update position
- `updateSize(size)`: Function - Update size
- `addMessage(message)`: Function - Add message to conversation
- `clearConversation()`: Function - Clear all messages
- `registerContext(data)`: Function - Register screen context
- `getFullContext()`: Function - Get full context for AI
- `setProject(projectId)`: Function - Set current project
- `setIsLoading(boolean)`: Function - Set loading state

## Styling

The component uses the application's color scheme:
- **Primary**: Black background with yellow accents
- **Secondary**: Yellow-400 (#fbbf24) for highlights
- Matches the site's black/yellow theme

Custom CSS classes are defined in `AIAssistant.css` for animations and transitions.

## Example Queries

Users can ask the AI assistant things like:

- "Create a new task for client onboarding"
- "Transfer form data from task A to task B"
- "Create a checklist for the compliance review"
- "What tasks are pending in this project?"
- "Create a form with fields for client information"

The AI will understand the context from the current screen and project to provide accurate assistance.

