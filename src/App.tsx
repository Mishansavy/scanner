import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { Filter, Page, Rotation } from './types';
import { detectImageKind } from './lib/sniff';
import { buildPdf } from './lib/pdf';
import type { PageFit } from './lib/pdf';
import { CropEditor } from './components/CropEditor';
import { PagePreview } from './components/PagePreview';
import './App.css';

export default function App() {
  const [pages, setPages] = useState<Page[]>([]);
  const [fit, setFit] = useState<PageFit>('a4');
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  const pagesRef = useRef(pages);
  useEffect(() => {
    pagesRef.current = pages;
  });
  useEffect(() => {
    return () => pagesRef.current.forEach((page) => URL.revokeObjectURL(page.url));
  }, []);

  async function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const validPages: Page[] = [];
    const rejectedMessages: string[] = [];

    for (const file of Array.from(fileList)) {
      const kind = await detectImageKind(file);
      if (kind) {
        validPages.push({
          id: crypto.randomUUID(),
          file,
          url: URL.createObjectURL(file),
          rotation: 0,
          filter: 'original',
          corners: null,
        });
      } else {
        rejectedMessages.push(`${file.name}: not a JPG/PNG/WEBP`);
      }
    }

    setPages((previous) => [...previous, ...validPages]);
    setErrors(rejectedMessages);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
    event.target.value = '';
  }

  function updatePage(pageId: string, changes: Partial<Page>) {
    setPages((previous) =>
      previous.map((page) => (page.id === pageId ? { ...page, ...changes } : page)),
    );
  }

  function removePage(pageId: string) {
    const pageToRemove = pages.find((page) => page.id === pageId);
    if (pageToRemove) URL.revokeObjectURL(pageToRemove.url);
    setPages((previous) => previous.filter((page) => page.id !== pageId));
  }

  function movePage(currentIndex: number, direction: -1 | 1) {
    setPages((previous) => {
      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= previous.length) return previous;
      const reordered = [...previous];
      [reordered[currentIndex], reordered[targetIndex]] = [
        reordered[targetIndex],
        reordered[currentIndex],
      ];
      return reordered;
    });
  }

  async function exportPdf() {
    const total = pages.length;
    setProgressLabel(`0/${total}`);
    try {
      const pdfBytes = await buildPdf(pages, fit, (completed) =>
        setProgressLabel(`${completed}/${total}`),
      );
      const downloadUrl = URL.createObjectURL(new Blob([new Uint8Array(pdfBytes)],{ type: 'application/pdf' }));
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `scan-${Date.now()}.pdf`;
      downloadLink.click();
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    } catch (error) {
      setErrors([String(error)]);
    } finally {
      setProgressLabel(null);
    }
  }

  const editingPage = pages.find((page) => page.id === editingPageId);

  return (
    <main>
      <header className="header">
        <h1>Scanner</h1>
        <p>JPG / PNG / WEBP to one PDF, on this device</p>
      </header>

      <div className="bar">
        <label className="btn">
          Add images
          <input
            hidden
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileInput}
          />
        </label>
        <label className="btn">
          Camera
          <input
            hidden
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileInput}
          />
        </label>
        <span className="spacer" />
        <select value={fit} onChange={(event) => setFit(event.target.value as PageFit)}>
          <option value="a4">A4</option>
          <option value="image">Image size</option>
        </select>
        <button
          className="btn-primary"
          disabled={!pages.length || progressLabel !== null}
          onClick={exportPdf}
        >
          {progressLabel ? `Building ${progressLabel}` : `Export PDF (${pages.length})`}
        </button>
      </div>

      {errors.map((message) => (
        <p key={message} className="err">{message}</p>
      ))}

      {pages.length === 0 && (
        <p className="empty">No pages yet. Add images or use the camera.</p>
      )}

      <ol className="grid">
        {pages.map((page, index) => (
          <li key={page.id} className="card">
            <div className="card-head">
              <span>{String(index + 1).padStart(2, '0')}</span>
              {page.corners && <span className="flag">cropped</span>}
            </div>
            <div className="thumb">
              <PagePreview page={page} label={`Page ${index + 1}`} />
            </div>
            <div className="row">
              <button disabled={index === 0} onClick={() => movePage(index, -1)}>Earlier</button>
              <button disabled={index === pages.length - 1} onClick={() => movePage(index, 1)}>
                Later
              </button>
              <button
                onClick={() =>
                  updatePage(page.id, { rotation: ((page.rotation + 90) % 360) as Rotation })
                }
              >
                Rotate
              </button>
              <button onClick={() => setEditingPageId(page.id)}>Crop</button>
              <select
                value={page.filter}
                onChange={(event) => updatePage(page.id, { filter: event.target.value as Filter })}
              >
                <option value="original">Original</option>
                <option value="gray">Gray</option>
                <option value="bw">B&amp;W</option>
              </select>
              <button className="danger" onClick={() => removePage(page.id)}>Remove</button>
            </div>
          </li>
        ))}
      </ol>

      {editingPage && (
        <CropEditor
          file={editingPage.file}
          initialCorners={editingPage.corners}
          onSave={(corners) => {
            updatePage(editingPage.id, { corners });
            setEditingPageId(null);
          }}
          onCancel={() => setEditingPageId(null)}
        />
      )}
    </main>
  );
}