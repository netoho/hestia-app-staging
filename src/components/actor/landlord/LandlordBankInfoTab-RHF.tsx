'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { getLandlordTabSchema } from '@/lib/schemas/landlord';

interface LandlordBankInfoTabRHFProps {
  initialData: any;
  onSave: (data: any) => Promise<void>;
  disabled?: boolean;
}

export default function LandlordBankInfoTabRHF({
  initialData,
  onSave,
  disabled = false,
}: LandlordBankInfoTabRHFProps) {
  // Bank info is only for primary landlord (first one)
  const schema = getLandlordTabSchema(false, 'bank-info');

  const form = useForm({
    resolver: zodResolver(schema as any),
    mode: 'onChange',
    defaultValues: {
      bankName: initialData?.bankName || '',
      accountHolder: initialData?.accountHolder || '',
      clabe: initialData?.clabe || '',
      accountNumber: initialData?.accountNumber || '',
    },
  });

  const handleSubmit = async (data: any) => {
    await onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Información Bancaria</CardTitle>
            <p className="text-sm text-muted-foreground">
              Los pagos se realizarán únicamente al arrendador principal
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Banco</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Nombre del banco"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accountHolder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>Titular de la Cuenta</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder="Nombre del titular"
                        disabled={disabled}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="clabe"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>CLABE Interbancaria (18 dígitos)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      onChange={(e) => {
                        // Filter to digits only
                        const value = e.target.value.replace(/\D/g, '');
                        field.onChange(value);
                      }}
                      maxLength={18}
                      placeholder="000000000000000000"
                      className="font-mono"
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel optional>Número de Cuenta</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value || ''}
                      placeholder="Número de cuenta (opcional)"
                      disabled={disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert>
              <AlertDescription>
                <strong>Nota:</strong> Verifique cuidadosamente los datos bancarios.
                Los pagos se realizarán a esta cuenta según lo establecido en el contrato.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
