// @vitest-environment jsdom

import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PdfCanvasPreview from '@/components/PdfCanvasPreview'
import '@/i18n'

const getDocumentMock = vi.fn()

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (...args: unknown[]) => getDocumentMock(...args),
}))

vi.mock('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url', () => ({
  default: 'mock-worker-url',
}))

describe('PdfCanvasPreview', () => {
  it('passes a copied Uint8Array to pdf.js so the original buffer is not detached', async () => {
    getDocumentMock.mockImplementation(({ data }: { data: Uint8Array }) => {
      structuredClone(data, { transfer: [data.buffer] })

      return {
        promise: Promise.resolve({
          numPages: 0,
        }),
        destroy: vi.fn(),
      }
    })

    const original = new Uint8Array([1, 2, 3, 4])

    render(<PdfCanvasPreview data={original} />)

    await waitFor(() => {
      expect(getDocumentMock).toHaveBeenCalled()
    })

    expect(original.byteLength).toBe(4)
  })
})
