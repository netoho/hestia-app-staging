/**
 * micfdi CFDI ingestion API client (#212). Mirrors the googleMapsService
 * convention: a BaseService subclass, env-keyed, native fetch.
 *
 * Submitting a payment returns a permanent `portal_url` where the client
 * self-attests their RFC + fiscal data and stamps their own CFDI 4.0 — we
 * never send or store fiscal identity. Idempotent on `external_ref`.
 */
import { BaseService } from './base/BaseService';
import { ServiceError, ErrorCode } from './types/errors';

const DEFAULT_STAGING_URL = 'https://micfdi-api-stg.tbrneto.workers.dev';

export interface MicfdiSubmissionInput {
  external_ref: string;
  description: string;
  payment_form: string;
  /** IVA-exclusive, 2-decimal STRING per the micfdi contract (e.g. "4310.34"). */
  unit_price: string;
  quantity?: number;
  client?: { name?: string; email?: string };
  /**
   * Ownership facts (#225): what the client types at the partner search portal
   * (facturacion.*) to find + stamp this record.
   */
  match_fields?: {
    policy_number: string;
    /** Date-only ISO, e.g. "2026-05-01". */
    contract_start: string;
  };
}

export interface MicfdiRecordResult {
  recordId: string | null;
  portalUrl: string | null;
  /** micfdi status: registered → validated → invoiced. */
  status: string;
  idempotentReplay: boolean;
}

/** Full record detail from GET /v1/records/:id — the stamped-CFDI fields appear once the client invoices. */
export interface MicfdiRecordDetail {
  recordId: string | null;
  status: string | null;
  portalUrl: string | null;
  folio: string | null;
  uuid: string | null;
  subtotal: number | null;
  iva: number | null;
  total: number | null;
  stampedAt: Date | null;
}

class MiCfdiService extends BaseService {
  private apiKey: string | undefined;
  private baseUrl: string;
  private productKey: string | undefined;
  private unitKey: string | undefined;

  constructor() {
    super();
    this.apiKey = process.env.MICFDI_API_KEY;
    this.baseUrl = (process.env.MICFDI_API_BASE_URL || DEFAULT_STAGING_URL).replace(/\/$/, '');
    // SAT c_ClaveProdServ / c_ClaveUnidad for the line item (#225). When unset
    // the fields are omitted and micfdi's issuer defaults apply (T1 behavior).
    this.productKey = process.env.MICFDI_PRODUCT_KEY;
    this.unitKey = process.env.MICFDI_UNIT_KEY;
  }

  private ensureConfigured(): void {
    if (!this.apiKey) {
      throw new ServiceError(ErrorCode.INTERNAL_ERROR, 'micfdi API key is not configured', 500);
    }
  }

  /**
   * POST /v1/records — register a payment. 201 → new record + portal_url;
   * 200 → idempotent replay of the same external_ref. Non-2xx maps to a
   * ServiceError carrying micfdi's error code.
   */
  async submitPayment(input: MicfdiSubmissionInput): Promise<MicfdiRecordResult> {
    this.ensureConfigured();

    const response = await fetch(`${this.baseUrl}/v1/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey!}`,
      },
      body: JSON.stringify({
        quantity: 1,
        ...(this.productKey ? { product_key: this.productKey } : {}),
        ...(this.unitKey ? { unit_key: this.unitKey } : {}),
        ...input,
      }),
      cache: 'no-store',
    });

    const data = (await response.json().catch(() => ({}))) as {
      record?: { id?: string; status?: string };
      portal_url?: string;
      idempotent_replay?: boolean;
      error?: { code?: string; message?: string };
    };

    if (!response.ok) {
      const code = data.error?.code ?? `http_${response.status}`;
      const message = data.error?.message ?? `micfdi request failed (${response.status})`;
      this.log('error', 'micfdi submitPayment failed', {
        status: response.status,
        code,
        external_ref: input.external_ref,
        // Full error body — micfdi's validation messages are the only clue
        // when a live submission is rejected.
        body: JSON.stringify(data),
      });
      throw new ServiceError(ErrorCode.INTERNAL_ERROR, `micfdi: ${message}`, 502, { code });
    }

    return {
      recordId: data.record?.id ?? null,
      portalUrl: data.portal_url ?? null,
      status: data.record?.status ?? 'registered',
      idempotentReplay: data.idempotent_replay === true || response.status === 200,
    };
  }

  /**
   * GET /v1/records/:id — fetch a record's current state for reconciliation
   * (#216). micfdi sends no webhooks, so the stamped-CFDI fields (folio, uuid,
   * totals) are learned by polling. Field names parsed defensively pending live
   * confirmation of the /v1/records response shape (HITL).
   */
  async getRecord(recordId: string): Promise<MicfdiRecordDetail> {
    this.ensureConfigured();

    const response = await fetch(`${this.baseUrl}/v1/records/${encodeURIComponent(recordId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.apiKey!}` },
      cache: 'no-store',
    });

    const data = (await response.json().catch(() => ({}))) as {
      record?: {
        id?: string;
        status?: string;
        folio?: string;
        uuid?: string;
        subtotal?: number;
        iva?: number;
        total?: number;
        stamped_at?: string;
      };
      portal_url?: string;
      error?: { code?: string; message?: string };
    };

    if (!response.ok) {
      const code = data.error?.code ?? `http_${response.status}`;
      const message = data.error?.message ?? `micfdi request failed (${response.status})`;
      this.log('error', 'micfdi getRecord failed', { status: response.status, code, recordId });
      throw new ServiceError(ErrorCode.INTERNAL_ERROR, `micfdi: ${message}`, 502, { code });
    }

    const stampedAtRaw = data.record?.stamped_at;
    const stampedAt = stampedAtRaw ? new Date(stampedAtRaw) : null;

    return {
      recordId: data.record?.id ?? null,
      status: data.record?.status ?? null,
      portalUrl: data.portal_url ?? null,
      folio: data.record?.folio ?? null,
      uuid: data.record?.uuid ?? null,
      subtotal: data.record?.subtotal ?? null,
      iva: data.record?.iva ?? null,
      total: data.record?.total ?? null,
      stampedAt: stampedAt && !isNaN(stampedAt.getTime()) ? stampedAt : null,
    };
  }
}

export const micfdiService = new MiCfdiService();
export const submitPaymentToMicfdi = micfdiService.submitPayment.bind(micfdiService);
