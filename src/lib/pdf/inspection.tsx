import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'

export interface InspectionPdfRoom {
  area: string
  condition: string
  notes?: string
}

export interface InspectionPdfData {
  landlordName: string
  landlordAddress?: string
  landlordCity?: string
  landlordPhone?: string
  landlordSignature?: string
  tenantFirstName: string
  tenantLastName: string
  propertyName?: string
  propertyAddress: string
  propertyCity: string
  propertyZip: string
  leaseStartDate: string
  leaseEndDate?: string | null
  kind: 'entry' | 'exit'
  inspectionDate: string
  generalCondition?: string | null
  meterReadings?: string | null
  notes?: string | null
  rooms: InspectionPdfRoom[]
}

const NAVY = '#1B3A5C'
const NAVY_LIGHT = '#526B85'
const CREAM = '#FBF8F1'
const LINE = '#B8C8D8'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: NAVY,
    backgroundColor: CREAM,
    paddingTop: 30,
    paddingBottom: 36,
    paddingHorizontal: 42,
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
    fontSize: 18,
    textAlign: 'right',
    letterSpacing: 1.2,
  },
  subtitle: {
    marginTop: 5,
    fontSize: 9,
    color: NAVY_LIGHT,
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
  metaGrid: {
    borderWidth: 0.5,
    borderColor: LINE,
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  metaRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  metaLabel: {
    width: 100,
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
  },
  metaValue: {
    flex: 1,
    fontSize: 9.5,
  },
  paragraphBox: {
    borderWidth: 0.5,
    borderColor: LINE,
    padding: 10,
    backgroundColor: '#FFFFFF',
  },
  paragraph: {
    fontSize: 9.5,
    lineHeight: 1.5,
  },
  roomTable: {
    borderWidth: 0.5,
    borderColor: LINE,
    backgroundColor: '#FFFFFF',
  },
  roomHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
    backgroundColor: '#EEF3F7',
  },
  roomHeaderCell: {
    fontFamily: 'Times-Bold',
    fontSize: 9,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  roomRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: LINE,
  },
  roomCell: {
    fontSize: 9,
    paddingVertical: 7,
    paddingHorizontal: 8,
    lineHeight: 1.35,
  },
  colArea: { width: '23%' },
  colCondition: { width: '27%' },
  colNotes: { width: '50%' },
  noteGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  noteCol: {
    width: '48%',
  },
  signRow: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signBox: {
    width: '47%',
    borderWidth: 0.5,
    borderColor: LINE,
    padding: 12,
    minHeight: 96,
    backgroundColor: '#FFFFFF',
  },
  signTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
    marginBottom: 8,
  },
  signHint: {
    fontSize: 8.5,
    color: NAVY_LIGHT,
    marginTop: 6,
  },
  signPlaceholder: {
    marginTop: 34,
    borderTopWidth: 0.5,
    borderTopColor: NAVY,
  },
  legalNote: {
    marginTop: 14,
    fontSize: 8.5,
    color: NAVY_LIGHT,
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

function buildAddress(address: string, zip: string, city: string) {
  return zip ? `${address}, ${zip} ${city}` : `${address}, ${city}`
}

function kindLabel(kind: 'entry' | 'exit') {
  return kind === 'entry' ? "Etat des lieux d'entree" : 'Etat des lieux de sortie'
}

function safeText(value: string | null | undefined, fallback = 'Aucune precision') {
  const text = value?.trim()
  return text ? text : fallback
}

export function InspectionPDF({ data }: { data: InspectionPdfData }) {
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
            <Text style={s.title}>{kindLabel(data.kind).toUpperCase()}</Text>
            <Text style={s.subtitle}>{data.propertyName || 'Logement loue'}</Text>
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>Informations generales</Text>
          <View style={s.metaGrid}>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Locataire</Text>
              <Text style={s.metaValue}>{data.tenantFirstName} {data.tenantLastName}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Bien</Text>
              <Text style={s.metaValue}>{address}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>Date du constat</Text>
              <Text style={s.metaValue}>{formatDateFr(data.inspectionDate)}</Text>
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
          <Text style={s.sectionTitle}>Etat general</Text>
          <View style={s.paragraphBox}>
            <Text style={s.paragraph}>{safeText(data.generalCondition, "Aucun commentaire general")}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Pieces et equipements</Text>
          <View style={s.roomTable}>
            <View style={s.roomHeader}>
              <Text style={[s.roomHeaderCell, s.colArea]}>Zone</Text>
              <Text style={[s.roomHeaderCell, s.colCondition]}>Etat constate</Text>
              <Text style={[s.roomHeaderCell, s.colNotes]}>Observations</Text>
            </View>

            {(data.rooms.length > 0 ? data.rooms : [{ area: 'Logement', condition: '', notes: '' }]).map((room, index, array) => (
              <View
                key={`${room.area}-${index}`}
                style={[
                  s.roomRow,
                  index === array.length - 1 ? { borderBottomWidth: 0 } : null,
                ]}
              >
                <Text style={[s.roomCell, s.colArea]}>{safeText(room.area, '-')}</Text>
                <Text style={[s.roomCell, s.colCondition]}>{safeText(room.condition, '-')}</Text>
                <Text style={[s.roomCell, s.colNotes]}>{safeText(room.notes, '-')}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[s.section, s.noteGrid]} wrap={false}>
          <View style={s.noteCol}>
            <Text style={s.sectionTitle}>Releves de compteurs</Text>
            <View style={s.paragraphBox}>
              <Text style={s.paragraph}>{safeText(data.meterReadings)}</Text>
            </View>
          </View>
          <View style={s.noteCol}>
            <Text style={s.sectionTitle}>Remarques complementaires</Text>
            <View style={s.paragraphBox}>
              <Text style={s.paragraph}>{safeText(data.notes)}</Text>
            </View>
          </View>
        </View>

        <View style={s.signRow} wrap={false}>
          <View style={s.signBox}>
            <Text style={s.signTitle}>Proprietaire</Text>
            {data.landlordSignature && data.landlordSignature.startsWith('data:image') ? (
              <Image src={{ uri: data.landlordSignature }} style={{ width: 120, height: 52 }} />
            ) : (
              <View style={s.signPlaceholder} />
            )}
            <Text style={s.signHint}>Nom: {data.landlordName}</Text>
          </View>

          <View style={s.signBox}>
            <Text style={s.signTitle}>Locataire</Text>
            <View style={s.signPlaceholder} />
            <Text style={s.signHint}>Nom: {data.tenantFirstName} {data.tenantLastName}</Text>
          </View>
        </View>

        <Text style={s.legalNote}>
          Document genere via LeaseFrance. Cette version MVP prevoit une signature du proprietaire et un emplacement de signature pour le locataire.
        </Text>
      </Page>
    </Document>
  )
}
