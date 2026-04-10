// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import PdfPreviewModal from '@/pages/Documents/PdfPreviewModal'
import '@/i18n'

vi.mock('@/components/PdfCanvasPreview', () => ({
  default: ({ data }: { data: Uint8Array }) => (
    <div data-testid="pdf-canvas-preview">bytes:{data.byteLength}</div>
  ),
}))

describe('PdfPreviewModal', () => {
  it('loads the document bytes and hands them to the PDF canvas preview', async () => {
    ;(window as Window & typeof globalThis & { api: any }).api = {
      documents: {
        readFile: vi.fn().mockResolvedValue({
          data: new Uint8Array([1, 2, 3, 4]),
          mimeType: 'application/pdf',
          error: null,
        }),
        openFile: vi.fn(),
      },
    }

    render(
      <PdfPreviewModal
        doc={{
          id: 3,
          lease_id: 9,
          type: 'quittance',
          generated_at: '2026-04-09 11:20:00',
          file_path: 'C:\\docs\\quittance.pdf',
          status: 'generated',
          property_name: 'Albert Camus',
          property_city: 'Paris',
          tenant_first_name: 'Minghui',
          tenant_last_name: 'Nie',
        }}
        onClose={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByTestId('pdf-canvas-preview').textContent).toBe('bytes:4')
    })
  })
})
