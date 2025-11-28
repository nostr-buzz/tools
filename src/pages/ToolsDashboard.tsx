/**
 * Tools Dashboard - Main Page
 * Central hub for all Nostr debug tools
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Key, FileText, Wallet, Radio, Code2, Zap, Shield } from 'lucide-react';
import { IdentityKeysTools } from '@/components/tools/IdentityKeysTools';
import { EventsSigningTools } from '@/components/tools/EventsSigningTools';
import { WalletSeedTools } from '@/components/tools/WalletSeedTools';
import { RelayDebugTools } from '@/components/tools/RelayDebugTools';
import { ConversionsTools } from '@/components/tools/ConversionsTools';
import { NIPTools } from '@/components/tools/NIPTools';
import { ZapsAnalyticsTools } from '@/components/tools/ZapsAnalyticsTools';

export default function ToolsDashboard() {
  const [activeTab, setActiveTab] = useState('identity');

  const tools = [
    {
      id: 'identity',
      name: 'Identity & Keys',
      description: 'Generate, convert, and validate Nostr keys',
      icon: Key,
      component: IdentityKeysTools,
      features: ['Generate npub/nsec', 'Convert formats', 'Validate keys', 'Export/Import']
    },
    {
      id: 'events',
      name: 'Events & Signing',
      description: 'Create and verify Nostr events',
      icon: FileText,
      component: EventsSigningTools,
      features: ['Create events', 'Sign events', 'Verify signatures', 'Multiple kinds']
    },
    {
      id: 'wallet',
      name: 'Wallet & Seed',
      description: 'BIP-39 seed phrases and key derivation',
      icon: Wallet,
      component: WalletSeedTools,
      features: ['Generate seeds', 'Validate mnemonics', 'Derive keys', 'BIP-44 paths']
    },
    {
      id: 'relay',
      name: 'Relay Debug',
      description: 'Test relay connections and performance',
      icon: Radio,
      component: RelayDebugTools,
      features: ['Health checks', 'Latency tests', 'NIP compliance', 'Compare relays']
    },
    {
      id: 'conversions',
      name: 'Conversions',
      description: 'Encoding and format conversions',
      icon: Code2,
      component: ConversionsTools,
      features: ['Hex/Base64', 'UTF-8', 'Hashing', 'Multiple formats']
    },
    {
      id: 'nips',
      name: 'NIP Tools',
      description: 'All Nostr Implementation Possibilities',
      icon: Shield,
      component: NIPTools,
      features: ['17 NIPs', 'NIP-04 DMs', 'NIP-05 Verify', 'NIP-19 Entities']
    },
    {
      id: 'zaps',
      name: 'Zaps & Analytics',
      description: 'Lightning payments and analytics',
      icon: Zap,
      component: ZapsAnalyticsTools,
      features: ['Parse bolt11', 'Zap receipts', 'Analytics', 'NIP-57']
    }
  ];

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Nostr Debug Tools</h1>
          <p className="text-xl text-muted-foreground">
            Complete toolkit for Nostr development and debugging
          </p>
        </div>

        {/* Main Tools Area */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-7 h-auto">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <TabsTrigger 
                  key={tool.id} 
                  value={tool.id}
                  className="flex flex-col items-center gap-2 py-3"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden md:inline">{tool.name}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {tools.map((tool) => {
            const Component = tool.component;
            return (
              <TabsContent key={tool.id} value={tool.id} className="mt-6">
                <div className="space-y-4">
                  {/* Tool Info Card */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{tool.name}</CardTitle>
                          <CardDescription className="mt-2">
                            {tool.description}
                          </CardDescription>
                        </div>
                        <tool.icon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {tool.features.map((feature, i) => (
                          <Badge key={i} variant="secondary">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Tool Component */}
                  <Component />
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Footer */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center md:text-left">
                <h3 className="font-semibold">About Nostr Debug Tools</h3>
                <p className="text-sm text-muted-foreground">
                  Open-source toolkit for Nostr development. Built with React, TypeScript, and nostr-tools.
                </p>
              </div>
              <div className="flex gap-4">
                <Badge variant="outline">v1.0.0</Badge>
                <Badge variant="outline">TypeScript</Badge>
                <Badge variant="outline">React</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
