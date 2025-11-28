/**
 * 공공데이터 API 타입 정의
 *
 * 한국 공공데이터포털 API 응답 타입 및 파라미터
 */

/**
 * 주소 검색 API
 */
export interface AddressSearchParams {
  keyword: string;          // 검색어 (필수)
  countPerPage?: number;    // 페이지당 개수 (기본: 10)
  currentPage?: number;     // 현재 페이지 (기본: 1)
  resultType?: 'json' | 'xml';
}

export interface AddressResult {
  roadAddr: string;         // 도로명주소
  roadAddrPart1: string;    // 도로명주소(참고항목 제외)
  roadAddrPart2: string;    // 도로명주소 참고항목
  jibunAddr: string;        // 지번주소
  engAddr: string;          // 도로명주소(영문)
  zipNo: string;            // 우편번호
  admCd: string;            // 행정구역코드
  rnMgtSn: string;          // 도로명코드
  bdMgtSn: string;          // 건물관리번호
  detBdNmList?: string;     // 상세건물명
  bdNm?: string;            // 건물명
  bdKdcd: string;           // 공동주택여부(1:공동주택)
  siNm: string;             // 시도명
  sggNm: string;            // 시군구명
  emdNm: string;            // 읍면동명
  liNm?: string;            // 법정리명
  rn: string;               // 도로명
  udrtYn: string;           // 지하여부(0:지상, 1:지하)
  buldMnnm: number;         // 건물본번
  buldSlno: number;         // 건물부번
  mtYn: string;             // 산여부(0:대지, 1:산)
  lnbrMnnm: number;         // 지번본번(번지)
  lnbrSlno: number;         // 지번부번(호)
  emdNo: string;            // 읍면동일련번호
}

export interface AddressWithCoordinates extends AddressResult {
  latitude: number;
  longitude: number;
  coordinateSystem?: string;
}

/**
 * 부동산 실거래가 API
 */
export interface ApartmentTradeParams {
  LAWD_CD: string;          // 지역코드 (필수)
  DEAL_YMD: string;         // 계약월 (YYYYMM)
  numOfRows?: number;       // 페이지당 개수
  pageNo?: number;          // 페이지 번호
}

export interface ApartmentTradeResult {
  거래금액: string;         // "82,000" (만원)
  거래유형: string;         // "직거래" or "중개거래"
  건축년도: string;         // "2008"
  년: string;               // "2025"
  월: string;               // "01"
  일: string;               // "15"
  법정동: string;           // "역삼동"
  아파트: string;           // "삼성래미안"
  전용면적: string;         // "84.99"
  지번: string;             // "123-45"
  지역코드: string;         // "11680"
  층: string;               // "15"
  해제사유발생일?: string;  // 해제된 경우만
  해제여부?: string;        // "O" or ""
}

/**
 * 건축물대장 API
 */
export interface BuildingInfoParams {
  sigunguCd: string;        // 시군구코드 (필수)
  bjdongCd: string;         // 법정동코드 (필수)
  bun?: string;             // 번
  ji?: string;              // 지
  numOfRows?: number;
  pageNo?: number;
}

export interface BuildingInfoResult {
  rnum: string;             // 순번
  platPlc: string;          // 대지위치
  sigunguCd: string;        // 시군구코드
  bjdongCd: string;         // 법정동코드
  platGbCd: string;         // 대지구분코드
  bun: string;              // 번
  ji: string;               // 지
  mgmBldrgstPk: string;     // 건축물대장 PK
  regstrGbCd: string;       // 대장구분코드
  regstrGbCdNm: string;     // 대장구분코드명
  regstrKindCd: string;     // 대장종류코드
  regstrKindCdNm: string;   // 대장종류코드명
  newPlatPlc?: string;      // 도로명대지위치
  bldNm?: string;           // 건물명
  splotNm?: string;         // 특수지명
  block?: string;           // 블록
  lot?: string;             // 로트
  mainPurpsCd: string;      // 주용도코드
  mainPurpsCdNm: string;    // 주용도코드명
  totArea: string;          // 연면적
  vlRatEstmTotArea: string; // 용적률산정연면적
  mainBldCnt: string;       // 주건축물수
  atchBldCnt: string;       // 부속건축물수
  atchBldArea: string;      // 부속건축물면적
  totPkngCnt: string;       // 총주차수
}

/**
 * 사업자등록정보 API
 */
export interface BusinessRegistrationParams {
  b_no: string;             // 사업자등록번호 (필수, 10자리)
}

export interface BusinessRegistrationResult {
  b_no: string;             // 사업자등록번호
  b_stt: string;            // 사업자상태
  b_stt_cd: string;         // 사업자상태코드
  tax_type: string;         // 과세유형
  tax_type_cd: string;      // 과세유형코드
  end_dt?: string;          // 폐업일
  utcc_yn?: string;         // 단위과세전환폐업여부
  tax_type_change_dt?: string; // 최근과세유형전환일자
  invoice_apply_dt?: string;   // 세금계산서적용일자
  rbf_tax_type?: string;    // 직전과세유형
  rbf_tax_type_cd?: string; // 직전과세유형코드
}

/**
 * 공공데이터 API 공통 에러 응답
 */
export interface PublicDataErrorResponse {
  resultCode: string;
  resultMsg: string;
}

/**
 * 지역코드 (법정동코드)
 */
export interface RegionCode {
  code: string;             // 지역코드
  name: string;             // 지역명
  fullName: string;         // 전체 지역명
  level: 'sido' | 'sigungu' | 'eupmyeondong';
}

/**
 * 지역코드 매핑 (샘플)
 */
export const REGION_CODES: Record<string, RegionCode> = {
  '11680': { code: '11680', name: '강남구', fullName: '서울특별시 강남구', level: 'sigungu' },
  '11650': { code: '11650', name: '서초구', fullName: '서울특별시 서초구', level: 'sigungu' },
  '11710': { code: '11710', name: '송파구', fullName: '서울특별시 송파구', level: 'sigungu' },
  '11545': { code: '11545', name: '금천구', fullName: '서울특별시 금천구', level: 'sigungu' },
  // ... 추가 지역코드는 별도 데이터 파일로 관리
} as const;

/**
 * API 키 정보
 */
export interface APIKeyInfo {
  key: string;
  provider: string;
  expiryDate: Date;
  status: 'active' | 'expired' | 'suspended';
  createdAt: Date;
  lastUsed?: Date;
}

/**
 * API 승인 상태
 */
export type APIApprovalStatus = 'instant' | 'standard' | 'extended';

/**
 * API 승인 타임라인
 */
export const API_APPROVAL_TIMELINE: Record<APIApprovalStatus, { duration: string; description: string }> = {
  instant: {
    duration: '즉시',
    description: '인증 불필요한 공개 데이터'
  },
  standard: {
    duration: '1-3 영업일',
    description: '일반적인 공공데이터'
  },
  extended: {
    duration: '5-7 영업일',
    description: '심사가 필요한 데이터'
  }
} as const;
