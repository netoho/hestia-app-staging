import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';

interface CompletionBadgeProps {
  isComplete: boolean;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function CompletionBadge({ isComplete, size = 'md', showIcon = false }: CompletionBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-xs' : '';

  if (isComplete) {
    return (
      <Badge className={`bg-green-500 text-white ${sizeClass}`}>
        {showIcon && <CheckCircle2 className="h-3 w-3 mr-1" />}
        Completo
      </Badge>
    );
  }

  return (
    <Badge className={`bg-orange-500 text-white ${sizeClass}`}>
      {showIcon && <Clock className="h-3 w-3 mr-1" />}
      Pendiente
    </Badge>
  );
}

export default CompletionBadge;
