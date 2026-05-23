import { render, screen } from '@testing-library/react';
import App from './App.jsx';

test('renders Ollama GPU compatibility instrument header', () => {
  render(<App />);
  expect(screen.getByText(/Ollama · GPU Compatibility Instrument/i)).toBeInTheDocument();
  expect(screen.getByText(/Ollama GPU Compatibility Calculator/i)).toBeInTheDocument();
});
