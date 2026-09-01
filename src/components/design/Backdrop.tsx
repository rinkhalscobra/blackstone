import { ReactNode } from 'react';

interface BackdropProps {
  /** Include a subtle animated video layer (used on landing only). */
  video?: boolean;
  /** Extra classes on the wrapper. */
  className?: string;
  children?: ReactNode;
}

const VIDEO_URL =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_064122_c4750c0e-7476-4b44-94a2-a85a65c63bf2.mp4";

/**
 * Shared page backdrop that mirrors the /showcase visual language.
 * Static gradient + soft blue/gold glows; optional cinematic video layer.
 * Sits behind app content with pointer-events disabled.
 */
export const Backdrop = ({ video = false, className = "", children }: BackdropProps) => {
  return (
    <>
      <div className={`pointer-events-none fixed inset-0 -z-10 ${className}`} aria-hidden="true">
        {video && (
          <video
            src={VIDEO_URL}
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(600px 300px at 10% 0%, hsl(217 91% 60% / 0.20), transparent 60%),' +
              'radial-gradient(500px 260px at 90% 20%, hsl(43 96% 56% / 0.14), transparent 60%)',
          }}
        />
      </div>
      {children}
    </>
  );
};

export default Backdrop;
