/**
 * Nostr Identity & Keys Utilities
 * Complete toolkit for key generation, conversion, validation, and signing
 */

import { bech32 } from '@scure/base';
import { schnorr } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import type {
  NostrKeyPair,
  KeyMetadata,
  KeyValidationResult,
  KeyBackup,
  NostrEvent,
  UnsignedNostrEvent,
} from '../types/nostr-debug';

// ============================================
// Key Generation
// ============================================

/**
 * Generate a new Nostr key pair with optional entropy
 */
export function generateKeyPair(entropy?: string): NostrKeyPair {
  let privateKeyBytes: Uint8Array;

  if (entropy) {
    // Use provided entropy (hex string)
    privateKeyBytes = hexToBytes(entropy);
    if (privateKeyBytes.length !== 32) {
      throw new Error('Entropy must be exactly 32 bytes (64 hex characters)');
    }
  } else {
    // Generate random 32 bytes
    privateKeyBytes = schnorr.utils.randomPrivateKey();
  }

  const privateKey = bytesToHex(privateKeyBytes);
  const publicKeyBytes = schnorr.getPublicKey(privateKeyBytes);
  const publicKey = bytesToHex(publicKeyBytes);

  const nsec = encodeNsec(privateKey);
  const npub = encodeNpub(publicKey);

  return {
    privateKey,
    publicKey,
    nsec,
    npub,
    createdAt: Date.now(),
    entropy: entropy,
  };
}

/**
 * Generate random hex entropy (32 bytes)
 */
export function generateEntropy(): string {
  const bytes = schnorr.utils.randomPrivateKey();
  return bytesToHex(bytes);
}

// ============================================
// Key Encoding/Decoding
// ============================================

/**
 * Encode public key (hex) to npub (bech32)
 */
export function encodeNpub(publicKeyHex: string): string {
  const bytes = hexToBytes(publicKeyHex);
  const words = bech32.toWords(bytes);
  return bech32.encode('npub', words);
}

/**
 * Decode npub to public key hex
 */
export function decodeNpub(npub: string): string {
  const { prefix, words } = bech32.decode(npub as any);
  if (prefix !== 'npub') {
    throw new Error('Invalid npub prefix');
  }
  const bytes = bech32.fromWords(words);
  return bytesToHex(new Uint8Array(bytes));
}

/**
 * Encode private key (hex) to nsec (bech32)
 */
export function encodeNsec(privateKeyHex: string): string {
  const bytes = hexToBytes(privateKeyHex);
  const words = bech32.toWords(bytes);
  return bech32.encode('nsec', words);
}

/**
 * Decode nsec to private key hex
 */
export function decodeNsec(nsec: string): string {
  const { prefix, words } = bech32.decode(nsec as any);
  if (prefix !== 'nsec') {
    throw new Error('Invalid nsec prefix');
  }
  const bytes = bech32.fromWords(words);
  return bytesToHex(new Uint8Array(bytes));
}

/**
 * Convert hex public key to npub
 */
export function hexToNpub(hex: string): string {
  return encodeNpub(hex);
}

/**
 * Convert npub to hex public key
 */
export function npubToHex(npub: string): string {
  return decodeNpub(npub);
}

/**
 * Convert hex private key to nsec
 */
export function hexToNsec(hex: string): string {
  return encodeNsec(hex);
}

/**
 * Convert nsec to hex private key
 */
export function nsecToHex(nsec: string): string {
  return decodeNsec(nsec);
}

/**
 * Derive public key from private key
 */
export function derivePublicKey(privateKeyHex: string): string {
  const privateKeyBytes = hexToBytes(privateKeyHex);
  const publicKeyBytes = schnorr.getPublicKey(privateKeyBytes);
  return bytesToHex(publicKeyBytes);
}

/**
 * Get full key pair from private key (hex or nsec)
 */
export function getKeyPairFromPrivate(privateKey: string): NostrKeyPair {
  let privateKeyHex: string;

  if (privateKey.startsWith('nsec')) {
    privateKeyHex = decodeNsec(privateKey);
  } else {
    privateKeyHex = privateKey;
  }

  const publicKeyHex = derivePublicKey(privateKeyHex);

  return {
    privateKey: privateKeyHex,
    publicKey: publicKeyHex,
    nsec: encodeNsec(privateKeyHex),
    npub: encodeNpub(publicKeyHex),
    createdAt: Date.now(),
  };
}

// ============================================
// Key Validation
// ============================================

/**
 * Validate any Nostr key format and return metadata
 */
export function validateKey(key: string): KeyValidationResult {
  try {
    // Check if it's bech32
    if (key.startsWith('npub') || key.startsWith('nsec') || key.startsWith('note')) {
      const { prefix, words } = bech32.decode(key as any);
      const bytes = bech32.fromWords(words);
      
      if (bytes.length !== 32) {
        return {
          isValid: false,
          type: 'invalid',
          errorMessage: 'Invalid key length (must be 32 bytes)',
        };
      }

      const hex = bytesToHex(new Uint8Array(bytes));

      if (prefix === 'npub') {
        return {
          isValid: true,
          type: 'public',
          format: 'npub',
          publicKey: hex,
        };
      } else if (prefix === 'nsec') {
        const publicKey = derivePublicKey(hex);
        return {
          isValid: true,
          type: 'private',
          format: 'nsec',
          publicKey,
        };
      } else if (prefix === 'note') {
        return {
          isValid: true,
          type: 'event',
          format: 'bech32',
          publicKey: hex,
        };
      }
    }

    // Check if it's hex (64 characters)
    if (/^[0-9a-f]{64}$/i.test(key)) {
      return {
        isValid: true,
        type: 'hex',
        format: 'hex',
        publicKey: key.toLowerCase(),
      };
    }

    return {
      isValid: false,
      type: 'invalid',
      errorMessage: 'Unknown key format. Expected: npub, nsec, or 64-char hex',
    };
  } catch (error) {
    return {
      isValid: false,
      type: 'invalid',
      errorMessage: error instanceof Error ? error.message : 'Validation failed',
    };
  }
}

