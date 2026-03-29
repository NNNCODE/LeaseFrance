import { type ReactNode } from 'react'
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'

const NAVY = '#17324D'
const BLUE = '#385D7A'
const LINE = '#B7C8D6'
const PAPER = '#FBF8F2'
const WHITE = '#FFFFFF'

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
    fontSize: 16,
    textAlign: 'right',
    letterSpacing: 0.8,
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
  infoBox: {
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: WHITE,
    padding: 10,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  infoLabel: {
    width: 132,
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
  },
  infoValue: {
    flex: 1,
    fontSize: 9.5,
  },
  bodyBox: {
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: WHITE,
    padding: 12,
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.55,
    marginBottom: 8,
  },
  amountTable: {
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: WHITE,
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
    width: '70%',
    fontSize: 9.5,
    lineHeight: 1.35,
  },
  amountValue: {
    width: '26%',
    fontSize: 9.5,
    textAlign: 'right',
  },
  noteBox: {
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: WHITE,
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

export interface RentRevisionNoticePdfData {
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
  noticeDate: string
  effectiveDate: string
  currentRent: number
  newRent: number
  difference: number
  referenceIrl: number
  referenceLabel: string
  newIrl: number
  newLabel: string
}

export interface DepositReceiptPdfData {
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
  leaseType: string
  leaseStartDate: string
  receiptDate: string
  depositAmount: number
}

export interface DepositSettlementPdfData {
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
  settlementDate: string
  depositAmount: number
  retainedAmount: number
  returnedAmount: number
  notes?: string | null
}

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

function leaseTypeLabel(type: string) {
  switch (type) {
    case 'meuble':
      return 'Bail meuble'
    case 'mobilite':
      return 'Bail mobilite'
    default:
      return 'Bail vide'
  }
}

function DocumentShell({
  title,
  subtitle,
  landlordName,
  landlordAddress,
  landlordCity,
  landlordPhone,
  landlordSignature,
  signatureCity,
  footerNote,
  children,
}: {
  title: string
  subtitle?: string
  landlordName: string
  landlordAddress?: string
  landlordCity?: string
  landlordPhone?: string
  landlordSignature?: string
  signatureCity?: string
  footerNote: string
  children: ReactNode
}) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.top}>
          <View style={s.ownerBlock}>
            <Text style={s.ownerName}>{landlordName}</Text>
            {landlordAddress ? <Text style={s.ownerLine}>{landlordAddress}</Text> : null}
            {landlordCity ? <Text style={s.ownerLine}>{landlordCity}</Text> : null}
            {landlordPhone ? <Text style={s.ownerLine}>{landlordPhone}</Text> : null}
          </View>
          <View style={s.titleBlock}>
            <Text style={s.title}>{title}</Text>
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>

        <View style={s.rule} />

        {children}

        <View style={s.footer}>
          <View style={s.footerLeft}>
            <Text style={s.footerLabel}>Fait a :</Text>
            <Text style={s.footerValue}>{signatureCity || landlordCity || 'Non renseigne'}</Text>
            <Text style={s.footerLabel}>Le :</Text>
            <Text style={s.footerValue}>{formatDateFr(new Date().toISOString())}</Text>
          </View>
          <View style={s.footerRight}>
            <Text style={s.sigLabel}>Signature du proprietaire</Text>
            {landlordSignature && landlordSignature.startsWith('data:image') ? (
              <Image src={{ uri: landlordSignature }} style={{ width: 120, height: 58 }} />
            ) : (
              <View style={s.sigPlaceholder} />
            )}
          </View>
        </View>

        <Text style={s.legalNote}>{footerNote}</Text>
      </Page>
    </Document>
  )
}

