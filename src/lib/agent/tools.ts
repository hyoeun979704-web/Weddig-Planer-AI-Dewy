import type Anthropic from '@anthropic-ai/sdk'

export const ALLOWED_TABLES = [
  'budget_items',
  'budget_settings',
  'profiles',
  'user_wedding_settings',
  'user_schedule_items',
  'favorites',
  'community_posts',
  'community_comments',
  'invitation_venues',
  'vendors',
  'vendor_gallery',
  'vendor_highlights',
  'venues',
  'venue_halls',
  'venue_special_points',
  'reviews',
  'orders',
  'order_items',
  'subscriptions',
] as const

export type AllowedTable = (typeof ALLOWED_TABLES)[number]

export const READ_ONLY_TABLES: AllowedTable[] = [
  'vendors',
  'vendor_gallery',
  'vendor_highlights',
  'invitation_venues',
  'venues',
  'venue_halls',
  'venue_special_points',
  'reviews',
  'orders',
  'order_items',
  'subscriptions',
]

export const TABLE_DESCRIPTIONS: Record<AllowedTable, string> = {
  budget_items: '사용자별 예산 항목 (카테고리, 금액, 결제 정보)',
  budget_settings: '사용자별 예산 총액 및 카테고리별 배분 설정',
  profiles: '사용자 프로필 (닉네임, 아바타, 이메일)',
  user_wedding_settings: '결혼 날짜, 지역, 파트너 이름',
  user_schedule_items: '웨딩 플래닝 일정 항목',
  favorites: '사용자 찜 목록 (장소, 업체 등)',
  community_posts: '커뮤니티 게시글',
  community_comments: '게시글 댓글',
  invitation_venues: '청첩장용 웨딩홀 목록 [READ-ONLY]',
  vendors: '웨딩 업체 디렉토리 [READ-ONLY]',
  vendor_gallery: '업체 갤러리 이미지 [READ-ONLY]',
  vendor_highlights: '업체 주요 특징 [READ-ONLY]',
  venues: '웨딩홀 카탈로그 [READ-ONLY]',
  venue_halls: '웨딩홀 내 개별 홀 정보 [READ-ONLY]',
  venue_special_points: '웨딩홀 특징 [READ-ONLY]',
  reviews: '업체 리뷰 [READ-ONLY]',
  orders: '구매 주문 [READ-ONLY]',
  order_items: '주문 상품 항목 [READ-ONLY]',
  subscriptions: '사용자 구독 상태 [READ-ONLY]',
}

export const AGENT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'list_tables',
    description:
      '사용 가능한 데이터베이스 테이블 목록을 조회합니다. 어떤 데이터가 있는지 파악할 때 먼저 사용하세요.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_table_schema',
    description:
      '특정 테이블의 컬럼 구조를 조회합니다. 데이터를 삽입하거나 조회하기 전에 구조를 파악할 때 사용하세요.',
    input_schema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: '조회할 테이블 이름',
          enum: [...ALLOWED_TABLES],
        },
      },
      required: ['table'],
    },
  },
  {
    name: 'query_database',
    description:
      'Supabase 테이블에서 레코드를 조회합니다. 사용자 데이터를 조회할 때는 반드시 user_id 필터를 포함하세요.',
    input_schema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: '조회할 테이블 이름',
          enum: [...ALLOWED_TABLES],
        },
        filters: {
          type: 'object',
          description: '컬럼 필터 (key-value). 예: {"user_id": "abc123", "category": "venue"}',
          additionalProperties: true,
        },
        columns: {
          type: 'string',
          description: '조회할 컬럼 (쉼표 구분). 기본값: "*"',
        },
        limit: {
          type: 'number',
          description: '반환할 최대 행 수. 기본값: 50, 최대: 500',
        },
        order_by: {
          type: 'object',
          properties: {
            column: { type: 'string' },
            ascending: { type: 'boolean' },
          },
          required: ['column', 'ascending'],
        },
      },
      required: ['table'],
    },
  },
  {
    name: 'count_records',
    description: '테이블의 레코드 수를 집계합니다. 헬스체크 및 데이터 요약에 활용하세요.',
    input_schema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          enum: [...ALLOWED_TABLES],
        },
        filters: {
          type: 'object',
          description: '선택적 필터',
          additionalProperties: true,
        },
      },
      required: ['table'],
    },
  },
  {
    name: 'check_server_health',
    description: 'Supabase 데이터베이스 연결 상태와 응답 레이턴시를 확인합니다.',
    input_schema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'insert_record',
    description:
      'Supabase 테이블에 새 레코드를 삽입합니다. 읽기 전용 테이블에는 사용할 수 없습니다.',
    input_schema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          enum: [...ALLOWED_TABLES],
        },
        data: {
          type: 'object',
          description: '삽입할 레코드 데이터. 사용자 소유 레코드는 user_id를 포함하세요.',
          additionalProperties: true,
        },
      },
      required: ['table', 'data'],
    },
  },
  {
    name: 'update_record',
    description:
      'ID로 기존 레코드를 수정합니다. 읽기 전용 테이블에는 사용할 수 없습니다.',
    input_schema: {
      type: 'object',
      properties: {
        table: { type: 'string', enum: [...ALLOWED_TABLES] },
        id: { type: 'string', description: '레코드의 기본키 값' },
        id_column: {
          type: 'string',
          description: '기본키 컬럼 이름. 기본값: "id"',
        },
        data: {
          type: 'object',
          description: '수정할 필드 (key-value)',
          additionalProperties: true,
        },
      },
      required: ['table', 'id', 'data'],
    },
  },
  {
    name: 'delete_record',
    description:
      'ID로 레코드를 삭제합니다. 관리자 전용. 삭제 전 반드시 대상을 먼저 조회하여 확인하세요.',
    input_schema: {
      type: 'object',
      properties: {
        table: { type: 'string', enum: [...ALLOWED_TABLES] },
        id: { type: 'string', description: '레코드의 기본키 값' },
        id_column: {
          type: 'string',
          description: '기본키 컬럼 이름. 기본값: "id"',
        },
      },
      required: ['table', 'id'],
    },
  },
]
