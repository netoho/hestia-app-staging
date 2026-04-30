import { Factory } from 'fishery';
import bcrypt from 'bcryptjs';
import { UserRole } from '@/prisma/generated/prisma-client/enums';
import type { User } from '@/prisma/generated/prisma-client/client';
import { prisma } from '../../utils/database';

type UserTransient = { plainPassword?: string };

export const userFactory = Factory.define<User, UserTransient>(({ sequence, transientParams, onCreate }) => {
  onCreate(async (user) => prisma.user.create({ data: user }));

  const plain = transientParams.plainPassword;

  return {
    id: undefined as unknown as string,
    name: `Test User ${sequence}`,
    email: `user-${sequence}-${Date.now()}@hestia.test`,
    emailVerified: null,
    avatarUrl: null,
    password: plain ? bcrypt.hashSync(plain, 10) : null,
    role: UserRole.STAFF,
    phone: null,
    address: null,
    isActive: true,
    internalId: undefined as unknown as number,
    invitationToken: null,
    invitationTokenExpiry: null,
    passwordSetAt: null,
    resetToken: null,
    resetTokenExpiry: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;
});

export const adminUser = userFactory.params({ role: UserRole.ADMIN });
export const staffUser = userFactory.params({ role: UserRole.STAFF });
export const brokerUser = userFactory.params({ role: UserRole.BROKER });
