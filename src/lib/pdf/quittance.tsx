import {
  Document, Page, Text, View, StyleSheet, Image,
  Svg, Path, Rect, Circle, Ellipse,
} from '@react-pdf/renderer'

// ── Number to French words ──────────────────────────────────────────────────

const UNITS = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf',
  'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf']
const TENS = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante', 'quatre-vingt', 'quatre-vingt']

function numberToFrenchWords(n: number): string {
  if (n === 0) return 'zéro'
  const euros = Math.floor(n)
  const cents = Math.round((n - euros) * 100)
  let result = intToWords(euros) + ' euro' + (euros > 1 ? 's' : '')
  if (cents > 0) {
    result += ' et ' + intToWords(cents) + ' centime' + (cents > 1 ? 's' : '')
  }
  return result.charAt(0).toUpperCase() + result.slice(1)
}

function intToWords(n: number): string {
  if (n === 0) return ''
  if (n < 20) return UNITS[n]
  if (n < 100) {
    const ten = Math.floor(n / 10)
    const unit = n % 10
    if (ten === 7 || ten === 9) {
      const base = ten === 7 ? 'soixante' : 'quatre-vingt'
      const rem = (ten === 7 ? 10 : 10) + unit
      return base + (rem === 11 && ten === 7 ? ' et onze' : '-' + UNITS[rem])
    }
    if (unit === 0) return TENS[ten] + (ten === 8 ? 's' : '')
    if (unit === 1 && ten < 8) return TENS[ten] + ' et un'
    return TENS[ten] + '-' + UNITS[unit]
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100)
    const rem = n % 100
    const prefix = hundreds === 1 ? 'cent' : UNITS[hundreds] + ' cent' + (rem === 0 ? 's' : '')
    return prefix + (rem > 0 ? ' ' + intToWords(rem) : '')
  }
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000)
    const rem = n % 1000
    const prefix = thousands === 1 ? 'mille' : intToWords(thousands) + ' mille'
    return prefix + (rem > 0 ? ' ' + intToWords(rem) : '')
  }
  const millions = Math.floor(n / 1000000)
  const rem = n % 1000000
  const prefix = intToWords(millions) + ' million' + (millions > 1 ? 's' : '')
  return prefix + (rem > 0 ? ' ' + intToWords(rem) : '')
}

// ── Colors ──────────────────────────────────────────────────────────────────

const NAVY = '#1B3A5C'
const NAVY_LIGHT = '#4A6D8C'
const CREAM = '#FDFBF5'
const LINE_BLUE = '#8BAAC4'

// ── Paris Illustration (SVG) ────────────────────────────────────────────────

