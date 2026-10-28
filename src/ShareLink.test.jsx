import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, vi } from 'vitest';
import OllamaGPUCalculator from './OllamaGPUCalculator.jsx';

beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
    window.history.replaceState(null, '', '/');
});

test('opening a shared link restores the configuration', () => {
    window.history.replaceState(null, '', '/?model=qwen3.6-35b&quant=q8_0&ctx=32k&gpu=rtx4090*2');
    render(<OllamaGPUCalculator />);

    expect(screen.getByLabelText(/Model Preset/i)).toHaveTextContent('qwen3.6 35b');
    expect(screen.getByRole('radio', { name: /^Q8_0/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByLabelText(/Context Window/i)).toHaveValue('32768');
    expect(screen.getByRole('button', { name: 'GPU Model 1' })).toHaveTextContent('RTX 4090');
    expect(screen.getByLabelText('GPU Count 1')).toHaveValue('2');
    expect(document.querySelector('.iw-hero-value')).toBeInTheDocument();
});

test('changing inputs updates the URL', () => {
    render(<OllamaGPUCalculator />);
    expect(window.location.search).toBe('');

    fireEvent.change(screen.getByLabelText(/Model Parameters/i), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('radio', { name: /Q4_K_M/ }));

    expect(window.location.search).toBe('?params=7&quant=q4_k_m&ctx=4k');
});

test('copy link puts the current URL on the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue();
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    window.history.replaceState(null, '', '/?params=7&quant=fp16&ctx=4k&gpu=rtx4090');
    render(<OllamaGPUCalculator />);

    fireEvent.click(screen.getByRole('button', { name: /Copy link/i }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Link copied/i })).toBeInTheDocument());
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(writeText.mock.calls[0][0]).toContain('params=7&quant=fp16&ctx=4k&gpu=rtx4090');
});
