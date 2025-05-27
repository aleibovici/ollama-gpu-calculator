import React, { useState, useEffect, useCallback } from 'react';
import ReactGA from 'react-ga4';

// More accurate system RAM multipliers based on quantization
const getSystemRAMMultiplier = (quantBits) => {
    switch(quantBits) {
        case 32: return 2.0;    // FP32 needs more headroom
        case 16: return 1.5;    // FP16 baseline
        case 8:  return 1.2;    // INT8 more efficient
        case 4:  return 1.1;    // INT4 most efficient
        default: return 1.5;
    }
};

const unsortedGpuSpecs = {
    // GPU specifications with TFLOPS values in FP16/mixed precision and TDP in watts
    'h100': { name: 'H100', vram: 80, generation: 'Hopper', tflops: 1979, tdp: 700 },  // Correct: 700W SXM
    'a100-80gb': { name: 'A100 80GB', vram: 80, generation: 'Ampere', tflops: 312, tdp: 400 },  // Correct: 400W SXM
    'a100-40gb': { name: 'A100 40GB', vram: 40, generation: 'Ampere', tflops: 312, tdp: 400 },  // Correct: 400W SXM
    'a40': { name: 'A40', vram: 48, generation: 'Ampere', tflops: 149.8, tdp: 300 },  // Correct: 300W
    'v100-32gb': { name: 'V100 32GB', vram: 32, generation: 'Volta', tflops: 125, tdp: 300 },  // Correct: 300W SXM2
    'v100-16gb': { name: 'V100 16GB', vram: 16, generation: 'Volta', tflops: 125, tdp: 300 },  // Correct: 300W SXM2
    'rtx4090': { name: 'RTX 4090', vram: 24, generation: 'Ada Lovelace', tflops: 82.6, tdp: 450 },  // Correct: 450W
    'rtx4080': { name: 'RTX 4080', vram: 16, generation: 'Ada Lovelace', tflops: 65, tdp: 320 },  // Correct: 320W
    'rtx4070super': { name: 'RTX 4070 Super', vram: 12, generation: 'Ada Lovelace', tflops: 35.48, tdp: 220 },  // Correct: 220W
    'rtx3090ti': { name: 'RTX 3090 Ti', vram: 24, generation: 'Ampere', tflops: 40, tdp: 450 },  // Correct: 450W
    'rtx3090': { name: 'RTX 3090', vram: 24, generation: 'Ampere', tflops: 35.6, tdp: 350 },  // Correct: 350W
    'rtx3080ti': { name: 'RTX 3080 Ti', vram: 12, generation: 'Ampere', tflops: 34.1, tdp: 350 },  // Correct: 350W
    'rtx3080': { name: 'RTX 3080', vram: 10, generation: 'Ampere', tflops: 29.8, tdp: 320 },  // Correct: 320W
    'a6000': { name: 'A6000', vram: 48, generation: 'Ampere', tflops: 38.7, tdp: 300 },  // Correct: 300W
    'a5000': { name: 'A5000', vram: 24, generation: 'Ampere', tflops: 27.8, tdp: 230 },  // Correct: 230W
    'a4000': { name: 'A4000', vram: 16, generation: 'Ampere', tflops: 19.2, tdp: 140 },  // Correct: 140W
    'rtx4060ti': { name: 'RTX 4060 Ti', vram: 8, generation: 'Ada Lovelace', tflops: 22.1, tdp: 160 },  // Correct: 160W
    'rtx4060ti16gb': { name: 'RTX 4060 Ti 16GB', vram: 16, generation: 'Ada Lovelace', tflops: 22.06, tdp: 165 },  // Correct: 165W
    'gtx1080ti': { name: 'GTX 1080 Ti', vram: 11, generation: 'Pascal', tflops: 11.3, tdp: 250 },  // Correct: 250W
    'gtx1070ti': { name: 'GTX 1070 Ti', vram: 8, generation: 'Pascal', tflops: 8.1, tdp: 180 },  // Correct: 180W
    'teslap40': { name: 'Tesla P40', vram: 24, generation: 'Pascal', tflops: 12, tdp: 250 },  // Correct: 250W
    'teslap100': { name: 'Tesla P100', vram: 16, generation: 'Pascal', tflops: 9.3, tdp: 250 },  // Correct: 250W PCIe
    'gtx1070': { name: 'GTX 1070', vram: 8, generation: 'Pascal', tflops: 6.5, tdp: 150 },  // Correct: 150W
    'gtx1060': { name: 'GTX 1060', vram: 6, generation: 'Pascal', tflops: 4.4, tdp: 120 },  // Correct: 120W
    'm4': { name: 'Apple M4', vram: 16, generation: 'Apple Silicon', tflops: 4.6, tdp: 30 },  // Estimated: Not released yet
    'm3-max': { name: 'Apple M3 Max', vram: 40, generation: 'Apple Silicon', tflops: 4.5, tdp: 92 },  // Updated: ~92W max package power
    'm3-pro': { name: 'Apple M3 Pro', vram: 18, generation: 'Apple Silicon', tflops: 4.3, tdp: 67 },  // Updated: ~67W max package power
    'm3': { name: 'Apple M3', vram: 8, generation: 'Apple Silicon', tflops: 4.1, tdp: 45 },  // Updated: ~45W max package power
    'rx7900xtx': { name: 'Radeon RX 7900 XTX', vram: 24, generation: 'RDNA3', tflops: 61, tdp: 355 },  // Correct: 355W
    'rx7900xt': { name: 'Radeon RX 7900 XT', vram: 20, generation: 'RDNA3', tflops: 52, tdp: 315 },  // Correct: 315W
    'rx7900gre': { name: 'Radeon RX 7900 GRE', vram: 16, generation: 'RDNA3', tflops: 46, tdp: 260 },  // Correct: 260W
    'rx7800xt': { name: 'Radeon RX 7800 XT', vram: 16, generation: 'RDNA3', tflops: 37, tdp: 263 },  // Correct: 263W
    'rx7700xt': { name: 'Radeon RX 7700 XT', vram: 12, generation: 'RDNA3', tflops: 35, tdp: 245 },  // Correct: 245W
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

const calculateRAMRequirements = (paramCount, quantBits, contextLength, gpuConfigs) => {
    // Add model size-based RAM requirements per Ollama docs
    const getMinimumRAM = (paramCount) => {
        if (paramCount <= 3) return 8;  // 3B models need 8GB
        if (paramCount <= 7) return 16; // 7B models need 16GB
        if (paramCount <= 13) return 32; // 13B models need 32GB
        return 64; // 70B models need 64GB
    };

    const minimumSystemRAM = getMinimumRAM(paramCount);
    
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
    const systemRAMMultiplier = getSystemRAMMultiplier(quantBits);
    const totalSystemRAM = totalGPURAM * systemRAMMultiplier;

    // Calculate total available VRAM across all GPU configs
    let totalAvailableVRAM = 0;
    gpuConfigs.forEach(config => {
        if (config.gpuModel) {
            const numGPUs = parseInt(config.count);
            const gpuVRAM = gpuSpecs[config.gpuModel].vram * numGPUs;
            totalAvailableVRAM += gpuVRAM;
        }
    });

    // Fix: Check if using multiple GPUs by comparing against first GPU's VRAM
    const firstGpuVRAM = gpuConfigs[0].gpuModel ? gpuSpecs[gpuConfigs[0].gpuModel].vram : 0;
    const multiGpuEfficiency = totalAvailableVRAM > firstGpuVRAM ? 0.9 : 1;
    const effectiveVRAM = totalAvailableVRAM * multiGpuEfficiency;

    // Add storage requirement calculation (approximately 10GB base + model size)
    const storageRequired = 10 + baseModelSizeGB;
    
    // Add CPU core requirements
    const recommendedCores = paramCount > 13 ? 8 : 4;
    
    return {
        baseModelSizeGB,
        kvCacheSize,
        totalGPURAM,
        totalSystemRAM,
        totalAvailableVRAM,
        effectiveVRAM,
        vramMargin: totalAvailableVRAM - totalGPURAM,
        minimumSystemRAM,
        storageRequired,
        recommendedCores,
        // Add warning if system requirements not met
        systemRequirementsMet: totalSystemRAM >= minimumSystemRAM
    };
};

const calculateTokensPerSecond = (paramCount, numGPUs, gpuModel, quantization) => {
    if (!gpuModel) return null;

    const selectedGPU = gpuSpecs[gpuModel];
    const baseTPS = (selectedGPU.tflops * 1e12) / (6 * paramCount * 1e9) * 0.05;
    
    // More accurate quantization factors based on research
    let quantizationFactor = 1;  // FP16 baseline
    switch(quantization) {
        case '32':
            quantizationFactor = 0.5;  // FP32 is slower
            break;
        case '8':
            quantizationFactor = 1.8;  // INT8 is significantly faster
            break;
        case '4':
            quantizationFactor = 2.2;  // INT4 provides highest throughput
            break;
        default:
            quantizationFactor = 1;  // FP16 baseline (16-bit or unknown)
            break;
    }

    let totalTPS = baseTPS * quantizationFactor;
    for(let i = 1; i < numGPUs; i++) {
        totalTPS += baseTPS * 0.9 * quantizationFactor;
    }
    
    return Math.round(Math.min(totalTPS, 200));
};

const calculatePowerConsumption = (gpuConfigs, paramCount, quantization) => {
    let totalPower = 0;
    let powerDetails = [];

    // Calculate base system overhead based on model size
    const getBaseSystemOverhead = (paramCount) => {
        if (paramCount <= 3) return 75;  // Small models
        if (paramCount <= 7) return 100; // Medium models
        if (paramCount <= 13) return 150; // Large models
        return 200; // Very large models
    };

    // Get GPU utilization factor based on quantization
    const getUtilizationFactor = (quantization) => {
        switch(quantization) {
            case '32': return 0.85;  // FP32 uses more power
            case '16': return 0.75;  // FP16 baseline
            case '8': return 0.65;   // INT8 more efficient
            case '4': return 0.60;   // INT4 most efficient
            default: return 0.75;
        }
    };

    const utilizationFactor = getUtilizationFactor(quantization);
    const baseSystemOverhead = getBaseSystemOverhead(paramCount);
    let systemOverhead = baseSystemOverhead;

    gpuConfigs.forEach(config => {
        if (config.gpuModel) {
            const gpu = gpuSpecs[config.gpuModel];
            const numGPUs = parseInt(config.count);
            
            // Calculate power for each GPU with utilization factor
            const gpuPower = Math.round(gpu.tdp * utilizationFactor);
            
            // Add multi-GPU overhead (10% extra per additional GPU)
            const multiGpuOverhead = numGPUs > 1 ? (numGPUs - 1) * 0.1 * gpuPower : 0;
            const totalGpuPower = Math.round((gpuPower * numGPUs) + multiGpuOverhead);
            
            totalPower += totalGpuPower;
            powerDetails.push({
                name: gpu.name,
                count: numGPUs,
                power: totalGpuPower,
                baseWatts: gpuPower
            });

            // Increase system overhead for multi-GPU setups
            systemOverhead += (numGPUs - 1) * 25; // Additional overhead per GPU
        }
    });

    totalPower += systemOverhead;

    return {
        totalPower: Math.round(totalPower),
        powerDetails,
        systemOverhead,
        utilizationFactor
    };
};

const OllamaGPUCalculator = () => {
    const [parameters, setParameters] = useState('');
    const [quantization, setQuantization] = useState('16');
    const [contextLength, setContextLength] = useState(4096);
    const [gpuConfigs, setGpuConfigs] = useState([{ gpuModel: '', count: '1' }]);
    const [results, setResults] = useState(null);

    const calculateOllamaRAM = useCallback(() => {
        // Input validation
        if (!parameters || isNaN(parameters) || parameters <= 0) {
            alert('Please enter a valid number of parameters greater than 0');
            return;
        }

        if (!gpuConfigs.some(config => config.gpuModel)) {
            alert('Please select at least one GPU model');
            return;
        }

        // Validate GPU counts
        const invalidGpuCount = gpuConfigs.some(config => 
            config.gpuModel && (parseInt(config.count) <= 0 || isNaN(parseInt(config.count)))
        );
        if (invalidGpuCount) {
            alert('Invalid GPU count detected. Please check your GPU configuration.');
            return;
        }

        // Track calculation event
        ReactGA.event({
            category: 'Calculator',
            action: 'Calculate',
            label: 'Mixed GPU Configuration',
            value: parseInt(parameters)
        });

        const paramCount = parseFloat(parameters);
        const quantBits = parseInt(quantization);

        try {
            const ramCalc = calculateRAMRequirements(
                paramCount,
                quantBits,
                contextLength,
                gpuConfigs
            );

            // Calculate power consumption
            const powerCalc = calculatePowerConsumption(gpuConfigs, paramCount, quantization);

            // Generate warnings based on configuration
            let warnings = [];
            
            // Context length warnings
            if (contextLength > 32768 && quantization === '16') {
                warnings.push('Long context with FP16 may require significant VRAM');
            }
            
            // Multi-GPU warnings
            if (gpuConfigs.length > 2) {
                warnings.push('Multi-GPU scaling efficiency decreases with more than 2 GPUs');
            }
            
            // Architecture-specific warnings
            gpuConfigs.forEach(config => {
                if (config.gpuModel && gpuSpecs[config.gpuModel].generation === 'Pascal') {
                    warnings.push('Pascal architecture may have limited support for newer optimizations');
                }
            });

            // Parameter size warnings
            if (paramCount > 13) {
                warnings.push('Models larger than 13B parameters may require multiple GPUs for optimal performance');
            }

            // Mixed architecture warnings
            const generations = new Set(gpuConfigs.map(config => 
                config.gpuModel ? gpuSpecs[config.gpuModel].generation : null
            ).filter(Boolean));
            if (generations.size > 1) {
                warnings.push('Mixed GPU generations may result in reduced performance');
            }

            // Calculate total tokens per second across all GPUs
            let totalTPS = 0;
            gpuConfigs.forEach(config => {
                if (config.gpuModel) {
                    const gpuTPS = calculateTokensPerSecond(
                        paramCount,
                        parseInt(config.count),
                        config.gpuModel,
                        quantization
                    );
                    totalTPS += gpuTPS || 0; // Handle null return value
                }
            });

            // Format GPU configuration string
            const gpuConfigString = gpuConfigs
                .filter(config => config.gpuModel)
                .map(config => `${config.count}x ${gpuSpecs[config.gpuModel].name}`)
                .join(' + ');

            setResults({
                ...ramCalc,
                gpuRAM: ramCalc.totalGPURAM.toFixed(2),
                systemRAM: ramCalc.totalSystemRAM.toFixed(2),
                modelSize: ramCalc.baseModelSizeGB.toFixed(2),
                kvCache: ramCalc.kvCacheSize.toFixed(2),
                availableVRAM: ramCalc.effectiveVRAM.toFixed(2),
                vramMargin: ramCalc.vramMargin.toFixed(2),
                isCompatible: ramCalc.effectiveVRAM >= ramCalc.totalGPURAM,
                isBorderline: ramCalc.vramMargin > 0 && ramCalc.vramMargin < 2,
                gpuConfig: gpuConfigString,
                tokensPerSecond: Math.round(Math.min(totalTPS, 200)),
                warnings: warnings,
                powerConsumption: powerCalc  // Add power consumption to results
            });
        } catch (error) {
            console.error('Calculation error:', error);
            alert('An error occurred during calculations. Please check your inputs and try again.');
        }
    }, [parameters, quantization, contextLength, gpuConfigs]);

    useEffect(() => {
        if (parameters && gpuConfigs.some(config => config.gpuModel)) {
            calculateOllamaRAM();
        }
    }, [
        parameters,
        quantization,
        contextLength,
        gpuConfigs,
        calculateOllamaRAM
    ]);

    const handleSubmit = (e) => {
        e.preventDefault();
    };

    const getCompatibilityMessage = () => {
        if (!results) return null;
        
        let warnings = [];
        
        // Add model size-specific warnings
        if (parameters <= 3) {
            warnings.push('3B model: Minimum 8GB RAM recommended');
        } else if (parameters <= 7) {
            warnings.push('7B model: Minimum 16GB RAM recommended');
        } else if (parameters <= 13) {
            warnings.push('13B model: Minimum 32GB RAM recommended');
        } else {
            warnings.push('70B model: Minimum 64GB RAM recommended');
        }
        
        // Add OS-specific warnings
        if (gpuConfigs.some(config => config.gpuModel?.includes('rx'))) {
            warnings.push('AMD GPUs are supported on Windows and Linux with ROCm');
        }

        // Add quantization-specific warnings
        if (quantization === '4') {
            warnings.push('4-bit quantization provides fastest inference but may impact model accuracy');
        } else if (quantization === '8') {
            warnings.push('8-bit quantization offers good balance of speed and accuracy');
        }

        // Add context length warnings
        if (contextLength > 32768) {
            warnings.push('Extended context length requires significantly more VRAM and may impact performance');
        }

        const baseStyles = {
            textAlign: 'left',
            borderRadius: '4px',
            padding: '10px',
            marginBottom: '10px'
        };

        // Add warnings section if there are any
        const warningsSection = warnings.length > 0 ? (
            <div style={{ marginTop: '10px' }}>
                <p style={{ fontWeight: 'bold', marginBottom: '5px' }}>Warnings:</p>
                <ul style={{ marginLeft: '20px', marginTop: '5px' }}>
                    {warnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                    ))}
                </ul>
            </div>
        ) : null;

        if (results.isCompatible && !results.isBorderline) {
            return (
                <div style={{ ...baseStyles, backgroundColor: '#d1fae5', border: '1px solid #34d399' }}>
                    <h3 style={{ color: '#047857' }}>Compatible Configuration</h3>
                    <p>
                        Your GPU setup ({results.gpuConfig}) can handle this model with {results.vramMargin}GB VRAM to spare.
                        Estimated performance: {results.tokensPerSecond} tokens/second.
                    </p>
                    {warningsSection}
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
                    {warningsSection}
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
                    {warningsSection}
                </div>
            );
        }
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
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
            <h2 style={{ marginBottom: '10px' }}>Ollama GPU Compatibility Calculator</h2>
            <br />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '30px' }}>
                <a 
                    href="https://www.reddit.com/r/ollama/comments/1gdux20/ollama_gpu_compatibility_calculator/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        color: '#FF4500',
                        textDecoration: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s',
                        hover: {
                            backgroundColor: '#f0f0f0'
                        }
                    }}
                >
                    <svg height="24" width="24" viewBox="0 0 24 24">
                        <path fill="#FF4500" d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
                    </svg>
                    <span style={{ marginLeft: '8px' }}>View on Reddit</span>
                </a>
                <a 
                    href="https://github.com/aleibovici/ollama-gpu-calculator"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center',
                        color: '#24292F',
                        textDecoration: 'none',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        transition: 'background-color 0.2s',
                        hover: {
                            backgroundColor: '#f0f0f0'
                        }
                    }}
                >
                    <svg height="24" width="24" viewBox="0 0 16 16" version="1.1">
                        <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" fill="#24292F"/>
                    </svg>
                    <span style={{ marginLeft: '8px' }}>View on GitHub</span>
                </a>
            </div>
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
                    <label style={{ display: 'block', marginBottom: '5px', textAlign: 'left', fontSize: '16px' }}>GPU Configuration</label>
                    {gpuConfigs.map((config, index) => (
                        <div key={index} style={{ 
                            display: 'flex', 
                            gap: '10px', 
                            marginBottom: '10px', 
                            alignItems: 'center',
                            width: '100%'
                        }}>
                            <select
                                value={config.gpuModel}
                                onChange={(e) => updateGpuConfig(index, 'gpuModel', e.target.value)}
                                style={{
                                    width: '380px',
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
                            <select
                                value={config.count}
                                onChange={(e) => updateGpuConfig(index, 'count', e.target.value)}
                                style={{
                                    width: '120px',
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
                            {index > 0 && (
                                <div style={{ marginLeft: 'auto' }}>
                                    <button
                                        type="button"
                                        onClick={() => removeGpuConfig(index)}
                                        style={{
                                            width: '80px',
                                            height: '50px',
                                            padding: '8px',
                                            backgroundColor: '#ef4444',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '14px'
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
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            marginTop: '10px'
                        }}
                    >
                        + Add Another GPU
                    </button>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label htmlFor="quantization" style={{ display: 'block', marginBottom: '5px', textAlign: 'left', fontSize: '16px' }}>Quantization</label>
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
                        onChange={(e) => handleContextLengthChange(e.target.value)}
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
                        <div style={{ marginBottom: '20px', marginTop: '20px' }}>
                            <label style={{ fontSize: '14px', fontWeight: 'normal', marginBottom: '2px', display: 'block' }}>
                                Estimated Power Consumption:
                            </label>
                            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc2626', margin: '0 0 10px 0' }}>
                                {results.powerConsumption.totalPower}W
                            </p>
                            <div style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.2', marginTop: '8px' }}>
                                {results.powerConsumption.powerDetails.map((detail, index) => (
                                    <p key={index} style={{ margin: '0' }}>
                                        {detail.count}x {detail.name}: {detail.power}W ({detail.baseWatts}W per GPU at {Math.round(results.powerConsumption.utilizationFactor * 100)}% utilization)
                                    </p>
                                ))}
                                <p style={{ margin: '0' }}>System Overhead: {results.powerConsumption.systemOverhead}W</p>
                            </div>
                        </div>
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
                    <li>Minimum system requirements: 8GB RAM, 10GB storage space</li>
                    <li>Apple Silicon devices will utilize Neural Engine for additional performance</li>
                    <li>Local execution ensures privacy and reduced latency</li>
                    <li>Performance may vary based on model quantization and system capabilities</li>
                    <li>Supported OS: Linux (Ubuntu 18.04+), macOS (11+), Windows (via WSL2)</li>
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
        </div>
    );
};

export default OllamaGPUCalculator;
