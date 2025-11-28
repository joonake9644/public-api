# 공공데이터 포털 API 연동 프로젝트 개발 가이드

## 📋 프로젝트 개요
- **프레임워크**: Next.js 14 (App Router)
- **언어**: TypeScript
- **데이터베이스**: Firebase Firestore
- **인증**: Firebase Authentication
- **배포**: Vercel (GitHub 연동)
- **API**: 공공데이터 포털 (디코딩 인증키 방식)

---

## 🎯 핵심 규칙

### 1. 인증키 방식
- **반드시 디코딩 인증키 사용**
- 일반 인증키(인코딩 방식) 사용 금지
- URL 인코딩 처리 불필요

### 2. 프로토콜 설정
- **로컬 개발**: `http://apis.data.go.kr` (필수)
- **프로덕션**: `https://apis.data.go.kr` (Vercel 자동)
- 환경 변수로 자동 전환 구현

### 3. 보안 원칙
- API 키는 **절대 클라이언트에 노출 금지**
- 모든 API 호출은 Next.js API Route를 통한 프록시 방식
- 환경 변수는 `.env.local` 사용 (Git 제외)

---

## 📁 프로젝트 구조

```
my-public-data-app/
├── .env.local                    # 로컬 환경변수 (Git 제외)
├── .env.production               # 프로덕션 환경변수 템플릿
├── .gitignore
├── next.config.js
├── tsconfig.json
├── package.json
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # 메인 페이지
│   ├── api/
│   │   └── public-data/
│   │       └── route.ts          # API 프록시 엔드포인트
│   └── components/
│       └── DataDisplay.tsx
│
├── lib/
│   ├── firebase/
│   │   ├── config.ts             # Firebase 초기화
│   │   ├── auth.ts               # 인증 함수
│   │   └── firestore.ts          # Firestore 함수
│   ├── api/
│   │   └── publicDataClient.ts   # 공공데이터 API 클라이언트
│   └── types/
│       └── index.ts              # TypeScript 타입 정의
│
└── middleware.ts                  # 인증 미들웨어 (선택)
```

---

## 🔧 Step 1: 환경 설정

### 1.1 환경 변수 파일 생성

**`.env.local` (로컬 개발용)**
```bash
# 공공데이터 API - 디코딩 인증키
API_KEY=your_decoded_service_key_here
API_BASE_URL=http://apis.data.go.kr

# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin (서버 전용)
FIREBASE_ADMIN_KEY=your_firebase_admin_sdk_json_base64
```

**`.env.production` (Vercel 배포용 템플릿)**
```bash
# 공공데이터 API
API_KEY=your_decoded_service_key_here
API_BASE_URL=https://apis.data.go.kr

# Firebase (동일)
NEXT_PUBLIC_FIREBASE_API_KEY=...
FIREBASE_ADMIN_KEY=...
```

### 1.2 .gitignore 확인
```
.env*.local
.env.production
node_modules/
.next/
```

---

## 💻 Step 2: 코드 구현

### 2.1 Firebase 설정

**`lib/firebase/config.ts`**
```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 중복 초기화 방지
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
```

### 2.2 공공데이터 API 타입 정의

**`lib/types/index.ts`**
```typescript
// 공공데이터 API 응답 타입 (예시 - 실제 API에 맞게 수정)
export interface PublicDataResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: {
        item: DataItem[];
      };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

export interface DataItem {
  // API 응답 구조에 맞게 정의
  id: string;
  name: string;
  address?: string;
  // ... 추가 필드
}

export interface ApiError {
  error: string;
  details?: string;
}
```

### 2.3 Next.js API Route (프록시)

