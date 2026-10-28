import { render, screen, within, fireEvent } from '@testing-library/react';
import { beforeAll } from 'vitest';
import OllamaGPUCalculator from './OllamaGPUCalculator.jsx';

beforeAll(() => {
    // jsdom has no layout APIs.
    Element.prototype.scrollIntoView = () => {};
});

function pickGpu(query) {
    fireEvent.click(screen.getByRole('button', { name: 'GPU Model 1' }));
    const input = screen.getByRole('combobox', { name: 'GPU Model 1' });
    fireEvent.change(input, { target: { value: query } });
    fireEvent.keyDown(input, { key: 'Enter' });
}

test('fit table is hidden until a GPU is picked', () => {
    render(<OllamaGPUCalculator />);
    expect(screen.queryByRole('heading', { name: /What Can This Setup Run/i })).not.toBeInTheDocument();
});

test('loading a row puts the same numbers in the readout', () => {
    render(<OllamaGPUCalculator />);
    pickGpu('RTX 4090');

    const table = screen.getByRole('table');
    const firstRow = within(table).getAllByRole('row')[1];
    const cells = within(firstRow).getAllByRole('cell');
    const rowVram = cells.find((c) => / GB$/.test(c.textContent)).textContent.replace(' GB', '');
    const modelName = within(firstRow).getByRole('rowheader').firstChild.textContent;

    fireEvent.click(within(firstRow).getByRole('button', { name: `Load ${modelName} into the calculator` }));

    expect(screen.getByLabelText(/Model Preset/i)).toHaveTextContent(modelName);
    expect(document.querySelector('.iw-hero-value').textContent).toContain(rowVram);
    expect(screen.getByRole('button', { name: `Load ${modelName} into the calculator` })).toBeDisabled();
});

test('models that do not fit are behind a toggle', () => {
    render(<OllamaGPUCalculator />);
    pickGpu('RTX 4090');
    const before = within(screen.getByRole('table')).getAllByRole('row').length;
    const toggle = screen.getByRole('button', { name: /that don’t fit/i });
    fireEvent.click(toggle);
    const after = within(screen.getByRole('table')).getAllByRole('row').length;
    expect(after).toBeGreaterThan(before);
    expect(screen.getAllByText("Won't fit").length).toBeGreaterThan(0);
});

test('a loaded row stops being marked loaded after its settings change', () => {
    render(<OllamaGPUCalculator />);
    pickGpu('RTX 4090');
    const firstRow = within(screen.getByRole('table')).getAllByRole('row')[1];
    const modelName = within(firstRow).getByRole('rowheader').firstChild.textContent;
    const loadName = `Load ${modelName} into the calculator`;

    fireEvent.click(screen.getByRole('button', { name: loadName }));
    expect(screen.getByRole('button', { name: loadName })).toBeDisabled();

    fireEvent.click(screen.getByRole('radio', { name: /FP16/ }));
    expect(screen.getByRole('button', { name: loadName })).toBeEnabled();
});
