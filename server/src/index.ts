import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createUserInputSchema,
  createAffiliateInputSchema,
  updateAffiliateStatusInputSchema,
  createProgramInputSchema,
  createStudentRegistrationInputSchema,
  updateRegistrationStatusInputSchema,
  getAffiliateStatsInputSchema,
  createCommissionPayoutInputSchema,
  updatePayoutStatusInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { createAffiliate } from './handlers/create_affiliate';
import { updateAffiliateStatus } from './handlers/update_affiliate_status';
import { getAffiliates } from './handlers/get_affiliates';
import { getAffiliateByReferralCode } from './handlers/get_affiliate_by_referral_code';
import { createProgram } from './handlers/create_program';
import { getPrograms } from './handlers/get_programs';
import { createStudentRegistration } from './handlers/create_student_registration';
import { updateRegistrationStatus } from './handlers/update_registration_status';
import { getRegistrations } from './handlers/get_registrations';
import { getAffiliateStats } from './handlers/get_affiliate_stats';
import { createCommissionPayout } from './handlers/create_commission_payout';
import { updatePayoutStatus } from './handlers/update_payout_status';
import { getCommissionPayouts } from './handlers/get_commission_payouts';
import { getUserByEmail } from './handlers/get_user_by_email';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'English Booster Affiliate System'
    };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),
  
  getUserByEmail: publicProcedure
    .input(z.string().email())
    .query(({ input }) => getUserByEmail(input)),

  // Affiliate management
  createAffiliate: publicProcedure
    .input(createAffiliateInputSchema)
    .mutation(({ input }) => createAffiliate(input)),
  
  updateAffiliateStatus: publicProcedure
    .input(updateAffiliateStatusInputSchema)
    .mutation(({ input }) => updateAffiliateStatus(input)),
  
  getAffiliates: publicProcedure
    .query(() => getAffiliates()),
  
  getAffiliateByReferralCode: publicProcedure
    .input(z.string())
    .query(({ input }) => getAffiliateByReferralCode(input)),

  // Program management
  createProgram: publicProcedure
    .input(createProgramInputSchema)
    .mutation(({ input }) => createProgram(input)),
  
  getPrograms: publicProcedure
    .query(() => getPrograms()),

  // Student registration management
  createStudentRegistration: publicProcedure
    .input(createStudentRegistrationInputSchema)
    .mutation(({ input }) => createStudentRegistration(input)),
  
  updateRegistrationStatus: publicProcedure
    .input(updateRegistrationStatusInputSchema)
    .mutation(({ input }) => updateRegistrationStatus(input)),
  
  getRegistrations: publicProcedure
    .input(z.number().optional())
    .query(({ input }) => getRegistrations(input)),

  // Affiliate statistics
  getAffiliateStats: publicProcedure
    .input(getAffiliateStatsInputSchema)
    .query(({ input }) => getAffiliateStats(input)),

  // Commission payout management
  createCommissionPayout: publicProcedure
    .input(createCommissionPayoutInputSchema)
    .mutation(({ input }) => createCommissionPayout(input)),
  
  updatePayoutStatus: publicProcedure
    .input(updatePayoutStatusInputSchema)
    .mutation(({ input }) => updatePayoutStatus(input)),
  
  getCommissionPayouts: publicProcedure
    .input(z.number().optional())
    .query(({ input }) => getCommissionPayouts(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors({
        origin: ['http://localhost:3000', 'http://localhost:5173'], // Common frontend ports
        credentials: true,
      })(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  
  server.listen(port);
  console.log(`🚀 English Booster Affiliate System TRPC server listening at port: ${port}`);
  console.log(`📧 Contact: 082231050500`);
  console.log(`🌐 Website: englishbooster.id`);
  console.log(`📍 Address: Jl. Asparaga No.100 Tegalsari, Tulungrejo, Pare, Kediri`);
}

start();