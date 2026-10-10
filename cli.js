#!/usr/bin/env node

/**
 * Litematica Converter CLI
 * Convert .litematic files directly from terminal.
 * Supports batch conversion and test validation.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const baseDir = __dirname;
const pako = require(path.join(baseDir, 'pako.min.js'));
const ctx = { console, pako };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(baseDir, 'pnbt.js'), 'utf8'), ctx);
const nbt = ctx.require('prismarine-nbt');
const { Buffer } = ctx.require('buffer');

// Extract converter logic from index.js
const indexCode = fs.readFileSync(path.join(baseDir, 'index.js'), 'utf8');

// Isolate functions
const mod = { exports: {} };
const isolatedCtx = {
    require: (m) => {
        if (m === 'prismarine-nbt') return nbt;
        if (m === 'buffer') return { Buffer };
        return require(m);
    },
    document: { addEventListener: () => {} },
    console,
    module: mod,
    exports: mod.exports
};
vm.createContext(isolatedCtx);
vm.runInContext(indexCode, isolatedCtx);

const {
    MINECRAFT_VERSIONS,
    getSchematicVersion,
    formatVersionFromDataVersion,
    convertLitematic
} = mod.exports;

function printUsage() {
    console.log(`
Litematica Converter CLI (1.12 ~ 26.3+)

Usage:
  node cli.js <file_or_directory> -v <version_or_dataversion> [options]
  node cli.js --test <directory>

Options:
  -v, --version <ver>      Target Minecraft version (e.g. 1.12, 1.20.4, 1.21.4, 26.3) or raw DataVersion
  -o, --output <dir>       Output directory for converted files (defaults to same directory)
  --no-fallback            Disable smart block fallback for older versions
  --test                   Run integrity verification on all .litematic files in folder
  -h, --help               Show this help message

Supported Version Shortcuts:
  26.3 (5023), 26.2 (4903), 26.1 (4786), 1.21.4 (4189), 1.21.1 (3955), 1.20.6 (3839),
  1.20.4 (3700), 1.20.1 (3465), 1.19.4 (3337), 1.18.2 (2975), 1.17.1 (2730),
  1.16.5 (2586), 1.15.2 (2230), 1.14.4 (1976), 1.13.2 (1631), 1.12.2 (1343)
`);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    printUsage();
    process.exit(0);
}

// Check for test mode
if (args[0] === '--test' || args.includes('--test')) {
    const targetDir = args.find(a => a !== '--test') || '/storage/.schematics';
    runTestMode(targetDir);
    process.exit(0);
}

// Parse args
let inputPath = null;
let targetVersionArg = null;
let outputDir = null;
let enableFallback = true;

for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-v' || arg === '--version') {
        targetVersionArg = args[++i];
    } else if (arg === '-o' || arg === '--output') {
        outputDir = args[++i];
    } else if (arg === '--no-fallback') {
        enableFallback = false;
    } else if (!arg.startsWith('-') && !inputPath) {
        inputPath = arg;
    }
}

if (!inputPath || !targetVersionArg) {
    console.error("Error: Input path and target version (-v) are required.");
    printUsage();
    process.exit(1);
}

// Resolve target DataVersion
let targetDataVersion = null;

// Match known version prefix first (e.g. "26.3", "1.20.4")
const matched = MINECRAFT_VERSIONS.find(v => {
    const vPrefix = v.name.split(' ')[0];
    return vPrefix === targetVersionArg ||
           v.name.toLowerCase().startsWith(targetVersionArg.toLowerCase()) ||
           v.name.toLowerCase().includes(targetVersionArg.toLowerCase());
});

if (matched) {
    targetDataVersion = matched.dataVersion;
} else if (/^\d+$/.test(targetVersionArg)) {
    targetDataVersion = parseInt(targetVersionArg, 10);
} else {
    console.error(`Error: Unknown version "${targetVersionArg}". Specify numeric DataVersion or known version.`);
    process.exit(1);
}

function convertFile(filePath, outDir) {
    const raw = fs.readFileSync(filePath);
    const inflated = pako.inflate(raw);
    const parsed = nbt.parseUncompressed(Buffer.from(inflated));

    const origDv = parsed.value.MinecraftDataVersion ? parsed.value.MinecraftDataVersion.value : "unknown";
    const origVer = parsed.value.Version ? parsed.value.Version.value : "unknown";

    convertLitematic(parsed, targetDataVersion, enableFallback);

    const uncompressed = nbt.writeUncompressed(parsed);
    const recompressed = pako.gzip(uncompressed);

    const baseName = path.basename(filePath, '.litematic');
    const verTag = formatVersionFromDataVersion(targetDataVersion).split(' ')[0];
    const outName = `${baseName}_v${verTag}.litematic`;
    const targetPath = path.join(outDir || path.dirname(filePath), outName);

    fs.writeFileSync(targetPath, recompressed);
    console.log(`✓ Converted: ${path.basename(filePath)} (v${origVer}, DV ${origDv}) -> ${outName} (v${getSchematicVersion(targetDataVersion)}, DV ${targetDataVersion})`);
}

try {
    const stat = fs.statSync(inputPath);
    if (stat.isDirectory()) {
        const files = fs.readdirSync(inputPath).filter(f => f.endsWith('.litematic'));
        console.log(`Processing ${files.length} schematics in ${inputPath}...`);
        for (const file of files) {
            try {
                convertFile(path.join(inputPath, file), outputDir);
            } catch (err) {
                console.error(`✗ Error converting ${file}: ${err.message}`);
            }
        }
    } else {
        convertFile(inputPath, outputDir);
    }
    console.log(`\nConversion finished successfully.`);
} catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
}

function runTestMode(targetDir) {
    const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.litematic'));
    console.log(`Running test suite on ${files.length} schematics in ${targetDir}...`);
    const testTargets = [1343, 2586, 3700, 4189, 5023]; // 1.12, 1.16, 1.20.4, 1.21.4, 26.3
    let passed = 0, failed = 0;

    for (const f of files) {
        const fullPath = path.join(targetDir, f);
        try {
            const raw = fs.readFileSync(fullPath);
            const inflated = pako.inflate(raw);
            const parsed = nbt.parseUncompressed(Buffer.from(inflated));

            for (const dv of testTargets) {
                const cloned = JSON.parse(JSON.stringify(parsed));
                convertLitematic(cloned, dv, true);
                const outBuf = pako.gzip(nbt.writeUncompressed(cloned));
                const reInflated = pako.inflate(outBuf);
                const reParsed = nbt.parseUncompressed(Buffer.from(reInflated));

                if (reParsed.value.MinecraftDataVersion.value !== dv) {
                    throw new Error(`DataVersion mismatch: got ${reParsed.value.MinecraftDataVersion.value}, expected ${dv}`);
                }
                if (reParsed.value.Version.value !== getSchematicVersion(dv)) {
                    throw new Error(`SchematicVersion mismatch: got ${reParsed.value.Version.value}, expected ${getSchematicVersion(dv)}`);
                }
                passed++;
            }
        } catch (e) {
            failed++;
            console.error(`✗ Test failed for ${f}: ${e.message}`);
        }
    }
    console.log(`\nTest results: ${passed} checks passed, ${failed} failed.`);
}
