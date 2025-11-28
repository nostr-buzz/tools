/**
 * Wallet & Seed Words Toolkit for Nostr Debug
 * BIP-39 seed generation, validation, and key derivation
 */

import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { HDKey } from '@scure/bip32';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { getPublicKey } from 'nostr-tools';
import { nip19 } from 'nostr-tools';
import type { SeedPhrase, SeedValidation, DerivedKeys } from '../types/nostr-debug';

/**
 * Generate BIP-39 seed words
 */
export function generateSeedPhrase(strength: 128 | 256 = 256): SeedPhrase {
  const mnemonic = bip39.generateMnemonic(wordlist, strength);
  const words = mnemonic.split(' ');
  const entropy = bip39.mnemonicToEntropy(mnemonic, wordlist);
  
  return {
    mnemonic,
    words,
    strength,
    entropy: bytesToHex(entropy),
    wordCount: words.length,
    language: 'english',
    createdAt: Date.now()
  };
}

/**
 * Validate seed words
 */
export function validateSeedPhrase(mnemonic: string): SeedValidation {
  const result: SeedValidation = {
    isValid: false,
    errors: []
  };

  try {
    const isValid = bip39.validateMnemonic(mnemonic, wordlist);
    result.isValid = isValid;

    if (!isValid) {
      result.errors = result.errors || [];
      result.errors.push('Invalid mnemonic checksum');
    }

    const words = mnemonic.trim().split(/\s+/);
    result.wordCount = words.length;

    // Check word count
    if (![12, 15, 18, 21, 24].includes(words.length)) {
      result.errors = result.errors || [];
      result.errors.push(`Invalid word count: ${words.length}. Must be 12, 15, 18, 21, or 24`);
    }

    // Check if all words are in wordlist
    const invalidWords = words.filter(word => !wordlist.includes(word));
    if (invalidWords.length > 0) {
      result.errors = result.errors || [];
      result.errors.push(`Invalid words: ${invalidWords.join(', ')}`);
      result.invalidWords = invalidWords;
    }

    // Calculate entropy strength
    if (words.length === 12) result.strength = 128;
    else if (words.length === 24) result.strength = 256;

  } catch (error) {
    result.errors = result.errors || [];
    result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}

/**
 * Derive Nostr keys from seed phrase
 */
export function deriveNostrKeysFromSeed(
  mnemonic: string,
  accountIndex: number = 0,
  passphrase: string = ''
): DerivedKeys {
  try {
    // Validate mnemonic first
    const validation = validateSeedPhrase(mnemonic);
    if (!validation.isValid) {
      throw new Error(`Invalid mnemonic: ${validation.errors?.join(', ') || 'Unknown error'}`);
    }

    // Generate seed from mnemonic
    const seed = bip39.mnemonicToSeedSync(mnemonic, passphrase);
    
    // Derive key using BIP-32 path for Nostr
    // Using m/44'/1237'/accountIndex'/0/0 (1237 is Nostr's coin type)
    const hdkey = HDKey.fromMasterSeed(seed);
    const path = `m/44'/1237'/${accountIndex}'/0/0`;
    const derivedKey = hdkey.derive(path);

    if (!derivedKey.privateKey) {
      throw new Error('Failed to derive private key');
    }

    const privateKeyHex = bytesToHex(derivedKey.privateKey);
    const publicKeyHex = getPublicKey(derivedKey.privateKey);
    
    const nsec = nip19.nsecEncode(derivedKey.privateKey);
    const npub = nip19.npubEncode(publicKeyHex);

    return {
      privateKey: privateKeyHex,
      publicKey: publicKeyHex,
      nsec,
      npub,
      path,
      accountIndex,
      chainCode: derivedKey.chainCode ? bytesToHex(derivedKey.chainCode) : undefined
    };
  } catch (error) {
    throw new Error(`Failed to derive keys: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate entropy from custom source
 */
export function generateEntropyFromString(input: string, length: 128 | 256 = 256): string {
  const inputBytes = new TextEncoder().encode(input);
  const hash = sha256(inputBytes);
  if (length === 128) {
    return bytesToHex(hash.slice(0, 16));
  }
  return bytesToHex(hash);
}

/**
 * Create mnemonic from entropy
 */
export function entropyToMnemonic(entropyHex: string): string {
  try {
    const entropy = hexToBytes(entropyHex);
    return bip39.entropyToMnemonic(entropy, wordlist);
  } catch (error) {
    throw new Error(`Failed to create mnemonic from entropy: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get mnemonic entropy
 */
export function mnemonicToEntropy(mnemonic: string): string {
  try {
    const entropy = bip39.mnemonicToEntropy(mnemonic, wordlist);
    return bytesToHex(entropy);
  } catch (error) {
    throw new Error(`Failed to extract entropy: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Detect weak entropy
 */
export function detectWeakEntropy(entropyHex: string): { isWeak: boolean; warnings: string[] } {
  const warnings: string[] = [];
  let isWeak = false;

  const bytes = hexToBytes(entropyHex);
  
  // Check for all zeros
  if (bytes.every(b => b === 0)) {
    warnings.push('Entropy is all zeros - VERY WEAK');
    isWeak = true;
  }

  // Check for all same value
  const firstByte = bytes[0];
  if (bytes.every(b => b === firstByte)) {
    warnings.push('Entropy has uniform bytes - WEAK');
    isWeak = true;
  }

  // Check for sequential pattern
  let sequential = true;
  for (let i = 1; i < bytes.length; i++) {
    if (bytes[i] !== (bytes[i - 1] + 1) % 256) {
      sequential = false;
      break;
    }
  }
  if (sequential) {
    warnings.push('Entropy follows sequential pattern - WEAK');
    isWeak = true;
  }

  // Check entropy (basic randomness test)
  const uniqueBytes = new Set(bytes);
  const uniqueRatio = uniqueBytes.size / bytes.length;
  if (uniqueRatio < 0.3) {
    warnings.push('Low entropy diversity - potentially WEAK');
    isWeak = true;
  }

  return { isWeak, warnings };
}

/**
 * Export seed phrase backup as JSON
 */
export function exportSeedBackup(seedPhrase: SeedPhrase, label?: string, encrypted: boolean = false): string {
  const backup = {
    version: '1.0',
    type: 'nostr-seed-backup',
    label: label || `Seed Backup ${new Date().toISOString()}`,
    createdAt: Date.now(),
    encrypted,
    seed: {
      mnemonic: seedPhrase.mnemonic,
      wordCount: seedPhrase.wordCount,
      language: seedPhrase.language,
      strength: seedPhrase.strength
    }
  };

  return JSON.stringify(backup, null, 2);
}

/**
 * Import seed phrase from backup
 */
export function importSeedBackup(jsonString: string): SeedPhrase {
  try {
    const backup = JSON.parse(jsonString);
    
    if (!backup.seed || !backup.seed.mnemonic) {
      throw new Error('Invalid backup format: missing seed data');
    }

    const validation = validateSeedPhrase(backup.seed.mnemonic);
    if (!validation.isValid) {
      throw new Error(`Invalid seed phrase: ${validation.errors?.join(', ') || 'Unknown error'}`);
    }

    const words = backup.seed.mnemonic.split(' ');
    const entropy = bip39.mnemonicToEntropy(backup.seed.mnemonic, wordlist);

    return {
      mnemonic: backup.seed.mnemonic,
      words,
      strength: backup.seed.strength || (words.length === 12 ? 128 : 256),
      entropy: bytesToHex(entropy),
      wordCount: words.length,
      language: backup.seed.language || 'english',
      createdAt: backup.createdAt || Date.now()
    };
  } catch (error) {
    throw new Error(`Failed to import seed backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Derive multiple accounts from seed
 */
export function deriveMultipleAccounts(mnemonic: string, count: number, startIndex: number = 0): DerivedKeys[] {
  const accounts: DerivedKeys[] = [];
  
  for (let i = 0; i < count; i++) {
    const keys = deriveNostrKeysFromSeed(mnemonic, startIndex + i);
    accounts.push(keys);
  }

  return accounts;
}

/**
 * Generate random passphrase for seed encryption
 */
export function generatePassphrase(length: number = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(randomBytes)
    .map(byte => chars[byte % chars.length])
    .join('');
}

/**
 * Test seed derivation speed
 */
export async function testDerivationSpeed(mnemonic: string, iterations: number = 100): Promise<{
  averageTime: number;
  totalTime: number;
  iterations: number;
}> {
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    deriveNostrKeysFromSeed(mnemonic, i);
  }
  
  const endTime = performance.now();
  const totalTime = endTime - startTime;
  
  return {
    averageTime: totalTime / iterations,
    totalTime,
    iterations
  };
}
