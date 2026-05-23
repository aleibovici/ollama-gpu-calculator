import React, { useState, useMemo, useEffect } from 'react';
import ReactGA from 'react-ga4';
import { gpuSpecs } from './data/gpuSpecs';
import { runCalculator, formatGB } from './calculatorOutput';
import CompatibilityBanner from './components/CompatibilityBanner';

const OllamaGPUCalculator = () => {
    const [parameters, setParameters] = useState('');
    const [quantization, setQuantization] = useState('16');
    const [contextLength, setContextLength] = useState(4096);
    const [gpuConfigs, setGpuConfigs] = useState([{ gpuModel: '', count: '1' }]);

    const { results, validationErrors, warnings } = useMemo(() => {
        if (!parameters.trim() && !gpuConfigs.some(config => config.gpuModel)) {
            return { results: null, validationErrors: {}, warnings: [] };
        }

        try {
            const output = runCalculator({ parameters, quantization, contextLength, gpuConfigs });
            return {
                results: output.results,
                validationErrors: output.errors,
                warnings: output.warnings,
            };
        } catch (error) {
            console.error('Calculation error:', error);
            return {
                results: null,
                validationErrors: { calculation: 'An error occurred during calculations. Please check your inputs and try again.' },
                warnings: [],
            };
        }
    }, [parameters, quantization, contextLength, gpuConfigs]);

    useEffect(() => {
        if (!results) return;

        const paramCount = parseFloat(parameters);
        if (Number.isNaN(paramCount) || paramCount <= 0) return;

        ReactGA.event({
            category: 'Calculator',
            action: 'Calculate',
            label: 'Mixed GPU Configuration',
            value: Math.round(paramCount),
        });
    }, [results, parameters]);

    const handleSubmit = (e) => {
        e.preventDefault();
    };

    // Add tracking to quantization changes
    const handleQuantizationChange = (value) => {
        setQuantization(value);
        ReactGA.event({
            category: 'Settings',
            action: 'Change Quantization',
            label: `${value}-bit`
        });
    };

    // Add tracking to context length changes
    const handleContextLengthChange = (value) => {
        setContextLength(parseInt(value));
        ReactGA.event({
            category: 'Settings',
            action: 'Change Context Length',
            label: `${value} tokens`
        });
    };

    const addGpuConfig = () => {
        setGpuConfigs([...gpuConfigs, { gpuModel: '', count: '1' }]);
    };

    const removeGpuConfig = (index) => {
        const newConfigs = gpuConfigs.filter((_, i) => i !== index);
        setGpuConfigs(newConfigs);
    };

    const updateGpuConfig = (index, field, value) => {
        const newConfigs = [...gpuConfigs];
        newConfigs[index] = { ...newConfigs[index], [field]: value };
        setGpuConfigs(newConfigs);
    };

    return (
        <main style={{
            maxWidth: '600px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: 'Arial, sans-serif',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            minHeight: '100vh'
        }}>
            <h2 style={{
                marginBottom: '8px',
                color: 'var(--text-primary)'
            }}>
                Ollama GPU Compatibility Calculator
            </h2>
            <p style={{
                marginBottom: '24px',
                fontSize: '15px',
                color: 'var(--text-secondary)',
                lineHeight: '1.5'
            }}>
                Check if your GPU can run Ollama models and see estimated VRAM, performance, and power.
            </p>
            <div style={{
                display: 'flex', 
                justifyContent: 'center', 
                gap: '10px', 
                marginBottom: '30px' 
            }}>
                <a 
                    href="https://www.reddit.com/r/ollama/comments/1gdux20/ollama_gpu_compatibility_calculator/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                        color: 'var(--accent-primary)',
                        textDecoration: 'none',
                        padding: '8px 16px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        transition: 'all 0.3s ease',
                        fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                        e.currentTarget.style.borderColor = 'var(--border-hover)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                >
                    💬 Discuss on Reddit
                </a>
                <a
                    href="https://github.com/aleibovici/ollama-gpu-calculator"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                        color: 'var(--accent-primary)',
                        textDecoration: 'none',
                        padding: '8px 16px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        transition: 'all 0.3s ease',
                        fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                        e.currentTarget.style.borderColor = 'var(--border-hover)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                    }}
                >
                    ⭐ Star on GitHub
                </a>
            </div>

            <section
                aria-labelledby="calculator-inputs-heading"
                style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '24px',
                    marginBottom: '24px',
                    boxShadow: 'var(--shadow-md)'
                }}
            >
                <h3 id="calculator-inputs-heading" style={{ margin: '0 0 20px', fontSize: '18px', color: 'var(--text-primary)' }}>
                    Inputs
                </h3>
                <form onSubmit={handleSubmit}>
                {validationErrors.calculation && (
                    <div
                        role="alert"
                        style={{
                            marginBottom: '20px',
                            padding: '12px 16px',
                            backgroundColor: 'var(--error-bg)',
                            border: '1px solid var(--error-border)',
                            borderRadius: '8px',
                            color: 'var(--error-text)',
                            fontSize: '14px'
                        }}
                    >
                        {validationErrors.calculation}
                    </div>
                )}
                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="parameters" style={{ 
                        display: 'block', 
                        marginBottom: '5px', 
                        textAlign: 'left', 
                        fontSize: '16px',
                        color: 'var(--text-primary)'
                    }}>
                        Model Parameters (in billions)
                    </label>
                    <input
                        type="number"
                        id="parameters"
                        value={parameters}
                        onChange={(e) => setParameters(e.target.value)}
                        placeholder="e.g., 7 for 7B model"
                        min="0.1"
                        max="200"
                        step="0.1"
                        style={{
                            width: '100%',
                            padding: '12px',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            boxSizing: 'border-box'
                        }}
                    />
                    {validationErrors.parameters && (
                        <p style={{ margin: '6px 0 0', fontSize: '14px', color: 'var(--error-text)' }} role="alert">
                            {validationErrors.parameters}
                        </p>
                    )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="gpu-model-0" style={{
                        display: 'block',
                        marginBottom: '10px',
                        textAlign: 'left',
                        fontSize: '16px',
                        color: 'var(--text-primary)'
                    }}>
                        GPU Configuration
                    </label>
                    {(validationErrors.gpu || validationErrors.gpuCount) && (
                        <p style={{ margin: '0 0 10px', fontSize: '14px', color: 'var(--error-text)' }} role="alert">
                            {validationErrors.gpu || validationErrors.gpuCount}
                        </p>
                    )}
                    {gpuConfigs.map((config, index) => (
                        <div key={index} style={{ 
                            display: 'flex', 
                            gap: '10px', 
                            marginBottom: '10px', 
                            alignItems: 'center' 
                        }}>
                            <select
                                id={`gpu-model-${index}`}
                                name={`gpu-model-${index}`}
                                aria-label={`GPU Model ${index + 1}`}
                                value={config.gpuModel}
                                onChange={(e) => updateGpuConfig(index, 'gpuModel', e.target.value)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    height: '50px',
                                    fontSize: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23${getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').slice(1)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 12px center'
                                }}
                            >
                                <option value="">Select GPU Model</option>
                                {Object.entries(gpuSpecs).map(([key, gpu]) => (
                                    <option key={key} value={key}>
                                        {gpu.name} ({gpu.vram}GB VRAM)
                                    </option>
                                ))}
                            </select>
                            <select
                                id={`gpu-count-${index}`}
                                name={`gpu-count-${index}`}
                                aria-label={`GPU Count ${index + 1}`}
                                value={config.count}
                                onChange={(e) => updateGpuConfig(index, 'count', e.target.value)}
                                style={{
                                    width: '120px',
                                    padding: '12px',
                                    height: '50px',
                                    fontSize: '16px',
                                    borderRadius: '8px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-input)',
                                    color: 'var(--text-primary)',
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23${getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').slice(1)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 12px center'
                                }}
                            >
                                {[1, 2, 3, 4, 8].map((count) => (
                                    <option key={count} value={count.toString()}>
                                        {count} GPU{count > 1 ? 's' : ''}
                                    </option>
                                ))}
                            </select>
                            {index > 0 && (
                                <div style={{ marginLeft: 'auto' }}>
                                    <button
                                        type="button"
                                        onClick={() => removeGpuConfig(index)}
                                        style={{
                                            width: '80px',
                                            height: '50px',
                                            padding: '8px',
                                            backgroundColor: 'var(--accent-danger)',
                                            color: 'var(--text-inverse)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            transition: 'all 0.3s ease'
                                        }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={addGpuConfig}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: 'var(--accent-secondary)',
                            color: 'var(--text-inverse)',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginTop: '10px',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        + Add Another GPU
                    </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="quantization" style={{ 
                        display: 'block', 
                        marginBottom: '5px', 
                        textAlign: 'left', 
                        fontSize: '16px',
                        color: 'var(--text-primary)'
                    }}>
                        Quantization
                    </label>
                    <select
                        id="quantization"
                        value={quantization}
                        onChange={(e) => handleQuantizationChange(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            height: '50px',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23${getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').slice(1)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center'
                        }}
                    >
                        <option value="32">32-bit (FP32)</option>
                        <option value="16">16-bit (FP16)</option>
                        <option value="8">8-bit (INT8)</option>
                        <option value="4">4-bit (INT4)</option>
                    </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="context-length" style={{ 
                        display: 'block', 
                        marginBottom: '5px', 
                        textAlign: 'left', 
                        fontSize: '16px',
                        color: 'var(--text-primary)'
                    }}>
                        Context Length: {contextLength}
                    </label>
                    <select
                        id="context-length"
                        value={contextLength}
                        onChange={(e) => handleContextLengthChange(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            height: '50px',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-input)',
                            color: 'var(--text-primary)',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23${getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').slice(1)}' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center'
                        }}
                    >
                        {[4096, 8192, 16384, 32768, 65536, 131072].map((length) => (
                            <option key={length} value={length}>
                                {length / 1024}k tokens
                            </option>
                        ))}
                    </select>
                </div>
                </form>
            </section>

            {results && (
                <section
                    aria-labelledby="calculator-results-heading"
                    style={{
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '24px',
                        marginBottom: '24px',
                        boxShadow: 'var(--shadow-md)'
                    }}
                >
                    <h3 id="calculator-results-heading" style={{ margin: '0 0 16px', fontSize: '18px', color: 'var(--text-primary)' }}>
                        Results
                    </h3>
                    <p style={{
                        margin: '0 0 20px',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: 'var(--text-primary)'
                    }}>
                        {formatGB(results.totalGPURAM)} GB VRAM needed
                        {' · '}
                        {results.isCompatible && !results.isBorderline && 'Compatible'}
                        {results.isBorderline && 'Borderline'}
                        {!results.isCompatible && 'Insufficient VRAM'}
                    </p>
                    <CompatibilityBanner results={results} warnings={warnings} />

                    <div style={{ 
                        marginTop: '20px', 
                        padding: '15px', 
                        backgroundColor: 'var(--bg-card)', 
                        borderRadius: '8px', 
                        textAlign: 'left',
                        border: '1px solid var(--border-color)',
                        boxShadow: 'var(--shadow-md)'
                    }}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ 
                                fontSize: '14px', 
                                fontWeight: 'normal', 
                                marginBottom: '2px', 
                                display: 'block',
                                color: 'var(--text-secondary)'
                            }}>
                                Required GPU VRAM:
                            </label>
                            <p style={{ 
                                fontSize: '24px', 
                                fontWeight: 'bold', 
                                color: 'var(--accent-primary)', 
                                margin: '0 0 10px 0' 
                            }}>
                                {formatGB(results.totalGPURAM)} GB
                            </p>
                            <div style={{ 
                                fontSize: '14px', 
                                color: 'var(--text-tertiary)', 
                                lineHeight: '1.2', 
                                marginTop: '8px' 
                            }}>
                                <p style={{ margin: '0' }}>Base Model: {formatGB(results.baseModelSizeGB)} GB</p>
                                <p style={{ margin: '0' }}>KV Cache: {formatGB(results.kvCacheSize)} GB</p>
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ 
                                fontSize: '14px', 
                                fontWeight: 'normal', 
                                marginBottom: '2px', 
                                display: 'block',
                                color: 'var(--text-secondary)'
                            }}>
                                Available VRAM:
                            </label>
                            <p style={{ 
                                fontSize: '24px', 
                                fontWeight: 'bold', 
                                color: 'var(--accent-secondary)', 
                                margin: '0 0 10px 0' 
                            }}>
                                {formatGB(results.effectiveVRAM)} GB
                            </p>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ 
                                fontSize: '14px', 
                                fontWeight: 'normal', 
                                marginBottom: '2px', 
                                display: 'block',
                                color: 'var(--text-secondary)'
                            }}>
                                {results.unifiedMemory ? 'Required Unified Memory:' : 'Required System RAM:'}
                            </label>
                            <p style={{
                                fontSize: '24px',
                                fontWeight: 'bold',
                                color: 'var(--accent-tertiary)',
                                margin: '0 0 10px 0'
                            }}>
                                {formatGB(results.totalSystemRAM)} GB
                            </p>
                        </div>
                        {results.tokensPerSecond && (
                            <div>
                                <label style={{ 
                                    fontSize: '14px', 
                                    fontWeight: 'normal', 
                                    marginBottom: '2px', 
                                    display: 'block',
                                    color: 'var(--text-secondary)'
                                }}>
                                    Estimated Performance:
                                </label>
                                <p style={{ 
                                    fontSize: '24px', 
                                    fontWeight: 'bold', 
                                    color: 'var(--accent-warning)', 
                                    margin: '0 0 10px 0' 
                                }}>
                                    {results.tokensPerSecond} tokens/second
                                </p>
                            </div>
                        )}
                        <div style={{ marginBottom: '20px', marginTop: '20px' }}>
                            <label style={{ 
                                fontSize: '14px', 
                                fontWeight: 'normal', 
                                marginBottom: '2px', 
                                display: 'block',
                                color: 'var(--text-secondary)'
                            }}>
                                Estimated Power Consumption:
                            </label>
                            <p style={{ 
                                fontSize: '24px', 
                                fontWeight: 'bold', 
                                color: 'var(--accent-danger)', 
                                margin: '0 0 10px 0' 
                            }}>
                                {results.powerConsumption.totalPower}W
                            </p>
                            <div style={{ 
                                fontSize: '14px', 
                                color: 'var(--text-tertiary)', 
                                lineHeight: '1.2', 
                                marginTop: '8px' 
                            }}>
                                {results.powerConsumption.powerDetails.map((detail, index) => (
                                    <p key={index} style={{ margin: '0' }}>
                                        {detail.count}x {detail.name}: {detail.power}W ({detail.baseWatts}W per GPU at {Math.round(results.powerConsumption.utilizationFactor * 100)}% utilization)
                                    </p>
                                ))}
                                <p style={{ margin: '0' }}>System Overhead: {results.powerConsumption.systemOverhead}W</p>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <div style={{
                fontSize: '14px',
                color: 'var(--text-tertiary)', 
                marginTop: '20px', 
                textAlign: 'left' 
            }}>
                <p>Notes:</p>
                <ul style={{ paddingLeft: '20px', textAlign: 'left' }}>
                    <li>Multi-GPU setups may have slightly lower efficiency than theoretical maximum</li>
                    <li>Some VRAM is reserved for system operations</li>
                    <li>Actual performance may vary based on other running applications</li>
                    <li>Consider leaving 1-2GB VRAM margin for optimal performance</li>
                    <li>H100, A100, A40, and V100 GPUs are designed for data centers and may not be available for personal use</li>
                    <li>Tokens per second estimates are approximate and may vary based on specific model architecture and implementation</li>
                    <li>Minimum system requirements: 8GB RAM, 10GB storage space</li>
                    <li>Apple Silicon devices use Metal GPU acceleration (via llama.cpp) for inference; the Neural Engine is not used</li>
                    <li>Local execution ensures privacy and reduced latency</li>
                    <li>Performance may vary based on model quantization and system capabilities</li>
                    <li>Supported OS: Linux (Ubuntu 18.04+), macOS (11+), Windows (native GPU support; WSL2 not required)</li>
                    <li>CPU: 4+ cores recommended, 8+ cores for 13B+ models</li>
                    <li>AMD GPUs are supported on Windows and Linux with ROCm</li>
                    <li>Models can be run in both 'generate' and 'embedding' modes if supported</li>
                    <li>Default context length is 4096 tokens</li>
                    <li>Consider using lower quantization (4-bit/8-bit) for better performance on limited hardware</li>
                    <li>Power consumption estimates account for GPU utilization patterns during LLM inference</li>
                    <li>Power usage varies based on quantization level and model size</li>
                    <li>Multi-GPU setups include additional power overhead for inter-GPU communication</li>
                </ul>
            </div>
        </main>
    );
};

export default OllamaGPUCalculator;
