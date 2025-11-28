/**
 * Conversions Tools Component
 * UI for encoding/decoding and format conversions
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
import { Code2, Copy, Check, ArrowRight } from 'lucide-react';
import {
  convert,
  generateSHA256,
  generateSHA512,
  hexToBase64,
  base64ToHex,
  utf8ToHex,
  hexToUtf8,
  isValidHex,
  isValidBase64,
  formatBytes
} from '@/lib/conversions';
import type { EncodingFormat } from '@/types/nostr-debug';

export function ConversionsTools() {
  const [inputText, setInputText] = useState('');
  const [inputFormat, setInputFormat] = useState<EncodingFormat>('utf8');
  const [outputFormat, setOutputFormat] = useState<EncodingFormat>('hex');
  const [output, setOutput] = useState('');
  const [hashOutput, setHashOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const formats: EncodingFormat[] = ['hex', 'base64', 'utf8', 'bech32'];

  const handleConvert = () => {
    try {
      setError('');
      const result = convert(inputText, inputFormat, outputFormat);
      
      if (result.success) {
        setOutput(result.output);
        if (result.metadata) {
          setError(''); // Clear any previous errors
        }
      } else {
        setError(result.errorMessage || 'Conversion failed');
        setOutput('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Conversion failed');
      setOutput('');
    }
  };

  const handleHash = (algorithm: 'sha256' | 'sha512') => {
    try {
      setError('');
      
      const inputFormatForHash = inputFormat === 'utf8' ? 'utf8' : 'hex';
      const result = algorithm === 'sha256' 
        ? generateSHA256(inputText, inputFormatForHash)
        : generateSHA512(inputText, inputFormatForHash);
      
      setHashOutput(result.hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Hash generation failed');
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

  const handleSwap = () => {
    const temp = inputFormat;
    setInputFormat(outputFormat);
    setOutputFormat(temp);
    setInputText(output);
    setOutput('');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Conversions & Encoding Tools
          </CardTitle>
          <CardDescription>
            Convert between different encoding formats and generate hashes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="convert" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="convert">Convert</TabsTrigger>
              <TabsTrigger value="hash">Hash</TabsTrigger>
            </TabsList>

            <TabsContent value="convert" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Input Format</Label>
                    <Select value={inputFormat} onValueChange={(v) => setInputFormat(v as EncodingFormat)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utf8">UTF-8</SelectItem>
                        <SelectItem value="hex">Hex</SelectItem>
                        <SelectItem value="base64">Base64</SelectItem>
                        <SelectItem value="bech32">Bech32</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Output Format</Label>
                    <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as EncodingFormat)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utf8">UTF-8</SelectItem>
                        <SelectItem value="hex">Hex</SelectItem>
                        <SelectItem value="base64">Base64</SelectItem>
                        <SelectItem value="json">JSON Array</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Input</Label>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Enter ${inputFormat} text...`}
                    rows={6}
                    className="font-mono text-xs"
                  />
                  {inputText && (
                    <div className="text-xs text-muted-foreground">
                      Size: {formatBytes(inputText.length)}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleConvert} className="flex-1">
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Convert
                  </Button>
                  <Button onClick={handleSwap} variant="outline">
                    Swap
                  </Button>
                </div>

                {output && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Output</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(output)}
                      >
                        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        Copy
                      </Button>
                    </div>
                    <Textarea
                      value={output}
                      readOnly
                      rows={6}
                      className="font-mono text-xs"
                    />
                    <div className="text-xs text-muted-foreground">
                      Size: {formatBytes(output.length)}
                    </div>
                  </div>
                )}

                {/* Quick Conversions */}
                <div className="border-t pt-4">
                  <Label className="mb-2 block">Quick Conversions</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setInputFormat('utf8');
                        setOutputFormat('hex');
                      }}
                    >
                      UTF-8 → Hex
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setInputFormat('hex');
                        setOutputFormat('utf8');
                      }}
                    >
                      Hex → UTF-8
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setInputFormat('hex');
                        setOutputFormat('base64');
                      }}
                    >
                      Hex → Base64
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setInputFormat('base64');
                        setOutputFormat('hex');
                      }}
                    >
                      Base64 → Hex
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="hash" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Input Format</Label>
                  <Select value={inputFormat} onValueChange={(v) => setInputFormat(v as EncodingFormat)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="utf8">UTF-8</SelectItem>
                      <SelectItem value="hex">Hex</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Input</Label>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Enter text to hash..."
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handleHash('sha256')}>
                    SHA-256
                  </Button>
                  <Button onClick={() => handleHash('sha512')} variant="secondary">
                    SHA-512
                  </Button>
                </div>

                {hashOutput && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Hash Output</Label>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCopy(hashOutput)}
                      >
                        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                        Copy
                      </Button>
                    </div>
                    <Input
                      value={hashOutput}
                      readOnly
                      className="font-mono text-xs"
                    />
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
