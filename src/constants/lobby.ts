export const INVITE_CODE_POLICY = {
    LENGTH: 6,
    ALLOWED_PATTERN: /^[A-Z0-9]{6}$/,
    REMOVE_WHITESPACE_PATTERN: /\s/g,
} as const;

export const INVITE_CODE_MESSAGES = {
    EMPTY: '초대 코드를 입력해주세요.',
    INVALID_LENGTH: '초대 코드는 6자리여야 합니다.',
    INVALID_FORMAT: '초대 코드는 영문 대문자와 숫자만 입력할 수 있습니다.',
} as const;

export const CREATE_LOBBY_POLICY = {
    TITLE_MAX_LENGTH: 255,
    MIN_PLAYERS: 2,
    MAX_PLAYERS: 8,
    DEFAULT_MAX_PLAYERS: 4,
    MIN_QUESTION_COUNT: 1,
    MAX_QUESTION_COUNT: 50,
    DEFAULT_QUESTION_COUNT: 10,
    MIN_TIME_LIMIT_SECONDS: 10,
    MAX_TIME_LIMIT_SECONDS: 120,
    DEFAULT_TIME_LIMIT_SECONDS: 30,
} as const;

export const LOBBY_CATEGORY_FILTERS = [
    '전체',
    'K-POP',
    'J-POP',
    'POP',
    'OST',
    '애니',
] as const;

export const LOBBY_ALL_CATEGORY_FILTER = LOBBY_CATEGORY_FILTERS[0];

export const LOBBY_SORT_LABELS = {
    LATEST: '최신순',
    MOST_PLAYERS: '인원 많은 순',
    MOST_EMPTY_SLOTS: '빈 자리 많은 순',
} as const;

export const DEFAULT_LOBBY_LIST_PAGE = 0;
export const DEFAULT_LOBBY_LIST_SIZE = 6;

export const LOBBY_NAVIGATION_LABELS = {
    LOGO_ARIA_LABEL: '로비 목록으로 이동',
    ACCOUNT_ARIA_LABEL: '내 계정 열기',
    CREATE_MAP: '맵 만들기',
    CREATE_MAP_PENDING_TITLE: '맵 만들기 기능은 추후 제공 예정입니다.',
    INVITE_CODE: '초대 코드',
    INVITE_CODE_JOIN: '입장',
    CREATE_LOBBY: '로비 만들기',
} as const;

export const LOBBY_ROUTES = {
    LIST: '/lobbies',
    CREATE_LOBBY: '/lobbies/new',
    ROOM: (inviteCode: string) => `/lobby/${inviteCode}`,
    CREATE_MAP: null as string | null,
} as const;

export const LOBBY_QUERY_PARAMS = {
    MAP_ID: 'mapId',
} as const;

export const LOBBY_CREATE_MAP_PRESELECT_COPY = {
    LOADING: '선택한 맵 정보를 불러오는 중입니다.',
    INVALID_MAP_ID: '전달된 맵 번호가 올바르지 않습니다.',
    FETCH_ERROR: '선택한 내 맵을 불러오지 못했습니다.',
} as const;

export const LOBBY_STATUS_META = {
    WAITING: {
        label: '대기중',
        badgeClassName: 'bg-[#E5F7ED] text-[#33A659]',
        progressClassName: 'bg-[var(--monomat-primary)]',
    },
    PLAYING: {
        label: '진행중',
        badgeClassName: 'bg-[#FFF0E0] text-[#F28C1A]',
        progressClassName: 'bg-[#F28C1A]',
    },
    UNKNOWN: {
        label: '상태확인중',
        badgeClassName:
            'bg-[var(--monomat-page-bg)] text-[var(--monomat-text-muted)]',
        progressClassName: 'bg-[var(--monomat-border-input)]',
    },
} as const;

export const LOBBY_CARD_LABELS = {
    ENTER: '입장',
    ENTER_UNAVAILABLE: '입장불가',
    PLAYER_UNIT: '명',
    UNKNOWN_HOST: '방장 정보 없음',
} as const;

export const LOBBY_PAGINATION_LABELS = {
    PREVIOUS: '이전 페이지',
    NEXT: '다음 페이지',
    PAGE: (page: number) => `${page}페이지`,
} as const;

export const LOBBY_LIST_ERROR_COPY = {
    TITLE: '로비 목록을 불러오지 못했습니다.',
    DESCRIPTION: '잠시 후 다시 시도해주세요.',
    RETRY: '다시 불러오기',
} as const;