export function RentRevisionNoticePDF({ data }: { data: RentRevisionNoticePdfData }) {
  const address = buildAddress(data.propertyAddress, data.propertyZip, data.propertyCity)

  return (
    <DocumentShell
      title="AVIS DE REVISION DU LOYER"
      subtitle={`Prise d'effet au ${formatDateFr(data.effectiveDate)}`}
      landlordName={data.landlordName}
      landlordAddress={data.landlordAddress}
      landlordCity={data.landlordCity}
      landlordPhone={data.landlordPhone}
      landlordSignature={data.landlordSignature}
      signatureCity={data.landlordCity || data.propertyCity}
      footerNote="Avis amiable de revision du loyer prepare a partir des references IRL enregistrees dans RentFlow."
    >
      <View style={s.section}>
        <Text style={s.sectionTitle}>Informations du bail</Text>
        <View style={s.infoBox}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Locataire</Text>
            <Text style={s.infoValue}>{data.tenantFirstName} {data.tenantLastName}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Bien</Text>
            <Text style={s.infoValue}>{data.propertyName}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Adresse</Text>
            <Text style={s.infoValue}>{address}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Debut du bail</Text>
            <Text style={s.infoValue}>{formatDateFr(data.leaseStartDate)}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Date de l'avis</Text>
            <Text style={s.infoValue}>{formatDateFr(data.noticeDate)}</Text>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Calcul applique</Text>
        <View style={s.amountTable}>
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>Loyer actuel hors charges</Text>
            <Text style={s.amountValue}>{formatCurrencyFr(data.currentRent)}</Text>
          </View>
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>IRL de reference ({data.referenceLabel})</Text>
            <Text style={s.amountValue}>{data.referenceIrl}</Text>
          </View>
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>Nouvel IRL retenu ({data.newLabel})</Text>
            <Text style={s.amountValue}>{data.newIrl}</Text>
          </View>
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>Nouveau loyer hors charges</Text>
            <Text style={s.amountValue}>{formatCurrencyFr(data.newRent)}</Text>
          </View>
          <View style={[s.amountRow, { borderBottomWidth: 0 }]}>
            <Text style={[s.amountLabel, { fontFamily: 'Times-Bold' }]}>Evolution mensuelle</Text>
            <Text style={[s.amountValue, { fontFamily: 'Times-Bold' }]}>{formatCurrencyFr(data.difference)}</Text>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Texte de notification</Text>
        <View style={s.bodyBox}>
          <Text style={s.paragraph}>
            Madame, Monsieur, conformement a la clause de revision indexee sur l'IRL prevue au bail du {formatDateFr(data.leaseStartDate)},
            nous vous informons que le loyer mensuel hors charges du logement situe {address} est revise a compter du {formatDateFr(data.effectiveDate)}.
          </Text>
          <Text style={s.paragraph}>
            Le loyer passe ainsi de {formatCurrencyFr(data.currentRent)} a {formatCurrencyFr(data.newRent)} hors charges, sur la base de
            l'indice de reference {data.referenceLabel} ({data.referenceIrl}) et du nouvel indice {data.newLabel} ({data.newIrl}).
          </Text>
          <Text style={[s.paragraph, { marginBottom: 0 }]}>
            Nous vous invitons a conserver ce document avec votre bail et vos prochaines quittances.
          </Text>
        </View>
      </View>
    </DocumentShell>
  )
}

export function DepositReceiptPDF({ data }: { data: DepositReceiptPdfData }) {
  const address = buildAddress(data.propertyAddress, data.propertyZip, data.propertyCity)

  return (
    <DocumentShell
      title="RECU DE DEPOT DE GARANTIE"
      subtitle={`Encaissement du ${formatDateFr(data.receiptDate)}`}
      landlordName={data.landlordName}
      landlordAddress={data.landlordAddress}
      landlordCity={data.landlordCity}
      landlordPhone={data.landlordPhone}
      landlordSignature={data.landlordSignature}
      signatureCity={data.landlordCity || data.propertyCity}
      footerNote="Ce document constate l'encaissement du depot de garantie prevu au bail."
    >
      <View style={s.section}>
        <Text style={s.sectionTitle}>Informations generales</Text>
        <View style={s.infoBox}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Locataire</Text>
            <Text style={s.infoValue}>{data.tenantFirstName} {data.tenantLastName}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Bien</Text>
            <Text style={s.infoValue}>{data.propertyName}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Adresse</Text>
            <Text style={s.infoValue}>{address}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Type de bail</Text>
            <Text style={s.infoValue}>{leaseTypeLabel(data.leaseType)}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Debut du bail</Text>
            <Text style={s.infoValue}>{formatDateFr(data.leaseStartDate)}</Text>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Declaration</Text>
        <View style={s.bodyBox}>
          <Text style={s.paragraph}>
            Je soussigne {data.landlordName}, bailleur du logement situe {address}, reconnais avoir recu de
            {' '}{data.tenantFirstName} {data.tenantLastName} la somme de {formatCurrencyFr(data.depositAmount)}
            {' '}au titre du depot de garantie prevu par le bail signe le {formatDateFr(data.leaseStartDate)}.
          </Text>
          <Text style={[s.paragraph, { marginBottom: 0 }]}>
            Ce depot a ete encaisse le {formatDateFr(data.receiptDate)} et restera affecte aux obligations locatives
            prevues par le bail jusqu'a la sortie des lieux et l'arrete des comptes.
          </Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Montant encaisse</Text>
        <View style={s.amountTable}>
          <View style={[s.amountRow, { borderBottomWidth: 0 }]}>
            <Text style={[s.amountLabel, { fontFamily: 'Times-Bold' }]}>Depot de garantie encaisse</Text>
            <Text style={[s.amountValue, { fontFamily: 'Times-Bold' }]}>{formatCurrencyFr(data.depositAmount)}</Text>
          </View>
        </View>
      </View>
    </DocumentShell>
  )
}

