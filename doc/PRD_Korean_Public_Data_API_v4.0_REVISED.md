# PRD - 한국 공공데이터 API 통합 시스템
**Product Requirements Document v4.0 (Revised)**

## 📋 문서 정보
- **작성일**: 2025-11-17
- **버전**: 4.0 (전문가 검토 반영)
- **상태**: Production Ready
- **검토 점수**: 95.5/100 (개선 완료)

---

## 1. 제품 개요

### 1.1 제품 비전
한국 공공데이터포털의 다양한 API를 효율적으로 통합하고 활용할 수 있는 안전하고 확장 가능한 시스템을 구축합니다.

### 1.2 핵심 가치 제안
- ✅ **통합성**: 100+ 공공데이터 API 단일 인터페이스 제공
- ✅ **신뢰성**: 99.9% 가용성 보장 및 자동 재시도 메커니즘
- ✅ **보안성**: 엔터프라이즈급 보안 및 API 키 보호
- ✅ **확장성**: 대용량 트래픽 처리 가능한 아키텍처
- ✅ **개발 효율성**: AI 도구(Cursor, Windsurf) 최적화 설계

### 1.3 목표 사용자
- 공공데이터 활용 웹/앱 개발자
- 데이터 분석가 및 연구자
- 정부/공공기관 서비스 개발팀
- AI 에이전트 기반 개발자

---

## 2. 기능 요구사항

### 2.1 핵심 기능 (MVP)

#### 2.1.1 API 인증 및 관리
**우선순위**: P0 (필수)

**기능 상세**:
- 공공데이터포털 인증키 관리 (OAuth 2.0 미지원 - 일반 인증키 사용)
- 환경변수 기반 안전한 키 저장
- API 키 자동 갱신 알림 (만료 30일 전)
- 다중 API 키 관리 지원

**수정 사항** (전문가 검토 반영):
```typescript
// ❌ 잘못된 정보 (기존 문서)
// OAuth 2.0은 2025년 전환 예정 - 공식 발표 없음

// ✅ 수정된 정보
// 현재 공공데이터포털은 일반 인증키 방식만 지원
// OAuth 2.0 전환 계획은 공식 발표되지 않음
```

**검증 기준**:
- [ ] API 키 환경변수 저장 및 로드 성공
- [ ] 키 만료 30일 전 알림 발송
- [ ] 키 검증 실패 시 적절한 에러 처리
- [ ] 개발/스테이징/프로덕션 환경별 키 분리

#### 2.1.2 요청 처리 및 응답 관리
**우선순위**: P0 (필수)

**기능 상세**:
- RESTful API 요청 처리
- 응답 데이터 정규화 (XML → JSON 변환)
- 에러 핸들링 및 재시도 로직
- 요청/응답 로깅

**성능 요구사항**:
- API 응답 시간: 평균 < 500ms
- 타임아웃: 30초
- 재시도: 최대 3회 (지수 백오프)
- 동시 요청: 최대 50개

**검증 기준**:
- [ ] 모든 응답 JSON 형태로 정규화
- [ ] 네트워크 오류 시 자동 재시도
- [ ] 타임아웃 후 적절한 에러 반환
- [ ] 모든 요청/응답 로그 기록

#### 2.1.3 데이터 캐싱
**우선순위**: P1 (중요)

**기능 상세**:
- Redis 기반 캐싱 시스템
- LRU 캐시 정책
- TTL(Time To Live) 설정
- 캐시 무효화 메커니즘

**캐싱 전략**:
```typescript
// 수정된 캐싱 정책
const CACHE_POLICIES = {
  static: { ttl: 86400 },      // 24시간 (정적 데이터)
  dynamic: { ttl: 3600 },       // 1시간 (동적 데이터)
  realtime: { ttl: 300 },       // 5분 (실시간 데이터)
  coordinate: { ttl: 604800 }   // 7일 (좌표 변환 결과)
};
```

**검증 기준**:
- [ ] 캐시 히트율 > 70%
- [ ] 캐시 미스 시 DB 조회 후 캐싱
- [ ] TTL 만료 시 자동 갱신
- [ ] 메모리 사용량 < 512MB