export const LOBBY_ROOM_COPY = {
    INVALID_ACCESS_TITLE: '잘못된 로비 접근입니다.',
    INVALID_ACCESS_DESCRIPTION: '초대 코드가 포함된 로비 주소로 다시 접속해주세요.',
    FETCHING: '로비 정보를 불러오는 중...',
    FETCH_ERROR_TITLE: '로비 정보를 불러오지 못했습니다.',
    FETCH_ERROR_DESCRIPTION: '잠시 후 다시 시도해주세요.',
    GO_TO_LOBBY_LIST: '로비 목록으로 이동',
    STATUS_UNKNOWN: '상태확인중',
    HOST_UNKNOWN: '방장 정보 없음',
    MAP_EMPTY_TITLE: '선택된 맵 없음',
    MAP_EMPTY_DESCRIPTION: '방장이 선택한 맵 정보가 표시됩니다.',
    MAP_CATEGORY_EMPTY: '카테고리 없음',
    INVITE_CODE: '초대 코드',
    INVITE_CODE_COPY: '초대 코드 복사',
    INVITE_CODE_COPIED: '복사됨',
    PLAYERS_TITLE: '참가자',
    PLAYERS_EMPTY: '아직 표시할 참가자가 없습니다.',
    EMPTY_SLOT: '빈 자리',
    HOST_BADGE: '방장',
    READY: '준비 완료',
    WAITING: '대기 중',
    ME: '나',
    PLAYER: '플레이어',
    MAP_CARD_TITLE: '선택 맵',
    GAME_SETTING_TITLE: '게임 설정',
    MAX_PLAYERS: '최대 인원',
    QUESTION_COUNT: '라운드 수',
    TIME_LIMIT: '라운드 당',
    ROLE_HOST: '방장',
    ROLE_PLAYER: '참가자',
    ACTION_TITLE: '액션',
    CHAT_PLACEHOLDER_TITLE: '로비 채팅',
    CHAT_PLACEHOLDER_DESCRIPTION: '채팅 기능은 추후 제공됩니다.',
    HOST_ACTION_TITLE: '게임 시작 관리',
    READY_SUMMARY_TITLE: '준비 상태 요약',
    READY_SUMMARY_TOTAL: '전체 참가자',
    READY_SUMMARY_TARGET: '준비 대상',
    READY_SUMMARY_READY: '준비 완료',
    READY_SUMMARY_WAITING: '대기 중',
    READY_SUMMARY_EMPTY: '방장 외 참가자가 아직 없습니다.',
    START_PENDING: '시작 요청 중...',
    START_GAME: '게임 시작',
    READY_PENDING: '변경 중...',
    CANCEL_READY: '준비 취소',
    SUBMIT_READY: '준비하기',
    PARTICIPANT_ACTION_TITLE: '내 준비 상태',
    PARTICIPANT_WAITING_GUIDE:
        '준비를 완료하면 방장이 게임을 시작할 수 있습니다.',
    PARTICIPANT_READY_GUIDE:
        '방장이 게임을 시작할 때까지 기다려 주세요.',
    PARTICIPANT_NOT_WAITING:
        '대기 중인 로비에서만 준비 상태를 변경할 수 있습니다.',
    PARTICIPANT_HOST_PREFIX: '게임 시작 권한 · 방장',
    START_AVAILABLE: '현재 조회 기준으로 시작할 수 있습니다.',
    START_UNAVAILABLE: '모든 참가자가 준비하면 시작할 수 있습니다.',
    START_GUIDE_MAP_MISSING: '선택된 맵이 없어 아직 시작할 수 없습니다.',
    START_GUIDE_PLAYER_REQUIRED: '참가자가 입장하면 게임을 시작할 수 있습니다.',
    START_GUIDE_WAITING_PLAYERS: '모든 참가자가 준비하면 게임을 시작할 수 있습니다.',
    START_GUIDE_SERVER_UNAVAILABLE:
        '현재 서버 기준으로 아직 시작할 수 없습니다.',
    START_GUIDE_AVAILABLE:
        '모든 조건이 충족되었습니다. 게임을 시작할 수 있습니다.',
    MAP_CHANGE_PENDING_GUIDE:
        '맵 변경 사항을 반영하는 중입니다. 잠시 후 시작할 수 있습니다.',
    SETTINGS_CHANGE_PENDING_GUIDE:
        '설정 변경 사항을 반영하는 중입니다. 잠시 후 시작할 수 있습니다.',
    SETTINGS_SAVE: '설정 저장',
    SETTINGS_SAVE_PENDING: '저장 중...',
    SETTINGS_SAVE_FAILED: '로비 설정 변경에 실패했습니다.',
    SETTINGS_UNCHANGED: '변경된 설정이 없습니다.',
    SETTINGS_NOT_WAITING:
        '게임이 시작된 로비에서는 설정을 변경할 수 없습니다.',
    SETTINGS_MAX_PLAYERS_CONFLICT:
        '최대 인원은 현재 참가자 수보다 작을 수 없습니다.',
    SETTINGS_QUESTION_COUNT_MAP_REQUIRED:
        '맵을 선택하면 라운드 수를 설정할 수 있습니다.',
    SETTINGS_QUESTION_COUNT_EMPTY_MAP:
        '등록된 곡이 없는 맵에서는 로비 설정을 저장할 수 없습니다.',
    READY_SYNCED: '준비 상태는 서버 이벤트로 다시 동기화됩니다.',
    READY_WAIT_PLAYER: '참여자 정보 동기화 후 준비할 수 있습니다.',
    START_REQUESTED: '게임 시작 요청을 보냈습니다.',
    MAP_CHANGE_FAILED: '로비 맵 변경에 실패했습니다.',
    READY_CHANGE_FAILED: '준비 상태 변경에 실패했습니다.',
    START_FAILED: '게임 시작에 실패했습니다.',
    INVALID_INVITE_CODE: '초대 코드가 올바르지 않습니다.',
    KICK_PLAYER: '강퇴',
    KICK_PLAYER_ARIA: (name: string) => `${name} 강퇴`,
    KICK_CONFIRM: (name: string) => `${name}님을 강퇴하시겠습니까?`,
    KICK_FAILED: '참가자 강퇴에 실패했습니다.',
    KICKED_OUT: '방장에 의해 로비에서 강퇴되었습니다.',
} as const;

