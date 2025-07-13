# Hestia App Implementation Plan

## Executive Summary

**Hestia (HestiaGuard)** is a rental property guarantee and insurance platform for the Mexican market that acts as a trusted intermediary between landlords and tenants by providing rental guarantee policies. This document outlines the current state analysis, identified blind spots, and a comprehensive implementation plan to address critical issues and enhance the platform.

## Current State Analysis

### Purpose and Target Audience

**Hestia** is designed to create trust in the Mexican rental market by providing guarantee and insurance policies. The platform serves:

1. **Property Owners (Propietarios)** - Landlords seeking protection for their rental properties
2. **Tenants/Renters (Inquilinos)** - People looking to rent properties who need guarantee policies
3. **Real Estate Advisors (Asesores Inmobiliarios)** - Brokers and agents who facilitate rental transactions
4. **Staff/Admin** - Internal team managing the platform

### Core Features and Workflows

#### 1. **Policy Application Workflow**
- Staff initiates policy applications by sending invitations to prospective tenants
- Tenants complete a multi-step application wizard including:
  - Profile information (nationality, CURP/passport)
  - Employment details and income verification
  - Personal and professional references
  - Document uploads (ID, income proofs)
- Applications progress through statuses: Draft → Sent → In Progress → Submitted → Under Review → Approved/Denied

#### 2. **Service Packages**
Dynamic insurance/guarantee packages with varying coverage levels and pricing

#### 3. **Role-Based Dashboards**
- **Owners**: View active policies, insured rent totals, create policy requests
- **Renters**: Access policy details, update profile
- **Staff/Admin**: Manage users, review policies, configure packages

#### 4. **Technical Infrastructure**
- **Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS
- **Backend**: PostgreSQL (Supabase), Prisma ORM
- **Authentication**: JWT-based with bcrypt
- **Storage**: Firebase Storage
- **Email**: Resend/Mailgun providers

## Critical Issues and Implementation Plan

### Phase 1: Critical Security Fixes (Week 1-2)
**Priority: URGENT - Must complete before any other work**

#### 1.1 Credential Security
**Issue**: Exposed Firebase service account, database credentials, and API keys

**Implementation Steps:**
```bash
# 1. Remove exposed credentials
git rm hestiaguard-e81fbc59755e.json
git rm -r --cached .env .env.local

# 2. Update .gitignore
echo "*.json" >> .gitignore
echo ".env*" >> .gitignore
echo "!.env.example" >> .gitignore

# 3. Create .env.example template
cat > .env.example << EOF
# Database
DATABASE_URL="postgresql://user:password@host:port/db"

# Authentication
JWT_SECRET="generate-strong-secret-here"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-strong-secret-here"

# Email Provider (resend or mailgun)
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_xxxxx"
MAILGUN_API_KEY="key-xxxxx"
MAILGUN_DOMAIN="mg.yourdomain.com"
EMAIL_FROM="noreply@yourdomain.com"

# Firebase
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_STORAGE_BUCKET="your-bucket.appspot.com"
# Use environment variable for service account JSON
GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
EOF
```

**Action Items:**
- [ ] Revoke all exposed credentials immediately
- [ ] Generate new Firebase service account
- [ ] Create new Supabase database or rotate password
- [ ] Generate new API keys for Resend/Mailgun
- [ ] Use strong JWT secret (min 32 characters)
- [ ] Implement secret management (e.g., Google Secret Manager)
- [ ] Add pre-commit hooks to prevent credential commits

#### 1.2 Authentication System
**Issue**: Using mock authentication, weak JWT implementation

**Implementation:**
```typescript
// src/lib/auth/auth-config.ts
import { AuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const authOptions: AuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });
        
        if (!user || !await bcrypt.compare(credentials.password, user.password)) {
          return null;
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        };
      }
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    }
  }
};
```

**Action Items:**
- [ ] Install and configure NextAuth.js
- [ ] Implement password reset flow with email verification
- [ ] Add 2FA support using TOTP
- [ ] Implement session management and proper logout
- [ ] Add rate limiting for auth endpoints
- [ ] Create account lockout after failed attempts

### Phase 2: Core Feature Implementation (Week 3-4)

#### 2.1 Payment Integration
**Issue**: No payment processing for policy premiums

