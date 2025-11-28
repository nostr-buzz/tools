/**
 * NIP Tools - Complete NIP Implementation & Testing
 * Support for all major Nostr Implementation Possibilities (NIPs)
 */

import { nip04, nip05, nip19, nip57 } from 'nostr-tools';
import type { NostrEvent, UnsignedNostrEvent } from '../types/nostr-debug';

// ============================================
// NIP-01: Basic Protocol
// ============================================

export interface NIP01Event extends NostrEvent {
  // Basic event structure validation
}

export function validateNIP01Event(event: NostrEvent): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!event.id || typeof event.id !== 'string') errors.push('Invalid or missing id');
  if (!event.pubkey || typeof event.pubkey !== 'string') errors.push('Invalid or missing pubkey');
  if (!event.sig || typeof event.sig !== 'string') errors.push('Invalid or missing signature');
  if (typeof event.created_at !== 'number') errors.push('Invalid created_at timestamp');
  if (typeof event.kind !== 'number') errors.push('Invalid kind');
  if (!Array.isArray(event.tags)) errors.push('Tags must be an array');
  if (typeof event.content !== 'string') errors.push('Content must be a string');

  return { valid: errors.length === 0, errors };
}

// ============================================
// NIP-02: Contact List / Follow List
// ============================================

export interface ContactListEntry {
  pubkey: string;
  relay?: string;
  petname?: string;
}

export function createContactListEvent(
  contacts: ContactListEntry[],
  pubkey: string
): UnsignedNostrEvent {
  const tags = contacts.map(c => {
    const tag = ['p', c.pubkey];
    if (c.relay) tag.push(c.relay);
    if (c.petname) tag.push(c.petname);
    return tag;
  });

  return {
    kind: 3,
    tags,
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    pubkey
  };
}

export function parseContactList(event: NostrEvent): ContactListEntry[] {
  if (event.kind !== 3) {
    throw new Error('Event must be kind 3 (Contact List)');
  }

  return event.tags
    .filter(tag => tag[0] === 'p')
    .map(tag => ({
      pubkey: tag[1],
      relay: tag[2],
      petname: tag[3]
    }));
}

// ============================================
// NIP-04: Encrypted Direct Messages
// ============================================

export async function encryptDM(
  message: string,
  recipientPubkey: string,
  senderPrivkey: string
): Promise<string> {
  return await nip04.encrypt(senderPrivkey, recipientPubkey, message);
}

export async function decryptDM(
  encryptedContent: string,
  senderPubkey: string,
  recipientPrivkey: string
): Promise<string> {
  return await nip04.decrypt(recipientPrivkey, senderPubkey, encryptedContent);
}

export function createDMEvent(
  encryptedContent: string,
  recipientPubkey: string,
  senderPubkey: string
): UnsignedNostrEvent {
  return {
    kind: 4,
    tags: [['p', recipientPubkey]],
    content: encryptedContent,
    created_at: Math.floor(Date.now() / 1000),
    pubkey: senderPubkey
  };
}

// ============================================
// NIP-05: DNS-based Verification
// ============================================

export async function verifyNIP05(
  identifier: string,
  pubkey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const profile = await nip05.queryProfile(identifier);
    
    if (!profile) {
      return { valid: false, error: 'Profile not found' };
    }

    return {
      valid: profile.pubkey === pubkey,
      error: profile.pubkey !== pubkey ? 'Pubkey mismatch' : undefined
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    };
  }
}

export function parseNIP05Identifier(identifier: string): { name: string; domain: string } | null {
  const parts = identifier.split('@');
  if (parts.length !== 2) return null;
  
  return {
    name: parts[0],
    domain: parts[1]
  };
}

// ============================================
// NIP-06: BIP-39 Seed Phrases (handled in wallet-seed.ts)
// ============================================

// ============================================
// NIP-07: window.nostr Browser Extension
// ============================================

export interface NIP07Provider {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedNostrEvent): Promise<NostrEvent>;
  getRelays?(): Promise<{ [url: string]: { read: boolean; write: boolean } }>;
  nip04?: {
    encrypt(pubkey: string, plaintext: string): Promise<string>;
    decrypt(pubkey: string, ciphertext: string): Promise<string>;
  };
}

