/**
 * Events & Signing Tools for Nostr Debug
 * Create, sign, verify and replay events
 */

import { finalizeEvent, verifyEvent, getEventHash } from 'nostr-tools';
import { hexToBytes } from '@noble/hashes/utils.js';
import type {
  NostrEvent,
  SignedEvent,
  EventKind,
  EventVerification,
  UnsignedEvent
} from '../types/nostr-debug';

/**
 * Create a test note event (kind 1)
 */
export function createTestNote(content: string, privateKeyHex: string, tags: string[][] = []): SignedEvent {
  const event: UnsignedEvent = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content
  };

  return signEvent(event, privateKeyHex);
}

/**
 * Create metadata event (kind 0)
 */
export function createMetadataEvent(
  metadata: {
    name?: string;
    about?: string;
    picture?: string;
    nip05?: string;
    lud16?: string;
    [key: string]: any;
  },
  privateKeyHex: string
): SignedEvent {
  const event: UnsignedEvent = {
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(metadata)
  };

  return signEvent(event, privateKeyHex);
}

/**
 * Create long form article event (kind 30023)
 */
export function createArticleEvent(
  title: string,
  content: string,
  summary: string,
  privateKeyHex: string,
  options?: {
    image?: string;
    publishedAt?: number;
    tags?: string[];
  }
): SignedEvent {
  const tags: string[][] = [
    ['d', title.toLowerCase().replace(/\s+/g, '-')],
    ['title', title],
    ['summary', summary],
    ['published_at', (options?.publishedAt || Math.floor(Date.now() / 1000)).toString()]
  ];

  if (options?.image) {
    tags.push(['image', options.image]);
  }

  if (options?.tags && options.tags.length > 0) {
    options.tags.forEach(tag => tags.push(['t', tag]));
  }

  const event: UnsignedEvent = {
    kind: 30023,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content
  };

  return signEvent(event, privateKeyHex);
}

/**
 * Create zap receipt event (kind 9735)
 */
export function createZapReceiptEvent(
  bolt11: string,
  zapRequest: string,
  privateKeyHex: string,
  options?: {
    preimage?: string;
    description?: string;
  }
): SignedEvent {
  const tags: string[][] = [
    ['bolt11', bolt11],
    ['description', zapRequest]
  ];

  if (options?.preimage) {
    tags.push(['preimage', options.preimage]);
  }

  const event: UnsignedEvent = {
    kind: 9735,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: options?.description || ''
  };

  return signEvent(event, privateKeyHex);
}

/**
 * Create custom event with any kind
 */
export function createCustomEvent(
  kind: number,
  content: string,
  tags: string[][],
  privateKeyHex: string
): SignedEvent {
  const event: UnsignedEvent = {
    kind,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content
  };

  return signEvent(event, privateKeyHex);
}

/**
 * Sign an unsigned event
 */
export function signEvent(event: UnsignedEvent, privateKeyHex: string): SignedEvent {
  try {
    const privateKeyBytes = hexToBytes(privateKeyHex);
    const signedEvent = finalizeEvent(event, privateKeyBytes);
    
    return {
      ...signedEvent,
      id: signedEvent.id,
      pubkey: signedEvent.pubkey,
      sig: signedEvent.sig
    } as SignedEvent;
  } catch (error) {
    throw new Error(`Failed to sign event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Verify event signature
 */
export function verifyEventSignature(event: SignedEvent): EventVerification {
  const result: EventVerification = {
    isValid: false,
    eventId: event.id,
    pubkey: event.pubkey
  };

  try {
    // Verify event hash
    const expectedId = getEventHash(event);
    if (expectedId !== event.id) {
      result.errors = [`Event ID mismatch. Expected: ${expectedId}, Got: ${event.id}`];
      return result;
    }

    // Verify signature
    const isValid = verifyEvent(event);
    result.isValid = isValid;
    
    if (!isValid) {
      result.errors = ['Signature verification failed'];
    }

    result.timestamp = event.created_at;
    result.kind = event.kind;

  } catch (error) {
    result.errors = [`Verification error: ${error instanceof Error ? error.message : 'Unknown error'}`];
  }

  return result;
}

/**
 * Re-sign event with another key
 */
export function resignEvent(event: SignedEvent, newPrivateKeyHex: string): SignedEvent {
  const unsignedEvent: UnsignedEvent = {
    kind: event.kind,
    created_at: Math.floor(Date.now() / 1000), // New timestamp
    tags: event.tags,
    content: event.content
  };

  return signEvent(unsignedEvent, newPrivateKeyHex);
}

/**
 * Get event hash/ID without signing
 */
export function calculateEventId(event: UnsignedEvent, pubkey: string): string {
  try {
    const eventWithPubkey = {
      ...event,
      pubkey
    };
    return getEventHash(eventWithPubkey);
  } catch (error) {
    throw new Error(`Failed to calculate event ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse and validate event structure
 */
export function validateEventStructure(event: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event || typeof event !== 'object') {
    errors.push('Event must be an object');
    return { isValid: false, errors };
  }

  // Check required fields
  if (typeof event.id !== 'string' || !/^[0-9a-fA-F]{64}$/.test(event.id)) {
    errors.push('Invalid or missing event ID (must be 64-char hex)');
  }

  if (typeof event.pubkey !== 'string' || !/^[0-9a-fA-F]{64}$/.test(event.pubkey)) {
    errors.push('Invalid or missing pubkey (must be 64-char hex)');
  }

  if (typeof event.sig !== 'string' || !/^[0-9a-fA-F]{128}$/.test(event.sig)) {
    errors.push('Invalid or missing signature (must be 128-char hex)');
  }

  if (typeof event.kind !== 'number' || event.kind < 0) {
    errors.push('Invalid or missing kind (must be non-negative number)');
  }

  if (typeof event.created_at !== 'number') {
    errors.push('Invalid or missing created_at (must be number)');
  }

  if (!Array.isArray(event.tags)) {
    errors.push('Invalid or missing tags (must be array)');
  } else {
    event.tags.forEach((tag: any, index: number) => {
      if (!Array.isArray(tag)) {
        errors.push(`Tag at index ${index} must be an array`);
      }
    });
  }

  if (typeof event.content !== 'string') {
    errors.push('Invalid or missing content (must be string)');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Create batch of test events
 */
export function createBatchEvents(
  count: number,
  privateKeyHex: string,
  kind: number = 1
): SignedEvent[] {
  const events: SignedEvent[] = [];
  
  for (let i = 0; i < count; i++) {
    const content = `Test event #${i + 1} - ${new Date().toISOString()}`;
    const event = createCustomEvent(kind, content, [], privateKeyHex);
    events.push(event);
  }

  return events;
}

/**
 * Export event as JSON
 */
export function exportEventJSON(event: SignedEvent, pretty: boolean = true): string {
  return JSON.stringify(event, null, pretty ? 2 : 0);
}

/**
 * Import event from JSON
 */
export function importEventJSON(jsonString: string): SignedEvent {
  try {
    const event = JSON.parse(jsonString);
    const validation = validateEventStructure(event);
    
    if (!validation.isValid) {
      throw new Error(`Invalid event structure: ${validation.errors.join(', ')}`);
    }

    return event as SignedEvent;
  } catch (error) {
    throw new Error(`Failed to import event: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
