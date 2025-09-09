'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PolicyStatus, PolicyStatusType } from '@/lib/prisma-types';

const resendInvitationSchema = z.object({
  tenantName: z.string().optional(),
  propertyAddress: z.string().optional(),
  customMessage: z.string().optional(),
});

type ResendInvitationFormValues = z.infer<typeof resendInvitationSchema>;

interface ResendInvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  policy: {
    id: string;
    tenantEmail: string;
    status: PolicyStatusType;
  };
  onSuccess?: () => void;
}

export function ResendInvitationDialog({
  isOpen,
  onClose,
  policy,
  onSuccess
}: ResendInvitationDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<ResendInvitationFormValues>({
    resolver: zodResolver(resendInvitationSchema),
    defaultValues: {
      tenantName: '',
      propertyAddress: '',
      customMessage: '',
    },
  });

  const onSubmit = async (values: ResendInvitationFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/policies/${policy.id}/resend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resend invitation');
      }

      toast({
        title: 'Invitation Resent Successfully',
        description: `New invitation email sent to ${policy.tenantEmail}`,
      });

      form.reset();
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to resend invitation',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusText = (status: PolicyStatusType) => {
    switch (status) {
      case PolicyStatus.DRAFT:
        return 'not yet sent';
      case PolicyStatus.SENT_TO_TENANT:
        return 'sent but not opened';
      case PolicyStatus.IN_PROGRESS:
        return 'in progress';
      default:
        return 'unknown';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Resend Policy Invitation
          </DialogTitle>
          <DialogDescription>
            Send a new invitation email to <strong>{policy.tenantEmail}</strong>
            <br />
            <span className="text-sm text-muted-foreground">
              Current status: {getStatusText(policy.status)}
            </span>
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="tenantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant Name (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. John Smith"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="propertyAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Address (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. 123 Main St, City, State"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add a personal note to include in the email..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Resend Invitation
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
