import { useEffect, useState } from 'react';
import type { Page } from '../types';
import { renderPage } from '../lib/render';

const PREVIEW_LONG_EDGE = 480;

export function PagePreview({ page, label }: { page: Page; label: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let createdUrl: string | null = null;

    renderPage(page, PREVIEW_LONG_EDGE)
      .then((rendered) => {
        if (!isActive) return;
        createdUrl = URL.createObjectURL(new Blob([rendered.bytes], { type: 'image/jpeg' }));
        setPreviewUrl(createdUrl);
      })
      .catch(() => isActive && setPreviewUrl(null));

    return () => {
      isActive = false;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [page.file, page.corners, page.filter, page.rotation]); // eslint-disable-line react-hooks/exhaustive-deps

  return previewUrl ? <img src={previewUrl} alt={label} draggable={false} /> : null;
}
