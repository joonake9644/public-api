# Claude AI 개발 가이드 - 한국 공공데이터 API 프로젝트
**Cursor & Windsurf IDE 최적화 설정 v4.0**

## 📋 문서 정보
- **작성일**: 2025-11-17
- **버전**: 4.0 (전문가 검토 반영)
- **대상**: Claude Code, Cursor IDE, Windsurf IDE
- **프로젝트**: Korean Public Data API Integration System

---

## 목차
1. [프로젝트 개요](#1-프로젝트-개요)
2. [AI 도구 설정](#2-ai-도구-설정)
3. [핵심 지식](#3-핵심-지식)
4. [코딩 규칙](#4-코딩-규칙)
5. [일반적인 작업](#5-일반적인-작업)
6. [오류 해결](#6-오류-해결)
7. [테스트 가이드](#7-테스트-가이드)
8. [배포 가이드](#8-배포-가이드)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 목적
한국 공공데이터포털(data.go.kr)의 다양한 API를 통합하여 개발자 친화적인 인터페이스를 제공하는 시스템을 구축합니다.

### 1.2 기술 스택
```typescript
const PROJECT_STACK = {
  // Frontend
  framework: 'Next.js 16.0.3',
  react: 'React 19.2.0',
  language: 'TypeScript 5.x',
  styling: 'Tailwind CSS 4.x',

  // Backend (Firebase)
  runtime: 'Node.js 20+',
  database: 'Firebase Firestore',
  auth: 'Firebase Authentication',
  storage: 'Firebase Storage',
  analytics: 'Firebase Analytics',

  // External APIs
  publicData: '공공데이터포털 API',
  coordinate: 'proj4 좌표변환',

  // Tools
  deployment: 'Vercel',
  monitoring: 'Sentry (optional)',
  ci_cd: 'GitHub Actions (optional)'
};
```

### 1.3 프로젝트 구조
```
public_api/
├── app/                  # Next.js 16 App Router
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Home page
│   └── globals.css       # Global Tailwind styles
├── src/
│   └── lib/
│       └── firebase.ts   # Firebase initialization (Auth, Firestore, Storage, Analytics)
├── public/               # Static assets
├── doc/                  # Technical documentation
│   ├── PRD_Product_Requirements_Document.md
│   ├── TRD_Technical_Requirements_Document.md
│   ├── Korea_Public_Data_API_Complete_Guide_v3.0.0.md
│   └── korean-development-guide.md  # 이 문서
├── tests/                # 테스트 (구현 예정)
│   ├── unit/             # 단위 테스트
│   ├── integration/      # 통합 테스트
│   └── e2e/              # E2E 테스트
└── CLAUDE.md             # Claude Code 참조 가이드
```

**주요 디렉토리 설명**:
- `app/`: Next.js 16 App Router 구조
- `src/lib/`: 공통 라이브러리 및 Firebase 설정
- `doc/`: 프로젝트 문서 (PRD, TRD, API 가이드)
- `tests/`: 테스트 파일 (향후 구현 예정)

---

## 2. AI 도구 설정

### 2.1 Cursor IDE 설정

#### .cursorrules 파일
```yaml
# .cursorrules
version: "1.0"
name: "Korean Public Data API Project"

context:
  - "이 프로젝트는 한국 공공데이터 API를 통합하는 Next.js 16 프로젝트입니다"
  - "TypeScript와 Firebase를 사용합니다"
  - "모든 코드는 타입 안전성을 보장해야 합니다"
  - "보안과 성능을 최우선으로 합니다"

rules:
  # 일반 규칙
  - "항상 TypeScript strict 모드 사용"
  - "모든 함수에 JSDoc 주석 작성"
  - "에러는 반드시 try-catch로 처리"
  - "API 키는 절대 하드코딩 금지"

  # 코딩 스타일
  - "함수명은 동사로 시작 (get, fetch, create, update, delete)"
  - "상수는 UPPER_SNAKE_CASE 사용"
  - "인터페이스는 'I' 접두사 없이 PascalCase 사용"
  - "컴포넌트 파일은 PascalCase, 유틸리티는 camelCase"

  # 보안 규칙
  - "환경변수는 process.env에서만 로드"
  - "사용자 입력은 항상 검증 (Zod 사용)"
  - "Firebase SDK만 사용 (직접 데이터베이스 쿼리 금지)"
  - "API 응답에서 민감 정보 제거"
  
  # 성능 규칙
  - "데이터베이스 쿼리는 select로 필요한 필드만 조회"
  - "반복적인 API 호출은 캐싱 사용"
  - "대용량 데이터는 페이지네이션 적용"
  - "이미지는 Next.js Image 컴포넌트 사용"

file_patterns:
  typescript:
    - "*.ts"
    - "*.tsx"
  config:
    - "*.config.js"
    - "*.config.ts"
  test:
    - "*.test.ts"
    - "*.spec.ts"

ignore_patterns:
  - "node_modules/**"
  - ".next/**"
  - "dist/**"
  - "coverage/**"

preferred_libraries:
  api_client: "axios + axios-retry"
  validation: "zod"
  testing: "vitest"
  coordinate: "proj4"
  logging: "winston"
```

### 2.2 Windsurf MCP 서버 설정

```json
// ~/.windsurf/mcp.json
{
  "mcpServers": {
    "korean-public-data": {
      "command": "node",
      "args": ["/path/to/mcp-server.js"],
      "env": {
        "PUBLIC_DATA_API_KEY": "${PUBLIC_DATA_API_KEY}",
        "NEXT_PUBLIC_FIREBASE_API_KEY": "${NEXT_PUBLIC_FIREBASE_API_KEY}",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID": "${NEXT_PUBLIC_FIREBASE_PROJECT_ID}"
      }
    }
  }
}
```

### 2.3 VS Code 설정

```json
// .vscode/settings.json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,
  
  // Tailwind CSS
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  
  // 파일 연결
  "files.associations": {
    "*.css": "tailwindcss"
  },
  
  // 추천 확장
  "recommendations": [
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss"
  ]
}
```

---

## 3. 핵심 지식

### 3.1 공공데이터 API 인증 (중요 수정)

**⚠️ 중요한 수정 사항 (2025-11-17)**:

```typescript
/**
 * ❌ 잘못된 정보 (구 문서)
 * - "OAuth 2.0은 2025년에 전환 예정"
 * - 이 정보는 공식적으로 확인되지 않음
 * 
 * ✅ 올바른 정보 (현재)
 * - 공공데이터포털은 일반 인증키만 지원
 * - OAuth 2.0 전환 계획 없음
 * - 인증키는 쿼리 파라미터로 전달
 */

// 올바른 API 호출 예시
async function callPublicDataAPI(endpoint: string, params: Record<string, string>) {
  const apiKey = process.env.PUBLIC_DATA_API_KEY; // 환경변수에서만 로드
  
  const url = new URL(endpoint, 'https://apis.data.go.kr');
  url.searchParams.set('serviceKey', apiKey); // 인증키 추가
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  const response = await axios.get(url.toString());
  return response.data;
}
```

### 3.2 좌표계 변환 (수정 완료)

**올바른 EPSG 코드와 proj4 파라미터**:

```typescript
/**
 * ✅ 정확한 좌표계 정의 (2025-11-17 검증 완료)
 */
const COORDINATE_SYSTEMS = {
  // WGS84 (GPS)
  WGS84: {
    epsg: 'EPSG:4326',
    proj4: '+proj=longlat +datum=WGS84 +no_defs'
  },
  
  // GRS80 중부원점 (가장 많이 사용)
  GRS80_CENTRAL: {
    epsg: 'EPSG:5186',
    proj4: '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs'
  },
  
  // Bessel 중부원점 (구 좌표계)
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

// 사용 예시
import proj4 from 'proj4';

// proj4 정의 등록
Object.entries(COORDINATE_SYSTEMS).forEach(([key, sys]) => {
  proj4.defs(sys.epsg, sys.proj4);
});

// 변환
const [lon, lat] = proj4('EPSG:5186', 'EPSG:4326', [200000, 600000]);
console.log({ lon, lat }); // 서울시청 좌표
```

### 3.3 API 승인 프로세스 (수정 완료)

```typescript
/**
 * ✅ 정확한 승인 소요시간
 */
const APPROVAL_TIMELINE = {
  // 즉시 승인 (자동)
  instant: {
    duration: '즉시',
    apis: ['주소 API', '우편번호 API', '행정구역 API']
  },
  
  // 1-3 영업일
  standard: {
    duration: '1-3 영업일',
    apis: ['부동산 실거래가', '건축물대장', '사업자등록']
  },
  
  // 5-7 영업일 (심사 필요)
  extended: {
    duration: '5-7 영업일',
    apis: ['개인정보 포함 API', '금융 데이터', '의료 데이터']
  }
};

/**
 * 활용 신청 작성 팁
 */
function writeGoodApplication() {
  return {
    purpose: "구체적인 서비스 목적 설명 (예: 대학생 원룸 검색 서비스)",
    usage: "데이터 활용 방법 상세 기술",
    period: "명확한 사용 기간",
    expected_volume: "예상 조회 건수"
  };
}
```

### 3.4 보안 핵심 원칙

```typescript
/**
 * ✅ API 키 보안 (필수)
 */
class ApiKeySecurityGuide {
  // 1. 환경변수에서만 로드
  loadKey() {
    const key = process.env.PUBLIC_DATA_API_KEY;
    if (!key) throw new Error('API key not found');
    return key;
  }
  
  // 2. 로그에서 마스킹
  maskKey(key: string) {
    return `${key.substring(0, 4)}****`;
  }
  
  // 3. 클라이언트에 노출 금지
  async fetchData(query: string) {
    // ❌ 잘못된 방법
    // return { apiKey: this.loadKey(), data: ... };
    
    // ✅ 올바른 방법
    const data = await this.callAPI(query);
    return { data }; // API 키 제외
  }
  
  // 4. 만료 체크
  checkExpiry() {
    const expiry = process.env.API_KEY_EXPIRY;
    const daysRemaining = daysDiff(new Date(), new Date(expiry));
    
    if (daysRemaining < 30) {
      this.sendAlert('API 키가 곧 만료됩니다');
    }
  }
}
```

### 3.5 Rate Limiting

```typescript
/**
 * ✅ Rate Limit 구현 (예시)
 *
 * 주의: 이 예시는 Redis를 사용합니다.
 * 실제 프로젝트에서는:
 * 1. Firebase Firestore로 구현 (트랜잭션 사용)
 * 2. 메모리 기반 Map 사용 (단일 서버 환경)
 * 3. Vercel Rate Limiting API 사용 (권장)
 */
async function checkRateLimit(userId: string): Promise<boolean> {
  const key = `ratelimit:${userId}`;
  const limit = 1000; // 시간당 1000 요청
  const window = 3600000; // 1시간 (ms)

  // Redis 예시 (실제 프로젝트에서는 사용 안 함)
  // const redis = getRedisClient();
  // const current = await redis.incr(key);

  // 대안: 메모리 기반 Map (개발용)
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
  const now = Date.now();
  const userLimit = rateLimitMap.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + window });
    return true;
  }

  if (userLimit.count >= limit) {
    return false;
  }

  userLimit.count++;
  return true;
}

// API Route에서 사용
export async function GET(req: Request) {
  const userId = getUserId(req);
  
  if (!await checkRateLimit(userId)) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  // 정상 처리
  return Response.json({ data: ... });
}
```

---

## 4. 코딩 규칙

### 4.1 TypeScript 규칙

```typescript
/**
 * ✅ 좋은 예시
 */

// 1. 명시적 타입 정의
interface AddressQuery {
  keyword: string;
  pageNo?: number;
  countPerPage?: number;
}

interface AddressResult {
  roadAddr: string;
  jibunAddr: string;
  zipNo: string;
  latitude: number;
  longitude: number;
}

// 2. 제네릭 사용
async function fetchData<T>(
  endpoint: string,
  validator: z.ZodSchema<T>
): Promise<T> {
  const response = await axios.get(endpoint);
  return validator.parse(response.data);
}

// 3. 유니온 타입
type APIResult<T> = 
  | { success: true; data: T }
  | { success: false; error: ErrorInfo };

// 4. Enum 대신 const assertion
const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
} as const;

type Status = typeof STATUS[keyof typeof STATUS];

/**
 * ❌ 나쁜 예시
 */

// any 사용
function badExample(data: any) { // ❌
  return data.something;
}

// 타입 단언 남용
const result = response.data as SomeType; // ❌

// 암시적 any
function noReturnType(x) { // ❌
  return x * 2;
}
```

### 4.2 에러 처리 규칙

```typescript
/**
 * ✅ 올바른 에러 처리
 */

// 1. 커스텀 에러 클래스
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// 2. try-catch 사용
async function fetchAddress(query: string) {
  try {
    const response = await api.get('/address', { params: { query } });
    return AddressSchema.parse(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      throw new APIError(
        'External API failed',
        error.response?.status || 500,
        'EXTERNAL_API_ERROR'
      );
    }
    
    if (error instanceof z.ZodError) {
      throw new APIError(
        'Invalid response data',
        422,
        'VALIDATION_ERROR'
      );
    }
    
    throw error;
  }
}

// 3. 에러 로깅
import logger from '@/lib/logger';

try {
  await dangerousOperation();
} catch (error) {
  logger.error('Operation failed', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: { userId, timestamp: new Date() }
  });
  
  throw error; // 재던지기
}
```

### 4.3 비동기 처리 규칙

```typescript
/**
 * ✅ async/await 사용
 */

// 병렬 처리
async function fetchMultipleAddresses(queries: string[]) {
  const promises = queries.map(query => fetchAddress(query));
  return await Promise.all(promises);
}

// 순차 처리 (의존성 있을 때)
async function processSequentially() {
  const address = await fetchAddress(query);
  const building = await fetchBuilding(address.id);
  return { address, building };
}

// 타임아웃 추가
async function fetchWithTimeout<T>(
  promise: Promise<T>,
  timeout: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Timeout')), timeout);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * ❌ 피해야 할 패턴
 */

// Promise 체인 (async/await 사용 권장)
fetch('/api/data')
  .then(res => res.json())
  .then(data => process(data))
  .catch(err => handle(err)); // ❌

// await 없이 Promise 반환
async function bad() {
  return fetchData(); // ❌ await 누락
}
```

### 4.4 성능 최적화 규칙

```typescript
/**
 * ✅ Firebase Firestore 쿼리 최적화
 */
import { collection, query, where, limit, getDocs, orderBy, startAfter } from 'firebase/firestore';
import { db } from '@/src/lib/firebase';

// 필요한 필드만 조회 (select)
const usersRef = collection(db, 'users');
const q = query(usersRef, where('status', '==', 'active'));
const snapshot = await getDocs(q);
const users = snapshot.docs.map(doc => ({
  id: doc.id,
  name: doc.data().name,
  email: doc.data().email
  // password 제외
}));

// 페이지네이션 (Cursor-based)
const addressesRef = collection(db, 'addresses');
const firstPage = query(
  addressesRef,
  orderBy('createdAt', 'desc'),
  limit(pageSize)
);
const firstSnapshot = await getDocs(firstPage);

// 다음 페이지
const lastDoc = firstSnapshot.docs[firstSnapshot.docs.length - 1];
const nextPage = query(
  addressesRef,
  orderBy('createdAt', 'desc'),
  startAfter(lastDoc),
  limit(pageSize)
);

// 인덱스 활용 (복합 쿼리는 Firebase Console에서 인덱스 생성 필요)
const complexQuery = query(
  collection(db, 'buildings'),
  where('city', '==', 'Seoul'),
  where('status', '==', 'active'),
  orderBy('price', 'desc'),
  limit(10)
);

/**
 * ✅ 캐싱 활용 (메모리 기반)
 *
 * 주의: 프로덕션 환경에서는 Vercel KV (Redis) 사용 권장
 */
import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
  max: 500, // 최대 500개 항목
  ttl: 1000 * 60 * 60 // 1시간
});

async function getCachedData(key: string) {
  // 1. 캐시 확인
  const cached = cache.get(key);
  if (cached) {
    return cached;
  }

  // 2. Firestore 조회
  const docRef = doc(db, 'data', key);
  const docSnap = await getDoc(docRef);
  const data = docSnap.exists() ? docSnap.data() : null;

  // 3. 캐시 저장
  if (data) {
    cache.set(key, data);
  }

  return data;
}
```

---

## 5. 일반적인 작업

### 5.1 새 API 엔드포인트 추가

```typescript
/**
 * 단계별 가이드
 */

// 1. API Route 생성 (app/api/example/route.ts)
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// 요청 스키마 정의
const QuerySchema = z.object({
  keyword: z.string().min(1),
  page: z.coerce.number().int().min(1).default(1)
});

export async function GET(request: NextRequest) {
  try {
    // 1. 파라미터 추출 및 검증
    const searchParams = request.nextUrl.searchParams;
    const params = QuerySchema.parse({
      keyword: searchParams.get('keyword'),
      page: searchParams.get('page')
    });
    
    // 2. Rate Limit 체크
    const rateLimitOk = await checkRateLimit(request);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }
    
    // 3. 비즈니스 로직
    const data = await fetchExampleData(params);
    
    // 4. 응답
    return NextResponse.json({
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        page: params.page
      }
    });
    
  } catch (error) {
    return handleError(error);
  }
}

// 2. Service 계층 생성 (lib/services/exampleService.ts)
export class ExampleService {
  private cache: RedisCache;
  
  constructor() {
    this.cache = new RedisCache();
  }
  
  async fetchData(params: QueryParams) {
    // 캐시 확인
    const cached = await this.cache.get(params);
    if (cached) return cached;
    
    // API 호출
    const data = await this.callExternalAPI(params);
    
    // 검증
    const validated = DataSchema.parse(data);
    
    // 캐시 저장
    await this.cache.set(params, validated, { ttl: 3600 });
    
    return validated;
  }
}

// 3. 테스트 작성 (tests/api/example.test.ts)
describe('GET /api/example', () => {
  it('should return data with valid params', async () => {
    const response = await fetch('/api/example?keyword=test&page=1');
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
  });
  
  it('should return 400 with invalid params', async () => {
    const response = await fetch('/api/example?keyword=');
    expect(response.status).toBe(400);
  });
});
```

### 5.2 좌표 변환 추가

```typescript
/**
 * 좌표 변환 API 추가
 */

// app/api/coordinate/transform/route.ts
import { CoordinateEngine } from '@/lib/coordinate/engine';

const RequestSchema = z.object({
  x: z.number(),
  y: z.number(),
  from: z.enum(['WGS84', 'GRS80_CENTRAL', 'BESSEL_CENTRAL', 'UTM_K']),
  to: z.enum(['WGS84', 'GRS80_CENTRAL', 'BESSEL_CENTRAL', 'UTM_K'])
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const params = RequestSchema.parse(body);
    
    const engine = CoordinateEngine.getInstance();
    const result = engine.transform(
      { x: params.x, y: params.y },
      params.from,
      params.to
    );
    
    return NextResponse.json({
      success: true,
      data: {
        input: { x: params.x, y: params.y, system: params.from },
        output: { ...result, system: params.to }
      }
    });
  } catch (error) {
    return handleError(error);
  }
}
```

### 5.3 캐시 전략 적용

```typescript
/**
 * 캐싱 패턴
 */

// 1. 2단계 캐싱 (L1: 메모리, L2: Redis)
import { LRUCache } from 'lru-cache';

const memoryCache = new LRUCache({
  max: 500,
  ttl: 5 * 60 * 1000 // 5분
});

async function getCachedData(key: string) {
  // L1 확인
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }
  
  // L2 확인
  const redisData = await redis.get(key);
  if (redisData) {
    const parsed = JSON.parse(redisData);
    memoryCache.set(key, parsed); // L1에 저장
    return parsed;
  }
  
  // DB 조회
  const data = await db.query(key);
  
  // 양쪽 캐시에 저장
  memoryCache.set(key, data);
  await redis.setex(key, 3600, JSON.stringify(data));
  
  return data;
}

// 2. 캐시 무효화
async function updateData(id: string, newData: unknown) {
  // DB 업데이트
  await db.update(id, newData);
  
  // 캐시 무효화
  memoryCache.delete(`item:${id}`);
  await redis.del(`item:${id}`);
  await redis.del('list:all'); // 목록 캐시도 무효화
}
```

---

## 6. 오류 해결

### 6.1 좌표 변환 오류

```typescript
/**
 * 문제: 변환 결과가 이상함
 */

// 디버깅 단계
class CoordinateDebugger {
  debug(point: Point, fromSystem: string, toSystem: string) {
    console.log('=== 좌표 변환 디버깅 ===');
    
    // 1. 입력 확인
    console.log('Input:', point);
    console.log('From:', fromSystem);
    console.log('To:', toSystem);
    
    // 2. 좌표계 자동 감지
    const detected = this.detectSystem(point);
    console.log('Detected system:', detected);
    
    if (detected !== fromSystem) {
      console.warn('⚠️ 입력한 좌표계와 감지된 좌표계가 다릅니다!');
    }
    
    // 3. 범위 확인
    if (fromSystem === 'GRS80_CENTRAL') {
      if (point.x < 100000 || point.x > 300000) {
        console.warn('⚠️ X 좌표가 예상 범위를 벗어났습니다');
      }
      if (point.y < 400000 || point.y > 800000) {
        console.warn('⚠️ Y 좌표가 예상 범위를 벗어났습니다');
      }
    }
    
    // 4. 테스트 포인트와 비교
    const testPoint = TEST_POINTS.seoul_city_hall;
    console.log('서울시청 테스트:', testPoint);
    
    // 5. 실제 변환
    try {
      const result = engine.transform(point, fromSystem, toSystem);
      console.log('Result:', result);
      return result;
    } catch (error) {
      console.error('❌ 변환 실패:', error);
      throw error;
    }
  }
}
```

### 6.2 API 호출 실패

```typescript
/**
 * 문제: 공공데이터 API 호출 실패
 */

// 체크리스트
async function diagnoseAPIError(error: unknown) {
  console.log('=== API 에러 진단 ===');
  
  if (axios.isAxiosError(error)) {
    // 1. 상태 코드 확인
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    
    // 2. 에러 메시지
    console.log('Error:', error.response?.data);
    
    // 3. API 키 확인
    const apiKey = process.env.PUBLIC_DATA_API_KEY;
    if (!apiKey) {
      console.error('❌ API 키가 없습니다');
      return;
    }
    console.log('API 키:', `${apiKey.substring(0, 4)}****`);
    
    // 4. 요청 URL 확인
    console.log('Request URL:', error.config?.url);
    
    // 5. 네트워크 에러
    if (error.code === 'ECONNREFUSED') {
      console.error('❌ 네트워크 연결 실패');
    }
    
    // 6. 타임아웃
    if (error.code === 'ECONNABORTED') {
      console.error('❌ 요청 시간 초과');
    }
    
    // 7. 일반적인 해결책
    console.log('\n해결 방법:');
    if (error.response?.status === 401) {
      console.log('- API 키 확인 필요');
      console.log('- 공공데이터포털에서 재발급');
    } else if (error.response?.status === 429) {
      console.log('- Rate Limit 초과');
      console.log('- 잠시 대기 후 재시도');
    } else if (error.response?.status === 500) {
      console.log('- 공공데이터포털 서버 오류');
      console.log('- 잠시 후 재시도');
    }
  }
}
```

### 6.3 캐시 미스율 높음

```typescript
/**
 * 문제: 캐시 히트율이 낮음
 */

// 캐시 분석
class CacheAnalyzer {
  async analyze() {
    const stats = await redis.info('stats');
    
    console.log('=== 캐시 통계 ===');
    console.log('Keyspace hits:', stats.keyspace_hits);
    console.log('Keyspace misses:', stats.keyspace_misses);
    
    const hitRate = stats.keyspace_hits / 
      (stats.keyspace_hits + stats.keyspace_misses);
    console.log('Hit rate:', (hitRate * 100).toFixed(2) + '%');
    
    if (hitRate < 0.7) {
      console.log('\n⚠️ 캐시 히트율이 낮습니다 (목표: 70%)');
      console.log('개선 방법:');
      console.log('1. TTL 증가');
      console.log('2. 캐시 키 전략 재검토');
      console.log('3. 프리페칭 고려');
    }
    
    // 캐시 키 패턴 분석
    const keys = await redis.keys('*');
    const patterns = {};
    keys.forEach(key => {
      const pattern = key.split(':')[0];
      patterns[pattern] = (patterns[pattern] || 0) + 1;
    });
    
    console.log('\n캐시 키 분포:');
    Object.entries(patterns).forEach(([pattern, count]) => {
      console.log(`${pattern}: ${count}개`);
    });
  }
}
```

---

## 7. 테스트 가이드

### 7.1 단위 테스트

```typescript
// tests/unit/coordinate.test.ts
import { describe, it, expect } from 'vitest';
import { CoordinateEngine } from '@/lib/coordinate/engine';

describe('CoordinateEngine', () => {
  const engine = CoordinateEngine.getInstance();
  
  describe('transform', () => {
    it('should transform GRS80 to WGS84 correctly', () => {
      const input = { x: 200000, y: 600000 };
      const result = engine.transform(input, 'GRS80_CENTRAL', 'WGS84');
      
      expect(result.lon).toBeCloseTo(126.9780, 4);
      expect(result.lat).toBeCloseTo(37.5665, 4);
    });
    
    it('should handle same coordinate system', () => {
      const input = { lon: 126.9780, lat: 37.5665 };
      const result = engine.transform(input, 'WGS84', 'WGS84');
      
      expect(result).toEqual(input);
    });
    
    it('should throw error for invalid coordinates', () => {
      const invalid = { x: NaN, y: Infinity };
      
      expect(() => {
        engine.transform(invalid, 'GRS80_CENTRAL', 'WGS84');
      }).toThrow('Invalid coordinate values');
    });
  });
});
```

### 7.2 통합 테스트

```typescript
// tests/integration/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

describe('API Integration Tests', () => {
  let server: Server;
  
  beforeAll(async () => {
    server = await startTestServer();
  });
  
  afterAll(async () => {
    await server.close();
  });
  
  describe('GET /api/address', () => {
    it('should return address data', async () => {
      const response = await fetch(
        'http://localhost:3000/api/address?keyword=서울시청'
      );
      
      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('roadAddr');
      expect(data.data).toHaveProperty('latitude');
      expect(data.data).toHaveProperty('longitude');
    });
    
    it('should handle invalid keyword', async () => {
      const response = await fetch(
        'http://localhost:3000/api/address?keyword='
      );
      
      expect(response.status).toBe(400);
    });
    
    it('should respect rate limits', async () => {
      // 연속 요청
      const promises = Array(110).fill(null).map(() =>
        fetch('http://localhost:3000/api/address?keyword=test')
      );
      
      const results = await Promise.all(promises);
      const rateLimited = results.some(r => r.status === 429);
      
      expect(rateLimited).toBe(true);
    });
  });
});
```

### 7.3 E2E 테스트

```typescript
// tests/e2e/workflow.test.ts
import { test, expect } from '@playwright/test';

test.describe('Address Search Workflow', () => {
  test('user can search and view address details', async ({ page }) => {
    // 1. 홈페이지 방문
    await page.goto('http://localhost:3000');
    
    // 2. 검색어 입력
    await page.fill('[data-testid="search-input"]', '서울시청');
    await page.click('[data-testid="search-button"]');
    
    // 3. 결과 대기
    await page.waitForSelector('[data-testid="search-results"]');
    
    // 4. 결과 확인
    const results = await page.locator('[data-testid="result-item"]');
    await expect(results).toHaveCount(10);
    
    // 5. 첫 번째 결과 클릭
    await results.first().click();
    
    // 6. 상세 정보 확인
    await expect(page.locator('[data-testid="detail-road-addr"]'))
      .toContainText('서울특별시');
    await expect(page.locator('[data-testid="detail-map"]'))
      .toBeVisible();
  });
});
```

---

## 8. 배포 가이드

### 8.1 Vercel 배포

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 로그인
vercel login

# 3. 프로젝트 링크
vercel link

# 4. 환경변수 설정
vercel env add PUBLIC_DATA_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production

# 5. 배포
vercel --prod

# 6. 도메인 설정
vercel domains add yourdomain.com
```

### 8.2 환경변수 체크리스트

```bash
# Production 환경변수 (필수)
✅ PUBLIC_DATA_API_KEY                    # 공공데이터 API 키
✅ NEXT_PUBLIC_FIREBASE_API_KEY           # Firebase API 키
✅ NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN       # Firebase Auth 도메인
✅ NEXT_PUBLIC_FIREBASE_PROJECT_ID        # Firebase 프로젝트 ID
✅ NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET    # Firebase Storage
✅ NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID  # Firebase 메시징
✅ NEXT_PUBLIC_FIREBASE_APP_ID            # Firebase 앱 ID
✅ NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID    # Firebase Analytics
✅ NEXT_PUBLIC_APP_URL                    # 앱 URL
✅ NODE_ENV                                # production

# Optional
⭕ SENTRY_DSN                              # Sentry 에러 추적 (선택)
⭕ SLACK_WEBHOOK_URL                       # 알림용 (선택)
```

### 8.3 배포 전 체크리스트

```typescript
/**
 * 배포 전 확인 사항
 */
const PRE_DEPLOYMENT_CHECKLIST = {
  code: [
    '✅ TypeScript 컴파일 에러 없음',
    '✅ ESLint 에러 없음',
    '✅ 모든 테스트 통과',
    '✅ 빌드 성공'
  ],
  
  security: [
    '✅ API 키 하드코딩 없음',
    '✅ 환경변수 설정 완료',
    '✅ CORS 설정 확인',
    '✅ Rate Limiting 활성화'
  ],
  
  performance: [
    '✅ 이미지 최적화',
    '✅ 번들 크기 < 300KB',
    '✅ Lighthouse 점수 > 90',
    '✅ API 응답 시간 < 500ms'
  ],
  
  monitoring: [
    '✅ Sentry 설정',
    '✅ 로그 확인',
    '✅ 알림 설정',
    '✅ 헬스 체크 엔드포인트'
  ]
};

// 자동 체크 스크립트
async function preDeploymentCheck() {
  console.log('=== 배포 전 체크 ===\n');
  
  // 빌드 테스트
  execSync('npm run build');
  console.log('✅ Build successful');
  
  // 테스트 실행
  execSync('npm run test:ci');
  console.log('✅ All tests passed');
  
  // 환경변수 확인
  const requiredEnvVars = [
    'PUBLIC_DATA_API_KEY',
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID'
  ];
  
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      throw new Error(`Missing env var: ${envVar}`);
    }
  });
  console.log('✅ Environment variables OK');
  
  console.log('\n🚀 Ready to deploy!');
}
```

---

## 부록 A: 빠른 참조

### 명령어 치트시트

```bash
# 개발
npm run dev              # 개발 서버 시작
npm run build            # 프로덕션 빌드
npm run start            # 프로덕션 서버 시작

# 테스트
npm run test             # 단위 테스트
npm run test:watch       # 테스트 감시 모드
npm run test:e2e         # E2E 테스트
npm run test:coverage    # 커버리지 리포트

# 코드 품질
npm run lint             # ESLint 실행
npm run lint:fix         # ESLint 자동 수정
npm run format           # Prettier 포맷팅
npx tsc --noEmit         # TypeScript 타입 체크

# Firebase (향후 필요 시)
# Firebase CLI로 Firestore 규칙 배포, 함수 배포 등
# firebase deploy --only firestore:rules
# firebase deploy --only functions

# 배포
vercel                   # Preview 배포
vercel --prod            # Production 배포
vercel logs              # 로그 확인
```

### 자주 사용하는 코드 스니펫

```typescript
// 1. API Route 템플릿
export async function GET(request: NextRequest) {
  try {
    const params = validateParams(request);
    const data = await fetchData(params);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleError(error);
  }
}

// 2. Zod 스키마
const Schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(0).max(120).optional()
});

// 3. Firebase Firestore 쿼리
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
const q = query(
  collection(db, 'items'),
  where('status', '==', 'active'),
  orderBy('createdAt', 'desc'),
  limit(10)
);
const snapshot = await getDocs(q);
const result = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

// 4. 에러 처리
try {
  await operation();
} catch (error) {
  logger.error('Operation failed', { error });
  throw new CustomError('Message', 'CODE', 500);
}

// 5. 캐싱
const cached = await cache.get(key);
if (!cached) {
  const fresh = await fetchFresh();
  await cache.set(key, fresh, { ttl: 3600 });
  return fresh;
}
return cached;
```

---

**문서 버전**: v4.0 (2025-11-17)  
**작성자**: Joo beom  
**검토**: AI Expert Panel  
**다음 업데이트**: 2025-12-17