export async function checkNIP07Support(): Promise<boolean> {
  return typeof window !== 'undefined' && 'nostr' in window;
}

export async function getNIP07PublicKey(): Promise<string | null> {
  if (!await checkNIP07Support()) return null;
  try {
    const nostr = (window as any).nostr as NIP07Provider;
    return await nostr.getPublicKey();
  } catch {
    return null;
  }
}

// ============================================
// NIP-10: Text Note References (e, p tags)
// ============================================

export interface NIP10Reference {
  eventId: string;
  relayUrl?: string;
  marker?: 'reply' | 'root' | 'mention';
}

export function createReplyEvent(
  content: string,
  rootEventId: string,
  replyToEventId: string,
  pubkey: string,
  mentionedPubkeys: string[] = []
): UnsignedNostrEvent {
  const tags: string[][] = [
    ['e', rootEventId, '', 'root'],
    ['e', replyToEventId, '', 'reply']
  ];

  mentionedPubkeys.forEach(pk => {
    tags.push(['p', pk]);
  });

  return {
    kind: 1,
    tags,
    content,
    created_at: Math.floor(Date.now() / 1000),
    pubkey
  };
}

export function parseNIP10Tags(event: NostrEvent): {
  root?: NIP10Reference;
  reply?: NIP10Reference;
  mentions: NIP10Reference[];
} {
  const eTags = event.tags.filter(tag => tag[0] === 'e');
  
  let root: NIP10Reference | undefined;
  let reply: NIP10Reference | undefined;
  const mentions: NIP10Reference[] = [];

  eTags.forEach(tag => {
    const ref: NIP10Reference = {
      eventId: tag[1],
      relayUrl: tag[2] || undefined,
      marker: tag[3] as any
    };

    if (tag[3] === 'root') {
      root = ref;
    } else if (tag[3] === 'reply') {
      reply = ref;
    } else if (tag[3] === 'mention') {
      mentions.push(ref);
    }
  });

  return { root, reply, mentions };
}

// ============================================
// NIP-13: Proof of Work
// ============================================

export function countLeadingZeroBits(hash: string): number {
  let count = 0;
  for (let i = 0; i < hash.length; i++) {
    const nibble = parseInt(hash[i], 16);
    if (nibble === 0) {
      count += 4;
    } else {
      count += Math.clz32(nibble) - 28;
      break;
    }
  }
  return count;
}

export function validatePOW(event: NostrEvent, difficulty: number): boolean {
  const nonceTag = event.tags.find(tag => tag[0] === 'nonce');
  if (!nonceTag) return false;

  const targetDifficulty = parseInt(nonceTag[2] || '0');
  if (targetDifficulty < difficulty) return false;

  const leadingZeros = countLeadingZeroBits(event.id);
  return leadingZeros >= difficulty;
}

// ============================================
// NIP-19: bech32 Entities
// ============================================

export function encodeNIP19Note(eventId: string): string {
  return nip19.noteEncode(eventId);
}

export function decodeNIP19Note(note: string): string {
  const decoded = nip19.decode(note);
  if (decoded.type !== 'note') throw new Error('Not a note');
  return decoded.data;
}

export function encodeNIP19Nevent(eventId: string, relays: string[] = []): string {
  return nip19.neventEncode({ id: eventId, relays });
}

export function decodeNIP19Nevent(nevent: string): { id: string; relays?: string[] } {
  const decoded = nip19.decode(nevent);
  if (decoded.type !== 'nevent') throw new Error('Not a nevent');
  return decoded.data;
}

export function encodeNIP19Nprofile(pubkey: string, relays: string[] = []): string {
  return nip19.nprofileEncode({ pubkey, relays });
}

export function decodeNIP19Nprofile(nprofile: string): { pubkey: string; relays?: string[] } {
  const decoded = nip19.decode(nprofile);
  if (decoded.type !== 'nprofile') throw new Error('Not a nprofile');
  return decoded.data;
}

