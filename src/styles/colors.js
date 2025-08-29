// Central Color Configuration
// This file defines the color palette for the entire application
// Colors are organized by component categories for easy maintenance

export const colors = {
  // Primary brand colors
  primary: {
    main: '#000000',        // Black - primary color
    light: '#1f1f1f',       // Dark gray
    lighter: '#374151',     // Gray-700
    contrast: '#ffffff',    // White text on black backgrounds
  },
  
  // Secondary brand colors  
  secondary: {
    main: '#fbbf24',        // Yellow-400 - secondary color
    light: '#fde68a',       // Yellow-200
    lighter: '#fef3c7',     // Yellow-100
    dark: '#d97706',        // Yellow-600
    darker: '#92400e',      // Yellow-800
    contrast: '#000000',    // Black text on yellow backgrounds
  },
  
  // Navigation and layout
  navigation: {
    background: '#000000',   // Black navbar
    text: '#ffffff',        // White nav text
    textHover: '#fbbf24',   // Yellow hover
    border: '#374151',      // Gray-700 borders
    accent: '#fbbf24',      // Yellow accents
  },
  
  // Sidebar and info panels
  sidebar: {
    background: '#ffffff',   // White sidebar background
    text: '#1f2937',        // Gray-800 text
    textSecondary: '#6b7280', // Gray-500 secondary text
    border: '#e5e7eb',      // Gray-200 borders
    hover: '#f9fafb',       // Gray-50 hover state
    accent: '#fbbf24',      // Yellow accents
  },
  
  // Buttons and interactive elements
  buttons: {
    primary: {
      background: '#000000',
      backgroundHover: '#1f1f1f',
      text: '#ffffff',
      border: '#000000',
    },
    secondary: {
      background: '#fbbf24',
      backgroundHover: '#d97706',
      text: '#000000',
      border: '#fbbf24',
    },
    accent: {
      background: '#6b7280',
      backgroundHover: '#4b5563',
      text: '#ffffff',
      border: '#6b7280',
    },
    danger: {
      background: '#ef4444',
      backgroundHover: '#dc2626',
      text: '#ffffff',
      border: '#ef4444',
    },
    success: {
      background: '#10b981',
      backgroundHover: '#059669',
      text: '#ffffff',
      border: '#10b981',
    },
  },
  
  // Cards and containers
  cards: {
    background: '#ffffff',
    border: '#e5e7eb',       // Gray-200
    shadow: 'rgba(0, 0, 0, 0.1)',
    hover: '#f9fafb',        // Gray-50
    headerBackground: '#f9fafb', // Gray-50
    headerText: '#1f2937',   // Gray-800
  },
  
  // Forms and inputs
  forms: {
    background: '#ffffff',
    border: '#d1d5db',       // Gray-300
    borderFocus: '#000000',  // Black focus
    text: '#1f2937',         // Gray-800
    placeholder: '#9ca3af',  // Gray-400
    label: '#374151',        // Gray-700
    disabled: '#f3f4f6',     // Gray-100
    error: '#ef4444',        // Red-500
    errorBackground: '#fef2f2', // Red-50
  },
  
  // Status indicators
  status: {
    success: {
      background: '#d1fae5',  // Green-100
      text: '#065f46',        // Green-800
      border: '#10b981',      // Green-500
    },
    warning: {
      background: '#fef3c7',  // Yellow-100
      text: '#92400e',        // Yellow-800
      border: '#f59e0b',      // Yellow-500
    },
    error: {
      background: '#fef2f2',  // Red-100
      text: '#991b1b',        // Red-800
      border: '#ef4444',      // Red-500
    },
    info: {
      background: '#eff6ff',  // Blue-50
      text: '#1e40af',        // Blue-800
      border: '#3b82f6',      // Blue-500
    },
    neutral: {
      background: '#f3f4f6',  // Gray-100
      text: '#374151',        // Gray-700
      border: '#9ca3af',      // Gray-400
    },
  },
  
  // Loading and skeleton states
  loading: {
    skeleton: '#e5e7eb',     // Gray-200
    skeletonPulse: '#f3f4f6', // Gray-100
    spinner: '#fbbf24',      // Yellow (secondary color)
    background: '#ffffff',
  },
  
  // Text colors by hierarchy
  text: {
    primary: '#1f2937',      // Gray-800 - main text
    secondary: '#6b7280',    // Gray-500 - secondary text
    muted: '#9ca3af',        // Gray-400 - muted text
    inverse: '#ffffff',      // White text on dark backgrounds
    accent: '#d97706',       // Yellow-600 - accent text
    link: '#000000',         // Black links
    linkHover: '#fbbf24',    // Yellow hover
  },
  
  // Background colors
  backgrounds: {
    primary: '#ffffff',      // White - main background
    secondary: '#f9fafb',    // Gray-50 - secondary background
    tertiary: '#f3f4f6',     // Gray-100 - tertiary background
    dark: '#000000',         // Black - dark background
    overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
  },
  
  // Task and project specific
  tasks: {
    completed: {
      background: '#d1fae5',
      text: '#065f46',
      icon: '#10b981',
    },
    inProgress: {
      background: '#fef3c7',
      text: '#92400e', 
      icon: '#f59e0b',
    },
    notStarted: {
      background: '#f3f4f6',
      text: '#374151',
      icon: '#6b7280',
    },
    overdue: {
      background: '#fef2f2',
      text: '#991b1b',
      icon: '#ef4444',
    },
  },
  
  // Projects specific
  projects: {
    header: {
      background: '#000000',
      text: '#ffffff',
      accent: '#fbbf24',
    },
    card: {
      background: '#ffffff',
      border: '#e5e7eb',
      hover: '#f9fafb',
    },
  },
  
  // Special utilities
  utilities: {
    transparent: 'transparent',
    current: 'currentColor',
    inherit: 'inherit',
  }
};

// Helper function to get nested color values
export const getColor = (path) => {
  return path.split('.').reduce((obj, key) => obj?.[key], colors);
};

// Commonly used color combinations
export const colorCombinations = {
  primaryButton: {
    background: colors.buttons.primary.background,
    backgroundHover: colors.buttons.primary.backgroundHover,
    text: colors.buttons.primary.text,
  },
  secondaryButton: {
    background: colors.buttons.secondary.background,
    backgroundHover: colors.buttons.secondary.backgroundHover,
    text: colors.buttons.secondary.text,
  },
  card: {
    background: colors.cards.background,
    border: colors.cards.border,
    text: colors.text.primary,
  },
  navigation: {
    background: colors.navigation.background,
    text: colors.navigation.text,
    accent: colors.navigation.accent,
  },
};

export default colors;
