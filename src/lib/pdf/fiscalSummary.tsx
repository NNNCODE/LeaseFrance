import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import {
  type FiscalYearSummary,
  EXPENSE_CATEGORIES,
} from '@/pages/Fiscal/summary'

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
const RED = '#C0392B'
const GREEN = '#27AE60'

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
    marginBottom: 14,
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
    fontSize: 8,
    color: BLUE,
  },
  cardValue: {
    marginTop: 3,
    fontSize: 10.5,
    fontFamily: 'Times-Bold',
  },
  sectionTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 11,
    marginBottom: 6,
    marginTop: 10,
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
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  colProperty: {
    width: '22%',
    fontSize: 8.5,
  },
  colSmall: {
    width: '8%',
    fontSize: 8.5,
    textAlign: 'right',
  },
  colAmount: {
    width: '12.5%',
    fontSize: 8.5,
    textAlign: 'right',
  },
  // Expense table columns
  expColProperty: {
    width: '25%',
    fontSize: 8.5,
  },
  expColCategory: {
    width: '22%',
    fontSize: 8.5,
  },
  expColLabel: {
    width: '30%',
    fontSize: 8.5,
  },
  expColAmount: {
    width: '23%',
    fontSize: 8.5,
    textAlign: 'right',
  },
  noteBox: {
    marginTop: 10,
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
    marginTop: 14,
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
  netBox: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 8,
  },
  netCard: {
    flex: 1,
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
    padding: 8,
  },
})

