// @vitest-environment jsdom

import type React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import AttachmentPanel from '@/components/AttachmentPanel'
import '@/i18n'

vi.mock('@/components/PdfCanvasPreview', () => ({
  default: ({ data }: { data: Uint8Array }) => (
    <div data-testid="pdf-canvas-preview">bytes:{data.byteLength}</div>
  ),
}))

describe('AttachmentPanel', () => {
  it('opens an attachment preview without submitting the parent form', async () => {
    const user = userEvent.setup()
    const onSubmit: React.FormEventHandler<HTMLFormElement> = vi.fn((event) => event.preventDefault())

    ;(window as Window & typeof globalThis & { api: any }).api = {
      attachments: {
        getByEntity: vi.fn().mockResolvedValue([{
          id: 12,
          entity_type: 'tenant',
          entity_id: 7,
          slot: 'dossier_id_document',
          file_name: 'piece-identite.pdf',
          mime_type: 'application/pdf',
          file_size: 64000,
          stored_name: 'stored-piece-identite.pdf',
          created_at: '2026-04-13 09:00:00',
        }]),
        upload: vi.fn().mockResolvedValue([]),
        read: vi.fn().mockResolvedValue({
          data: new Uint8Array([1, 2, 3, 4]),
          mimeType: 'application/pdf',
          error: null,
        }),
        open: vi.fn(),
        delete: vi.fn().mockResolvedValue(true),
      },
    }

    render(
      <form onSubmit={onSubmit}>
        <AttachmentPanel
          entityType="tenant"
          entityId={7}
          title="Fichiers joints"
          slots={[{ key: 'dossier_id_document', label: "Piece d'identite" }]}
        />
      </form>,
    )

    await waitFor(() => {
      expect(screen.getByText('piece-identite.pdf')).toBeTruthy()
    })

    await user.click(screen.getByTitle('Apercu'))

    expect(onSubmit).not.toHaveBeenCalled()

    await waitFor(() => {
      expect(screen.getByTestId('pdf-canvas-preview').textContent).toBe('bytes:4')
    })
  })

  it('shows slotted files even when no slot definitions are provided', async () => {
    ;(window as Window & typeof globalThis & { api: any }).api = {
      attachments: {
        getByEntity: vi.fn().mockResolvedValue([{
          id: 18,
          entity_type: 'inspection',
          entity_id: 4,
          slot: 'move_in_video',
          file_name: 'etat-des-lieux-entree.mp4',
          mime_type: 'video/mp4',
          file_size: 9800000,
          stored_name: 'stored-entree-video.mp4',
          created_at: '2026-04-20 09:00:00',
        }]),
        upload: vi.fn().mockResolvedValue([]),
        read: vi.fn(),
        open: vi.fn(),
        delete: vi.fn().mockResolvedValue(true),
      },
    }

    render(
      <AttachmentPanel
        entityType="inspection"
        entityId={4}
        title="Pieces jointes"
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('etat-des-lieux-entree.mp4')).toBeTruthy()
    })
  })
})
