import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';

import {
    startLobbyGame,
    updateLobbyMap,
    updateLobbyReady,
    updateLobbySettings,
} from '../api/lobbyApi';
import { NavigationBar } from '../components/common/NavigationBar';
import { HostLobbyActionCard } from '../components/lobby/HostLobbyActionCard';
import { LobbyChatPanel } from '../components/lobby/LobbyChatPanel';
import { LobbyFooter } from '../components/lobby/LobbyFooter';
import { LobbyHeaderCard } from '../components/lobby/LobbyHeaderCard';
import { LobbyMapInfoCard } from '../components/lobby/LobbyMapInfoCard';
import { ParticipantLobbyActionCard } from '../components/lobby/ParticipantLobbyActionCard';
import { LobbyPlayersCard } from '../components/lobby/LobbyPlayersCard';
import { LobbyRoomLayout } from '../components/lobby/LobbyRoomLayout';
import { LobbyRoomTopControls } from '../components/lobby/LobbyRoomTopControls';
import { LobbySettingsEditor } from '../components/lobby/LobbySettingsEditor';
import { MapSelectModal } from '../components/lobby/MapSelectModal';
import { GAME_ROUTES } from '../constants/game';
import { LOBBY_ROOM_COPY, LOBBY_ROUTES } from '../constants/lobby';
import {
    lobbyDetailQueryKey,
    useLobbyDetail,
} from '../hooks/useLobbyDetail';
import { useLobbyChat } from '../hooks/useLobbyChat';
import { useLobbySocket } from '../hooks/useLobbySocket';
import { SOCKET_PUBLISH } from '../constants/socketEvents';
import { useAuthStore } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';
import type { MapSummary } from '../types/map';
import type { UpdateLobbySettingsRequest } from '../types/lobby';
import {
    clampLobbyQuestionCount,
    hasValidLobbyMapSongCount,
} from '../utils/lobbyQuestionCount';

interface LobbyActionMessage {
    inviteCode: string;
    message: string;
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallbackMessage;
}

function getHostStartGuideMessage({
    canStart,
    hasSelectedMap,
    readyTargetCount,
    waitingCount,
}: {
    canStart: boolean;
    hasSelectedMap: boolean;
    readyTargetCount: number;
    waitingCount: number;
}) {
    if (canStart) {
        return LOBBY_ROOM_COPY.START_GUIDE_AVAILABLE;
    }

    if (!hasSelectedMap) {
        return LOBBY_ROOM_COPY.START_GUIDE_MAP_MISSING;
    }

    if (readyTargetCount === 0) {
        return LOBBY_ROOM_COPY.START_GUIDE_PLAYER_REQUIRED;
    }

    if (waitingCount > 0) {
        return LOBBY_ROOM_COPY.START_GUIDE_WAITING_PLAYERS;
    }

    return LOBBY_ROOM_COPY.START_GUIDE_SERVER_UNAVAILABLE;
}

function LobbyRoomShell({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen flex-col bg-[var(--monomat-page-bg)]">
            <NavigationBar />
            {children}
            <LobbyFooter />
        </div>
    );
}

function LobbyRoomStateCard({
    title,
    description,
    onBack,
    isError = false,
}: {
    title: string;
    description: string;
    onBack?: () => void;
    isError?: boolean;
}) {
    return (
        <section className="w-full max-w-xl rounded-lg bg-white px-6 py-9 text-center shadow-[0_4px_16px_rgba(0,0,0,0.08)] ring-1 ring-[color:var(--monomat-border-card)] sm:px-8">
            <h1 className="!m-0 !text-2xl !font-extrabold !text-[var(--monomat-text-strong)]">
                {title}
            </h1>
            <p
                className={`mt-4 break-keep text-sm font-medium ${
                    isError
                        ? 'text-[var(--monomat-danger)]'
                        : 'text-[var(--monomat-text-muted)]'
                }`}
            >
                {description}
            </p>
            {onBack && (
                <button
                    type="button"
                    onClick={onBack}
                    className="mt-6 h-10 rounded-lg bg-[var(--monomat-primary)] px-5 text-sm font-bold text-white transition hover:bg-[var(--monomat-primary-hover)]"
                >
                    {LOBBY_ROOM_COPY.GO_TO_LOBBY_LIST}
                </button>
            )}
        </section>
    );
}

