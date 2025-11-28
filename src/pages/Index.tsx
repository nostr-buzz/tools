import { useSeoMeta } from '@unhead/react';
import ToolsDashboard from './ToolsDashboard';

const Index = () => {
  useSeoMeta({
    title: 'Nostr Debug & Development Tools',
    description: 'Complete toolkit for Nostr protocol development, debugging, and testing. Generate keys, create events, test relays, and more.',
  });

  return <ToolsDashboard />;
};

export default Index;
