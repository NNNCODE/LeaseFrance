import {
  Document, Page, Text, View, StyleSheet, Font,
} from '@react-pdf/renderer'

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1a1a2e',
    padding: 50,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottom: '2px solid #6366F1',
  },
  brandTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#6366F1',
  },
  brandSubtitle: {
    fontSize: 8,
    color: '#64748B',
    marginTop: 2,
  },
  docTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'right',
    color: '#1a1a2e',
  },
  docSubtitle: {
    fontSize: 9,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 2,
  },
  partiesRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 24,
  },
  partyBox: {
    flex: 1,
    backgroundColor: '#f8f9ff',
    borderRadius: 6,
    padding: 12,
    border: '1px solid #e2e8f0',
  },
  partyLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  partyName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
    marginBottom: 3,
  },
  partyText: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#6366F1',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1px solid #e2e8f0',
  },
  table: {
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #f1f5f9',
    padding: '8 12',
  },
  tableRowAlt: {
    backgroundColor: '#f8f9ff',
  },
  tableRowTotal: {
    backgroundColor: '#6366F1',
    borderBottom: 0,
    padding: '10 12',
  },
  tableLabel: {
    flex: 1,
    fontSize: 9,
    color: '#475569',
  },
  tableValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
    textAlign: 'right',
  },
  tableLabelTotal: {
    flex: 1,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
  },
  tableValueTotal: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#ffffff',
    textAlign: 'right',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  infoLabel: {
    width: 120,
    fontSize: 9,
    color: '#64748B',
  },
  infoValue: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a2e',
  },
  legalBox: {
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 6,
    padding: 12,
    marginBottom: 20,
  },
  legalText: {
    fontSize: 8.5,
    color: '#166534',
    lineHeight: 1.6,
    textAlign: 'center',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 30,
  },
  signatureBox: {
    width: 200,
    textAlign: 'center',
  },
  signatureLabel: {
    fontSize: 8,
    color: '#64748B',
    marginBottom: 40,
  },
  signatureLine: {
    borderTop: '1px solid #94a3b8',
    paddingTop: 4,
    fontSize: 8,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: '1px solid #e2e8f0',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#94a3b8',
  },
})

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuittanceData {
  // Bailleur
  landlordName: string
  landlordAddress?: string

  // Locataire
  tenantFirstName: string
  tenantLastName: string

  // Bien
  propertyName: string
  propertyAddress: string
  propertyCity: string
  propertyZip: string

  // Paiement
  periodMonth: number
  periodYear: number
  rentAmount: number
  chargesAmount: number
  paymentDate: string | null
  paymentMethod: string

  // Bail
  leaseType: string
}

const MONTHS = [
  'janvier','février','mars','avril','mai','juin',
  'juillet','août','septembre','octobre','novembre','décembre',
]

const METHODS: Record<string, string> = {
  virement:    'Virement bancaire',
  cheque:      'Chèque',
  especes:     'Espèces',
  prelevement: 'Prélèvement automatique',
}

function formatEur(n: number) {
  return n.toFixed(2).replace('.', ',') + ' €'
}

function formatDateFr(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// ── Document ──────────────────────────────────────────────────────────────────

export function QuittancePDF({ data }: { data: QuittanceData }) {
  const total = data.rentAmount + data.chargesAmount
  const period = `${MONTHS[data.periodMonth - 1]} ${data.periodYear}`
  const genDate = formatDateFr(new Date().toISOString())

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        {/* En-tête */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandTitle}>LeaseFrance</Text>
            <Text style={styles.brandSubtitle}>Gestion locative privée</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>QUITTANCE DE LOYER</Text>
            <Text style={styles.docSubtitle}>Période : {period}</Text>
          </View>
        </View>

        {/* Parties */}
        <View style={styles.partiesRow}>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Bailleur</Text>
            <Text style={styles.partyName}>{data.landlordName}</Text>
            {data.landlordAddress && (
              <Text style={styles.partyText}>{data.landlordAddress}</Text>
            )}
          </View>
          <View style={styles.partyBox}>
            <Text style={styles.partyLabel}>Locataire</Text>
            <Text style={styles.partyName}>{data.tenantFirstName} {data.tenantLastName}</Text>
            <Text style={styles.partyText}>
              {data.propertyAddress}{'\n'}{data.propertyZip} {data.propertyCity}
            </Text>
          </View>
        </View>

        {/* Bien */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bien loué</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Désignation :</Text>
            <Text style={styles.infoValue}>{data.propertyName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Adresse :</Text>
            <Text style={styles.infoValue}>{data.propertyAddress}, {data.propertyZip} {data.propertyCity}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Type de bail :</Text>
            <Text style={styles.infoValue}>
              {data.leaseType === 'vide' ? 'Location vide' : data.leaseType === 'meuble' ? 'Location meublée' : 'Bail mobilité'}
            </Text>
          </View>
        </View>

        {/* Détail des sommes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Détail du règlement — {period}</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <Text style={styles.tableLabel}>Loyer hors charges</Text>
              <Text style={styles.tableValue}>{formatEur(data.rentAmount)}</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowAlt]}>
              <Text style={styles.tableLabel}>Provisions sur charges</Text>
              <Text style={styles.tableValue}>{formatEur(data.chargesAmount)}</Text>
            </View>
            <View style={styles.tableRowTotal}>
              <Text style={styles.tableLabelTotal}>Total toutes charges comprises</Text>
              <Text style={styles.tableValueTotal}>{formatEur(total)}</Text>
            </View>
          </View>
        </View>

        {/* Paiement */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informations de paiement</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date de paiement :</Text>
            <Text style={styles.infoValue}>{formatDateFr(data.paymentDate)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Mode de paiement :</Text>
            <Text style={styles.infoValue}>{METHODS[data.paymentMethod] ?? data.paymentMethod}</Text>
          </View>
        </View>

        {/* Mention légale */}
        <View style={styles.legalBox}>
          <Text style={styles.legalText}>
            Je soussigné(e) {data.landlordName}, propriétaire bailleur, déclare avoir reçu de
            {' '}{data.tenantFirstName} {data.tenantLastName} la somme de {formatEur(total)} correspondant
            au loyer et aux charges du logement situé au {data.propertyAddress}, {data.propertyZip} {data.propertyCity},
            pour la période du 1er au dernier jour du mois de {period}.
            Cette quittance annule tous les reçus qui auraient pu être établis précédemment en cas de paiement partiel dudit loyer.
          </Text>
        </View>

        {/* Signature */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Signature du bailleur :</Text>
            <Text style={styles.signatureLine}>{data.landlordName}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Quittance générée le {genDate} via LeaseFrance</Text>
          <Text style={styles.footerText}>Document non fiscal — à conserver</Text>
        </View>

      </Page>
    </Document>
  )
}
