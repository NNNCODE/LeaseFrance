import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import { type FiscalYearSummary } from '@/pages/Fiscal/summary'

export interface FiscalSummaryPdfData {
  landlordName: string
  landlordAddress?: string
  landlordCity?: string
  landlordPhone?: string
  landlordSignature?: string
  summary: FiscalYearSummary
}

const NAVY = '#17324D'
const BLUE = '#385D7A'
const LINE = '#B7C8D6'
const PAPER = '#FBF8F2'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 9.5,
    color: NAVY,
    backgroundColor: PAPER,
    paddingTop: 32,
    paddingBottom: 38,
    paddingHorizontal: 38,
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
    fontSize: 9,
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
  cards: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  card: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
    padding: 8,
  },
  cardLabel: {
    fontSize: 8.5,
    color: BLUE,
  },
  cardValue: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: 'Times-Bold',
  },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    marginBottom: 7,
  },
  table: {
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
    backgroundColor: '#F3F7FA',
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
    paddingVertical: 7,
    paddingHorizontal: 8,
  },
  colProperty: {
    width: '28%',
    fontSize: 8.5,
  },
  colSmall: {
    width: '12%',
    fontSize: 8.5,
    textAlign: 'right',
  },
  colAmount: {
    width: '18%',
    fontSize: 8.5,
    textAlign: 'right',
  },
  noteBox: {
    marginTop: 12,
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
    padding: 10,
  },
  noteText: {
    fontSize: 8.5,
    lineHeight: 1.45,
    color: BLUE,
  },
  footer: {
    marginTop: 16,
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
    fontSize: 8.5,
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
})

export function FiscalSummaryPDF({ data }: { data: FiscalSummaryPdfData }) {
  const { summary } = data

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
            <Text style={s.title}>SYNTHESE FISCALE ANNUELLE</Text>
            <Text style={s.subtitle}>Exercice {summary.year}</Text>
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.cards}>
          <View style={s.card}>
            <Text style={s.cardLabel}>Loyers encaisses</Text>
            <Text style={s.cardValue}>{formatCurrency(summary.receivedRent)}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Charges recuperees</Text>
            <Text style={s.cardValue}>{formatCurrency(summary.receivedCharges)}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Impayes</Text>
            <Text style={s.cardValue}>{formatCurrency(summary.outstandingAmount)}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>Synthese par bien</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={s.colProperty}>Bien</Text>
            <Text style={s.colSmall}>Occup.</Text>
            <Text style={s.colSmall}>Vacance</Text>
            <Text style={s.colAmount}>Loyers</Text>
            <Text style={s.colAmount}>Charges</Text>
            <Text style={s.colAmount}>Impayes</Text>
          </View>

          {summary.properties.map((item, index) => (
            <View key={item.propertyId} style={[s.tableRow, index === summary.properties.length - 1 ? { borderBottomWidth: 0.5 } : null]}>
              <Text style={s.colProperty}>{item.propertyName} ({item.propertyCity})</Text>
              <Text style={s.colSmall}>{item.occupiedMonths}</Text>
              <Text style={s.colSmall}>{item.vacantMonths}</Text>
              <Text style={s.colAmount}>{formatCurrency(item.receivedRent)}</Text>
              <Text style={s.colAmount}>{formatCurrency(item.receivedCharges)}</Text>
              <Text style={s.colAmount}>{formatCurrency(item.outstandingAmount)}</Text>
            </View>
          ))}

          <View style={[s.tableRow, { backgroundColor: '#F8FAFC' }]}>
            <Text style={[s.colProperty, { fontFamily: 'Times-Bold' }]}>TOTAL</Text>
            <Text style={[s.colSmall, { fontFamily: 'Times-Bold' }]}>{summary.occupiedMonths}</Text>
            <Text style={[s.colSmall, { fontFamily: 'Times-Bold' }]}>{summary.vacantMonths}</Text>
            <Text style={[s.colAmount, { fontFamily: 'Times-Bold' }]}>{formatCurrency(summary.receivedRent)}</Text>
            <Text style={[s.colAmount, { fontFamily: 'Times-Bold' }]}>{formatCurrency(summary.receivedCharges)}</Text>
            <Text style={[s.colAmount, { fontFamily: 'Times-Bold' }]}>{formatCurrency(summary.outstandingAmount)}</Text>
          </View>
        </View>

        <View style={s.noteBox}>
          <Text style={s.noteText}>
            Ce document reprend les loyers encaisses, les charges recuperees, les impayes encore saisis dans l'application
            et une vacance calculee a partir des dates de baux connues. Il ne remplace pas un conseil fiscal ou comptable.
          </Text>
        </View>

        <View style={s.footer}>
          <View style={s.footerLeft}>
            <Text style={s.footerLabel}>Fait a :</Text>
            <Text style={s.footerValue}>{data.landlordCity || 'Non renseigne'}</Text>
            <Text style={s.footerLabel}>Le :</Text>
            <Text style={s.footerValue}>{formatDate(new Date().toISOString())}</Text>
          </View>
          <View style={s.footerRight}>
            <Text style={s.sigLabel}>Signature du proprietaire</Text>
            {data.landlordSignature && data.landlordSignature.startsWith('data:image') ? (
              <Image src={{ uri: data.landlordSignature }} style={{ width: 120, height: 58 }} />
            ) : (
              <View style={s.sigPlaceholder} />
            )}
          </View>
        </View>
      </Page>
    </Document>
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}