export function encodeNIP19Naddr(
  identifier: string,
  pubkey: string,
  kind: number,
  relays: string[] = []
): string {
  return nip19.naddrEncode({ identifier, pubkey, kind, relays });
}

// ============================================
// NIP-25: Reactions
// ============================================

export function createReaction(
  eventId: string,
  eventAuthor: string,
  content: string,
  pubkey: string
): UnsignedNostrEvent {
  return {
    kind: 7,
    tags: [
      ['e', eventId],
      ['p', eventAuthor]
    ],
    content,
    created_at: Math.floor(Date.now() / 1000),
    pubkey
  };
}

// ============================================
// NIP-26: Delegated Event Signing
// ============================================

export interface DelegationToken {
  delegator: string;
  delegatee: string;
  conditions: string;
  signature: string;
}

export function parseDelegationTag(event: NostrEvent): DelegationToken | null {
  const delegationTag = event.tags.find(tag => tag[0] === 'delegation');
  if (!delegationTag) return null;

  return {
    delegator: delegationTag[1],
    conditions: delegationTag[2],
    signature: delegationTag[3],
    delegatee: event.pubkey
  };
}

// ============================================
// NIP-27: Text Note References (nostr: URIs)
// ============================================

export function parseNostrURIs(content: string): string[] {
  const regex = /nostr:(npub|note|nprofile|nevent|naddr)[a-zA-Z0-9]+/g;
  return content.match(regex) || [];
}

export function replaceNostrURIs(content: string, replacer: (uri: string) => string): string {
  return content.replace(/nostr:(npub|note|nprofile|nevent|naddr)[a-zA-Z0-9]+/g, replacer);
}

// ============================================
// NIP-40: Expiration Timestamp
// ============================================

export function addExpiration(
  event: UnsignedNostrEvent,
  expirationTimestamp: number
): UnsignedNostrEvent {
  return {
    ...event,
    tags: [...event.tags, ['expiration', expirationTimestamp.toString()]]
  };
}

export function getExpiration(event: NostrEvent): number | null {
  const expirationTag = event.tags.find(tag => tag[0] === 'expiration');
  return expirationTag ? parseInt(expirationTag[1]) : null;
}

export function isExpired(event: NostrEvent): boolean {
  const expiration = getExpiration(event);
  if (!expiration) return false;
  return Date.now() / 1000 > expiration;
}

// ============================================
// NIP-42: Authentication (Relay AUTH)
// ============================================

export function createAuthEvent(
  challenge: string,
  relayUrl: string,
  pubkey: string
): UnsignedNostrEvent {
  return {
    kind: 22242,
    tags: [
      ['relay', relayUrl],
      ['challenge', challenge]
    ],
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    pubkey
  };
}

// ============================================
// NIP-57: Lightning Zaps
// ============================================

export function parseZapRequest(event: NostrEvent): {
  amount?: number;
  lnurl?: string;
  relays?: string[];
  content?: string;
} {
  if (event.kind !== 9734) {
    throw new Error('Event must be kind 9734 (Zap Request)');
  }

  const amountTag = event.tags.find(tag => tag[0] === 'amount');
  const lnurlTag = event.tags.find(tag => tag[0] === 'lnurl');
  const relaysTag = event.tags.find(tag => tag[0] === 'relays');

  return {
    amount: amountTag ? parseInt(amountTag[1]) : undefined,
    lnurl: lnurlTag?.[1],
    relays: relaysTag ? relaysTag.slice(1) : undefined,
    content: event.content
  };
}

export function parseNIP57ZapReceipt(event: NostrEvent): {
  bolt11: string;
  description: string;
  preimage?: string;
  zappedEvent?: string;
  zappedAuthor?: string;
} {
  if (event.kind !== 9735) {
    throw new Error('Event must be kind 9735 (Zap Receipt)');
  }

  const bolt11Tag = event.tags.find(tag => tag[0] === 'bolt11');
  const descriptionTag = event.tags.find(tag => tag[0] === 'description');
  const preimageTag = event.tags.find(tag => tag[0] === 'preimage');
  const eTag = event.tags.find(tag => tag[0] === 'e');
  const pTag = event.tags.find(tag => tag[0] === 'p');

  if (!bolt11Tag || !descriptionTag) {
    throw new Error('Invalid zap receipt: missing required tags');
  }

  return {
    bolt11: bolt11Tag[1],
    description: descriptionTag[1],
    preimage: preimageTag?.[1],
    zappedEvent: eTag?.[1],
    zappedAuthor: pTag?.[1]
  };
}

