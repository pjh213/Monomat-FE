// STOMP 메시지 본문에서 메시지 종류(type)를 추출하는 공용 유틸이다.
// 서버는 갱신 신호를 평문 JSON 문자열("REFRESH_LOBBY_INFO" 등)로,
// 시스템/채팅 이벤트는 { type, ... } 객체로 보낸다. 두 형태를 모두 처리한다.
export function parseSocketMessageType(body: string): string {
    try {
        const parsed = JSON.parse(body) as unknown;

        if (typeof parsed === 'string') {
            return parsed;
        }

        if (
            parsed &&
            typeof parsed === 'object' &&
            'type' in parsed &&
            typeof parsed.type === 'string'
        ) {
            return parsed.type;
        }
    } catch {
        return body;
    }

    return body;
}
