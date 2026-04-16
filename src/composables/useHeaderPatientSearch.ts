import { ref, computed, watch, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import { getPatientListApi } from "@/api/patient";

export interface HeaderSearchPatient {
  id: number;
  name: string;
  phone: string;
  source: string;
  age: number | string;
  firstVisit: string;
  createdAt: string;
}

const SEARCH_DEBOUNCE_MS = 350;

export function useHeaderPatientSearch() {
  const router = useRouter();
  const searchDialogOpen = ref(false);
  const searchKeyword = ref("");
  const headerSearchResults = ref<HeaderSearchPatient[]>([]);
  const headerSearchLoading = ref(false);
  const highlightedSearchIndex = ref(-1);

  let searchDebounceId: ReturnType<typeof setTimeout> | null = null;

  const headerSearchKeywordNorm = computed(() => searchKeyword.value.trim());
  const headerSearchDropdownVisible = computed(
    () => searchDialogOpen.value && headerSearchKeywordNorm.value.length > 0,
  );

  function openSearchDialog() {
    searchDialogOpen.value = true;
  }

  function closeSearchDialog() {
    searchDialogOpen.value = false;
    searchKeyword.value = "";
    headerSearchResults.value = [];
    headerSearchLoading.value = false;
    highlightedSearchIndex.value = -1;
    if (searchDebounceId) {
      clearTimeout(searchDebounceId);
      searchDebounceId = null;
    }
  }

  async function runHeaderPatientSearch() {
    const kw = searchKeyword.value.trim();
    if (!kw) {
      headerSearchResults.value = [];
      headerSearchLoading.value = false;
      highlightedSearchIndex.value = -1;
      return;
    }
    headerSearchLoading.value = true;
    headerSearchResults.value = [];
    try {
      const raw: { data?: { list?: HeaderSearchPatient[]; total?: number } } =
        await getPatientListApi({
          keyword: kw,
          page: 1,
          pageSize: 30,
        });
      headerSearchResults.value = raw.data?.list ?? [];
      highlightedSearchIndex.value = headerSearchResults.value.length > 0 ? 0 : -1;
    } catch {
      headerSearchResults.value = [];
      highlightedSearchIndex.value = -1;
    } finally {
      headerSearchLoading.value = false;
    }
  }

  function openPatientDetail(row: HeaderSearchPatient) {
    if (searchDebounceId) {
      clearTimeout(searchDebounceId);
      searchDebounceId = null;
    }
    searchKeyword.value = "";
    headerSearchResults.value = [];
    searchDialogOpen.value = false;
    highlightedSearchIndex.value = -1;
    router.push(`/patient/${row.id}`);
  }

  function moveHighlight(delta: number) {
    const list = headerSearchResults.value;
    if (!list.length) return;
    let i = highlightedSearchIndex.value;
    if (i < 0) i = 0;
    else i = (i + delta + list.length) % list.length;
    highlightedSearchIndex.value = i;
  }

  function openHighlightedPatient() {
    const list = headerSearchResults.value;
    const i = highlightedSearchIndex.value;
    if (i >= 0 && i < list.length) openPatientDetail(list[i]!);
  }

  watch(searchKeyword, (v) => {
    if (searchDebounceId) clearTimeout(searchDebounceId);
    if (!v.trim()) {
      headerSearchResults.value = [];
      headerSearchLoading.value = false;
      highlightedSearchIndex.value = -1;
      return;
    }
    searchDebounceId = setTimeout(() => {
      searchDebounceId = null;
      void runHeaderPatientSearch();
    }, SEARCH_DEBOUNCE_MS);
  });

  onBeforeUnmount(() => {
    if (searchDebounceId) clearTimeout(searchDebounceId);
  });

  return {
    searchDialogOpen,
    searchKeyword,
    headerSearchResults,
    headerSearchLoading,
    headerSearchDropdownVisible,
    highlightedSearchIndex,
    openSearchDialog,
    closeSearchDialog,
    openPatientDetail,
    moveHighlight,
    openHighlightedPatient,
  };
}