function ParisIllustration() {
  const c = NAVY
  return (
    <Svg viewBox="0 0 160 120" style={{ width: 130, height: 97 }}>
      <Ellipse cx={80} cy={90} rx={75} ry={30} fill={c} opacity={0.03} />
      <Rect x={0} y={50} width={18} height={70} fill={c} opacity={0.13} />
      <Path d="M 0 50 L 9 42 L 18 50 Z" fill={c} opacity={0.13} />
      <Rect x={20} y={58} width={14} height={62} fill={c} opacity={0.11} />
      <Path d="M 20 58 L 27 52 L 34 58 Z" fill={c} opacity={0.11} />
      <Rect x={36} y={68} width={11} height={52} fill={c} opacity={0.09} />
      <Rect x={4} y={56} width={3} height={4} fill={CREAM} opacity={0.5} />
      <Rect x={11} y={56} width={3} height={4} fill={CREAM} opacity={0.5} />
      <Rect x={4} y={64} width={3} height={4} fill={CREAM} opacity={0.5} />
      <Rect x={11} y={64} width={3} height={4} fill={CREAM} opacity={0.5} />
      <Rect x={4} y={72} width={3} height={4} fill={CREAM} opacity={0.5} />
      <Rect x={23} y={64} width={3} height={3} fill={CREAM} opacity={0.4} />
      <Rect x={29} y={64} width={3} height={3} fill={CREAM} opacity={0.4} />
      <Rect x={23} y={72} width={3} height={3} fill={CREAM} opacity={0.4} />
      <Ellipse cx={50} cy={86} rx={7} ry={9} fill={c} opacity={0.07} />
      <Rect x={49} y={95} width={2} height={14} fill={c} opacity={0.09} />
      <Circle cx={80} cy={4} r={1.5} fill={c} opacity={0.25} />
      <Rect x={79} y={5} width={2} height={12} fill={c} opacity={0.25} />
      <Path d="M 77 17 L 83 17 L 85 32 L 75 32 Z" fill={c} opacity={0.22} />
      <Rect x={73} y={32} width={14} height={2.5} fill={c} opacity={0.22} />
      <Path d="M 74 34.5 L 86 34.5 L 92 58 L 68 58 Z" fill={c} opacity={0.18} />
      <Rect x={66} y={58} width={28} height={3} fill={c} opacity={0.2} />
      <Path d="M 68 58 Q 80 50 92 58" fill="none" stroke={c} strokeWidth={1.2} opacity={0.15} />
      <Path d="M 67 61 L 50 120 L 58 120 L 73 69 Z" fill={c} opacity={0.15} />
      <Path d="M 93 61 L 110 120 L 102 120 L 87 69 Z" fill={c} opacity={0.15} />
      <Path d="M 58 120 Q 80 98 102 120" fill="none" stroke={c} strokeWidth={1} opacity={0.12} />
      <Path d="M 70 78 L 90 78" fill="none" stroke={c} strokeWidth={0.6} opacity={0.1} />
      <Path d="M 65 95 L 95 95" fill="none" stroke={c} strokeWidth={0.6} opacity={0.1} />
      <Ellipse cx={108} cy={84} rx={6} ry={8} fill={c} opacity={0.07} />
      <Rect x={107} y={92} width={2} height={12} fill={c} opacity={0.09} />
      <Rect x={116} y={54} width={14} height={66} fill={c} opacity={0.11} />
      <Path d="M 116 54 L 123 48 L 130 54 Z" fill={c} opacity={0.11} />
      <Rect x={132} y={62} width={15} height={58} fill={c} opacity={0.09} />
      <Rect x={149} y={68} width={11} height={52} fill={c} opacity={0.11} />
      <Rect x={120} y={60} width={3} height={3} fill={CREAM} opacity={0.4} />
      <Rect x={125} y={60} width={3} height={3} fill={CREAM} opacity={0.4} />
      <Rect x={120} y={68} width={3} height={3} fill={CREAM} opacity={0.4} />
      <Rect x={136} y={68} width={3} height={3} fill={CREAM} opacity={0.35} />
      <Rect x={142} y={68} width={3} height={3} fill={CREAM} opacity={0.35} />
      <Rect x={152} y={74} width={3} height={3} fill={CREAM} opacity={0.35} />
    </Svg>
  )
}

// ── Fleur-de-lis ornament ───────────────────────────────────────────────────

function FleurDeLis() {
  const c = NAVY
  return (
    <Svg viewBox="0 0 30 28" style={{ width: 18, height: 17 }}>
      <Path d="M 15 2 Q 12 8 15 16 Q 18 8 15 2" fill={c} opacity={0.65} />
      <Path d="M 15 16 Q 8 9 5 12 Q 8 17 15 16" fill={c} opacity={0.65} />
      <Path d="M 15 16 Q 22 9 25 12 Q 22 17 15 16" fill={c} opacity={0.65} />
      <Rect x={13} y={16} width={4} height={7} fill={c} opacity={0.6} />
      <Rect x={9} y={22} width={12} height={2} fill={c} opacity={0.55} />
    </Svg>
  )
}

// ── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: NAVY,
    paddingTop: 30,
    paddingBottom: 45,
    paddingHorizontal: 48,
    backgroundColor: CREAM,
  },
  header: { flexDirection: 'row', marginBottom: 14 },
  headerLeft: { width: 135 },
  headerRight: { flex: 1, paddingLeft: 14, justifyContent: 'flex-start', paddingTop: 10 },
  hFieldRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 11 },
  hLabel: { fontSize: 9, color: NAVY, marginRight: 4 },
  hUL: { flex: 1, borderBottomWidth: 0.5, borderBottomColor: LINE_BLUE, paddingBottom: 2 },
  hVal: { fontFamily: 'Times-Bold', fontSize: 9.5, color: NAVY },
  dblWrap: { marginVertical: 1 },
  lineHeavy: { height: 1.5, backgroundColor: LINE_BLUE, opacity: 0.7 },
  lineLight: { height: 0.5, backgroundColor: LINE_BLUE, opacity: 0.5, marginTop: 2 },
  titleBlock: { alignItems: 'center', paddingVertical: 8 },
  title: { fontSize: 22, fontFamily: 'Times-Bold', color: NAVY, letterSpacing: 4, textAlign: 'center' },
  ornamentWrap: { alignItems: 'center', marginTop: 4 },
  sep: { height: 0.5, backgroundColor: LINE_BLUE, opacity: 0.35, marginVertical: 10 },
  fRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 12 },
  fLabel: { fontFamily: 'Times-Italic', fontSize: 10, color: NAVY },
  fHint: { fontFamily: 'Times-Roman', fontSize: 8, color: NAVY_LIGHT, marginLeft: 4 },
  fUL: { flex: 1, borderBottomWidth: 0.5, borderBottomColor: LINE_BLUE, paddingBottom: 2, marginLeft: 6 },
  fVal: { fontFamily: 'Times-Bold', fontSize: 10, color: NAVY },
  fValBig: { fontFamily: 'Times-Bold', fontSize: 13, color: NAVY, textAlign: 'right' },
  fEuro: { fontFamily: 'Times-Bold', fontSize: 13, color: NAVY, marginLeft: 6, paddingBottom: 1 },
  wordsVal: { fontFamily: 'Times-Italic', fontSize: 9, color: NAVY_LIGHT },
  bodyText: { fontFamily: 'Times-Italic', fontSize: 10, color: NAVY, marginBottom: 12 },
  cbBlock: { marginVertical: 8, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 0.5, borderColor: LINE_BLUE, width: '58%' },
  cbRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cbBox: { width: 11, height: 11, borderWidth: 0.8, borderColor: NAVY, marginRight: 8 },
  cbBoxOn: { width: 11, height: 11, borderWidth: 0.8, borderColor: NAVY, backgroundColor: NAVY, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  cbMark: { fontSize: 7, color: '#FFFFFF', fontFamily: 'Times-Bold' },
  cbLabel: { fontSize: 9.5, color: NAVY },
  cbVal: { fontSize: 9.5, fontFamily: 'Times-Bold', color: NAVY, marginLeft: 4 },
  /* Legal mention */
  legalBox: { marginTop: 6, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 0.5, borderColor: LINE_BLUE, borderRadius: 2 },
  legalText: { fontFamily: 'Times-Italic', fontSize: 8.5, color: NAVY_LIGHT, lineHeight: 1.5, textAlign: 'justify' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  footerL: { flex: 1 },
  footerR: { flex: 1, alignItems: 'center' },
  footerLabel: { fontFamily: 'Times-Italic', fontSize: 9, color: NAVY, marginBottom: 2 },
  footerVal: { fontFamily: 'Times-Bold', fontSize: 9.5, color: NAVY, marginBottom: 8 },
  sigLabel: { fontFamily: 'Times-BoldItalic', fontSize: 9.5, color: NAVY, textAlign: 'center', marginBottom: 22 },
  sigRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  sigLine: { width: 50, borderTopWidth: 0.5, borderTopColor: NAVY },
  sigCachet: { fontFamily: 'Times-Roman', fontSize: 8.5, color: NAVY, marginHorizontal: 6 },
  docFooter: { position: 'absolute', bottom: 20, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 0.5, borderTopColor: LINE_BLUE, paddingTop: 5 },
  docFooterText: { fontSize: 6.5, fontFamily: 'Times-Roman', color: '#94a3b8' },
})

