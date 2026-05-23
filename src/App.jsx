import './App.css';
import './styles/darkMode.css';
import OllamaGPUCalculator from './OllamaGPUCalculator';
import Analytics from './components/Analytics';

function App() {
  return (
    <div className="App">
      <Analytics />
      <OllamaGPUCalculator />
    </div>
  );
}

export default App;
