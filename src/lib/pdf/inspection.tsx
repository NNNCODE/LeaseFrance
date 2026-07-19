import {
  Document, Page, Text, View, StyleSheet, Image,
} from '@react-pdf/renderer'
import i18n from '@/i18n'
import { getLocaleForLanguage } from '@/i18n/config'

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

function translate(key: string, options?: Record<string, unknown>) {
  return i18n.t(key, options)
}

function formatDateLocalized(value: string | null | undefined) {
  if (!value) return translate('profile.notProvided')
  return new Intl.DateTimeFormat(getLocaleForLanguage(i18n.resolvedLanguage || i18n.language), {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function buildAddress(address: string, zip: string, city: string) {
  return zip ? `${address}, ${zip} ${city}` : `${address}, ${city}`
}

function kindLabel(kind: 'entry' | 'exit') {
  return kind === 'entry'
    ? translate('inspections.pdf.entryTitle')
    : translate('inspections.pdf.exitTitle')
}

function safeText(value: string | null | undefined, fallback = translate('inspections.pdf.noDetails')) {
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
            <Text style={s.subtitle}>{data.propertyName || translate('inspections.pdf.rentalUnit')}</Text>
          </View>
        </View>

        <View style={s.rule} />

        <View style={s.section}>
          <Text style={s.sectionTitle}>{translate('inspections.pdf.generalInformation')}</Text>
          <View style={s.metaGrid}>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{translate('inspections.tenant')}</Text>
              <Text style={s.metaValue}>{data.tenantFirstName} {data.tenantLastName}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{translate('inspections.property')}</Text>
              <Text style={s.metaValue}>{address}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{translate('inspections.date')}</Text>
              <Text style={s.metaValue}>{formatDateLocalized(data.inspectionDate)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{translate('inspections.leaseStartDate')}</Text>
              <Text style={s.metaValue}>{formatDateLocalized(data.leaseStartDate)}</Text>
            </View>
            <View style={s.metaRow}>
              <Text style={s.metaLabel}>{translate('inspections.leaseEndDate')}</Text>
              <Text style={s.metaValue}>{formatDateLocalized(data.leaseEndDate)}</Text>
            </View>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{translate('inspections.generalCondition')}</Text>
          <View style={s.paragraphBox}>
            <Text style={s.paragraph}>{safeText(data.generalCondition, translate('inspections.noGeneralCondition'))}</Text>
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>{translate('inspections.pdf.roomsAndEquipment')}</Text>
          <View style={s.roomTable}>
            <View style={s.roomHeader}>
              <Text style={[s.roomHeaderCell, s.colArea]}>{translate('inspections.area')}</Text>
              <Text style={[s.roomHeaderCell, s.colCondition]}>{translate('inspections.condition')}</Text>
              <Text style={[s.roomHeaderCell, s.colNotes]}>{translate('inspections.notes')}</Text>
            </View>

            {(data.rooms.length > 0 ? data.rooms : [{ area: translate('inspections.pdf.rentalUnit'), condition: '', notes: '' }]).map((room, index, array) => (
              <View
                key={`${room.area}-${index}`}
                style={[
                  s.roomRow,
                  index === array.length - 1 ? { borderBottomWidth: 0 } : {},
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
            <Text style={s.sectionTitle}>{translate('inspections.meterReadings')}</Text>
            <View style={s.paragraphBox}>
              <Text style={s.paragraph}>{safeText(data.meterReadings)}</Text>
            </View>
          </View>
          <View style={s.noteCol}>
            <Text style={s.sectionTitle}>{translate('inspections.notes')}</Text>
            <View style={s.paragraphBox}>
              <Text style={s.paragraph}>{safeText(data.notes, translate('inspections.noAdditionalNotes'))}</Text>
            </View>
          </View>
        </View>

        <View style={s.signRow} wrap={false}>
          <View style={s.signBox}>
            <Text style={s.signTitle}>{translate('nav.profile')}</Text>
            {data.landlordSignature && data.landlordSignature.startsWith('data:image') ? (
              <Image src={{ uri: data.landlordSignature }} style={{ width: 120, height: 52 }} />
            ) : (
              <View style={s.signPlaceholder} />
            )}
            <Text style={s.signHint}>{translate('profile.fullName')}: {data.landlordName}</Text>
          </View>

          <View style={s.signBox}>
            <Text style={s.signTitle}>{translate('inspections.tenant')}</Text>
            <View style={s.signPlaceholder} />
            <Text style={s.signHint}>{translate('profile.fullName')}: {data.tenantFirstName} {data.tenantLastName}</Text>
          </View>
        </View>

        <Text style={s.legalNote}>{translate('inspections.pdf.legalNote')}</Text>
      </Page>
    </Document>
  )
}
