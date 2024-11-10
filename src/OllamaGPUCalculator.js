import React, { useState } from 'react';

const OllamaGPUCalculator = () => {
    const [parameters, setParameters] = useState('');
    const [quantization, setQuantization] = useState('16');
    const [contextLength, setContextLength] = useState(4096);
    const [gpuModel, setGpuModel] = useState('');
    const [gpuCount, setGpuCount] = useState('1');
    const [results, setResults] = useState(null);
    const [customGpuRam, setCustomGpuRam] = useState('');
    const [useCustomGpu, setUseCustomGpu] = useState(false);

    const unsortedGpuSpecs = {
        'h100': { name: 'H100', vram: 80, generation: 'Hopper', tflops: 1000 },
        'a100-80gb': { name: 'A100 80GB', vram: 80, generation: 'Ampere', tflops: 312 },
        'a100-40gb': { name: 'A100 40GB', vram: 40, generation: 'Ampere', tflops: 312 },
        'a40': { name: 'A40', vram: 48, generation: 'Ampere', tflops: 149.8 },
        'v100-32gb': { name: 'V100 32GB', vram: 32, generation: 'Volta', tflops: 125 },
        'v100-16gb': { name: 'V100 16GB', vram: 16, generation: 'Volta', tflops: 125 },
        'rtx4090': { name: 'RTX 4090', vram: 24, generation: 'Ada Lovelace', tflops: 82.6 },
        'rtx4080': { name: 'RTX 4080', vram: 16, generation: 'Ada Lovelace', tflops: 65 },
        'rtx3090ti': { name: 'RTX 3090 Ti', vram: 24, generation: 'Ampere', tflops: 40 },
        'rtx3090': { name: 'RTX 3090', vram: 24, generation: 'Ampere', tflops: 35.6 },
        'rtx3080ti': { name: 'RTX 3080 Ti', vram: 12, generation: 'Ampere', tflops: 34.1 },
        'rtx3080': { name: 'RTX 3080', vram: 10, generation: 'Ampere', tflops: 29.8 },
        'a6000': { name: 'A6000', vram: 48, generation: 'Ampere', tflops: 38.7 },
        'a5000': { name: 'A5000', vram: 24, generation: 'Ampere', tflops: 27.8 },
        'a4000': { name: 'A4000', vram: 16, generation: 'Ampere', tflops: 19.2 },
        'rtx4060ti': { name: 'RTX 4060 Ti', vram: 8, generation: 'Ada Lovelace', tflops: 22.1 },
        'gtx1080ti': { name: 'GTX 1080 Ti', vram: 11, generation: 'Pascal', tflops: 11.3 },
        'gtx1070ti': { name: 'GTX 1070 Ti', vram: 8, generation: 'Pascal', tflops: 8.1 },
        'teslap40': { name: 'Tesla P40', vram: 24, generation: 'Pascal', tflops: 12 },
        'gtx1070': { name: 'GTX 1070', vram: 8, generation: 'Pascal', tflops: 6.5 },
        'gtx1060': { name: 'GTX 1060', vram: 6, generation: 'Pascal', tflops: 4.4 },
        'm4': { name: 'Apple M4', vram: 16, generation: 'Apple Silicon', tflops: 4.6 },
        'm3': { name: 'Apple M3', vram: 8, generation: 'Apple Silicon', tflops: 4.1 },
        'm2': { name: 'Apple M2', vram: 8, generation: 'Apple Silicon', tflops: 3.6 },
        'm1': { name: 'Apple M1', vram: 8, generation: 'Apple Silicon', tflops: 2.6 },
    };

    const gpuSpecs = Object.fromEntries(
        Object.entries(unsortedGpuSpecs)
            .sort(([, a], [, b]) => {
                // First sort by name prefix (A, GTX, RTX, etc.)
                const nameA = a.name.split(' ')[0];
                const nameB = b.name.split(' ')[0];
                if (nameA !== nameB) return nameA.localeCompare(nameB);
                // Then sort by VRAM if names are the same
                return a.vram - b.vram;
            })
    );

    const calculateRAMRequirements = (paramCount, quantBits, contextLength, numGPUs, customGpuRam, gpuModel, useCustomGpu) => {
        // Calculate base model size in GB
        const baseModelSizeGB = (paramCount * quantBits * 1000000000) / (8 * 1024 * 1024 * 1024);

        // Calculate hidden size (d_model)
        const hiddenSize = Math.sqrt(paramCount * 1000000000 / 6);

        // Calculate KV cache size in GB
        const kvCacheSize = (2 * hiddenSize * contextLength * 2 * quantBits / 8) / (1024 * 1024 * 1024);

        // Add GPU overhead
        const gpuOverhead = baseModelSizeGB * 0.1;
        const totalGPURAM = baseModelSizeGB + kvCacheSize + gpuOverhead;

        // Calculate system RAM requirements
        const systemRAMMultiplier = quantBits <= 8 ? 1.2 : 1.5;
        const totalSystemRAM = totalGPURAM * systemRAMMultiplier;

        // Calculate available VRAM
        let totalAvailableVRAM, effectiveVRAM;
        if (useCustomGpu) {
            totalAvailableVRAM = parseFloat(customGpuRam) * numGPUs;
        } else {
            totalAvailableVRAM = gpuSpecs[gpuModel].vram * numGPUs;
        }
        const multiGpuEfficiency = numGPUs > 1 ? 0.9 : 1;
        effectiveVRAM = totalAvailableVRAM * multiGpuEfficiency;

        return {
            baseModelSizeGB,
            kvCacheSize,
            totalGPURAM,
            totalSystemRAM,
            totalAvailableVRAM,
            effectiveVRAM,
            vramMargin: totalAvailableVRAM - totalGPURAM
        };
    };

    const calculateTokensPerSecond = (paramCount, numGPUs, gpuModel) => {
        if (!gpuModel) return null;

        const selectedGPU = gpuSpecs[gpuModel];
        const baseTPS = (selectedGPU.tflops * 1e12) / (6 * paramCount * 1e9) * 0.05;
        
        let totalTPS = baseTPS;
        for(let i = 1; i < numGPUs; i++) {
            totalTPS += baseTPS * 0.9;
        }
        
        return Math.round(Math.min(totalTPS, 200));
    };

    const calculateOllamaRAM = () => {
        if (!parameters || (!gpuModel && !useCustomGpu) || (useCustomGpu && !customGpuRam)) {
            alert('Please enter all required fields');
            return;
        }

        const paramCount = parseFloat(parameters);
        const quantBits = parseInt(quantization);
        const numGPUs = parseInt(gpuCount);

        const ramCalc = calculateRAMRequirements(
            paramCount,
            quantBits,
            contextLength,
            numGPUs,
            customGpuRam,
            gpuModel,
            useCustomGpu
        );

        const estimatedTPS = useCustomGpu ? null : calculateTokensPerSecond(paramCount, numGPUs, gpuModel);

        setResults({
            gpuRAM: ramCalc.totalGPURAM.toFixed(2),
            systemRAM: ramCalc.totalSystemRAM.toFixed(2),
            modelSize: ramCalc.baseModelSizeGB.toFixed(2),
            kvCache: ramCalc.kvCacheSize.toFixed(2),
            availableVRAM: ramCalc.effectiveVRAM.toFixed(2),
            vramMargin: ramCalc.vramMargin.toFixed(2),
            isCompatible: ramCalc.effectiveVRAM >= ramCalc.totalGPURAM,
            isBorderline: ramCalc.vramMargin > 0 && ramCalc.vramMargin < 2,
            gpuConfig: useCustomGpu 
                ? `${numGPUs}x Custom GPU (${ramCalc.totalAvailableVRAM}GB total)` 
                : `${numGPUs}x ${gpuSpecs[gpuModel].name} (${ramCalc.totalAvailableVRAM}GB total)`,
            tokensPerSecond: estimatedTPS
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        calculateOllamaRAM();
    };

    const getCompatibilityMessage = () => {
        if (!results) return null;

        const baseStyles = {
            textAlign: 'left',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '10px'
        };

        if (results.isCompatible && !results.isBorderline) {
            return (
                <div style={{ ...baseStyles, backgroundColor: '#d1fae5', border: '1px solid #34d399' }}>
                    <h3 style={{ color: '#047857' }}>Compatible Configuration</h3>
                    <p>
                        Your GPU setup ({results.gpuConfig}) can handle this model with {results.vramMargin}GB VRAM to spare.
                        Estimated performance: {results.tokensPerSecond} tokens/second.
                    </p>
                </div>
            );
        } else if (results.isBorderline) {
            return (
                <div style={{ ...baseStyles, backgroundColor: '#fef3c7', border: '1px solid #fbbf24' }}>
                    <h3 style={{ color: '#b45309' }}>Borderline Configuration</h3>
                    <p>
                        Your GPU setup will work but with only {results.vramMargin}GB VRAM margin. Consider reducing context length or using more GPUs for better performance.
                        Estimated performance: {results.tokensPerSecond} tokens/second.
                    </p>
                </div>
            );
        } else {
            return (
                <div style={{ ...baseStyles, backgroundColor: '#fee2e2', border: '1px solid #f87171' }}>
                    <h3 style={{ color: '#b91c1c' }}>Insufficient VRAM</h3>
                    <p>
                        Your GPU setup lacks {Math.abs(results.vramMargin)}GB VRAM. Consider:
                    </p>
                    <ul style={{ marginLeft: '20px', marginTop: '10px' }}>
                        <li>Using more GPUs</li>
                        <li>Using higher quantization (e.g., 8-bit)</li>
                        <li>Reducing context length</li>
                        <li>Using a GPU with more VRAM</li>
                    </ul>
                </div>
            );
        }
    };

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ marginBottom: '30px' }}>Ollama GPU Compatibility Calculator</h2>
            <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="parameters" style={{ display: 'block', marginBottom: '5px', textAlign: 'left', fontSize: '16px' }}>Number of Parameters</label>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <input
                            id="parameters"
                            type="number"
                            placeholder="e.g., 7"
                            value={parameters}
                            onChange={(e) => setParameters(e.target.value)}
                            style={{ flex: 1, padding: '12px', height: '24px', fontSize: '16px', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                        />
                        <span style={{ marginLeft: '10px', fontSize: '16px' }}>billion</span>
                    </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="gpu" style={{ display: 'block', marginBottom: '5px', textAlign: 'left', fontSize: '16px' }}>GPU Model</label>
                    <select
                        id="gpu"
                        value={gpuModel}
                        onChange={(e) => setGpuModel(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            height: '50px',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            backgroundColor: 'white'
                        }}
                    >
                        <option value="">Select GPU model</option>
                        {Object.entries(gpuSpecs).map(([key, gpu]) => (
                            <option key={key} value={key}>
                                {gpu.name} ({gpu.vram}GB)
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', textAlign: 'left', fontSize: '16px' }}>
                        <input
                            type="checkbox"
                            checked={useCustomGpu}
                            onChange={(e) => {
                                setUseCustomGpu(e.target.checked);
                                if (!e.target.checked) {
                                    setCustomGpuRam('');
                                }
                            }}
                            style={{ marginRight: '8px' }}
                        />
                        Use Custom GPU RAM
                    </label>
                    {useCustomGpu && (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                            <input
                                type="number"
                                placeholder="Enter GPU RAM"
                                value={customGpuRam}
                                onChange={(e) => setCustomGpuRam(e.target.value)}
                                style={{ 
                                    flex: 1, 
                                    padding: '12px', 
                                    height: '24px', 
                                    fontSize: '16px', 
                                    borderRadius: '8px', 
                                    border: '1px solid #e5e7eb' 
                                }}
                            />
                            <span style={{ marginLeft: '10px', fontSize: '16px' }}>GB</span>
                        </div>
                    )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="gpuCount" style={{ display: 'block', marginBottom: '5px', textAlign: 'left', fontSize: '16px' }}>Number of GPUs</label>
                    <select
                        id="gpuCount"
                        value={gpuCount}
                        onChange={(e) => setGpuCount(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            height: '50px',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            backgroundColor: 'white'
                        }}
                    >
                        {[1, 2, 3, 4, 8].map((count) => (
                            <option key={count} value={count.toString()}>
                                {count} GPU{count > 1 ? 's' : ''}
                            </option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="quantization" style={{ display: 'block', marginBottom: '5px', textAlign: 'left', fontSize: '16px' }}>Quantization</label>
                    <select
                        id="quantization"
                        value={quantization}
                        onChange={(e) => setQuantization(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '12px',
                            height: '50px',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            backgroundColor: 'white'
                        }}
                    >
                        <option value="32">32-bit (FP32)</option>
                        <option value="16">16-bit (FP16)</option>
                        <option value="8">8-bit (INT8)</option>
                        <option value="4">4-bit (INT4)</option>
                    </select>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '5px', textAlign: 'left', fontSize: '16px' }}>Context Length: {contextLength}</label>
                    <select
                        value={contextLength}
                        onChange={(e) => setContextLength(parseInt(e.target.value))}
                        style={{
                            width: '100%',
                            padding: '12px',
                            height: '50px',
                            fontSize: '16px',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb',
                            appearance: 'none',
                            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 12px center',
                            backgroundColor: 'white'
                        }}
                    >
                        {[4096, 8192, 16384, 32768, 65536, 131072].map((length) => (
                            <option key={length} value={length}>
                                {length / 1024}k tokens
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="submit"
                    style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <rect x="4" y="2" width="16" height="20" rx="2" />
                        <line x1="8" y1="6" x2="16" y2="6" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                        <line x1="8" y1="18" x2="16" y2="18" />
                    </svg>
                    Check Compatibility
                </button>
            </form>

            {results && (
                <div>
                    {getCompatibilityMessage()}

                    <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '4px', textAlign: 'left' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 'normal', marginBottom: '2px', display: 'block' }}>Required GPU VRAM:</label>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#2563eb', margin: '0 0 10px 0' }}>{results.gpuRAM} GB</p>
                            <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.2', marginTop: '8px' }}>
                                <p style={{ margin: '0' }}>Base Model: {results.modelSize} GB</p>
                                <p style={{ margin: '0' }}>KV Cache: {results.kvCache} GB</p>
                            </div>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 'normal', marginBottom: '2px', display: 'block' }}>Available VRAM:</label>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#059669', margin: '0 0 10px 0' }}>{results.availableVRAM} GB</p>
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 'normal', marginBottom: '2px', display: 'block' }}>Required System RAM:</label>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#7c3aed', margin: '0 0 10px 0' }}>{results.systemRAM} GB</p>
                        </div>
                        {results.tokensPerSecond && (
                            <div>
                                <label style={{ fontSize: '14px', fontWeight: 'normal', marginBottom: '2px', display: 'block' }}>
                                    Estimated Performance:
                                </label>
                                <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#d97706', margin: '0 0 10px 0' }}>
                                    {results.tokensPerSecond} tokens/second
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '20px', textAlign: 'left' }}>
                <p>Notes:</p>
                <ul style={{ paddingLeft: '20px', textAlign: 'left' }}>
                    <li>Multi-GPU setups may have slightly lower efficiency than theoretical maximum</li>
                    <li>Some VRAM is reserved for system operations</li>
                    <li>Actual performance may vary based on other running applications</li>
                    <li>Consider leaving 1-2GB VRAM margin for optimal performance</li>
                    <li>H100, A100, A40, and V100 GPUs are designed for data centers and may not be available for personal use</li>
                    <li>Tokens per second estimates are approximate and may vary based on specific model architecture and implementation</li>
                </ul>
            </div>
        </div>
    );
};

export default OllamaGPUCalculator;