export function DepositSettlementPDF({ data }: { data: DepositSettlementPdfData }) {
  const address = buildAddress(data.propertyAddress, data.propertyZip, data.propertyCity)

  return (
    <DocumentShell
      title="SOLDE DE DEPOT DE GARANTIE"
      subtitle={`Reglement du ${formatDateFr(data.settlementDate)}`}
      landlordName={data.landlordName}
      landlordAddress={data.landlordAddress}
      landlordCity={data.landlordCity}
      landlordPhone={data.landlordPhone}
      landlordSignature={data.landlordSignature}
      signatureCity={data.landlordCity || data.propertyCity}
      footerNote="Ce document reprend le solde du depot de garantie apres arrete des comptes du bail."
    >
      <View style={s.section}>
        <Text style={s.sectionTitle}>Informations generales</Text>
        <View style={s.infoBox}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Locataire</Text>
            <Text style={s.infoValue}>{data.tenantFirstName} {data.tenantLastName}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Bien</Text>
            <Text style={s.infoValue}>{data.propertyName}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Adresse</Text>
            <Text style={s.infoValue}>{address}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Debut du bail</Text>
            <Text style={s.infoValue}>{formatDateFr(data.leaseStartDate)}</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>Fin du bail</Text>
            <Text style={s.infoValue}>{formatDateFr(data.leaseEndDate)}</Text>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Arrete du depot</Text>
        <View style={s.amountTable}>
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>Depot de garantie initial</Text>
            <Text style={s.amountValue}>{formatCurrencyFr(data.depositAmount)}</Text>
          </View>
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>Montant retenu</Text>
            <Text style={s.amountValue}>{formatCurrencyFr(data.retainedAmount)}</Text>
          </View>
          <View style={s.amountRow}>
            <Text style={s.amountLabel}>Montant restitue au locataire</Text>
            <Text style={s.amountValue}>{formatCurrencyFr(data.returnedAmount)}</Text>
          </View>
          <View style={[s.amountRow, { borderBottomWidth: 0 }]}>
            <Text style={[s.amountLabel, { fontFamily: 'Times-Bold' }]}>Date de restitution</Text>
            <Text style={[s.amountValue, { fontFamily: 'Times-Bold' }]}>{formatDateFr(data.settlementDate)}</Text>
          </View>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Observations</Text>
        <View style={s.noteBox}>
          <Text style={s.noteText}>{data.notes?.trim() || 'Aucune retenue ou observation complementaire renseignee.'}</Text>
        </View>
      </View>

      <View style={s.section}>
        <Text style={s.sectionTitle}>Texte de cloture</Text>
        <View style={s.bodyBox}>
          <Text style={s.paragraph}>
            Apres arrete des comptes du bail concernant le logement situe {address}, le depot de garantie est solde
            le {formatDateFr(data.settlementDate)}.
          </Text>
          <Text style={[s.paragraph, { marginBottom: 0 }]}>
            Le montant restitue au locataire s'eleve a {formatCurrencyFr(data.returnedAmount)}. Le cas echeant,
            les retenues mentionnees ci-dessus correspondent aux sommes conservees par le bailleur.
          </Text>
        </View>
      </View>
    </DocumentShell>
  )
}
