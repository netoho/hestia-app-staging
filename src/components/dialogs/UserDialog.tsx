'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { User } from '@/lib/types';

const userSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['broker', 'tenant', 'landlord', 'staff']),
  password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user?: User | null;
  onSuccess: () => void;
  authToken?: string;
}

export function UserDialog({ open, onOpenChange, user, onSuccess, authToken }: UserDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      role: (user?.role as any) || 'tenant',
      password: '',
    },
  });

  const isEditMode = !!user;

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const url = isEditMode ? `/api/staff/users/${user.id}` : '/api/auth/register';
      const method = isEditMode ? 'PUT' : 'POST';
      
      // For edit mode, only send password if it's provided
      const payload = isEditMode 
        ? { ...data, password: data.password || undefined }
        : { ...data, password: data.password || 'password123' };

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add auth token for staff endpoints
      if (isEditMode && authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save user');
      }

      onSuccess();
      onOpenChange(false);
      form.reset();
      setShowPasswordReset(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user) return;
    
    const newPassword = form.getValues('password');
    if (!newPassword || newPassword.length < 6) {
      form.setError('password', { message: 'Password must be at least 6 characters' });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/staff/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset password');
      }

      setShowPasswordReset(false);
      form.setValue('password', '');
      setError('Password reset successfully!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit User' : 'Create New User'}</DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? 'Update user information or reset their password.'
              : 'Add a new user to the system.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant={error.includes('successfully') ? 'default' : 'destructive'}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="john@example.com" 
                      {...field} 
                      disabled={isEditMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tenant">Tenant</SelectItem>
                      <SelectItem value="landlord">Landlord</SelectItem>
                      <SelectItem value="broker">Broker</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isEditMode && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password (optional)</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder="Leave blank for default (password123)" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isEditMode && (
              <>
                <Separator className="my-4" />
                
                {!showPasswordReset ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowPasswordReset(true)}
                  >
                    Reset Password
                  </Button>
                ) : (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input 
                              type="password" 
                              placeholder="Enter new password" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowPasswordReset(false);
                          form.setValue('password', '');
                        }}
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handlePasswordReset}
                        disabled={isLoading}
                      >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reset Password
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || showPasswordReset}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Update User' : 'Create User'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}