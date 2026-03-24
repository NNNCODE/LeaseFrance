import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

export interface ChargeReconciliationPdfData {
  landlordName: string
  landlordAddress?: string
  landlordCity?: string
  landlordPhone?: string
  landlordSignature?: string
  tenantFirstName: string
  tenantLastName: string
  propertyName: string
  propertyAddress: string
  propertyCity: string
  propertyZip: string
  leaseStartDate: string
  leaseEndDate?: string | null
  year: number
  monthlyProvision: number
  autoCollectedProvisions: number
  effectiveCollectedProvisions: number
  usedManualOverride: boolean
  actualCharges: number
  balance: number
  notes?: string | null
}

const NAVY = '#17324D'
const BLUE = '#385D7A'
const LINE = '#B7C8D6'
const PAPER = '#FBF8F2'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: NAVY,
    backgroundColor: PAPER,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 44,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  ownerBlock: {
    width: '48%',
  },
  ownerName: {
    fontFamily: 'Times-Bold',
    fontSize: 12,
    marginBottom: 4,
  },
  ownerLine: {
    fontSize: 9.5,
    marginBottom: 2,
  },
  titleBlock: {
    width: '45%',
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 17,
    textAlign: 'right',
    letterSpacing: 1.1,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 9,
    color: BLUE,
    textAlign: 'right',
  },
  rule: {
    height: 1,
    backgroundColor: LINE,
    marginBottom: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    marginBottom: 7,
  },
  metaBox: {
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  metaLabel: {
    width: 110,
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
  },
  metaValue: {
    flex: 1,
    fontSize: 9.5,
  },
  amountTable: {
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
  },
  amountLabel: {
    width: '72%',
    fontSize: 9.5,
    lineHeight: 1.35,
  },
  amountValue: {
    width: '24%',
    fontSize: 9.5,
    textAlign: 'right',
  },
  noteBox: {
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  noteText: {
    fontSize: 9.5,
    lineHeight: 1.5,
  },
  footer: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLeft: {
    width: '45%',
  },
  footerRight: {
    width: '40%',
    alignItems: 'center',
  },
  footerLabel: {
    fontSize: 9,
    color: BLUE,
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 9.5,
    fontFamily: 'Times-Bold',
    marginBottom: 8,
  },
  sigLabel: {
    fontSize: 9.5,
    fontFamily: 'Times-BoldItalic',
    marginBottom: 14,
    textAlign: 'center',
  },
  sigPlaceholder: {
    width: 120,
    marginTop: 26,
    borderTopWidth: 0.5,
    borderTopColor: NAVY,
  },
  legalNote: {
    marginTop: 14,
    fontSize: 8.5,
    color: BLUE,
    lineHeight: 1.4,
  },
})

function formatDateFr(value: string | null | undefined) {
  if (!value) return 'Non renseigne'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function formatCurrencyFr(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function buildAddress(address: string, zip: string, city: string) {
  return zip ? `${address}, ${zip} ${city}` : `${address}, ${city}`
}

function balanceLabel(balance: number) {
  if (balance > 0) return 'Complement a demander au locataire'
  if (balance < 0) return 'Trop-percu a rembourser au locataire'
  return 'Aucun solde complementaire'
}

export function ChargeReconciliationPDF({ data }: { data: ChargeReconciliationPdfData }) {
  const address = buildAddress(data.propertyAddress, data.propertyZip, data.propertyCity)

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
            <Text style={s.title}>REGULARISATION DES CHARGES</Text>
            <Text style={s.subtitle}>Exercice {data.year}</Text>
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>Informations generales</Text>
          <View style={s.metaBox}>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Locataire</Text>
              <Text style={s.metaValue}>{data.tenantFirstName} {data.tenantLastName}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Bien</Text>
              <Text style={s.metaValue}>{data.propertyName}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Adresse</Text>
              <Text style={s.metaValue}>{address}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Debut du bail</Text>
              <Text style={s.metaValue}>{formatDateFr(data.leaseStartDate)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Fin du bail</Text>
              <Text style={s.metaValue}>{formatDateFr(data.leaseEndDate)}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Synthese annuelle</Text>
          <View style={s.amountTable}>
            <View style={s.amountRow}>
              <Text style={s.amountLabel}>Provision mensuelle prevue au bail</Text>
              <Text style={s.amountValue}>{formatCurrencyFr(data.monthlyProvision)}</Text>
            </View>
            <View style={s.amountRow}>
              <Text style={s.amountLabel}>Provisions retrouvees dans les paiements encaisses</Text>
              <Text style={s.amountValue}>{formatCurrencyFr(data.autoCollectedProvisions)}</Text>
            </View>
            {data.usedManualOverride ? (
              <View style={s.amountRow}>
                <Text style={s.amountLabel}>Provisions retenues pour la regularisation (valeur manuelle)</Text>
                <Text style={s.amountValue}>{formatCurrencyFr(data.effectiveCollectedProvisions)}</Text>
              </View>
            ) : null}
            <View style={s.amountRow}>
              <Text style={s.amountLabel}>Charges reelles annuelles</Text>
              <Text style={s.amountValue}>{formatCurrencyFr(data.actualCharges)}</Text>
            </View>
            <View style={[s.amountRow, { borderBottomWidth: 0 }]}>
              <Text style={[s.amountLabel, { fontFamily: 'Times-Bold' }]}>{balanceLabel(data.balance)}</Text>
              <Text style={[s.amountValue, { fontFamily: 'Times-Bold' }]}>{formatCurrencyFr(Math.abs(data.balance))}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Observations</Text>
          <View style={s.noteBox}>
            <Text style={s.noteText}>{data.notes?.trim() || 'Aucune observation complementaire.'}</Text>
          </View>
        </View>

        <View style={s.footer}>
          <View style={s.footerLeft}>
            <Text style={s.footerLabel}>Fait a :</Text>
            <Text style={s.footerValue}>{data.landlordCity || data.propertyCity}</Text>
            <Text style={s.footerLabel}>Le :</Text>
            <Text style={s.footerValue}>{formatDateFr(new Date().toISOString())}</Text>
          </View>
          <View style={s.footerRight}>
            <Text style={s.sigLabel}>Signature du proprietaire</Text>
            {data.landlordSignature && data.landlordSignature.startsWith('data:image') ? (
              <Image src={data.landlordSignature} style={{ width: 120, height: 58 }} cache={false} />
            ) : (
              <View style={s.sigPlaceholder} />
            )}
          </View>
        </View>

        <Text style={s.legalNote}>
          Ce document reprend la comparaison entre les provisions sur charges collectees et les charges reelles de l'exercice.
        </Text>
      </Page>
    </Document>
  )
}
