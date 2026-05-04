import type { UILanguage } from './types';

export interface ExportMessages {
  hiddenContainerMissing: string;
  noPages: string;
  pageCountMismatch: (screenCount: number, dataCount: number) => string;
  pageElementMissing: (pageNumber: number, format: string) => string;
  pageSaveFailed: (pageNumber: number, format: string, message: string) => string;
  exportFailed: (message: string) => string;
}

export interface AppText {
  loading: string;
  brand: string;
  language: {
    label: string;
    korean: string;
    japanese: string;
  };
  settingsTitle: string;
  undo: string;
  redo: string;
  sidebarTabs: {
    page: string;
    layout: string;
    text: string;
    stamp: string;
    export: string;
  };
  stampPanelTitle: string;
  stampLoading: string;
  stampLoadFailed: string;
  stampEmpty: string;
  stampResultCount: (count: number) => string;
  backgroundColor: string;
  backgroundColorNames: Record<string, string>;
  customBackgroundColor: string;
  printWarrantyGuide: string;
  layout: string;
  layoutLabels: Record<string, string>;
  layoutFilters: {
    page: string;
    all: string;
    onePage: string;
    twoPage: string;
    cover: string;
    title: string;
    colophon: string;
  };
  layoutBadges: {
    onePage: string;
    twoPage: string;
    photoCount: (count: number) => string;
    textCount: (count: number) => string;
    objectLayer: string;
    nonSelectable: string;
  };
  layoutResultCount: (count: number) => string;
  layoutLoading: string;
  layoutLoadFailed: string;
  retry: string;
  pageManagement: (count: number) => string;
  bodyPageCount: string;
  bodyPageCountOption: (count: number) => string;
  totalPageCount: (count: number) => string;
  overviewOpen: string;
  previousPage: string;
  nextPage: string;
  movePageForward: string;
  movePageBackward: string;
  addPage: string;
  deletePage: string;
  download: string;
  exportPng: string;
  exportJpeg: string;
  exportZip: string;
  exportMode: {
    label: string;
    individual: string;
    zip: string;
  };
  textSettings: string;
  font: string;
  textLanguage: string;
  fontSize: string;
  selectTextPrompt: string;
  fontOptions: {
    auto: string;
    koreanSans: string;
    meiryo: string;
    yuGothic: string;
    mincho: string;
    serif: string;
    mono: string;
  };
  languageOptions: {
    auto: string;
    ko: string;
    ja: string;
    mixed: string;
  };
  exportOverlayTitle: string;
  exportOverlayDescription: string;
  deleteDialogTitle: string;
  deleteDialogDescription: string;
  confirmDelete: string;
  cancel: string;
  closeNotice: string;
  closeDeleteDialog: string;
  overviewTitle: string;
  overviewDescription: string;
  overviewClose: string;
  close: string;
  pageLabel: (pageNumber: number) => string;
  noTitle: string;
  coverTitlePlaceholder: string;
  coverDatePlaceholder: string;
  layoutTextPlaceholders: {
    title: string;
    subtitle: string;
    message: string;
    default: string;
  };
  coverPhotoDropLabel: string;
  coverPhotoAlt: string;
  photoCaptionPlaceholder: string;
  photoSlotLabel: string;
  photoDropLabel: string;
  photoAlt: (slotNumber: number) => string;
  photoFill: string;
  photoContain: string;
  photoRemove: string;
  imageLoadError: string;
  imageResolution: string;
  imageResolutionOptions: {
    original: string;
    '4000px': string;
    '2400px': string;
    '1600px': string;
    '800px': string;
  };
  exportMessages: ExportMessages;
}

