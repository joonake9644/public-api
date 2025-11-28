# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 작업 시작 전 필수 체크사항

**⚠️ CRITICAL**: 모든 작업 시작 전에 다음을 **반드시** 확인하세요:

1. **STATE.md 파일 확인** (`./STATE.md`)
   - 현재 진행 상황 파악
   - 완료된 작업 확인
   - 중복 작업 방지

2. **기존 코드 검색**
   - 비슷한 기능이 이미 구현되어 있는지 확인
   - `src/lib/utils/` - 유틸리티 함수 확인
   - `src/lib/types/` - 타입 정의 확인
   - `src/lib/errors/` - 에러 클래스 확인

3. **중복 코드 방지 원칙**
   - 같은 로직을 두 번 작성하지 않기
   - 기존 함수/클래스 재사용 우선
   - DRY (Don't Repeat Yourself) 원칙 준수

## Project Overview

This is a **Korea Public Data API Integration Platform** built with Next.js 16, designed to simplify integration with Korean public data APIs by handling diverse authentication schemes, coordinate system conversions, and error recovery.

**Core Philosophy:**
- **State-Driven Development**: Always check STATE.md before starting work
- **Code Reuse First**: Search existing code before writing new code
- **Component-First Development**: Build independent, testable components
- **Error-Chain Prevention**: Stop, analyze, fix before proceeding
- **Checkpoint-Driven**: Each component completion is a rollback point

## Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server on http://localhost:3000

# Production
npm run build            # Build for production
npm start                # Start production server

# Code Quality
npm run lint             # Run ESLint (Next.js config)
npx tsc --noEmit         # Type check without emitting files
```

## Project Structure

```
public_api/
├── app/                 # Next.js 16 App Router
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Home page
│   └── globals.css     # Global Tailwind styles
├── src/
│   └── lib/
│       └── firebase.ts # Firebase initialization (Auth, Firestore, Storage, Analytics)
├── doc/                # Technical documentation
│   ├── PRD_Product_Requirements_Document.md
│   ├── TRD_Technical_Requirements_Document.md
│   └── Korea_Public_Data_API_Complete_Guide_v3.0.0.md
└── claude.md           # Korean development guide (legacy)
```

## Architecture

**Planned Multi-Layer Architecture** (per TRD):
1. **Presentation Layer**: React components, Leaflet maps, UI
2. **Application Layer**: State management, routing, event handlers
3. **Domain Layer**: Business logic (coordinate conversion, error handling, API auth)
4. **Infrastructure Layer**: API clients, HTTP, cache, storage

**Key Components to Implement** (see TRD):
- `APIAuthManager`: Handle ENCODED/DECODED/OAUTH/NONE auth types
- `UniversalAPIClient`: Universal API client with retry logic
- `CoordinateConverter`: Convert between WGS84, GRS80, Bessel coordinate systems
- `ErrorChainHandler`: Auto-recovery for traffic limits, key expiration
- `SpatialAPIClient`: Spatial data with auto coordinate conversion

## Technology Stack

- **Framework**: Next.js 16.0.3 (App Router)
- **React**: 19.2.0
- **TypeScript**: 5.x (strict mode enabled)
- **Styling**: Tailwind CSS 4.x
- **Backend**: Firebase (Auth, Firestore, Storage, Analytics)
- **Linting**: ESLint with Next.js config

## Environment Variables

Required in `.env.local`:
```bash
# Firebase (all required)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## TypeScript Configuration

- **Target**: ES2017
- **Module Resolution**: bundler
- **Path Alias**: `@/*` maps to repository root
- **Strict Mode**: Enabled
- **JSX**: react-jsx (React 19)

## Development Guidelines

### Component Development Workflow

Follow the checkpoint-driven approach from claude.md:

1. **Phase 1: Interface Design**
   - Define TypeScript interfaces first
   - Add JSDoc comments
   - Run `npx tsc --noEmit` to verify
   - Git commit

2. **Phase 2: Core Implementation**
   - Implement core logic only
   - Add private helper methods
   - Error handling required
   - Run ESLint: `npm run lint`
   - Git commit

3. **Phase 3: Unit Testing**
   - Write test scenarios (target: 90% coverage)
   - Cover all public methods and error cases
   - Git commit

4. **Phase 4: Integration**
   - Test with other components
   - Create usage examples
   - Git commit and tag

### Error Handling Requirements

All components must implement:
- Input validation before processing
- Type guards for runtime type checking
- Defensive copying for mutable inputs
- Try-catch with specific error types
- Clear error messages with resolution hints

### Code Style

- Prefer named exports over default exports
- Use TypeScript `interface` for object shapes
- No `any` types (use `unknown` if necessary)
- JSDoc comments on all public APIs
- File naming: PascalCase for components, camelCase for utilities

### Code Quality Rules

**IMPORTANT: Prevent Duplicate and Error-Prone Code**

1. **Before Writing Code**:
   - Check if similar functionality already exists
   - Search for existing utilities, components, or helpers
   - Reuse existing code instead of creating duplicates

2. **Avoid Common Errors**:
   - **Never** use deprecated APIs or libraries
   - **Never** commit code with TypeScript errors (`npx tsc --noEmit` must pass)
   - **Never** commit code with ESLint errors (`npm run lint` must pass)
   - **Always** test code before committing

3. **DRY (Don't Repeat Yourself)**:
   - If you write the same code twice, extract it into a utility function
   - If you see repeated patterns, create a reusable component
   - Keep functions small and focused (Single Responsibility Principle)

4. **Error Prevention Checklist**:
   ```typescript
   // ❌ BAD: Duplicate code
   function getUserName(user: User) {
     return user.firstName + ' ' + user.lastName;
   }
   function getAuthorName(author: Author) {
     return author.firstName + ' ' + author.lastName;  // Duplicate!
   }

   // ✅ GOOD: Reusable utility
   function getFullName(person: { firstName: string; lastName: string }) {
     return `${person.firstName} ${person.lastName}`;
   }
   ```

5. **Code Review Self-Checklist**:
   - [ ] No duplicate code or logic
   - [ ] No TypeScript errors
   - [ ] No ESLint warnings
   - [ ] All imports are used
   - [ ] All variables are used
   - [ ] Functions have clear, descriptive names
   - [ ] Complex logic has comments
   - [ ] Edge cases are handled

6. **Before Committing**:
   ```bash
   # Run these commands to catch errors early
   npx tsc --noEmit        # Check TypeScript errors
   npm run lint            # Check ESLint errors
   npm run build           # Ensure build succeeds
   ```

## Firebase Integration

The Firebase SDK is initialized in `src/lib/firebase.ts`:
- Singleton pattern prevents duplicate initialization
- Analytics only initialized client-side (`typeof window !== 'undefined'`)
- Exports: `app`, `auth`, `db`, `storage`, `analytics`

## Korean Public Data API Context

This platform targets Korean government APIs that have:
- **Mixed auth schemes**: Some use URL-encoded keys (중앙부처), others use decoded keys (지자체)
- **Different coordinate systems**: WGS84 (GPS), GRS80 (Korea standard), Bessel (legacy)
- **Common errors**: Traffic limits, expired keys, CORS issues
- **Goal**: Reduce integration time from 2-3 days to 3 lines of code

### API Authentication Types

**Important**: Public Data Portal uses service key authentication only (no OAuth 2.0).

```typescript
// Correct API call pattern
async function callPublicDataAPI(endpoint: string, params: Record<string, string>) {
  const apiKey = process.env.PUBLIC_DATA_API_KEY;

  const url = new URL(endpoint, 'https://apis.data.go.kr');
  url.searchParams.set('serviceKey', apiKey); // Add service key

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await axios.get(url.toString());
  return response.data;
}
```

**API Key Security**:
- Store in environment variables only
- Never hardcode or commit to Git
- Mask in logs: `${key.substring(0, 4)}****`
- Check expiration dates regularly

### Coordinate Systems

Korean public data uses multiple coordinate systems. Use proj4 for conversion.

```typescript
// Accurate coordinate system definitions (verified 2025-11-17)
const COORDINATE_SYSTEMS = {
  // WGS84 (GPS standard)
  WGS84: {
    epsg: 'EPSG:4326',
    proj4: '+proj=longlat +datum=WGS84 +no_defs'
  },

  // GRS80 Central (most common in Korean APIs)
  GRS80_CENTRAL: {
    epsg: 'EPSG:5186',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs'
  },

  // Bessel Central (legacy)
  BESSEL_CENTRAL: {
    epsg: 'EPSG:5174',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=127 +k=0.9996 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,687.05,0,0,0,0'
  },

  // UTM-K
  UTM_K: {
    epsg: 'EPSG:5179',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs'
  }
};

// Usage with proj4
import proj4 from 'proj4';

// Register definitions
Object.entries(COORDINATE_SYSTEMS).forEach(([key, sys]) => {
  proj4.defs(sys.epsg, sys.proj4);
});

// Convert coordinates
const [lon, lat] = proj4('EPSG:5186', 'EPSG:4326', [200000, 600000]);
// Result: Seoul City Hall coordinates
```

**Coordinate Validation**:
- GRS80_CENTRAL: X range 100000-300000, Y range 400000-800000
- WGS84: Longitude 124-132, Latitude 33-39 (Korean peninsula)
- Always validate input before conversion

### API Approval Process

```typescript
const APPROVAL_TIMELINE = {
  instant: {
    duration: 'Immediate',
    apis: ['Address API', 'Postal Code API', 'Administrative District API']
  },

  standard: {
    duration: '1-3 business days',
    apis: ['Real Estate Transactions', 'Building Registry', 'Business Registration']
  },

  extended: {
    duration: '5-7 business days',
    apis: ['Personal Information APIs', 'Financial Data', 'Medical Data']
  }
};
```

### Rate Limiting

Most public data APIs have rate limits:
- **Default**: 1,000 requests per hour
- **Premium**: 10,000 requests per hour (申請 required)
- **429 Error**: Wait and retry with exponential backoff

```typescript
// Implement retry logic with exponential backoff
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}
```

### Common Issues and Solutions

**1. Coordinate Conversion Errors**
- **Problem**: Converted coordinates are off by hundreds of meters
- **Solution**: Verify input coordinate system, check EPSG code
- **Debug**: Test with known reference point (e.g., Seoul City Hall: 126.9780, 37.5665)

**2. API Call Failures**
- **Status 401**: Invalid or expired API key → Regenerate from data.go.kr
- **Status 429**: Rate limit exceeded → Implement retry with backoff
- **Status 500**: Server error → Retry after delay
- **CORS errors**: Use server-side API routes (Next.js API routes)

**3. Response Parsing Errors**
- **Problem**: XML/JSON parsing fails
- **Solution**: Use Zod schemas for validation
- **Tip**: Different APIs return different formats (XML vs JSON)

```typescript
// Always validate API responses
import { z } from 'zod';

const AddressSchema = z.object({
  roadAddr: z.string(),
  jibunAddr: z.string(),
  zipNo: z.string(),
  latitude: z.number(),
  longitude: z.number()
});

const response = await callAPI(params);
const validated = AddressSchema.parse(response.data);
```

### Security Best Practices

1. **Environment Variables**:
   - Use `.env.local` for development
   - Never commit `.env` files
   - Use Vercel Environment Variables for production

2. **API Key Management**:
   - Rotate keys every 6 months
   - Monitor expiration dates
   - Use separate keys for dev/staging/production

3. **Input Validation**:
   - Always validate user input with Zod
   - Sanitize queries before sending to external APIs
   - Implement rate limiting per user/IP

4. **Error Logging**:
   - Log errors without exposing sensitive data
   - Mask API keys in logs
   - Use structured logging (Winston recommended)

Refer to `doc/Korea_Public_Data_API_Complete_Guide_v3.0.0.md` for API-specific details and `doc/korean-development-guide.md` for comprehensive development patterns.

## Working with Claude Code

When implementing new features:
1. **Provide context**: Specify component name, location, dependencies, constraints
2. **Step-by-step**: Request interface → implementation → tests → integration
3. **Error-first**: Always specify error cases alongside happy path
4. **Request reviews**: Ask Claude to review for SOLID principles, security, performance

Example prompt structure:
```
Create [ComponentName] with the following:

[Context]
- Location: src/[path]
- Purpose: [one sentence]
- Dependencies: [list]

[Requirements]
1. [requirement 1]
2. [requirement 2]

[Constraints]
- [constraint 1]
- [constraint 2]

[Test Coverage]
- Unit tests: 90%
```

See `claude.md` for extensive Korean-language examples.

## Documentation

- **PRD**: Product vision, user personas, feature requirements
- **TRD**: Technical architecture, component specifications, API contracts
- **API Guide**: Korean public data API quirks and authentication details
- **claude.md**: Detailed Korean guide for Claude collaboration patterns (legacy reference)
