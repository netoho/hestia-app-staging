'use client';

import { Home, User, Users, CheckSquare, Square } from 'lucide-react';
import { formatFullName } from '@/lib/utils/names';
import { ReactNode } from 'react';
import { PolicyListActor } from './types';
import { t } from '@/lib/i18n';

interface ActorsListProps {
  landlords?: PolicyListActor[];
  tenant?: PolicyListActor | null;
  jointObligors?: PolicyListActor[];
  avals?: PolicyListActor[];
  guarantorType?: string;
}

/**
 * Combined display of all policy actors
 * Shows landlords, tenant, joint obligors, and avals in a single column
 */
export default function ActorsList({
  landlords = [],
  tenant,
  jointObligors = [],
  avals = [],
  guarantorType,
}: ActorsListProps) {
  const renderActor = (
    actor: Actor,
    icon: ReactNode,
    label?: string
  ) => {
    const name = formatFullName(actor.firstName, actor.paternalLastName, actor.maternalLastName, actor.middleName) || actor.companyName;
    const CompletionIcon = actor.informationComplete ? CheckSquare : Square;

    return (
      <div className="mb-3 last:mb-0">
        <div className="flex items-start gap-2">
          <div className="mt-0.5 text-muted-foreground">{icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{name}</span>
              <CompletionIcon
                className={`h-3.5 w-3.5 flex-shrink-0 ${
                  actor.informationComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground/60'
                }`}
              />
            </div>
            {actor.email && (
              <div className="text-xs text-muted-foreground truncate">{actor.email}</div>
            )}
            {actor.phone && (
              <div className="text-xs text-muted-foreground">{actor.phone}</div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="text-sm">
      {/* Landlords */}
      {landlords.map((landlord, idx) => (
        <div key={`landlord-${idx}`}>
          {renderActor(
            landlord,
            <Home className="h-4 w-4" />
          )}
        </div>
      ))}

      {/* Tenant */}
      {tenant && renderActor(tenant, <User className="h-4 w-4" />)}

      {/* Joint Obligors */}
      {(guarantorType === 'JOINT_OBLIGOR' || guarantorType === 'BOTH') &&
        jointObligors.map((obligor, idx) => (
          <div key={`obligor-${idx}`}>
            {renderActor(
              obligor,
              <Users className="h-4 w-4" />
            )}
          </div>
        ))}

      {/* Avals */}
      {(guarantorType === 'AVAL' || guarantorType === 'BOTH') &&
        avals.map((aval, idx) => (
          <div key={`aval-${idx}`}>
            {renderActor(
              aval,
              <Users className="h-4 w-4" />
            )}
          </div>
        ))}

      {/* Empty state */}
      {landlords.length === 0 && !tenant && (
        <span className="text-muted-foreground text-sm">{t.pages.createPolicy.list.noActors}</span>
      )}
    </div>
  );
}
