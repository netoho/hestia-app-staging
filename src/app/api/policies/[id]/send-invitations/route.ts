import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { withRole } from '@/lib/auth/middleware';
import { UserRole, ActorType } from '@/types/policy';
import { sendActorInvitation } from '@/lib/services/emailService';
import { isDemoMode } from '@/lib/env-check';
import { DemoORM } from '@/lib/services/demoDatabase';
import { v4 as uuidv4 } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withRole(request, [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER], async (req, user) => {
    try {
      const { id } = params;

      if (isDemoMode()) {
        const demoORM = DemoORM;
        const policy = demoORM.policies.find(p => p.id === id);

        if (!policy) {
          return NextResponse.json(
            { success: false, error: 'Policy not found' },
            { status: 404 }
          );
        }

        // Check if user can access this policy
        if (user.role === UserRole.BROKER && policy.createdById !== user.id) {
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 }
          );
        }

        const invitations = [];

        // Create token for tenant
        const tenant = demoORM.tenants.find(t => t.policyId === policy.id);
        if (tenant && tenant.email) {
          const tenantToken = {
            id: uuidv4(),
            token: uuidv4(),
            actorType: 'tenant' as ActorType,
            actorId: tenant.id,
            policyId: policy.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            createdAt: new Date(),
            usedAt: null,
          };
          demoORM.actorTokens.push(tenantToken);

          const sent = await sendActorInvitation({
            actorType: 'tenant',
            email: tenant.email,
            name: tenant.firstName ? `${tenant.firstName} ${tenant.lastName}` : 'Inquilino',
            token: tenantToken.token,
            policyNumber: policy.policyNumber,
            propertyAddress: policy.propertyAddress,
          });

          invitations.push({
            actorType: 'tenant',
            email: tenant.email,
            sent,
            token: tenantToken.token,
          });
        }

        // Create tokens for joint obligors
        const jointObligors = demoORM.jointObligors.filter(jo => jo.policyId === policy.id);
        for (const jo of jointObligors) {
          if (jo.email) {
            const joToken = {
              id: uuidv4(),
              token: uuidv4(),
              actorType: 'jointObligor' as ActorType,
              actorId: jo.id,
              policyId: policy.id,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: new Date(),
              usedAt: null,
            };
            demoORM.actorTokens.push(joToken);

            const sent = await sendActorInvitation({
              actorType: 'joint_obligor',
              email: jo.email,
              name: jo.firstName ? `${jo.firstName} ${jo.lastName}` : 'Obligado Solidario',
              token: joToken.token,
              policyNumber: policy.policyNumber,
              propertyAddress: policy.propertyAddress,
            });

            invitations.push({
              actorType: 'jointObligor',
              email: jo.email,
              sent,
              token: joToken.token,
            });
          }
        }

        // Create tokens for avals
        const avals = demoORM.avals.filter(a => a.policyId === policy.id);
        for (const aval of avals) {
          if (aval.email) {
            const avalToken = {
              id: uuidv4(),
              token: uuidv4(),
              actorType: 'aval' as ActorType,
              actorId: aval.id,
              policyId: policy.id,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              createdAt: new Date(),
              usedAt: null,
            };
            demoORM.actorTokens.push(avalToken);

            const sent = await sendActorInvitation({
              actorType: 'aval',
              email: aval.email,
              name: aval.firstName ? `${aval.firstName} ${aval.lastName}` : 'Aval',
              token: avalToken.token,
              policyNumber: policy.policyNumber,
              propertyAddress: policy.propertyAddress,
            });

            invitations.push({
              actorType: 'aval',
              email: aval.email,
              sent,
              token: avalToken.token,
            });
          }
        }

        // Update policy status
        const policyIndex = demoORM.policies.findIndex(p => p.id === id);
        if (policyIndex !== -1) {
          demoORM.policies[policyIndex].status = 'PENDING_INFO';
        }

        return NextResponse.json({
          success: true,
          data: { invitations },
        });
      }

      // Production mode with Prisma
      const policy = await prisma.policy.findUnique({
        where: { id },
        include: {
          tenant: true,
          jointObligors: true,
          avals: true,
        },
      });

      if (!policy) {
        return NextResponse.json(
          { success: false, error: 'Policy not found' },
          { status: 404 }
        );
      }

      // Check if user can access this policy
      if (user.role === UserRole.BROKER && policy.createdById !== user.id) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const invitations = [];

      // Create token for tenant
      if (policy.tenant && policy.tenant.email) {
        const tenantToken = await prisma.actorToken.create({
          data: {
            token: uuidv4(),
            actorType: ActorType.TENANT,
            actorId: policy.tenant.id,
            policyId: policy.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        const sent = await sendActorInvitation({
          actorType: 'tenant',
          email: policy.tenant.email,
          name: policy.tenant.firstName ? `${policy.tenant.firstName} ${policy.tenant.lastName}` : 'Inquilino',
          token: tenantToken.token,
          policyNumber: policy.policyNumber,
          propertyAddress: policy.propertyAddress,
        });

        invitations.push({
          actorType: 'tenant',
          email: policy.tenant.email,
          sent,
          token: tenantToken.token,
        });
      }

      // Create tokens for joint obligors
      for (const jo of policy.jointObligors) {
        if (jo.email) {
          const joToken = await prisma.actorToken.create({
            data: {
              token: uuidv4(),
              actorType: ActorType.JOINT_OBLIGOR,
              actorId: jo.id,
              policyId: policy.id,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });

          const sent = await sendActorInvitation({
            actorType: 'joint_obligor',
            email: jo.email,
            name: jo.firstName ? `${jo.firstName} ${jo.lastName}` : 'Obligado Solidario',
            token: joToken.token,
            policyNumber: policy.policyNumber,
            propertyAddress: policy.propertyAddress,
          });

          invitations.push({
            actorType: 'jointObligor',
            email: jo.email,
            sent,
            token: joToken.token,
          });
        }
      }

      // Create tokens for avals
      for (const aval of policy.avals) {
        if (aval.email) {
          const avalToken = await prisma.actorToken.create({
            data: {
              token: uuidv4(),
              actorType: ActorType.AVAL,
              actorId: aval.id,
              policyId: policy.id,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
          });

          const sent = await sendActorInvitation({
            actorType: 'aval',
            email: aval.email,
            name: aval.firstName ? `${aval.firstName} ${aval.lastName}` : 'Aval',
            token: avalToken.token,
            policyNumber: policy.policyNumber,
            propertyAddress: policy.propertyAddress,
          });

          invitations.push({
            actorType: 'aval',
            email: aval.email,
            sent,
            token: avalToken.token,
          });
        }
      }

      // Update policy status
      await prisma.policy.update({
        where: { id },
        data: { status: 'PENDING_INFO' },
      });

      return NextResponse.json({
        success: true,
        data: { invitations },
      });
    } catch (error) {
      console.error('Send invitations error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to send invitations' },
        { status: 500 }
      );
    }
  });
}