function LobbyRoomLoadingState() {
    return (
        <LobbyRoomShell>
            <main className="flex flex-1 items-center justify-center px-4 py-10">
                <section className="w-full max-w-xl rounded-lg bg-white px-6 py-9 text-left shadow-[0_4px_16px_rgba(0,0,0,0.08)] ring-1 ring-[color:var(--monomat-border-card)] sm:px-8">
                    <div className="h-[24px] w-[110px] animate-pulse rounded-full bg-[var(--monomat-page-bg)]" />
                    <div className="mt-5 h-[36px] w-3/4 animate-pulse rounded bg-[var(--monomat-page-bg)]" />
                    <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-[var(--monomat-page-bg)]" />
                    <p className="mt-7 text-sm font-semibold text-[var(--monomat-text-muted)]">
                        {LOBBY_ROOM_COPY.FETCHING}
                    </p>
                </section>
            </main>
        </LobbyRoomShell>
    );
}

export function LobbyRoom() {
    const { inviteCode: inviteCodeParam } = useParams<{
        inviteCode: string;
    }>();
    const inviteCode = inviteCodeParam?.trim();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const userId = useAuthStore((state) => state.userId);
    const userIdentifier = useAuthStore((state) => state.userIdentifier);
    const stompClient = useSocketStore((state) => state.stompClient);
    const connectionStatus = useSocketStore(
        (state) => state.connectionStatus,
    );
    const lobbyChat = useLobbyChat(inviteCode);
    const {
        gameStatus,
        kickedOut,
        requestLobbyInfoRefresh,
        markLeavingForGame,
    } = useLobbySocket(inviteCode, lobbyChat.handleLobbyMessageBody);
    const navigatedInviteCodeRef = useRef<string | null>(null);
    const initialStatusCheckedInviteCodeRef = useRef<string | null>(null);

    const navigateToGame = useCallback(
        (targetInviteCode: string) => {
            if (navigatedInviteCodeRef.current === targetInviteCode) {
                return;
            }

            navigatedInviteCodeRef.current = targetInviteCode;
            // 게임 화면 전환은 퇴장이 아니므로 cleanup leave를 억제한다.
            markLeavingForGame();
            navigate(GAME_ROUTES.PLAY(targetInviteCode), {
                replace: true,
            });
        },
        [navigate, markLeavingForGame],
    );

    useEffect(() => {
        navigatedInviteCodeRef.current = null;
        initialStatusCheckedInviteCodeRef.current = null;
    }, [inviteCode]);

    useEffect(() => {
        if (!inviteCode || gameStatus !== 'started') {
            return;
        }

        navigateToGame(inviteCode);
    }, [gameStatus, inviteCode, navigateToGame]);

    const {
        data: lobbyDetail,
        isLoading,
        isFetching,
        isError,
        error,
    } = useLobbyDetail(inviteCode);

    useEffect(() => {
        if (
            !inviteCode ||
            !lobbyDetail ||
            isFetching ||
            initialStatusCheckedInviteCodeRef.current === inviteCode
        ) {
            return;
        }

        initialStatusCheckedInviteCodeRef.current = inviteCode;

        if (lobbyDetail.status === 'PLAYING') {
            navigateToGame(inviteCode);
        }
    }, [inviteCode, isFetching, lobbyDetail, navigateToGame]);

    const [actionMessage, setActionMessage] =
        useState<LobbyActionMessage | null>(null);
    const [actionErrorMessage, setActionErrorMessage] =
        useState<LobbyActionMessage | null>(null);
    const [isMapSelectModalOpen, setIsMapSelectModalOpen] = useState(false);

    const currentPlayer = useMemo(() => {
        if (!lobbyDetail || !userIdentifier) {
            return null;
        }

        return lobbyDetail.players.find(
            (player) => player.userIdentifier === userIdentifier,
        ) ?? null;
    }, [lobbyDetail, userIdentifier]);

    const isHost = Boolean(
        lobbyDetail &&
        userIdentifier &&
        lobbyDetail.hostId === userIdentifier,
    );
    const hostNickname = useMemo(() => {
        if (!lobbyDetail) {
            return LOBBY_ROOM_COPY.HOST_UNKNOWN;
        }

        const hostPlayer =
            lobbyDetail.players.find((player) => player.host) ??
            lobbyDetail.players.find(
                (player) =>
                    player.userIdentifier === lobbyDetail.hostId,
            );

        return (
            hostPlayer?.nickname?.trim() ||
            lobbyDetail.hostNickname?.trim() ||
            LOBBY_ROOM_COPY.HOST_UNKNOWN
        );
    }, [lobbyDetail]);
    const currentReady = currentPlayer?.ready ?? false;
    const readySummary = useMemo(() => {
        const players = lobbyDetail?.players ?? [];
        const nonHostPlayers = players.filter((player) => !player.host);
        const readyPlayers = nonHostPlayers.filter((player) => player.ready);
        const waitingPlayers = nonHostPlayers.filter((player) => !player.ready);

        return {
            totalPlayerCount: players.length,
            readyTargetCount: nonHostPlayers.length,
            readyCount: readyPlayers.length,
            waitingCount: waitingPlayers.length,
        };
    }, [lobbyDetail]);

    // 강퇴 대상으로 감지되면 사유를 잠깐 보여준 뒤 로비 목록으로 내보낸다.
    // (사유 메시지는 렌더에서 kickedOut으로 파생하고, 여기서는 이동만 예약한다)
    useEffect(() => {
        if (!kickedOut) {
            return;
        }

        const timer = window.setTimeout(() => {
            navigate(LOBBY_ROUTES.LIST, { replace: true });
        }, 1500);

        return () => {
            window.clearTimeout(timer);
        };
    }, [kickedOut, navigate]);

    const handleNavigateLobbyList = () => {
        navigate(LOBBY_ROUTES.LIST);
    };

    const handleKick = (targetUserIdentifier: string) => {
        if (
            !isHost ||
            !inviteCode ||
            !stompClient ||
            connectionStatus !== 'connected'
        ) {
            return;
        }

        const targetPlayer = lobbyDetail?.players.find(
            (player) => player.userIdentifier === targetUserIdentifier,
        );
        const targetName =
            targetPlayer?.nickname?.trim() || targetUserIdentifier;

        if (!window.confirm(LOBBY_ROOM_COPY.KICK_CONFIRM(targetName))) {
            return;
        }

        try {
            stompClient.publish({
                destination: SOCKET_PUBLISH.LOBBY_KICK(inviteCode),
                body: JSON.stringify({ targetUserIdentifier }),
            });
        } catch (error) {
            setActionErrorMessage({
                inviteCode,
                message: getErrorMessage(error, LOBBY_ROOM_COPY.KICK_FAILED),
            });
        }
    };

    const invalidateLobbyDetail = async () => {
        if (!inviteCode) {
            return;
        }

        await queryClient.invalidateQueries({
            queryKey: lobbyDetailQueryKey(inviteCode),
        });
    };

    // 로비 정보 변경 후 전 참가자 갱신을 서버에 요청한다.
    // BE가 REFRESH_LOBBY_INFO를 브로드캐스트하면 본인 포함 전원이 재조회한다.
    // 미연결 등으로 요청을 못 보내면 본인만이라도 즉시 갱신한다(폴백).
    const refreshLobbyAfterMutation = async () => {
        if (!requestLobbyInfoRefresh()) {
            await invalidateLobbyDetail();
        }
    };

    const readyMutation = useMutation({
        mutationFn: (ready: boolean) => {
            if (!inviteCode) {
                throw new Error(LOBBY_ROOM_COPY.INVALID_INVITE_CODE);
            }

            return updateLobbyReady(inviteCode, { ready });
        },
        onMutate: () => {
            setActionMessage(null);
            setActionErrorMessage(null);
        },
        onSuccess: async () => {
            await refreshLobbyAfterMutation();
        },
        onError: (mutationError) => {
            if (!inviteCode) {
                return;
            }

            setActionErrorMessage({
                inviteCode,
                message: getErrorMessage(
                    mutationError,
                    LOBBY_ROOM_COPY.READY_CHANGE_FAILED,
                ),
            });
        },
    });

    const mapMutation = useMutation({
        mutationFn: (map: MapSummary) => {
            if (!inviteCode) {
                throw new Error(LOBBY_ROOM_COPY.INVALID_INVITE_CODE);
            }

            return updateLobbyMap(inviteCode, { mapId: map.mapId });
        },
        onMutate: () => {
            setActionMessage(null);
            setActionErrorMessage(null);
        },
        onSuccess: async () => {
            await refreshLobbyAfterMutation();
        },
        onError: (mutationError) => {
            if (!inviteCode) {
                return;
            }

            setActionErrorMessage({
                inviteCode,
                message: getErrorMessage(
                    mutationError,
                    LOBBY_ROOM_COPY.MAP_CHANGE_FAILED,
                ),
            });
        },
    });

    const settingsMutation = useMutation({
        mutationFn: (request: UpdateLobbySettingsRequest) => {
            if (!inviteCode) {
                throw new Error(LOBBY_ROOM_COPY.INVALID_INVITE_CODE);
            }

            return updateLobbySettings(inviteCode, request);
        },
        onMutate: () => {
            setActionMessage(null);
            setActionErrorMessage(null);
        },
        onSuccess: async () => {
            await refreshLobbyAfterMutation();
        },
        onError: (mutationError) => {
            if (!inviteCode) {
                return;
            }

            setActionErrorMessage({
                inviteCode,
                message: getErrorMessage(
                    mutationError,
                    LOBBY_ROOM_COPY.SETTINGS_SAVE_FAILED,
                ),
            });
        },
    });

    const startMutation = useMutation({
        mutationFn: () => {
            if (!inviteCode) {
                throw new Error(LOBBY_ROOM_COPY.INVALID_INVITE_CODE);
            }

            return startLobbyGame(inviteCode);
        },
        onMutate: () => {
            setActionMessage(null);
            setActionErrorMessage(null);
        },
        onSuccess: async () => {
            if (inviteCode) {
                setActionMessage({
                    inviteCode,
                    message: LOBBY_ROOM_COPY.START_REQUESTED,
                });
            }

            await invalidateLobbyDetail();
        },
        onError: (mutationError) => {
            if (!inviteCode) {
                return;
            }

            setActionErrorMessage({
                inviteCode,
                message: getErrorMessage(
                    mutationError,
                    LOBBY_ROOM_COPY.START_FAILED,
                ),
            });
        },
    });

    const handleReadyClick = () => {
        if (
            !currentPlayer ||
            isHost ||
            lobbyDetail?.status !== 'WAITING' ||
            readyMutation.isPending
        ) {
            return;
        }

        readyMutation.mutate(!currentReady);
    };

    const handleStartClick = () => {
        if (
            !isHost ||
            !lobbyDetail?.canStart ||
            startMutation.isPending ||
            mapMutation.isPending ||
            settingsMutation.isPending
        ) {
            return;
        }

        startMutation.mutate();
    };

    const handleMapChangeClick = () => {
        if (
            !isHost ||
            lobbyDetail?.status !== 'WAITING' ||
            mapMutation.isPending ||
            startMutation.isPending ||
            settingsMutation.isPending
        ) {
            return;
        }

        setActionMessage(null);
        setActionErrorMessage(null);
        setIsMapSelectModalOpen(true);
    };

    const handleMapConfirm = (map: MapSummary) => {
        if (!isHost || mapMutation.isPending) {
            return;
        }

        if (map.mapId === lobbyDetail?.mapId) {
            return;
        }

        mapMutation.mutate(map);
    };

    const handleSettingsSubmit = (
        request: UpdateLobbySettingsRequest,
    ) => {
        if (
            !isHost ||
            lobbyDetail?.status !== 'WAITING' ||
            settingsMutation.isPending
        ) {
            return;
        }

        if (
            lobbyDetail.mapNumOfSong !== null &&
            !hasValidLobbyMapSongCount(lobbyDetail.mapNumOfSong)
        ) {
            return;
        }

        settingsMutation.mutate({
            ...request,
            questionCount: clampLobbyQuestionCount(
                request.questionCount,
                lobbyDetail.mapNumOfSong,
            ),
        });
    };

    if (!inviteCode) {
        return (
            <LobbyRoomShell>
                <main className="flex flex-1 items-center justify-center px-4 py-10">
                    <LobbyRoomStateCard
                        title={LOBBY_ROOM_COPY.INVALID_ACCESS_TITLE}
                        description={LOBBY_ROOM_COPY.INVALID_ACCESS_DESCRIPTION}
                        onBack={handleNavigateLobbyList}
                    />
                </main>
            </LobbyRoomShell>
        );
    }

    if (isLoading) {
        return <LobbyRoomLoadingState />;
    }

    if (isError || !lobbyDetail) {
        return (
            <LobbyRoomShell>
                <main className="flex flex-1 items-center justify-center px-4 py-10">
                    <LobbyRoomStateCard
                        title={LOBBY_ROOM_COPY.FETCH_ERROR_TITLE}
                        description={getErrorMessage(
                            error,
                            LOBBY_ROOM_COPY.FETCH_ERROR_DESCRIPTION,
                        )}
                        onBack={handleNavigateLobbyList}
                        isError
                    />
                </main>
            </LobbyRoomShell>
        );
    }

    const isWaitingLobby = lobbyDetail.status === 'WAITING';
    const hasSelectedMap =
        lobbyDetail.mapId != null && Boolean(lobbyDetail.mapTitle?.trim());
    const hostStartGuideMessage = getHostStartGuideMessage({
        canStart: lobbyDetail.canStart,
        hasSelectedMap,
        readyTargetCount: readySummary.readyTargetCount,
        waitingCount: readySummary.waitingCount,
    });
    const displayedHostStartGuideMessage = settingsMutation.isPending
        ? LOBBY_ROOM_COPY.SETTINGS_CHANGE_PENDING_GUIDE
        : mapMutation.isPending
            ? LOBBY_ROOM_COPY.MAP_CHANGE_PENDING_GUIDE
            : hostStartGuideMessage;
    const currentActionMessage =
        actionMessage?.inviteCode === inviteCode ? actionMessage.message : null;
    // 강퇴 안내는 다른 액션 에러보다 우선해서 보여준다.
    const currentActionErrorMessage = kickedOut
        ? LOBBY_ROOM_COPY.KICKED_OUT
        : actionErrorMessage?.inviteCode === inviteCode
            ? actionErrorMessage.message
            : null;

    return (
        <LobbyRoomShell>
            <main className="flex flex-1 flex-col px-4 py-[17px] text-left sm:px-6 lg:px-8 xl:px-10">
                <LobbyRoomLayout
                    backNavigation={
                        <button
                            type="button"
                            onClick={handleNavigateLobbyList}
                            className="h-5 w-fit text-base font-semibold leading-5 text-[var(--monomat-text-muted)] transition hover:text-[var(--monomat-text-strong)]"
                        >
                            ← {LOBBY_ROOM_COPY.GO_TO_LOBBY_LIST}
                        </button>
                    }
                    topControls={
                        <LobbyRoomTopControls
                            inviteCode={lobbyDetail.inviteCode}
                            status={lobbyDetail.status}
                        />
                    }
                    feedbackSlot={
                        (currentActionErrorMessage ||
                            currentActionMessage) && (
                            <section
                                role={
                                    currentActionErrorMessage
                                        ? 'alert'
                                        : 'status'
                                }
                                className={`rounded-lg px-5 py-4 text-sm font-bold shadow-[0_4px_16px_rgba(0,0,0,0.05)] ring-1 ${
                                    currentActionErrorMessage
                                        ? 'bg-[var(--monomat-danger-light)] text-[var(--monomat-danger)] ring-red-100'
                                        : 'bg-[var(--monomat-primary-light)] text-[var(--monomat-primary)] ring-blue-100'
                                }`}
                            >
                                {currentActionErrorMessage ??
                                    currentActionMessage}
                            </section>
                        )
                    }
                    titleCard={
                        <LobbyHeaderCard
                            title={lobbyDetail.title}
                            mapTitle={lobbyDetail.mapTitle}
                            mapCategory={lobbyDetail.mapCategory}
                            questionCount={lobbyDetail.questionCount}
                            canChangeMap={isHost && isWaitingLobby}
                            isMapChangePending={mapMutation.isPending}
                            onMapChangeClick={handleMapChangeClick}
                        />
                    }
                    playersCard={
                        <LobbyPlayersCard
                            players={lobbyDetail.players}
                            currentPlayers={lobbyDetail.currentPlayers}
                            maxPlayers={lobbyDetail.maxPlayers}
                            currentUserIdentifier={userIdentifier}
                            hostId={lobbyDetail.hostId}
                            hostNickname={
                                lobbyDetail.hostNickname ?? null
                            }
                            canKick={isHost && isWaitingLobby}
                            onKick={handleKick}
                        />
                    }
                    settingsCard={
                        isHost ? (
                            <LobbySettingsEditor
                                key={[
                                    lobbyDetail.inviteCode,
                                    lobbyDetail.maxPlayers,
                                    lobbyDetail.questionCount,
                                    lobbyDetail.timeLimitSeconds,
                                    lobbyDetail.mapNumOfSong,
                                ].join(':')}
                                maxPlayers={lobbyDetail.maxPlayers}
                                questionCount={lobbyDetail.questionCount}
                                mapNumOfSong={lobbyDetail.mapNumOfSong}
                                timeLimitSeconds={
                                    lobbyDetail.timeLimitSeconds
                                }
                                currentPlayers={
                                    lobbyDetail.currentPlayers
                                }
                                isEditable={isWaitingLobby}
                                isSaving={settingsMutation.isPending}
                                onSubmit={handleSettingsSubmit}
                            />
                        ) : (
                            <LobbyMapInfoCard
                                questionCount={lobbyDetail.questionCount}
                                mapNumOfSong={lobbyDetail.mapNumOfSong}
                                timeLimitSeconds={
                                    lobbyDetail.timeLimitSeconds
                                }
                                maxPlayers={lobbyDetail.maxPlayers}
                            />
                        )
                    }
                    actionSlot={
                        isHost ? (
                            <HostLobbyActionCard
                                canStart={
                                    lobbyDetail.canStart &&
                                    !mapMutation.isPending &&
                                    !settingsMutation.isPending
                                }
                                isStarting={startMutation.isPending}
                                startGuideMessage={
                                    displayedHostStartGuideMessage
                                }
                                totalPlayerCount={
                                    readySummary.totalPlayerCount
                                }
                                readyTargetCount={
                                    readySummary.readyTargetCount
                                }
                                readyCount={readySummary.readyCount}
                                waitingCount={readySummary.waitingCount}
                                onStartClick={handleStartClick}
                            />
                        ) : (
                            <ParticipantLobbyActionCard
                                hostNickname={hostNickname}
                                isReady={currentReady}
                                isWaitingLobby={isWaitingLobby}
                                hasCurrentPlayer={Boolean(currentPlayer)}
                                isUpdating={readyMutation.isPending}
                                onReadyClick={handleReadyClick}
                            />
                        )
                    }
                    chatSlot={
                        <LobbyChatPanel
                            key={lobbyDetail.inviteCode}
                            messages={lobbyChat.messages}
                            currentUserId={userId}
                            connectionStatus={lobbyChat.connectionStatus}
                            isRecentChatsLoading={
                                lobbyChat.isRecentChatsLoading
                            }
                            hasLoadedRecentChats={
                                lobbyChat.hasLoadedRecentChats
                            }
                            recentChatsError={lobbyChat.recentChatsError}
                            sendError={lobbyChat.sendError}
                            isSending={lobbyChat.isSending}
                            onSendMessage={lobbyChat.sendMessage}
                        />
                    }
                />
            </main>

            <MapSelectModal
                isOpen={isMapSelectModalOpen}
                selectedMap={null}
                selectedMapId={lobbyDetail.mapId}
                onConfirm={handleMapConfirm}
                onClose={() => setIsMapSelectModalOpen(false)}
            />
        </LobbyRoomShell>
    );
}
