/**
 * Aval submission API route
 * Refactored to use AvalService for better maintainability
 */

import { NextRequest, NextResponse } from 'next/server';
import { AvalService } from '@/lib/services/actors/AvalService';
import { toServiceResponse } from '@/lib/services/types/result';
import { logPolicyActivity } from '@/lib/services/policyService';
import { checkPolicyActorsComplete } from '@/lib/services/actorTokenService';
import { transitionPolicyStatus } from '@/lib/services/policyWorkflowService';

// PUT handler for partial saves (per-tab auto-save)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    // Initialize service
    const avalService = new AvalService();

    // Extract partial flag
    const isPartialSave = body.partial === true;

    // Process submission through service
    const result = await avalService.validateAndSave(
      token,
      body,
      isPartialSave
    );

    // Convert result to API response
    if (!result.ok) {
      const response = toServiceResponse(result);
      return NextResponse.json(
        {
          error: response.error?.message || 'Error processing request',
          details: response.error?.details,
        },
        { status: result.error.statusCode || 400 }
      );
    }

    // Success response
    return NextResponse.json({
      success: true,
      message: result.value.message,
      data: result.value.data.aval
    });

  } catch (error) {
    console.error('Aval partial save error:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      {
        error: 'Error al guardar la información',
        details: error instanceof Error ? { message: error.message } : error
      },
      { status: 500 }
    );
  }
}

// POST handler for final submission
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await request.json();

    // Initialize service
    const avalService = new AvalService();

    // Process final submission through service (not partial)
    const result = await avalService.validateAndSave(
      token,
      body,
      false // Final submission
    );

    // Convert result to API response
    if (!result.ok) {
      const response = toServiceResponse(result);
      return NextResponse.json(
        {
          error: response.error?.message || 'Error processing request',
          details: response.error?.details,
        },
        { status: result.error.statusCode || 400 }
      );
    }

    const { aval, policyId } = result.value.data;

    // Log activity
    await logPolicyActivity({
      policyId,
      action: 'aval_info_completed',
      description: 'Aval information completed',
      details: {
        avalId: aval.id,
        avalName: body.fullName || body.companyName,
        propertyValue: body.propertyValue,
        completedAt: new Date()
      },
      performedByType: 'aval',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    });

    // Check if all actors are complete and transition status if needed
    const actorsStatus = await checkPolicyActorsComplete(policyId);
    if (actorsStatus.allComplete) {
      await transitionPolicyStatus(
        policyId,
        'UNDER_INVESTIGATION',
        'system',
        'All actor information completed'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Información guardada exitosamente',
      data: {
        aval,
        actorsComplete: actorsStatus.allComplete
      }
    });

  } catch (error) {
    console.error('Aval submit error:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    return NextResponse.json(
      {
        error: 'Error al guardar la información',
        details: error instanceof Error ? { message: error.message } : error
      },
      { status: 500 }
    );
  }
}