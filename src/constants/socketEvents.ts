// 서버와 실시간 통신 (WebSocket)에 사용하는 채널 경로를 모아둔 파일이다.
// STOMP 프로토콜은 채팅방처럼 '채널'이라는 개념을 사용한다.
// 특정 채널에 '발행 (메시지 보내기)'하거나 '구독 (메시지 받기)' 하는 방식으로 동작한다.

// BE 기준 :
//   - WebSocketConfig.java : /app (발행 prefix), /topic (구독 prefix)
//   - ChatController.java  : /topic/chat/global, /topic/lobby/{code}

// 발행 경로 (클라이언트 → 서버)
// 클라이언트가 서버로 메시지를 보낼 때 사용하는 경로이다.
// Spring의 @MessageMapping이 /app prefix를 제거한 뒤 경로를 매핑한다.
export const SOCKET_PUBLISH = {
    // 모든 사용자가 보는 전체 채팅에 메시지를 보낼 때 사용한다.
    CHAT_GLOBAL: '/app/chat/global',

    // 특정 로비 (방)의 채팅에 메시지를 보낼 때 사용한다.
    // code는 로비의 6자리 초대 코드이다.
    // 예 : SOCKET_PUBLISH.CHAT_LOBBY('ABC123') → '/app/chat/lobby/ABC123'
    CHAT_LOBBY: (code: string) => `/app/chat/lobby/${code}`,

    // 로비 생성 후 목록 화면의 실시간 갱신을 트리거한다. (body 없음)
    // 서버는 이 신호를 받으면 /topic/lobby/refresh로 REFRESH_LOBBY_LIST를 브로드캐스트한다.
    LOBBY_CREATE: '/app/lobby/create',

    // 로비 상세 정보 갱신을 요청한다. (body 없음, 참가자만)
    // 서버는 /topic/lobby/{code}/refresh로 REFRESH_LOBBY_INFO를 브로드캐스트한다.
    LOBBY_UPDATE: (code: string) => `/app/lobby/${code}/update`,

    // 명시적 퇴장을 알린다. (body 없음)
    // 서버는 LEAVE 시스템 메시지와 정보/목록 갱신 신호를 브로드캐스트한다.
    LOBBY_LEAVE: (code: string) => `/app/lobby/${code}/leave`,

    // 방장이 특정 참가자를 강퇴한다. body: { targetUserIdentifier(UUID) }
    LOBBY_KICK: (code: string) => `/app/lobby/${code}/kick`,
} as const;

// 구독 경로 (서버 → 클라이언트)
// 서버에서 클라이언트로 메시지가 전달되는 경로이다.
// 이 경로를 구독하면 해당 채널에 새 메시지가 올 때마다 자동으로 수신한다.
export const SOCKET_SUBSCRIBE = {
    // 전체 채팅 메시지를 수신할 때 사용한다.
    CHAT_GLOBAL: '/topic/chat/global',

    // 특정 로비 (방)의 메시지를 수신할 때 사용한다.
    // 채팅 메시지뿐 아니라 게임 이벤트 (라운드 시작/종료, 정답 알림 등)도
    // 이 채널로 수신하며, 메시지 안에 type 필드로 어떤 종류인지 구분한다.
    LOBBY: (code: string) => `/topic/lobby/${code}`,

    // 특정 로비의 참여자/ready 등 상태 변경 알림을 수신한다.
    LOBBY_REFRESH: (code: string) => `/topic/lobby/${code}/refresh`,

    // 특정 로비의 게임 시작 이벤트를 수신한다.
    LOBBY_GAME: (code: string) => `/topic/lobby/${code}/game`,

    // 로비 목록 전체 갱신 신호를 수신한다. (생성/입장/퇴장/강퇴 시 브로드캐스트)
    LOBBY_LIST_REFRESH: '/topic/lobby/refresh',
} as const;

export const SOCKET_MESSAGES = {
    REFRESH_LOBBY_INFO: 'REFRESH_LOBBY_INFO',
    REFRESH_LOBBY_LIST: 'REFRESH_LOBBY_LIST',
    GAME_STARTED: 'GAME_STARTED',
    // /topic/lobby/{code} 채널 시스템 메시지 type. 강퇴 대상 식별에 사용한다.
    KICK: 'KICK',
} as const;
