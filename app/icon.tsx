import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          backgroundColor: '#0067AC',
          borderRadius: 6,
          color: '#FFFFFF',
          fontSize: 18,
          fontWeight: 700,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          letterSpacing: '-0.5px',
        }}
      >
        A
      </div>
    ),
    { ...size },
  );
}
