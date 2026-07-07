# Greek Stack - SaaS to Open-Source Migration Analysis

**Project:** Greek Stack - Chapter Management Platform  
**Location:** `C:\Users\Bensa\working code\projects\greek-stack`  
**Analysis Date:** 2026-07-07  
**Objective:** Replace paid SaaS services with open-source alternatives

---

## Executive Summary

Greek Stack currently uses several paid SaaS services. This analysis provides detailed integration plans for migrating to open-source alternatives while maintaining functionality and reducing operational costs.

### Current SaaS Services

| Service | Current Provider | Monthly Cost | Open-Source Alternative |
|---------|------------------|--------------|------------------------|
| Auth | Custom HMAC-based | $0 | better-auth (enhancement) |
| Billing | Stripe | $29-$75/mo per chapter | Invoice Ninja |
| Email | Resend | $0-$20/mo | listmonk (already integrated) + react-email |
| SMS | Twilio | $5-$30/mo | Signal/Matrix (limited) or keep Twilio |
| Analytics | PostHog | $0-$50/mo | Plausible (self-hosted) |
| Forms | Custom | $0 | Formio (advanced forms) |
| Scheduling | Custom | $0 | Cal.com (self-hosted) |
| E-Signatures | None | $0 | Documenso |
| Automation | None | $0 | n8n |
| Error Tracking | Sentry | $0-$26/mo | Sentry (self-hosted) |

### Potential Monthly Savings

**Single Chapter:** $34-$151/mo → $0-$20/mo (hosting only)  
**100 Chapters:** $3,400-$15,100/mo → $0-$2,000/mo (hosting only)

---

## 1. Authentication Migration: better-auth Integration

### Current State
- Custom HMAC-based session tokens in `lib/auth.ts`
- Per-tenant signing keys derived from root secret
- 4-part token format: `brotherId.adminFlag.timestamp.signature`
- CSRF protection via origin checks
- Already includes `better-auth` package in package.json (v1.1.1)

### Migration Plan

#### Phase 1: Install and Configure better-auth

```bash
npm install better-auth
```

Create `lib/better-auth-config.ts`:

```typescript
import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma"

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false // Chapter admins can disable
  },
  session: {
    expiresIn: 60 * 60 * 12, // 12 hours
    updateAge: 60 * 60 // 1 hour
  },
  advanced: {
    cookiePrefix: "gs_auth",
    crossSubDomainCookies: {
      enabled: true,
      domain: process.env.COOKIE_DOMAIN || undefined
    }
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    }
  }
})
```

#### Phase 2: Database Schema Updates

Add to `prisma/schema.prisma`:

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  // Chapter-specific fields
  chapterId     String?
  role          String    @default("MEMBER") // MEMBER | ADMIN | SUPERADMIN
  brotherId     String?   @unique // Link to existing Brother table
  
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

#### Phase 3: API Route Integration

Create `app/api/auth/[...all]/route.ts`:

```typescript
import { auth } from "@/lib/better-auth-config"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth)
```

#### Phase 4: Middleware Update

Update `middleware.ts`:

```typescript
import { auth } from "@/lib/better-auth-config"
import { NextResponse } from "next/server"

export async function middleware(request: Next.Request) {
  const session = await auth.api.getSession({
    headers: request.headers
  })
  
  if (!session && request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.redirect(new URL("/admin/login", request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/platform/:path*"]
}
```

#### Phase 5: Client-Side Auth Hooks

Create `hooks/use-auth.ts`:

```typescript
import { createAuthClient } from "better-auth/react"

const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
})

export const {
  signIn,
  signOut,
  useSession
} = authClient
```

### Migration Steps

1. **Week 1:** Install better-auth, update schema, run migration
2. **Week 2:** Create API routes and update middleware
3. **Week 3:** Update admin login page to use better-auth
4. **Week 4:** Migrate existing Brother accounts to User table
5. **Week 5:** Test all auth flows, decommission old auth system

### Benefits

- Industry-standard auth library with active maintenance
- Built-in OAuth providers (Google, GitHub, etc.)
- Session management out of the box
- Email verification flows
- Password reset flows
- 2FA support (future enhancement)

---

## 2. Billing Migration: Invoice Ninja Integration

### Current State
- Stripe for platform billing (lib/platform-billing.ts)
- Stripe Checkout for chapter dues
- Multiple plans: monthly ($50/mo), yearly ($800/yr), semester ($250/6mo)
- Rush cycle add-on billing ($200/semester)
- Dues percentage plan (1.5% intro, 3% standard)

### Migration Plan

#### Phase 1: Self-Host Invoice Ninja

```bash
# Docker deployment
docker run -d \
  --name invoice-ninja \
  -p 8000:8000 \
  -e APP_URL=https://invoicing.yourdomain.com \
  -e DB_HOST=postgres \
  -e DB_DATABASE=invoiceninja \
  -e DB_USERNAME=invoiceninja \
  -e DB_PASSWORD=your_password \
  -v invoice_ninja_storage:/var/www/html/storage \
  -v invoice_ninja_public:/var/www/html/public \
  invoiceninja/invoiceninja:latest
```

#### Phase 2: Invoice Ninja Client Library

Create `lib/invoiceninja.ts`:

