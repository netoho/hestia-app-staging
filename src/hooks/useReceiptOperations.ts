'use client';

import { useState, useCallback } from 'react';
import { ReceiptType } from '@/prisma/generated/prisma-client/enums';
import { OperationProgress } from '@/lib/documentManagement/types';
import { uploadToS3WithProgress } from '@/lib/documentManagement/upload';
import { validateFile } from '@/lib/documentManagement/validation';
import { trpc } from '@/lib/trpc/client';
import { useToast } from '@/hooks/use-toast';
import { receipts as t } from '@/lib/i18n/pages/receipts';

// --- Types ---

export type ReceiptOperationStatus = 'pending' | 'success' | 'error';

export interface ReceiptOperation {
  id: string;
  type: 'upload' | 'download' | 'delete' | 'markNA' | 'undoNA';
  status: ReceiptOperationStatus;
  progress?: OperationProgress;
  error?: string;
}

interface UseReceiptOperationsProps {
  mode: 'portal' | 'admin';
  token?: string;
  policyId: string;
  refetchData: () => void;
}

// --- Hook ---

export function useReceiptOperations({
  mode,
  token,
  policyId,
  refetchData,
}: UseReceiptOperationsProps) {
  const [operations, setOperations] = useState<Record<string, ReceiptOperation>>({});
  const { toast } = useToast();

  const utils = trpc.useUtils();

  // Mutations
  const getUploadUrlMutation = trpc.receipt.getUploadUrl.useMutation();
  const confirmUploadMutation = trpc.receipt.confirmUpload.useMutation();
  const deleteReceiptMutation = trpc.receipt.deleteReceipt.useMutation();
  const markNAMutation = trpc.receipt.markNotApplicable.useMutation();
  const undoNAMutation = trpc.receipt.undoNotApplicable.useMutation();

  // --- Helpers ---

  const slotKey = (year: number, month: number, receiptType: ReceiptType, otherCategory?: string) =>
    receiptType === ReceiptType.OTHER && otherCategory
      ? `${year}-${month}-OTHER-${otherCategory}`
      : `${year}-${month}-${receiptType}`;

  const tokenParam = mode === 'portal' ? token : undefined;

  const updateOp = useCallback((id: string, updates: Partial<ReceiptOperation>) => {
    setOperations(prev => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  }, []);

  const removeOp = useCallback((id: string, delayMs = 2000) => {
    setTimeout(() => {
      setOperations(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, delayMs);
  }, []);

  // --- Operations ---

  const uploadReceipt = useCallback(async (
    file: File,
    year: number,
    month: number,
    receiptType: ReceiptType,
    otherCategory?: string,
    otherDescription?: string,
  ) => {
    const opId = slotKey(year, month, receiptType, otherCategory);

    setOperations(prev => ({
      ...prev,
      [opId]: {
        id: opId,
        type: 'upload',
        status: 'pending',
        progress: { loaded: 0, total: file.size, percentage: 0 },
      },
    }));

    try {
      // 1. Validate
      const validation = validateFile(file);
      if (!validation.valid) throw new Error(validation.error || t.errors.invalidFile);

      // 2. Get presigned URL
      const result = await getUploadUrlMutation.mutateAsync({
        token: tokenParam,
        policyId,
        year,
        month,
        receiptType,
        fileName: file.name,
        contentType: file.type,
        fileSize: file.size,
        otherCategory,
        otherDescription,
      });

      if (!result.uploadUrl) throw new Error(t.errors.noUploadUrl);

      // 3. Upload to S3
      await uploadToS3WithProgress(
        result.uploadUrl,
        file,
        file.type,
        (progress: OperationProgress) => updateOp(opId, { progress }),
      );

      // 4. Confirm
      await confirmUploadMutation.mutateAsync({
        token: tokenParam,
        receiptId: result.receiptId,
      });

      updateOp(opId, { status: 'success' });
      toast({ title: t.success.uploaded });
      refetchData();
      removeOp(opId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t.errors.uploadFailed;
      updateOp(opId, { status: 'error', error: msg });
      toast({ title: t.errors.uploadFailed, description: msg, variant: 'destructive' });
      removeOp(opId, 5000);
    }
  }, [tokenParam, policyId, getUploadUrlMutation, confirmUploadMutation, updateOp, removeOp, refetchData, toast]);

  const deleteReceipt = useCallback(async (receiptId: string) => {
    const opId = `delete-${receiptId}`;

    setOperations(prev => ({
      ...prev,
      [opId]: { id: opId, type: 'delete', status: 'pending' },
    }));

    try {
      await deleteReceiptMutation.mutateAsync({ token: tokenParam, receiptId });
      updateOp(opId, { status: 'success' });
      toast({ title: t.success.deleted });
      refetchData();
      removeOp(opId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t.errors.deleteFailed;
      updateOp(opId, { status: 'error', error: msg });
      toast({ title: t.errors.deleteFailed, description: msg, variant: 'destructive' });
      removeOp(opId, 5000);
    }
  }, [tokenParam, deleteReceiptMutation, updateOp, removeOp, refetchData, toast]);

  const downloadReceipt = useCallback(async (receiptId: string) => {
    const opId = `download-${receiptId}`;

    setOperations(prev => ({
      ...prev,
      [opId]: { id: opId, type: 'download', status: 'pending' },
    }));

    try {
      const result = await utils.receipt.getDownloadUrl.fetch({ token: tokenParam, receiptId });
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
        updateOp(opId, { status: 'success' });
        removeOp(opId);
      } else {
        throw new Error(t.errors.noDownloadUrl);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : t.errors.downloadFailed;
      updateOp(opId, { status: 'error', error: msg });
      toast({ title: t.errors.downloadFailed, description: msg, variant: 'destructive' });
      removeOp(opId, 5000);
    }
  }, [tokenParam, utils, updateOp, removeOp, toast]);

  const markNotApplicable = useCallback(async (
    year: number,
    month: number,
    receiptType: ReceiptType,
    note?: string,
  ) => {
    const opId = slotKey(year, month, receiptType);

    setOperations(prev => ({
      ...prev,
      [opId]: { id: opId, type: 'markNA', status: 'pending' },
    }));

    try {
      await markNAMutation.mutateAsync({ token: tokenParam, policyId, year, month, receiptType, note });
      updateOp(opId, { status: 'success' });
      toast({ title: t.success.markedNA });
      refetchData();
      removeOp(opId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t.errors.markNAFailed;
      updateOp(opId, { status: 'error', error: msg });
      toast({ title: t.errors.markNAFailed, description: msg, variant: 'destructive' });
      removeOp(opId, 5000);
    }
  }, [tokenParam, policyId, markNAMutation, updateOp, removeOp, refetchData, toast]);

  const undoNotApplicable = useCallback(async (receiptId: string) => {
    const opId = `undoNA-${receiptId}`;

    setOperations(prev => ({
      ...prev,
      [opId]: { id: opId, type: 'undoNA', status: 'pending' },
    }));

    try {
      await undoNAMutation.mutateAsync({ token: tokenParam, receiptId });
      updateOp(opId, { status: 'success' });
      toast({ title: t.success.undoneNA });
      refetchData();
      removeOp(opId);
    } catch (error) {
      const msg = error instanceof Error ? error.message : t.errors.undoNAFailed;
      updateOp(opId, { status: 'error', error: msg });
      toast({ title: t.errors.undoNAFailed, description: msg, variant: 'destructive' });
      removeOp(opId, 5000);
    }
  }, [tokenParam, undoNAMutation, updateOp, removeOp, refetchData, toast]);

  const getSlotOperation = useCallback((
    year: number,
    month: number,
    receiptType: ReceiptType,
    otherCategory?: string,
  ): ReceiptOperation | undefined => {
    return operations[slotKey(year, month, receiptType, otherCategory)];
  }, [operations]);

  return {
    operations,
    uploadReceipt,
    deleteReceipt,
    downloadReceipt,
    markNotApplicable,
    undoNotApplicable,
    getSlotOperation,
  };
}
