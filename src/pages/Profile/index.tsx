import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  UserCircle2, Mail, MapPin, Phone, Save, CheckCircle2,
  Building2, FileText, CreditCard,
} from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { formatDate } from '@/lib/utils'

export default function Profile() {
  const { profile } = useAuthStore()

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">Profil du propri\u00e9taire</h1>
        <p className="text-textMuted text-sm mt-1">
          Vos informations personnelles utilis\u00e9es dans les documents officiels
        </p>
      </div>

      {/* Profile overview card */}
      <ProfileOverview />

      {/* Editable form */}
      <ProfileForm />

      {/* Info card about how this data is used */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-5">
          <div className="flex gap-3">
            <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-textPrimary mb-1">
                Utilisation de vos informations
              </p>
              <p className="text-xs text-textMuted leading-relaxed">
                Votre nom, adresse et t\u00e9l\u00e9phone apparaissent sur les quittances de loyer et
                re\u00e7us g\u00e9n\u00e9r\u00e9s par l'application. Assurez-vous que ces informations sont compl\u00e8tes
                et \u00e0 jour pour garantir la conformit\u00e9 l\u00e9gale de vos documents.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ── Profile Overview ──────────────────────────────────────────────────────────

function ProfileOverview() {
  const { profile } = useAuthStore()

  if (!profile) return null

  const infoItems = [
    { icon: UserCircle2, label: 'Nom complet', value: profile.name || '\u2014' },
    { icon: Mail,        label: 'E-mail',      value: profile.email || '\u2014' },
    { icon: MapPin,      label: 'Adresse',     value: profile.address || 'Non renseign\u00e9e' },
    { icon: Phone,       label: 'T\u00e9l\u00e9phone',   value: profile.phone || 'Non renseign\u00e9' },
  ]

  return (
    <Card>
      <CardContent className="pt-6 pb-6">
        <div className="flex items-start gap-5">
          {/* Avatar */}
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/15 shrink-0">
            <UserCircle2 className="w-8 h-8 text-primary" />
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-textPrimary truncate">
              {profile.name || 'Propri\u00e9taire'}
            </h2>
            {profile.createdAt && (
              <p className="text-xs text-textMuted mt-0.5">
                Membre depuis le {formatDate(profile.createdAt)}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 mt-4">
              {infoItems.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surfaceHigh/50"
                >
                  <item.icon className="w-3.5 h-3.5 text-textMuted shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-textMuted font-medium">
                      {item.label}
                    </p>
                    <p className="text-sm text-textPrimary truncate">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Editable Profile Form ─────────────────────────────────────────────────────

function ProfileForm() {
  const { profile, updateProfile } = useAuthStore()
  const [name, setName]       = useState(profile?.name ?? '')
  const [email, setEmail]     = useState(profile?.email ?? '')
  const [address, setAddress] = useState(profile?.address ?? '')
  const [phone, setPhone]     = useState(profile?.phone ?? '')
  const [status, setStatus]   = useState<'idle' | 'saved' | 'error'>('idle')
  const [loading, setLoading] = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setLoading(true)
    const ok = await updateProfile(name, email, address, phone)
    setLoading(false)
    setStatus(ok ? 'saved' : 'error')
    setTimeout(() => setStatus('idle'), 2500)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          <CardTitle>Modifier les informations</CardTitle>
        </div>
        <CardDescription>
          Ces informations seront utilis\u00e9es sur les quittances et re\u00e7us de loyer
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                Nom complet <span className="text-danger">*</span>
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jean Dupont"
              />
              <p className="text-[10px] text-textMuted">
                Nom l\u00e9gal tel qu'il appara\u00eet sur les documents
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                Adresse e-mail <span className="text-danger">*</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jean@email.fr"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-textMuted">
              Adresse postale
            </label>
            <Input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="12 rue de la Paix, 75002 Paris"
            />
            <p className="text-[10px] text-textMuted">
              Adresse compl\u00e8te du propri\u00e9taire (affich\u00e9e sur les quittances)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-textMuted">
                T\u00e9l\u00e9phone
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="06 12 34 56 78"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" size="sm" disabled={loading}>
              <Save className="w-3.5 h-3.5" />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <AnimatePresence>
              {status === 'saved' && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-success"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Modifications enregistr\u00e9es
                </motion.span>
              )}
              {status === 'error' && (
                <motion.span
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-xs text-danger"
                >
                  Erreur lors de la sauvegarde
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