**Implementation with Stripe:**
```typescript
// src/lib/services/paymentService.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

export class PaymentService {
  async createPaymentIntent(policyId: string, amount: number) {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: 'mxn',
      metadata: { policyId },
      automatic_payment_methods: {
        enabled: true,
      },
    });
    
    return paymentIntent;
  }
  
  async createSubscription(customerId: string, priceId: string) {
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    
    return subscription;
  }
}
```

**Action Items:**
- [ ] Integrate Stripe or MercadoPago for Mexican market
- [ ] Create payment flows for one-time and recurring payments
- [ ] Implement invoice generation
- [ ] Add payment status tracking to policies
- [ ] Create payment confirmation emails
- [ ] Add refund functionality

#### 2.2 Policy Document Generation
**Issue**: No automated policy document generation

**Implementation:**
```typescript
// src/lib/services/documentService.ts
import PDFDocument from 'pdfkit';
import { Policy } from '@prisma/client';

export class DocumentService {
  async generatePolicyDocument(policy: Policy) {
    const doc = new PDFDocument();
    
    // Header
    doc.fontSize(20).text('PÓLIZA DE GARANTÍA DE ARRENDAMIENTO', 50, 50);
    doc.fontSize(12).text(`Póliza No: ${policy.policyNumber}`, 50, 100);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 50, 120);
    
    // Policy details
    doc.text(`Arrendatario: ${policy.tenantName}`, 50, 160);
    doc.text(`Propiedad: ${policy.propertyAddress}`, 50, 180);
    doc.text(`Monto Garantizado: $${policy.guaranteeAmount} MXN`, 50, 200);
    
    // Terms and conditions
    doc.addPage();
    doc.text('TÉRMINOS Y CONDICIONES', 50, 50);
    // Add full terms...
    
    return doc;
  }
}
```

**Action Items:**
- [ ] Create PDF generation service
- [ ] Design professional policy templates
- [ ] Add digital signature integration
- [ ] Implement version control for documents
- [ ] Create document storage and retrieval system
- [ ] Add email delivery of signed documents

### Phase 3: Business Features (Week 5-6)

#### 3.1 Analytics Dashboard
**Issue**: No business intelligence or analytics

**Implementation:**
```typescript
// src/components/dashboard/AnalyticsDashboard.tsx
export function AnalyticsDashboard() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Pólizas Activas"
        value={activePolices}
        change="+12%"
        icon={<FileText />}
      />
      <MetricCard
        title="Ingresos Mensuales"
        value={formatCurrency(monthlyRevenue)}
        change="+8%"
        icon={<DollarSign />}
      />
      <MetricCard
        title="Tasa de Aprobación"
        value={`${approvalRate}%`}
        change="+3%"
        icon={<CheckCircle />}
      />
      <MetricCard
        title="Tiempo de Procesamiento"
        value={`${avgProcessingTime} días`}
        change="-15%"
        icon={<Clock />}
      />
    </div>
  );
}
```

**Action Items:**
- [ ] Create analytics service for KPI calculation
- [ ] Build executive dashboard with key metrics
- [ ] Add revenue tracking and projections
- [ ] Implement conversion funnel analysis
- [ ] Create automated reports (daily/weekly/monthly)
- [ ] Add export functionality for reports

#### 3.2 Notification System
**Issue**: Limited to email notifications only

**Implementation:**
```typescript
// src/lib/services/notificationService.ts
export class NotificationService {
  async sendNotification(userId: string, notification: {
    type: 'email' | 'sms' | 'push' | 'in-app';
    title: string;
    message: string;
    actionUrl?: string;
  }) {
    // Store in-app notification
    await prisma.notification.create({
      data: {
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl,
        read: false,
      }
    });
    
    // Send based on type and user preferences
    switch (notification.type) {
      case 'email':
        await this.emailService.send(notification);
        break;
      case 'sms':
        await this.smsService.send(notification);
        break;
      case 'push':
        await this.pushService.send(notification);
        break;
    }
  }
}
```

**Action Items:**
- [ ] Create unified notification service
- [ ] Add SMS integration (Twilio/MessageBird)
- [ ] Implement push notifications
- [ ] Create notification preferences UI
- [ ] Add notification center in app
- [ ] Implement notification templates

