import {
    type ChangeEvent,
    type FormEvent,
    type ReactNode,
    type MouseEvent,
    useEffect,
    useRef,
    useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gamepad2, LockKeyhole, Music, X } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { createLobby } from '../api/lobbyApi';
import { getMyMapDetail } from '../api/mapApi';
import { AccountModal } from '../components/common/AccountModal';
import { MonomatInput } from '../components/common/MonomatInput';
import { MonomatLogo } from '../components/common/MonomatLogo';
import { LobbyFooter } from '../components/lobby/LobbyFooter';
import { MapSelectModal } from '../components/lobby/MapSelectModal';
import {
    CREATE_LOBBY_POLICY,
    LOBBY_CREATE_MAP_PRESELECT_COPY,
    LOBBY_QUERY_PARAMS,
    LOBBY_ROUTES,
} from '../constants/lobby';
import { SOCKET_PUBLISH } from '../constants/socketEvents';
import { useAuthStore } from '../store/useAuthStore';
import { useSocketStore } from '../store/useSocketStore';
import type { CreateLobbyRequest } from '../types/lobby';
import type { MapDetailResponse, MapSummary } from '../types/map';
import { getAvatarColor } from '../utils/avatarColor';
import {
    formatMapDescription,
    formatMapOwnerNickname,
} from '../utils/mapFormat';
import {
    clampLobbyQuestionCount,
    getLobbyQuestionCountMax,
    hasValidLobbyMapSongCount,
    normalizeLobbyQuestionCountInput,
} from '../utils/lobbyQuestionCount';

interface LobbyCreateFormState {
    title: string;
    maxPlayers: number;
    questionCount: number;
    timeLimitSeconds: number;
    isPrivate: boolean;
}

interface LobbyRangeControlProps {
    id: string;
    label: string;
    value: number;
    unit?: string;
    min: number;
    max: number;
    disabled: boolean;
    onChange: (value: number) => void;
    showNumberInput?: boolean;
    numberInputAriaLabel?: string;
}

interface VisibilityOptionProps {
    title: string;
    description: string;
    icon: ReactNode;
    isSelected: boolean;
    disabled: boolean;
    onClick: () => void;
}

const DEFAULT_FORM_STATE: LobbyCreateFormState = {
    title: '',
    maxPlayers: CREATE_LOBBY_POLICY.DEFAULT_MAX_PLAYERS,
    questionCount: CREATE_LOBBY_POLICY.DEFAULT_QUESTION_COUNT,
    timeLimitSeconds: CREATE_LOBBY_POLICY.DEFAULT_TIME_LIMIT_SECONDS,
    isPrivate: false,
};

function getErrorMessage(error: unknown, fallbackMessage: string) {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallbackMessage;
}

function getRangeBackground(value: number, min: number, max: number) {
    if (max <= min) {
        return 'var(--monomat-primary)';
    }

    const progress = ((value - min) / (max - min)) * 100;

    return `linear-gradient(to right, var(--monomat-primary) ${progress}%, var(--monomat-border-input) ${progress}%)`;
}

function createRequestFromFormState(
    formState: LobbyCreateFormState,
    selectedMap: MapSummary | null,
): CreateLobbyRequest | string {
    const title = formState.title.trim();

    if (!title) {
        return '로비 이름을 입력해주세요.';
    }

    if (title.length > CREATE_LOBBY_POLICY.TITLE_MAX_LENGTH) {
        return `로비 이름은 최대 ${CREATE_LOBBY_POLICY.TITLE_MAX_LENGTH}자까지 입력할 수 있습니다.`;
    }

    if (
        selectedMap &&
        !hasValidLobbyMapSongCount(selectedMap.numOfSong)
    ) {
        return '곡이 1개 이상 등록된 맵을 선택해주세요.';
    }

    return {
        title,
        maxPlayers: formState.maxPlayers,
        isPrivate: formState.isPrivate,
        mapId: selectedMap?.mapId ?? null,
        questionCount: clampLobbyQuestionCount(
            formState.questionCount,
            selectedMap?.numOfSong,
        ),
        timeLimitSeconds: formState.timeLimitSeconds,
    };
}

