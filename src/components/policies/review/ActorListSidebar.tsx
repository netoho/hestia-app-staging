'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';
import type { ActorReviewInfo } from '@/lib/services/reviewService.types';
import { getActorTypeLabel, getActorIcon } from '@/lib/utils/actor';

interface ActorListSidebarProps {
  actors: ActorReviewInfo[];
  selectedActorId: string | null;
  onActorSelect: (actor: ActorReviewInfo) => void;
}

export default function ActorListSidebar({
  actors,
  selectedActorId,
  onActorSelect
}: ActorListSidebarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Partes</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="p-4 space-y-2 overflow-hidden">
            {actors.map((actor) => {
              const Icon = getActorIcon(actor.actorType);
              return (
                <button
                  key={`${actor.actorType}-${actor.actorId}`}
                  onClick={() => onActorSelect(actor)}
                  className={`w-full text-left p-3 rounded-lg border transition-all ${
                    selectedActorId === actor.actorId
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <Icon className="h-5 w-5 text-gray-600 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate" title={actor.name}>
                          {actor.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {getActorTypeLabel(actor.actorType)}
                        </p>
                        {actor.isCompany && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Empresa
                          </Badge>
                        )}
                        {/* Stats - shown below name on md+ */}
                        <div className="hidden md:flex items-center gap-3 mt-1.5">
                          <div className="flex items-center gap-1">
                            {actor.progress.sectionsApproved === actor.progress.sectionsTotal ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <Clock className="h-3 w-3 text-orange-500" />
                            )}
                            <span className="text-xs text-gray-500">
                              {actor.progress.sectionsApproved}/{actor.progress.sectionsTotal}
                            </span>
                          </div>
                          <span className="text-gray-300">·</span>
                          <div className="flex items-center gap-1">
                            {actor.progress.documentsApproved === actor.progress.documentsTotal ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <Clock className="h-3 w-3 text-orange-500" />
                            )}
                            <span className="text-xs text-gray-500">
                              {actor.progress.documentsApproved}/{actor.progress.documentsTotal}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="text-lg font-bold text-blue-600">
                        {actor.progress.overall}%
                      </div>
                      {/* Stats - shown on right on small screens */}
                      <div className="md:hidden">
                        <div className="flex gap-1 mt-1 justify-end">
                          {actor.progress.sectionsApproved === actor.progress.sectionsTotal ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <Clock className="h-3 w-3 text-orange-500" />
                          )}
                          <span className="text-xs text-gray-500">
                            {actor.progress.sectionsApproved}/{actor.progress.sectionsTotal}
                          </span>
                        </div>
                        <div className="flex gap-1 mt-0.5 justify-end">
                          {actor.progress.documentsApproved === actor.progress.documentsTotal ? (
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                          ) : (
                            <Clock className="h-3 w-3 text-orange-500" />
                          )}
                          <span className="text-xs text-gray-500">
                            {actor.progress.documentsApproved}/{actor.progress.documentsTotal}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
