/**
 * Bickqr Logo Component
 * 
 * Displays the Bickqr brand logo with stylized quotation marks.
 * 2 red closing quotes + 2 yellow opening quotes (outline style).
 * "Bick" in red, "qr" in yellow.
 */

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizeClasses = {
    sm: {
      container: 'gap-1.5',
      svg: 'h-5',
      text: 'text-lg',
    },
    md: {
      container: 'gap-2',
      svg: 'h-7',
      text: 'text-2xl',
    },
    lg: {
      container: 'gap-2.5',
      svg: 'h-10',
      text: 'text-3xl',
    },
  };

  const s = sizeClasses[size];

  return (
    <div className={`flex items-center ${s.container}`}>
      {/* Stylized Quotation Marks - 2 red closing, 2 yellow opening */}
      <svg 
        className={`${s.svg} animate-pulse`}
        style={{ animationDuration: '2s' }}
        viewBox="0 0 80 32" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Red closing quote 1 */}
        <path 
          d="M4 4h8v16c0 4-2 8-8 8v-4c2 0 4-2 4-4H4V4z" 
          stroke="#FF2A1B" 
          strokeWidth="2.5" 
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Red closing quote 2 */}
        <path 
          d="M20 4h8v16c0 4-2 8-8 8v-4c2 0 4-2 4-4h-4V4z" 
          stroke="#FF2A1B" 
          strokeWidth="2.5" 
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Yellow opening quote 1 */}
        <path 
          d="M44 28h-8V12c0-4 2-8 8-8v4c-2 0-4 2-4 4h4v16z" 
          stroke="#FFC400" 
          strokeWidth="2.5" 
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Yellow opening quote 2 */}
        <path 
          d="M60 28h-8V12c0-4 2-8 8-8v4c-2 0-4 2-4 4h4v16z" 
          stroke="#FFC400" 
          strokeWidth="2.5" 
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Logo Text - "Bick" in red, "qr" in yellow */}
      {showText && (
        <span className={`font-bold tracking-tight ${s.text}`}>
          <span className="text-brand-primary">Bick</span>
          <span className="text-brand-accent">qr</span>
        </span>
      )}
    </div>
  );
}