### Phase 4: Compliance & Operations (Week 7-8)

#### 4.1 Compliance Features
**Issue**: Missing compliance and legal features

**Implementation:**
```typescript
// src/lib/services/complianceService.ts
export class ComplianceService {
  async logActivity(activity: {
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata?: any;
  }) {
    await prisma.auditLog.create({
      data: {
        ...activity,
        ipAddress: await this.getIpAddress(),
        userAgent: await this.getUserAgent(),
        timestamp: new Date(),
      }
    });
  }
  
  async enforceDataRetention() {
    // Delete data older than retention period
    const retentionDate = new Date();
    retentionDate.setFullYear(retentionDate.getFullYear() - 7);
    
    await prisma.policy.updateMany({
      where: {
        createdAt: { lt: retentionDate },
        status: 'archived'
      },
      data: { personalData: null }
    });
  }
}
```

**Action Items:**
- [ ] Implement comprehensive audit logging
- [ ] Create privacy policy acceptance flow
- [ ] Add GDPR/data protection compliance
- [ ] Implement data retention policies
- [ ] Create compliance reports
- [ ] Add terms of service versioning

#### 4.2 Support System
**Issue**: No customer support infrastructure

**Implementation:**
```typescript
// src/lib/services/supportService.ts
export class SupportService {
  async createTicket(ticket: {
    userId: string;
    subject: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: string;
  }) {
    const newTicket = await prisma.supportTicket.create({
      data: {
        ...ticket,
        status: 'open',
        ticketNumber: await this.generateTicketNumber(),
      }
    });
    
    // Assign to agent based on category and workload
    await this.assignToAgent(newTicket);
    
    return newTicket;
  }
}
```

**Action Items:**
- [ ] Create ticket management system
- [ ] Add live chat integration
- [ ] Implement knowledge base
- [ ] Create FAQ section
- [ ] Add ticket routing and escalation
- [ ] Build agent dashboard

### Phase 5: Performance & Scalability (Week 9-10)

#### 5.1 Performance Optimization
**Issue**: No caching or performance optimization

**Implementation:**
```typescript
// src/lib/cache/redis-client.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!,
});

export class CacheService {
  async get<T>(key: string): Promise<T | null> {
    return await redis.get(key);
  }
  
  async set(key: string, value: any, ttl?: number) {
    if (ttl) {
      await redis.setex(key, ttl, value);
    } else {
      await redis.set(key, value);
    }
  }
  
  async invalidate(pattern: string) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

**Action Items:**
- [ ] Implement Redis caching layer
- [ ] Add CDN for static assets
- [ ] Optimize database queries with indexes
- [ ] Implement request/response caching
- [ ] Add performance monitoring (New Relic/DataDog)
- [ ] Create load testing suite

#### 5.2 Background Jobs
**Issue**: No background job processing

**Implementation:**
```typescript
// src/lib/queue/job-processor.ts
import { Queue, Worker } from 'bullmq';

const policyQueue = new Queue('policy-processing', {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});

