// Color utility functions for applying the centralized color system
import colors from '../styles/colors.js';

/**
 * Generate CSS classes for common component patterns
 */
export const colorClasses = {
  // Navigation classes
  nav: {
    base: "bg-gray-900 text-white border-gray-700",
    link: "text-white hover:text-yellow-400",
    accent: "text-yellow-400",
  },
  
  // Button classes
  button: {
    primary: "bg-black hover:bg-gray-800 text-white border border-black",
    secondary: "bg-yellow-400 hover:bg-yellow-600 text-black border border-yellow-400",
    accent: "bg-gray-500 hover:bg-gray-600 text-white border border-gray-500",
    danger: "bg-red-500 hover:bg-red-600 text-white border border-red-500",
    success: "bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-500",
    neutral: "bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300",
  },
  
  // Card classes
  card: {
    base: "bg-white border border-gray-200 shadow-sm",
    hover: "hover:bg-gray-50",
    header: "bg-gray-50 text-gray-800",
  },
  
  // Form classes
  form: {
    input: "bg-white border border-gray-900 focus:border-black text-gray-800 placeholder:text-gray-400",
    label: "text-gray-700",
    error: "text-red-500 bg-red-50",
    disabled: "bg-gray-100",
  },
  
  // Status classes
  status: {
    success: "bg-green-100 text-green-800 border border-green-500",
    warning: "bg-yellow-100 text-yellow-800 border border-yellow-500",
    error: "bg-red-100 text-red-800 border border-red-500",
    info: "bg-blue-50 text-blue-800 border border-blue-500",
    neutral: "bg-gray-100 text-gray-700 border border-gray-400",
  },
  
  // Text classes
  text: {
    primary: "text-gray-800",
    secondary: "text-gray-500",
    muted: "text-gray-400",
    inverse: "text-white",
    accent: "text-yellow-600",
    link: "text-black hover:text-yellow-400",
  },
  
  // Background classes
  bg: {
    primary: "bg-white",
    secondary: "bg-gray-50",
    tertiary: "bg-gray-100",
    dark: "bg-black-400",
  },
  
  // Task status classes
  taskStatus: {
    completed: "bg-green-100 text-green-800",
    inProgress: "bg-yellow-100 text-yellow-800",
    notStarted: "bg-gray-100 text-gray-700",
    overdue: "bg-red-100 text-red-800",
  },
  
  // Loading classes
  loading: {
    skeleton: "bg-gray-200 animate-pulse",
    skeletonAlt: "bg-gray-100 animate-pulse",
    spinner: "border-yellow-400",
  },
  
  // Sidebar classes
  sidebar: {
    base: "bg-white border-gray-200",
    text: "text-gray-800",
    textSecondary: "text-gray-500",
    hover: "hover:bg-gray-50",
    accent: "text-yellow-400",
    border: "border-gray-200",
  },
};

/**
 * Generate inline styles for components that need dynamic styling
 */
export const colorStyles = {
  navigation: {
    background: colors.navigation.background,
    color: colors.navigation.text,
    borderColor: colors.navigation.border,
  },
  
  primaryButton: {
    backgroundColor: colors.buttons.primary.background,
    color: colors.buttons.primary.text,
    borderColor: colors.buttons.primary.border,
  },
  
  secondaryButton: {
    backgroundColor: colors.buttons.secondary.background,
    color: colors.buttons.secondary.text,
    borderColor: colors.buttons.secondary.border,
  },
  
  card: {
    backgroundColor: colors.cards.background,
    borderColor: colors.cards.border,
    color: colors.text.primary,
  },
  
  // Add more as needed...
};

/**
 * Get a specific color value by path
 * Usage: getColorValue('buttons.primary.background')
 */
export const getColorValue = (path) => {
  return path.split('.').reduce((obj, key) => obj?.[key], colors);
};

/**
 * Create CSS custom properties for the color system
 * This can be used to inject CSS variables
 */
export const createCSSCustomProperties = () => {
  const flattenColors = (obj, prefix = '') => {
    let result = {};
    
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}-${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result = { ...result, ...flattenColors(value, newKey) };
      } else {
        result[`--color-${newKey}`] = value;
      }
    }
    
    return result;
  };
  
  return flattenColors(colors);
};

export default {
  colors,
  colorClasses,
  colorStyles,
  getColorValue,
  createCSSCustomProperties,
};
