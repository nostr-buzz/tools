/**
 * Wallet & Seed Tools Component
 * UI for BIP-39 seed generation and key derivation
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Wallet, Copy, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import {
  generateSeedPhrase,
  validateSeedPhrase,
  deriveNostrKeysFromSeed,
  deriveMultipleAccounts,
  detectWeakEntropy,
  mnemonicToEntropy,
  exportSeedBackup
} from '@/lib/wallet-seed';
import type { SeedPhrase, DerivedKeys } from '@/types/nostr-debug';

export function WalletSeedTools() {
  const [seedPhrase, setSeedPhrase] = useState<SeedPhrase | null>(null);
  const [inputMnemonic, setInputMnemonic] = useState('');
  const [derivedKeys, setDerivedKeys] = useState<DerivedKeys | null>(null);
  const [accountIndex, setAccountIndex] = useState(0);
  const [wordCount, setWordCount] = useState<12 | 24>(24);
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerateSeed = () => {
    try {
      const strength = wordCount === 12 ? 128 : 256;
      const seed = generateSeedPhrase(strength);
      setSeedPhrase(seed);
      
      // Check for weak entropy
      const weakCheck = detectWeakEntropy(seed.entropy);
      if (weakCheck.isWeak) {
        setWarning(weakCheck.warnings.join(', '));
      } else {
        setWarning('');
      }
      
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate seed');
    }
  };

  const handleValidate = () => {
    try {
      setError('');
      setWarning('');
      
      const validation = validateSeedPhrase(inputMnemonic);
      
      if (validation.isValid) {
        alert('✅ Seed phrase is valid!');
        
        // Create SeedPhrase object from validated mnemonic
        const words = inputMnemonic.trim().split(/\s+/);
        const entropy = mnemonicToEntropy(inputMnemonic);
        
        setSeedPhrase({
          mnemonic: inputMnemonic,
          words,
          entropy,
          strength: validation.strength || 256,
          wordCount: words.length,
          language: 'english',
          createdAt: Date.now()
        });
      } else {
        setError(validation.errors?.join(', ') || 'Invalid seed phrase');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    }
  };

  const handleDeriveKeys = () => {
    try {
      setError('');
      
      if (!seedPhrase) {
        setError('Generate or validate a seed phrase first');
        return;
      }
      
      const keys = deriveNostrKeysFromSeed(seedPhrase.mnemonic, accountIndex);
      setDerivedKeys(keys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Key derivation failed');
    }
  };

  const handleExport = () => {
    if (!seedPhrase) return;
    
    try {
      const backup = exportSeedBackup(seedPhrase, 'My Seed Backup');
      const blob = new Blob([backup], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `seed-backup-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet & Seed Tools
          </CardTitle>
          <CardDescription>
            Generate BIP-39 seed phrases and derive Nostr keys
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="generate" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="generate">Generate</TabsTrigger>
              <TabsTrigger value="validate">Validate</TabsTrigger>
              <TabsTrigger value="derive">Derive Keys</TabsTrigger>
            </TabsList>

            <TabsContent value="generate" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Seed Phrase Length</Label>
                  <div className="flex gap-2">
                    <Button
                      variant={wordCount === 12 ? 'default' : 'outline'}
                      onClick={() => setWordCount(12)}
                      className="flex-1"
                    >
                      12 Words
                    </Button>
                    <Button
                      variant={wordCount === 24 ? 'default' : 'outline'}
                      onClick={() => setWordCount(24)}
                      className="flex-1"
                    >
                      24 Words
                    </Button>
                  </div>
                </div>

                <Button onClick={handleGenerateSeed} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Generate {wordCount}-Word Seed Phrase
                </Button>

                {seedPhrase && (
                  <div className="space-y-4">
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>⚠️ Keep this safe!</strong> Anyone with this seed can access your funds.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        Seed Words ({seedPhrase.wordCount} words)
                        <Badge variant="destructive">Secret</Badge>
                      </Label>
                      <div className={`grid ${seedPhrase.wordCount === 12 ? 'grid-cols-3' : 'grid-cols-4'} gap-2 p-4 bg-muted rounded-lg`}>
                        {seedPhrase.words.map((word, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-background rounded">
                            <span className="text-xs text-muted-foreground w-6">{i + 1}.</span>
                            <span className="font-mono">{word}</span>
                          </div>
                        ))}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(seedPhrase.mnemonic, 'mnemonic')}
                        className="w-full"
                      >
                        {copied === 'mnemonic' ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        Copy All Words
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label>Entropy (hex)</Label>
                      <div className="flex gap-2">
                        <Input value={seedPhrase.entropy} readOnly className="font-mono text-xs" />
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => handleCopy(seedPhrase.entropy, 'entropy')}
                        >
                          {copied === 'entropy' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <div className="text-sm">Word Count</div>
                        <div className="text-2xl font-bold">{seedPhrase.wordCount}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm">Strength</div>
                        <div className="text-2xl font-bold">{seedPhrase.strength} bits</div>
                      </div>
                    </div>

                    <Button onClick={handleExport} variant="secondary" className="w-full">
                      Export Backup (JSON)
                    </Button>
                  </div>
                )}

                {warning && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>{warning}</AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="validate" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Enter Seed Phrase (12 or 24 words)</Label>
                  <Textarea
                    value={inputMnemonic}
                    onChange={(e) => setInputMnemonic(e.target.value)}
                    placeholder="word1 word2 word3 ..."
                    rows={4}
                    className="font-mono"
                  />
                </div>

                <Button onClick={handleValidate} className="w-full">
                  Validate Seed Phrase
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="derive" className="space-y-4">
              <div className="space-y-4">
                {!seedPhrase && (
                  <Alert>
                    <AlertDescription>
                      Generate or validate a seed phrase first
                    </AlertDescription>
                  </Alert>
                )}

                {seedPhrase && (
                  <>
                    <div className="space-y-2">
                      <Label>Account Index (BIP-44)</Label>
                      <Input
                        type="number"
                        value={accountIndex}
                        onChange={(e) => setAccountIndex(parseInt(e.target.value) || 0)}
                        min="0"
                      />
                    </div>

                    <Button onClick={handleDeriveKeys} className="w-full">
                      Derive Nostr Keys
                    </Button>

                    {derivedKeys && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Derivation Path</Label>
                          <Input value={derivedKeys.path} readOnly className="font-mono text-xs" />
                        </div>

                        <div className="space-y-2">
                          <Label>Public Key (npub)</Label>
                          <div className="flex gap-2">
                            <Input value={derivedKeys.npub} readOnly className="font-mono text-xs" />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleCopy(derivedKeys.npub, 'npub')}
                            >
                              {copied === 'npub' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Private Key (nsec)</Label>
                          <div className="flex gap-2">
                            <Input value={derivedKeys.nsec} readOnly className="font-mono text-xs" type="password" />
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleCopy(derivedKeys.nsec, 'nsec')}
                            >
                              {copied === 'nsec' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
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