// ============================================
// NIP-65: Relay List Metadata
// ============================================

export interface RelayListEntry {
  url: string;
  read: boolean;
  write: boolean;
}

export function createRelayListEvent(
  relays: RelayListEntry[],
  pubkey: string
): UnsignedNostrEvent {
  const tags = relays.map(relay => {
    const tag = ['r', relay.url];
    if (relay.read && !relay.write) tag.push('read');
    if (relay.write && !relay.read) tag.push('write');
    return tag;
  });

  return {
    kind: 10002,
    tags,
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    pubkey
  };
}

export function parseRelayList(event: NostrEvent): RelayListEntry[] {
  if (event.kind !== 10002) {
    throw new Error('Event must be kind 10002 (Relay List)');
  }

  return event.tags
    .filter(tag => tag[0] === 'r')
    .map(tag => ({
      url: tag[1],
      read: !tag[2] || tag[2] === 'read',
      write: !tag[2] || tag[2] === 'write'
    }));
}

// ============================================
// NIP-94: File Metadata
// ============================================

export interface FileMetadata {
  url: string;
  mimeType?: string;
  hash?: string;
  size?: number;
  dimensions?: { width: number; height: number };
  blurhash?: string;
  alt?: string;
}

export function createFileMetadataEvent(
  file: FileMetadata,
  pubkey: string
): UnsignedNostrEvent {
  const tags: string[][] = [['url', file.url]];
  
  if (file.mimeType) tags.push(['m', file.mimeType]);
  if (file.hash) tags.push(['x', file.hash]);
  if (file.size) tags.push(['size', file.size.toString()]);
  if (file.dimensions) tags.push(['dim', `${file.dimensions.width}x${file.dimensions.height}`]);
  if (file.blurhash) tags.push(['blurhash', file.blurhash]);
  if (file.alt) tags.push(['alt', file.alt]);

  return {
    kind: 1063,
    tags,
    content: '',
    created_at: Math.floor(Date.now() / 1000),
    pubkey
  };
}

// ============================================
// NIP Testing & Validation
// ============================================

export interface NIPSupport {
  nip: number;
  name: string;
  supported: boolean;
  tested?: boolean;
  errors?: string[];
}

export function getAllSupportedNIPs(): NIPSupport[] {
  return [
    { nip: 1, name: 'Basic Protocol', supported: true, tested: true },
    { nip: 2, name: 'Contact List', supported: true, tested: true },
    { nip: 4, name: 'Encrypted DMs', supported: true, tested: true },
    { nip: 5, name: 'DNS-based Verification', supported: true, tested: true },
    { nip: 6, name: 'BIP-39 Seeds', supported: true, tested: true },
    { nip: 7, name: 'Browser Extension', supported: true, tested: true },
    { nip: 10, name: 'Text Note References', supported: true, tested: true },
    { nip: 13, name: 'Proof of Work', supported: true, tested: true },
    { nip: 19, name: 'bech32 Entities', supported: true, tested: true },
    { nip: 25, name: 'Reactions', supported: true, tested: true },
    { nip: 26, name: 'Delegated Signing', supported: true, tested: true },
    { nip: 27, name: 'nostr: URIs', supported: true, tested: true },
    { nip: 40, name: 'Expiration', supported: true, tested: true },
    { nip: 42, name: 'Authentication', supported: true, tested: true },
    { nip: 57, name: 'Lightning Zaps', supported: true, tested: true },
    { nip: 65, name: 'Relay Lists', supported: true, tested: true },
    { nip: 94, name: 'File Metadata', supported: true, tested: true }
  ];
}
