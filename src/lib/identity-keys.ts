/**
 * Identity & Keys Utilities for Nostr Debug Tools
 * Handles npub/nsec generation, conversion, validation, and signing
 */

import { generateSecretKey, getPublicKey, nip19 } from 'nostr-tools';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import type {
  KeyPair,
  KeyMetadata,
  KeyValidation,
  SignedEvent,
  NostrEvent
} from '../types/nostr-debug';

/**
 * Generate a new Nostr key pair (nsec/npub)
 */
export function generateKeyPair(): KeyPair {
  const secretKey = generateSecretKey();
  const publicKey = getPublicKey(secretKey);
  
  const nsec = nip19.nsecEncode(secretKey);
  const npub = nip19.npubEncode(publicKey);
  
  return {
    privateKey: bytesToHex(secretKey),
    publicKey,
    nsec,
    npub,
    createdAt: Date.now()
  };
}

/**
 * Extract and display pubkey (hex) from npub
 */
export function npubToHex(npub: string): string {
  try {
    const decoded = nip19.decode(npub);
    if (decoded.type !== 'npub') {
      throw new Error('Invalid npub format');
    }
    return decoded.data as string;
  } catch (error) {
    throw new Error(`Failed to decode npub: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert pubkey (hex) to npub
 */
export function hexToNpub(hex: string): string {
  try {
    return nip19.npubEncode(hex);
  } catch (error) {
    throw new Error(`Failed to encode hex to npub: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert nsec to private key (hex)
 */
export function nsecToHex(nsec: string): string {
  try {
    const decoded = nip19.decode(nsec);
    if (decoded.type !== 'nsec') {
      throw new Error('Invalid nsec format');
    }
    return bytesToHex(decoded.data as Uint8Array);
  } catch (error) {
    throw new Error(`Failed to decode nsec: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Derive nsec from private key (hex)
 */
export function hexToNsec(hex: string): string {
  try {
    const bytes = hexToBytes(hex);
    return nip19.nsecEncode(bytes);
  } catch (error) {
    throw new Error(`Failed to encode hex to nsec: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get public key from private key
 */
export function getPublicKeyFromPrivate(privateKeyHex: string): string {
  try {
    const privateKeyBytes = hexToBytes(privateKeyHex);
    return getPublicKey(privateKeyBytes);
  } catch (error) {
    throw new Error(`Failed to derive public key: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate key format
 */
export function validateKeyFormat(key: string): KeyValidation {
  const result: KeyValidation = {
    isValid: false,
    type: 'unknown',
    errors: []
  };

  if (!key || typeof key !== 'string') {
    result.errors = result.errors || [];
    result.errors.push('Key must be a non-empty string');
    return result;
  }

  // Check for npub
  if (key.startsWith('npub1')) {
    try {
      const decoded = nip19.decode(key);
      if (decoded.type === 'npub') {
        result.isValid = true;
        result.type = 'npub';
        result.format = 'bech32';
        result.length = key.length;
      }
    } catch (error) {
      result.errors = result.errors || [];
      result.errors.push(`Invalid npub: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return result;
  }

  // Check for nsec
  if (key.startsWith('nsec1')) {
    try {
      const decoded = nip19.decode(key);
      if (decoded.type === 'nsec') {
        result.isValid = true;
        result.type = 'nsec';
        result.format = 'bech32';
        result.length = key.length;
      }
    } catch (error) {
      result.errors = result.errors || [];
      result.errors.push(`Invalid nsec: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    return result;
  }

  // Check for hex format
  if (/^[0-9a-fA-F]{64}$/.test(key)) {
    result.isValid = true;
    result.type = 'hex';
    result.format = 'hex';
    result.length = 64;
    return result;
  }

  result.errors = result.errors || [];
  result.errors.push('Unrecognized key format. Expected npub1..., nsec1..., or 64-character hex');
  return result;
}

/**
 * Get key metadata
 */
export function getKeyMetadata(key: string): KeyMetadata {
  const validation = validateKeyFormat(key);
  
  const metadata: KeyMetadata = {
    type: validation.type,
    format: validation.format,
    length: validation.length || key.length,
    isValid: validation.isValid,
    prefix: key.substring(0, 5),
    checksum: validation.type === 'npub' || validation.type === 'nsec' ? 'bech32' : 'none'
  };

  if (validation.type === 'npub' || validation.type === 'hex') {
    try {
      const hex = validation.type === 'npub' ? npubToHex(key) : key;
      metadata.publicKeyHex = hex;
      metadata.npub = validation.type === 'npub' ? key : hexToNpub(hex);
    } catch (error) {
      // Ignore conversion errors
    }
  }

  if (validation.type === 'nsec') {
    try {
      const hex = nsecToHex(key);
      metadata.privateKeyHex = hex;
      const pubkey = getPublicKeyFromPrivate(hex);
      metadata.publicKeyHex = pubkey;
      metadata.npub = hexToNpub(pubkey);
    } catch (error) {
      // Ignore conversion errors
    }
  }

  return metadata;
}

/**
 * Generate and export JSON key backup
 */
export function exportKeyBackup(keyPair: KeyPair, label?: string): string {
  const backup = {
    version: '1.0',
    type: 'nostr-key-backup',
    label: label || `Nostr Key Backup ${new Date().toISOString()}`,
    createdAt: Date.now(),
    keys: {
      npub: keyPair.npub,
      nsec: keyPair.nsec,
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey
    }
  };
  
  return JSON.stringify(backup, null, 2);
}

/**
 * Import and parse key backup
 */
export function importKeyBackup(jsonString: string): KeyPair {
  try {
    const backup = JSON.parse(jsonString);
    
    if (!backup.keys || !backup.keys.nsec) {
      throw new Error('Invalid backup format: missing keys');
    }

    // Validate the nsec
    const validation = validateKeyFormat(backup.keys.nsec);
    if (!validation.isValid || validation.type !== 'nsec') {
      throw new Error('Invalid nsec in backup');
    }

    return {
      privateKey: backup.keys.privateKey || nsecToHex(backup.keys.nsec),
      publicKey: backup.keys.publicKey || getPublicKeyFromPrivate(nsecToHex(backup.keys.nsec)),
      nsec: backup.keys.nsec,
      npub: backup.keys.npub || hexToNpub(backup.keys.publicKey),
      createdAt: backup.createdAt || Date.now()
    };
  } catch (error) {
    throw new Error(`Failed to import key backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Rotate key to new nsec and re-derive npub
 */
export function rotateKey(): KeyPair {
  return generateKeyPair();
}

/**
 * Mask sensitive key for display
 */
export function maskKey(key: string, visible: number = 8): string {
  if (key.length <= visible * 2) {
    return key;
  }
  const start = key.substring(0, visible);
  const end = key.substring(key.length - visible);
  const masked = '•'.repeat(Math.min(20, key.length - visible * 2));
  return `${start}${masked}${end}`;
}

/**
 * Generate multiple test identities
 */
export function generateTestIdentities(count: number): KeyPair[] {
  const identities: KeyPair[] = [];
  for (let i = 0; i < count; i++) {
    identities.push(generateKeyPair());
  }
  return identities;
}
