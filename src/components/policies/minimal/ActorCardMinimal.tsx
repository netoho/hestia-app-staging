import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Building, Users, Shield } from 'lucide-react';

interface ActorCardMinimalProps {
  actor: any;
  actorType: 'tenant' | 'landlord' | 'jointObligor' | 'aval';
  onExpand?: () => void;
}

export default function ActorCardMinimal({ actor, actorType, onExpand }: ActorCardMinimalProps) {
  const getActorIcon = () => {
    switch (actorType) {
      case 'tenant': return <User className="h-4 w-4" />;
      case 'landlord': return <Building className="h-4 w-4" />;
      case 'jointObligor': return <Users className="h-4 w-4" />;
      case 'aval': return <Shield className="h-4 w-4" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getActorTitle = () => {
    switch (actorType) {
      case 'tenant': return 'Inquilino';
      case 'landlord': return 'Arrendador';
      case 'jointObligor': return 'Obligado Solidario';
      case 'aval': return 'Aval';
      default: return 'Actor';
    }
  };

  if (!actor) {
    return (
      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onExpand}>
        <CardContent className="py-6 text-center">
          <div className="h-8 w-8 mx-auto mb-2 text-gray-400">
            {getActorIcon()}
          </div>
          <p className="text-sm text-gray-600">Sin información</p>
        </CardContent>
      </Card>
    );
  }

  const displayName = actor.fullName || actor.companyName || 'Sin nombre';

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={onExpand}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getActorIcon()}
            <span>{getActorTitle()}</span>
          </div>
          {actor.informationComplete ? (
            <Badge className="bg-green-500 text-white text-xs">Completo</Badge>
          ) : (
            <Badge className="bg-orange-500 text-white text-xs">Pendiente</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div>
          <p className="text-xs text-gray-600">Nombre</p>
          <p className="text-sm font-medium truncate">{displayName}</p>
        </div>
        {actor.email && (
          <div>
            <p className="text-xs text-gray-600">Email</p>
            <p className="text-sm truncate">{actor.email}</p>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t">
          <div className="text-center">
            <p className="text-xs text-gray-600">Documentos</p>
            <p className="text-sm font-bold">{actor.documents?.length || 0}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-600">Referencias</p>
            <p className="text-sm font-bold">
              {(actor.references?.length || 0) + (actor.commercialReferences?.length || 0)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