export function FiscalSummaryPDF({ data }: { data: FiscalSummaryPdfData }) {
  const { summary } = data
  const hasExpenses = summary.expenses.total > 0

  // Build a flat list of expenses for the PDF table by iterating category by property
  const expenseRows: Array<{ property: string; category: string; amount: number }> = []
  for (const cat of EXPENSE_CATEGORIES) {
    for (const prop of summary.properties) {
      const catKey = cat.value as keyof typeof prop.expenses
      const amount = (prop.expenses[catKey] as number) || 0
      if (amount > 0) {
        expenseRows.push({
          property: `${prop.propertyName} (${prop.propertyCity})`,
          category: cat.label,
          amount,
        })
      }
    }
  }

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

        {/* ── Summary cards ──────────────────────────────────── */}
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
            <Text style={s.cardLabel}>Total encaisse</Text>
            <Text style={s.cardValue}>{formatCurrency(summary.totalReceived)}</Text>
          </View>
          <View style={s.card}>
            <Text style={s.cardLabel}>Charges deductibles</Text>
            <Text style={[s.cardValue, { color: RED }]}>{formatCurrency(summary.expenses.total)}</Text>
          </View>
        </View>

        {/* ── Revenue table ──────────────────────────────────── */}
        <Text style={s.sectionTitle}>Revenus par bien</Text>
        <View style={s.table}>
          <View style={s.tableHeader}>
            <Text style={s.colProperty}>Bien</Text>
            <Text style={s.colSmall}>Occup.</Text>
            <Text style={s.colSmall}>Vacance</Text>
            <Text style={s.colAmount}>Loyers</Text>
            <Text style={s.colAmount}>Charges</Text>
            <Text style={s.colAmount}>Impayes</Text>
            <Text style={s.colAmount}>Deductible</Text>
            <Text style={s.colAmount}>Net</Text>
          </View>

          {summary.properties.map((item, index) => {
            const net = item.totalReceived - item.expenses.total
            return (
              <View key={item.propertyId} style={[s.tableRow, index === summary.properties.length - 1 ? { borderBottomWidth: 0.5 } : {}]}>
                <Text style={s.colProperty}>{item.propertyName} ({item.propertyCity})</Text>
                <Text style={s.colSmall}>{item.occupiedMonths}</Text>
                <Text style={s.colSmall}>{item.vacantMonths}</Text>
                <Text style={s.colAmount}>{formatCurrency(item.receivedRent)}</Text>
                <Text style={s.colAmount}>{formatCurrency(item.receivedCharges)}</Text>
                <Text style={s.colAmount}>{formatCurrency(item.outstandingAmount)}</Text>
                <Text style={[s.colAmount, { color: RED }]}>{formatCurrency(item.expenses.total)}</Text>
                <Text style={[s.colAmount, { color: net >= 0 ? GREEN : RED }]}>{formatCurrency(net)}</Text>
              </View>
            )
          })}

          <View style={[s.tableRow, { backgroundColor: '#F8FAFC' }]}>
            <Text style={[s.colProperty, { fontFamily: 'Times-Bold' }]}>TOTAL</Text>
            <Text style={[s.colSmall, { fontFamily: 'Times-Bold' }]}>{summary.occupiedMonths}</Text>
            <Text style={[s.colSmall, { fontFamily: 'Times-Bold' }]}>{summary.vacantMonths}</Text>
            <Text style={[s.colAmount, { fontFamily: 'Times-Bold' }]}>{formatCurrency(summary.receivedRent)}</Text>
            <Text style={[s.colAmount, { fontFamily: 'Times-Bold' }]}>{formatCurrency(summary.receivedCharges)}</Text>
            <Text style={[s.colAmount, { fontFamily: 'Times-Bold' }]}>{formatCurrency(summary.outstandingAmount)}</Text>
            <Text style={[s.colAmount, { fontFamily: 'Times-Bold', color: RED }]}>{formatCurrency(summary.expenses.total)}</Text>
            <Text style={[s.colAmount, { fontFamily: 'Times-Bold', color: summary.netResult >= 0 ? GREEN : RED }]}>{formatCurrency(summary.netResult)}</Text>
          </View>
        </View>

        {/* ── Expense detail table ───────────────────────────── */}
        {hasExpenses && (
          <>
            <Text style={s.sectionTitle}>Detail des charges deductibles</Text>
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={s.expColProperty}>Bien</Text>
                <Text style={s.expColCategory}>Categorie</Text>
                <Text style={s.expColLabel}>Libelle</Text>
                <Text style={s.expColAmount}>Montant</Text>
              </View>

              {expenseRows.map((row, index) => (
                <View key={index} style={s.tableRow}>
                  <Text style={s.expColProperty}>{row.property}</Text>
                  <Text style={s.expColCategory}>{row.category}</Text>
                  <Text style={s.expColLabel}>{row.category}</Text>
                  <Text style={[s.expColAmount, { color: RED }]}>{formatCurrency(row.amount)}</Text>
                </View>
              ))}

              <View style={[s.tableRow, { backgroundColor: '#F8FAFC' }]}>
                <Text style={[s.expColProperty, { fontFamily: 'Times-Bold' }]}>TOTAL</Text>
                <Text style={s.expColCategory} />
                <Text style={s.expColLabel} />
                <Text style={[s.expColAmount, { fontFamily: 'Times-Bold', color: RED }]}>{formatCurrency(summary.expenses.total)}</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Net result box ─────────────────────────────────── */}
        <View style={s.netBox}>
          <View style={s.netCard}>
            <Text style={s.cardLabel}>Total encaisse</Text>
            <Text style={s.cardValue}>{formatCurrency(summary.totalReceived)}</Text>
          </View>
          <View style={s.netCard}>
            <Text style={s.cardLabel}>Charges deductibles</Text>
            <Text style={[s.cardValue, { color: RED }]}>- {formatCurrency(summary.expenses.total)}</Text>
          </View>
          <View style={[s.netCard, { borderColor: summary.netResult >= 0 ? GREEN : RED }]}>
            <Text style={s.cardLabel}>Resultat net foncier</Text>
            <Text style={[s.cardValue, { color: summary.netResult >= 0 ? GREEN : RED }]}>
              {formatCurrency(summary.netResult)}
            </Text>
          </View>
        </View>

        {/* ── Notes ──────────────────────────────────────────── */}
        <View style={s.noteBox}>
          <Text style={s.noteText}>
            Ce document reprend les loyers encaisses, les charges recuperees, les impayes, les charges deductibles
            saisies par le proprietaire, et le resultat net foncier calcule. Il ne remplace pas un conseil fiscal ou comptable.
          </Text>
        </View>

        {/* ── Footer + Signature ─────────────────────────────── */}
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
