import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { SOCKET_MESSAGES, SOCKET_SUBSCRIBE } from '../constants/socketEvents';
import { useSocketStore } from '../store/useSocketStore';
import { parseSocketMessageType } from '../utils/socketMessage';

// 로비 목록 화면에서 전체 갱신 신호(REFRESH_LOBBY_LIST)를 구독해
// 다른 사용자의 생성/입장/퇴장/강퇴 시 목록을 실시간으로 다시 불러온다.
export function useLobbyListSocket() {
    const queryClient = useQueryClient();
    const stompClient = useSocketStore((state) => state.stompClient);
    const connectionStatus = useSocketStore((state) => state.connectionStatus);

    useEffect(() => {
        if (!stompClient || connectionStatus !== 'connected') {
            return;
        }

        const subscription = stompClient.subscribe(
            SOCKET_SUBSCRIBE.LOBBY_LIST_REFRESH,
            (frame) => {
                const messageType = parseSocketMessageType(frame.body);

                if (messageType !== SOCKET_MESSAGES.REFRESH_LOBBY_LIST) {
                    return;
                }

                // useLobbyList / useLobbyTotalPages 쿼리키 모두 'lobbies'로 시작한다.
                void queryClient.invalidateQueries({ queryKey: ['lobbies'] });
            },
        );

        return () => {
            subscription.unsubscribe();
        };
    }, [stompClient, connectionStatus, queryClient]);
}
