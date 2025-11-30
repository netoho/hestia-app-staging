import prisma from "@/lib/prisma";
import { PolicyActivity } from "@/prisma/generated/prisma-client/client";

export const addPolicyActivity = async (
  policyId: string,
  action: string,
  performedBy?: string,
  details?: any,
  ipAddress?: string
): Promise<PolicyActivity | null> => {
  return prisma.policyActivity.create({
    data: {
      policyId,
      action,
      description: action,
      details,
      performedById: performedBy,
      ipAddress
    }
  });
};

