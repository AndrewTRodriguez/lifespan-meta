import { ImageResponse } from 'next/og';

export const alt = "Aging biology eval — Probing Claude's reasoning about gene effects on lifespan";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#FFFFFF',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Blue left panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: 480,
            height: '100%',
            backgroundColor: '#0067AC',
            padding: '64px 52px',
          }}
        >
          <div
            style={{
              color: '#FFFFFF',
              fontSize: 52,
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-0.5px',
              marginBottom: 24,
            }}
          >
            Aging biology eval
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: 22,
              lineHeight: 1.45,
            }}
          >
            Probing Claude&apos;s reasoning about gene effects on lifespan
          </div>
        </div>

        {/* White right panel */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            flex: 1,
            padding: '64px 52px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <div style={{ color: '#475569', fontSize: 18, lineHeight: 1.4 }}>
              Evaluating Claude Sonnet 4.6 · 1,379 entries from the GenAge model organisms database
            </div>
          </div>
          <div style={{ color: '#64748B', fontSize: 18 }}>
            by Andrew T. Rodriguez, Ph.D.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
