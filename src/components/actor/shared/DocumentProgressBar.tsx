import { Card, CardContent } from '@/components/ui/card';

interface DocumentProgressBarProps {
  uploadedCount: number;
  requiredCount: number;
  extraMessage?: string;
}

export function DocumentProgressBar({ uploadedCount, requiredCount, extraMessage }: DocumentProgressBarProps) {
  const percentage = requiredCount > 0 ? (uploadedCount / requiredCount) * 100 : 0;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progreso de Documentos</span>
          <span className="text-sm text-muted-foreground">
            {uploadedCount} de {requiredCount} requeridos
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {extraMessage && (
          <p className="text-xs text-muted-foreground mt-2">{extraMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
