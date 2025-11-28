/**
 * Identity & Keys Tools Component
 * UI for key generation, conversion, and validation
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Check, Key, RefreshCw, Eye, EyeOff } from 'lucide-react';
import {
  generateKeyPair,
  npubToHex,
  hexToNpub,
  nsecToHex,
  hexToNsec,
  validateKeyFormat,
  getKeyMetadata,
  exportKeyBackup,
  importKeyBackup,
  maskKey
} from '@/lib/identity-keys';
import type { KeyPair } from '@/types/nostr-debug';

export function IdentityKeysTools() {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [inputKey, setInputKey] = useState('');
  const [convertedKey, setConvertedKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  const handleGenerateKeyPair = () => {
    try {
      const newKeyPair = generateKeyPair();
      setKeyPair(newKeyPair);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate key pair');
    }
  };

  const handleConvert = () => {
    try {
      setError('');
      const validation = validateKeyFormat(inputKey);
      
      if (!validation.isValid) {
        setError(validation.errors?.join(', ') || 'Invalid key format');
        return;
      }

      let result = '';
      
      if (validation.type === 'npub') {
        result = npubToHex(inputKey);
      } else if (validation.type === 'nsec') {
        result = nsecToHex(inputKey);
      } else if (validation.type === 'hex' && inputKey.length === 64) {
        // Try to detect if it's a public or private key
        result = hexToNpub(inputKey);
      }
      
      setConvertedKey(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
    }
  };

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  const handleExport = () => {
    if (!keyPair) return;
    
    try {
      const backup = exportKeyBackup(keyPair, 'My Nostr Keys');
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nostr-keys-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    }
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const imported = importKeyBackup(content);
        setKeyPair(imported);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Import failed');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Identity & Keys Tools
          </CardTitle>
          <CardDescription>
            Generate, convert, and manage Nostr keys and identities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="convert">Convert</TabsTrigger>
              <TabsTrigger value="validate">Validate</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <div className="space-y-4">
                <Button onClick={handleGenerateKeyPair} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate New Key Pair
                </Button>

                {keyPair && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Public Key (npub)</Label>
                      <div className="flex gap-2">
                        <Input value={keyPair.npub} readOnly className="font-mono text-xs" />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopy(keyPair.npub, 'npub')}
                        >
                          {copied === 'npub' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Public Key (hex)</Label>
                      <div className="flex gap-2">
                        <Input value={keyPair.publicKey} readOnly className="font-mono text-xs" />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopy(keyPair.publicKey, 'pubkey')}
                        >
                          {copied === 'pubkey' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Private Key (nsec)
                        <Badge variant="destructive" className="text-xs">Secret</Badge>
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={showPrivateKey ? keyPair.nsec : maskKey(keyPair.nsec)}
                          readOnly
                          className="font-mono text-xs"
                          type={showPrivateKey ? 'text' : 'password'}
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => setShowPrivateKey(!showPrivateKey)}
                        >
                          {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopy(keyPair.nsec, 'nsec')}
                        >
                          {copied === 'nsec' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Private Key (hex)</Label>
                      <div className="flex gap-2">
                        <Input
                          value={showPrivateKey ? keyPair.privateKey : maskKey(keyPair.privateKey)}
                          readOnly
                          className="font-mono text-xs"
                          type={showPrivateKey ? 'text' : 'password'}
                        />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopy(keyPair.privateKey, 'privkey')}
                        >
                          {copied === 'privkey' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleExport} variant="secondary" className="flex-1">
                        Export JSON Backup
                      </Button>
                      <Label htmlFor="import-file" className="flex-1">
                        <Button variant="secondary" className="w-full" asChild>
                          <span>Import Backup</span>
                        </Button>
                        <input
                          id="import-file"
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={handleImport}
                          title="Import key backup file"
                        />
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="convert" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Enter Key (npub, nsec, or hex)</Label>
                  <Input
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="npub1... or nsec1... or hex"
                    className="font-mono text-xs"
                  />
                </div>

                <Button onClick={handleConvert} className="w-full">
                  Convert
                </Button>

                {convertedKey && (
                  <div className="space-y-2">
                    <Label>Converted Result</Label>
                    <div className="flex gap-2">
                      <Input value={convertedKey} readOnly className="font-mono text-xs" />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => handleCopy(convertedKey, 'converted')}
                      >
                        {copied === 'converted' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="validate" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Enter Key to Validate</Label>
                  <Input
                    value={inputKey}
                    onChange={(e) => setInputKey(e.target.value)}
                    placeholder="npub1... or nsec1... or hex"
                    className="font-mono text-xs"
                  />
                </div>

                <Button
                  onClick={() => {
                    try {
                      const metadata = getKeyMetadata(inputKey);
                      setConvertedKey(JSON.stringify(metadata, null, 2));
                      setError('');
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Validation failed');
                    }
                  }}
                  className="w-full"
                >
                  Validate & Show Metadata
                </Button>

                {convertedKey && (
                  <div className="space-y-2">
                    <Label>Key Metadata</Label>
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto">
                      {convertedKey}
                    </pre>
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
