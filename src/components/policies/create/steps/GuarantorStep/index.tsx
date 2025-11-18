'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PersonNameFields } from '@/components/forms/shared/PersonNameFields';
import { GuarantorType } from '@/lib/enums';
import { ActorFormData } from '../../types';
import { Plus, Trash2 } from 'lucide-react';

interface GuarantorStepProps {
  guarantorType: GuarantorType;
  jointObligors: ActorFormData[];
  avals: ActorFormData[];
  onSetGuarantorType: (type: GuarantorType) => void;
  onAddJointObligor: () => void;
  onRemoveJointObligor: (index: number) => void;
  onUpdateJointObligor: (index: number, data: Partial<ActorFormData>) => void;
  onAddAval: () => void;
  onRemoveAval: (index: number) => void;
  onUpdateAval: (index: number, data: Partial<ActorFormData>) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function GuarantorStep({
  guarantorType,
  jointObligors,
  avals,
  onSetGuarantorType,
  onAddJointObligor,
  onRemoveJointObligor,
  onUpdateJointObligor,
  onAddAval,
  onRemoveAval,
  onUpdateAval,
  onNext,
  onPrevious,
}: GuarantorStepProps) {
  const isValid = () => {
    if (guarantorType === GuarantorType.NONE) {
      return true;
    }

    if (guarantorType === GuarantorType.JOINT_OBLIGOR || guarantorType === GuarantorType.BOTH) {
      if (jointObligors.length === 0) return false;
      for (const jo of jointObligors) {
        if (!jo.firstName || !jo.paternalLastName || !jo.maternalLastName || !jo.email) {
          return false;
        }
      }
    }

    if (guarantorType === GuarantorType.AVAL || guarantorType === GuarantorType.BOTH) {
      if (avals.length === 0) return false;
      for (const aval of avals) {
        if (!aval.firstName || !aval.paternalLastName || !aval.maternalLastName || !aval.email) {
          return false;
        }
      }
    }

    return true;
  };

  const renderActorForm = (
    actor: ActorFormData,
    index: number,
    type: 'jointObligor' | 'aval',
    onUpdate: (index: number, data: Partial<ActorFormData>) => void,
    onRemove: (index: number) => void,
    actors: ActorFormData[]
  ) => (
    <Card key={index}>
      <CardContent className="pt-6 space-y-4">
        <div className="flex justify-between items-center">
          <h4 className="font-medium">
            {type === 'jointObligor' ? 'Obligado Solidario' : 'Aval'} {index + 1}
          </h4>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => onRemove(index)}
            disabled={actors.length === 1}
            title={actors.length === 1 ? `Debe haber al menos un ${type === 'jointObligor' ? 'obligado solidario' : 'aval'}` : 'Eliminar'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        <PersonNameFields
          firstName={actor.firstName}
          middleName={actor.middleName}
          paternalLastName={actor.paternalLastName}
          maternalLastName={actor.maternalLastName}
          onChange={(field, value) => onUpdate(index, { [field]: value })}
          required={true}
        />

        <div>
          <Label htmlFor={`${type}-email-${index}`}>
            Email <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`${type}-email-${index}`}
            type="email"
            value={actor.email}
            onChange={(e) => onUpdate(index, { email: e.target.value })}
            placeholder="correo@ejemplo.com"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${type}-phone-${index}`}>Teléfono</Label>
            <Input
              id={`${type}-phone-${index}`}
              value={actor.phone}
              onChange={(e) => onUpdate(index, { phone: e.target.value })}
              placeholder="10 dígitos"
            />
          </div>

          <div>
            <Label htmlFor={`${type}-rfc-${index}`}>RFC (Opcional)</Label>
            <Input
              id={`${type}-rfc-${index}`}
              value={actor.rfc || ''}
              onChange={(e) => onUpdate(index, { rfc: e.target.value.toUpperCase() })}
              placeholder="AAAA123456XXX"
              maxLength={13}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Obligado Solidario / Aval</CardTitle>
        <CardDescription>Configure las garantías para la protección</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Guarantor Type Selector */}
        <div>
          <Label htmlFor="guarantorType">
            Tipo de Garantía <span className="text-red-500">*</span>
          </Label>
          <Select
            value={guarantorType}
            onValueChange={(value) => onSetGuarantorType(value as GuarantorType)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccione el tipo de garantía" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={GuarantorType.NONE}>Sin Garantía</SelectItem>
              <SelectItem value={GuarantorType.JOINT_OBLIGOR}>Obligado Solidario</SelectItem>
              <SelectItem value={GuarantorType.AVAL}>Aval</SelectItem>
              <SelectItem value={GuarantorType.BOTH}>Ambos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Joint Obligors Section */}
        {(guarantorType === GuarantorType.JOINT_OBLIGOR || guarantorType === GuarantorType.BOTH) && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-medium">Obligados Solidarios</h3>
              <Button size="sm" onClick={onAddJointObligor}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Obligado Solidario
              </Button>
            </div>

            {jointObligors.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Debe agregar al menos un obligado solidario. Haga clic en "Agregar Obligado Solidario" para continuar.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {jointObligors.map((jo, index) =>
                  renderActorForm(
                    jo,
                    index,
                    'jointObligor',
                    onUpdateJointObligor,
                    onRemoveJointObligor,
                    jointObligors
                  )
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
              <Button size="sm" onClick={onAddAval}>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Aval
              </Button>
            </div>

            {avals.length === 0 ? (
              <Alert>
                <AlertDescription>
                  Debe agregar al menos un aval. Haga clic en "Agregar Aval" para continuar.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {avals.map((aval, index) =>
                  renderActorForm(
                    aval,
                    index,
                    'aval',
                    onUpdateAval,
                    onRemoveAval,
                    avals
                  )
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

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <Button variant="outline" onClick={onPrevious}>
            Anterior
          </Button>
          <Button
            onClick={onNext}
            disabled={!isValid()}
          >
            Siguiente
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}