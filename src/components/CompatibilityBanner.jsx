import { formatGB, getCompatibilityTier } from '../calculatorOutput';

const INSUFFICIENT_SUGGESTIONS = [
    'Add another GPU to the configuration.',
    'Drop to a smaller quantization (e.g. INT8 or INT4).',
    'Reduce the context window.',
    'Pick a GPU with larger VRAM.',
];

const CompatibilityBanner = ({ results, warnings }) => {
    if (!results) return null;
    const variant = getCompatibilityTier(results);

    const items = [];

    if (variant === 'warn') {
        items.push(`Only ${formatGB(results.vramMargin)}GB VRAM margin — consider reducing context or adding capacity.`);
    }
    if (variant === 'bad') {
        items.push(`Short by ${formatGB(Math.abs(results.vramMargin))}GB of VRAM.`);
        INSUFFICIENT_SUGGESTIONS.forEach((s) => items.push(s));
    }
    if (warnings && warnings.length) {
        warnings.forEach((w) => items.push(w));
    }

    if (items.length === 0) return null;

    return (
        <div className={`iw-advisory ${variant === 'bad' ? 'is-bad' : ''}`}>
            <div className="iw-advisory-title">
                {variant === 'bad' ? 'Advisory · Action Required' : 'Advisory'}
            </div>
            <ul>
                {items.map((text, i) => <li key={i}>{text}</li>)}
            </ul>
        </div>
    );
};

export default CompatibilityBanner;