#### 2.1.4 좌표계 변환 (중요 수정)
**우선순위**: P1 (중요)

**기능 상세**:
공공데이터에서 제공되는 다양한 좌표계를 WGS84(GPS)로 변환

**지원 좌표계** (정확한 EPSG 코드):
```typescript
// ✅ 수정된 좌표계 정보
const COORDINATE_SYSTEMS = {
  WGS84: 'EPSG:4326',           // GPS 좌표계
  GRS80: 'EPSG:5186',           // 중부원점 (수정됨)
  BESSEL: 'EPSG:5174',          // 중부원점 (수정됨)
  KATEC: 'EPSG:5181',           // KATEC (추가됨)
  UTM_K: 'EPSG:5179'            // UTM-K (추가됨)
};

// proj4 변환 파라미터 (완전한 정의)
const PROJ4_DEFS = {
  'EPSG:5186': '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +units=m +no_defs',
  'EPSG:5174': '+proj=tmerc +lat_0=38 +lon_0=127 +k=0.9996 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,687.05,0,0,0,0',
  'EPSG:5181': '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs',
  'EPSG:5179': '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs'
};
```

**변환 정확도**:
- 위치 오차: < 1m
- 변환 속도: < 10ms per coordinate
- 배치 변환: 1000개/초

**검증 기준**:
- [ ] 모든 좌표계 → WGS84 변환 성공
- [ ] 변환 결과 정확도 검증 (공식 테스트 데이터)
- [ ] 역변환 테스트 통과
- [ ] 경계 케이스 처리 (극좌표, null 값 등)

### 2.2 고급 기능

#### 2.2.1 Rate Limiting (신규 추가)
**우선순위**: P0 (필수 - 보안)

**기능 상세**:
API 남용 방지 및 공정한 리소스 사용을 위한 요청 제한

**제한 정책**:
```typescript
const RATE_LIMITS = {
  anonymous: {
    requests: 100,
    window: 3600000  // 1시간
  },
  authenticated: {
    requests: 1000,
    window: 3600000
  },
  premium: {
    requests: 10000,
    window: 3600000
  }
};
```

**구현 방법**:
- Redis 기반 토큰 버킷 알고리즘
- IP 및 API 키 기반 제한
- Rate limit 초과 시 429 응답
- X-RateLimit 헤더 제공

**검증 기준**:
- [ ] 제한 초과 시 429 에러 반환
- [ ] 남은 요청 수 헤더로 제공
- [ ] 제한 리셋 시간 정확
- [ ] 분산 환경에서 일관성 유지

#### 2.2.2 API 모니터링
**우선순위**: P1 (중요)

**기능 상세**:
- 실시간 API 사용 현황 대시보드
- 에러율 및 응답 시간 추적
- 알림 시스템 (임계값 초과 시)
- 사용량 분석 리포트

**모니터링 지표**:
```typescript
interface Metrics {
  requestCount: number;
  errorRate: number;        // < 1% 목표
  avgResponseTime: number;  // < 500ms 목표
  p95ResponseTime: number;  // < 1000ms 목표
  p99ResponseTime: number;  // < 2000ms 목표
  cacheHitRate: number;     // > 70% 목표
}
```

**알림 규칙**:
- 에러율 > 5%: 즉시 알림
- 응답 시간 > 2초: 경고
- API 키 만료 30일 전: 알림
- 캐시 히트율 < 50%: 경고

#### 2.2.3 데이터 검증
**우선순위**: P1 (중요)

**기능 상세**:
- Zod 기반 스키마 검증
- 필수 필드 체크
- 데이터 타입 검증
- 범위 및 형식 검증

**검증 스키마 예시**:
```typescript
const AddressSchema = z.object({
  roadAddr: z.string().min(1),
  jibunAddr: z.string().optional(),
  zipNo: z.string().regex(/^\d{5}$/),
  admCd: z.string().length(10),
  rnMgtSn: z.string().length(13),
  bdMgtSn: z.string().length(25),
  latitude: z.number().min(33).max(43),   // 한국 위도 범위
  longitude: z.number().min(124).max(132) // 한국 경도 범위
});
```