export const LOBBY_CHAT_POLICY = {
    MAX_MESSAGE_LENGTH: 500,
    MAX_RECENT_MESSAGES: 50,
    SEND_COOLDOWN_MS: 1000,
    REPEATED_MESSAGE_COOLDOWN_MS: 5000,
    AUTO_SCROLL_THRESHOLD_PX: 80,
} as const;

export const LOBBY_CHAT_COPY = {
    TITLE: '로비 채팅',
    CONNECTED: '접속 중',
    RECONNECTING: '재연결 중',
    DISCONNECTED: '연결 끊김',
    EMPTY: '아직 채팅이 없습니다.',
    EMPTY_DESCRIPTION: '첫 메시지를 보내 대화를 시작해보세요.',
    PARTICIPANT_FALLBACK: '참가자',
    ME: '나',
    INPUT_PLACEHOLDER: '메시지를 입력하세요',
    INPUT_DISABLED_PLACEHOLDER: '채팅 서버에 연결 중입니다.',
    SEND_ARIA_LABEL: '로비 채팅 메시지 전송',
    MESSAGE_REQUIRED: '메시지를 입력해주세요.',
    MESSAGE_TOO_LONG: '메시지는 500자 이하로 입력해주세요.',
    SEND_DISCONNECTED: '채팅 서버에 연결된 후 전송할 수 있습니다.',
    SEND_TOO_FAST: '메시지를 너무 빠르게 전송하고 있습니다.',
    SEND_REPEATED: '같은 메시지는 5초 후 다시 보낼 수 있습니다.',
    SEND_FAILED: '메시지 전송에 실패했습니다.',
    RECENT_FETCH_FAILED: '최근 채팅을 불러오지 못했습니다.',
    RECENT_FETCHING: '최근 채팅을 불러오는 중입니다.',
    SYSTEM: {
        ENTER: '참가자가 입장했습니다.',
        LEAVE: '참가자가 퇴장했습니다.',
        KICK: '참가자가 강퇴되었습니다.',
        READY_CHANGED: '준비 상태가 변경되었습니다.',
        HOST_CHANGED: '방장이 변경되었습니다.',
        DEFAULT: '로비 상태가 변경되었습니다.',
    },
} as const;

export const LOBBY_EMPTY_STATE_COPY = {
    TITLE: '현재 조건에 맞는 로비가 없습니다.',
    DESCRIPTION: '검색어나 카테고리 조건을 변경해보세요.',
} as const;

export const LOBBY_SEARCH_COPY = {
    PLACEHOLDER: '로비 제목을 검색하세요.',
} as const;

export const GLOBAL_CHAT_COPY = {
    TITLE: '전체 채팅',
    EMPTY: '아직 채팅이 없습니다.',
    UNKNOWN_SENDER: '알 수 없는 사용자',
    INPUT_PLACEHOLDER: '메시지 입력',
    CONNECTING_PLACEHOLDER: '연결 중...',
    CONNECTED: '연결됨',
    RECONNECTING: '재연결 중...',
    DISCONNECTED: '연결 끊김',
    SEND_ARIA_LABEL: '메시지 전송',
    COOLDOWN_PREFIX: '연속 전송 방지를 위해',
    COOLDOWN_SUFFIX: '초 후 다시 보낼 수 있습니다.',
} as const;
