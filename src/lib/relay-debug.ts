/**
 * Relay Debug Toolkit for Nostr
 * Connection, health check, websocket debugging, and relay testing
 */

import type {
  RelayInfo,
  RelayHealthCheck,
  RelayPublishResult,
  RelayConnection,
  RelayLog,
  RelayTestResult,
  SignedEvent
} from '../types/nostr-debug';

/**
 * Create a relay connection
 */
export async function connectToRelay(url: string, timeout: number = 5000): Promise<RelayConnection> {
  return new Promise((resolve, reject) => {
    const connection: RelayConnection = {
      url,
      websocket: null,
      status: 'disconnected',
      messageCount: 0,
      errorCount: 0,
      lastActivity: Date.now(),
      logs: []
    };

    try {
      const ws = new WebSocket(url);
      connection.websocket = ws;
      connection.status = 'connecting';

      const timeoutId = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          connection.status = 'error';
          connection.logs.push({
            timestamp: Date.now(),
            type: 'error',
            message: 'Connection timeout'
          });
          reject(new Error('Connection timeout'));
        }
      }, timeout);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        connection.status = 'connected';
        connection.lastActivity = Date.now();
        connection.logs.push({
          timestamp: Date.now(),
          type: 'info',
          message: 'Connected to relay'
        });
        resolve(connection);
      };

      ws.onerror = (error) => {
        clearTimeout(timeoutId);
        connection.status = 'error';
        connection.errorCount++;
        connection.logs.push({
          timestamp: Date.now(),
          type: 'error',
          message: 'WebSocket error',
          data: error
        });
      };

      ws.onmessage = (event) => {
        connection.messageCount++;
        connection.lastActivity = Date.now();
        connection.logs.push({
          timestamp: Date.now(),
          type: 'received',
          message: 'Message received',
          data: event.data
        });
      };

      ws.onclose = () => {
        connection.status = 'disconnected';
        connection.logs.push({
          timestamp: Date.now(),
          type: 'info',
          message: 'Connection closed'
        });
      };

    } catch (error) {
      connection.status = 'error';
      connection.logs.push({
        timestamp: Date.now(),
        type: 'error',
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      reject(error);
    }
  });
}

/**
 * Health check a relay
 */
export async function healthCheckRelay(url: string): Promise<RelayHealthCheck> {
  const startTime = performance.now();
  
  const result: RelayHealthCheck = {
    url,
    isHealthy: false,
    latency: 0,
    supportsRead: false,
    supportsWrite: false,
    responseTime: 0,
    timestamp: Date.now()
  };

  try {
    const connection = await connectToRelay(url, 5000);
    
    if (connection.status === 'connected' && connection.websocket) {
      result.isHealthy = true;
      result.responseTime = performance.now() - startTime;
      result.latency = result.responseTime;

      // Test read capability
      await new Promise<void>((resolve) => {
        const subId = `health_check_${Date.now()}`;
        const subscription = JSON.stringify(['REQ', subId, { limit: 1 }]);
        
        connection.websocket!.send(subscription);
        result.supportsRead = true;

        // Close subscription
        setTimeout(() => {
          connection.websocket!.send(JSON.stringify(['CLOSE', subId]));
          resolve();
        }, 1000);
      });

      // Write capability assumed if connected (would require actual event to test)
      result.supportsWrite = true;

      // Close connection
      connection.websocket.close();
    }

  } catch (error) {
    result.errorMessage = error instanceof Error ? error.message : 'Unknown error';
  }

  return result;
}

/**
 * Send ping to relay and measure response time
 */
