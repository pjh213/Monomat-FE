import { UserX } from 'lucide-react';

import { LOBBY_ROOM_COPY } from '../../constants/lobby';
import { getAvatarColor } from '../../utils/avatarColor';

import type { LobbyPlayerResponse } from '../../types/lobby';

interface LobbyPlayersCardProps {
    players: LobbyPlayerResponse[];
    currentPlayers: number;
    maxPlayers: number;
    currentUserIdentifier: string | null;
    hostId: string;
    hostNickname: string | null;
    canKick?: boolean;
    onKick?: (targetUserIdentifier: string) => void;
}

function maskUserIdentifier(userIdentifier: string) {
    if (userIdentifier.length <= 10) {
        return userIdentifier;
    }

    return `${userIdentifier.slice(0, 4)}...${userIdentifier.slice(-4)}`;
}

function getPlayerDisplayName(
    player: LobbyPlayerResponse,
    hostNickname: string | null,
) {
    const nickname = player.nickname?.trim();

    if (nickname) {
        return nickname;
    }

    if (player.host && hostNickname?.trim()) {
        return hostNickname.trim();
    }

    return maskUserIdentifier(player.userIdentifier);
}

function getAvatarLabel(displayName: string) {
    return displayName.trim().charAt(0).toUpperCase() || '?';
}

function PlayerReadyBadge({
    isHost,
    isReady,
}: {
    isHost: boolean;
    isReady: boolean;
}) {
    if (isHost) {
        return (
            <span className="inline-flex h-3 items-center gap-1 text-[10px] font-semibold leading-none text-[var(--monomat-primary)]">
                <span className="h-2 w-2 rounded-full bg-[var(--monomat-primary)]" />
                {LOBBY_ROOM_COPY.HOST_BADGE}
            </span>
        );
    }

    return (
        <span
            className={`inline-flex h-3 items-center gap-1 text-[10px] font-semibold leading-none ${
                isReady
                    ? 'text-[#00A259]'
                    : 'text-[var(--monomat-text-muted)]'
            }`}
        >
            <span
                className={`h-2 w-2 rounded-full ${
                    isReady
                        ? 'bg-[#00A259]'
                        : 'border border-[var(--monomat-text-muted)] bg-white'
                }`}
            />
            {isReady ? LOBBY_ROOM_COPY.READY : LOBBY_ROOM_COPY.WAITING}
        </span>
    );
}

function PlayerSlot({
    player,
    currentUserIdentifier,
    hostId,
    hostNickname,
    canKick = false,
    onKick,
}: {
    player: LobbyPlayerResponse;
    currentUserIdentifier: string | null;
    hostId: string;
    hostNickname: string | null;
    canKick?: boolean;
    onKick?: (targetUserIdentifier: string) => void;
}) {
    const isCurrentUser =
        player.userIdentifier === currentUserIdentifier;
    const isHost =
        player.host || player.userIdentifier === hostId;
    const displayName = getPlayerDisplayName(
        {
            ...player,
            host: isHost,
        },
        hostNickname,
    );
    const avatarColor = getAvatarColor(player.userIdentifier);
    const isKickable = canKick && !isCurrentUser && !isHost;

    return (
        <li
            className={`relative flex h-[110px] min-w-0 flex-col items-center rounded-lg border bg-white px-3 py-[15px] text-center ${
                isCurrentUser
                    ? 'border-[var(--monomat-primary)] ring-2 ring-[color:var(--monomat-primary-light)]'
                    : 'border-[color:var(--monomat-border-default)]'
            }`}
        >
            {isKickable && (
                <button
                    type="button"
                    onClick={() => onKick?.(player.userIdentifier)}
                    aria-label={LOBBY_ROOM_COPY.KICK_PLAYER_ARIA(displayName)}
                    title={LOBBY_ROOM_COPY.KICK_PLAYER}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full text-[var(--monomat-text-muted)] transition hover:bg-[var(--monomat-danger-light)] hover:text-[var(--monomat-danger)]"
                >
                    <UserX size={15} strokeWidth={1.9} />
                </button>
            )}

            <span
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-base font-extrabold leading-none text-white"
                style={{ backgroundColor: avatarColor }}
            >
                {getAvatarLabel(displayName)}
            </span>

            <p className="mt-[7px] w-full truncate text-sm font-extrabold leading-4 text-[var(--monomat-text-strong)]">
                {displayName}
            </p>

            <div className="mt-1 flex h-3 max-w-full items-center justify-center gap-2">
                {isCurrentUser && (
                    <span className="inline-flex h-3 items-center rounded-full bg-[var(--monomat-primary-light)] px-2 text-[10px] font-bold leading-none text-[var(--monomat-primary)]">
                        {LOBBY_ROOM_COPY.ME}
                    </span>
                )}
                <PlayerReadyBadge
                    isHost={isHost}
                    isReady={!isHost && player.ready}
                />
            </div>
        </li>
    );
}

function EmptySlot() {
    return (
        <li className="flex h-[110px] flex-col items-center rounded-lg border border-dashed border-[color:var(--monomat-border-default)] bg-white px-3 py-[15px] text-center">
            <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-[color:var(--monomat-border-input)] bg-white" />
            <p className="mt-[14px] text-sm font-semibold leading-4 text-[var(--monomat-text-muted)]">
                {LOBBY_ROOM_COPY.EMPTY_SLOT}
            </p>
        </li>
    );
}

export function LobbyPlayersCard({
    players,
    currentPlayers,
    maxPlayers,
    currentUserIdentifier,
    hostId,
    hostNickname,
    canKick = false,
    onKick,
}: LobbyPlayersCardProps) {
    const emptySlotCount = Math.max(maxPlayers - players.length, 0);

    return (
        <section className="min-h-[304px] rounded-2xl bg-white p-5 text-left shadow-[0_4px_16px_rgba(0,0,0,0.16)] lg:p-[25px]">
            <div className="flex items-center justify-between gap-4">
                <h2 className="!m-0 !text-lg !font-bold !leading-6 !text-[var(--monomat-text-strong)]">
                    {LOBBY_ROOM_COPY.PLAYERS_TITLE}
                </h2>
                <span className="shrink-0 text-sm font-semibold leading-none text-[var(--monomat-text-muted)] xl:mt-2">
                    {currentPlayers}/{maxPlayers}
                </span>
            </div>

            {players.length > 0 ? (
                <ul className="mt-[10px] grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-[repeat(4,160px)] xl:justify-between xl:gap-x-0 xl:gap-y-[10px]">
                    {players.map((player) => (
                        <PlayerSlot
                            key={player.userIdentifier}
                            player={player}
                            currentUserIdentifier={currentUserIdentifier}
                            hostId={hostId}
                            hostNickname={hostNickname}
                            canKick={canKick}
                            onKick={onKick}
                        />
                    ))}
                    {Array.from({ length: emptySlotCount }).map((_, index) => (
                        <EmptySlot key={`empty-${index}`} />
                    ))}
                </ul>
            ) : (
                <div className="mt-[10px] flex min-h-[230px] items-center justify-center rounded-lg border border-dashed border-[color:var(--monomat-border-input)] bg-[var(--monomat-page-bg)] px-4 text-center text-sm font-semibold text-[var(--monomat-text-muted)]">
                    {LOBBY_ROOM_COPY.PLAYERS_EMPTY}
                </div>
            )}
        </section>
    );
}
