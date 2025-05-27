import { useState, useEffect } from 'react';
import ReactGA from 'react-ga4';

const useDarkMode = () => {
  // Check system preference
  const getSystemPreference = () => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  };

  // Get stored preference or fall back to system preference
  const getStoredPreference = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('darkMode');
      if (stored !== null) {
        return JSON.parse(stored);
      }
    }
    return getSystemPreference();
  };

  const [isDarkMode, setIsDarkMode] = useState(getStoredPreference);

  // Listen for system preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleSystemPreferenceChange = (e) => {
      // Only update if no stored preference exists
      const stored = localStorage.getItem('darkMode');
      if (stored === null) {
        setIsDarkMode(e.matches);
      }
    };

    mediaQuery.addEventListener('change', handleSystemPreferenceChange);
    
    return () => {
      mediaQuery.removeEventListener('change', handleSystemPreferenceChange);
    };
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    if (isDarkMode) {
      root.classList.add('dark-mode');
    } else {
      root.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  // Toggle dark mode and persist preference
  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
    
    // Track dark mode usage with Google Analytics
    ReactGA.event({
      category: 'UI',
      action: 'Toggle Dark Mode',
      label: newMode ? 'Enable Dark Mode' : 'Enable Light Mode'
    });
  };

  return [isDarkMode, toggleDarkMode];
};

export default useDarkMode; 