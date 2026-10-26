import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import solc from 'solc';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const contractsDir = path.resolve(rootDir, 'contracts');
const buildDir = path.resolve(rootDir, 'artifacts');

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

console.log('----------------------------------------------------');
console.log('⚡ Compiling Adaptive AMM Solidity Contracts...');
console.log('----------------------------------------------------');

const mockErc20Source = fs.readFileSync(path.join(contractsDir, 'MockERC20.sol'), 'utf8');
const adaptiveAmmSource = fs.readFileSync(path.join(contractsDir, 'AdaptiveAMM.sol'), 'utf8');

const input = {
  language: 'Solidity',
  sources: {
    'MockERC20.sol': {
      content: mockErc20Source,
    },
    'AdaptiveAMM.sol': {
      content: adaptiveAmmSource,
    },
  },
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode', 'evm.deployedBytecode', 'evm.gasEstimates'],
      },
    },
  },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

let hasErrors = false;
if (output.errors) {
  for (const error of output.errors) {
    if (error.severity === 'error') {
      hasErrors = true;
      console.error('❌ Error:', error.formattedMessage);
    } else {
      console.warn('⚠️ Warning:', error.formattedMessage);
    }
  }
}

if (hasErrors) {
  console.error('\n💥 Compilation failed due to errors.');
  process.exit(1);
}

const compiledContracts = {};

for (const [file, contracts] of Object.entries(output.contracts)) {
  for (const [contractName, contract] of Object.entries(contracts)) {
    const artifactPath = path.join(buildDir, `${contractName}.json`);
    const artifact = {
      contractName,
      sourceName: file,
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      deployedBytecode: contract.evm.deployedBytecode.object,
      gasEstimates: contract.evm.gasEstimates,
    };
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
    compiledContracts[contractName] = artifact;
    const bytecodeSize = Math.floor(contract.evm.bytecode.object.length / 2);
    console.log(`✅ [${contractName}] successfully compiled -> ${bytecodeSize} bytes bytecode`);
  }
}

console.log('----------------------------------------------------');
console.log(`🎉 Compilation succeeded! Artifacts written to: ${buildDir}`);
console.log('----------------------------------------------------');

export default compiledContracts;
