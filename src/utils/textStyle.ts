import type { TextLanguage, TextStyle } from '../types';

export type TextTarget =
  | { type: 'coverTitle'; pageId: string }
  | { type: 'coverDate'; pageId: string }
  | { type: 'caption'; pageId: string; photoIndex: number };

export const DEFAULT_COVER_TITLE_FONT_SIZE = 48;
export const DEFAULT_COVER_DATE_FONT_SIZE = 24;
export const DEFAULT_CAPTION_FONT_SIZE = 18;

export const KOREAN_FONT_STACK = 'Pretendard, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
export const JAPANESE_FONT_STACK = '"Meiryo", "Yu Gothic", "Hiragino Sans", "Noto Sans JP", sans-serif';
export const MIXED_CJK_FONT_STACK = 'Pretendard, "Meiryo", "Noto Sans CJK JP", "Noto Sans KR", sans-serif';

export const FONT_OPTIONS = [
  { id: 'auto', label: '자동', fontFamily: '' },
  { id: 'ko-sans', label: '한국어 고딕', fontFamily: KOREAN_FONT_STACK },
  { id: 'meiryo', label: 'Meiryo / メイリオ', fontFamily: '"Meiryo", sans-serif' },
  { id: 'yu-gothic', label: 'Yu Gothic / 游ゴシック', fontFamily: '"Yu Gothic", "YuGothic", sans-serif' },
  { id: 'mincho', label: '명조 / 明朝', fontFamily: '"Yu Mincho", "Hiragino Mincho ProN", "Noto Serif CJK JP", serif' },
  { id: 'serif', label: 'Serif', fontFamily: 'Georgia, "Times New Roman", serif' },
  { id: 'mono', label: 'Mono', fontFamily: '"Courier New", monospace' },
];

export const LANGUAGE_OPTIONS: { id: 'auto' | TextLanguage; label: string }[] = [
  { id: 'auto', label: '자동' },
  { id: 'ko', label: '한국어' },
  { id: 'ja', label: '日本語' },
  { id: 'mixed', label: '혼합' },
];

const HIRAGANA_KATAKANA_PATTERN = /[\u3040-\u30ff\u31f0-\u31ff]/;
const HANGUL_PATTERN = /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7af]/;

export const detectTextLanguage = (text: string): TextLanguage => {
  const hasJapaneseSignal = HIRAGANA_KATAKANA_PATTERN.test(text);
  const hasKoreanSignal = HANGUL_PATTERN.test(text);

  if (hasJapaneseSignal && hasKoreanSignal) return 'mixed';
  if (hasJapaneseSignal) return 'ja';
  if (hasKoreanSignal) return 'ko';
  return 'mixed';
};

export const getFontStackForLanguage = (language: TextLanguage) => {
  if (language === 'ko') return KOREAN_FONT_STACK;
  if (language === 'ja') return JAPANESE_FONT_STACK;
  return MIXED_CJK_FONT_STACK;
};

export const getDefaultTextStyle = (fontSize: number): Required<TextStyle> => ({
  fontMode: 'auto',
  fontFamily: '',
  fontSize,
  languageMode: 'auto',
  language: 'mixed',
});

export const resolveTextLanguage = (text: string, style: TextStyle | undefined): TextLanguage => {
  if (style?.languageMode === 'manual' && style.language) {
    return style.language;
  }

  return detectTextLanguage(text);
};

export const resolveTextStyle = (
  text: string,
  style: TextStyle | undefined,
  defaultFontSize: number,
) => {
  const defaultStyle = getDefaultTextStyle(defaultFontSize);
  const nextStyle = { ...defaultStyle, ...style };
  const language = resolveTextLanguage(text, nextStyle);
  const fontFamily = nextStyle.fontMode === 'manual' && nextStyle.fontFamily
    ? nextStyle.fontFamily
    : getFontStackForLanguage(language);

  return {
    style: {
      fontFamily,
      fontSize: `${nextStyle.fontSize}px`,
    },
    lang: language === 'mixed' ? undefined : language,
    values: {
      ...nextStyle,
      language,
    },
  };
};
