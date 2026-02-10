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
    'l40s': { name: 'L40S', vram: 48, generation: 'Ada Lovelace', tflops: 733, tdp: 350 },  // 48GB GDDR6, 733 TFLOPS FP16, 350W
    'l4': { name: 'L4', vram: 24, generation: 'Ada Lovelace', tflops: 242, tdp: 72 },  // 24GB GDDR6, 242 TFLOPS FP16, 72W
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
	'rx9070xt': { name: 'Radeon RX 9070 XT', vram: 16, generation: 'RDNA4', tflops: 195, tdp: 304 },  // taken from AMD.com spec sheet, TFLOPS from peak half-precision (FP16 Matrix) performance
	'rx9070': { name: 'Radeon RX 9070', vram: 16, generation: 'RDNA4', tflops: 145, tdp: 220 },  
	'rx9060xt1': { name: 'Radeon RX 9060 XT', vram: 16, generation: 'RDNA4', tflops: 103, tdp: 160 },  
	'rx9060xt2': { name: 'Radeon RX 9060 XT', vram: 8, generation: 'RDNA4', tflops: 103, tdp: 150 },  
	'rx9060xt3': { name: 'Radeon RX 9060 XT LP', vram: 16, generation: 'RDNA4', tflops: 100, tdp: 140 },  
	'rx9060': { name: 'Radeon RX 9060', vram: 8, generation: 'RDNA4', tflops: 86, tdp: 132 },  
	'radaipro': { name: 'Radeon AI Pro R9700', vram: 32, generation: 'RDNA4', tflops: 191, tdp: 300 },  
	'radaipros': { name: 'Radeon AI Pro R9700S', vram: 32, generation: 'RDNA4', tflops: 191, tdp: 300 },  // I might not be looking carefully enough, but... this + the GPU above seem basically identical 
	'radaiprod': { name: 'Radeon AI Pro R9700D', vram: 32, generation: 'RDNA4', tflops: 99, tdp: 150 },
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
    const [validationErrors, setValidationErrors] = useState({});

    const calculateOllamaRAM = useCallback(() => {
        setValidationErrors({});

        const paramCount = parseFloat(parameters);
        const paramsValid = parameters.trim() !== '' && !Number.isNaN(paramCount) && paramCount > 0;

        if (!paramsValid) {
            if (parameters.trim() !== '') {
                setValidationErrors({ parameters: 'Please enter a valid number greater than 0 (e.g. 7 for 7B)' });
            }
            setResults(null);
            return;
        }

        if (!gpuConfigs.some(config => config.gpuModel)) {
            setValidationErrors({ gpu: 'Please select at least one GPU model' });
            setResults(null);
            return;
        }

        const invalidGpuCount = gpuConfigs.some((config) => {
            const n = parseInt(config.count, 10);
            return config.gpuModel && (n <= 0 || Number.isNaN(n));
        });
        if (invalidGpuCount) {
            setValidationErrors({ gpuCount: 'Invalid GPU count. Please use 1 or more per slot.' });
            setResults(null);
            return;
        }

        // Track calculation event
        ReactGA.event({
            category: 'Calculator',
            action: 'Calculate',
            label: 'Mixed GPU Configuration',
            value: Math.round(paramCount)
        });
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
            setValidationErrors({ calculation: 'An error occurred during calculations. Please check your inputs and try again.' });
            setResults(null);
        }
    }, [parameters, quantization, contextLength, gpuConfigs]);

    useEffect(() => {
        if (!parameters.trim() && !gpuConfigs.some(config => config.gpuModel)) {
            setResults(null);
            setValidationErrors({});
            return;
        }
        calculateOllamaRAM();
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
        
        const paramNum = parseFloat(parameters);
        if (!Number.isNaN(paramNum)) {
            if (paramNum <= 3) {
                warnings.push('3B model: Minimum 8GB RAM recommended');
            } else if (paramNum <= 7) {
                warnings.push('7B model: Minimum 16GB RAM recommended');
            } else if (paramNum <= 13) {
                warnings.push('13B model: Minimum 32GB RAM recommended');
            } else {
                warnings.push('70B model: Minimum 64GB RAM recommended');
            }
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
            borderRadius: '8px',
            padding: '15px',
            marginBottom: '15px',
            border: '1px solid',
            transition: 'all 0.3s ease'
        };

        // Add warnings section if there are any
        const warningsSection = warnings.length > 0 ? (
            <div style={{ marginTop: '15px' }}>
                <p style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '8px',
                    color: 'inherit'
                }}>
                    Warnings:
                </p>
                <ul style={{ 
                    marginLeft: '20px', 
                    marginTop: '5px',
                    color: 'inherit'
                }}>
                    {warnings.map((warning, index) => (
                        <li key={index} style={{ marginBottom: '4px' }}>{warning}</li>
                    ))}
                </ul>
            </div>
        ) : null;

        if (results.isCompatible && !results.isBorderline) {
            return (
                <div style={{ 
                    ...baseStyles, 
                    backgroundColor: 'var(--success-bg)', 
                    borderColor: 'var(--success-border)',
                    color: 'var(--success-text)'
                }}>
                    <h3 style={{ 
                        color: 'var(--success-text)',
                        marginTop: '0',
                        marginBottom: '10px'
                    }}>
                        ✅ Compatible Configuration
                    </h3>
                    <p style={{ 
                        margin: '0 0 10px 0',
                        lineHeight: '1.5'
                    }}>
                        Your GPU setup ({results.gpuConfig}) can handle this model with {results.vramMargin}GB VRAM to spare.
                        Estimated performance: {results.tokensPerSecond} tokens/second.
                    </p>
                    {warningsSection}
                </div>
            );
        } else if (results.isBorderline) {
            return (
                <div style={{ 
                    ...baseStyles, 
                    backgroundColor: 'var(--warning-bg)', 
                    borderColor: 'var(--warning-border)',
                    color: 'var(--warning-text)'
                }}>
                    <h3 style={{ 
                        color: 'var(--warning-text)',
                        marginTop: '0',
                        marginBottom: '10px'
                    }}>
                        ⚠️ Borderline Configuration
                    </h3>
                    <p style={{ 
                        margin: '0 0 10px 0',
                        lineHeight: '1.5'
                    }}>
                        Your GPU setup will work but with only {results.vramMargin}GB VRAM margin. Consider reducing context length or using more GPUs for better performance.
                        Estimated performance: {results.tokensPerSecond} tokens/second.
                    </p>
                    {warningsSection}
                </div>
            );
        } else {
            return (
                <div style={{ 
                    ...baseStyles, 
                    backgroundColor: 'var(--error-bg)', 
                    borderColor: 'var(--error-border)',
                    color: 'var(--error-text)'
                }}>
                    <h3 style={{ 
                        color: 'var(--error-text)',
                        marginTop: '0',
                        marginBottom: '10px'
                    }}>
                        ❌ Insufficient VRAM
                    </h3>
                    <p style={{ 
                        margin: '0 0 10px 0',
                        lineHeight: '1.5'
                    }}>
                        Your GPU setup lacks {Math.abs(results.vramMargin)}GB VRAM. Consider:
                    </p>
                    <ul style={{ 
                        marginLeft: '20px', 
                        marginTop: '10px',
                        color: 'inherit'
                    }}>
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
        <div style={{ 
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
                    <label style={{
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
                        {results.gpuRAM} GB VRAM needed
                        {' · '}
                        {results.isCompatible && !results.isBorderline && 'Compatible'}
                        {results.isBorderline && 'Borderline'}
                        {!results.isCompatible && 'Insufficient VRAM'}
                    </p>
                    {getCompatibilityMessage()}

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
                                {results.gpuRAM} GB
                            </p>
                            <div style={{ 
                                fontSize: '14px', 
                                color: 'var(--text-tertiary)', 
                                lineHeight: '1.2', 
                                marginTop: '8px' 
                            }}>
                                <p style={{ margin: '0' }}>Base Model: {results.modelSize} GB</p>
                                <p style={{ margin: '0' }}>KV Cache: {results.kvCache} GB</p>
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
                                {results.availableVRAM} GB
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
                                Required System RAM:
                            </label>
                            <p style={{ 
                                fontSize: '24px', 
                                fontWeight: 'bold', 
                                color: 'var(--accent-tertiary)', 
                                margin: '0 0 10px 0' 
                            }}>
                                {results.systemRAM} GB
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
