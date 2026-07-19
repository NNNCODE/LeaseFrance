import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import PasswordInput from './PasswordInput'

export default function PasswordSection() {
  const { t } = useTranslation()
  const { changePassword } = useAuthStore()
  const [oldPwd, setOldPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (newPwd.length < 8) return setError(t('settings.password.min8'))
    if (newPwd !== confirm) return setError(t('settings.password.mismatch'))

    setLoading(true)
    const ok = await changePassword(oldPwd, newPwd)
    setLoading(false)

    if (ok) {
      setOldPwd('')
      setNewPwd('')
      setConfirm('')
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2500)
    } else {
      setError(t('settings.password.incorrect'))
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          <CardTitle>{t('settings.password.title')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">{t('settings.password.current')}</label>
            <PasswordInput
              value={oldPwd}
              onChange={setOldPwd}
              show={show}
              onToggle={() => setShow(!show)}
              placeholder={t('settings.password.currentPlaceholder')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('settings.password.new')}</label>
              <PasswordInput
                value={newPwd}
                onChange={setNewPwd}
                show={show}
                onToggle={() => setShow(!show)}
                placeholder={t('settings.password.newPlaceholder')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">{t('settings.password.confirm')}</label>
              <PasswordInput
                value={confirm}
                onChange={setConfirm}
                show={show}
                onToggle={() => setShow(!show)}
                placeholder={t('settings.password.confirmPlaceholder')}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={loading}>
              <Lock className="w-3.5 h-3.5" />
              {loading ? t('settings.password.submitting') : t('settings.password.submit')}
            </Button>
            <AnimatePresence>
              {status === 'saved' && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-success"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {t('settings.password.success')}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
