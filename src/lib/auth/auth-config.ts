import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

// Import PrismaAdapter
const { PrismaAdapter } = require('@auth/prisma-adapter');
const adapter = PrismaAdapter(prisma);

/** How stale a JWT's isActive/role may get before a DB re-check (#164). */
export const SESSION_REVALIDATE_MS = 5 * 60 * 1000;

export const authOptions: AuthOptions = {
  // Use PrismaAdapter
  adapter,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        // Deactivated accounts fail exactly like unknown ones (#164) —
        // authorize must not disclose account existence or state.
        if (!user || !user.password || !user.isActive) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      }
    }),
  ],
  session: {
    strategy: 'jwt', // JWT sessions work perfectly in demo mode
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role; // Add role to the JWT token
        token.revalidatedAt = Date.now();
        delete (token as Record<string, unknown>).invalidated;
        return token;
      }
      // The 30-day JWT embeds the role, so deactivation and role changes
      // would otherwise ride until expiry (#164). Re-validate against the
      // DB at most every REVALIDATE_MS; a reactivated user self-heals on
      // the next window.
      const last = (token.revalidatedAt as number | undefined) ?? 0;
      if (Date.now() - last > SESSION_REVALIDATE_MS) {
        const dbUser = token.id
          ? await prisma.user.findUnique({
              where: { id: token.id as string },
              select: { isActive: true, role: true },
            })
          : null;
        token.revalidatedAt = Date.now();
        if (!dbUser?.isActive) {
          (token as Record<string, unknown>).invalidated = true;
        } else {
          delete (token as Record<string, unknown>).invalidated;
          token.role = dbUser.role; // role changes propagate with the same cadence
        }
      }
      return token;
    },
    async session({ session, token }) {
      // A token flagged by the revalidation window yields NO session —
      // every protectedProcedure and page guard rejects immediately.
      if ((token as Record<string, unknown>).invalidated) {
        return null as unknown as typeof session;
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string; // Add role to the session
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
