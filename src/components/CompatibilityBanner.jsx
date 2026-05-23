import { formatGB } from '../calculatorOutput';

const BANNER_BASE_STYLE = {
    textAlign: 'left',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '15px',
    border: '1px solid',
    transition: 'all 0.3s ease',
};

const INSUFFICIENT_SUGGESTIONS = [
    'Using more GPUs',
    'Using higher quantization (e.g., 8-bit)',
    'Reducing context length',
    'Using a GPU with more VRAM',
];

function WarningsSection({ warnings }) {
    if (warnings.length === 0) return null;

    return (
        <div style={{ marginTop: '15px' }}>
            <p style={{
                fontWeight: 'bold',
                marginBottom: '8px',
                color: 'inherit',
            }}>
                Warnings:
            </p>
            <ul style={{
                marginLeft: '20px',
                marginTop: '5px',
                color: 'inherit',
            }}>
                {warnings.map((warning, index) => (
                    <li key={index} style={{ marginBottom: '4px' }}>{warning}</li>
                ))}
            </ul>
        </div>
    );
}

function getVariant(results) {
    if (results.isCompatible && !results.isBorderline) return 'compatible';
    if (results.isBorderline) return 'borderline';
    return 'insufficient';
}

function getBannerContent(variant, results) {
    switch (variant) {
        case 'compatible':
            return {
                backgroundColor: 'var(--success-bg)',
                borderColor: 'var(--success-border)',
                color: 'var(--success-text)',
                title: '✅ Compatible Configuration',
                body: (
                    <p style={{ margin: '0 0 10px 0', lineHeight: '1.5' }}>
                        Your GPU setup ({results.gpuConfig}) can handle this model with {formatGB(results.vramMargin)}GB VRAM to spare.
                        Estimated performance: {results.tokensPerSecond} tokens/second.
                    </p>
                ),
            };
        case 'borderline':
            return {
                backgroundColor: 'var(--warning-bg)',
                borderColor: 'var(--warning-border)',
                color: 'var(--warning-text)',
                title: '⚠️ Borderline Configuration',
                body: (
                    <p style={{ margin: '0 0 10px 0', lineHeight: '1.5' }}>
                        Your GPU setup will work but with only {formatGB(results.vramMargin)}GB VRAM margin. Consider reducing context length or using more GPUs for better performance.
                        Estimated performance: {results.tokensPerSecond} tokens/second.
                    </p>
                ),
            };
        case 'insufficient':
            return {
                backgroundColor: 'var(--error-bg)',
                borderColor: 'var(--error-border)',
                color: 'var(--error-text)',
                title: '❌ Insufficient VRAM',
                body: (
                    <>
                        <p style={{ margin: '0 0 10px 0', lineHeight: '1.5' }}>
                            Your GPU setup lacks {formatGB(Math.abs(results.vramMargin))}GB VRAM. Consider:
                        </p>
                        <ul style={{
                            marginLeft: '20px',
                            marginTop: '10px',
                            color: 'inherit',
                        }}>
                            {INSUFFICIENT_SUGGESTIONS.map((suggestion) => (
                                <li key={suggestion}>{suggestion}</li>
                            ))}
                        </ul>
                    </>
                ),
            };
        default:
            return null;
    }
}

const CompatibilityBanner = ({ results, warnings }) => {
    if (!results) return null;

    const content = getBannerContent(getVariant(results), results);
    if (!content) return null;

    return (
        <div style={{
            ...BANNER_BASE_STYLE,
            backgroundColor: content.backgroundColor,
            borderColor: content.borderColor,
            color: content.color,
        }}>
            <h3 style={{
                color: content.color,
                marginTop: '0',
                marginBottom: '10px',
            }}>
                {content.title}
            </h3>
            {content.body}
            <WarningsSection warnings={warnings} />
        </div>
    );
};

export default CompatibilityBanner;
