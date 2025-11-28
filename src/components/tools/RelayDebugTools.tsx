/**
 * Relay Debug Tools Component
 * UI for relay connection, health check, and testing
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Radio, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import {
  healthCheckRelay,
  pingRelay,
  getRelayInfo,
  testRelayCompliance,
  compareRelays
} from '@/lib/relay-debug';
import type { RelayHealthCheck, RelayInfo, RelayTestResult } from '@/types/nostr-debug';

export function RelayDebugTools() {
  const [relayUrl, setRelayUrl] = useState('wss://relay.damus.io');
  const [relayUrls, setRelayUrls] = useState<string[]>([]);
  const [healthCheck, setHealthCheck] = useState<RelayHealthCheck | null>(null);
  const [relayInfo, setRelayInfo] = useState<RelayInfo | null>(null);
  const [testResult, setTestResult] = useState<RelayTestResult | null>(null);
  const [compareResults, setCompareResults] = useState<RelayTestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultRelays = [
    'wss://relay.damus.io',
    'wss://relay.nostr.band',
    'wss://nos.lol',
    'wss://relay.snort.social',
    'wss://nostr.wine'
  ];

  const handleHealthCheck = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await healthCheckRelay(relayUrl);
      setHealthCheck(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePing = async () => {
    setLoading(true);
    setError('');
    
    try {
      const latency = await pingRelay(relayUrl);
      alert(`Relay latency: ${latency.toFixed(2)}ms`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ping failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGetInfo = async () => {
    setLoading(true);
    setError('');
    
    try {
      const info = await getRelayInfo(relayUrl);
      setRelayInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get relay info');
    } finally {
      setLoading(false);
    }
  };

  const handleTestCompliance = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await testRelayCompliance(relayUrl);
      setTestResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Compliance test failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCompareRelays = async () => {
    setLoading(true);
    setError('');
    
    try {
      const results = await compareRelays(defaultRelays);
      setCompareResults(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            Relay Debug Tools
          </CardTitle>
          <CardDescription>
            Test relay connections, health, and compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="test" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="test">Single Relay</TabsTrigger>
              <TabsTrigger value="info">Relay Info</TabsTrigger>
              <TabsTrigger value="compare">Compare</TabsTrigger>
            </TabsList>

            <TabsContent value="test" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Relay URL</Label>
                  <Input
                    value={relayUrl}
                    onChange={(e) => setRelayUrl(e.target.value)}
                    placeholder="wss://relay.example.com"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={handleHealthCheck} disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Health Check
                  </Button>
                  <Button onClick={handlePing} disabled={loading} variant="secondary">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                    Ping
                  </Button>
                </div>

                <Button onClick={handleTestCompliance} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test NIP-01 Compliance
                </Button>

                {healthCheck && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        {healthCheck.isHealthy ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        Health Check Result
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Status</div>
                          <Badge variant={healthCheck.isHealthy ? 'default' : 'destructive'}>
                            {healthCheck.isHealthy ? 'Healthy' : 'Unhealthy'}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Latency</div>
                          <div className="text-lg font-semibold">{healthCheck.latency.toFixed(2)}ms</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Read Support</div>
                          <Badge variant={healthCheck.supportsRead ? 'default' : 'secondary'}>
                            {healthCheck.supportsRead ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Write Support</div>
                          <Badge variant={healthCheck.supportsWrite ? 'default' : 'secondary'}>
                            {healthCheck.supportsWrite ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                      </div>
                      {healthCheck.errorMessage && (
                        <Alert variant="destructive">
                          <AlertDescription>{healthCheck.errorMessage}</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}

                {testResult && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Compliance Test Result</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">NIP-01</div>
                          <Badge variant={testResult.nip01Compliant ? 'default' : 'secondary'}>
                            {testResult.nip01Compliant ? 'Compliant' : 'Not Compliant'}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Auth Support</div>
                          <Badge variant={testResult.supportsAuth ? 'default' : 'secondary'}>
                            {testResult.supportsAuth ? 'Yes' : 'No'}
                          </Badge>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Avg Latency</div>
                          <div className="text-lg font-semibold">{testResult.averageLatency.toFixed(2)}ms</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Success Rate</div>
                          <div className="text-lg font-semibold">{(testResult.successRate * 100).toFixed(0)}%</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="info" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Relay URL</Label>
                  <Input
                    value={relayUrl}
                    onChange={(e) => setRelayUrl(e.target.value)}
                    placeholder="wss://relay.example.com"
                  />
                </div>

                <Button onClick={handleGetInfo} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Get Relay Information (NIP-11)
                </Button>

                {relayInfo && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Relay Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {relayInfo.software && (
                        <div>
                          <div className="text-sm text-muted-foreground">Software</div>
                          <div className="font-semibold">{relayInfo.software} {relayInfo.version}</div>
                        </div>
                      )}

                      {relayInfo.supported_nips && relayInfo.supported_nips.length > 0 && (
                        <div>
                          <div className="text-sm text-muted-foreground mb-2">Supported NIPs</div>
                          <div className="flex flex-wrap gap-1">
                            {relayInfo.supported_nips.map(nip => (
                              <Badge key={nip} variant="secondary">NIP-{nip}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {relayInfo.errorMessage && (
                        <Alert variant="destructive">
                          <AlertDescription>{relayInfo.errorMessage}</AlertDescription>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            <TabsContent value="compare" className="space-y-4">
              <div className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Compare popular Nostr relays to find the fastest and most reliable
                  </AlertDescription>
                </Alert>

                <Button onClick={handleCompareRelays} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Compare Default Relays
                </Button>

                {compareResults.length > 0 && (
                  <div className="space-y-2">
                    {compareResults
                      .sort((a, b) => a.averageLatency - b.averageLatency)
                      .map((result, index) => (
                        <Card key={result.url}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">#{index + 1}</Badge>
                                  <div className="font-mono text-sm">{result.url.replace('wss://', '')}</div>
                                </div>
                                <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
                                  <span>Latency: {result.averageLatency.toFixed(0)}ms</span>
                                  <span>Success: {(result.successRate * 100).toFixed(0)}%</span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {result.nip01Compliant && <Badge variant="default">NIP-01</Badge>}
                                {result.supportsAuth && <Badge variant="secondary">Auth</Badge>}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
