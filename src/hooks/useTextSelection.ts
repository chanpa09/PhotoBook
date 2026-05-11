import { useState } from 'react';
import type { PageData, TextStyle } from '../types';
import { useProjectStore } from '../store/useProjectStore';
import type { TextTarget } from '../utils/textStyle';
import {
  DEFAULT_CAPTION_FONT_SIZE,
  DEFAULT_COVER_DATE_FONT_SIZE,
  DEFAULT_COVER_TITLE_FONT_SIZE,
  DEFAULT_LAYOUT_TEXT_FONT_SIZE,
  getDefaultTextStyle,
} from '../utils/textStyle';

export function useTextSelection(pages: PageData[], visiblePages: PageData[]) {
  const { updatePageData, updateLayoutText, updatePhoto } = useProjectStore();
  const [selectedTextTarget, setSelectedTextTarget] = useState<TextTarget | null>(null);

  const selectedTextStyle = (() => {
    if (!selectedTextTarget) return null;

    const targetPage = pages.find((page) => page.id === selectedTextTarget.pageId);
    if (!targetPage || !visiblePages.some((page) => page.id === targetPage.id)) return null;

    if (selectedTextTarget.type === 'coverTitle') {
      return {
        target: selectedTextTarget,
        style: {
          ...getDefaultTextStyle(DEFAULT_COVER_TITLE_FONT_SIZE),
          ...targetPage.coverTitleStyle,
        },
      };
    }

    if (selectedTextTarget.type === 'coverDate') {
      return {
        target: selectedTextTarget,
        style: {
          ...getDefaultTextStyle(DEFAULT_COVER_DATE_FONT_SIZE),
          ...targetPage.coverDateStyle,
        },
      };
    }

    if (selectedTextTarget.type === 'layoutText') {
      const layoutText = targetPage.layoutTexts?.[selectedTextTarget.textIndex];

      return {
        target: selectedTextTarget,
        style: {
          ...getDefaultTextStyle(DEFAULT_LAYOUT_TEXT_FONT_SIZE),
          ...layoutText?.style,
        },
      };
    }

    if (selectedTextTarget.type !== 'caption') return null;

    const photo = targetPage.photos[selectedTextTarget.photoIndex];
    if (!photo) return null;

    return {
      target: selectedTextTarget,
      style: {
        ...getDefaultTextStyle(DEFAULT_CAPTION_FONT_SIZE),
        ...photo.captionStyle,
      },
    };
  })();

  const updateSelectedTextStyle = (updates: TextStyle) => {
    if (!selectedTextTarget) return;

    const targetPage = pages.find((page) => page.id === selectedTextTarget.pageId);
    if (!targetPage || !visiblePages.some((page) => page.id === targetPage.id)) return;

    if (selectedTextTarget.type === 'coverTitle') {
      updatePageData(targetPage.id, {
        coverTitleStyle: {
          ...getDefaultTextStyle(DEFAULT_COVER_TITLE_FONT_SIZE),
          ...targetPage.coverTitleStyle,
          ...updates,
        },
      });
      return;
    }

    if (selectedTextTarget.type === 'coverDate') {
      updatePageData(targetPage.id, {
        coverDateStyle: {
          ...getDefaultTextStyle(DEFAULT_COVER_DATE_FONT_SIZE),
          ...targetPage.coverDateStyle,
          ...updates,
        },
      });
      return;
    }

    if (selectedTextTarget.type === 'layoutText') {
      const layoutText = targetPage.layoutTexts?.[selectedTextTarget.textIndex];
      updateLayoutText(targetPage.id, selectedTextTarget.textIndex, {
        style: {
          ...getDefaultTextStyle(DEFAULT_LAYOUT_TEXT_FONT_SIZE),
          ...layoutText?.style,
          ...updates,
        },
      });
      return;
    }

    if (selectedTextTarget.type !== 'caption') return;

    const photo = targetPage.photos[selectedTextTarget.photoIndex];
    if (!photo) return;

    updatePhoto(targetPage.id, selectedTextTarget.photoIndex, {
      captionStyle: {
        ...getDefaultTextStyle(DEFAULT_CAPTION_FONT_SIZE),
        ...photo.captionStyle,
        ...updates,
      },
    });
  };

  return {
    selectedTextTarget,
    setSelectedTextTarget,
    selectedTextStyle,
    updateSelectedTextStyle,
  };
}