import { NextRequest, NextResponse } from 'next/server';
import { TenantType } from '@prisma/client';
import prisma from '@/lib/prisma';
import { withRole } from '@/lib/auth/middleware';
import { UserRole } from '@/types/policy';
import { sendActorInvitation } from '@/lib/services/emailService';
import { formatFullName } from '@/lib/utils/names';
import {
  generateLandlordToken,
  generateTenantToken,
  generateJointObligorToken,
  generateAvalToken
} from '@/lib/services/actorTokenService';
import { logPolicyActivity } from '@/lib/services/policyService';
import { transitionPolicyStatus } from '@/lib/services/policyWorkflowService';
import {sendIncompleteActorInfoNotification} from "@/lib/services/notificationService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return withRole(request, [UserRole.ADMIN, UserRole.STAFF, UserRole.BROKER], async (req, user) => {
    try {
      const { id } = await params;

      // Parse request body
      const body = await req.json().catch(() => ({}));
      const { actors, resend = false } = body as { actors?: string[], resend?: boolean };


      // Check if user can access this policy
      // if (user.role === UserRole.BROKER && policy.createdById !== user.id) {
      //   return NextResponse.json(
      //     { success: false, error: 'Forbidden' },
      //     { status: 403 }
      //   );
      // }

      const invitations = await sendIncompleteActorInfoNotification({
        initiatorId: user.id,
        policyId: id,
        resend,
        actors,
        initiatorName: user.name || user.email,
        ipAddress: req.headers.get('x-forwarded-for') || '',
      })

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
