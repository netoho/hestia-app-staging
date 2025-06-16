import Link from 'next/link';
import { ShieldHalf } from 'lucide-react'; 
import { SITE_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  iconOnly?: boolean;
}

const Logo = ({ size = 'md', className, iconOnly = false }: LogoProps) => {
  const textSizeClass = size === 'sm' ? 'text-xl' : size === 'md' ? 'text-2xl' : 'text-3xl';
  const iconSizeClass = size === 'sm' ? 'h-5 w-5' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8';

  return (
    <Link href="/" className={cn('flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm', className)}>
      <ShieldHalf className={cn(iconSizeClass, 'text-primary group-hover:text-accent transition-colors')} aria-hidden="true" />
      {!iconOnly && (
        <span className={cn('font-headline font-bold', textSizeClass, 'text-primary group-hover:text-accent transition-colors')}>
          {SITE_NAME}
        </span>
      )}
      <span className="sr-only">{SITE_NAME} Home</span>
    </Link>
  );
};

export default Logo;
