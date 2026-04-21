// @vitest-environment jsdom

import type React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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

  it('renders an inline MP4 player in the attachment preview modal', async () => {
    const user = userEvent.setup()
    const createObjectUrl = vi.fn(() => 'blob:mp4-preview')
    const revokeObjectUrl = vi.fn()

    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: createObjectUrl,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: revokeObjectUrl,
    })

    ;(window as Window & typeof globalThis & { api: any }).api = {
      attachments: {
        getByEntity: vi.fn().mockResolvedValue([{
          id: 19,
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
        read: vi.fn().mockResolvedValue({
          data: new Uint8Array([0, 0, 0, 0, 102, 116, 121, 112]),
          mimeType: 'video/mp4',
          error: null,
        }),
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

    await user.click(screen.getByTitle('Apercu'))

    await waitFor(() => {
      const video = screen.getByTestId('attachment-video-preview') as HTMLVideoElement
      expect(video.tagName).toBe('VIDEO')
      expect(video.getAttribute('src')).toBe('blob:mp4-preview')
      expect(video.controls).toBe(true)
    })

    fireEvent.loadedData(screen.getByTestId('attachment-video-preview'))

    await waitFor(() => {
      expect(screen.queryByText("Chargement de l'apercu video...")).toBeNull()
    })
  })

  it('shows a fallback message when the MP4 cannot be played inline', async () => {
    const user = userEvent.setup()
    const createObjectUrl = vi.fn(() => 'blob:mp4-preview-error')

    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: createObjectUrl,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: vi.fn(),
    })

    ;(window as Window & typeof globalThis & { api: any }).api = {
      attachments: {
        getByEntity: vi.fn().mockResolvedValue([{
          id: 20,
          entity_type: 'inspection',
          entity_id: 4,
          slot: 'move_in_video',
          file_name: 'codec-unsupported.mp4',
          mime_type: 'video/mp4',
          file_size: 204800,
          stored_name: 'stored-codec-unsupported.mp4',
          created_at: '2026-04-21 09:00:00',
        }]),
        upload: vi.fn().mockResolvedValue([]),
        read: vi.fn().mockResolvedValue({
          data: new Uint8Array([0, 0, 0, 0, 102, 116, 121, 112]),
          mimeType: 'video/mp4',
          error: null,
        }),
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
      expect(screen.getByText('codec-unsupported.mp4')).toBeTruthy()
    })

    await user.click(screen.getByTitle('Apercu'))

    const video = await screen.findByTestId('attachment-video-preview')
    fireEvent.error(video)

    await waitFor(() => {
      expect(screen.getByText("Impossible de lire ce MP4 dans l'application. Utilisez Ouvrir pour le lire avec le lecteur video du systeme.")).toBeTruthy()
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

  it('renders distinct labels for the move-in video slot and general inspection files', async () => {
    ;(window as Window & typeof globalThis & { api: any }).api = {
      attachments: {
        getByEntity: vi.fn().mockResolvedValue([
          {
            id: 21,
            entity_type: 'inspection',
            entity_id: 4,
            slot: 'move_in_video',
            file_name: 'video-entree.mp4',
            mime_type: 'video/mp4',
            file_size: 9800000,
            stored_name: 'stored-video-entree.mp4',
            created_at: '2026-04-21 10:00:00',
          },
          {
            id: 22,
            entity_type: 'inspection',
            entity_id: 4,
            slot: null,
            file_name: 'photos-cuisine.pdf',
            mime_type: 'application/pdf',
            file_size: 240000,
            stored_name: 'stored-photos-cuisine.pdf',
            created_at: '2026-04-21 10:02:00',
          },
        ]),
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
        title="Fichiers du constat"
        slots={[{
          key: 'move_in_video',
          label: "Video d'entree d'origine",
          description: "Conservez la video d'entree a part pour la retrouver rapidement plus tard.",
          badge: 'Video',
          featured: true,
        }]}
        generalSectionLabel="Autres fichiers du constat"
        generalSectionDescription="Ajoutez ici les photos, PDF et autres pieces jointes."
        alwaysShowGeneralSection
      />,
    )

    await waitFor(() => {
      expect(screen.getByText("Video d'entree d'origine")).toBeTruthy()
    })

    expect(screen.getByText('Autres fichiers du constat')).toBeTruthy()
    expect(screen.getByText("Conservez la video d'entree a part pour la retrouver rapidement plus tard.")).toBeTruthy()
    expect(screen.getByText('Ajoutez ici les photos, PDF et autres pieces jointes.')).toBeTruthy()
    expect(screen.getByText('video-entree.mp4')).toBeTruthy()
    expect(screen.getByText((text) => text.includes('9.3 Mo') && text.includes('Ajoute le'))).toBeTruthy()
    expect(screen.getByText('photos-cuisine.pdf')).toBeTruthy()
  })
})