const worker = new Worker('policy-processing', async (job) => {
  switch (job.name) {
    case 'process-application':
      await processApplication(job.data);
      break;
    case 'send-reminder':
      await sendReminder(job.data);
      break;
    case 'generate-report':
      await generateReport(job.data);
      break;
  }
}, {
  connection: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
});
```

**Action Items:**
- [ ] Set up BullMQ for job processing
- [ ] Create job workers for heavy tasks
- [ ] Implement retry logic and error handling
- [ ] Add job monitoring dashboard
- [ ] Create scheduled jobs for maintenance
- [ ] Implement job prioritization

## Testing Strategy

### Unit Tests
```typescript
// src/__tests__/services/policyService.test.ts
describe('PolicyService', () => {
  it('should create a new policy', async () => {
    const policy = await policyService.create({
      tenantName: 'John Doe',
      propertyAddress: '123 Main St',
      monthlyRent: 10000,
    });
    
    expect(policy).toHaveProperty('id');
    expect(policy.status).toBe('draft');
  });
});
```

### Integration Tests
```typescript
// src/__tests__/api/policies.test.ts
describe('POST /api/policies', () => {
  it('should create policy and send invitation', async () => {
    const response = await request(app)
      .post('/api/policies')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tenantEmail: 'tenant@example.com',
        propertyId: 'prop-123',
      });
      
    expect(response.status).toBe(201);
    expect(mockEmailService.send).toHaveBeenCalled();
  });
});
```

### E2E Tests
```typescript
// e2e/policy-application.spec.ts
test('complete policy application flow', async ({ page }) => {
  // Navigate to application
  await page.goto('/policy/test-token');
  
  // Fill profile form
  await page.fill('[name="nationality"]', 'Mexicana');
  await page.fill('[name="curp"]', 'CURP123456789');
  await page.click('button:has-text("Siguiente")');
  
  // Continue through all steps...
  
  // Submit application
  await page.click('button:has-text("Enviar Solicitud")');
  await expect(page.locator('text=Solicitud enviada')).toBeVisible();
});
```

## Deployment Strategy

### Infrastructure Setup
```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
    depends_on:
      - db
      - redis
      
  db:
    image: postgres:15
    environment:
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [main]
    
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          npm ci
          npm run test
          npm run test:e2e
          
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy hestia-app \
            --image gcr.io/$PROJECT_ID/hestia-app \
            --platform managed \
            --region us-central1
```

## Monitoring & Maintenance

### Monitoring Setup
- **Application Performance**: New Relic or DataDog
- **Error Tracking**: Sentry
- **Uptime Monitoring**: UptimeRobot or Pingdom
- **Log Aggregation**: LogDNA or Papertrail
- **Analytics**: Google Analytics + Mixpanel

### Maintenance Tasks
- Daily: Review error logs, check system health
- Weekly: Database backups, security updates
- Monthly: Performance analysis, cost optimization
- Quarterly: Security audit, dependency updates

## Success Metrics

### Technical KPIs
- Page load time < 2 seconds
- API response time < 200ms
- 99.9% uptime
- Zero critical security vulnerabilities
- Test coverage > 80%

### Business KPIs
- Policy approval rate > 70%
- Average processing time < 48 hours
- Customer satisfaction > 4.5/5
- Monthly recurring revenue growth > 10%
- Churn rate < 5%

## Timeline Summary

**Total Duration**: 10 weeks

1. **Weeks 1-2**: Critical Security Fixes
2. **Weeks 3-4**: Core Feature Implementation
3. **Weeks 5-6**: Business Features
4. **Weeks 7-8**: Compliance & Operations
5. **Weeks 9-10**: Performance & Scalability

## Budget Estimate

### Development Costs
- Senior Developer (10 weeks): $40,000
- Mid-level Developer (10 weeks): $25,000
- UI/UX Designer (4 weeks): $10,000
- QA Engineer (6 weeks): $12,000
- **Total Development**: $87,000

### Infrastructure Costs (Monthly)
- Cloud Hosting (GCP/AWS): $500
- Database (Supabase): $25
- Redis Cache: $100
- CDN: $50
- Monitoring Tools: $200
- Email Service: $100
- **Total Monthly**: $975

### Third-party Services (Annual)
- Stripe Processing: 2.9% + $0.30 per transaction
- SSL Certificate: $200
- Domain & DNS: $50
- Security Audit: $5,000
- **Total Annual**: $5,250 + transaction fees

## Risk Mitigation

### Technical Risks
- **Data Loss**: Implement automated backups, disaster recovery plan
- **Security Breach**: Regular security audits, penetration testing
- **Scalability Issues**: Load testing, auto-scaling infrastructure
- **Vendor Lock-in**: Use abstraction layers, maintain portability

### Business Risks
- **Regulatory Changes**: Legal consultation, flexible policy engine
- **Competition**: Continuous innovation, customer feedback loops
- **Market Adoption**: Marketing strategy, partnership development
- **Cash Flow**: Multiple revenue streams, financial planning

## Conclusion

This implementation plan addresses all critical issues identified in the Hestia platform while providing a roadmap for sustainable growth. The phased approach ensures that security vulnerabilities are addressed immediately while building towards a comprehensive, scalable solution for the Mexican rental guarantee market.

Priority should be given to Phase 1 security fixes before any other development work proceeds. Each subsequent phase builds upon the previous, creating a robust platform ready for market leadership.