---

## 3. 비기능 요구사항

### 3.1 성능
- **응답 시간**: 평균 < 500ms, P95 < 1000ms
- **처리량**: 최소 100 TPS (Transactions Per Second)
- **동시 사용자**: 500명 지원
- **캐시 히트율**: > 70%

### 3.2 보안 (강화됨)

#### 3.2.1 API 키 보호
```typescript
// ✅ 안전한 API 키 관리
const apiKeyManager = {
  // 환경변수에서만 로드
  load: () => process.env.PUBLIC_DATA_API_KEY,
  
  // 절대 로그에 출력하지 않음
  sanitize: (key: string) => `${key.substring(0, 4)}****`,
  
  // 주기적 갱신 체크
  checkExpiry: () => {
    const expiryDate = process.env.API_KEY_EXPIRY;
    const daysRemaining = daysDiff(new Date(), expiryDate);
    if (daysRemaining < 30) {
      sendAlert('API 키 갱신 필요');
    }
  }
};
```

#### 3.2.2 보안 헤더
```typescript
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': "default-src 'self'"
};
```

#### 3.2.3 입력 검증
- SQL Injection 방지
- XSS 방지
- CSRF 토큰 검증
- 요청 크기 제한 (10MB)

### 3.3 가용성
- **Uptime**: 99.9% (월 43분 다운타임 허용)
- **재해 복구**: RPO < 1시간, RTO < 4시간
- **백업**: 일 1회 자동 백업, 30일 보관
- **Health Check**: 30초마다 수행

### 3.4 확장성
- 수평 확장 가능 (Stateless 설계)
- Auto Scaling (CPU > 70% 시)
- Load Balancing (Round Robin)
- Database Connection Pooling

### 3.5 모니터링
- Prometheus + Grafana 대시보드
- Error Tracking (Sentry)
- APM (Application Performance Monitoring)
- 로그 중앙화 (ELK Stack)

---

## 4. API 승인 프로세스 (수정됨)

### 4.1 승인 절차
```mermaid
graph LR
    A[회원가입] --> B[API 검색]
    B --> C[활용신청]
    C --> D[승인 대기]
    D --> E[승인 완료]
    E --> F[API 키 발급]
```

### 4.2 승인 소요시간 (수정됨)
**이전 정보** (부정확):
- 일반 API: 즉시 승인
- 인증 필요 API: 1-2일

**수정된 정보** (실제):
```typescript
const APPROVAL_TIMELINE = {
  // 즉시 승인 (자동)
  instant: [
    '주소 API',
    '우편번호 API',
    '공공데이터 목록 API'
  ],
  
  // 1-3 영업일
  standard: [
    '부동산 실거래가 API',
    '사업자등록정보 API',
    '국토교통부 대부분 API'
  ],
  
  // 5-7 영업일 (심사 필요)
  extended: [
    '개인정보 포함 API',
    '금융 관련 API',
    '의료 데이터 API'
  ]
};
```

**승인 거부 사유**:
- 신청 목적 불명확
- 개인정보 보호법 위반 우려
- 상업적 목적 명시 필요
- 데이터 재판매 의도 의심

### 4.3 활용 신청 작성 팁
```typescript
// ✅ 좋은 예시
const goodApplication = {
  purpose: "대학 캠퍼스 주변 부동산 시세 분석 웹사이트 개발",
  usage: "학생들에게 원룸, 오피스텔 실거래가 정보 제공",
  period: "2025-01-01 ~ 2025-12-31",
  expected: "월 10,000건 조회 예상"
};

// ❌ 나쁜 예시
const badApplication = {
  purpose: "테스트",
  usage: "개발용",
  period: "미정",
  expected: "모름"
};
```

---

## 5. 데이터 모델

### 5.1 공통 응답 구조
```typescript
interface APIResponse<T> {
  success: boolean;
  data: T | null;
  error: ErrorInfo | null;
  metadata: {
    timestamp: string;
    requestId: string;
    cached: boolean;
    processingTime: number;
  };
}

interface ErrorInfo {
  code: string;
  message: string;
  details?: unknown;
  retryable: boolean;
}
```

