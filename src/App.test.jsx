import { render, screen } from '@testing-library/react';
import App from './App.jsx';

test('renders Ollama GPU Compatibility Calculator', () => {
  render(<App />);
  const heading = screen.getByText(/Ollama GPU Compatibility Calculator/i);
  expect(heading).toBeInTheDocument();
});
