import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw } from 'lucide-react';

export default function ApprovalWorkflowSkeleton() {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          <p className="text-sm text-gray-600">Cargando flujo de aprobación...</p>
        </div>
      </CardContent>
    </Card>
  );
}
