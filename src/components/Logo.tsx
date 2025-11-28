import Link from 'next/link';
import Image from 'next/image';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  iconOnly?: boolean;
}

const Logo = ({ size = 'md', className, iconOnly = false }: LogoProps) => {
  const height = size === 'sm' ? 36 : size === 'md' ? 48 : 64;
  const width = height * 3.5; // Approximate aspect ratio

  return (
    <Link href="/" className={cn('flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm', className)}>
      {iconOnly ? (
        <Image
          src="/images/icon-hestia-azul.png"
          alt={`${t.siteName} Logo`}
          width={height/1.5}
          height={height}
          priority
        />
      ) : (
        <>
          {/* Mobile: Icon only */}
          <Image
            src="/images/icon-hestia-azul.png"
            alt={`${t.siteName} Logo`}
            width={height/1.5}
            height={height}
            className="md:hidden"
            priority
          />
          {/* Desktop: Full logo */}
          <Image
            src="/images/logo-hestia-azul-top.png"
            alt={`${t.siteName} Logo`}
            width={width}
            height={height}
            style={{ height: 'auto', width: `${width}px` }}
            className="hidden md:block"
            priority
          />
        </>
      )}
      <span className="sr-only">{t.siteName} Home</span>
    </Link>
  );
};

export default Logo;
