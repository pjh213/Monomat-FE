import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
    SOCKET_MESSAGES,
    SOCKET_PUBLISH,
    SOCKET_SUBSCRIBE,
} from '../constants/socketEvents';
import { useSocketStore } from '../store/useSocketStore';
import { useAuthStore } from '../store/useAuthStore';
import { parseSocketMessageType } from '../utils/socketMessage';
import { lobbyDetailQueryKey } from './useLobbyDetail';

type LobbyGameStatus = 'idle' | 'started';

// LOBBY 채널 메시지에서 강퇴 여부 판별에 필요한 필드만 가볍게 파싱한다.
function parseLobbyKickTarget(body: string): string | null {
    try {
        const parsed = JSON.parse(body) as unknown;

        if (
            parsed &&
            typeof parsed === 'object' &&
            'type' in parsed &&
            (parsed as { type?: unknown }).type === SOCKET_MESSAGES.KICK &&
            'sender' in parsed &&
            typeof (parsed as { sender?: unknown }).sender === 'string'
        ) {
            return (parsed as { sender: string }).sender;
        }
    } catch {
        return null;
    }

    return null;
}

export function useLobbySocket(
    inviteCode: string | undefined,
    onLobbyMessageBody?: (body: string) => void,
) {
    const normalizedInviteCode = inviteCode?.trim() ?? '';
    const queryClient = useQueryClient();
    const stompClient = useSocketStore((state) => state.stompClient);
    const connectionStatus = useSocketStore((state) => state.connectionStatus);
    const userIdentifier = useAuthStore((state) => state.userIdentifier);
    const [gameStartedInviteCode, setGameStartedInviteCode] =
        useState<string | null>(null);
    const [kickedInviteCode, setKickedInviteCode] =
        useState<string | null>(null);

    // cleanup 시 퇴장(leave) 송신을 건너뛰어야 하는 경우를 표시한다.
    // (게임 시작으로 인한 화면 전환, 강퇴로 인한 이탈 — 둘 다 leave를 보내면 안 된다)
    const skipLeaveRef = useRef(false);

    useEffect(() => {
        if (
            !normalizedInviteCode ||
            !stompClient ||
            connectionStatus !== 'connected'
        ) {
            return;
        }

        // 새 로비 입장 시점에 이탈 억제 플래그를 초기화한다.
        skipLeaveRef.current = false;

        const lobbySubscription = stompClient.subscribe(
            SOCKET_SUBSCRIBE.LOBBY(normalizedInviteCode),
            (frame) => {
                // 이 구독 자체가 BE의 로비 참여자 등록 트리거다.
                onLobbyMessageBody?.(frame.body);

                // 내가 강퇴 대상이면 leave를 보내지 않고 화면에서 이탈한다.
                const kickedUserIdentifier = parseLobbyKickTarget(frame.body);

                if (
                    kickedUserIdentifier &&
                    userIdentifier &&
                    kickedUserIdentifier === userIdentifier
                ) {
                    skipLeaveRef.current = true;
                    setKickedInviteCode(normalizedInviteCode);
                }
            },
        );

        const refreshSubscription = stompClient.subscribe(
            SOCKET_SUBSCRIBE.LOBBY_REFRESH(normalizedInviteCode),
            (frame) => {
                const messageType = parseSocketMessageType(frame.body);

                if (messageType !== SOCKET_MESSAGES.REFRESH_LOBBY_INFO) {
                    return;
                }

                void queryClient.invalidateQueries({
                    queryKey: lobbyDetailQueryKey(normalizedInviteCode),
                });
            },
        );

        const gameSubscription = stompClient.subscribe(
            SOCKET_SUBSCRIBE.LOBBY_GAME(normalizedInviteCode),
            (frame) => {
                const messageType = parseSocketMessageType(frame.body);

                if (messageType === SOCKET_MESSAGES.GAME_STARTED) {
                    // 게임 화면으로 전환되므로 cleanup에서 leave를 보내지 않는다.
                    skipLeaveRef.current = true;
                    setGameStartedInviteCode(normalizedInviteCode);
                }
            },
        );

        void queryClient.invalidateQueries({
            queryKey: lobbyDetailQueryKey(normalizedInviteCode),
        });

        // 명시적 퇴장 송신. SPA 화면 이동만으로는 소켓이 끊기지 않으므로
        // 직접 보내야 잔류 참가자에게 갱신이 전파된다.
        const publishLeave = () => {
            if (skipLeaveRef.current) {
                return;
            }

            try {
                stompClient.publish({
                    destination: SOCKET_PUBLISH.LOBBY_LEAVE(
                        normalizedInviteCode,
                    ),
                });
            } catch (error) {
                console.error('[useLobbySocket] 퇴장 송신 실패:', error);
            }
        };

        // 탭 닫기/새로고침 등 페이지 이탈 시 best-effort 송신.
        // (BE는 소켓 disconnect로도 퇴장을 처리하므로 중복은 무해하다)
        window.addEventListener('pagehide', publishLeave);

        return () => {
            window.removeEventListener('pagehide', publishLeave);

            lobbySubscription.unsubscribe();
            refreshSubscription.unsubscribe();
            gameSubscription.unsubscribe();

            // 뒤로가기/브라우저 백/로고 클릭 등 화면 이탈 시 퇴장 처리.
            publishLeave();
        };
    }, [
        normalizedInviteCode,
        stompClient,
        connectionStatus,
        queryClient,
        onLobbyMessageBody,
        userIdentifier,
    ]);

    // 게임 화면으로 전환하기 직전 호출한다. 화면 이탈(cleanup) 시 퇴장을 보내지 않게 한다.
    // (소켓 GAME_STARTED 외에, 재접속 시 status가 PLAYING이라 바로 이동하는 경우를 위해 노출한다)
    const markLeavingForGame = useCallback(() => {
        skipLeaveRef.current = true;
    }, []);

    // 로비 정보 변경 후 전 참가자 갱신을 요청한다.
    // 성공 여부를 반환해 호출 측이 미연결 시 폴백(로컬 invalidate)할 수 있게 한다.
    const requestLobbyInfoRefresh = useCallback(() => {
        if (
            !stompClient ||
            connectionStatus !== 'connected' ||
            !normalizedInviteCode
        ) {
            return false;
        }

        try {
            stompClient.publish({
                destination: SOCKET_PUBLISH.LOBBY_UPDATE(normalizedInviteCode),
            });

            return true;
        } catch (error) {
            console.error('[useLobbySocket] 로비 갱신 요청 실패:', error);
            return false;
        }
    }, [connectionStatus, normalizedInviteCode, stompClient]);

    const gameStatus: LobbyGameStatus =
        gameStartedInviteCode === normalizedInviteCode ? 'started' : 'idle';
    const kickedOut = kickedInviteCode === normalizedInviteCode;

    return {
        connectionStatus,
        gameStatus,
        kickedOut,
        requestLobbyInfoRefresh,
        markLeavingForGame,
    };
}