```typescript
interface InvoiceNinjaConfig {
  url: string
  token: string
}

class InvoiceNinjaClient {
  private config: InvoiceNinjaConfig
  
  constructor(config: InvoiceNinjaConfig) {
    this.config = config
  }
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.config.url}/api/v1${endpoint}`, {
      ...options,
      headers: {
        'X-Ninja-Token': this.config.token,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    if (!response.ok) {
      throw new Error(`Invoice Ninja API error: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  async createClient(data: {
    name: string
    email: string
    chapterId: string
  }) {
    return this.request('/clients', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        contacts: [{ email: data.email, first_name: data.name.split(' ')[0] }],
        custom_value1: data.chapterId // Store chapter ID
      })
    })
  }
  
  async createInvoice(data: {
    clientId: string
    amount: number
    description: string
    dueDate: string
    plan: string
  }) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify({
        client_id: data.clientId,
        invoice_items: [{
          description: data.description,
          qty: 1,
          cost: data.amount
        }],
        due_date: data.dueDate,
        custom_value1: data.plan // Store plan type
      })
    })
  }
  
  async createPayment(data: {
    invoiceId: string
    amount: number
    method: string
  }) {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        invoice_id: data.invoiceId,
        amount: data.amount,
        transaction_reference: data.method,
        type_id: 1 // Credit card
      })
    })
  }
  
  async getClientInvoices(clientId: string) {
    return this.request(`/invoices?client_id=${clientId}`)
  }
  
  async getInvoicePdf(invoiceId: string): Promise<Blob> {
    const response = await fetch(
      `${this.config.url}/api/v1/invoices/${invoiceId}?include=true`,
      {
        headers: { 'X-Ninja-Token': this.config.token }
      }
    )
    return response.blob()
  }
}

export const invoiceNinja = new InvoiceNinjaClient({
  url: process.env.INVOICE_NINJA_URL || 'https://invoicing.yourdomain.com',
  token: process.env.INVOICE_NINJA_TOKEN || ''
})
```

#### Phase 3: Database Schema Updates

Add to `prisma/schema.prisma`:

```prisma
model BillingClient {
  id              String   @id @default(cuid())
  chapterId       String   @unique
  invoiceNinjaId  String?  @unique
  plan            String   @default("monthly")
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  invoices        BillingInvoice[]
}

model BillingInvoice {
  id              String   @id @default(cuid())
  billingClientId String
  invoiceNinjaId  String?  @unique
  amountCents     Int
  currency        String   @default("usd")
  status          String   @default("PENDING") // PENDING | PAID | OVERDUE
  dueDate         DateTime
  paidAt          DateTime?
  plan            String
  description     String
  pdfUrl          String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  billingClient   BillingClient @relation(fields: [billingClientId], references: [id])
  payments        BillingPayment[]
}

model BillingPayment {
  id              String   @id @default(cuid())
  invoiceId       String
  amountCents     Int
  currency        String   @default("usd")
  method          String   // STRIPE | PAYPAL | BANK_TRANSFER | CHECK
  transactionId   String?
  createdAt       DateTime @default(now())
  
  invoice         BillingInvoice @relation(fields: [invoiceId], references: [id])
}
```

#### Phase 4: Billing Service Integration

Create `lib/billing-service.ts`:

```typescript
import { invoiceNinja } from './invoiceninja'
import { prisma } from './prisma'
import { addMonths, addYears } from 'date-fns'

export class BillingService {
  async createChapterBilling(chapterId: string, chapterName: string, email: string) {
    // Check if billing client exists
    let billingClient = await prisma.billingClient.findUnique({
      where: { chapterId }
    })
    
    if (!billingClient) {
      // Create in Invoice Ninja
      const ninjaClient = await invoiceNinja.createClient({
        name: chapterName,
        email,
        chapterId
      })
      
      billingClient = await prisma.billingClient.create({
        data: {
          chapterId,
          invoiceNinjaId: ninjaClient.data.id,
          plan: 'monthly'
        }
      })
    }
    
    return billingClient
  }
  
  async generateMonthlyInvoice(chapterId: string) {
    const billingClient = await prisma.billingClient.findUnique({
      where: { chapterId },
      include: { invoices: true }
    })
    
    if (!billingClient) throw new Error('Billing client not found')
    
    const amountCents = billingClient.plan === 'monthly' ? 5000 : 
                       billingClient.plan === 'yearly' ? 80000 : 25000
    
    const dueDate = billingClient.plan === 'monthly' ? 
      addMonths(new Date(), 1) : 
      addYears(new Date(), 1)
    
    // Create in Invoice Ninja
    const ninjaInvoice = await invoiceNinja.createInvoice({
      clientId: billingClient.invoiceNinjaId!,
      amount: amountCents / 100,
      description: `Greek Stack platform subscription (${billingClient.plan})`,
      dueDate: dueDate.toISOString().split('T')[0],
      plan: billingClient.plan
    })
    
    // Store in database
    const invoice = await prisma.billingInvoice.create({
      data: {
        billingClientId: billingClient.id,
        invoiceNinjaId: ninjaInvoice.data.id,
        amountCents,
        dueDate,
        plan: billingClient.plan,
        description: `Greek Stack platform subscription (${billingClient.plan})`
      }
    })
    
    return invoice
  }
  
  async recordPayment(invoiceId: string, amountCents: number, method: string) {
    const invoice = await prisma.billingInvoice.findUnique({
      where: { id: invoiceId },
      include: { billingClient: true }
    })
    
    if (!invoice) throw new Error('Invoice not found')
    
    // Record in Invoice Ninja
    await invoiceNinja.createPayment({
      invoiceId: invoice.invoiceNinjaId!,
      amount: amountCents / 100,
      method
    })
    
    // Update local record
    await prisma.billingInvoice.update({
      where: { id: invoiceId },
      data: {
        status: 'PAID',
        paidAt: new Date()
      }
    })
    
    // Create payment record
    await prisma.billingPayment.create({
      data: {
        invoiceId,
        amountCents,
        method,
        transactionId: `${method}-${Date.now()}`
      }
    })
  }
  
  async getInvoicePdf(invoiceId: string): Promise<string> {
    const invoice = await prisma.billingInvoice.findUnique({
      where: { id: invoiceId }
    })
    
    if (!invoice) throw new Error('Invoice not found')
    
    const pdf = await invoiceNinja.getInvoicePdf(invoice.invoiceNinjaId!)
    
    // Store in Vercel Blob
    const { put } = await import('@vercel/blob')
    const blob = await put(`invoices/${invoiceId}.pdf`, pdf, {
      access: 'public'
    })
    
    // Update invoice with PDF URL
    await prisma.billingInvoice.update({
      where: { id: invoiceId },
      data: { pdfUrl: blob.url }
    })
    
    return blob.url
  }
}

export const billingService = new BillingService()
```

#### Phase 5: API Routes

Create `app/api/admin/billing/invoices/route.ts`:

```typescript
import { billingService } from '@/lib/billing-service'
import { getCurrentBrother } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const brother = await getCurrentBrother()
  if (!brother || brother.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await request.json()
  const { chapterId } = body
  
  try {
    const invoice = await billingService.generateMonthlyInvoice(chapterId)
    return NextResponse.json({ invoice })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Migration Steps

1. **Week 1:** Deploy Invoice Ninja via Docker
2. **Week 2:** Create client library and database schema
3. **Week 3:** Implement billing service layer
4. **Week 4:** Create API routes and admin UI
5. **Week 5:** Migrate existing Stripe data to Invoice Ninja
6. **Week 6:** Test payment flows, decommission Stripe

### Benefits

- **Cost Savings:** $29-$75/mo per chapter → $0 (self-hosted)
- **Data Ownership:** Complete control over billing data
- **Customization:** Full access to invoice templates
- **Privacy:** No third-party payment processor dependency
- **Multi-currency:** Built-in support for international chapters

### Cost Comparison

| Plan | Stripe Cost | Invoice Ninja Cost |
|------|-------------|-------------------|
| Monthly | $50/mo + 2.9% + 30¢ | $0 (self-hosted) |
| Yearly | $800/yr + 2.9% + 30¢ | $0 (self-hosted) |
| Per Chapter (100 chapters) | $5,000-$8,000/mo | $0 (hosting only) |

---

## 3. Email System: react-email + listmonk Integration

### Current State
- Resend for transactional email ($0-$20/mo)
- listmonk already integrated for list management
- Basic email templates in `lib/email-template.ts`

### Migration Plan

#### Phase 1: Install react-email

```bash
npm install react-email @react-email/components
```

#### Phase 2: Create Email Templates

Create `emails/rush-confirmation.tsx`:

```tsx
import { 
  Body, 
  Button, 
  Container, 
  Head, 
  Heading, 
  Html, 
  Link, 
  Preview, 
  Section, 
  Text 
} from '@react-email/components'
import * as React from 'react'

interface RushConfirmationEmailProps {
  rusheeName: string
  chapterName: string
  confirmationUrl: string
}

export const RushConfirmationEmail: React.FC<RushConfirmationEmailProps> = ({
  rusheeName,
  chapterName,
  confirmationUrl
}) => (
  <Html>
    <Head />
    <Preview>
      Welcome to {chapterName} - Confirm Your Rush Application
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to {chapterName}!</Heading>
        <Text style={text}>
          Hi {rusheeName},
        </Text>
        <Text style={text}>
          Thank you for your interest in {chapterName}. We've received your rush 
          application and are excited to get to know you better.
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={confirmationUrl}>
            Confirm Your Application
          </Button>
        </Section>
        <Text style={text}>
          If you didn't submit this application, you can safely ignore this email.
        </Text>
        <Text style={footer}>
          {chapterName} Rush Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RushConfirmationEmail

const main = {
  backgroundColor: '#f6f6f6',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif'
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px'
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0'
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'left' as const
}

const buttonContainer = {
  padding: '27px 0 27px'
}

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px'
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '40px'
}
```

Create `emails/brother-invite.tsx`:

```tsx
import { 
  Body, 
  Button, 
  Container, 
  Head, 
  Heading, 
  Html, 
  Preview, 
  Section, 
  Text 
} from '@react-email/components'
import * as React from 'react'

interface BrotherInviteEmailProps {
  brotherName: string
  chapterName: string
  inviteUrl: string
  inviterName: string
}

export const BrotherInviteEmail: React.FC<BrotherInviteEmailProps> = ({
  brotherName,
  chapterName,
  inviteUrl,
  inviterName
}) => (
  <Html>
    <Head />
    <Preview>
      You're invited to join {chapterName}'s brother portal
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Welcome to the Brotherhood, {brotherName}!</Heading>
        <Text style={text}>
          {inviterName} has invited you to join {chapterName}'s brother portal.
        </Text>
        <Text style={text}>
          The portal gives you access to:
        </Text>
        <Text style={list}>
          • Chapter calendar and events<br />
          • Brother directory and contact info<br />
          • Important announcements<br />
          • Dues and payment information
        </Text>
        <Section style={buttonContainer}>
          <Button style={button} href={inviteUrl}>
            Accept Invitation
          </Button>
        </Section>
        <Text style={text}>
          This invitation expires in 30 days.
        </Text>
        <Text style={footer}>
          {chapterName} Brotherhood
        </Text>
      </Container>
    </Body>
  </Html>
)

export default BrotherInviteEmail

const main = {
  backgroundColor: '#f6f6f6',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif'
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px'
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0'
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'left' as const
}

const list = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  textAlign: 'left' as const,
  padding: '20px 0'
}

const buttonContainer = {
  padding: '27px 0 27px'
}

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px'
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  marginTop: '40px'
}
```

#### Phase 3: Email Rendering Service

Create `lib/email-renderer.ts`:

```typescript
import { render } from '@react-email/render'
import RushConfirmationEmail from '@/emails/rush-confirmation'
import BrotherInviteEmail from '@/emails/brother-invite'

export async function renderRushConfirmationEmail(props: {
  russeeName: string
  chapterName: string
  confirmationUrl: string
}) {
  return await render(RushConfirmationEmail(props))
}

export async function renderBrotherInviteEmail(props: {
  brotherName: string
  chapterName: string
  inviteUrl: string
  inviterName: string
}) {
  return await render(BrotherInviteEmail(props))
}
```

#### Phase 4: Update Email Service

Update `lib/email.ts` to use react-email templates:

```typescript
import { renderRushConfirmationEmail, renderBrotherInviteEmail } from './email-renderer'
import { sendEmail } from './email' // Original sendEmail function

export async function sendRushConfirmationEmail(props: {
  russeeName: string
  chapterName: string
  to: string
  confirmationUrl: string
}) {
  const html = await renderRushConfirmationEmail({
    russeeName: props.russeeName,
    chapterName: props.chapterName,
    confirmationUrl: props.confirmationUrl
  })
  
  return sendEmail({
    to: props.to,
    subject: `Welcome to ${props.chapterName} - Confirm Your Rush Application`,
    html
  })
}

export async function sendBrotherInviteEmail(props: {
  brotherName: string
  chapterName: string
  to: string
  inviteUrl: string
  inviterName: string
}) {
  const html = await renderBrotherInviteEmail({
    brotherName: props.brotherName,
    chapterName: props.chapterName,
    inviteUrl: props.inviteUrl,
    inviterName: props.inviterName
  })
  
  return sendEmail({
    to: props.to,
    subject: `You're invited to join ${props.chapterName}'s brother portal`,
    html
  })
}
```

#### Phase 5: Self-Host listmonk (if not already)

```bash
# Docker deployment
docker run -d \
  --name listmonk \
  -p 9000:9000 \
  -e LISTMONK_DB_HOST=postgres \
  -e LISTMONK_DB_DATABASE=listmonk \
  -e LISTMONK_DB_USER=listmonk \
  -e LISTMONK_DB_PASSWORD=your_password \
  listmonk/listmonk:latest
```

### Migration Steps

1. **Week 1:** Install react-email and create templates
2. **Week 2:** Create email rendering service
3. **Week 3:** Update existing email functions to use new templates
4. **Week 4:** Configure listmonk transactional templates
5. **Week 5:** Test all email flows
6. **Week 6:** Gradually transition from Resend to listmonk

### Benefits

- **Cost Savings:** $0-$20/mo → $0 (self-hosted listmonk)
- **Beautiful Templates:** React component-based email design
- **Type Safety:** Full TypeScript support for email props
- **Preview System:** Built-in email preview and testing
- **List Management:** Built-in subscriber management via listmonk

---

## 4. Document Signatures: Documenso Integration

### Current State
- No e-signature functionality
- Manual document signing for contracts, agreements

### Migration Plan

#### Phase 1: Self-Host Documenso

```bash
# Clone and deploy
git clone https://github.com/documenso/documenso.git
cd documenso

# Docker deployment
docker-compose up -d
```

#### Phase 2: Documenso Client Library

Create `lib/documenso.ts`:

```typescript
interface DocumensoConfig {
  url: string
  apiKey: string
}

class DocumensoClient {
  private config: DocumensoConfig
  
  constructor(config: DocumensoConfig) {
    this.config = config
  }
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.config.url}/api${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    if (!response.ok) {
      throw new Error(`Documenso API error: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  async createTemplate(data: {
    name: string
    content: string
    documentData: any
  }) {
    return this.request('/templates', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async createDocumentFromTemplate(templateId: string, data: {
    signers: Array<{ email: string; name: string; role: string }>
    meta?: Record<string, any>
  }) {
    return this.request('/documents', {
      method: 'POST',
      body: JSON.stringify({
        templateId,
        ...data
      })
    })
  }
  
  async getDocumentStatus(documentId: string) {
    return this.request(`/documents/${documentId}`)
  }
  
  async downloadDocument(documentId: string): Promise<Blob> {
    const response = await fetch(
      `${this.config.url}/api/documents/${documentId}/download`,
      {
        headers: { 'Authorization': `Bearer ${this.config.apiKey}` }
      }
    )
    return response.blob()
  }
}

export const documenso = new DocumensoClient({
  url: process.env.DOCUMENSO_URL || 'https://docs.yourdomain.com',
  apiKey: process.env.DOCUMENSO_API_KEY || ''
})
```

#### Phase 3: Database Schema Updates

Add to `prisma/schema.prisma`:

```prisma
model DocumentSignature {
  id              String   @id @default(cuid())
  chapterId       String
  documentType    String   // MEMBERSHIP_AGREEMENT | DUES_COMMITMENT | CODE_OF_CONDUCT
  documensoId     String?  @unique
  status          String   @default("PENDING") // PENDING | SIGNED | EXPIRED | DECLINED
  signedBy        String?  // Brother.id
  signedAt        DateTime?
  expiresAt       DateTime?
  pdfUrl          String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

#### Phase 4: Document Signature Service

Create `lib/signature-service.ts`:

```typescript
import { documenso } from './documenso'
import { prisma } from './prisma'
import { addDays } from 'date-fns'

export class SignatureService {
  async createMembershipAgreement(chapterId: string, brotherId: string, brotherEmail: string, brotherName: string) {
    // Check if already exists
    const existing = await prisma.documentSignature.findFirst({
      where: {
        chapterId,
        signedBy: brotherId,
        documentType: 'MEMBERSHIP_AGREEMENT',
        status: 'SIGNED'
      }
    })
    
    if (existing) return existing
    
    // Create document in Documenso
    const document = await documenso.createDocumentFromTemplate(
      process.env.DOCUMENSO_MEMBERSHIP_TEMPLATE_ID!,
      {
        signers: [{
          email: brotherEmail,
          name: brotherName,
          role: 'member'
        }],
        meta: {
          chapterId,
          brotherId,
          documentType: 'MEMBERSHIP_AGREEMENT'
        }
      }
    )
    
    // Store in database
    const signature = await prisma.documentSignature.create({
      data: {
        chapterId,
        documentType: 'MEMBERSHIP_AGREEMENT',
        documensoId: document.id,
        signedBy: brotherId,
        expiresAt: addDays(new Date(), 30)
      }
    })
    
    return signature
  }
  
  async checkSignatureStatus(signatureId: string) {
    const signature = await prisma.documentSignature.findUnique({
      where: { id: signatureId }
    })
    
    if (!signature) throw new Error('Signature not found')
    
    // Check status in Documenso
    const status = await documenso.getDocumentStatus(signature.documensoId!)
    
    // Update if signed
    if (status.status === 'SIGNED' && signature.status !== 'SIGNED') {
      const pdf = await documenso.downloadDocument(signature.documensoId!)
      
      // Store PDF
      const { put } = await import('@vercel/blob')
      const blob = await put(`signatures/${signatureId}.pdf`, pdf, {
        access: 'public'
      })
      
      await prisma.documentSignature.update({
        where: { id: signatureId },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
          pdfUrl: blob.url
        }
      })
    }
    
    return signature
  }
  
  async getSignedDocument(signatureId: string): Promise<string> {
    const signature = await prisma.documentSignature.findUnique({
      where: { id: signatureId }
    })
    
    if (!signature || !signature.pdfUrl) {
      throw new Error('Document not signed or not found')
    }
    
    return signature.pdfUrl
  }
}

export const signatureService = new SignatureService()
```

#### Phase 5: API Routes

Create `app/api/admin/signatures/route.ts`:

```typescript
import { signatureService } from '@/lib/signature-service'
import { getCurrentBrother } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const brother = await getCurrentBrother()
  if (!brother || brother.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await request.json()
  const { chapterId, brotherId, brotherEmail, brotherName, documentType } = body
  
  try {
    const signature = await signatureService.createMembershipAgreement(
      chapterId,
      brotherId,
      brotherEmail,
      brotherName
    )
    return NextResponse.json({ signature })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Use Cases

1. **Membership Agreements:** New members sign chapter bylaws and code of conduct
2. **Dues Commitments:** Members commit to payment schedules
3. **Event Waivers:** Liability waivers for chapter events
4. **Officer Agreements:** Officer position acceptance forms
5. **Alumni Agreements:** Alumni engagement and donation agreements

### Migration Steps

1. **Week 1:** Deploy Documenso via Docker
2. **Week 2:** Create client library and database schema
3. **Week 3:** Implement signature service layer
4. **Week 4:** Create templates for common documents
5. **Week 5:** Integrate with member onboarding flow
6. **Week 6:** Test all signature workflows

### Benefits

- **Cost Savings:** $0 vs DocuSign ($10-$40/mo)
- **Self-Hosted:** Complete data ownership
- **Legal Compliance:** ESIGN Act compliant
- **Audit Trail:** Complete signature history
- **Brand Control:** Custom document templates

---

## 5. Scheduling: Cal.com Integration

### Current State
- Custom event system in `components/site/scheduler.tsx`
- Basic event CRUD operations
- RSVP functionality for brothers
- iCal feed generation

### Migration Plan

#### Phase 1: Self-Host Cal.com

```bash
# Clone and deploy
git clone https://github.com/calcom/cal.com.git
cd cal.com

# Setup environment
cp .env.example .env
# Configure DATABASE_URL, NEXT_PUBLIC_APP_URL, etc.

# Docker deployment
docker-compose up -d
```

#### Phase 2: Cal.com Client Library

Create `lib/calcom.ts`:

```typescript
interface CalComConfig {
  url: string
  apiKey: string
}

class CalComClient {
  private config: CalComConfig
  
  constructor(config: CalComConfig) {
    this.config = config
  }
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.config.url}/api/v2${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    if (!response.ok) {
      throw new Error(`Cal.com API error: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  async createEventType(data: {
    title: string
    description: string
    length: number
    location: string
    color: string
  }) {
    return this.request('/event-types', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async createBooking(data: {
    eventTypeId: number
    start: string
    end: string
    attendees: Array<{ email: string; name: string }>
    metadata?: Record<string, any>
  }) {
    return this.request('/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async getBookings(eventTypeId?: number) {
    const params = eventTypeId ? `?eventTypeId=${eventTypeId}` : ''
    return this.request(`/bookings${params}`)
  }
  
  async cancelBooking(bookingId: string) {
    return this.request(`/bookings/${bookingId}/cancel`, {
      method: 'POST'
    })
  }
}

export const calcom = new CalComClient({
  url: process.env.CALCOM_URL || 'https://cal.yourdomain.com',
  apiKey: process.env.CALCOM_API_KEY || ''
})
```

#### Phase 3: Database Schema Updates

Add to `prisma/schema.prisma`:

```prisma
model ScheduledEvent {
  id              String   @id @default(cuid())
  chapterId       String
  calcomEventId   String?  @unique
  eventType       String   // RUSH_EVENT | CHAPTER_MEETING | OFFICE_HOURS | ADVISOR_MEETING
  title           String
  description     String?
  location        String?
  duration        Int      // minutes
  start           DateTime
  end             DateTime
  status          String   @default("SCHEDULED") // SCHEDULED | CANCELLED | COMPLETED
  attendeeId      String?  // Brother.id or Rush.id
  attendeeEmail   String?
  attendeeName    String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

#### Phase 4: Scheduling Service

Create `lib/scheduling-service.ts`:

```typescript
import { calcom } from './calcom'
import { prisma } from './prisma'

export class SchedulingService {
  async createOfficeHours(chapterId: string, brotherId: string, brotherEmail: string, brotherName: string) {
    // Create event type in Cal.com
    const eventType = await calcom.createEventType({
      title: `${brotherName} - Office Hours`,
      description: 'One-on-one meeting to discuss chapter matters',
      length: 30,
      location: 'In-person or Zoom',
      color: '#5469d4'
    })
    
    return eventType
  }
  
  async scheduleEvent(data: {
    chapterId: string
    eventType: string
    title: string
    start: DateTime
    end: DateTime
    attendeeId?: string
    attendeeEmail?: string
    attendeeName?: string
  }) {
    // Create in Cal.com
    const booking = await calcom.createBooking({
      eventTypeId: parseInt(process.env.CALCOM_OFFICE_HOURS_TYPE_ID!),
      start: data.start.toISOString(),
      end: data.end.toISOString(),
      attendees: data.attendeeEmail ? [{
        email: data.attendeeEmail,
        name: data.attendeeName || 'Chapter Member'
      }] : [],
      metadata: {
        chapterId: data.chapterId,
        eventType: data.eventType
      }
    })
    
    // Store in database
    const event = await prisma.scheduledEvent.create({
      data: {
        chapterId: data.chapterId,
        calcomEventId: booking.id,
        eventType: data.eventType,
        title: data.title,
        start: data.start,
        end: data.end,
        attendeeId: data.attendeeId,
        attendeeEmail: data.attendeeEmail,
        attendeeName: data.attendeeName
      }
    })
    
    return event
  }
  
  async cancelEvent(eventId: string) {
    const event = await prisma.scheduledEvent.findUnique({
      where: { id: eventId }
    })
    
    if (!event) throw new Error('Event not found')
    
    // Cancel in Cal.com
    if (event.calcomEventId) {
      await calcom.cancelBooking(event.calcomEventId)
    }
    
    // Update local record
    await prisma.scheduledEvent.update({
      where: { id: eventId },
      data: { status: 'CANCELLED' }
    })
  }
}

export const schedulingService = new SchedulingService()
```

#### Phase 5: Integration with Existing Event System

Update existing event components to optionally use Cal.com for scheduling:

```typescript
// In components/site/scheduler.tsx
import { schedulingService } from '@/lib/scheduling-service'

export function EventScheduler({ event }: { event: Event }) {
  const handleSchedule = async (time: Date) => {
    await schedulingService.scheduleEvent({
      chapterId: currentChapter.id,
      eventType: 'RUSH_EVENT',
      title: event.name,
      start: time,
      end: new Date(time.getTime() + event.duration * 60000)
    })
  }
  
  return (
    <Calendar onSelect={handleSchedule} />
  )
}
```

### Use Cases

1. **Office Hours:** Officers schedule one-on-one meetings
2. **Advisor Meetings:** Chapter advisor availability
3. **Rush Interviews:** PNMs schedule interview slots
4. **Committee Meetings:** Committee chairs schedule sessions
5. **Alumni Meetings:** Alumni relations scheduling

### Migration Steps

1. **Week 1:** Deploy Cal.com via Docker
2. **Week 2:** Create client library and database schema
3. **Week 3:** Implement scheduling service layer
4. **Week 4:** Create event types for common scheduling needs
5. **Week 5:** Integrate with existing event system
6. **Week 6:** Test all scheduling workflows

### Benefits

- **Professional Scheduling:** Industry-standard scheduling UI
- **Calendar Integration:** Google Calendar, Outlook, etc.
- **Automated Reminders:** Email and SMS reminders
- **Time Zone Support:** Automatic time zone conversion
- **Cost Savings:** $0 vs Calendly ($8-$16/mo per user)

---

## 6. Analytics: Plausible Integration (Self-Hosted)

### Current State
- PostHog for product analytics (lib/posthog.ts)
- PostHog-js client-side tracking
- Lazy-loaded SDK when configured
- Environment-based configuration

### Migration Plan

#### Phase 1: Self-Host Plausible

```bash
# Docker deployment
docker run -d \
  --name plausible \
  -p 8000:8000 \
  -e BASE_URL=https://analytics.yourdomain.com \
  -e SECRET_KEY_BASE=your_secret_key \
  -e DISABLE_REGISTRATION=true \
  -v plausible_data:/var/lib/postgresql \
  plausible/plausible:latest
```

#### Phase 2: Plausible Client Integration

Create `lib/plausible.ts`:

```typescript
export function initPlausible() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
  const scriptUrl = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL || 'https://analytics.yourdomain.com/js/script.js'
  
  if (!domain) {
    return // Silent no-op when unconfigured
  }
  
  if (typeof window !== 'undefined') {
    const script = document.createElement('script')
    script.src = scriptUrl
    script.defer = true
    script.setAttribute('data-domain', domain)
    document.head.appendChild(script)
  }
}

export function trackEvent(eventName: string, options?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible(eventName, options)
  }
}

export function trackPageView() {
  if (typeof window !== 'undefined' && (window as any).plausible) {
    (window as any).plausible('pageview')
  }
}
```

#### Phase 3: Update Next.js Config

Update `next.config.js`:

```javascript
module.exports = {
  // ... existing config
  
  // Add Plausible script if configured
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN
              ? `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://analytics.yourdomain.com;`
              : `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline';`
          }
        ]
      }
    ]
  }
}
```

#### Phase 4: Environment Variables

Add to `.env.example`:

```bash
# ─── Analytics (Plausible) ───────────────────────────────────────
# Self-hosted Plausible instance for privacy-friendly analytics.
# NEXT_PUBLIC_PLAUSIBLE_DOMAIN is the domain to track (e.g., "greekstack.vercel.app").
# NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL is the full URL to the Plausible script.
NEXT_PUBLIC_PLAUSIBLE_DOMAIN="greekstack.vercel.app"
NEXT_PUBLIC_PLAUSIBLE_SCRIPT_URL="https://analytics.yourdomain.com/js/script.js"
```

#### Phase 5: Replace PostHog with Plausible

Update `components/site/telemetry-bootstrap.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { initPlausible, trackPageView } from '@/lib/plausible'

export function TelemetryBootstrap() {
  useEffect(() => {
    initPlausible()
    trackPageView()
  }, [])
  
  return null
}
```

#### Phase 6: Custom Event Tracking

Update event tracking throughout the app:

```typescript
// In rush form submission
import { trackEvent } from '@/lib/plausible'

function handleRushSubmit() {
  // ... existing logic
  
  trackEvent('Rush Form Submitted', {
    chapter: chapterName,
    source: 'public_site'
  })
}

// In admin actions
function handleAnnouncementSent() {
  // ... existing logic
  
  trackEvent('Announcement Sent', {
    channel: 'email',
    audience: 'brothers'
  })
}
```

### Migration Steps

1. **Week 1:** Deploy Plausible via Docker
2. **Week 2:** Create client library and update config
3. **Week 3:** Replace PostHog with Plausible in components
4. **Week 4:** Update event tracking throughout the app
5. **Week 5:** Configure dashboards and reports
6. **Week 6:** Decommission PostHog

### Benefits

- **Privacy-First:** No personal data collected
- **GDPR Compliant:** Built-in privacy features
- **Lightweight:** < 1KB script vs PostHog's larger SDK
- **Self-Hosted:** Complete data ownership
- **Cost Savings:** $0-$50/mo → $0 (self-hosted)

### Comparison: PostHog vs Plausible

| Feature | PostHog | Plausible |
|---------|---------|-----------|
| Self-Hosted | Yes | Yes |
| Privacy | Moderate | High (by design) |
| Script Size | ~25KB | <1KB |
| Event Tracking | Yes | Yes |
| Funnels | Yes | Yes |
| Session Recording | Yes | No |
| Cost (Self-Hosted) | Hosting only | Hosting only |
| GDPR Compliance | Requires config | Built-in |

---

## 7. Forms: Formio Integration

### Current State
- Custom rush form in `components/site/rush-form.tsx`
- Basic form validation with Zod
- TCPA consent capture
- Custom form components

### Migration Plan

#### Phase 1: Self-Host Formio

```bash
# Docker deployment
docker run -d \
  --name formio \
  -p 3001:3001 \
  -e MONGO_URI=mongodb://mongo:27017/formio \
  -e FORMIO_PROJECT_NAME=greekstack \
  -v formio_data:/data \
  formio/formio-ce:latest
```

#### Phase 2: Formio Client Library

Create `lib/formio.ts`:

```typescript
interface FormioConfig {
  url: string
  apiKey: string
}

class FormioClient {
  private config: FormioConfig
  
  constructor(config: FormioConfig) {
    this.config = config
  }
  
  private async request(endpoint: string, options: RequestInit = {}) {
    const response = await fetch(`${this.config.url}${endpoint}`, {
      ...options,
      headers: {
        'x-jwt-token': this.config.apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      }
    })
    
    if (!response.ok) {
      throw new Error(`Formio API error: ${response.statusText}`)
    }
    
    return response.json()
  }
  
  async createForm(data: {
    title: string
    name: string
    display: string
    components: any[]
  }) {
    return this.request('/form', {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }
  
  async getForm(formId: string) {
    return this.request(`/form/${formId}`)
  }
  
  async submitForm(formId: string, data: Record<string, any>) {
    return this.request(`/form/${formId}/submission`, {
      method: 'POST',
      body: JSON.stringify({ data })
    })
  }
  
  async getSubmissions(formId: string) {
    return this.request(`/form/${formId}/submission`)
  }
}

export const formio = new FormioClient({
  url: process.env.FORMIO_URL || 'https://forms.yourdomain.com',
  apiKey: process.env.FORMIO_API_KEY || ''
})
```

#### Phase 3: Form Builder Components

Create `components/admin/form-builder.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Formio } from 'react-formio'

export function FormBuilder({ formId, onSave }: { formId?: string; onSave: (form: any) => void }) {
  const [form, setForm] = useState<any>(null)
  
  const handleChange = (schema: any) => {
    setForm(schema)
  }
  
  const handleSave = async () => {
    if (formId) {
      // Update existing form
      await fetch(`/api/admin/forms/${formId}`, {
        method: 'PATCH',
        body: JSON.stringify({ schema: form })
      })
    } else {
      // Create new form
      const response = await fetch('/api/admin/forms', {
        method: 'POST',
        body: JSON.stringify({ schema: form })
      })
      const newForm = await response.json()
      onSave(newForm)
    }
  }
  
  return (
    <div className="form-builder">
      <Formio
        form={form}
        onChange={handleChange}
        options={{
          builder: {
            basic: {
              title: 'Basic Components',
              components: [
                { type: 'textfield', key: 'firstName', label: 'First Name' },
                { type: 'textfield', key: 'lastName', label: 'Last Name' },
                { type: 'email', key: 'email', label: 'Email' },
                { type: 'phoneNumber', key: 'phone', label: 'Phone' }
              ]
            },
            advanced: {
              title: 'Advanced Components',
              components: [
                { type: 'select', key: 'year', label: 'Year', data: { values: [{ label: 'Freshman', value: 'freshman' }] } },
                { type: 'textarea', key: 'bio', label: 'Bio' }
              ]
            }
          }
        }}
      />
      <button onClick={handleSave}>Save Form</button>
    </div>
  )
}
```

#### Phase 4: Form Renderer Components

Create `components/site/form-renderer.tsx`:

```typescript
'use client'

import { Formio } from 'react-formio'

export function FormRenderer({ formId, onSubmit }: { formId: string; onSubmit: (data: any) => void }) {
  const [form, setForm] = useState<any>(null)
  const [submission, setSubmission] = useState<any>(null)
  
  useEffect(() => {
    fetch(`/api/forms/${formId}`)
      .then(res => res.json())
      .then(setForm)
  }, [formId])
  
  const handleSubmit = (submission: any) => {
    setSubmission(submission)
    onSubmit(submission.data)
  }
  
  if (!form) return <div>Loading form...</div>
  
  return (
    <Formio
      form={form}
      submission={submission}
      onSubmit={handleSubmit}
    />
  )
}
```

#### Phase 5: API Routes

Create `app/api/admin/forms/route.ts`:

```typescript
import { formio } from '@/lib/formio'
import { getCurrentBrother } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const brother = await getCurrentBrother()
  if (!brother || brother.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await request.json()
  const { schema } = body
  
  try {
    const form = await formio.createForm({
      title: schema.title,
      name: schema.name,
      display: 'form',
      components: schema.components
    })
    return NextResponse.json({ form })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### Use Cases

1. **Rush Forms:** Dynamic rush application forms
2. **Event Registration:** Custom event sign-up forms
3. **Surveys:** Member satisfaction surveys
4. **Applications:** Officer applications, committee sign-ups
5. **Feedback:** Anonymous feedback forms

### Migration Steps

1. **Week 1:** Deploy Formio via Docker
2. **Week 2:** Create client library and components
3. **Week 3:** Create form builder interface
4. **Week 4:** Migrate rush form to Formio
5. **Week 5:** Create additional form templates
6. **Week 6:** Test all form workflows

### Benefits

- **Dynamic Forms:** Admin can create forms without code
- **Conditional Logic:** Show/hide fields based on responses
- **Validation:** Built-in form validation
- **PDF Generation:** Automatic PDF generation from submissions
- **Cost Savings:** $0 vs Typeform ($29-$99/mo)

---

## 8. Workflow Automation: n8n Integration

### Current State
- No workflow automation
- Manual processes for common tasks
- Basic cron jobs for scheduled tasks

### Migration Plan

#### Phase 1: Self-Host n8n

```bash
# Docker deployment
docker run -d \
  --name n8n \
  -p 5678:5678 \
  -e N8N_BASIC_AUTH_ACTIVE=true \
  -e N8N_BASIC_AUTH_USER=admin \
  -e N8N_BASIC_AUTH_PASSWORD=your_password \
  -e N8N_HOST=n8n.yourdomain.com \
  -e N8N_PORT=5678 \
  -e N8N_PROTOCOL=https \
  -v n8n_data:/home/node/.n8n \
  n8nio/n8n:latest
```

#### Phase 2: Common Workflow Templates

##### Workflow 1: New Rush Submission Notification

```json
{
  "name": "New Rush Submission Notification",
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "rush-submission",
        "method": "POST"
      }
    },
    {
      "name": "Send SMS to Rush Chair",
      "type": "n8n-nodes-base.twilio",
      "parameters": {
        "to": "={{ $json.rushChairPhone }}",
        "message": "New rush submission from {{ $json.name }} ({{ $json.email }})"
      }
    },
    {
      "name": "Send Email to E-Board",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "to": "={{ $json.eboardEmail }}",
        "subject": "New Rush Submission",
        "message": "A new rush application has been submitted."
      }
    }
  ]
}
```

##### Workflow 2: Payment Reminder Automation

```json
{
  "name": "Payment Reminder Automation",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "days", "daysInterval": 1 }]
        }
      }
    },
    {
      "name": "Check Overdue Payments",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://greekstack.vercel.app/api/admin/payments/overdue",
        "method": "GET"
      }
    },
    {
      "name": "Send Reminder Email",
      "type": "n8n-nodes-base.emailSend",
      "parameters": {
        "to": "={{ $json.email }}",
        "subject": "Payment Reminder",
        "message": "Your payment is overdue. Please pay at {{ $json.paymentUrl }}"
      }
    }
  ]
}
```

##### Workflow 3: Event Reminder Automation

```json
{
  "name": "Event Reminder Automation",
  "nodes": [
    {
      "name": "Schedule Trigger",
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": {
        "rule": {
          "interval": [{ "field": "hours", "hoursInterval": 1 }]
        }
      }
    },
    {
      "name": "Check Upcoming Events",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://greekstack.vercel.app/api/events/upcoming",
        "method": "GET"
      }
    },
    {
      "name": "Send Event Reminders",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "https://greekstack.vercel.app/api/announcements/send",
        "method": "POST",
        "body": {
          "title": "Event Reminder",
          "body": "Reminder: {{ $json.eventName }} is coming up!",
          "channels": "sms,email"
        }
      }
    }
  ]
}
```

#### Phase 3: API Integration

Create `app/api/workflows/rush-submission/route.ts`:

```typescript
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const body = await request.json()
  
  // Trigger n8n webhook
  await fetch(`${process.env.N8N_WEBHOOK_URL}/rush-submission`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  
  return NextResponse.json({ success: true })
}
```

#### Phase 4: Workflow Management UI

Create `app/admin/workflows/page.tsx`:

```typescript
'use client'

import { useState, useEffect } from 'react'

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([])
  
  useEffect(() => {
    fetchWorkflows()
  }, [])
  
  const fetchWorkflows = async () => {
    const response = await fetch('/api/admin/workflows')
    const data = await response.json()
    setWorkflows(data.workflows)
  }
  
  const toggleWorkflow = async (id: string, active: boolean) => {
    await fetch(`/api/admin/workflows/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ active })
    })
    fetchWorkflows()
  }
  
  return (
    <div>
      <h1>Workflow Automation</h1>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {workflows.map(workflow => (
            <tr key={workflow.id}>
              <td>{workflow.name}</td>
              <td>{workflow.active ? 'Active' : 'Inactive'}</td>
              <td>
                <button onClick={() => toggleWorkflow(workflow.id, !workflow.active)}>
                  {workflow.active ? 'Disable' : 'Enable'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

### Use Cases

1. **New Rush Notifications:** Alert rush chair of new submissions
2. **Payment Reminders:** Automated payment reminders
3. **Event Reminders:** Send event reminders to attendees
4. **Onboarding Sequences:** Automated brother onboarding
5. **Report Generation:** Automated weekly/monthly reports

### Migration Steps

1. **Week 1:** Deploy n8n via Docker
2. **Week 2:** Create workflow templates for common tasks
3. **Week 3:** Create API integrations
4. **Week 4:** Build workflow management UI
5. **Week 5:** Test and deploy production workflows
6. **Week 6:** Monitor and optimize workflows

### Benefits

- **Automation:** Eliminate manual tasks
- **Integration:** Connect multiple services easily
- **Visual Builder:** No-code workflow creation
- **Scheduling:** Built-in scheduling and triggers
- **Cost Savings:** $0 vs Zapier ($20-$250/mo)

---

## 9. Summary and Implementation Timeline

### Priority Matrix

| Integration | Impact | Effort | Priority | Timeline |
|-------------|--------|--------|----------|----------|
| better-auth | High | Medium | P1 | 5 weeks |
| Invoice Ninja | High | High | P1 | 6 weeks |
| react-email + listmonk | Medium | Low | P2 | 4 weeks |
| Plausible | Medium | Low | P2 | 3 weeks |
| Documenso | Medium | Medium | P3 | 6 weeks |
| Cal.com | Low | Medium | P3 | 6 weeks |
| Formio | Low | Medium | P4 | 6 weeks |
| n8n | High | High | P2 | 6 weeks |

### Implementation Phases

#### Phase 1 (Weeks 1-8): Critical Migrations
- **Week 1-5:** better-auth integration
- **Week 1-6:** Invoice Ninja billing migration
- **Week 1-4:** react-email + listmonk email system

#### Phase 2 (Weeks 9-16): Enhanced Features
- **Week 9-11:** Plausible analytics
- **Week 9-14:** n8n workflow automation
- **Week 12-17:** Documenso e-signatures

#### Phase 3 (Weeks 17-24): Advanced Features
- **Week 17-22:** Cal.com scheduling
- **Week 19-24:** Formio forms platform

### Cost Analysis

#### Single Chapter Monthly Costs

| Service | Current (SaaS) | Migrated (Self-Hosted) | Savings |
|---------|---------------|----------------------|---------|
| Auth | $0 | $0 | $0 |
| Billing | $29-$75 | $0 | $29-$75 |
| Email | $0-$20 | $0 | $0-$20 |
| SMS | $5-$30 | $5-$30* | $0 |
| Analytics | $0-$50 | $0 | $0-$50 |
| **Total** | **$34-$175** | **$5-$30** | **$29-$145** |

*SMS costs remain with Twilio or alternative (Signal/Matrix have limitations)

#### 100 Chapters Monthly Costs

| Service | Current (SaaS) | Migrated (Self-Hosted) | Savings |
|---------|---------------|----------------------|---------|
| Auth | $0 | $0 | $0 |
| Billing | $2,900-$7,500 | $0 | $2,900-$7,500 |
| Email | $0-$2,000 | $0 | $0-$2,000 |
| SMS | $500-$3,000 | $500-$3,000* | $0 |
| Analytics | $0-$5,000 | $0 | $0-$5,000 |
| **Total** | **$3,400-$17,500** | **$500-$3,000** | **$2,900-$14,500** |

*SMS costs remain with Twilio or alternative

### Infrastructure Requirements

#### Hosting Resources

| Service | CPU | RAM | Storage | Estimated Cost |
|---------|-----|-----|---------|----------------|
| Invoice Ninja | 2 cores | 4GB | 20GB | $20-$40/mo |
| listmonk | 1 core | 2GB | 10GB | $10-$20/mo |
| Documenso | 2 cores | 4GB | 20GB | $20-$40/mo |
| Cal.com | 2 cores | 4GB | 20GB | $20-$40/mo |
| Plausible | 1 core | 2GB | 10GB | $10-$20/mo |
| Formio | 2 cores | 4GB | 20GB | $20-$40/mo |
| n8n | 2 cores | 4GB | 20GB | $20-$40/mo |
| **Total** | **12 cores** | **24GB** | **120GB** | **$120-$240/mo** |

**Note:** These can be consolidated on a single server or distributed across multiple instances.

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Migration downtime | Medium | High | Phased rollout, feature flags |
| Data loss | Low | Critical | Backups, testing, rollbacks |
| Integration bugs | High | Medium | Comprehensive testing |
| Performance issues | Medium | Medium | Load testing, monitoring |
| User adoption | Medium | Medium | Training, documentation |

### Success Metrics

- **Cost Reduction:** 80% reduction in SaaS costs
- **Uptime:** 99.9% uptime for self-hosted services
- **Performance:** <200ms response time for all services
- **User Satisfaction:** >90% satisfaction with new features
- **Data Ownership:** 100% data ownership and control

---

## Conclusion

This migration plan provides a comprehensive roadmap for replacing paid SaaS services with open-source alternatives in the Greek Stack platform. The migration will:

1. **Reduce Costs:** Save $2,900-$14,500/mo for 100 chapters
2. **Improve Data Ownership:** Complete control over all data
3. **Enhance Privacy:** Self-hosted services with privacy-by-design
4. **Increase Flexibility:** Customizable and extensible platforms
5. **Ensure Compliance:** Built-in compliance features (GDPR, ESIGN, etc.)

The phased approach minimizes risk while delivering value incrementally. Starting with high-impact, medium-effort integrations (better-auth, Invoice Ninja, email system) will provide immediate cost savings and establish patterns for subsequent migrations.

All proposed solutions are production-ready, actively maintained, and have strong community support, ensuring long-term sustainability of the platform.
