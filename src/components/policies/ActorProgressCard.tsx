'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Edit, Send, FileText, UserCheck } from 'lucide-react';
import { getActorTypeLabel, getActorIcon, calculateActorProgress } from '@/lib/utils/actor';
import { VerificationBadge } from '@/components/shared/VerificationBadge';
import { CompletionBadge } from '@/components/shared/CompletionBadge';

interface ActorProgressCardProps {
  actor: any;
  actorType: 'tenant' | 'landlord' | 'aval' | 'jointObligor';
  onEdit?: () => void;
  onSendInvitation?: () => void;
  permissions: {
    canEdit: boolean;
    canSendInvitations: boolean;
  };
}

export default function ActorProgressCard({
  actor,
  actorType,
  onEdit,
  onSendInvitation,
  permissions,
}: ActorProgressCardProps) {
  const ActorIcon = getActorIcon(actorType);
  const progress = calculateActorProgress(actor);
  const completedFields = Math.floor((progress / 100) * 10);
  const documentsCount = actor?.documents?.length || 0;
  const referencesCount = (actor?.references?.length || 0) + (actor?.commercialReferences?.length || 0);

  if (!actor) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="h-12 w-12 mx-auto mb-4 text-gray-400 flex items-center justify-center">
            <ActorIcon className="h-5 w-5" />
          </div>
          <p className="text-gray-600 mb-4">No se ha capturado información del {getActorTypeLabel(actorType).toLowerCase()}</p>
          {permissions.canEdit && (
            <Button onClick={onEdit} size="sm">
              <Edit className="mr-2 h-4 w-4" />
              Capturar Información
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
              <ActorIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold truncate">
                {actor.fullName || actor.companyName || getActorTypeLabel(actorType)}
              </h3>
              <p className="text-sm text-gray-600 truncate">{actor.email || 'Sin email'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <VerificationBadge status={actor.verificationStatus || 'PENDING'} />
            <CompletionBadge isComplete={actor.informationComplete} />
            {permissions.canEdit && (
              <Button size="sm" variant="outline" onClick={onEdit} className="h-8 w-8 p-0 sm:w-auto sm:px-3">
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline-block sm:ml-1">Editar</span>
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Progreso</span>
              <span className="font-bold">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Quick Stats - Responsive */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-blue-600">{completedFields}/10</div>
              <div className="text-[10px] sm:text-xs text-gray-600 mt-1">Campos</div>
            </div>
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-purple-600">{documentsCount}</div>
              <div className="text-[10px] sm:text-xs text-gray-600 mt-1">Documentos</div>
            </div>
            <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
              <div className="text-lg sm:text-2xl font-bold text-green-600">{referencesCount}</div>
              <div className="text-[10px] sm:text-xs text-gray-600 mt-1">Referencias</div>
            </div>
          </div>

          {/* Actions */}
          {!actor.informationComplete && permissions.canSendInvitations && (
            <Button
              onClick={onSendInvitation}
              className="w-full"
              variant="outline"
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Invitación
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
