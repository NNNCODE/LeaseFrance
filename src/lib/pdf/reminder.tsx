import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

const NAVY = '#1B3A5C'
const NAVY_LIGHT = '#4A6D8C'
const CREAM = '#FDFBF5'
const LINE_BLUE = '#8BAAC4'

const MONTHS = [
  'janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre',
]

const STAGE_LABELS: Record<string, string> = {
  relance_amiable: 'Relance amiable',
  mise_en_demeure: 'Mise en demeure amiable',
  proposition_echeancier: "Proposition d'echeancier",
}

export interface ReminderLetterData {
  landlordName: string
  landlordAddress?: string
  landlordCity?: string
  landlordPhone?: string
  landlordSignature?: string
  tenantFirstName: string
  tenantLastName: string
  propertyAddress: string
  propertyCity: string
  propertyZip: string
  periodMonth: number
  periodYear: number
  amountDue: number
  reminderDate: string
  stage: 'relance_amiable' | 'mise_en_demeure' | 'proposition_echeancier'
  notes?: string | null
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: NAVY,
    paddingTop: 32,
    paddingBottom: 45,
    paddingHorizontal: 48,
    backgroundColor: CREAM,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 22 },
  ownerBlock: { width: '52%' },
  ownerName: { fontFamily: 'Times-Bold', fontSize: 12, marginBottom: 4 },
  ownerLine: { fontSize: 9.5, color: NAVY, marginBottom: 2 },
  titleBlock: { width: '40%', alignItems: 'flex-end' },
  title: { fontFamily: 'Times-Bold', fontSize: 18, textAlign: 'right', letterSpacing: 1.5 },
  subtitle: { fontSize: 9, color: NAVY_LIGHT, marginTop: 5, textAlign: 'right' },
  rule: { height: 1, backgroundColor: LINE_BLUE, opacity: 0.65, marginBottom: 18 },
  metaRow: { flexDirection: 'row', marginBottom: 7 },
  metaLabel: { width: 78, fontFamily: 'Times-Bold', fontSize: 9.5 },
  metaValue: { flex: 1, fontSize: 9.5 },
  section: { marginBottom: 14 },
  salutation: { fontSize: 10.5, marginBottom: 12 },
  paragraph: { fontSize: 10, lineHeight: 1.6, marginBottom: 10, textAlign: 'justify' },
  noteBox: { borderWidth: 0.5, borderColor: LINE_BLUE, padding: 10, marginTop: 8, marginBottom: 10 },
  noteTitle: { fontFamily: 'Times-Bold', fontSize: 9, marginBottom: 4 },
  noteText: { fontSize: 9.5, lineHeight: 1.5, color: NAVY },
  footer: { marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' },
  footerLeft: { flex: 1 },
  footerRight: { width: 170, alignItems: 'center' },
  footerLabel: { fontSize: 9, fontFamily: 'Times-Italic', color: NAVY, marginBottom: 2 },
  footerValue: { fontSize: 9.5, fontFamily: 'Times-Bold', color: NAVY, marginBottom: 8 },
  sigLabel: { fontSize: 9.5, fontFamily: 'Times-BoldItalic', marginBottom: 16, textAlign: 'center' },
  sigPlaceholder: { width: 120, borderTopWidth: 0.5, borderTopColor: NAVY, marginTop: 28 },
  legalNote: { marginTop: 14, fontSize: 8.5, color: NAVY_LIGHT, lineHeight: 1.4 },
})

