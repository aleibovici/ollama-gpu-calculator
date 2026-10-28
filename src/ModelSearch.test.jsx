import { render, screen, fireEvent, within } from '@testing-library/react';
import { beforeAll, describe, it, expect, afterEach } from 'vitest';
import OllamaGPUCalculator from './OllamaGPUCalculator.jsx';
import { matchesQuery } from './components/searchMatch';

beforeAll(() => {
    Element.prototype.scrollIntoView = () => {};
});

afterEach(() => {
    window.history.replaceState(null, '', '/');
});

const openModelSearch = () => {
    fireEvent.click(screen.getByLabelText(/Model Preset/i));
    return screen.getByRole('combobox', { name: /Model Preset/i });
};
const optionNames = () =>
    within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.firstChild.textContent);

describe('matchesQuery', () => {
    const item = { name: 'qwen3.8 27b', detail: 'Qwen', badge: '27.3B', haystack: 'qwen3.8-27b dense vision' };
    it('matches every word in any order', () => {
        expect(matchesQuery(item, 'qwen 27')).toBe(true);
        expect(matchesQuery(item, '27b QWEN')).toBe(true);
        expect(matchesQuery(item, 'vision')).toBe(true);
        expect(matchesQuery(item, 'qwen 70')).toBe(false);
    });
    it('matches everything for an empty query', () => {
        expect(matchesQuery(item, '   ')).toBe(true);
    });
});

test('typing filters the model presets', () => {
    render(<OllamaGPUCalculator />);
    const input = openModelSearch();
    const all = optionNames().length;

    fireEvent.change(input, { target: { value: 'qwen 27' } });
    const names = optionNames();
    expect(names.length).toBeLessThan(all);
    expect(names).toContain('qwen3.8 27b');
    expect(names.every((n) => n.toLowerCase().includes('qwen'))).toBe(true);
});

test('Enter picks the first match and loads the preset', () => {
    render(<OllamaGPUCalculator />);
    const input = openModelSearch();
    fireEvent.change(input, { target: { value: 'llama3.3' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByLabelText(/Model Preset/i)).toHaveTextContent('llama3.3 70b');
    expect(screen.getByLabelText(/Model Parameters/i)).toHaveValue(70.6);
});

test('typing on the closed box opens the search with that letter', () => {
    render(<OllamaGPUCalculator />);
    fireEvent.keyDown(screen.getByLabelText(/Model Preset/i), { key: 'g' });

    const input = screen.getByRole('combobox', { name: /Model Preset/i });
    expect(input).toHaveValue('g');
    expect(document.activeElement).toBe(input);
    expect(optionNames()).toContain('gemma4 31b');
    expect(optionNames()).not.toContain('— custom / enter params —');
});

test('searching by capability finds MoE models', () => {
    render(<OllamaGPUCalculator />);
    const input = openModelSearch();
    fireEvent.change(input, { target: { value: 'moe' } });
    expect(optionNames()).toContain('gpt-oss 20b (MXFP4 MoE)');
});

test('shows a message when nothing matches', () => {
    render(<OllamaGPUCalculator />);
    const input = openModelSearch();
    fireEvent.change(input, { target: { value: 'zzzz' } });
    expect(screen.getByText(/No model matches “zzzz”/)).toBeInTheDocument();
});

test('the custom option clears the preset', () => {
    window.history.replaceState(null, '', '/?model=phi4-14b');
    render(<OllamaGPUCalculator />);
    expect(screen.getByLabelText(/Model Preset/i)).toHaveTextContent('phi4 14b');

    openModelSearch();
    fireEvent.mouseDown(screen.getByRole('option', { name: /custom \/ enter params/i }));
    expect(screen.getByLabelText(/Model Preset/i)).toHaveTextContent('— custom / enter params —');
});

test('Escape closes the search without changing the preset', () => {
    render(<OllamaGPUCalculator />);
    const input = openModelSearch();
    fireEvent.change(input, { target: { value: 'qwen' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Model Preset/i)).toHaveTextContent('— custom / enter params —');
});