**`app/api/public-data/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server';
import type { PublicDataResponse, ApiError } from '@/lib/types';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // 쿼리 파라미터 추출
  const pageNo = searchParams.get('pageNo') || '1';
  const numOfRows = searchParams.get('numOfRows') || '10';
  const searchKeyword = searchParams.get('keyword') || '';

  try {
    // 환경에 따라 HTTP/HTTPS 자동 전환
    const baseUrl = process.env.API_BASE_URL;
    const serviceKey = process.env.API_KEY; // 서버 전용 환경변수

    if (!serviceKey) {
      throw new Error('API_KEY가 설정되지 않았습니다.');
    }

    // 디코딩 키 방식: 그대로 사용
    const apiUrl = new URL('/your-endpoint-path', baseUrl);
    apiUrl.searchParams.append('serviceKey', serviceKey);
    apiUrl.searchParams.append('pageNo', pageNo);
    apiUrl.searchParams.append('numOfRows', numOfRows);
    if (searchKeyword) {
      apiUrl.searchParams.append('keyword', searchKeyword);
    }

    const response = await fetch(apiUrl.toString(), {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 3600 }, // 1시간 캐싱
    });

    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status}`);
    }

    const data: PublicDataResponse = await response.json();

    // 응답 성공 여부 확인
    if (data.response.header.resultCode !== '00') {
      throw new Error(data.response.header.resultMsg);
    }

    return NextResponse.json(data.response.body);

  } catch (error) {
    console.error('공공데이터 API 호출 실패:', error);
    
    const errorResponse: ApiError = {
      error: '데이터를 가져오는데 실패했습니다.',
      details: error instanceof Error ? error.message : '알 수 없는 오류',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
```

### 2.4 클라이언트 API 함수

**`lib/api/publicDataClient.ts`**
```typescript
import type { DataItem, ApiError } from '@/lib/types';

interface FetchDataParams {
  pageNo?: number;
  numOfRows?: number;
  keyword?: string;
}

interface FetchDataResult {
  items: DataItem[];
  totalCount: number;
  error?: string;
}

export async function fetchPublicData(
  params: FetchDataParams = {}
): Promise<FetchDataResult> {
  try {
    const { pageNo = 1, numOfRows = 10, keyword = '' } = params;

    // 내부 API Route 호출 (프록시)
    const queryParams = new URLSearchParams({
      pageNo: pageNo.toString(),
      numOfRows: numOfRows.toString(),
      ...(keyword && { keyword }),
    });

    const response = await fetch(`/api/public-data?${queryParams}`);
    
    if (!response.ok) {
      const errorData: ApiError = await response.json();
      throw new Error(errorData.error || '데이터 로드 실패');
    }

    const data = await response.json();
    
    return {
      items: data.items.item || [],
      totalCount: data.totalCount || 0,
    };

  } catch (error) {
    console.error('fetchPublicData 오류:', error);
    return {
      items: [],
      totalCount: 0,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}
```

### 2.5 컴포넌트 예시

**`app/components/DataDisplay.tsx`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { fetchPublicData } from '@/lib/api/publicDataClient';
import type { DataItem } from '@/lib/types';

export default function DataDisplay() {
  const [data, setData] = useState<DataItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await fetchPublicData({ numOfRows: 20 });
      
      if (result.error) {
        setError(result.error);
      } else {
        setData(result.items);
      }
      
      setLoading(false);
    }

    loadData();
  }, []);

  if (loading) return <div>데이터 로딩 중...</div>;
  if (error) return <div>오류: {error}</div>;

  return (
    <div className="grid gap-4">
      {data.map((item) => (
        <div key={item.id} className="p-4 border rounded">
          <h3 className="font-bold">{item.name}</h3>
          {item.address && <p className="text-sm text-gray-600">{item.address}</p>}
        </div>
      ))}
    </div>
  );
}
```

### 2.6 메인 페이지

**`app/page.tsx`**
```typescript
import DataDisplay from './components/DataDisplay';

export default function Home() {
  return (
    <main className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">공공데이터 조회</h1>
      <DataDisplay />
    </main>
  );
}
```

---

## 🚀 Step 3: 배포 설정

### 3.1 Vercel 환경 변수 설정

1. GitHub 저장소 푸시
2. Vercel에서 프로젝트 Import
3. **Environment Variables** 설정:
   - `API_KEY`: 디코딩 인증키 입력
   - `API_BASE_URL`: `https://apis.data.go.kr`
   - `FIREBASE_ADMIN_KEY`: Firebase Admin SDK JSON (Base64 인코딩)
   - `NEXT_PUBLIC_FIREBASE_*`: Firebase 설정값들

### 3.2 공공데이터 포털 활용 신청

1. 공공데이터 포털 로그인
2. 해당 API 상세 페이지 → **활용 신청**
3. **서비스 URL 등록**:
   - 개발: `http://localhost:3000`
   - 운영: `https://your-app.vercel.app`
4. **디코딩 인증키 선택** (필수)

---

## ✅ 체크리스트

### 개발 시작 전
- [ ] 공공데이터 포털에서 디코딩 인증키 발급
- [ ] Firebase 프로젝트 생성
- [ ] GitHub 저장소 생성
- [ ] `.env.local` 파일 생성 및 키 입력
- [ ] `.gitignore`에 환경 변수 파일 추가 확인

### 개발 중
- [ ] API Route를 통한 프록시 구현 (클라이언트 직접 호출 금지)
- [ ] TypeScript 타입 정의 완료
- [ ] 환경별 프로토콜 자동 전환 구현 (HTTP/HTTPS)
- [ ] 에러 핸들링 구현
- [ ] 로컬에서 테스트 완료 (`npm run dev`)

### 배포 전
- [ ] Vercel에 모든 환경 변수 등록
- [ ] 공공데이터 포털에 배포 URL 등록
- [ ] Firebase 보안 규칙 설정
- [ ] 프로덕션 빌드 테스트 (`npm run build`)

### 배포 후
- [ ] HTTPS 접속 확인
- [ ] API 호출 정상 작동 확인
- [ ] Firebase 인증 테스트
- [ ] 에러 로그 모니터링

---

## 🐛 문제 해결

### 403 Forbidden 에러
- **원인**: API 키 인코딩 문제 또는 활용 신청 미완료
- **해결**: 디코딩 키 사용 확인 + 공공데이터 포털에 도메인 등록

### CORS 에러
- **원인**: 클라이언트에서 직접 API 호출
- **해결**: Next.js API Route를 통한 프록시 방식 사용

### 환경 변수 인식 안됨
- **원인**: 환경 변수 접두사 오류
- **해결**:
  - 클라이언트: `NEXT_PUBLIC_*` 필수
  - 서버: 접두사 없이 사용 (API Route에서만)

### 로컬에서 HTTPS 에러
- **원인**: localhost에서 HTTPS 사용 시도
- **해결**: `.env.local`에서 `http://` 사용 확인

---

## 📚 추가 참고 자료

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Firebase 문서](https://firebase.google.com/docs)
- [공공데이터 포털](https://www.data.go.kr)
- [Vercel 배포 가이드](https://vercel.com/docs)

---

## 🎓 Cursor AI 활용 팁

### Cursor에게 이렇게 지시하세요:

```
"이 프로젝트 가이드를 기반으로 개발해줘:
1. Next.js 14 App Router + TypeScript 사용
2. 공공데이터 API는 디코딩 인증키 방식 + API Route 프록시
3. Firebase Auth + Firestore 연동
4. 환경별 HTTP/HTTPS 자동 전환
5. 모든 코드에 타입 안정성 보장
6. 에러 핸들링 철저히"
```

### Rules for AI 설정 추천:

```
- 환경 변수는 반드시 .env.local 사용
- API 키는 서버 컴포넌트/API Route에서만 접근
- 디코딩 인증키 방식 적용 (인코딩 처리 불필요)
- 모든 API 호출은 /api 프록시 경유
- TypeScript strict 모드 활성화
```

---

**이 문서를 Cursor의 프로젝트 루트에 `DEVELOPMENT_GUIDE.md`로 저장하고 개발을 시작하세요!**