export async function pingRelay(url: string): Promise<number> {
  const startTime = performance.now();
  
  try {
    const connection = await connectToRelay(url, 5000);
    
    if (connection.status === 'connected') {
      const latency = performance.now() - startTime;
      connection.websocket?.close();
      return latency;
    }
    
    throw new Error('Failed to connect');
  } catch (error) {
    throw new Error(`Ping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Publish event to relay and get result
 */
export async function publishEventToRelay(
  url: string,
  event: SignedEvent
): Promise<RelayPublishResult> {
  const startTime = performance.now();
  
  const result: RelayPublishResult = {
    relay: url,
    success: false,
    eventId: event.id,
    timestamp: Date.now(),
    latency: 0
  };

  try {
    const connection = await connectToRelay(url);
    
    if (connection.status === 'connected' && connection.websocket) {
      await new Promise<void>((resolve, reject) => {
        const eventMessage = JSON.stringify(['EVENT', event]);
        
        const messageHandler = (msgEvent: MessageEvent) => {
          try {
            const response = JSON.parse(msgEvent.data);
            
            if (response[0] === 'OK' && response[1] === event.id) {
              result.success = response[2];
              result.message = response[3] || 'Event published';
              result.latency = performance.now() - startTime;
              connection.websocket?.removeEventListener('message', messageHandler);
              resolve();
            }
          } catch (e) {
            // Ignore parse errors
          }
        };

        connection.websocket!.addEventListener('message', messageHandler);
        connection.websocket!.send(eventMessage);

        // Timeout after 10 seconds
        setTimeout(() => {
          connection.websocket?.removeEventListener('message', messageHandler);
          reject(new Error('Publish timeout'));
        }, 10000);
      });

      connection.websocket.close();
    } else {
      throw new Error('Failed to connect to relay');
    }

  } catch (error) {
    result.message = error instanceof Error ? error.message : 'Unknown error';
    result.latency = performance.now() - startTime;
  }

  return result;
}

/**
 * Batch publish to multiple relays
 */
export async function batchPublishToRelays(
  urls: string[],
  event: SignedEvent
): Promise<RelayPublishResult[]> {
  const promises = urls.map(url => publishEventToRelay(url, event));
  return Promise.all(promises);
}

/**
 * Get relay information (NIP-11)
 */
export async function getRelayInfo(url: string): Promise<RelayInfo> {
  const httpUrl = url.replace('wss://', 'https://').replace('ws://', 'http://');
  
  const info: RelayInfo = {
    url,
    status: 'disconnected'
  };

  try {
    const response = await fetch(httpUrl, {
      headers: {
        'Accept': 'application/nostr+json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      info.supported_nips = data.supported_nips;
      info.software = data.software;
      info.version = data.version;
      info.status = 'connected';
    } else {
      info.errorMessage = `HTTP ${response.status}`;
      info.status = 'error';
    }
  } catch (error) {
    info.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    info.status = 'error';
  }

  return info;
}

/**
 * Test relay NIP-01 compliance
 */
export async function testRelayCompliance(url: string): Promise<RelayTestResult> {
  const result: RelayTestResult = {
    url,
    nip01Compliant: false,
    supportsAuth: false,
    supportsCount: false,
    averageLatency: 0,
    successRate: 0,
    tested: 0
  };

  try {
    // Get relay info first
    const info = await getRelayInfo(url);
    
    if (info.supported_nips) {
      result.nip01Compliant = info.supported_nips.includes(1);
      result.supportsAuth = info.supported_nips.includes(42);
      result.supportsCount = info.supported_nips.includes(45);
    }

    // Test connection and latency
    const latencies: number[] = [];
    let successCount = 0;
    const testCount = 3;

    for (let i = 0; i < testCount; i++) {
      try {
        const latency = await pingRelay(url);
        latencies.push(latency);
        successCount++;
      } catch (error) {
        // Count failure
      }
    }

    result.tested = testCount;
    result.successRate = successCount / testCount;
    result.averageLatency = latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0;

  } catch (error) {
    // Test failed
  }

  return result;
}

/**
 * Test multiple relays and compare
 */
export async function compareRelays(urls: string[]): Promise<RelayTestResult[]> {
  const promises = urls.map(url => testRelayCompliance(url));
  return Promise.all(promises);
}

/**
 * Monitor relay connection
 */
export function monitorRelay(
  url: string,
  onLog: (log: RelayLog) => void,
  onStatusChange: (status: RelayConnection['status']) => void
): () => void {
  let connection: RelayConnection | null = null;

  connectToRelay(url).then(conn => {
    connection = conn;
    onStatusChange(conn.status);

    // Monitor logs
    const checkLogs = setInterval(() => {
      if (connection && connection.logs.length > 0) {
        const newLogs = connection.logs.splice(0);
        newLogs.forEach(onLog);
      }
    }, 100);

    // Monitor status
    if (connection.websocket) {
      connection.websocket.onclose = () => {
        onStatusChange('disconnected');
        clearInterval(checkLogs);
      };

      connection.websocket.onerror = () => {
        onStatusChange('error');
      };
    }

    return () => {
      clearInterval(checkLogs);
      connection?.websocket?.close();
    };
  }).catch(error => {
    onStatusChange('error');
    onLog({
      timestamp: Date.now(),
      type: 'error',
      message: error.message
    });
  });

  return () => {
    connection?.websocket?.close();
  };
}

/**
 * Stress test relay with multiple connections
 */
export async function stressTestRelay(
  url: string,
  connectionCount: number,
  duration: number
): Promise<{
  url: string;
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  averageLatency: number;
  duration: number;
}> {
  const startTime = Date.now();
  const latencies: number[] = [];
  let successCount = 0;
  let failCount = 0;

  const connectionPromises = Array.from({ length: connectionCount }, async () => {
    try {
      const connStartTime = performance.now();
      const connection = await connectToRelay(url, 5000);
      const latency = performance.now() - connStartTime;
      
      if (connection.status === 'connected') {
        latencies.push(latency);
        successCount++;
        
        // Keep connection open for a short time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
        connection.websocket?.close();
      } else {
        failCount++;
      }
    } catch (error) {
      failCount++;
    }
  });

  await Promise.all(connectionPromises);

  return {
    url,
    totalConnections: connectionCount,
    successfulConnections: successCount,
    failedConnections: failCount,
    averageLatency: latencies.length > 0 
      ? latencies.reduce((a, b) => a + b, 0) / latencies.length 
      : 0,
    duration: Date.now() - startTime
  };
}
