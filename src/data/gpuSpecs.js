// GPU specifications:
//   vram:       GB of VRAM (or unified memory pool size when unifiedMemory)
//   tflops:     peak FP16 tensor/matrix throughput, dense (no sparsity).
//               Kept mainly for display; not used in the bandwidth-bound TPS model.
//   bandwidth:  peak memory bandwidth in GB/s (primary driver of decode TPS).
//   tdp:        board power in watts.
//   unifiedMemory: optional — VRAM and system RAM are the same pool.
const unsortedGpuSpecs = {
    // NVIDIA data-center
    'b200':      { name: 'B200',           vram: 180, generation: 'Blackwell',    tflops: 2250,  bandwidth: 7700, tdp: 1000 },
    'h200':      { name: 'H200',           vram: 141, generation: 'Hopper',       tflops: 989,   bandwidth: 4800, tdp: 700 },
    'h100':      { name: 'H100',           vram: 80,  generation: 'Hopper',       tflops: 989,   bandwidth: 3350, tdp: 700 },
    'a100-80gb': { name: 'A100 80GB',      vram: 80,  generation: 'Ampere',       tflops: 312,   bandwidth: 2039, tdp: 400 },
    'a100-40gb': { name: 'A100 40GB',      vram: 40,  generation: 'Ampere',       tflops: 312,   bandwidth: 1555, tdp: 400 },
    'a2':        { name: 'A2',             vram: 16,  generation: 'Ampere',       tflops: 15.6,  bandwidth: 200,  tdp: 60  },
    'l40s':      { name: 'L40S',           vram: 48,  generation: 'Ada Lovelace', tflops: 733,   bandwidth: 864,  tdp: 350 },
    'l40':       { name: 'L40',            vram: 48,  generation: 'Ada Lovelace', tflops: 362,   bandwidth: 864,  tdp: 300 },
    'l4':        { name: 'L4',             vram: 24,  generation: 'Ada Lovelace', tflops: 121.2, bandwidth: 300,  tdp: 72  },
    'm10':       { name: 'M10',            vram: 32,  generation: 'Maxwell',      tflops: 5.56,  bandwidth: 83,   tdp: 225 },
    'a40':       { name: 'A40',            vram: 48,  generation: 'Ampere',       tflops: 149.8, bandwidth: 696,  tdp: 300 },
    'v100-32gb': { name: 'V100 32GB',      vram: 32,  generation: 'Volta',        tflops: 125,   bandwidth: 900,  tdp: 300 },
    'v100-16gb': { name: 'V100 16GB',      vram: 16,  generation: 'Volta',        tflops: 125,   bandwidth: 900,  tdp: 300 },

    // NVIDIA DGX Spark (GB10) — coherent unified system memory, not discrete HBM
    'dgx-spark': {
        name: 'DGX Spark (GB10)',
        vram: 128,
        generation: 'Grace Blackwell',
        tflops: 500,
        bandwidth: 273,
        tdp: 140,
        unifiedMemory: true,
    },

    // NVIDIA Blackwell consumer (RTX 50)
    'rtx5090':       { name: 'RTX 5090',         vram: 32, generation: 'Blackwell', tflops: 209.5, bandwidth: 1792, tdp: 575 },
    'rtx5080':       { name: 'RTX 5080',         vram: 16, generation: 'Blackwell', tflops: 112.7, bandwidth: 960,  tdp: 360 },
    'rtx5070ti':     { name: 'RTX 5070 Ti',      vram: 16, generation: 'Blackwell', tflops: 87.8,  bandwidth: 896,  tdp: 300 },
    'rtx5070':       { name: 'RTX 5070',         vram: 12, generation: 'Blackwell', tflops: 61.7,  bandwidth: 672,  tdp: 250 },
    'rtx5060ti16gb': { name: 'RTX 5060 Ti 16GB', vram: 16, generation: 'Blackwell', tflops: 47.4,  bandwidth: 448,  tdp: 180 },
    'rtx5060ti':     { name: 'RTX 5060 Ti 8GB',  vram: 8,  generation: 'Blackwell', tflops: 47.4,  bandwidth: 448,  tdp: 180 },
    'rtx5060':       { name: 'RTX 5060',         vram: 8,  generation: 'Blackwell', tflops: 38.4,  bandwidth: 448,  tdp: 145 },

    // NVIDIA RTX PRO Blackwell (workstation)
    'rtxpro6000': { name: 'RTX PRO 6000 Blackwell', vram: 96, generation: 'Blackwell', tflops: 125, bandwidth: 1792, tdp: 600 },
    'rtxpro5000': { name: 'RTX PRO 5000 Blackwell', vram: 48, generation: 'Blackwell', tflops: 94,  bandwidth: 1344, tdp: 300 },
    'rtxpro4500': { name: 'RTX PRO 4500 Blackwell', vram: 32, generation: 'Blackwell', tflops: 72,  bandwidth: 960,  tdp: 200 },
    'rtxpro4000': { name: 'RTX PRO 4000 Blackwell', vram: 24, generation: 'Blackwell', tflops: 50,  bandwidth: 672,  tdp: 140 },

    // NVIDIA consumer RTX — TFLOPS values are Tensor Core FP16 dense (FP32 accumulate)
    // for consistency with data-center cards. These are ~2× the shader FP32 rates.
    'rtx4090':        { name: 'RTX 4090',           vram: 24, generation: 'Ada Lovelace', tflops: 165.2, bandwidth: 1008, tdp: 450 },
    'rtx4080super':   { name: 'RTX 4080 Super',     vram: 16, generation: 'Ada Lovelace', tflops: 104.8, bandwidth: 736,  tdp: 320 },
    'rtx4080':        { name: 'RTX 4080',           vram: 16, generation: 'Ada Lovelace', tflops: 97.5,  bandwidth: 717,  tdp: 320 },
    'rtx4070tisuper': { name: 'RTX 4070 Ti Super',  vram: 16, generation: 'Ada Lovelace', tflops: 88.5,  bandwidth: 672,  tdp: 285 },
    'rtx4070ti':      { name: 'RTX 4070 Ti',        vram: 12, generation: 'Ada Lovelace', tflops: 80.2,  bandwidth: 504,  tdp: 285 },
    'rtx4070super':   { name: 'RTX 4070 Super',     vram: 12, generation: 'Ada Lovelace', tflops: 70.9,  bandwidth: 504,  tdp: 220 },
    'rtx4070':        { name: 'RTX 4070',           vram: 12, generation: 'Ada Lovelace', tflops: 58.1,  bandwidth: 504,  tdp: 200 },
    'rtx4060ti16gb':  { name: 'RTX 4060 Ti 16GB',   vram: 16, generation: 'Ada Lovelace', tflops: 44.1,  bandwidth: 288,  tdp: 165 },
    'rtx4060ti':      { name: 'RTX 4060 Ti',        vram: 8,  generation: 'Ada Lovelace', tflops: 44.2,  bandwidth: 288,  tdp: 160 },
    'rtx4060':        { name: 'RTX 4060',           vram: 8,  generation: 'Ada Lovelace', tflops: 30.4,  bandwidth: 272,  tdp: 115 },
    'rtx3090ti':      { name: 'RTX 3090 Ti',        vram: 24, generation: 'Ampere',       tflops: 80,    bandwidth: 1008, tdp: 450 },
    'rtx3090':        { name: 'RTX 3090',           vram: 24, generation: 'Ampere',       tflops: 71,    bandwidth: 936,  tdp: 350 },
    'rtx3080ti':      { name: 'RTX 3080 Ti',        vram: 12, generation: 'Ampere',       tflops: 68.2,  bandwidth: 912,  tdp: 350 },
    'rtx3080':        { name: 'RTX 3080',           vram: 10, generation: 'Ampere',       tflops: 59.6,  bandwidth: 760,  tdp: 320 },
    'rtx3060':        { name: 'RTX 3060',           vram: 12, generation: 'Ampere',       tflops: 25.4,  bandwidth: 360,  tdp: 170 },
    'rtx3060-8gb':    { name: 'RTX 3060 8GB',       vram: 8,  generation: 'Ampere',       tflops: 24.6,  bandwidth: 240,  tdp: 170 },
    'rtx3050':        { name: 'RTX 3050',           vram: 8,  generation: 'Ampere',       tflops: 17.7,  bandwidth: 224,  tdp: 130 },
    'a6000':          { name: 'A6000',              vram: 48, generation: 'Ampere',       tflops: 77.4,  bandwidth: 768,  tdp: 300 },
    'a5000':          { name: 'A5000',              vram: 24, generation: 'Ampere',       tflops: 55.6,  bandwidth: 768,  tdp: 230 },
    'a4000':          { name: 'A4000',              vram: 16, generation: 'Ampere',       tflops: 38.4,  bandwidth: 448,  tdp: 140 },

    // NVIDIA Pascal — no tensor cores, so these remain FP32 / native FP16 rates.
    'gtx1080ti':  { name: 'GTX 1080 Ti', vram: 11, generation: 'Pascal', tflops: 11.3, bandwidth: 484, tdp: 250 },
    'gtx1070ti':  { name: 'GTX 1070 Ti', vram: 8,  generation: 'Pascal', tflops: 8.1,  bandwidth: 256, tdp: 180 },
    'teslap4':    { name: 'Tesla P4',    vram: 8,  generation: 'Pascal', tflops: 5.5,  bandwidth: 192, tdp: 75  },
    'teslap40':   { name: 'Tesla P40',   vram: 24, generation: 'Pascal', tflops: 12,   bandwidth: 347, tdp: 250 },
    'teslap100':  { name: 'Tesla P100',  vram: 16, generation: 'Pascal', tflops: 18.7, bandwidth: 720, tdp: 250 },
    'gtx1070':    { name: 'GTX 1070',    vram: 8,  generation: 'Pascal', tflops: 6.5,  bandwidth: 256, tdp: 150 },
    'gtx1060':    { name: 'GTX 1060',    vram: 6,  generation: 'Pascal', tflops: 4.4,  bandwidth: 192, tdp: 120 },

    // Apple Silicon — discrete SKUs with realistic RAM tiers (unified memory).
    'm5-max-128': { name: 'Apple M5 Max 128GB', vram: 128, generation: 'Apple Silicon', tflops: 18.0, bandwidth: 614, tdp: 100, unifiedMemory: true },
    'm5-max-64':  { name: 'Apple M5 Max 64GB',  vram: 64,  generation: 'Apple Silicon', tflops: 18.0, bandwidth: 614, tdp: 100, unifiedMemory: true },
    'm5-max-36':  { name: 'Apple M5 Max 36GB',  vram: 36,  generation: 'Apple Silicon', tflops: 18.0, bandwidth: 614, tdp: 100, unifiedMemory: true },
    'm5-pro-48':  { name: 'Apple M5 Pro 48GB',  vram: 48,  generation: 'Apple Silicon', tflops: 9.0,  bandwidth: 307, tdp: 70,  unifiedMemory: true },
    'm5-pro-24':  { name: 'Apple M5 Pro 24GB',  vram: 24,  generation: 'Apple Silicon', tflops: 9.0,  bandwidth: 307, tdp: 70,  unifiedMemory: true },
    'm5-32':      { name: 'Apple M5 32GB',      vram: 32,  generation: 'Apple Silicon', tflops: 5.5,  bandwidth: 153, tdp: 35,  unifiedMemory: true },
    'm5-24':      { name: 'Apple M5 24GB',      vram: 24,  generation: 'Apple Silicon', tflops: 5.5,  bandwidth: 153, tdp: 35,  unifiedMemory: true },
    'm5-16':      { name: 'Apple M5 16GB',      vram: 16,  generation: 'Apple Silicon', tflops: 5.5,  bandwidth: 153, tdp: 35,  unifiedMemory: true },
    'm4-max-128': { name: 'Apple M4 Max 128GB', vram: 128, generation: 'Apple Silicon', tflops: 16.8, bandwidth: 546, tdp: 95,  unifiedMemory: true },
    'm4-max-64':  { name: 'Apple M4 Max 64GB',  vram: 64,  generation: 'Apple Silicon', tflops: 16.8, bandwidth: 546, tdp: 95,  unifiedMemory: true },
    'm4-max-36':  { name: 'Apple M4 Max 36GB',  vram: 36,  generation: 'Apple Silicon', tflops: 16.8, bandwidth: 546, tdp: 95,  unifiedMemory: true },
    'm4-pro-48':  { name: 'Apple M4 Pro 48GB',  vram: 48,  generation: 'Apple Silicon', tflops: 8.5,  bandwidth: 273, tdp: 65,  unifiedMemory: true },
    'm4-pro-24':  { name: 'Apple M4 Pro 24GB',  vram: 24,  generation: 'Apple Silicon', tflops: 8.5,  bandwidth: 273, tdp: 65,  unifiedMemory: true },
    'm4-24':      { name: 'Apple M4 24GB',      vram: 24,  generation: 'Apple Silicon', tflops: 4.6,  bandwidth: 120, tdp: 30,  unifiedMemory: true },
    'm4':         { name: 'Apple M4 16GB',      vram: 16,  generation: 'Apple Silicon', tflops: 4.6,  bandwidth: 120, tdp: 30,  unifiedMemory: true },
    'm3-max':     { name: 'Apple M3 Max',       vram: 40,  generation: 'Apple Silicon', tflops: 14.2, bandwidth: 400, tdp: 92,  unifiedMemory: true },
    'm3-pro':     { name: 'Apple M3 Pro',       vram: 18,  generation: 'Apple Silicon', tflops: 6.4,  bandwidth: 150, tdp: 67,  unifiedMemory: true },
    'm3':         { name: 'Apple M3',           vram: 8,   generation: 'Apple Silicon', tflops: 3.6,  bandwidth: 100, tdp: 45,  unifiedMemory: true },

    // AMD RDNA2/3/4 consumer — tflops are FP16 Matrix (WMMA) dense where applicable.
    'rx7900xtx':   { name: 'Radeon RX 7900 XTX',    vram: 24, generation: 'RDNA3', tflops: 123, bandwidth: 960, tdp: 355 },
    'rx7900xt':    { name: 'Radeon RX 7900 XT',     vram: 20, generation: 'RDNA3', tflops: 104, bandwidth: 800, tdp: 315 },
    'rx7900gre':   { name: 'Radeon RX 7900 GRE',    vram: 16, generation: 'RDNA3', tflops: 92,  bandwidth: 576, tdp: 260 },
    'rx7800xt':    { name: 'Radeon RX 7800 XT',     vram: 16, generation: 'RDNA3', tflops: 74,  bandwidth: 624, tdp: 263 },
    'rx7700xt':    { name: 'Radeon RX 7700 XT',     vram: 12, generation: 'RDNA3', tflops: 70,  bandwidth: 432, tdp: 245 },
    'rx7600xt':    { name: 'Radeon RX 7600 XT',     vram: 16, generation: 'RDNA3', tflops: 45,  bandwidth: 288, tdp: 190 },
    'rx7600':      { name: 'Radeon RX 7600',        vram: 8,  generation: 'RDNA3', tflops: 43,  bandwidth: 288, tdp: 165 },
    'rx6900xt':    { name: 'Radeon RX 6900 XT',     vram: 16, generation: 'RDNA2', tflops: 46,  bandwidth: 512, tdp: 300 },
    'rx6800xt':    { name: 'Radeon RX 6800 XT',     vram: 16, generation: 'RDNA2', tflops: 41,  bandwidth: 512, tdp: 300 },
    'rx6800':      { name: 'Radeon RX 6800',        vram: 16, generation: 'RDNA2', tflops: 32,  bandwidth: 512, tdp: 250 },
    'rx9070xt':    { name: 'Radeon RX 9070 XT',     vram: 16, generation: 'RDNA4', tflops: 195, bandwidth: 645, tdp: 304 },
    'rx9070':      { name: 'Radeon RX 9070',        vram: 16, generation: 'RDNA4', tflops: 145, bandwidth: 645, tdp: 220 },
    'rx9060xt1':   { name: 'Radeon RX 9060 XT',     vram: 16, generation: 'RDNA4', tflops: 103, bandwidth: 320, tdp: 160 },
    'rx9060xt2':   { name: 'Radeon RX 9060 XT',     vram: 8,  generation: 'RDNA4', tflops: 103, bandwidth: 320, tdp: 150 },
    'rx9060xt3':   { name: 'Radeon RX 9060 XT LP',  vram: 16, generation: 'RDNA4', tflops: 100, bandwidth: 320, tdp: 140 },
    'rx9060':      { name: 'Radeon RX 9060',        vram: 8,  generation: 'RDNA4', tflops: 86,  bandwidth: 320, tdp: 132 },
    'radaipro':    { name: 'Radeon AI Pro R9700',   vram: 32, generation: 'RDNA4', tflops: 191, bandwidth: 640, tdp: 300 },
    'radaipror9600d': { name: 'Radeon AI Pro R9600D', vram: 32, generation: 'RDNA4', tflops: 99, bandwidth: 640, tdp: 150 },

    // AMD Ryzen AI APUs — unified memory / iGPU path (ROCm on Linux)
    'ryzen-ai-max-395': {
        name: 'Ryzen AI Max+ 395',
        vram: 128,
        generation: 'Ryzen AI',
        tflops: 50,
        bandwidth: 256,
        tdp: 120,
        unifiedMemory: true,
    },
    'ryzen-ai-hx-370': {
        name: 'Ryzen AI 9 HX 370',
        vram: 32,
        generation: 'Ryzen AI',
        tflops: 30,
        bandwidth: 120,
        tdp: 55,
        unifiedMemory: true,
    },

    // AMD Instinct
    'mi355x': { name: 'Instinct MI355X', vram: 288, generation: 'CDNA4', tflops: 2500,  bandwidth: 8064, tdp: 1400 },
    'mi350x': { name: 'Instinct MI350X', vram: 288, generation: 'CDNA4', tflops: 2300,  bandwidth: 8064, tdp: 1000 },
    'mi325x': { name: 'Instinct MI325X', vram: 256, generation: 'CDNA3', tflops: 1300,  bandwidth: 6000, tdp: 1000 },
    'mi300x': { name: 'Instinct MI300X', vram: 192, generation: 'CDNA3', tflops: 1300,  bandwidth: 5300, tdp: 750 },
    'mi300a': { name: 'Instinct MI300A', vram: 128, generation: 'CDNA3', tflops: 1228,  bandwidth: 5300, tdp: 550, unifiedMemory: true },
    'mi250x': { name: 'Instinct MI250X', vram: 128, generation: 'CDNA2', tflops: 383,   bandwidth: 3276, tdp: 560 },
    'mi250':  { name: 'Instinct MI250',  vram: 128, generation: 'CDNA2', tflops: 362.1, bandwidth: 3276, tdp: 560 },
    'mi210':  { name: 'Instinct MI210',  vram: 64,  generation: 'CDNA2', tflops: 181,   bandwidth: 1638, tdp: 300 },
    'mi100':  { name: 'Instinct MI100',  vram: 32,  generation: 'CDNA1', tflops: 184.6, bandwidth: 1228, tdp: 300 },
};

export const gpuSpecs = Object.fromEntries(
    Object.entries(unsortedGpuSpecs).sort(([, a], [, b]) => {
        const nameA = a.name.split(' ')[0];
        const nameB = b.name.split(' ')[0];
        if (nameA !== nameB) return nameA.localeCompare(nameB);
        return a.vram - b.vram;
    })
);
