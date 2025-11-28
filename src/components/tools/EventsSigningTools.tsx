/**
 * Events & Signing Tools Component
 * UI for creating and signing Nostr events
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Check, Copy } from 'lucide-react';
import {
  createTestNote,
  createMetadataEvent,
  createArticleEvent,
  verifyEventSignature,
  exportEventJSON,
  importEventJSON,
  validateEventStructure
} from '@/lib/event-signing';
import type { SignedEvent } from '@/types/nostr-debug';

export function EventsSigningTools() {
  const [privateKey, setPrivateKey] = useState('');
  const [eventKind, setEventKind] = useState<string>('1');
  const [content, setContent] = useState('');
  const [signedEvent, setSignedEvent] = useState<SignedEvent | null>(null);
  const [eventJson, setEventJson] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCreateEvent = () => {
    try {
      setError('');
      
      if (!privateKey) {
        setError('Private key (hex) is required');
        return;
      }

      let event: SignedEvent;
      const kind = parseInt(eventKind);

      switch (kind) {
        case 0: // Metadata
          event = createMetadataEvent(
            JSON.parse(content || '{"name":"Test User"}'),
            privateKey
          );
          break;
        case 30023: // Article
          event = createArticleEvent(
            'Test Article',
            content || 'Article content',
            'Test summary',
            privateKey
          );
          break;
        default: // Note or custom
          event = createTestNote(content || 'Test note', privateKey);
      }

      setSignedEvent(event);
      setEventJson(exportEventJSON(event, true));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    }
  };

  const handleVerifyEvent = () => {
    try {
      setError('');
      
      if (!eventJson) {
        setError('Event JSON is required');
        return;
      }

      const event = importEventJSON(eventJson);
      const verification = verifyEventSignature(event);
      
      if (verification.isValid) {
        setSignedEvent(event);
        setError('');
        alert('✅ Event signature is valid!');
      } else {
        setError(`Verification failed: ${verification.errors?.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    }
  };

  const handleValidateStructure = () => {
    try {
      setError('');
      
      const event = JSON.parse(eventJson);
      const validation = validateEventStructure(event);
      
      if (validation.isValid) {
        alert('✅ Event structure is valid!');
      } else {
        setError(`Structure validation failed: ${validation.errors.join(', ')}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy to clipboard');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Events & Signing Tools
          </CardTitle>
          <CardDescription>
            Create, sign, and verify Nostr events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">Create & Sign</TabsTrigger>
              <TabsTrigger value="verify">Verify</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Private Key (hex)</Label>
                  <Input
                    type="password"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="64-character hex private key"
                    className="font-mono text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Event Kind</Label>
                  <Select value={eventKind} onValueChange={setEventKind}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Kind 0 - Metadata</SelectItem>
                      <SelectItem value="1">Kind 1 - Short Note</SelectItem>
                      <SelectItem value="30023">Kind 30023 - Article</SelectItem>
                      <SelectItem value="9735">Kind 9735 - Zap Receipt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Content</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={eventKind === '0' ? '{"name":"User Name"}' : 'Event content'}
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>

                <Button onClick={handleCreateEvent} className="w-full">
                  Create & Sign Event
                </Button>

                {signedEvent && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Signed Event JSON</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(eventJson)}
                      >
                        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        Copy
                      </Button>
                    </div>
                    <pre className="p-4 bg-muted rounded-lg text-xs overflow-auto max-h-96">
                      {eventJson}
                    </pre>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="verify" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Event JSON</Label>
                  <Textarea
                    value={eventJson}
                    onChange={(e) => setEventJson(e.target.value)}
                    placeholder='{"id":"...","pubkey":"...","created_at":...}'
                    rows={12}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleVerifyEvent} className="flex-1">
                    Verify Signature
                  </Button>
                  <Button onClick={handleValidateStructure} variant="secondary" className="flex-1">
                    Validate Structure
                  </Button>
                </div>
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
