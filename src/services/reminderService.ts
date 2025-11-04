import prisma from '@/lib/prisma';
import { PolicyStatus } from '@prisma/client';
import {
  sendActorIncompleteReminder,
  sendPolicyCreatorSummary,
  type ActorIncompleteReminderData,
  type PolicyCreatorSummaryData
} from '@/lib/services/emailService';

type ActorType = 'landlord' | 'tenant' | 'jointObligor' | 'aval';

interface ReminderResult {
  policiesProcessed: number;
  remindersSent: number;
  errors: string[];
}

interface IncompleteActor {
  type: ActorType;
  id: string;
  email: string | null;
  firstName: string | null;
  paternalLastName: string | null;
  companyName: string | null;
  informationComplete?: boolean;
}

/**
 * Send daily reminders for policies with incomplete actor information
 * Runs daily at 11:30 AM Mexico City time
 */
export async function sendIncompleteActorReminders(): Promise<ReminderResult> {
  const result: ReminderResult = {
    policiesProcessed: 0,
    remindersSent: 0,
    errors: []
  };

  try {
    // Find all policies in COLLECTING_INFO status
    const policies = await prisma.policy.findMany({
      where: {
        status: PolicyStatus.COLLECTING_INFO
      },
      include: {
        landlords: {
          select: {
            id: true,
            email: true,
            firstName: true,
            paternalLastName: true,
            companyName: true,
            informationComplete: true,
            isPrimary: true
          }
        },
        tenant: true,
        jointObligors: true,
        avals: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      }
    });

    console.log(`[REMINDER] Found ${policies.length} policies in COLLECTING_INFO status`);

    for (const policy of policies) {
      result.policiesProcessed++;

      try {
        const incompleteActors: IncompleteActor[] = [];

        // Check primary landlord only
        const primaryLandlord = policy.landlords.find(l => l.isPrimary);
        if (primaryLandlord && !primaryLandlord.informationComplete) {
          incompleteActors.push({
            type: 'landlord' as ActorType,
            id: primaryLandlord.id,
            email: primaryLandlord.email,
            firstName: primaryLandlord.firstName,
            paternalLastName: primaryLandlord.paternalLastName,
            companyName: primaryLandlord.companyName
          });
        }

        // Check tenant (singular)
        if (policy.tenant && !policy.tenant.informationComplete) {
          incompleteActors.push({
            type: 'tenant' as ActorType,
            id: policy.tenant.id,
            email: policy.tenant.email,
            firstName: policy.tenant.firstName,
            paternalLastName: policy.tenant.paternalLastName,
            companyName: policy.tenant.companyName
          });
        }

        // Check joint obligors (plural)
        policy.jointObligors.forEach(jointObligor => {
          if (!jointObligor.informationComplete) {
            incompleteActors.push({
              type: 'jointObligor' as ActorType,
              id: jointObligor.id,
              email: jointObligor.email,
              firstName: jointObligor.firstName,
              paternalLastName: jointObligor.paternalLastName,
              companyName: jointObligor.companyName
            });
          }
        });

        // Check avals (plural)
        policy.avals.forEach(aval => {
          if (!aval.informationComplete) {
            incompleteActors.push({
              type: 'aval' as ActorType,
              id: aval.id,
              email: aval.email,
              firstName: aval.firstName,
              paternalLastName: aval.paternalLastName,
              companyName: aval.companyName
            });
          }
        });

        if (incompleteActors.length === 0) {
          console.log(`[REMINDER] Policy ${policy.policyNumber} has no incomplete actors`);
          continue;
        }

        console.log(`[REMINDER] Policy ${policy.policyNumber} has ${incompleteActors.length} incomplete actors`);

        // Send individual reminders to incomplete actors
        for (const actor of incompleteActors) {
          if (!actor.email) {
            console.log(`[REMINDER] No email for ${actor.type} ${actor.id}`);
            continue;
          }

          try {
            // Generate the actor access link
            const actorLink = `${process.env.NEXTAUTH_URL}/actors/${actor.type}/${actor.id}`;

            // Send reminder email using the email service
            const emailData: ActorIncompleteReminderData = {
              actorType: actor.type,
              actorName: getActorName(actor),
              email: actor.email,
              policyNumber: policy.policyNumber,
              actorLink: actorLink
            };

            const success = await sendActorIncompleteReminder(emailData);
            if (success) {
              result.remindersSent++;
              console.log(`[REMINDER] Sent reminder to ${actor.type} ${actor.email} for policy ${policy.policyNumber}`);
            } else {
              throw new Error('Failed to send email');
            }

          } catch (error) {
            const errorMsg = `Failed to send reminder to ${actor.email}: ${error}`;
            console.error(`[REMINDER] ${errorMsg}`);
            result.errors.push(errorMsg);
          }
        }

        // Send summary to policy creator
        if (policy.createdBy?.email) {
          try {
            const creatorName = policy.createdBy.name || 'Usuario';
            const policyLink = `${process.env.NEXTAUTH_URL}/dashboard/policies/${policy.id}`;

            // Prepare email data for the summary
            const summaryData: PolicyCreatorSummaryData = {
              creatorName: creatorName,
              email: policy.createdBy.email,
              policyNumber: policy.policyNumber,
              policyLink: policyLink,
              incompleteActors: incompleteActors.map(actor => ({
                type: getActorTypeLabel(actor.type),
                name: getActorName(actor),
                email: actor.email || 'Sin email'
              }))
            };

            const success = await sendPolicyCreatorSummary(summaryData);
            if (success) {
              console.log(`[REMINDER] Sent summary to policy creator ${policy.createdBy.email} for policy ${policy.policyNumber}`);
            }

          } catch (error) {
            const errorMsg = `Failed to send summary to creator ${policy.createdBy.email}: ${error}`;
            console.error(`[REMINDER] ${errorMsg}`);
            result.errors.push(errorMsg);
          }
        }

      } catch (error) {
        const errorMsg = `Error processing policy ${policy.id}: ${error}`;
        console.error(`[REMINDER] ${errorMsg}`);
        result.errors.push(errorMsg);
      }
    }

    return result;

  } catch (error) {
    console.error('[REMINDER] Fatal error in reminder service:', error);
    throw error;
  }
}

/**
 * Get human-readable label for actor type
 */
function getActorTypeLabel(type: ActorType): string {
  const labels: Record<ActorType, string> = {
    landlord: 'Arrendador',
    tenant: 'Arrendatario',
    jointObligor: 'Obligado Solidario',
    aval: 'Aval'
  };
  return labels[type] || type;
}

/**
 * Get display name for an actor
 */
function getActorName(actor: IncompleteActor): string {
  if (actor.companyName) {
    return actor.companyName;
  }
  if (actor.firstName && actor.paternalLastName) {
    return `${actor.firstName} ${actor.paternalLastName}`;
  }
  return 'Sin nombre';
}
