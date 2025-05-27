import logo from './logo.svg';
import './App.css';
import './styles/darkMode.css';
import OllamaGPUCalculator from './OllamaGPUCalculator';
import Analytics from './components/Analytics';
import DarkModeToggle from './components/DarkModeToggle';
import useDarkMode from './hooks/useDarkMode';

function App() {
  const [isDarkMode, toggleDarkMode] = useDarkMode();

  return (
    <div className="App">
      <Analytics />
      <div style={{ 
        position: 'fixed', 
        top: '20px', 
        right: '20px', 
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ 
          fontSize: '14px', 
          color: 'var(--text-secondary)',
          fontWeight: '500'
        }}>
          {isDarkMode ? 'Dark' : 'Light'} Mode
        </span>
        <DarkModeToggle 
          isDarkMode={isDarkMode} 
          toggleDarkMode={toggleDarkMode} 
        />
      </div>
      <OllamaGPUCalculator />
    </div>
  );
}

export default App;
