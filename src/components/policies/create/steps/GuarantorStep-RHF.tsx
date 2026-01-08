'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { GuarantorType } from "@/prisma/generated/prisma-client/enums";
import { guarantorStepSchema, type GuarantorStepData } from '@/lib/schemas/policy/wizard';
import { Plus, Trash2 } from 'lucide-react';

interface GuarantorStepRHFProps {
  initialData: Partial<GuarantorStepData>;
  onSave: (data: GuarantorStepData) => Promise<void>;
  disabled?: boolean;
}

const emptyActor = {
  firstName: '',
  middleName: '',
  paternalLastName: '',
  maternalLastName: '',
  email: '',
  phone: '',
};

export default function GuarantorStepRHF({
  initialData,
  onSave,
  disabled = false,
}: GuarantorStepRHFProps) {
  const form = useForm<GuarantorStepData>({
    resolver: zodResolver(guarantorStepSchema),
    mode: 'onChange',
    defaultValues: {
      guarantorType: GuarantorType.NONE,
      jointObligors: [],
      avals: [],
      ...initialData,
    } as GuarantorStepData,
  });

  const guarantorType = form.watch('guarantorType');

  const jointObligorsArray = useFieldArray({
    control: form.control,
    name: 'jointObligors' as any,
  });

  const avalsArray = useFieldArray({
    control: form.control,
    name: 'avals' as any,
  });

  const handleSubmit = async (data: GuarantorStepData) => {
    await onSave(data);
  };

  const handleGuarantorTypeChange = (type: GuarantorType) => {
    form.setValue('guarantorType', type);

    // Initialize arrays based on type
    if (type === GuarantorType.JOINT_OBLIGOR || type === GuarantorType.BOTH) {
      if (jointObligorsArray.fields.length === 0) {
        jointObligorsArray.append(emptyActor);
      }
    }

    if (type === GuarantorType.AVAL || type === GuarantorType.BOTH) {
      if (avalsArray.fields.length === 0) {
        avalsArray.append(emptyActor);
      }
    }
  };

  const renderActorForm = (
    type: 'jointObligors' | 'avals',
    index: number,
    fieldArray: ReturnType<typeof useFieldArray>,
    label: string
  ) => (
    <Card key={fieldArray.fields[index]?.id || index}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">{label} {index + 1}</h4>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            onClick={() => fieldArray.remove(index)}
            disabled={disabled || fieldArray.fields.length === 1}
            title={fieldArray.fields.length === 1 ? `Debe haber al menos un ${label.toLowerCase()}` : 'Eliminar'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={`${type}.${index}.firstName` as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel optional>Nombre</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    placeholder="Nombre"
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${type}.${index}.middleName` as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel optional>Segundo Nombre</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    placeholder="Segundo nombre"
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name={`${type}.${index}.paternalLastName` as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel optional>Apellido Paterno</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    placeholder="Apellido paterno"
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name={`${type}.${index}.maternalLastName` as any}
            render={({ field }) => (
              <FormItem>
                <FormLabel optional>Apellido Materno</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value || ''}
                    placeholder="Apellido materno"
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
          name={`${type}.${index}.email` as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel required>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  placeholder="correo@ejemplo.com"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={`${type}.${index}.phone` as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel optional>Teléfono</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value || ''}
                  placeholder="10 dígitos"
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Obligado Solidario / Aval</CardTitle>
            <CardDescription>Configure las garantías para la protección</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Guarantor Type Selector */}
            <FormField
              control={form.control}
              name="guarantorType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required>Tipo de Garantía</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => handleGuarantorTypeChange(value as GuarantorType)}
                    disabled={disabled}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione el tipo de garantía" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={GuarantorType.NONE}>Sin Garantía</SelectItem>
                      <SelectItem value={GuarantorType.JOINT_OBLIGOR}>Obligado Solidario</SelectItem>
                      <SelectItem value={GuarantorType.AVAL}>Aval</SelectItem>
                      <SelectItem value={GuarantorType.BOTH}>Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Joint Obligors Section */}
            {(guarantorType === GuarantorType.JOINT_OBLIGOR || guarantorType === GuarantorType.BOTH) && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Obligados Solidarios</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => jointObligorsArray.append(emptyActor)}
                    disabled={disabled}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Obligado Solidario
                  </Button>
                </div>

                {jointObligorsArray.fields.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      Debe agregar al menos un obligado solidario. Haga clic en "Agregar Obligado Solidario" para continuar.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {jointObligorsArray.fields.map((field, index) =>
                      renderActorForm('jointObligors', index, jointObligorsArray, 'Obligado Solidario')
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Avals Section */}
            {(guarantorType === GuarantorType.AVAL || guarantorType === GuarantorType.BOTH) && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Avales</h3>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => avalsArray.append(emptyActor)}
                    disabled={disabled}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Aval
                  </Button>
                </div>

                {avalsArray.fields.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      Debe agregar al menos un aval. Haga clic en "Agregar Aval" para continuar.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-4">
                    {avalsArray.fields.map((field, index) =>
                      renderActorForm('avals', index, avalsArray, 'Aval')
                    )}
                  </div>
                )}
              </div>
            )}

            {/* No Guarantor Message */}
            {guarantorType === GuarantorType.NONE && (
              <Alert>
                <AlertDescription>
                  No se ha configurado ninguna garantía para esta protección.
                  Puede continuar sin garantías o seleccionar un tipo de garantía arriba.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
