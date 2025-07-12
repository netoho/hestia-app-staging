
'use client';

import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CardDescription, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { t } from '@/lib/i18n';
import { UploadCloud, File as FileIcon, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { DocumentsSummaryModal } from '../modals/DocumentsSummaryModal';

const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const documentsSchema = z.object({
  identification: z.array(z.instanceof(File)).min(1, { message: t.pages.newPolicy.documents.validation.idRequired }),
  proofOfIncome: z.array(z.instanceof(File)).min(1, { message: t.pages.newPolicy.documents.validation.incomeRequired }),
  optional: z.array(z.instanceof(File)),
  incomeDocsHavePassword: z.enum(['yes', 'no'], {
    required_error: t.pages.newPolicy.documents.validation.passwordQuestionRequired,
  }),
});

type DocumentsFormValues = z.infer<typeof documentsSchema>;

interface CreatePolicyDocumentsFormProps {
  token?: string;
  policyId?: string;
  onNext: (data: any) => void;
  onBack: () => void;
}

type UploadableFile = {
  id: string;
  file: File;
  progress: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
};

interface FileUploaderProps {
  id: keyof Omit<DocumentsFormValues, 'incomeDocsHavePassword'>;
  title: string;
  description: string;
  maxFiles: number;
  form: ReturnType<typeof useForm<DocumentsFormValues>>;
  token?: string;
  category: 'identification' | 'income' | 'optional';
}

const FileUploader = ({ id, title, description, maxFiles, form, token, category }: FileUploaderProps) => {
  const [files, setFiles] = useState<UploadableFile[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      const newFiles: UploadableFile[] = [
        ...acceptedFiles.map(file => ({
          id: `${file.name}-${new Date().getTime()}`,
          file,
          progress: 'pending' as const,
        })),
        ...fileRejections.map((rejection: any) => ({
          id: `${rejection.file.name}-${new Date().getTime()}`,
          file: rejection.file,
          progress: 'error' as const,
          error: rejection.errors[0].message,
        })),
      ];
      
      const updatedFiles = [...files, ...newFiles].slice(0, maxFiles);
      setFiles(updatedFiles);
      
      const validRawFiles = updatedFiles
        .filter((f) => f.progress !== 'error')
        .map((f) => f.file);
      form.setValue(id, validRawFiles, { shouldValidate: true });

      // Simulate upload for new valid files
      updatedFiles.forEach(f => {
        if (f.progress === 'pending') {
          simulateUpload(f);
        }
      });
    },
    [files, maxFiles, id, form, token, category]
  );

  const simulateUpload = async (uploadableFile: UploadableFile) => {
    if (!token) {
      // If no token, just simulate upload for preview
      setFiles(prev =>
        prev.map(f => (f.id === uploadableFile.id ? { ...f, progress: 'uploading' } : f))
      );
      
      setTimeout(() => {
        setFiles(prev =>
          prev.map(f => (f.id === uploadableFile.id ? { ...f, progress: 'completed' } : f))
        );
      }, 1500);
      return;
    }

    // Set uploading state
    setFiles(prev =>
      prev.map(f => (f.id === uploadableFile.id ? { ...f, progress: 'uploading' } : f))
    );
    
    try {
      // Create FormData for upload
      const formData = new FormData();
      formData.append('file', uploadableFile.file);
      formData.append('category', category);
      
      // Upload file
      const response = await fetch(`/api/tenant/${token}/upload`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }
      
      const result = await response.json();
      
      // Mark as completed and store document ID
      setFiles(prev =>
        prev.map(f => (f.id === uploadableFile.id ? { ...f, progress: 'completed' } : f))
      );
      setUploadedFiles(prev => [...prev, result.document.id]);
      
    } catch (error) {
      // Mark as error
      setFiles(prev =>
        prev.map(f => (f.id === uploadableFile.id ? { 
          ...f, 
          progress: 'error',
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f))
      );
    }
  };

  const handleDelete = async (fileId: string) => {
    const fileToDelete = files.find(f => f.id === fileId);
    if (!fileToDelete) return;
    
    // If file was uploaded and we have a token, delete from server
    if (fileToDelete.progress === 'completed' && token && uploadedFiles.length > 0) {
      try {
        // Find the document ID for this file (you might need to track this better)
        // For now, we'll skip server deletion as we don't track which uploadedFile ID matches which file
      } catch (error) {
        console.error('Error deleting file from server:', error);
      }
    }
    
    const updatedFiles = files.filter(f => f.id !== fileId);
    setFiles(updatedFiles);

    const validRawFiles = updatedFiles
        .filter((f) => f.progress !== 'error')
        .map((f) => f.file);
    form.setValue(id, validRawFiles, { shouldValidate: true });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_FILE_SIZE_BYTES,
    maxFiles: maxFiles - files.length,
    accept: { 'application/pdf': [], 'image/*': [] },
  });
  
  const truncate = (name: string, len: number) => name.length > len ? `${name.substring(0, len-3)}...` : name;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
      
      {files.length > 0 && (
         <div className="space-y-2">
            {files.map((f) => (
                <div key={f.id} className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <FileIcon className="h-6 w-6 text-primary shrink-0"/>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" title={f.file.name}>{truncate(f.file.name, 30)}</p>
                            <p className="text-xs text-muted-foreground">{(f.file.size / 1024).toFixed(1)} KB</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 w-40 shrink-0 justify-end">
                       {f.progress === 'uploading' && <Progress value={(new Date().getSeconds() % 100) * (Math.random())} className="h-2 w-24" />}
                       {f.progress === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                       {f.progress === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                        <Button type="button" variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
                            <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                    </div>
                </div>
            ))}
        </div>
      )}

      {files.length < maxFiles && (
        <div
          {...getRootProps()}
          className={cn(
            'flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors',
            isDragActive ? 'border-primary bg-primary/10' : 'border-border'
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            {t.pages.newPolicy.documents.dropzone.dragAndDrop(maxFiles - files.length)}
          </p>
           <p className="text-xs text-muted-foreground mt-1">{t.pages.newPolicy.documents.dropzone.maxSize(MAX_FILE_SIZE_MB)}</p>
        </div>
      )}
       <FormMessage>{form.formState.errors[id]?.message?.toString()}</FormMessage>
    </div>
  );
};


export function CreatePolicyDocumentsForm({ token, policyId, onNext, onBack }: CreatePolicyDocumentsFormProps) {
  const form = useForm<DocumentsFormValues>({
    resolver: zodResolver(documentsSchema),
    defaultValues: {
        identification: [],
        proofOfIncome: [],
        optional: [],
    },
  });

  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [summaryData, setSummaryData] = useState<DocumentsFormValues | null>(null);

  const onSubmit = (values: DocumentsFormValues) => {
    setSummaryData(values);
    setIsSummaryModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    if (summaryData) {
      // Transform the data to match what the API expects
      const apiData = {
        identificationCount: summaryData.identification.length,
        incomeCount: summaryData.proofOfIncome.length,
        optionalCount: summaryData.optional.length,
        incomeDocsHavePassword: summaryData.incomeDocsHavePassword
      };
      onNext(apiData as any);
    }
    setIsSummaryModalOpen(false);
  };

  return (
    <div>
      <CardTitle className="font-headline text-xl mb-2">{t.pages.newPolicy.documents.title}</CardTitle>
      <CardDescription className="mb-6">{t.pages.newPolicy.documents.description}</CardDescription>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          
          <FileUploader
            id="identification"
            title={t.pages.newPolicy.documents.id.title}
            description={t.pages.newPolicy.documents.id.description}
            maxFiles={2}
            form={form}
            token={token}
            category="identification"
          />
          
          <Separator />

          <FileUploader
            id="proofOfIncome"
            title={t.pages.newPolicy.documents.income.title}
            description={t.pages.newPolicy.documents.income.description}
            maxFiles={9}
            form={form}
            token={token}
            category="income"
          />
          <FormField
            control={form.control}
            name="incomeDocsHavePassword"
            render={({ field }) => (
                <FormItem className="space-y-3">
                <FormLabel className="font-semibold">{t.pages.newPolicy.documents.income.passwordQuestion}</FormLabel>
                <FormControl>
                    <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex items-center space-x-4"
                    >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="yes" />
                            </FormControl>
                            <Label className="font-normal">{t.pages.newPolicy.documents.income.passwordYes}</Label>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                            <RadioGroupItem value="no" />
                            </FormControl>
                            <Label className="font-normal">{t.pages.newPolicy.documents.income.passwordNo}</Label>
                        </FormItem>
                    </RadioGroup>
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
          
          <Separator />
          
           <FileUploader
            id="optional"
            title={t.pages.newPolicy.documents.optional.title}
            description={t.pages.newPolicy.documents.optional.description}
            maxFiles={4}
            form={form}
            token={token}
            category="optional"
          />

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={onBack}>
              {t.actions.back}
            </Button>
            <Button type="submit" className="bg-primary hover:bg-primary/90">
              {t.actions.next}
            </Button>
          </div>
        </form>
      </Form>
       {summaryData && (
        <DocumentsSummaryModal
          isOpen={isSummaryModalOpen}
          onClose={() => setIsSummaryModalOpen(false)}
          onSubmit={handleConfirmSubmit}
          identification={summaryData.identification}
          proofOfIncome={summaryData.proofOfIncome}
          optional={summaryData.optional}
        />
      )}
    </div>
  );
}
