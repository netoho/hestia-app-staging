import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';
import { getDocumentCategoryLabel } from '@/lib/constants/documentCategories';
import { useDocumentDownload } from '@/hooks/useDocumentDownload';

interface Document {
  id: string;
  originalName: string;
  category: string;
  fileSize: number;
  createdAt: string;
}

interface DocumentsListProps {
  documents?: Document[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsList({ documents }: DocumentsListProps) {
  const { downloadDocument, downloading } = useDocumentDownload();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documentos de la Protección</CardTitle>
        <CardDescription>
          Todos los documentos relacionados con esta protección
        </CardDescription>
      </CardHeader>
      <CardContent>
        {documents && documents.length > 0 ? (
          <div className="space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="font-medium">{doc.originalName}</p>
                    <p className="text-sm text-gray-500">
                      {getDocumentCategoryLabel(doc.category as any)} • {formatFileSize(doc.fileSize)} •{' '}
                      {formatDate(doc.createdAt)}
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadDocument({
                      documentId: doc.id,
                      documentType: 'policy',
                      fileName: doc.originalName
                    })
                  }}
                  disabled={downloading === doc.id}
                  title="Descargar documento"
                >
                  <Download className={`h-4 w-4 ${downloading === doc.id ? 'animate-pulse' : ''}`} />
                  {downloading === doc.id ? ' Descargando...' : ''}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-8">No hay documentos cargados</p>
        )}
      </CardContent>
    </Card>
  );
}
