import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import PasswordInput from './PasswordInput'

export default function DangerZone() {
  const { t } = useTranslation()
  const { deleteAccount } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [pwd, setPwd] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleDelete(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (!pwd) return setError(t('settings.danger.passwordRequired'))

    setLoading(true)
    const ok = await deleteAccount(pwd)
    setLoading(false)

    if (!ok) setError(t('settings.danger.incorrect'))
  }

  return (
    <Card className="border-danger/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-danger" />
          <CardTitle className="text-danger">{t('settings.danger.title')}</CardTitle>
        </div>
        <CardDescription>{t('settings.danger.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4 p-4 bg-danger/5 border border-danger/20 rounded-xl">
          <div>
            <p className="text-sm font-medium text-textPrimary">{t('settings.danger.deleteAccount')}</p>
            <p className="text-xs text-textMuted mt-1">{t('settings.danger.deleteAccountDesc')}</p>
          </div>
          <Button variant="danger" size="sm" onClick={() => setOpen(true)} className="shrink-0">
            <Trash2 className="w-3.5 h-3.5" />
            {t('common.delete')}
          </Button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form
                onSubmit={handleDelete}
                className="flex flex-col gap-3 p-4 bg-danger/5 border border-danger/30 rounded-xl"
              >
                <div className="flex items-center gap-2 text-danger">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <p className="text-sm font-medium">{t('settings.danger.confirmDelete')}</p>
                </div>

                <p
                  className="text-xs text-textMuted"
                  dangerouslySetInnerHTML={{ __html: t('settings.danger.irreversible') }}
                />

                <PasswordInput
                  value={pwd}
                  onChange={setPwd}
                  show={show}
                  onToggle={() => setShow(!show)}
                  placeholder={t('settings.danger.passwordPlaceholder')}
                />

                {error && (
                  <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => { setOpen(false); setPwd(''); setError('') }}
                  >
                    {t('common.cancel')}
                  </Button>
                  <Button type="submit" variant="danger" size="sm" disabled={loading}>
                    <Trash2 className="w-3.5 h-3.5" />
                    {loading ? t('common.deleting') : t('settings.danger.deleteForever')}
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}
