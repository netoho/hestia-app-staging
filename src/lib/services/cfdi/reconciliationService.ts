/**
 * CFDI reconciliation (#216). micfdi sends no webhooks, so the stamped-CFDI
 * facts (status transitions, folio, uuid, totals) are learned by polling
 * GET /v1/records/:id:
 *   - reconcilePending(): cron sweep over non-terminal records
 *   - refreshForPayment(): staff on-demand refresh for one payment
 *
 * `invoiced` is terminal — those records are never polled again. Stamped
 * values only ever fill in (null-preserving merge); a sparse micfdi response
 * can't blank fields we already learned.
 */
import { BaseService } from '../base/BaseService';
import { ServiceError, ErrorCode } from '../types/errors';
import { micfdiService } from '../micfdiService';
import type { CfdiRecordSummary } from '../paymentService';

const TERMINAL_STATUSES = ['invoiced'];

/** Fields returned to the on-demand refresh — mirrors the T4 summary select. */
const CFDI_SUMMARY_SELECT = {
  id: true,
  status: true,
  portalUrl: true,
  folio: true,
  uuid: true,
  stampedAt: true,
  errorMessage: true,
  createdAt: true,
} as const;

export interface CfdiReconcileSweepResult {
  scanned: number;
  updated: number;
  invoiced: number;
  failed: number;
}

class CfdiReconciliationService extends BaseService {
  /**
   * Pull micfdi's current state for one record row and persist it. Returns
   * whether anything material changed (status/folio/uuid).
   */
  private async reconcileRecord(record: {
    id: string;
    micfdiRecordId: string | null;
    status: string;
    folio: string | null;
    uuid: string | null;
    portalUrl: string | null;
  }): Promise<{ changed: boolean; status: string }> {
    if (!record.micfdiRecordId) {
      return { changed: false, status: record.status };
    }

    const detail = await micfdiService.getRecord(record.micfdiRecordId);

    const nextStatus = detail.status ?? record.status;
    const changed =
      nextStatus !== record.status ||
      (detail.folio ?? record.folio) !== record.folio ||
      (detail.uuid ?? record.uuid) !== record.uuid;

    await this.prisma.cfdiRecord.update({
      where: { id: record.id },
      data: {
        status: nextStatus,
        // Fill-only merge: never blank a value micfdi omitted this time.
        folio: detail.folio ?? undefined,
        uuid: detail.uuid ?? undefined,
        subtotal: detail.subtotal ?? undefined,
        iva: detail.iva ?? undefined,
        total: detail.total ?? undefined,
        stampedAt: detail.stampedAt ?? undefined,
        portalUrl: record.portalUrl ?? detail.portalUrl ?? undefined,
      },
    });

    return { changed, status: nextStatus };
  }

  /**
   * Cron sweep: reconcile every non-terminal record that has a micfdi id.
   * Oldest-updated first so the sweep rotates fairly under the `limit`; one
   * record's failure never aborts the rest.
   */
  async reconcilePending(limit = 200): Promise<CfdiReconcileSweepResult> {
    const pending = await this.prisma.cfdiRecord.findMany({
      where: {
        status: { notIn: TERMINAL_STATUSES },
        micfdiRecordId: { not: null },
      },
      orderBy: { updatedAt: 'asc' },
      take: limit,
      select: {
        id: true,
        micfdiRecordId: true,
        status: true,
        folio: true,
        uuid: true,
        portalUrl: true,
      },
    });

    const result: CfdiReconcileSweepResult = {
      scanned: pending.length,
      updated: 0,
      invoiced: 0,
      failed: 0,
    };

    for (const record of pending) {
      try {
        const { changed, status } = await this.reconcileRecord(record);
        if (changed) result.updated++;
        if (status === 'invoiced') result.invoiced++;
      } catch (error) {
        result.failed++;
        this.log('error', 'CFDI reconcile failed for record', {
          cfdiRecordId: record.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.log('info', 'CFDI reconcile sweep finished', { ...result });
    return result;
  }

  /**
   * Staff on-demand refresh (#216): reconcile the record behind one payment and
   * return the refreshed summary. Interactive — failures THROW to the caller.
   */
  async refreshForPayment(paymentId: string): Promise<CfdiRecordSummary> {
    const record = await this.prisma.cfdiRecord.findUnique({
      where: { paymentId },
      select: {
        id: true,
        micfdiRecordId: true,
        status: true,
        folio: true,
        uuid: true,
        portalUrl: true,
      },
    });

    if (!record) {
      throw new ServiceError(ErrorCode.NOT_FOUND, 'El pago no tiene factura registrada', 404, {
        paymentId,
      });
    }

    if (!record.micfdiRecordId) {
      throw new ServiceError(
        ErrorCode.VALIDATION_ERROR,
        'La factura no tiene registro en micfdi — use "Generar factura"',
        400,
        { paymentId },
      );
    }

    await this.reconcileRecord(record);

    return this.prisma.cfdiRecord.findUniqueOrThrow({
      where: { paymentId },
      select: CFDI_SUMMARY_SELECT,
    });
  }
}

export const cfdiReconciliationService = new CfdiReconciliationService();
