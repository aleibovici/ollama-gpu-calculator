import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import reportWebVitals from './reportWebVitals';

const THEME_STORAGE_KEY = 'ogc-theme';
const DARK_THEME = 'dark';
const LIGHT_THEME = 'light';

const getInitialTheme = () => {
  try {
    const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === DARK_THEME || savedTheme === LIGHT_THEME) {
      return savedTheme;
    }
  } catch {
    // Ignore storage read issues and fallback to system preference.
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? DARK_THEME : LIGHT_THEME;
};

document.documentElement.setAttribute('data-theme', getInitialTheme());

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
