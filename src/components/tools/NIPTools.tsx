/**
 * NIP Tools Component
 * UI for testing and exploring Nostr Implementation Possibilities
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  getAllSupportedNIPs,
  validateNIP01Event,
  parseContactList,
  encryptDM,
  decryptDM,
  verifyNIP05,
  encodeNIP19Note,
  decodeNIP19Note,
  encodeNIP19Nevent,
  createReaction,
  parseNostrURIs,
  isExpired,
  getExpiration,
  parseNIP57ZapReceipt,
  countLeadingZeroBits
} from '@/lib/nip-tools';
import { Copy, Check, AlertCircle, CheckCircle } from 'lucide-react';

export function NIPTools() {
  const [activeTab, setActiveTab] = useState('overview');
  const [result, setResult] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // NIP-05 Verification
  const [nip05Identifier, setNip05Identifier] = useState('');
  const [nip05Pubkey, setNip05Pubkey] = useState('');
  const [nip05Result, setNip05Result] = useState<{ valid: boolean; error?: string } | null>(null);

  // NIP-19 Encoding
  const [nip19Input, setNip19Input] = useState('');
  const [nip19Output, setNip19Output] = useState('');

  // NIP-04 Encryption
  const [nip04Message, setNip04Message] = useState('');
  const [nip04RecipientPubkey, setNip04RecipientPubkey] = useState('');
  const [nip04SenderPrivkey, setNip04SenderPrivkey] = useState('');
  const [nip04Encrypted, setNip04Encrypted] = useState('');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNIP05Verify = async () => {
    try {
      setError('');
      const result = await verifyNIP05(nip05Identifier, nip05Pubkey);
      setNip05Result(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleNIP19Encode = () => {
    try {
      setError('');
      const encoded = encodeNIP19Note(nip19Input);
      setNip19Output(encoded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encoding failed');
    }
  };

  const handleNIP19Decode = () => {
    try {
      setError('');
      const decoded = decodeNIP19Note(nip19Input);
      setNip19Output(decoded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decoding failed');
    }
  };

  const handleNIP04Encrypt = async () => {
    try {
      setError('');
      const encrypted = await encryptDM(nip04Message, nip04RecipientPubkey, nip04SenderPrivkey);
      setNip04Encrypted(encrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Encryption failed');
    }
  };

  const supportedNIPs = getAllSupportedNIPs();

  return (
    <Card>
      <CardHeader>
        <CardTitle>NIP Tools - Protocol Implementation</CardTitle>
        <CardDescription>
          Test and explore all Nostr Implementation Possibilities (NIPs)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="nip04">NIP-04 DMs</TabsTrigger>
            <TabsTrigger value="nip05">NIP-05 Verify</TabsTrigger>
            <TabsTrigger value="nip19">NIP-19 Entities</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Supported NIPs</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {supportedNIPs.map((nip) => (
                  <div
                    key={nip.nip}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={nip.supported ? 'default' : 'secondary'}>
                        NIP-{nip.nip.toString().padStart(2, '0')}
                      </Badge>
                      <span className="text-sm font-medium">{nip.name}</span>
                    </div>
                    {nip.supported && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Complete implementation of 17 essential NIPs for Nostr development
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* NIP-04 Encrypted DMs */}
          <TabsContent value="nip04" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Message to Encrypt</Label>
                <Textarea
                  placeholder="Enter your message..."
                  value={nip04Message}
                  onChange={(e) => setNip04Message(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Recipient Public Key (hex)</Label>
                  <Input
                    placeholder="64-character hex pubkey"
                    value={nip04RecipientPubkey}
                    onChange={(e) => setNip04RecipientPubkey(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Your Private Key (hex)</Label>
                  <Input
                    type="password"
                    placeholder="64-character hex privkey"
                    value={nip04SenderPrivkey}
                    onChange={(e) => setNip04SenderPrivkey(e.target.value)}
                  />
                </div>
              </div>

              <Button onClick={handleNIP04Encrypt} className="w-full">
                Encrypt Message (NIP-04)
              </Button>

              {nip04Encrypted && (
                <div className="space-y-2">
                  <Label>Encrypted Content</Label>
                  <div className="flex gap-2">
                    <Textarea
                      value={nip04Encrypted}
                      readOnly
                      rows={4}
                      className="font-mono text-xs"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCopy(nip04Encrypted)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* NIP-05 Verification */}
          <TabsContent value="nip05" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>NIP-05 Identifier</Label>
                <Input
                  placeholder="name@domain.com"
                  value={nip05Identifier}
                  onChange={(e) => setNip05Identifier(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Example: jack@cash.app
                </p>
              </div>

              <div>
                <Label>Public Key (hex) to Verify</Label>
                <Input
                  placeholder="64-character hex pubkey"
                  value={nip05Pubkey}
                  onChange={(e) => setNip05Pubkey(e.target.value)}
                />
              </div>

              <Button onClick={handleNIP05Verify} className="w-full">
                Verify NIP-05 Identity
              </Button>

              {nip05Result && (
                <Alert variant={nip05Result.valid ? 'default' : 'destructive'}>
                  <AlertDescription>
                    {nip05Result.valid ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        <span>✅ Verification successful!</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>❌ {nip05Result.error || 'Verification failed'}</span>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </TabsContent>

          {/* NIP-19 Entities */}
          <TabsContent value="nip19" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Input (Event ID or note1...)</Label>
                <Input
                  placeholder="Event ID (hex) or note1... (bech32)"
                  value={nip19Input}
                  onChange={(e) => setNip19Input(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleNIP19Encode} className="flex-1">
                  Encode to note1...
                </Button>
                <Button onClick={handleNIP19Decode} variant="secondary" className="flex-1">
                  Decode from note1...
                </Button>
              </div>

              {nip19Output && (
                <div>
                  <Label>Output</Label>
                  <div className="flex gap-2">
                    <Textarea
                      value={nip19Output}
                      readOnly
                      rows={3}
                      className="font-mono text-xs"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => handleCopy(nip19Output)}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Advanced NIPs */}
          <TabsContent value="advanced" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">NIP-13: Proof of Work</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Test event IDs for mining difficulty (leading zero bits)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">NIP-25: Reactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Create reaction events (👍, ❤️, etc.) for notes
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">NIP-40: Expiration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Add expiration timestamps to events
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">NIP-57: Lightning Zaps</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Parse zap requests and receipts (integrated with Zaps tool)
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">NIP-65: Relay Lists</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Manage relay list metadata (read/write preferences)
                  </p>
                </CardContent>
              </Card>
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
