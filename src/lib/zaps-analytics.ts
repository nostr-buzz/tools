/**
 * Zaps & Analytics Tools for Nostr
 * Zap payment parsing, invoice validation, and analytics
 */

import { nip57 } from 'nostr-tools';
import type {
  ZapInvoice,
  ParsedZap,
  ZapReceipt,
  ZapAnalytics,
  SignedEvent
} from '../types/nostr-debug';

/**
 * Parse bolt11 lightning invoice
 */
export function parseBolt11(bolt11: string): ZapInvoice {
  try {
    // Basic bolt11 parsing (simplified - would need full implementation)
    const invoice: ZapInvoice = {
      bolt11,
      amount: 0,
      paymentHash: '',
      timestamp: Date.now(),
      expiry: 3600,
      payee: ''
    };

    // Extract amount from bolt11 (basic implementation)
    const amountMatch = bolt11.match(/lnbc(\d+)([munp]?)/i);
    if (amountMatch) {
      let amount = parseInt(amountMatch[1]);
      const unit = amountMatch[2];
      
      // Convert to millisats
      switch (unit) {
        case 'm':
          amount *= 100_000_000; // mBTC to millisats
          break;
        case 'u':
          amount *= 100_000; // μBTC to millisats
          break;
        case 'n':
          amount *= 100; // nBTC to millisats
          break;
        case 'p':
          amount *= 0.1; // pBTC to millisats
          break;
        default:
          amount *= 100_000_000_000; // BTC to millisats
      }
      
      invoice.amount = Math.floor(amount);
    }

    return invoice;
  } catch (error) {
    throw new Error(`Failed to parse bolt11: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse zap receipt event
 */
export function parseZapReceipt(event: SignedEvent): ParsedZap | null {
  if (event.kind !== 9735) {
    return null;
  }

  const parsed: Partial<ParsedZap> = {
    timestamp: event.created_at,
    tags: event.tags,
    amount: 0,
    sender: '',
    receiver: ''
  };

  // Find bolt11 tag
  const bolt11Tag = event.tags.find(t => t[0] === 'bolt11');
  if (bolt11Tag && bolt11Tag[1]) {
    parsed.invoice = bolt11Tag[1];
    
    try {
      const invoice = parseBolt11(bolt11Tag[1]);
      parsed.amount = Math.floor(invoice.amount / 1000); // Convert to sats
    } catch (error) {
      // Continue parsing other fields
    }
  }

  // Find description tag (contains zap request)
  const descTag = event.tags.find(t => t[0] === 'description');
  if (descTag && descTag[1]) {
    try {
      const zapRequest = JSON.parse(descTag[1]);
      if (zapRequest.pubkey) {
        parsed.sender = zapRequest.pubkey;
      }
      if (zapRequest.content) {
        parsed.comment = zapRequest.content;
      }
      
      // Find 'p' tag in zap request for receiver
      const pTag = zapRequest.tags?.find((t: string[]) => t[0] === 'p');
      if (pTag && pTag[1]) {
        parsed.receiver = pTag[1];
      }

      // Find 'e' tag for event being zapped
      const eTag = zapRequest.tags?.find((t: string[]) => t[0] === 'e');
      if (eTag && eTag[1]) {
        parsed.eventId = eTag[1];
      }
    } catch (error) {
      // Invalid zap request format
    }
  }

  // Fallback: find 'p' tag directly
  if (!parsed.receiver) {
    const pTag = event.tags.find(t => t[0] === 'p');
    if (pTag && pTag[1]) {
      parsed.receiver = pTag[1];
    }
  }

  if (!parsed.sender) {
    parsed.sender = event.pubkey; // Use zapper's pubkey
  }

  return parsed as ParsedZap;
}

/**
 * Validate zap receipt
 */
export function validateZapReceipt(event: SignedEvent): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check event kind
  if (event.kind !== 9735) {
    errors.push('Event kind must be 9735');
  }

  // Check for required tags
  const bolt11Tag = event.tags.find(t => t[0] === 'bolt11');
  if (!bolt11Tag || !bolt11Tag[1]) {
    errors.push('Missing bolt11 tag');
  }

  const descTag = event.tags.find(t => t[0] === 'description');
  if (!descTag || !descTag[1]) {
    errors.push('Missing description tag');
  }

  // Validate description contains valid zap request
  if (descTag && descTag[1]) {
    try {
      const zapRequest = JSON.parse(descTag[1]);
      if (!zapRequest.pubkey) {
        errors.push('Zap request missing pubkey');
      }
      if (!zapRequest.tags || !Array.isArray(zapRequest.tags)) {
        errors.push('Zap request missing tags');
      }
    } catch (error) {
      errors.push('Invalid zap request JSON');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Calculate zap analytics from multiple zap receipts
 */
export function calculateZapAnalytics(zapReceipts: SignedEvent[]): ZapAnalytics {
  const analytics: ZapAnalytics = {
    totalZaps: 0,
    totalAmount: 0,
    averageAmount: 0,
    topZappers: [],
    topZapped: [],
    timeRange: { start: Infinity, end: 0 }
  };

  const zapperStats = new Map<string, { amount: number; count: number }>();
  const zappedStats = new Map<string, { amount: number; count: number }>();

  zapReceipts.forEach(event => {
    const parsed = parseZapReceipt(event);
    if (!parsed) return;

    analytics.totalZaps++;
    analytics.totalAmount += parsed.amount;

    // Track time range
    if (parsed.timestamp < analytics.timeRange.start) {
      analytics.timeRange.start = parsed.timestamp;
    }
    if (parsed.timestamp > analytics.timeRange.end) {
      analytics.timeRange.end = parsed.timestamp;
    }

    // Track zapper stats
    if (parsed.sender) {
      const stats = zapperStats.get(parsed.sender) || { amount: 0, count: 0 };
      stats.amount += parsed.amount;
      stats.count++;
      zapperStats.set(parsed.sender, stats);
    }

    // Track zapped stats
    if (parsed.receiver) {
      const stats = zappedStats.get(parsed.receiver) || { amount: 0, count: 0 };
      stats.amount += parsed.amount;
      stats.count++;
      zappedStats.set(parsed.receiver, stats);
    }
  });

  // Calculate average
  analytics.averageAmount = analytics.totalZaps > 0 
    ? analytics.totalAmount / analytics.totalZaps 
    : 0;

  // Sort and get top zappers
  analytics.topZappers = Array.from(zapperStats.entries())
    .map(([pubkey, stats]) => ({ pubkey, ...stats }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  // Sort and get top zapped
  analytics.topZapped = Array.from(zappedStats.entries())
    .map(([pubkey, stats]) => ({ pubkey, ...stats }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);

  return analytics;
}

/**
 * Generate fake zap receipt for testing
 */
export function generateFakeZapReceipt(
  sender: string,
  receiver: string,
  amountSats: number,
  comment?: string
): Partial<SignedEvent> {
  const zapRequest = {
    kind: 9734,
    pubkey: sender,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['p', receiver],
      ['amount', (amountSats * 1000).toString()],
      ['relays', 'wss://relay.damus.io']
    ],
    content: comment || ''
  };

  // Generate fake bolt11 (not a real invoice)
  const fakeBolt11 = `lnbc${amountSats * 10}n1fake${Date.now()}`;

  const event: Partial<SignedEvent> = {
    kind: 9735,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ['bolt11', fakeBolt11],
      ['description', JSON.stringify(zapRequest)],
      ['p', receiver]
    ],
    content: ''
  };

  return event;
}

/**
 * Format sats amount with proper units
 */
export function formatSats(sats: number): string {
  if (sats >= 100_000_000) {
    return `${(sats / 100_000_000).toFixed(2)} BTC`;
  } else if (sats >= 1_000) {
    return `${(sats / 1_000).toFixed(2)}K sats`;
  } else {
    return `${sats} sats`;
  }
}

/**
 * Convert millisats to sats
 */
export function millisatsToSats(millisats: number): number {
  return Math.floor(millisats / 1000);
}

/**
 * Convert sats to millisats
 */
export function satsToMillisats(sats: number): number {
  return sats * 1000;
}

/**
 * Calculate zap leaderboard
 */
export function calculateLeaderboard(
  zapReceipts: SignedEvent[],
  type: 'zappers' | 'zapped' = 'zappers'
): Array<{ pubkey: string; amount: number; count: number; rank: number }> {
  const analytics = calculateZapAnalytics(zapReceipts);
  const data = type === 'zappers' ? analytics.topZappers : analytics.topZapped;
  
  return data.map((entry, index) => ({
    ...entry,
    rank: index + 1
  }));
}

/**
 * Filter zaps by time range
 */
export function filterZapsByTimeRange(
  zapReceipts: SignedEvent[],
  startTime: number,
  endTime: number
): SignedEvent[] {
  return zapReceipts.filter(event => {
    const parsed = parseZapReceipt(event);
    return parsed && parsed.timestamp >= startTime && parsed.timestamp <= endTime;
  });
}

/**
 * Filter zaps by amount range
 */
export function filterZapsByAmount(
  zapReceipts: SignedEvent[],
  minSats: number,
  maxSats: number = Infinity
): SignedEvent[] {
  return zapReceipts.filter(event => {
    const parsed = parseZapReceipt(event);
    return parsed && parsed.amount >= minSats && parsed.amount <= maxSats;
  });
}

/**
 * Get zap stats for specific pubkey
 */
export function getZapStatsForPubkey(
  zapReceipts: SignedEvent[],
  pubkey: string
): {
  received: { amount: number; count: number };
  sent: { amount: number; count: number };
} {
  const stats = {
    received: { amount: 0, count: 0 },
    sent: { amount: 0, count: 0 }
  };

  zapReceipts.forEach(event => {
    const parsed = parseZapReceipt(event);
    if (!parsed) return;

    if (parsed.receiver === pubkey) {
      stats.received.amount += parsed.amount;
      stats.received.count++;
    }

    if (parsed.sender === pubkey) {
      stats.sent.amount += parsed.amount;
      stats.sent.count++;
    }
  });

  return stats;
}
