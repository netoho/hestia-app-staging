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
  DialogTrigger,
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
import { Plus, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

const policyInitiateSchema = z.object({
  tenantEmail: z.string().email('Invalid email address'),
  tenantPhone: z.string().optional(),
  tenantName: z.string().optional(),
  propertyId: z.string().optional(),
  propertyAddress: z.string().optional(),
});

type PolicyInitiateFormValues = z.infer<typeof policyInitiateSchema>;

interface PolicyInitiateDialogProps {
  onPolicyCreated?: () => void;
}

export function PolicyInitiateDialog({ onPolicyCreated }: PolicyInitiateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { token } = useAuth();

  const form = useForm<PolicyInitiateFormValues>({
    resolver: zodResolver(policyInitiateSchema),
    defaultValues: {
      tenantEmail: '',
      tenantPhone: '',
      tenantName: '',
      propertyId: '',
      propertyAddress: '',
    },
  });

  const onSubmit = async (values: PolicyInitiateFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/policies/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initiate policy');
      }

      const result = await response.json();

      toast({
        title: 'Policy Initiated Successfully',
        description: result.emailSent 
          ? `Invitation sent to ${values.tenantEmail}` 
          : `Policy created but email failed. Please resend manually.`,
        variant: result.emailSent ? 'default' : 'destructive',
      });

      form.reset();
      setOpen(false);
      onPolicyCreated?.();
    } catch (error) {
      console.error('Policy initiation error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to initiate policy',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Initiate Policy
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Initiate New Policy Application</DialogTitle>
          <DialogDescription>
            Create a new policy application and send an invitation email to the tenant.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tenantEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant Email *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="tenant@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tenantPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tenant Phone</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tenantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tenant Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Full name (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">Property Information (Optional)</h3>
              
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property ID</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Internal property reference"
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
                    <FormLabel>Property Address</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="123 Main St, City, State, ZIP"
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Create & Send Invitation
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