import Scene from '@/components/three/Scene';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'THIS IS THE POND',
  description: 'Mutated waste | WARNING',
};

export default function HomePage() {
  return <Scene />;
}
