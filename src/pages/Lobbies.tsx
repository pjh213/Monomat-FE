import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { NavigationBar } from '../components/common/NavigationBar';
import { GlobalChat } from '../components/lobby/GlobalChat';
import { LobbyFooter } from '../components/lobby/LobbyFooter';
import { LobbyHeader } from '../components/lobby/LobbyHeader';
import { LobbyList } from '../components/lobby/LobbyList';
import {
    DEFAULT_LOBBY_LIST_PAGE,
    DEFAULT_LOBBY_LIST_SIZE,
    LOBBY_ALL_CATEGORY_FILTER,
    LOBBY_CATEGORY_FILTERS,
    LOBBY_ROUTES,
} from '../constants/lobby';
import { useLobbyList, useLobbyTotalPages } from '../hooks/useLobbyList';
import { useLobbyListSocket } from '../hooks/useLobbyListSocket';
import {
    SORT_QUERY_MAP,
    type LobbyCategory,
    type LobbySortOption,
} from '../types/lobby';

type LobbyCategoryFilter = (typeof LOBBY_CATEGORY_FILTERS)[number];

function toMapCategory(
    category: LobbyCategoryFilter,
): LobbyCategory | undefined {
    return category === LOBBY_ALL_CATEGORY_FILTER ? undefined : category;
}

export function Lobbies() {
    const navigate = useNavigate();

    // 다른 사용자의 로비 생성/입장/퇴장/강퇴 시 목록을 실시간 갱신한다.
    useLobbyListSocket();

    const [searchKeyword, setSearchKeyword] = useState('');
    const [selectedCategory, setSelectedCategory] =
        useState<LobbyCategoryFilter>(LOBBY_ALL_CATEGORY_FILTER);
    const [sortOption, setSortOption] =
        useState<LobbySortOption>('LATEST');
    const [currentPage, setCurrentPage] = useState(DEFAULT_LOBBY_LIST_PAGE);

    const lobbyListQueryParams = useMemo(() => {
        const mapCategory = toMapCategory(selectedCategory);

        return {
            keyword: searchKeyword.trim(),
            ...(mapCategory ? { mapCategory } : {}),
            sort: SORT_QUERY_MAP[sortOption],
            page: currentPage,
            size: DEFAULT_LOBBY_LIST_SIZE,
        };
    }, [currentPage, searchKeyword, selectedCategory, sortOption]);

    const {
        data,
        isLoading,
        isError,
        refetch,
    } = useLobbyList(lobbyListQueryParams);
    const lobbyTotalPagesQuery = useLobbyTotalPages(lobbyListQueryParams);
    const lobbies = data?.items ?? [];
    const page = data?.page ?? currentPage;
    const totalPages = data?.totalPages ?? lobbyTotalPagesQuery.data;
    const hasNext = totalPages == null ? false : (data?.hasNext ?? false);
    const paginationTotalPages = totalPages ?? Math.max(page + 1, 1);

    const handleSearchKeywordChange = (value: string) => {
        setSearchKeyword(value);
        setCurrentPage(DEFAULT_LOBBY_LIST_PAGE);
    };

    const handleSelectedCategoryChange = (value: LobbyCategoryFilter) => {
        setSelectedCategory(value);
        setCurrentPage(DEFAULT_LOBBY_LIST_PAGE);
    };

    const handleSortOptionChange = (value: LobbySortOption) => {
        setSortOption(value);
        setCurrentPage(DEFAULT_LOBBY_LIST_PAGE);
    };

    const handleEnter = (code: string) => {
        navigate(LOBBY_ROUTES.ROOM(code));
    };

    return (
        <div className="flex min-h-screen flex-col bg-[var(--monomat-page-bg)] text-left">
            <NavigationBar />

            <main className="mx-auto grid w-full max-w-[1440px] flex-1 grid-cols-1 gap-5 px-4 pb-6 pt-5 sm:px-6 lg:px-8 xl:grid-cols-[minmax(0,880px)_minmax(320px,460px)] xl:gap-5 xl:px-10 xl:pb-[27px] xl:pt-7">
                <section className="min-w-0">
                    <LobbyHeader
                        searchKeyword={searchKeyword}
                        onSearchKeywordChange={handleSearchKeywordChange}
                        categories={LOBBY_CATEGORY_FILTERS}
                        selectedCategory={selectedCategory}
                        onSelectedCategoryChange={handleSelectedCategoryChange}
                        sortOption={sortOption}
                        onSortOptionChange={handleSortOptionChange}
                    />

                    <LobbyList
                        lobbies={lobbies}
                        isLoading={isLoading}
                        isError={isError}
                        page={page}
                        hasNext={hasNext}
                        totalPages={paginationTotalPages}
                        onRetry={() => void refetch()}
                        onEnter={handleEnter}
                        onPageChange={setCurrentPage}
                    />
                </section>

                <aside className="min-h-[520px] w-full min-w-0 xl:h-[730px]">
                    <GlobalChat />
                </aside>
            </main>

            <LobbyFooter />
        </div>
    );
}