function mapDetailToSummary(map: MapDetailResponse): MapSummary {
    return {
        mapId: map.id,
        title: map.title,
        description: map.description,
        category: map.category,
        numOfSong: map.numOfSong,
        totalPlayTime: map.totalPlayTime,
        playCount: map.playCount,
        isPublic: map.isPublic,
        pendingPublic: map.pendingPublic,
        ownerId: map.ownerId,
        ownerNickname: map.ownerNickname,
    };
}

function LobbyCreateTopBar() {
    const navigate = useNavigate();
    const nickname = useAuthStore((state) => state.nickname);
    const userId = useAuthStore((state) => state.userId);
    const userIdentifier = useAuthStore((state) => state.userIdentifier);
    const userType = useAuthStore((state) => state.userType);
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    const displayNickname = nickname ?? 'Guest';
    const avatarText = displayNickname.charAt(0).toUpperCase();
    const avatarColorSeed =
        userIdentifier ?? userId?.toString() ?? nickname ?? 'monomat-user';
    const avatarColor = getAvatarColor(avatarColorSeed);
    const accountType = userType === 'REGISTERED' ? 'member' : 'guest';

    return (
        <>
            <header className="h-[75px] shrink-0 border border-[color:var(--monomat-border-default)] bg-white">
                <div className="mx-auto flex h-full w-full max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-[39px]">
                    <button
                        type="button"
                        onClick={() => navigate(LOBBY_ROUTES.LIST)}
                        className="h-10 w-[190px] shrink-0"
                        aria-label="로비 목록으로 이동"
                    >
                        <MonomatLogo />
                    </button>

                    <button
                        type="button"
                        onClick={() => setIsAccountModalOpen(true)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl font-extrabold leading-none text-white"
                        style={{ backgroundColor: avatarColor }}
                        aria-label="내 계정 열기"
                    >
                        {avatarText}
                    </button>
                </div>
            </header>

            <AccountModal
                isOpen={isAccountModalOpen}
                accountType={accountType}
                onClose={() => setIsAccountModalOpen(false)}
            />
        </>
    );
}

function LobbyRangeControl({
    id,
    label,
    value,
    unit = '',
    min,
    max,
    disabled,
    onChange,
    showNumberInput = false,
    numberInputAriaLabel,
}: LobbyRangeControlProps) {
    const [numberInputValue, setNumberInputValue] = useState<string | null>(
        null,
    );
    const displayedNumberInputValue = numberInputValue ?? String(value);

    const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
        onChange(Number(event.target.value));
    };

    const handleNumberInputChange = (
        event: ChangeEvent<HTMLInputElement>,
    ) => {
        const nextValue = event.target.value;
        const parsedValue = Number(nextValue);

        setNumberInputValue(nextValue);

        if (
            nextValue.trim() === '' ||
            !Number.isFinite(parsedValue)
        ) {
            return;
        }

        onChange(
            normalizeLobbyQuestionCountInput(
                nextValue,
                max,
                value,
            ),
        );
    };

    const handleNumberInputBlur = () => {
        const normalizedValue = normalizeLobbyQuestionCountInput(
            displayedNumberInputValue,
            max,
            value,
        );

        setNumberInputValue(null);
        onChange(normalizedValue);
    };

    return (
        <div className="block min-w-0">
            <div className="mb-[9px] flex min-h-8 items-center justify-between gap-3">
                <label
                    htmlFor={id}
                    className="min-w-0 text-base leading-5 text-[var(--monomat-text-muted)]"
                >
                    {label} :{' '}
                    <strong className="font-semibold text-black">
                        {value}
                        {unit}
                    </strong>
                </label>

                {showNumberInput && (
                    <input
                        type="number"
                        inputMode="numeric"
                        min={min}
                        max={max}
                        step={1}
                        value={displayedNumberInputValue}
                        disabled={disabled}
                        aria-label={numberInputAriaLabel ?? label}
                        onFocus={() => setNumberInputValue(String(value))}
                        onChange={handleNumberInputChange}
                        onBlur={handleNumberInputBlur}
                        className="h-8 w-[72px] shrink-0 rounded-lg border border-[var(--monomat-border-input)] bg-[var(--monomat-page-bg)] px-2 text-right text-sm font-semibold text-[var(--monomat-text-strong)] outline-none transition focus:border-[var(--monomat-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                    />
                )}
            </div>

            <input
                id={id}
                type="range"
                min={min}
                max={max}
                value={value}
                disabled={disabled}
                onChange={handleChange}
                style={{
                    background: getRangeBackground(value, min, max),
                }}
                className="block h-[7px] w-full cursor-pointer appearance-none rounded-[3px] border border-[var(--monomat-border-input)] outline-none transition disabled:cursor-not-allowed disabled:opacity-60 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[var(--monomat-primary)] [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--monomat-primary)]"
            />
        </div>
    );
}

