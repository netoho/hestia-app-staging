import { ReceiptType } from '@/prisma/generated/prisma-client/enums';
import {
  DollarSign, Zap, Droplets, Flame, Wifi, Tv, Phone, Wrench, FileText,
} from 'lucide-react';

export const RECEIPT_TYPE_ICONS: Record<ReceiptType, React.ElementType> = {
  RENT: DollarSign,
  ELECTRICITY: Zap,
  WATER: Droplets,
  GAS: Flame,
  INTERNET: Wifi,
  CABLE_TV: Tv,
  PHONE: Phone,
  MAINTENANCE: Wrench,
  OTHER: FileText,
};
