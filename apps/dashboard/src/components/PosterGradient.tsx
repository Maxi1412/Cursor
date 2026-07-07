import { Fragment, useState, type CSSProperties, type ReactNode } from 'react';
import { posterGradient, posterInitials } from '../lib/display';
import { posterSrc } from '../lib/api';

interface PosterGradientProps {
  title: string;
  /** Stable seed for the gradient (usually the item id). Defaults to title. */
  seed?: string;
  /** Relative poster path from the index (prefixed with the orchestrator origin). */
  posterUrl?: string;
  className: string;
  style?: CSSProperties;
  /** Extra overlays (status ring, TH badge, subtitle flag). */
  children?: ReactNode;
}

/**
 * A poster that shows the cached image when it loads, and otherwise falls back to
 * the prototype's gradient placeholder with stacked title initials — the exact
 * behaviour of the mock UI (posters never load in mock mode).
 */
export function PosterGradient({
  title,
  seed,
  posterUrl,
  className,
  style,
  children,
}: PosterGradientProps) {
  const [imgOk, setImgOk] = useState(false);
  const src = posterSrc(posterUrl);
  const grad = posterGradient(seed ?? title);
  const initials = posterInitials(title);

  return (
    <div className={className} style={{ background: grad, ...style }}>
      {src && (
        <img
          src={src}
          alt=""
          onLoad={() => setImgOk(true)}
          onError={() => setImgOk(false)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: imgOk ? 1 : 0,
            transition: 'opacity .2s',
          }}
        />
      )}
      <div className="glass" />
      {children}
      {!imgOk && (
        <span>
          {initials.map((l, i) => (
            <Fragment key={i}>
              {l}
              <br />
            </Fragment>
          ))}
        </span>
      )}
    </div>
  );
}
