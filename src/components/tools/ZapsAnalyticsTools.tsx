/**
 * Zaps & Analytics Tools Component
 * Lightning payment analytics and zap receipt parsing
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  parseBolt11,
  parseZapReceipt,
  validateZapReceipt,
  formatSats
} from '@/lib/zaps-analytics';
import { Copy, Check, AlertCircle, Zap } from 'lucide-react';

export function ZapsAnalyticsTools() {
  const [activeTab, setActiveTab] = useState('bolt11');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Bolt11 parsing
  const [bolt11Input, setBolt11Input] = useState('');
  const [bolt11Result, setBolt11Result] = useState<any>(null);

  // Zap receipt parsing
  const [zapReceiptInput, setZapReceiptInput] = useState('');
  const [zapReceiptResult, setZapReceiptResult] = useState<any>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleParseBolt11 = () => {
    try {
      setError('');
      const result = parseBolt11(bolt11Input);
      setBolt11Result(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse bolt11');
    }
  };

  const handleParseZapReceipt = () => {
    try {
      setError('');
      const event = JSON.parse(zapReceiptInput);
      const result = parseZapReceipt(event);
      const validation = validateZapReceipt(event);
      setZapReceiptResult({ ...result, validation });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse zap receipt');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Zaps & Analytics
        </CardTitle>
        <CardDescription>
          Lightning payment analysis and zap receipt validation
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bolt11">Parse Bolt11</TabsTrigger>
            <TabsTrigger value="zap">Zap Receipts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Bolt11 Parsing */}
          <TabsContent value="bolt11" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Lightning Invoice (bolt11)</Label>
                <Textarea
                  placeholder="lnbc..."
                  value={bolt11Input}
                  onChange={(e) => setBolt11Input(e.target.value)}
                  rows={4}
                  className="font-mono text-xs"
                />
              </div>

              <Button onClick={handleParseBolt11} className="w-full">
                Parse Invoice
              </Button>

              {bolt11Result && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">Amount</Label>
                      <div className="text-lg font-bold">
                        {formatSats(bolt11Result.amount || 0)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <Badge variant={bolt11Result.isValid ? 'default' : 'destructive'}>
                        {bolt11Result.isValid ? 'Valid' : 'Invalid'}
                      </Badge>
                    </div>
                  </div>

                  {bolt11Result.timestamp && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Created</Label>
                      <div className="text-sm">
                        {new Date(bolt11Result.timestamp * 1000).toLocaleString()}
                      </div>
                    </div>
                  )}

                  {bolt11Result.description && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Description</Label>
                      <div className="text-sm bg-muted p-2 rounded">
                        {bolt11Result.description}
                      </div>
                    </div>
                  )}

                  {bolt11Result.paymentHash && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Hash</Label>
                      <div className="flex gap-2">
                        <code className="text-xs bg-muted p-2 rounded flex-1 overflow-x-auto">
                          {bolt11Result.paymentHash}
                        </code>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopy(bolt11Result.paymentHash)}
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Zap Receipt Parsing */}
          <TabsContent value="zap" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Zap Receipt Event (JSON)</Label>
                <Textarea
                  placeholder='{"kind": 9735, "tags": [...], ...}'
                  value={zapReceiptInput}
                  onChange={(e) => setZapReceiptInput(e.target.value)}
                  rows={8}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste a complete kind 9735 event
                </p>
              </div>

              <Button onClick={handleParseZapReceipt} className="w-full">
                Parse Zap Receipt
              </Button>

              {zapReceiptResult && (
                <div className="space-y-3">
                  <Alert variant={zapReceiptResult.validation.isValid ? 'default' : 'destructive'}>
                    <AlertDescription>
                      {zapReceiptResult.validation.isValid ? (
                        <span className="flex items-center gap-2">
                          <Check className="h-4 w-4" />
                          Valid zap receipt
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4" />
                          {zapReceiptResult.validation.errors?.join(', ')}
                        </span>
                      )}
                    </AlertDescription>
                  </Alert>

                  {zapReceiptResult.amount && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Zap Amount</Label>
                      <div className="text-2xl font-bold text-orange-600">
                        ⚡ {formatSats(zapReceiptResult.amount)}
                      </div>
                    </div>
                  )}

                  {zapReceiptResult.zappedAuthor && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Zapped Author</Label>
                      <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                        {zapReceiptResult.zappedAuthor}
                      </code>
                    </div>
                  )}

                  {zapReceiptResult.zappedEvent && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Zapped Event</Label>
                      <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                        {zapReceiptResult.zappedEvent}
                      </code>
                    </div>
                  )}

                  {zapReceiptResult.sender && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Sender</Label>
                      <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                        {zapReceiptResult.sender}
                      </code>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="space-y-4">
              <Alert>
                <Zap className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p className="font-semibold">Zap Analytics Features:</p>
                    <ul className="list-disc list-inside text-sm space-y-1">
                      <li>Total zaps received/sent tracking</li>
                      <li>Average zap amount calculation</li>
                      <li>Top zappers leaderboard</li>
                      <li>Zap distribution by time</li>
                      <li>Event-level zap aggregation</li>
                    </ul>
                  </div>
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Example Analytics Output</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Zaps</div>
                      <div className="text-2xl font-bold">1,234</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Total Sats</div>
                      <div className="text-2xl font-bold text-orange-600">
                        ⚡ 456.7K
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">Avg per Zap</div>
                      <div className="text-2xl font-bold">370</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label className="text-sm font-semibold mb-2 block">
                  Supported Formats
                </Label>
                <div className="space-y-2">
                  <Badge>NIP-57 Zap Receipts</Badge>
                  <Badge variant="secondary">Lightning Invoices (bolt11)</Badge>
                  <Badge variant="outline">Payment Preimages</Badge>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
