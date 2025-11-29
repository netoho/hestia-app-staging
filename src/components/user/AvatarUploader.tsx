'use client';

import { useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import { Camera, Loader2, Trash2, Upload, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AvatarUploaderProps {
  /** Current avatar URL */
  currentAvatarUrl?: string | null;
  /** User's name for fallback initials */
  userName?: string | null;
  /** Called when avatar is successfully uploaded */
  onUploadComplete?: (avatarUrl: string) => void;
  /** Called when avatar is deleted */
  onDeleteComplete?: () => void;
  /** Onboarding token for auth during onboarding flow */
  token?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show delete button */
  showDelete?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
};

const iconSizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
};

export function AvatarUploader({
  currentAvatarUrl,
  userName,
  onUploadComplete,
  onDeleteComplete,
  token,
  size = 'lg',
  showDelete = true,
  disabled = false,
  className,
}: AvatarUploaderProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    uploadAvatar,
    deleteAvatar,
    status,
    progress,
    error,
    isUploading,
    reset,
  } = useAvatarUpload({
    token,
    onSuccess: (avatarUrl) => {
      toast({
        title: 'Avatar actualizado',
        description: 'Tu foto de perfil ha sido actualizada correctamente',
      });
      setPreviewUrl(null);
      onUploadComplete?.(avatarUrl);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
      setPreviewUrl(null);
    },
  });

  const handleClick = useCallback(() => {
    if (!disabled && !isUploading) {
      fileInputRef.current?.click();
    }
  }, [disabled, isUploading]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    await uploadAvatar(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [uploadAvatar]);

  const handleDelete = useCallback(async () => {
    const success = await deleteAvatar();
    if (success) {
      toast({
        title: 'Avatar eliminado',
        description: 'Tu foto de perfil ha sido eliminada',
      });
      onDeleteComplete?.();
    }
  }, [deleteAvatar, toast, onDeleteComplete]);

  // Get initials for fallback
  const initials = userName
    ? userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  // Determine which image to show
  const displayUrl = previewUrl || currentAvatarUrl;

  return (
    <div className={cn('relative inline-block group', className)}>
      <Avatar
        className={cn(
          sizeClasses[size],
          'border-4 border-muted cursor-pointer transition-all',
          isUploading && 'opacity-50',
          !disabled && 'hover:opacity-80',
          disabled && 'cursor-not-allowed opacity-50'
        )}
        onClick={handleClick}
      >
        {displayUrl ? (
          <AvatarImage asChild src={displayUrl} alt={userName || 'Avatar'}>
            <Image
              src={displayUrl}
              alt={userName || 'Avatar'}
              width={128}
              height={128}
              className="object-cover"
            />
          </AvatarImage>
        ) : null}
        <AvatarFallback className="text-2xl bg-muted">{initials}</AvatarFallback>
      </Avatar>

      {/* Upload overlay */}
      <div
        className={cn(
          'absolute inset-0 flex items-center justify-center rounded-full pointer-events-none',
          'transition-opacity',
          isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        <div className="bg-black/50 rounded-full w-full h-full flex items-center justify-center">
          {isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className={cn(iconSizeClasses[size], 'text-white animate-spin')} />
              {progress && (
                <span className="text-white text-xs mt-1">{progress.percentage}%</span>
              )}
            </div>
          ) : status === 'success' ? (
            <Check className={cn(iconSizeClasses[size], 'text-green-400')} />
          ) : status === 'error' ? (
            <X className={cn(iconSizeClasses[size], 'text-red-400')} />
          ) : (
            <Camera className={cn(iconSizeClasses[size], 'text-white')} />
          )}
        </div>
      </div>

      {/* Upload button for accessibility */}
      <label
        htmlFor="avatar-upload"
        className={cn(
          'absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2',
          'cursor-pointer hover:bg-primary/90 transition-colors',
          'shadow-lg',
          (disabled || isUploading) && 'pointer-events-none opacity-50'
        )}
      >
        <Upload className="h-4 w-4" />
      </label>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        id="avatar-upload"
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Delete button */}
      {showDelete && currentAvatarUrl && !isUploading && (
        <Button
          variant="destructive"
          size="icon"
          className="absolute -bottom-2 -left-2 h-8 w-8 rounded-full shadow-lg"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={disabled || isUploading}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}

      {/* Error message */}
      {error && status === 'error' && (
        <p className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-destructive whitespace-nowrap">
          {error}
        </p>
      )}
    </div>
  );
}
