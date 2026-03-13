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
      <Badge variant="success" className={sizeClass}>
        {showIcon && <CheckCircle2 className="h-3 w-3 mr-1" />}
        Completo
      </Badge>
    );
  }

  return (
    <Badge variant="warning" className={sizeClass}>
      {showIcon && <Clock className="h-3 w-3 mr-1" />}
      Pendiente
    </Badge>
  );
}

export default CompletionBadge;
