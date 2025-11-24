import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/_app';

/**
 * Create tRPC React hooks
 * This creates all the hooks we'll use in components
 */
export const trpc = createTRPCReact<AppRouter>();

/**
 * Inference helpers for input/output types
 * Example usage:
 * type PolicyInput = RouterInputs['policy']['create'];
 * type PolicyOutput = RouterOutputs['policy']['getById'];
 */
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

export type RouterInputs = inferRouterInputs<AppRouter>;
export type RouterOutputs = inferRouterOutputs<AppRouter>;