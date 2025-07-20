
'use client';

import { useState, useEffect } from 'react';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Send, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { t } from '@/lib/i18n';

const policyInitiateSchema = z.object({
  tenantEmail: z.string().email('Invalid email address'),
  tenantPhone: z.string().optional(),
  tenantName: z.string().optional(),
  propertyId: z.string().optional(),
  propertyAddress: z.string().optional(),
  packageId: z.string().min(1, 'Please select a package'),
  price: z.coerce.number().min(0, 'Price must be a positive number'),
});

type PolicyInitiateFormValues = z.infer<typeof policyInitiateSchema>;

interface PolicyInitiateDialogProps {
  onPolicyCreated?: () => void;
}

export function PolicyInitiateDialog({ onPolicyCreated }: PolicyInitiateDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const { toast } = useToast();

  const form = useForm<PolicyInitiateFormValues>({
    resolver: zodResolver(policyInitiateSchema),
    defaultValues: {
      tenantEmail: '',
      tenantPhone: '',
      tenantName: '',
      propertyId: '',
      propertyAddress: '',
      packageId: '',
      price: 0,
    },
  });

  // Fetch packages when dialog opens
  useEffect(() => {
    if (open) {
      fetchPackages();
    }
  }, [open]);

  // Update price when package selection changes
  const selectedPackageId = form.watch('packageId');
  useEffect(() => {
    if (selectedPackageId && packages.length > 0) {
      const selectedPackage = packages.find(p => p.id === selectedPackageId);
      if (selectedPackage) {
        form.setValue('price', selectedPackage.price);
      }
    }
  }, [selectedPackageId, packages, form]);

  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const response = await fetch('/api/packages');
      if (response.ok) {
        const data = await response.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error);
      toast({
        title: t.misc.error,
        description: t.pages.policies.initiateDialog.errors.failedToLoadPackages,
        variant: 'destructive',
      });
    } finally {
      setLoadingPackages(false);
    }
  };

  const onSubmit = async (values: PolicyInitiateFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/policies/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t.pages.policies.initiateDialog.errors.failedToInitiate);
      }

      const result = await response.json();

      toast({
        title: t.pages.policies.initiateDialog.success.title,
        description: result.emailSent 
          ? t.pages.policies.initiateDialog.success.descriptionSent(values.tenantEmail)
          : t.pages.policies.initiateDialog.success.descriptionFailed,
        variant: result.emailSent ? 'default' : 'destructive',
      });

      form.reset();
      setOpen(false);
      onPolicyCreated?.();
    } catch (error) {
      console.error('Policy initiation error:', error);
      toast({
        title: t.misc.error,
        description: error instanceof Error ? error.message : t.pages.policies.initiateDialog.errors.failedToInitiate,
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
          {t.pages.policies.initiateDialog.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t.pages.policies.initiateDialog.title}</DialogTitle>
          <DialogDescription>
            {t.pages.policies.initiateDialog.description}
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
                    <FormLabel>{t.pages.policies.initiateDialog.form.tenantEmailLabel} *</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder={t.pages.policies.initiateDialog.form.tenantEmailPlaceholder}
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
                    <FormLabel>{t.pages.policies.initiateDialog.form.tenantPhoneLabel}</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder={t.pages.policies.initiateDialog.form.tenantPhonePlaceholder}
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
                  <FormLabel>{t.pages.policies.initiateDialog.form.tenantNameLabel}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.pages.policies.initiateDialog.form.tenantNamePlaceholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">{t.pages.policies.initiateDialog.form.propertyInfoTitle}</h3>
              
              <FormField
                control={form.control}
                name="propertyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.pages.policies.initiateDialog.form.propertyIdLabel}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t.pages.policies.initiateDialog.form.propertyIdPlaceholder}
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
                    <FormLabel>{t.pages.policies.initiateDialog.form.propertyAddressLabel}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t.pages.policies.initiateDialog.form.propertyAddressPlaceholder}
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

            <div className="space-y-4">
              <h3 className="text-sm font-medium text-foreground">{t.pages.policies.initiateDialog.form.paymentInfoTitle}</h3>
              
              <FormField
                control={form.control}
                name="packageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.pages.policies.initiateDialog.form.packageLabel} *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loadingPackages}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={loadingPackages ? t.pages.policies.initiateDialog.form.loadingPackages : t.pages.policies.initiateDialog.form.selectPackagePlaceholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {packages.map((pkg) => (
                          <SelectItem key={pkg.id} value={pkg.id}>
                            {pkg.name} - ${pkg.price} MXN
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t.pages.policies.initiateDialog.form.packageDescription}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t.pages.policies.initiateDialog.form.priceLabel} *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t.pages.policies.initiateDialog.form.pricePlaceholder}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      {t.pages.policies.initiateDialog.form.priceDescription}
                    </FormDescription>
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
                {t.actions.cancel}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t.pages.policies.initiateDialog.form.creatingButton}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {t.pages.policies.initiateDialog.form.createButton}
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
