/**
 * Download a policy PDF from the API
 */
export async function downloadPolicyPdf(
  policyId: string,
  policyNumber: string,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  }
): Promise<void> {
  const response = await fetch(`/api/policies/${policyId}/pdf`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.error || 'Error al descargar PDF');
    options?.onError?.(error);
    throw error;
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') ||
    `poliza_${policyNumber}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);

  options?.onSuccess?.();
}
