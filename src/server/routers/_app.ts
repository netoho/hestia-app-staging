import { createTRPCRouter } from '@/server/trpc';
import { policyRouter } from './policy.router';
import { actorRouter } from './actor.router';
import { pricingRouter } from './pricing.router';
import { packageRouter } from './package.router';
import { paymentRouter } from './payment.router';
import { investigationRouter } from './investigation.router';
import { contractRouter } from './contract.router';
import { documentRouter } from './document.router';
import { userRouter } from './user.router';
import { reviewRouter } from './review.router';
import { staffRouter } from './staff.router';
import { onboardRouter } from './onboard.router';
import { addressRouter } from './address.router';

/**
 * Main app router
 * All routers are combined here
 */
export const appRouter = createTRPCRouter({
  policy: policyRouter,
  actor: actorRouter,
  pricing: pricingRouter,
  package: packageRouter,
  payment: paymentRouter,
  investigation: investigationRouter,
  contract: contractRouter,
  document: documentRouter,
  user: userRouter,
  review: reviewRouter,
  staff: staffRouter,
  onboard: onboardRouter,
  address: addressRouter,
});

// Export type for use in client
export type AppRouter = typeof appRouter;