/**
 * Nostr Debug & Development Tools - Type Definitions
 * Complete type safety for all Nostr operations
 */

// ============================================
// 🔐 Identity & Keys Types
// ============================================

export type KeyFormat = 'hex' | 'npub' | 'nsec' | 'bech32';

export interface NostrKeyPair {
  privateKey: string; // hex format
  publicKey: string; // hex format
  nsec: string; // bech32 encoded private key
  npub: string; // bech32 encoded public key
  createdAt: number;
  entropy?: string; // hex entropy used
}

export type KeyPair = NostrKeyPair;

export interface KeyMetadata {
  type: string;
  format?: KeyFormat;
  length: number;
  prefix: string;
  isValid: boolean;
  checksum: string;
  publicKeyHex?: string;
  privateKeyHex?: string;
  npub?: string;
  errorMessage?: string;
  bech32Info?: {
    hrp: string; // human readable part
    data: Uint8Array;
  };
}

export interface KeyValidationResult {
  isValid: boolean;
  type: string;
  format?: KeyFormat;
  length?: number;
  publicKey?: string;
  errors?: string[];
  errorMessage?: string;
}

export type KeyValidation = KeyValidationResult;

export interface KeyBackup {
  version: string;
  createdAt: number;
  keys: NostrKeyPair[];
  encrypted: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================
// 💬 Events & Signing Types
// ============================================

export type NostrEventKind = 
  | 0    // Metadata
  | 1    // Short Text Note
  | 3    // Contacts
  | 4    // Encrypted Direct Messages
  | 5    // Event Deletion
  | 6    // Repost
  | 7    // Reaction
  | 9735 // Zap Receipt
  | 30023 // Long-form Content
  | number;

export type EventKind = NostrEventKind;

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: NostrEventKind;
  tags: string[][];
  content: string;
  sig: string;
}

export type SignedEvent = NostrEvent;

export interface UnsignedNostrEvent {
  kind: NostrEventKind;
  tags: string[][];
  content: string;
  created_at: number;
  pubkey?: string;
}

export type UnsignedEvent = UnsignedNostrEvent;

export interface EventSignatureVerification {
  isValid: boolean;
  eventId: string;
  pubkey: string;
  timestamp?: number;
  kind?: number;
  computedId?: string;
  signatureValid?: boolean;
  publicKeyValid?: boolean;
  errors?: string[];
  errorMessage?: string;
}

export type EventVerification = EventSignatureVerification;

export interface EventTemplate {
  kind: NostrEventKind;
  content: string;
  tags?: string[][];
  created_at?: number;
}

// ============================================
// 💰 Wallet & Seed Types
// ============================================

export interface BIP39SeedPhrase {
  mnemonic: string;
  words: string[];
  entropy: string;
  seed?: string;
  isValid?: boolean;
  checksum?: string;
  language: string;
  strength: number; // 128, 256, etc
  wordCount: number;
  createdAt: number;
}

export type SeedPhrase = BIP39SeedPhrase;

export interface SeedValidation {
  isValid: boolean;
  wordCount?: number;
  strength?: number;
  invalidWords?: string[];
  checksumValid?: boolean;
  errors?: string[];
  errorMessage?: string;
}

export interface DerivedKey {
  path: string;
  privateKey: string;
  publicKey: string;
  nsec: string;
  npub: string;
  chainCode?: string;
  index?: number;
  accountIndex: number;
}

export type DerivedKeys = DerivedKey;

export interface EncryptedBackup {
  version: string;
  algorithm: 'NIP-44' | 'AES-256-GCM';
  ciphertext: string;
  iv: string;
  salt: string;
  createdAt: number;
}

// ============================================
// 🌐 Relays Debug Types
// ============================================

export interface RelayInfo {
  url: string;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  latency?: number; // milliseconds
  lastConnected?: number;
  errorMessage?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
}

export interface RelayHealthCheck {
  url: string;
  isHealthy: boolean;
  latency: number;
  supportsRead: boolean;
  supportsWrite: boolean;
  responseTime: number;
  timestamp: number;
  errorMessage?: string;
}

export interface RelayPublishResult {
  relay: string;
  success: boolean;
  eventId: string;
  message?: string;
  timestamp: number;
  latency: number;
}

export interface RelayConnection {
  url: string;
  websocket: WebSocket | null;
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  messageCount: number;
  errorCount: number;
  lastActivity: number;
  logs: RelayLog[];
}

