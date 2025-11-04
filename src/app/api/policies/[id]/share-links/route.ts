import { NextRequest, NextResponse } from 'next/server';
import { withPolicyAuth } from '@/lib/middleware/policyAuth';
import { getPolicyById } from '@/lib/services/policyService';
import { generateActorUrl } from '@/lib/services/actorTokenService';
import { formatFullName } from '@/lib/utils/names';

export const GET = withPolicyAuth(async (
  request: NextRequest,
  { params },
  authResult
) => {
  try {
    const { id } = await params;

    // Fetch policy with all actors
    const policy = await getPolicyById(id);

    if (!policy) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      );
    }

    // Build share links for all actors
    const shareLinks: any[] = [];

    // Landlords
    for (const landlord of policy.landlords) {
      if (landlord.accessToken && landlord.isPrimary) {
        shareLinks.push({
          actorId: landlord.id,
          actorType: 'landlord',
          actorName: landlord.companyName ||
            (landlord.firstName ? formatFullName(
              landlord.firstName,
              landlord.paternalLastName || '',
              landlord.maternalLastName || '',
              landlord.middleName || undefined
            ) : 'Sin nombre'),
          email: landlord.email,
          phone: landlord.phone,
          url: generateActorUrl(landlord.accessToken, 'landlord'),
          tokenExpiry: landlord.tokenExpiry,
          informationComplete: landlord.informationComplete,
      });
      }
    }

    // Tenant
    if (policy.tenant?.accessToken) {
      shareLinks.push({
        actorId: policy.tenant.id,
        actorType: 'tenant',
        actorName: policy.tenant.companyName ||
          (policy.tenant.firstName ? formatFullName(
            policy.tenant.firstName,
            policy.tenant.paternalLastName || '',
            policy.tenant.maternalLastName || '',
            policy.tenant.middleName || undefined
          ) : 'Sin nombre'),
        email: policy.tenant.email,
        phone: policy.tenant.phone,
        url: generateActorUrl(policy.tenant.accessToken, 'tenant'),
        tokenExpiry: policy.tenant.tokenExpiry,
        informationComplete: policy.tenant.informationComplete,
      });
    }

    // Joint Obligors
    if (policy.jointObligors) {
      for (const jo of policy.jointObligors) {
        if (jo.accessToken) {
          shareLinks.push({
            actorId: jo.id,
            actorType: 'joint-obligor',
            actorName: jo.companyName ||
              (jo.firstName ? formatFullName(
                jo.firstName,
                jo.paternalLastName || '',
                jo.maternalLastName || '',
                jo.middleName || undefined
              ) : 'Sin nombre'),
            email: jo.email,
            phone: jo.phone,
            url: generateActorUrl(jo.accessToken, 'joint-obligor'),
            tokenExpiry: jo.tokenExpiry,
            informationComplete: jo.informationComplete,
          });
        }
      }
    }

    // Avals
    if (policy.avals) {
      for (const aval of policy.avals) {
        if (aval.accessToken) {
          shareLinks.push({
            actorId: aval.id,
            actorType: 'aval',
            actorName: aval.companyName ||
              (aval.firstName ? formatFullName(
                aval.firstName,
                aval.paternalLastName || '',
                aval.maternalLastName || '',
                aval.middleName || undefined
              ) : 'Sin nombre'),
            email: aval.email,
            phone: aval.phone,
            url: generateActorUrl(aval.accessToken, 'aval'),
            tokenExpiry: aval.tokenExpiry,
            informationComplete: aval.informationComplete,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        policyNumber: policy.policyNumber,
        shareLinks,
      },
    });

  } catch (error) {
    console.error('Get share links error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
