'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { t } from '@/lib/i18n';

interface Document {
  id: string;
  category: string;
  originalName: string;
  fileSize: number;
  uploadedAt: string;
}

interface PolicyDocumentsProps {
  documents: Document[];
  onDownloadDocument: (documentId: string, fileName: string) => void;
  downloadingDoc: string | null;
}

export function PolicyDocuments({ 
  documents, 
  onDownloadDocument, 
  downloadingDoc 
}: PolicyDocumentsProps) {
  if (documents.length === 0) {
    return null;
  }

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {t.pages.policies.details.sections.uploadedDocuments}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">{doc.originalName}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(doc.fileSize)} • {t.pages.policies.details.documents.uploaded} {formatDistanceToNow(new Date(doc.uploadedAt), { addSuffix: true, locale: es })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {doc.category === 'identification' ? t.pages.policies.details.documents.category.identification : 
                   doc.category === 'income' ? t.pages.policies.details.documents.category.income : t.pages.policies.details.documents.category.optional}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDownloadDocument(doc.id, doc.originalName)}
                  disabled={downloadingDoc === doc.id}
                >
                  {downloadingDoc === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}