// ── Types ───────────────────────────────────────────────────────────────────

export interface QuittanceData {
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
  periodMonth: number
  periodYear: number
  rentAmount: number
  chargesAmount: number
  paymentDate: string | null
  paymentMethod: string
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

// ── Document ────────────────────────────────────────────────────────────────

export function QuittancePDF({ data }: { data: QuittanceData }) {
  const total = data.rentAmount + data.chargesAmount
  const period = `${MONTHS[data.periodMonth - 1]} ${data.periodYear}`
  const genDate = formatDateFr(new Date().toISOString())
  const totalInWords = numberToFrenchWords(total)
  const hasCharges = data.chargesAmount > 0
  const landlordCity = data.landlordCity?.trim() || data.propertyCity
  const addr = data.propertyZip
    ? `${data.propertyAddress}, ${data.propertyZip} ${data.propertyCity}`
    : `${data.propertyAddress}, ${data.propertyCity}`

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header: Paris illustration + Owner info ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <ParisIllustration />
          </View>
          <View style={s.headerRight}>
            <View style={s.hFieldRow}>
              <Text style={s.hLabel}>{'Nom du Propriétaire :'}</Text>
              <View style={s.hUL}><Text style={s.hVal}>{data.landlordName}</Text></View>
            </View>
            <View style={s.hFieldRow}>
              <Text style={s.hLabel}>{'Adresse du Propriétaire :'}</Text>
              <View style={s.hUL}><Text style={s.hVal}>{data.landlordAddress ?? ''}</Text></View>
            </View>
            <View style={s.hFieldRow}>
              <Text style={s.hLabel}>{'Téléphone :'}</Text>
              <View style={s.hUL}><Text style={s.hVal}>{data.landlordPhone ?? ''}</Text></View>
            </View>
          </View>
        </View>

        {/* ── Double decorative lines + Title ── */}
        <View style={s.dblWrap}>
          <View style={s.lineHeavy} />
          <View style={s.lineLight} />
        </View>

        <View style={s.titleBlock}>
          <Text style={s.title}>{'QUITTANCE DE LOYER'}</Text>
          <View style={s.ornamentWrap}>
            <FleurDeLis />
          </View>
        </View>

        <View style={s.dblWrap}>
          <View style={s.lineHeavy} />
          <View style={s.lineLight} />
        </View>

        <View style={s.sep} />

        {/* ── Je soussigné(e) ── */}
        <View style={s.fRow}>
          <Text style={s.fLabel}>{'Je soussigné(e), '}</Text>
          <Text style={s.fHint}>{'(Nom du Propriétaire)'}</Text>
          <View style={s.fUL}><Text style={s.fVal}>{data.landlordName}</Text></View>
        </View>

        <Text style={s.bodyText}>{'déclare avoir reçu de :'}</Text>

        {/* ── De la part de ── */}
        <View style={s.fRow}>
          <Text style={s.fLabel}>{'Locataire : '}</Text>
          <Text style={s.fHint}>{'(Nom du Locataire)'}</Text>
          <View style={s.fUL}>
            <Text style={s.fVal}>{(data.tenantFirstName + ' ' + data.tenantLastName).toUpperCase()}</Text>
          </View>
        </View>

        <Text style={s.bodyText}>{'la somme de :'}</Text>

        {/* ── Montant en euros ── */}
        <View style={s.fRow}>
          <Text style={s.fLabel}>{'Montant en euros : '}</Text>
          <View style={[s.fUL, { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'flex-end' }]}>
            <Text style={s.fValBig}>{total.toFixed(2).replace('.', ',')}</Text>
          </View>
          <Text style={s.fEuro}>{'€'}</Text>
        </View>

        {/* ── Montant en toutes lettres ── */}
        <View style={s.fRow}>
          <Text style={[s.fLabel, { fontSize: 9.5 }]}>{'Montant en toutes lettres : '}</Text>
          <Text style={s.fHint}>{'(en lettres)'}</Text>
          <View style={s.fUL}><Text style={s.wordsVal}>{totalInWords}</Text></View>
        </View>

        <View style={s.sep} />

        {/* ── Adresse du logement ── */}
        <View style={s.fRow}>
          <Text style={s.fLabel}>{'Adresse du Logement : '}</Text>
          <View style={s.fUL}>
            <Text style={s.fVal}>{addr}</Text>
          </View>
        </View>

        {/* ── Période ── */}
        <View style={s.fRow}>
          <Text style={s.fLabel}>{'Correspondant au loyer du mois de : '}</Text>
          <Text style={s.fHint}>{'(Mois et Année)'}</Text>
          <View style={s.fUL}><Text style={s.fVal}>{period}</Text></View>
        </View>

        {/* ── Ventilation (checkboxes) ── */}
        <View style={s.cbBlock}>
          <View style={s.cbRow}>
            <View style={s.cbBoxOn}><Text style={s.cbMark}>x</Text></View>
            <Text style={s.cbLabel}>Loyer hors charges</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.cbVal}>{formatEur(data.rentAmount)}</Text>
          </View>
          <View style={s.cbRow}>
            <View style={hasCharges ? s.cbBoxOn : s.cbBox}>
              {hasCharges && <Text style={s.cbMark}>x</Text>}
            </View>
            <Text style={s.cbLabel}>Provisions sur charges</Text>
            <View style={{ flex: 1 }} />
            <Text style={s.cbVal}>{formatEur(data.chargesAmount)}</Text>
          </View>
          <View style={[s.cbRow, { marginBottom: 0 }]}>
            <View style={s.cbBox} />
            <Text style={s.cbLabel}>{'Autres : '}</Text>
            <View style={{ flex: 1, height: 1, borderBottomWidth: 0.5, borderBottomColor: LINE_BLUE, marginLeft: 4, alignSelf: 'flex-end', marginBottom: 3 }} />
          </View>
        </View>

