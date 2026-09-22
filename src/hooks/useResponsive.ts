import { useEffect, useState } from 'preact/hooks';

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'wide';

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>(getBp());
  useEffect(() => {
    const handler = () => setBp(getBp());
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return bp;
}

function getBp(): Breakpoint {
  const w = window.innerWidth;
  if (w < 640) return 'mobile';
  if (w < 1024) return 'tablet';
  if (w < 1440) return 'desktop';
  return 'wide';
}

export function useIsMobile() {
  const bp = useBreakpoint();
  return bp === 'mobile' || bp === 'tablet';
}