/**
 * Get detailed key metadata
 */
export function getKeyMetadata(key: string): KeyMetadata {
  try {
    const validation = validateKey(key);

    if (!validation.isValid) {
      return {
        type: 'invalid',
        format: 'hex',
        length: key.length,
        prefix: '',
        isValid: false,
        checksum: '',
        errorMessage: validation.errorMessage,
      };
    }

    let bech32Info;
    if (key.startsWith('npub') || key.startsWith('nsec') || key.startsWith('note')) {
      const decoded = bech32.decode(key as any);
      bech32Info = {
        hrp: decoded.prefix,
        data: new Uint8Array(bech32.fromWords(decoded.words)),
      };
    }

    return {
      type: validation.type,
      format: validation.format!,
      length: key.length,
      prefix: key.slice(0, 4),
      isValid: true,
      checksum: '',
      bech32Info,
    };
  } catch (error) {
    return {
      type: 'invalid',
      format: 'hex',
      length: key.length,
      prefix: '',
      isValid: false,
      checksum: '',
      errorMessage: error instanceof Error ? error.message : 'Failed to parse',
    };
  }
}

/**
 * Check if a key is valid npub
 */
export function isValidNpub(npub: string): boolean {
  return validateKey(npub).format === 'npub';
}

/**
 * Check if a key is valid nsec
 */
export function isValidNsec(nsec: string): boolean {
  return validateKey(nsec).format === 'nsec';
}

/**
 * Check if a key is valid hex
 */
export function isValidHex(hex: string): boolean {
  return /^[0-9a-f]{64}$/i.test(hex);
}

// ============================================
// Event ID & Signing
// ============================================

/**
 * Calculate event ID from unsigned event
 */
export function calculateEventId(event: UnsignedNostrEvent): string {
  const serialized = JSON.stringify([
    0,
    event.pubkey,
    event.created_at,
    event.kind,
    event.tags,
    event.content,
  ]);

  const hash = sha256(new TextEncoder().encode(serialized));
  return bytesToHex(hash);
}

/**
 * Sign a Nostr event
 */
export function signEvent(
  event: UnsignedNostrEvent,
  privateKeyHex: string
): NostrEvent {
  const id = calculateEventId(event);
  const sig = schnorr.sign(id, privateKeyHex);
  const pubkey = event.pubkey || derivePublicKey(privateKeyHex);

  return {
    ...event,
    pubkey,
    id,
    sig: bytesToHex(sig),
  };
}

/**
 * Verify event signature
 */
export function verifyEventSignature(event: NostrEvent): boolean {
  try {
    const id = calculateEventId(event);
    
    // Verify ID matches
    if (id !== event.id) {
      return false;
    }

    // Verify signature
    const isValid = schnorr.verify(event.sig, id, event.pubkey);
    return isValid;
  } catch {
    return false;
  }
}

/**
 * Sign arbitrary message
 */
export function signMessage(message: string, privateKeyHex: string): string {
  const hash = sha256(new TextEncoder().encode(message));
  const sig = schnorr.sign(hash, privateKeyHex);
  return bytesToHex(sig);
}

/**
 * Verify message signature
 */
export function verifyMessage(
  message: string,
  signature: string,
  publicKeyHex: string
): boolean {
  try {
    const hash = sha256(new TextEncoder().encode(message));
    return schnorr.verify(signature, hash, publicKeyHex);
  } catch {
    return false;
  }
}

// ============================================
// Key Import/Export
// ============================================

/**
 * Export keys to JSON backup
 */
export function exportKeysToJSON(
  keys: NostrKeyPair | NostrKeyPair[],
  encrypted = false
): KeyBackup {
  const keyArray = Array.isArray(keys) ? keys : [keys];

  return {
    version: '1.0.0',
    createdAt: Date.now(),
    keys: keyArray,
    encrypted,
    metadata: {
      exportedBy: 'nostr-debug-tools',
      keyCount: keyArray.length,
    },
  };
}

/**
 * Import keys from JSON backup
 */
export function importKeysFromJSON(json: string): NostrKeyPair[] {
  try {
    const backup: KeyBackup = JSON.parse(json);

    if (!backup.keys || !Array.isArray(backup.keys)) {
      throw new Error('Invalid backup format: missing keys array');
    }

    // Validate each key
    return backup.keys.filter((key) => {
      return (
        key.privateKey &&
        key.publicKey &&
        key.nsec &&
        key.npub &&
        isValidHex(key.privateKey) &&
        isValidHex(key.publicKey)
      );
    });
  } catch (error) {
    throw new Error(
      `Failed to import keys: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Rotate to a new key (generate new nsec/npub)
 */
export function rotateKey(oldPrivateKey: string): NostrKeyPair {
  return generateKeyPair();
}

/**
 * Mask sensitive key for display
 */
export function maskKey(key: string, visibleChars = 8): string {
  if (key.length <= visibleChars * 2) {
    return key;
  }
  const start = key.slice(0, visibleChars);
  const end = key.slice(-visibleChars);
  return `${start}${'•'.repeat(key.length - visibleChars * 2)}${end}`;
}

/**
 * Test key against relay (simulation)
 */
export async function testKeyAgainstRelay(
  publicKey: string,
  relayUrl: string
): Promise<boolean> {
  // This is a placeholder - in real implementation, you'd connect to relay
  // and test authentication/subscription
  return Promise.resolve(true);
}