        <View style={s.sep} />

        {/* ── Mode de paiement ── */}
        <View style={s.fRow}>
          <Text style={s.fLabel}>{'Mode de paiement : '}</Text>
          <View style={s.fUL}>
            <Text style={s.fVal}>{METHODS[data.paymentMethod] ?? data.paymentMethod}</Text>
          </View>
        </View>

        {/* ── Mention légale (quittance-specific) ── */}
        <View style={s.legalBox}>
          <Text style={s.legalText}>
            {'Cette quittance annule tous les reçus qui auraient pu être établis précédemment en cas de paiement partiel du loyer. Elle ne préjuge pas du paiement des termes antérieurs non acquittés. (Loi du 6 juillet 1989, art. 21)'}
          </Text>
        </View>

        {/* ── Footer: Fait à + Signature ── */}
        <View style={s.footer}>
          <View style={s.footerL}>
            <Text style={s.footerLabel}>{'Fait à :'}</Text>
            <Text style={s.footerVal}>{landlordCity}</Text>
            <Text style={s.footerLabel}>Le :</Text>
            <Text style={s.footerVal}>{genDate}</Text>
          </View>
          <View style={s.footerR}>
            <Text style={s.sigLabel}>{'Signature du Propriétaire'}</Text>
            {data.landlordSignature && data.landlordSignature.startsWith('data:image') ? (
              <Image src={{ uri: data.landlordSignature }} style={{ width: 120, height: 60 }} />
            ) : (
              <View style={s.sigRow}>
                <View style={s.sigLine} />
                <Text style={s.sigCachet}>(Cachet)</Text>
                <View style={s.sigLine} />
              </View>
            )}
          </View>
        </View>

        {/* ── Document footer ── */}
        <View style={s.docFooter} fixed>
          <Text style={s.docFooterText}>{'Quittance de loyer générée le '}{genDate}{' via Baillio'}</Text>
          <Text style={s.docFooterText}>{'Document non fiscal — à conserver'}</Text>
        </View>

      </Page>
    </Document>
  )
}
