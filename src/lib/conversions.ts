/**
 * Conversions & Encoding Toolkit for Nostr
 * Encoding/decoding utilities for various formats
 */

import { bytesToHex, hexToBytes, utf8ToBytes } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { bech32 } from '@scure/base';
import type {
  ConversionResult,
  Bech32Data,
  HashResult,
  EncodingFormat
} from '../types/nostr-debug';

/**
 * Helper: Convert bytes to UTF-8 string
 */
function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

/**
 * Convert hex to base64
 */
export function hexToBase64(hex: string): string {
  try {
    const bytes = hexToBytes(hex);
    return btoa(String.fromCharCode(...bytes));
  } catch (error) {
    throw new Error(`Failed to convert hex to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert base64 to hex
 */
export function base64ToHex(base64: string): string {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytesToHex(bytes);
  } catch (error) {
    throw new Error(`Failed to convert base64 to hex: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert UTF-8 string to hex
 */
export function utf8ToHex(text: string): string {
  try {
    const bytes = utf8ToBytes(text);
    return bytesToHex(bytes);
  } catch (error) {
    throw new Error(`Failed to convert UTF-8 to hex: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert hex to UTF-8 string
 */
export function hexToUtf8(hex: string): string {
  try {
    const bytes = hexToBytes(hex);
    return bytesToUtf8(bytes);
  } catch (error) {
    throw new Error(`Failed to convert hex to UTF-8: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Encode data to bech32
 */
export function encodeBech32(hrp: string, data: Uint8Array): string {
  try {
    return bech32.encode(hrp, bech32.toWords(data));
  } catch (error) {
    throw new Error(`Failed to encode bech32: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Decode bech32 data
 */
export function decodeBech32(encoded: string): Bech32Data {
  try {
    const decoded = bech32.decode(encoded as any);
    const data = new Uint8Array(bech32.fromWords(decoded.words));
    
    return {
      hrp: decoded.prefix,
      data,
      encoding: 'bech32'
    };
  } catch (error) {
    throw new Error(`Failed to decode bech32: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate SHA-256 hash
 */
export function generateSHA256(input: string, inputFormat: 'utf8' | 'hex' = 'utf8'): HashResult {
  try {
    const bytes = inputFormat === 'utf8' ? utf8ToBytes(input) : hexToBytes(input);
    const hash = sha256(bytes);
    
    return {
      input,
      algorithm: 'sha256',
      hash: bytesToHex(hash),
      hashBytes: hash
    };
  } catch (error) {
    throw new Error(`Failed to generate SHA-256: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Generate SHA-512 hash
 */
export function generateSHA512(input: string, inputFormat: 'utf8' | 'hex' = 'utf8'): HashResult {
  try {
    const bytes = inputFormat === 'utf8' ? utf8ToBytes(input) : hexToBytes(input);
    const hash = sha512(bytes);
    
    return {
      input,
      algorithm: 'sha512',
      hash: bytesToHex(hash),
      hashBytes: hash
    };
  } catch (error) {
    throw new Error(`Failed to generate SHA-512: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Universal conversion function
 */
export function convert(
  input: string,
  inputFormat: EncodingFormat,
  outputFormat: EncodingFormat
): ConversionResult {
  const result: ConversionResult = {
    input,
    output: '',
    inputFormat,
    outputFormat,
    success: false
  };

  try {
    // First, normalize input to bytes
    let bytes: Uint8Array;

    switch (inputFormat) {
      case 'hex':
        bytes = hexToBytes(input);
        break;
      case 'base64':
        bytes = new Uint8Array(Array.from(atob(input), c => c.charCodeAt(0)));
        break;
      case 'utf8':
        bytes = utf8ToBytes(input);
        break;
      case 'bech32':
        bytes = decodeBech32(input).data;
        break;
      default:
        throw new Error(`Unsupported input format: ${inputFormat}`);
    }

    // Then convert to output format
    switch (outputFormat) {
      case 'hex':
        result.output = bytesToHex(bytes);
        break;
      case 'base64':
        result.output = btoa(String.fromCharCode(...bytes));
        break;
      case 'utf8':
        result.output = bytesToUtf8(bytes);
        break;
      case 'bech32':
        throw new Error('Bech32 encoding requires HRP (human readable part)');
      case 'json':
        result.output = JSON.stringify(Array.from(bytes));
        break;
      default:
        throw new Error(`Unsupported output format: ${outputFormat}`);
    }

    result.success = true;
    result.metadata = {
      length: bytes.length,
      encoding: outputFormat
    };

  } catch (error) {
    result.errorMessage = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

/**
 * Encode string to base64
 */
export function encodeBase64(input: string): string {
  return btoa(input);
}

/**
 * Decode base64 to string
 */
export function decodeBase64(base64: string): string {
  return atob(base64);
}

/**
 * Encode bytes to hex
 */
export function encodeHex(bytes: Uint8Array): string {
  return bytesToHex(bytes);
}

/**
 * Decode hex to bytes
 */
export function decodeHex(hex: string): Uint8Array {
  return hexToBytes(hex);
}

/**
 * Validate hex string
 */
export function isValidHex(hex: string): boolean {
  return /^[0-9a-fA-F]*$/.test(hex);
}

/**
 * Validate base64 string
 */
export function isValidBase64(base64: string): boolean {
  try {
    return btoa(atob(base64)) === base64;
  } catch {
    return false;
  }
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate random hex string
 */
export function generateRandomHex(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return bytesToHex(bytes);
}

/**
 * Generate random base64 string
 */
export function generateRandomBase64(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return btoa(String.fromCharCode(...bytes));
}

/**
 * XOR two hex strings
 */
export function xorHex(hex1: string, hex2: string): string {
  const bytes1 = hexToBytes(hex1);
  const bytes2 = hexToBytes(hex2);
  
  if (bytes1.length !== bytes2.length) {
    throw new Error('Hex strings must be of equal length');
  }
  
  const result = new Uint8Array(bytes1.length);
  for (let i = 0; i < bytes1.length; i++) {
    result[i] = bytes1[i] ^ bytes2[i];
  }
  
  return bytesToHex(result);
}

/**
 * Reverse bytes
 */
export function reverseBytes(bytes: Uint8Array): Uint8Array {
  return bytes.reverse();
}

/**
 * Reverse hex string
 */
export function reverseHex(hex: string): string {
  const bytes = hexToBytes(hex);
  return bytesToHex(reverseBytes(bytes));
}

/**
 * Convert array to hex
 */
export function arrayToHex(arr: number[]): string {
  return bytesToHex(new Uint8Array(arr));
}

/**
 * Convert hex to array
 */
export function hexToArray(hex: string): number[] {
  return Array.from(hexToBytes(hex));
}

/**
 * Normalize whitespace in text
 */
export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Count bytes in string
 */
export function countBytes(text: string): number {
  return utf8ToBytes(text).length;
}

/**
 * Truncate hex string
 */
export function truncateHex(hex: string, maxLength: number): string {
  if (hex.length <= maxLength) return hex;
  return hex.substring(0, maxLength) + '...';
}

/**
 * Format hex with spaces
 */
export function formatHex(hex: string, groupSize: number = 2): string {
  return hex.match(new RegExp(`.{1,${groupSize}}`, 'g'))?.join(' ') || hex;
}