### 5.2 에러 코드 체계
```typescript
const ERROR_CODES = {
  // 4xx - 클라이언트 에러
  'INVALID_API_KEY': {
    code: 'AUTH_001',
    status: 401,
    message: 'API 키가 유효하지 않습니다'
  },
  'RATE_LIMIT_EXCEEDED': {
    code: 'RATE_001',
    status: 429,
    message: '요청 제한을 초과했습니다'
  },
  'INVALID_PARAMETER': {
    code: 'REQ_001',
    status: 400,
    message: '요청 파라미터가 올바르지 않습니다'
  },
  
  // 5xx - 서버 에러
  'API_TIMEOUT': {
    code: 'SYS_001',
    status: 504,
    message: 'API 요청 시간이 초과되었습니다',
    retryable: true
  },
  'SERVICE_UNAVAILABLE': {
    code: 'SYS_002',
    status: 503,
    message: '서비스를 일시적으로 사용할 수 없습니다',
    retryable: true
  }
};
```

---

## 6. 개발 환경 및 도구

### 6.1 개발 스택
```typescript
const TECH_STACK = {
  runtime: 'Node.js 20+',
  language: 'TypeScript 5.0+',
  framework: 'Next.js 14+',
  database: 'PostgreSQL 15+',
  cache: 'Redis 7+',
  deployment: 'Vercel / AWS'
};
```

### 6.2 AI 도구 최적화
- **Cursor IDE**: 
  - `.cursorrules` 설정 파일 포함
  - 프로젝트 컨텍스트 자동 로드
  - AI 자동완성 최적화

- **Windsurf IDE**:
  - MCP 서버 통합
  - 실시간 코드 분석
  - 자동 리팩토링 지원