export const TRANSLATIONS: Record<UILanguage, AppText> = {
  ko: {
    loading: '데이터를 불러오는 중...',
    brand: 'PhotoBook',
    language: {
      label: '언어 설정',
      korean: '한국어',
      japanese: '日本語',
    },
    settingsTitle: '앱 설정',
    undo: '취소',
    redo: '복구',
    sidebarTabs: {
      page: '페이지',
      layout: '레이아웃',
      text: '텍스트',
      stamp: '스탬프',
      export: '저장',
    },
    stampPanelTitle: '스탬프',
    stampLoading: '스탬프 불러오는 중',
    stampLoadFailed: '스탬프를 불러오지 못했습니다',
    stampEmpty: '이 페이지에서 사용할 수 있는 스탬프가 없습니다',
    stampResultCount: (count) => `${count}개`,
    backgroundColor: '전체 배경색',
    backgroundColorNames: {
      '#ffffff': '흰색',
      '#fdfbf7': '크림',
      '#fdf3f4': '핑크',
      '#f0f4f8': '블루',
      '#f2f8f2': '민트',
      '#fff9e6': '옐로우',
    },
    customBackgroundColor: '직접 배경색 선택',
    printWarrantyGuide: '인쇄 보증 외 표시',
    layout: '페이지 레이아웃',
    layoutLabels: {
      cover: '표지 (Cover)',
      '1': '1장',
      '2-row': '2장 (위아래)',
      '2-col': '2장 (좌우)',
      '3-row': '3장 (가로)',
      '3-top': '3장 (상단 강조)',
      '4-grid': '4장 (바둑판)',
      '4-top': '4장 (상단 강조)',
      '5-grid': '5장',
      '6-grid': '6장',
      'imported-a4-1': '샘플 1장',
      'imported-a4-2': '샘플 2장',
      'imported-a4-3': '샘플 3장',
      'imported-a4-4': '샘플 4장',
    },
    layoutFilters: {
      page: '본문',
      all: '전체',
      onePage: '1페이지',
      twoPage: '2페이지',
      cover: '표지',
      title: '타이틀',
      colophon: '콜로폰',
    },
    layoutBadges: {
      onePage: '1P',
      twoPage: '2P 펼침면',
      photoCount: (count) => `사진 ${count}`,
      textCount: (count) => `텍스트 ${count}`,
      objectLayer: '오브젝트',
      nonSelectable: '비선택',
    },
    layoutResultCount: (count) => `${count}개`,
    layoutLoading: '레이아웃 불러오는 중',
    layoutLoadFailed: '레이아웃을 불러오지 못했습니다',
    retry: '다시 시도',
    pageManagement: (count) => `페이지 관리 (${count}장)`,
    bodyPageCount: '본문 페이지 수',
    bodyPageCountOption: (count) => `${count}장`,
    totalPageCount: (count) => `전체 ${count}장`,
    overviewOpen: '전체 보기',
    previousPage: '이전 페이지로 이동',
    nextPage: '다음 페이지로 이동',
    movePageForward: '앞 페이지',
    movePageBackward: '뒤 페이지',
    addPage: '새 페이지',
    deletePage: '현재 페이지 삭제',
    download: '다운로드 (Export)',
    exportPng: 'PNG로 저장',
    exportJpeg: 'JPEG로 저장',
    exportZip: 'ZIP으로 묶어서 저장',
    exportMode: {
      label: '저장 방식',
      individual: '개별 파일 다운로드',
      zip: '하나의 ZIP 파일로 묶기',
    },
    textSettings: '텍스트 설정',
    font: '폰트',
    textLanguage: '언어',
    fontSize: '글자 크기',
    selectTextPrompt: 'A4 화면에서 편집할 텍스트를 선택하세요.',
    fontOptions: {
      auto: '자동',
      koreanSans: '한국어 고딕',
      meiryo: 'Meiryo / メイリオ',
      yuGothic: 'Yu Gothic / 游ゴシック',
      mincho: '명조 / 明朝',
      serif: 'Serif',
      mono: 'Mono',
    },
    languageOptions: {
      auto: '자동',
      ko: '한국어',
      ja: '日本語',
      mixed: '혼합',
    },
    exportOverlayTitle: '포토북을 추출하고 있습니다...',
    exportOverlayDescription: '페이지가 많을 경우 시간이 조금 걸릴 수 있습니다.',
    deleteDialogTitle: '현재 페이지를 삭제할까요?',
    deleteDialogDescription: '삭제한 페이지는 실행 취소로 되돌릴 수 있습니다.',
    confirmDelete: '삭제',
    cancel: '취소',
    closeNotice: '알림 닫기',
    closeDeleteDialog: '삭제 확인 닫기',
    overviewTitle: '전체 페이지 보기',
    overviewDescription: '드래그하여 순서를 바꾸거나, 페이지를 선택하여 이동하세요.',
    overviewClose: '전체 페이지 보기 닫기',
    close: '닫기',
    pageLabel: (pageNumber) => `Page ${pageNumber}`,
    noTitle: 'No Title',
    coverTitlePlaceholder: '포토북 제목 (예: 우리 아이 1년의 기록)',
    coverDatePlaceholder: '날짜 (예: 2026.05.01)',
    layoutTextPlaceholders: {
      title: '제목',
      subtitle: '부제목',
      message: '텍스트 입력',
      default: '텍스트 입력',
    },
    coverPhotoDropLabel: '드래그하여 표지 사진 넣기',
    coverPhotoAlt: '표지 사진',
    photoCaptionPlaceholder: '사진 설명을 입력하세요 (한 줄)',
    photoSlotLabel: '클릭 또는 드래그하여 사진 넣기',
    photoDropLabel: '여기에 사진 놓기',
    photoAlt: (slotNumber) => `사진 ${slotNumber}`,
    photoFill: '사진 꽉 채우기',
    photoContain: '사진 원본 비율로 보기',
    photoRemove: '사진 지우기',
    imageLoadError: '이미지를 불러오는데 실패했습니다.',
    imageResolution: '사진 업로드 크기 제한 (메모리 최적화)',
    imageResolutionOptions: {
      original: '원본 유지',
      '4000px': '4000px (고해상도 인쇄)',
      '2400px': '2400px (권장)',
      '1600px': '1600px (경량)',
      '800px': '800px (프리뷰)',
    },
    exportMessages: {
      hiddenContainerMissing: '오류: 숨겨진 페이지 컨테이너를 찾을 수 없습니다.',
      noPages: '오류: 추출할 페이지가 없습니다.',
      pageCountMismatch: (screenCount, dataCount) => `추출 페이지 수가 일치하지 않습니다. 화면 ${screenCount}개, 데이터 ${dataCount}개`,
      pageElementMissing: (pageNumber, format) => `${pageNumber}페이지 ${format} 저장 실패: 페이지 요소를 찾을 수 없습니다.`,
      pageSaveFailed: (pageNumber, format, message) => `${pageNumber}페이지 ${format} 저장 실패: ${message}`,
      exportFailed: (message) => `전체 페이지 저장 중 오류가 발생했습니다: ${message}`,
    },
  },
  ja: {
    loading: 'データを読み込んでいます...',
    brand: 'PhotoBook',
    language: {
      label: '言語設定',
      korean: '한국어',
      japanese: '日本語',
    },
    settingsTitle: 'アプリ設定',
    undo: '元に戻す',
    redo: 'やり直し',
    sidebarTabs: {
      page: 'ページ',
      layout: 'レイアウト',
      text: 'テキスト',
      stamp: 'スタンプ',
      export: '保存',
    },
    stampPanelTitle: 'スタンプ',
    stampLoading: 'スタンプを読み込み中',
    stampLoadFailed: 'スタンプを読み込めませんでした',
    stampEmpty: 'このページで使えるスタンプはありません',
    stampResultCount: (count) => `${count}件`,
    backgroundColor: '全体の背景色',
    backgroundColorNames: {
      '#ffffff': '白',
      '#fdfbf7': 'クリーム',
      '#fdf3f4': 'ピンク',
      '#f0f4f8': 'ブルー',
      '#f2f8f2': 'ミント',
      '#fff9e6': 'イエロー',
    },
    customBackgroundColor: '背景色を選択',
    printWarrantyGuide: '印刷保証外',
    layout: 'ページレイアウト',
    layoutLabels: {
      cover: '表紙 (Cover)',
      '1': '1枚',
      '2-row': '2枚 (上下)',
      '2-col': '2枚 (左右)',
      '3-row': '3枚 (横)',
      '3-top': '3枚 (上を強調)',
      '4-grid': '4枚 (グリッド)',
      '4-top': '4枚 (上を強調)',
      '5-grid': '5枚',
      '6-grid': '6枚',
      'imported-a4-1': 'サンプル 1枚',
      'imported-a4-2': 'サンプル 2枚',
      'imported-a4-3': 'サンプル 3枚',
      'imported-a4-4': 'サンプル 4枚',
    },
    layoutFilters: {
      page: '本文',
      all: '全て',
      onePage: '1ページ',
      twoPage: '2ページ',
      cover: '表紙',
      title: 'タイトル',
      colophon: '奥付',
    },
    layoutBadges: {
      onePage: '1P',
      twoPage: '2P 見開き',
      photoCount: (count) => `写真 ${count}`,
      textCount: (count) => `テキスト ${count}`,
      objectLayer: 'オブジェクト',
      nonSelectable: '非選択',
    },
    layoutResultCount: (count) => `${count}件`,
    layoutLoading: 'レイアウトを読み込み中',
    layoutLoadFailed: 'レイアウトを読み込めませんでした',
    retry: '再試行',
    pageManagement: (count) => `ページ管理 (${count}枚)`,
    bodyPageCount: '本文ページ数',
    bodyPageCountOption: (count) => `${count}枚`,
    totalPageCount: (count) => `全体 ${count}枚`,
    overviewOpen: '一覧',
    previousPage: '前のページへ移動',
    nextPage: '次のページへ移動',
    movePageForward: '前へ',
    movePageBackward: '後ろへ',
    addPage: '新規ページ',
    deletePage: '現在のページを削除',
    download: 'ダウンロード (Export)',
    exportPng: 'PNGで保存',
    exportJpeg: 'JPEGで保存',
    exportZip: 'ZIPでまとめて保存',
    exportMode: {
      label: '保存方法',
      individual: '個別のファイルとしてダウンロード',
      zip: '一つのZIPファイルにまとめる',
    },
    textSettings: 'テキスト設定',
    font: 'フォント',
    textLanguage: '言語',
    fontSize: '文字サイズ',
    selectTextPrompt: 'A4画面で編集するテキストを選択してください。',
    fontOptions: {
      auto: '自動',
      koreanSans: '韓国語ゴシック',
      meiryo: 'Meiryo / メイリオ',
      yuGothic: 'Yu Gothic / 游ゴシック',
      mincho: '明朝',
      serif: 'Serif',
      mono: 'Mono',
    },
    languageOptions: {
      auto: '自動',
      ko: '韓国語',
      ja: '日本語',
      mixed: '混在',
    },
    exportOverlayTitle: 'フォトブックを書き出しています...',
    exportOverlayDescription: 'ページ数が多い場合は少し時間がかかります。',
    deleteDialogTitle: '現在のページを削除しますか？',
    deleteDialogDescription: '削除したページは「元に戻す」で復元できます。',
    confirmDelete: '削除',
    cancel: 'キャンセル',
    closeNotice: '通知を閉じる',
    closeDeleteDialog: '削除確認を閉じる',
    overviewTitle: '全ページ一覧',
    overviewDescription: 'ドラッグして順序を変更するか、ページを選択して移動します。',
    overviewClose: '全ページ一覧を閉じる',
    close: '閉じる',
    pageLabel: (pageNumber) => `Page ${pageNumber}`,
    noTitle: 'タイトルなし',
    coverTitlePlaceholder: 'フォトブックのタイトル (例: 家族の思い出)',
    coverDatePlaceholder: '日付 (例: 2026年5月1日)',
    layoutTextPlaceholders: {
      title: 'タイトル',
      subtitle: 'サブタイトル',
      message: 'テキストを入力',
      default: 'テキストを入力',
    },
    coverPhotoDropLabel: 'ドラッグして表紙写真を追加',
    coverPhotoAlt: '表紙写真',
    photoCaptionPlaceholder: '写真の説明を入力してください (1行)',
    photoSlotLabel: 'クリックまたはドラッグして写真を追加',
    photoDropLabel: 'ここに写真をドロップ',
    photoAlt: (slotNumber) => `写真 ${slotNumber}`,
    photoFill: '写真を全面に表示',
    photoContain: '写真を元の比率で表示',
    photoRemove: '写真を削除',
    imageLoadError: '画像の読み込みに失敗しました。',
    imageResolution: '写真アップロードサイズ制限 (メモリ最適化)',
    imageResolutionOptions: {
      original: '元のサイズ',
      '4000px': '4000px (高解像度印刷)',
      '2400px': '2400px (推奨)',
      '1600px': '1600px (軽量)',
      '800px': '800px (プレビュー)',
    },
    exportMessages: {
      hiddenContainerMissing: 'エラー: 非表示のページコンテナが見つかりません。',
      noPages: 'エラー: 書き出すページがありません。',
      pageCountMismatch: (screenCount, dataCount) => `書き出しページ数が一致しません。画面 ${screenCount}件、データ ${dataCount}件`,
      pageElementMissing: (pageNumber, format) => `${pageNumber}ページの${format}保存に失敗しました: ページ要素が見つかりません。`,
      pageSaveFailed: (pageNumber, format, message) => `${pageNumber}ページの${format}保存に失敗しました: ${message}`,
      exportFailed: (message) => `全ページ保存中にエラーが発生しました: ${message}`,
    },
  },
};
