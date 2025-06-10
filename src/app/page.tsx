import Scene from '@/components/three/Scene';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GLBScene | 3D Viewer',
  description: 'Interactive 3D GLB model viewer.',
};

export default function HomePage() {
  return <Scene />;
}