function VisibilityOption({
    title,
    description,
    icon,
    isSelected,
    disabled,
    onClick,
}: VisibilityOptionProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-pressed={isSelected}
            className={`relative flex h-20 min-w-0 items-center rounded-lg border px-[25px] text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                    ? 'border-[var(--monomat-primary)] bg-[var(--monomat-primary-light)]'
                    : 'border-[var(--monomat-border-input)] bg-white hover:border-[var(--monomat-primary)]'
            }`}
        >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[#2B3F6C]">
                {icon}
            </span>

            <span className="ml-[28px] min-w-0">
                <span className="block text-base font-semibold leading-[19px] text-black">
                    {title}
                </span>
                <span className="mt-1 block text-sm leading-[17px] text-[#9d9d9d]">
                    {description}
                </span>
            </span>
        </button>
    );
}

export function LobbyCreate() {
    const navigate = useNavigate();
    const stompClient = useSocketStore((state) => state.stompClient);
    const connectionStatus = useSocketStore((state) => state.connectionStatus);
    const [searchParams] = useSearchParams();
    const [formState, setFormState] =
        useState<LobbyCreateFormState>(DEFAULT_FORM_STATE);
    const [selectedMap, setSelectedMap] = useState<MapSummary | null>(null);
    const [isMapSelectModalOpen, setIsMapSelectModalOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const appliedPreselectedMapIdRef = useRef<number | null>(null);
    const mapIdParam = searchParams.get(LOBBY_QUERY_PARAMS.MAP_ID);
    const parsedMapId = Number(mapIdParam);
    const hasPreselectedMapId = mapIdParam !== null;
    const isValidPreselectedMapId =
        hasPreselectedMapId &&
        Number.isInteger(parsedMapId) &&
        parsedMapId > 0;
    const preselectedMapId = isValidPreselectedMapId ? parsedMapId : 0;

    const preselectedMapQuery = useQuery<MapDetailResponse>({
        queryKey: ['myMapDetail', preselectedMapId],
        queryFn: () => getMyMapDetail(preselectedMapId),
        enabled: isValidPreselectedMapId,
    });

    useEffect(() => {
        if (
            !preselectedMapQuery.data ||
            appliedPreselectedMapIdRef.current ===
                preselectedMapQuery.data.id
        ) {
            return;
        }

        const map = mapDetailToSummary(preselectedMapQuery.data);

        appliedPreselectedMapIdRef.current = map.mapId;
        setSelectedMap(map);
        setFormState((currentFormState) => ({
            ...currentFormState,
            questionCount: getLobbyQuestionCountMax(map.numOfSong),
        }));
    }, [preselectedMapQuery.data]);

    const preselectedMapErrorMessage = !hasPreselectedMapId
        ? null
        : !isValidPreselectedMapId
            ? LOBBY_CREATE_MAP_PRESELECT_COPY.INVALID_MAP_ID
            : preselectedMapQuery.isError
                ? getErrorMessage(
                    preselectedMapQuery.error,
                    LOBBY_CREATE_MAP_PRESELECT_COPY.FETCH_ERROR,
                )
                : null;

    const updateFormState = <TKey extends keyof LobbyCreateFormState>(
        key: TKey,
        value: LobbyCreateFormState[TKey],
    ) => {
        setFormState((currentFormState) => ({
            ...currentFormState,
            [key]: value,
        }));
        setErrorMessage(null);
    };

    const handleCancel = () => {
        if (isSubmitting) {
            return;
        }

        navigate(LOBBY_ROUTES.LIST);
    };

    const handleMapSelectClick = () => {
        setErrorMessage(null);
        setIsMapSelectModalOpen(true);
    };

    const handleMapConfirm = (map: MapSummary) => {
        const isSameMap = selectedMap?.mapId === map.mapId;

        setSelectedMap(map);
        setFormState((currentFormState) => ({
            ...currentFormState,
            questionCount: isSameMap
                ? clampLobbyQuestionCount(
                    currentFormState.questionCount,
                    map.numOfSong,
                )
                : getLobbyQuestionCountMax(map.numOfSong),
        }));
        setErrorMessage(null);
    };

    const handleSelectedMapClear = (
        event: MouseEvent<HTMLButtonElement>,
    ) => {
        event.stopPropagation();
        setSelectedMap(null);
        setFormState((currentFormState) => ({
            ...currentFormState,
            questionCount: CREATE_LOBBY_POLICY.DEFAULT_QUESTION_COUNT,
        }));
        setErrorMessage(null);
    };

    const questionCountMax = getLobbyQuestionCountMax(
        selectedMap?.numOfSong,
    );
    const isQuestionCountDisabled =
        isSubmitting ||
        Boolean(
            selectedMap &&
            !hasValidLobbyMapSongCount(selectedMap.numOfSong),
        );
    const questionCountGuide = selectedMap
        ? hasValidLobbyMapSongCount(selectedMap.numOfSong)
            ? `이 맵은 최대 ${questionCountMax}라운드까지 진행할 수 있습니다.`
            : '등록된 곡이 없어 라운드 수를 설정할 수 없습니다.'
        : `맵을 선택하지 않으면 기본 ${CREATE_LOBBY_POLICY.DEFAULT_QUESTION_COUNT}라운드, 최대 ${CREATE_LOBBY_POLICY.MAX_QUESTION_COUNT}라운드로 설정됩니다.`;

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (isSubmitting) {
            return;
        }

        const request = createRequestFromFormState(formState, selectedMap);

        if (typeof request === 'string') {
            setErrorMessage(request);
            return;
        }

        try {
            setIsSubmitting(true);
            setErrorMessage(null);

            const response = await createLobby(request);

            // 로비 목록 화면을 보고 있는 다른 사용자들에게 실시간 갱신을 알린다.
            if (stompClient && connectionStatus === 'connected') {
                try {
                    stompClient.publish({
                        destination: SOCKET_PUBLISH.LOBBY_CREATE,
                    });
                } catch (error) {
                    console.error('[LobbyCreate] 로비 생성 알림 송신 실패:', error);
                }
            }

            navigate(LOBBY_ROUTES.ROOM(response.inviteCode));
        } catch (error) {
            setErrorMessage(
                getErrorMessage(error, '로비 생성에 실패했습니다.'),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen flex-col bg-[var(--monomat-page-bg)] text-left text-[var(--monomat-text-strong)]">
            <LobbyCreateTopBar />

            <main className="mx-auto flex w-full max-w-[1440px] flex-1 px-4 sm:px-6 lg:px-8 xl:px-10">
                <form
                    onSubmit={handleSubmit}
                    className="mx-auto flex w-full max-w-[900px] flex-col pb-[18px] pt-[30px]"
                >
                    <section className="h-[111px] overflow-hidden">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="flex h-5 items-center text-base font-semibold leading-5 text-[var(--monomat-text-muted)] transition hover:text-[var(--monomat-text-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            ← 로비 목록으로
                        </button>

                        <h1 className="!mb-0 !ml-0 !mr-0 !mt-[13px] !text-[36px] !font-extrabold !leading-[43px] !text-[var(--monomat-text-strong)]">
                            로비 만들기
                        </h1>

                        <p className="mt-[10px] h-5 text-sm font-medium leading-5 text-[var(--monomat-text-muted)]">
                            맵을 선택하고 방 정보를 설정한 뒤 친구들을 초대하세요.
                        </p>
                    </section>

                    <section className="mt-[19px] h-[230px] overflow-hidden rounded-[16px] bg-white px-[25px] pt-6 shadow-[0px_4px_16px_rgba(0,0,0,0.25)]">
                        <div className="flex h-[43px] items-start justify-between gap-4">
                            <div>
                                <h2 className="!m-0 h-[21px] !text-lg !font-bold !leading-[21px] !text-black">
                                    맵 선택
                                </h2>
                                <p className="mt-[5px] h-[17px] text-xs font-medium leading-[17px] text-[var(--monomat-text-muted)]">
                                    게임을 진행할 문제 리스트를 고르세요.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={handleMapSelectClick}
                                disabled={
                                    isSubmitting ||
                                    preselectedMapQuery.isLoading
                                }
                                className="h-10 w-20 shrink-0 rounded-lg border border-[var(--monomat-border-input)] bg-white text-[15px] font-bold text-black transition hover:bg-[var(--monomat-page-bg)] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {selectedMap ? '맵 변경' : '맵 선택'}
                            </button>
                        </div>

                        {preselectedMapQuery.isLoading ? (
                            <div className="mt-[18px] flex h-[120px] items-center justify-center rounded-lg border border-[var(--monomat-border-default)] bg-[var(--monomat-page-bg)] text-sm font-medium text-[var(--monomat-text-muted)]">
                                {LOBBY_CREATE_MAP_PRESELECT_COPY.LOADING}
                            </div>
                        ) : selectedMap ? (
                            <div className="mt-[18px] flex h-[120px] items-center rounded-lg border border-[var(--monomat-border-default)] bg-[var(--monomat-page-bg)] px-[25px]">
                                <span className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-lg bg-[var(--monomat-primary-light)] text-[#2B3F6C]">
                                    <Music size={24} strokeWidth={1.7} />
                                </span>

                                <div className="ml-[17px] min-w-0 flex-1">
                                    <h3 className="!m-0 overflow-hidden break-keep [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] !text-xl !font-bold !leading-[23px] !text-black [overflow-wrap:anywhere]">
                                        {selectedMap.title}
                                    </h3>
                                    <p className="mt-1 truncate text-sm font-medium leading-[18px] text-[var(--monomat-text-muted)]">
                                        {selectedMap.category} | 곡{' '}
                                        {selectedMap.numOfSong}개 |{' '}
                                        {formatMapOwnerNickname(
                                            selectedMap.ownerNickname,
                                        )}
                                    </p>
                                    <p className="mt-1 overflow-hidden whitespace-pre-line break-keep [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] text-xs font-medium leading-4 text-[var(--monomat-text-muted)] [overflow-wrap:anywhere]">
                                        {formatMapDescription(
                                            selectedMap.description,
                                        )}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSelectedMapClear}
                                    disabled={isSubmitting}
                                    className="ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--monomat-text-muted)] transition hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                                    aria-label="선택된 맵 해제"
                                >
                                    <X size={20} strokeWidth={1.8} />
                                </button>
                            </div>
                        ) : (
                            <div className="mt-[18px] flex h-[120px] items-center justify-center rounded-lg border-[1.5px] border-dashed border-[var(--monomat-border-input)] bg-white text-center text-base font-medium leading-[120px] text-[var(--monomat-text-muted)]">
                                선택된 맵이 없습니다.
                            </div>
                        )}
                    </section>

                    <section className="mt-[27px] h-auto overflow-visible rounded-[16px] bg-white px-[25px] pb-6 pt-6 shadow-[0px_4px_16px_rgba(0,0,0,0.25)] md:h-[371px] md:overflow-hidden md:pb-0">
                        <h2 className="!m-0 h-[21px] !text-lg !font-bold !leading-[21px] !text-black">
                            로비 정보
                        </h2>

                        <div className="mt-[14px] h-[68px]">
                            <label
                                htmlFor="create-lobby-title"
                                className="block h-[17px] text-sm font-medium leading-[17px] text-[var(--monomat-text-muted)]"
                            >
                                로비 이름
                            </label>

                            <MonomatInput
                                id="create-lobby-title"
                                type="text"
                                value={formState.title}
                                maxLength={CREATE_LOBBY_POLICY.TITLE_MAX_LENGTH}
                                autoFocus
                                disabled={isSubmitting}
                                preventEnterSubmit={false}
                                onChange={(event) =>
                                    updateFormState(
                                        'title',
                                        event.target.value,
                                    )
                                }
                                placeholder="예 : J-POP 퀴즈 대결"
                                className="mt-[7px] h-11 w-full rounded-lg border border-[var(--monomat-border-input)] bg-[var(--monomat-page-bg)] px-5 text-sm font-medium text-[var(--monomat-text-strong)] outline-none transition placeholder:text-[var(--monomat-text-muted)] focus:border-[var(--monomat-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                            />
                        </div>

                        <div className="mt-[33px] grid grid-cols-1 gap-7 md:grid-cols-[246px_240px_243px] md:gap-[60px]">
                            <LobbyRangeControl
                                id="create-lobby-max-players"
                                label="최대 인원"
                                value={formState.maxPlayers}
                                unit="명"
                                min={CREATE_LOBBY_POLICY.MIN_PLAYERS}
                                max={CREATE_LOBBY_POLICY.MAX_PLAYERS}
                                disabled={isSubmitting}
                                onChange={(value) =>
                                    updateFormState('maxPlayers', value)
                                }
                            />

                            <LobbyRangeControl
                                id="create-lobby-question-count"
                                label="라운드 수"
                                value={formState.questionCount}
                                min={CREATE_LOBBY_POLICY.MIN_QUESTION_COUNT}
                                max={questionCountMax}
                                disabled={isQuestionCountDisabled}
                                onChange={(value) =>
                                    updateFormState('questionCount', value)
                                }
                                showNumberInput
                                numberInputAriaLabel="라운드 수 직접 입력"
                            />

                            <LobbyRangeControl
                                id="create-lobby-time-limit"
                                label="라운드 당"
                                value={formState.timeLimitSeconds}
                                unit="초"
                                min={
                                    CREATE_LOBBY_POLICY.MIN_TIME_LIMIT_SECONDS
                                }
                                max={
                                    CREATE_LOBBY_POLICY.MAX_TIME_LIMIT_SECONDS
                                }
                                disabled={isSubmitting}
                                onChange={(value) =>
                                    updateFormState('timeLimitSeconds', value)
                                }
                            />
                        </div>

                        <p className="mt-3 min-h-5 break-keep text-xs font-medium leading-5 text-[var(--monomat-text-muted)]">
                            {questionCountGuide}
                        </p>

                        <p className="mt-3 h-5 text-base leading-5 text-[var(--monomat-text-muted)]">
                            공개 설정
                        </p>

                        <div className="mt-[14px] grid grid-cols-1 gap-4 md:grid-cols-[415px_415px] md:gap-5">
                            <VisibilityOption
                                title="공개"
                                description="로비 목록에 노출"
                                icon={
                                    <Gamepad2 size={25} strokeWidth={1.7} />
                                }
                                isSelected={!formState.isPrivate}
                                disabled={isSubmitting}
                                onClick={() =>
                                    updateFormState('isPrivate', false)
                                }
                            />

                            <VisibilityOption
                                title="비공개"
                                description="초대 코드로만 입장"
                                icon={
                                    <LockKeyhole
                                        size={24}
                                        strokeWidth={1.7}
                                    />
                                }
                                isSelected={formState.isPrivate}
                                disabled={isSubmitting}
                                onClick={() =>
                                    updateFormState('isPrivate', true)
                                }
                            />
                        </div>
                    </section>

                    {errorMessage && (
                        <div
                            role="alert"
                            className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 ring-1 ring-red-100"
                        >
                            {errorMessage}
                        </div>
                    )}

                    {preselectedMapErrorMessage && (
                        <div
                            role="alert"
                            className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 ring-1 ring-amber-100"
                        >
                            {preselectedMapErrorMessage}
                        </div>
                    )}

                    <div className="mt-[19px] flex justify-end gap-[15px]">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="h-10 w-20 rounded-lg border border-[var(--monomat-border-input)] bg-white text-[15px] font-bold text-black transition hover:bg-[var(--monomat-page-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            취소
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="h-10 w-[110px] rounded-lg bg-[var(--monomat-primary)] text-[15px] font-bold text-white transition hover:bg-[var(--monomat-primary-hover)] disabled:cursor-not-allowed disabled:bg-[var(--monomat-primary-disabled)]"
                        >
                            {isSubmitting ? '생성 중' : '로비 만들기'}
                        </button>
                    </div>
                </form>
            </main>

            <LobbyFooter />

            <MapSelectModal
                isOpen={isMapSelectModalOpen}
                selectedMap={selectedMap}
                onConfirm={handleMapConfirm}
                onClose={() => setIsMapSelectModalOpen(false)}
            />
        </div>
    );
}