function formatDateFr(iso: string) {
  const date = new Date(iso)
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function formatCurrencyFr(amount: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

function buildAddress(address: string, zip: string, city: string) {
  return zip ? `${address}, ${zip} ${city}` : `${address}, ${city}`
}

function periodLabel(month: number, year: number) {
  return `${MONTHS[month - 1]} ${year}`
}

function stageParagraphs(data: ReminderLetterData) {
  const amount = formatCurrencyFr(data.amountDue)
  const period = periodLabel(data.periodMonth, data.periodYear)

  switch (data.stage) {
    case 'mise_en_demeure':
      return [
        `Malgre nos precedents echanges, sauf erreur de notre part, le loyer correspondant a la periode de ${period}, pour un montant de ${amount}, reste a ce jour impaye.`,
        `Par la presente, nous vous mettons en demeure de regulariser cette somme dans les plus brefs delais et de nous contacter sans attendre en cas de difficulte particuliere.`,
        `Ce courrier s'inscrit dans une demarche amiable et ne constitue pas un commandement de payer delivre par un commissaire de justice.`,
      ]
    case 'proposition_echeancier':
      return [
        `Sauf erreur de notre part, une somme de ${amount} demeure due au titre du loyer de ${period}.`,
        `Afin de permettre une regularisation amiable, nous vous invitons a nous contacter pour convenir d'un echeancier de paiement realiste et ecrit.`,
        `Sans retour de votre part, nous conserverons l'historique de cette relance dans votre dossier locatif.`,
      ]
    default:
      return [
        `Sauf erreur de notre part, le loyer correspondant a la periode de ${period}, pour un montant de ${amount}, ne nous est pas encore parvenu.`,
        `Nous vous remercions de bien vouloir regulariser cette situation rapidement ou de nous informer de toute difficulte qui expliquerait ce retard.`,
      ]
  }
}

export function ReminderLetterPDF({ data }: { data: ReminderLetterData }) {
  const address = buildAddress(data.propertyAddress, data.propertyZip, data.propertyCity)
  const stageLabel = STAGE_LABELS[data.stage] ?? 'Relance'
  const reminderDate = formatDateFr(data.reminderDate)

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.top}>
          <View style={s.ownerBlock}>
            <Text style={s.ownerName}>{data.landlordName}</Text>
            {data.landlordAddress ? <Text style={s.ownerLine}>{data.landlordAddress}</Text> : null}
            {data.landlordCity ? <Text style={s.ownerLine}>{data.landlordCity}</Text> : null}
            {data.landlordPhone ? <Text style={s.ownerLine}>{data.landlordPhone}</Text> : null}
          </View>
          <View style={s.titleBlock}>
            <Text style={s.title}>{stageLabel.toUpperCase()}</Text>
            <Text style={s.subtitle}>Impayé de loyer</Text>
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.section}>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Locataire</Text>
            <Text style={s.metaValue}>{data.tenantFirstName} {data.tenantLastName}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Logement</Text>
            <Text style={s.metaValue}>{address}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Periode</Text>
            <Text style={s.metaValue}>{periodLabel(data.periodMonth, data.periodYear)}</Text>
          </View>
          <View style={s.metaRow}>
            <Text style={s.metaLabel}>Montant du</Text>
            <Text style={s.metaValue}>{formatCurrencyFr(data.amountDue)}</Text>
          </View>
        </View>

        <Text style={s.salutation}>Madame, Monsieur,</Text>

        {stageParagraphs(data).map((paragraph, index) => (
          <Text key={index} style={s.paragraph}>{paragraph}</Text>
        ))}

        {data.notes?.trim() ? (
          <View style={s.noteBox}>
            <Text style={s.noteTitle}>Precisions complementaires</Text>
            <Text style={s.noteText}>{data.notes.trim()}</Text>
          </View>
        ) : null}

        <Text style={s.paragraph}>
          Nous vous remercions de bien vouloir nous confirmer votre situation des reception de ce courrier.
        </Text>

        <View style={s.footer}>
          <View style={s.footerLeft}>
            <Text style={s.footerLabel}>Fait a :</Text>
            <Text style={s.footerValue}>{data.landlordCity || data.propertyCity}</Text>
            <Text style={s.footerLabel}>Le :</Text>
            <Text style={s.footerValue}>{reminderDate}</Text>
          </View>
          <View style={s.footerRight}>
            <Text style={s.sigLabel}>Signature du proprietaire</Text>
            {data.landlordSignature && data.landlordSignature.startsWith('data:image') ? (
              <Image src={{ uri: data.landlordSignature }} style={{ width: 120, height: 60 }} />
            ) : (
              <View style={s.sigPlaceholder} />
            )}
          </View>
        </View>

        <Text style={s.legalNote}>
          Ce document correspond a une relance amiable generee via Baillio. Il ne remplace pas un acte delivre par un commissaire de justice.
        </Text>
      </Page>
    </Document>
  )
}