export interface RelayLog {
  timestamp: number;
  type: 'sent' | 'received' | 'error' | 'info';
  message: string;
  data?: unknown;
}

export interface RelayTestResult {
  url: string;
  nip01Compliant: boolean;
  supportsAuth: boolean;
  supportsCount: boolean;
  averageLatency: number;
  successRate: number;
  tested: number;
}

// ============================================
// ⚡ Zaps & Analytics Types
// ============================================

export interface ZapInvoice {
  bolt11: string;
  amount: number; // millisats
  paymentHash: string;
  description?: string;
  timestamp: number;
  expiry: number;
  payee: string;
}

export interface ParsedZap {
  sender: string; // pubkey
  receiver: string; // pubkey
  amount: number; // sats
  comment?: string;
  invoice: string;
  eventId?: string;
  timestamp: number;
  tags: string[][];
}

export interface ZapReceipt extends NostrEvent {
  kind: 9735;
  zapAmount: number;
  zappedPubkey: string;
  zapperPubkey: string;
  bolt11: string;
  preimage?: string;
}

export interface ZapAnalytics {
  totalZaps: number;
  totalAmount: number; // sats
  averageAmount: number;
  topZappers: Array<{ pubkey: string; amount: number; count: number }>;
  topZapped: Array<{ pubkey: string; amount: number; count: number }>;
  timeRange: { start: number; end: number };
}

// ============================================
// 🧰 Conversions & Encoding Types
// ============================================

export type EncodingFormat = 
  | 'hex' 
  | 'base64' 
  | 'bech32' 
  | 'utf8' 
  | 'binary'
  | 'cbor'
  | 'json';

export interface ConversionResult {
  input: string;
  output: string;
  inputFormat: EncodingFormat;
  outputFormat: EncodingFormat;
  success: boolean;
  errorMessage?: string;
  metadata?: {
    length: number;
    encoding?: string;
  };
}

export interface Bech32Data {
  hrp: string; // human readable part (npub, nsec, note, etc)
  data: Uint8Array;
  encoding: 'bech32' | 'bech32m';
}

export interface HashResult {
  input: string;
  algorithm: 'sha256' | 'sha512' | 'ripemd160';
  hash: string;
  hashBytes: Uint8Array;
}

export interface NIP44EncryptedMessage {
  ciphertext: string;
  nonce: string;
  version: number;
}

// ============================================
// 🧪 Debug & Test Types
// ============================================

export interface DebugSession {
  id: string;
  startTime: number;
  operations: DebugOperation[];
  errors: DebugError[];
}

export interface DebugOperation {
  id: string;
  type: string;
  timestamp: number;
  input: unknown;
  output: unknown;
  duration: number;
  success: boolean;
}

export interface DebugError {
  timestamp: number;
  operation: string;
  errorMessage: string;
  stack?: string;
  context?: unknown;
}

export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  errorMessage?: string;
  details?: unknown;
}

export interface BulkTestData {
  keys: NostrKeyPair[];
  events: NostrEvent[];
  relays: RelayInfo[];
  count: number;
  generatedAt: number;
}

// ============================================
// 📘 SDK & Tooling Types
// ============================================

export interface NostrDebugConfig {
  defaultRelays: string[];
  timeout: number;
  retryAttempts: number;
  enableLogging: boolean;
  theme: 'light' | 'dark';
}

export interface LoginMethod {
  type: 'extension' | 'bunker' | 'raw' | 'seed' | 'backup';
  label: string;
  description: string;
  icon: string;
}

export interface ImportResult {
  success: boolean;
  method: LoginMethod['type'];
  keys?: NostrKeyPair;
  errorMessage?: string;
}

// ============================================
// 🎯 UI & Component Types
// ============================================

export interface ToolCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  tools: Tool[];
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  component: string;
  tags: string[];
}

export interface CopyableField {
  label: string;
  value: string;
  masked?: boolean;
  format?: KeyFormat;
}

export interface StatusLog {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  details?: unknown;
}

// ============================================
// Type Guards
// ============================================

export function isNostrEvent(obj: unknown): obj is NostrEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'pubkey' in obj &&
    'created_at' in obj &&
    'kind' in obj &&
    'tags' in obj &&
    'content' in obj &&
    'sig' in obj
  );
}

export function isValidKeyFormat(format: string): format is KeyFormat {
  return ['hex', 'npub', 'nsec', 'bech32'].includes(format);
}

export function isRelayURL(url: string): boolean {
  return url.startsWith('ws://') || url.startsWith('wss://');
}
