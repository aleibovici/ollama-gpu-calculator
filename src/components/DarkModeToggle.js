import React from 'react';
import { Moon, Sun } from 'lucide-react';

const DarkModeToggle = ({ isDarkMode, toggleDarkMode }) => {
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleDarkMode();
    }
  };

  return (
    <button
      onClick={toggleDarkMode}
      onKeyDown={handleKeyPress}
      className="dark-mode-toggle"
      aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
      role="switch"
      aria-checked={isDarkMode}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        padding: '12px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        backgroundColor: 'var(--toggle-bg)',
        color: 'var(--toggle-color)',
        boxShadow: 'var(--toggle-shadow)',
        position: 'relative',
        overflow: 'hidden',
        width: '44px',
        height: '44px',
      }}
      onMouseEnter={(e) => {
        e.target.style.transform = 'scale(1.1)';
        e.target.style.backgroundColor = 'var(--toggle-bg-hover)';
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = 'scale(1)';
        e.target.style.backgroundColor = 'var(--toggle-bg)';
      }}
      onFocus={(e) => {
        e.target.style.outline = '2px solid var(--accent-primary)';
        e.target.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.target.style.outline = 'none';
      }}
    >
      <div
        style={{
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isDarkMode ? 'rotate(0deg)' : 'rotate(180deg)',
        }}
      >
        {isDarkMode ? (
          <Sun size={20} style={{ filter: 'drop-shadow(0 0 8px rgba(255, 193, 7, 0.3))' }} />
        ) : (
          <Moon size={20} style={{ filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))' }} />
        )}
      </div>
    </button>
  );
};

export default DarkModeToggle; 