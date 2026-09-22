import { useRef, useState } from 'preact/hooks';
import { useInView } from '@/hooks/useLazyLoad';
import { stringToColor, firstChar } from '@/utils/color';
import './LazyIcon.css';

interface Props {
  src: string | null;
  name: string;
  size?: number;
}

export function LazyIcon({ src, name, size = 24 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const shouldLoad = inView && !!src && !error;
  const showFallback = !shouldLoad || error || !loaded;

  return (
    <div ref={ref} class="lazy-icon">
      {showFallback && (
        <div class="icon-fallback" style={{ background: stringToColor(name) }}>
          {firstChar(name)}
        </div>
      )}
      {shouldLoad && (
        <img
          src={src!}
          alt={name}
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          class={`icon-img ${loaded ? 'loaded' : ''}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}