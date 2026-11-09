import { formatGB, getCompatibilityTier } from '../calculatorOutput';
import { CompatibilityTier, assertNever } from '../modes';

const INSUFFICIENT_SUGGESTIONS = [
    'Add another GPU to the configuration.',
    'Drop to a smaller quantization (e.g. Q8_0 or Q4_K_M).',
    'Reduce the context window.',
    'Pick a GPU with larger VRAM.',
];

function advisoryTitle(variant) {
    switch (variant) {
        case CompatibilityTier.BAD:
            return 'Advisory · Action Required';
        case CompatibilityTier.OK:
        case CompatibilityTier.WARN:
            return 'Advisory';
        default:
            return assertNever(variant);
    }
}

const CompatibilityBanner = ({ results, warnings }) => {
    if (!results) return null;
    const variant = getCompatibilityTier(results);

    const items = [];

    switch (variant) {
        case CompatibilityTier.WARN:
            items.push(`Only ${formatGB(results.vramMargin)}GB VRAM margin — consider reducing context or adding capacity.`);
            break;
        case CompatibilityTier.BAD:
            items.push(`Short by ${formatGB(Math.abs(results.vramMargin))}GB of VRAM.`);
            INSUFFICIENT_SUGGESTIONS.forEach((s) => items.push(s));
            break;
        case CompatibilityTier.OK:
            break;
        default:
            assertNever(variant);
    }
    if (warnings && warnings.length) {
        warnings.forEach((w) => items.push(w));
    }

    if (items.length === 0) return null;

    return (
        <div className={`iw-advisory ${variant === CompatibilityTier.BAD ? 'is-bad' : ''}`}>
            <div className="iw-advisory-title">
                {advisoryTitle(variant)}
            </div>
            <ul>
                {items.map((text, i) => <li key={i}>{text}</li>)}
            </ul>
        </div>
    );
};

export default CompatibilityBanner;
