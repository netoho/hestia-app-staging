import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { isDemoMode, DemoORM } from '@/lib/services/demoDatabase';
import prisma from '@/lib/prisma';

// Conditionally import PrismaAdapter
let adapter: any;
if (!isDemoMode() && prisma) {
  const { PrismaAdapter } = require('@auth/prisma-adapter');
  adapter = PrismaAdapter(prisma);
}

export const authOptions: AuthOptions = {
  // Only use PrismaAdapter in production mode
  ...(adapter ? { adapter } : {}),
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
        
        let user;
        
        if (isDemoMode()) {
          // Use demo database
          user = await DemoORM.findUniqueUser({ email: credentials.email });
        } else {
          // Use real database
          user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });
        }
        
        if (!user || !user.password) {
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
    // GoogleProvider can be added here later
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // })
  ],
  session: {
    strategy: 'jwt', // JWT sessions work perfectly in demo mode
    maxAge: isDemoMode() ? 24 * 60 * 60 : 30 * 24 * 60 * 60, // 1 day in demo, 30 days in production
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role; // Add role to the JWT token
      }
      return token;
    },
    async session({ session, token }) {
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
  // secret: process.env.NEXTAUTH_SECRET,
  secret: "generate-strong-secret-here",
};
