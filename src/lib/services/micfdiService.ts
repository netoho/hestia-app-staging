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
  /** IVA-exclusive; micfdi adds 16% IVA automatically. */
  unit_price: number;
  quantity?: number;
  client?: { name?: string; email?: string };
}

export interface MicfdiRecordResult {
  recordId: string | null;
  portalUrl: string | null;
  /** micfdi status: registered → validated → invoiced. */
  status: string;
  idempotentReplay: boolean;
}

class MiCfdiService extends BaseService {
  private apiKey: string | undefined;
  private baseUrl: string;

  constructor() {
    super();
    this.apiKey = process.env.MICFDI_API_KEY;
    this.baseUrl = (process.env.MICFDI_API_BASE_URL || DEFAULT_STAGING_URL).replace(/\/$/, '');
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
      body: JSON.stringify({ quantity: 1, ...input }),
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
}

export const micfdiService = new MiCfdiService();
export const submitPaymentToMicfdi = micfdiService.submitPayment.bind(micfdiService);