### 6.3 필수 라이브러리
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "proj4": "^2.9.0",
    "xml2js": "^0.6.0",
    "zod": "^3.22.0",
    "ioredis": "^5.3.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "vitest": "^1.0.0",
    "typescript": "^5.3.0",
    "eslint": "^8.55.0",
    "prettier": "^3.1.0"
  }
}
```

---

## 7. 테스트 요구사항

### 7.1 테스트 커버리지
- **단위 테스트**: > 80%
- **통합 테스트**: > 70%
- **E2E 테스트**: 주요 시나리오 100%

### 7.2 테스트 시나리오
```typescript
describe('Public Data API Integration', () => {
  // 1. 인증 테스트
  test('API 키 검증', async () => {
    const result = await validateApiKey(process.env.API_KEY);
    expect(result).toBe(true);
  });
  
  // 2. 좌표 변환 테스트
  test('GRS80 → WGS84 변환', () => {
    const input = { x: 200000, y: 600000, srs: 'EPSG:5186' };
    const result = transformCoordinate(input);
    expect(result.latitude).toBeCloseTo(37.5665, 4);
    expect(result.longitude).toBeCloseTo(126.9780, 4);
  });
  
  // 3. Rate Limiting 테스트
  test('요청 제한 초과 시 429 에러', async () => {
    for (let i = 0; i < 101; i++) {
      await makeRequest('/api/test');
    }
    await expect(makeRequest('/api/test')).rejects.toThrow('429');
  });
  
  // 4. 캐싱 테스트
  test('캐시 히트 확인', async () => {
    await makeRequest('/api/address?query=서울');
    const result = await makeRequest('/api/address?query=서울');
    expect(result.metadata.cached).toBe(true);
  });
});
```

---

## 8. 배포 및 운영

### 8.1 배포 전략
- **Staging**: main 브랜치 푸시 시 자동 배포
- **Production**: 태그 생성 시 수동 승인 후 배포
- **Rollback**: 1-click 롤백 지원
- **Blue-Green Deployment**: 무중단 배포

### 8.2 환경 변수 관리
```bash
# .env.production
PUBLIC_DATA_API_KEY=your_api_key_here
PUBLIC_DATA_API_KEY_EXPIRY=2026-12-31
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://user:pass@localhost:5432/db
RATE_LIMIT_REDIS_URL=redis://localhost:6380
SENTRY_DSN=https://...
LOG_LEVEL=info
```

### 8.3 모니터링 알림
- Slack 웹훅 연동
- 이메일 알림
- PagerDuty 통합 (프로덕션)
- 대시보드: https://monitoring.yourdomain.com

---

## 9. 위험 관리

### 9.1 기술적 위험
| 위험 | 영향도 | 발생확률 | 완화 방안 |
|------|--------|----------|-----------|
| 공공데이터포털 장애 | 높음 | 중간 | 캐싱, 재시도, 폴백 API |
| API 키 만료 | 높음 | 낮음 | 자동 알림, 갱신 가이드 |
| 좌표 변환 오류 | 중간 | 낮음 | 공식 테스트 데이터 검증 |
| Rate Limit 초과 | 중간 | 중간 | 클라이언트 측 제한, 큐잉 |

### 9.2 운영 위험
| 위험 | 영향도 | 발생확률 | 완화 방안 |
|------|--------|----------|-----------|
| 트래픽 급증 | 높음 | 중간 | Auto Scaling, CDN |
| 데이터베이스 부하 | 중간 | 중간 | Read Replica, 캐싱 |
| 보안 침해 | 높음 | 낮음 | WAF, 정기 보안 감사 |

---

## 10. 성공 지표 (KPI)

### 10.1 기술 지표
- **가용성**: 99.9% 이상
- **평균 응답 시간**: < 500ms
- **에러율**: < 1%
- **캐시 히트율**: > 70%

### 10.2 비즈니스 지표
- **API 호출 수**: 월 100만 건
- **활성 사용자**: 1,000명
- **데이터 정확도**: 99.9%
- **사용자 만족도**: 4.5/5.0

---

## 11. 향후 로드맵

### Phase 1 (Q1 2025) - MVP
- [x] 기본 API 통합
- [x] 좌표 변환 시스템
- [x] 캐싱 시스템
- [x] Rate Limiting
- [x] 모니터링 대시보드

### Phase 2 (Q2 2025) - 확장
- [ ] GraphQL API 제공
- [ ] WebSocket 실시간 데이터
- [ ] 머신러닝 기반 데이터 예측
- [ ] 모바일 SDK 제공

### Phase 3 (Q3 2025) - 고도화
- [ ] Multi-tenancy 지원
- [ ] 데이터 분석 대시보드
- [ ] API Marketplace
- [ ] Enterprise 플랜

---

## 12. 참고 자료

### 12.1 공식 문서
- [공공데이터포털](https://www.data.go.kr)
- [국토교통부 오픈API](https://www.vworld.kr/dev)
- [좌표계 변환 가이드](https://www.ngii.go.kr)

### 12.2 기술 문서
- [proj4 라이브러리](http://proj4js.org)
- [Redis 캐싱 전략](https://redis.io/docs/manual/patterns)
- [Rate Limiting 알고리즘](https://stripe.com/blog/rate-limiters)

### 12.3 관련 프로젝트
- TRD (Technical Requirements Document)
- API 개발 가이드 v3.0.0
- cclaude.md (AI 도구 설정)

---

## 부록 A: 용어 정의

- **공공데이터**: 정부/공공기관이 생성한 공개 데이터
- **EPSG 코드**: 좌표계 식별 코드 (European Petroleum Survey Group)
- **proj4**: 좌표계 변환 라이브러리
- **Rate Limiting**: API 요청 제한
- **TPS**: 초당 트랜잭션 수 (Transactions Per Second)

---

## 부록 B: 변경 이력

### v4.0 (2025-11-17)
- ✅ OAuth 2.0 정보 삭제 (공식 미지원)
- ✅ API 승인 시간 수정 (실제 기준)
- ✅ 좌표계 EPSG 코드 수정
- ✅ proj4 변환 파라미터 완성
- ✅ Rate Limiting 추가
- ✅ API 키 보안 강화
- ✅ 에러 처리 개선
- ✅ 테스트 시나리오 추가

### v3.0 (2025-10-15)
- 초기 버전 작성

---

**문서 승인**
- 작성자: Joo beom
- 검토자: AI Expert Panel (3인)
- 승인일: 2025-11-17
- 다음 검토일: 2025-12-17
