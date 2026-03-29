import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from '@react-pdf/renderer'
import type { ReactNode } from 'react'
import type { FurnishedLeaseContractPdfData } from '@/lib/leaseContractDocument'

const NAVY = '#16324E'
const BLUE = '#3B6585'
const LINE = '#B6C9D8'
const PAPER = '#F8F5EE'
const WHITE = '#FFFFFF'
const MUTED = '#58718A'

const s = StyleSheet.create({
  page: {
    fontFamily: 'Times-Roman',
    fontSize: 9.2,
    color: NAVY,
    backgroundColor: PAPER,
    paddingTop: 30,
    paddingBottom: 42,
    paddingHorizontal: 34,
  },
  header: {
    marginBottom: 14,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 7,
  },
  pageChip: {
    borderWidth: 0.6,
    borderColor: LINE,
    backgroundColor: WHITE,
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
    fontSize: 8,
    color: BLUE,
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontFamily: 'Times-Bold',
    fontSize: 15.2,
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 8.7,
    textAlign: 'center',
    color: BLUE,
  },
  sourceNote: {
    borderWidth: 0.6,
    borderColor: LINE,
    backgroundColor: WHITE,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 8.3,
    lineHeight: 1.35,
    color: MUTED,
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    backgroundColor: BLUE,
    color: WHITE,
    paddingVertical: 5,
    paddingHorizontal: 8,
    fontFamily: 'Times-Bold',
    fontSize: 9.4,
    letterSpacing: 0.2,
  },
  block: {
    borderWidth: 0.6,
    borderColor: LINE,
    backgroundColor: WHITE,
    padding: 9,
  },
  blockSpaced: {
    borderWidth: 0.6,
    borderColor: LINE,
    backgroundColor: WHITE,
    padding: 9,
    marginTop: 6,
  },
  paragraph: {
    fontSize: 9.2,
    lineHeight: 1.45,
    marginBottom: 5,
  },
  muted: {
    color: MUTED,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  col: {
    flex: 1,
  },
  label: {
    fontFamily: 'Times-Bold',
    fontSize: 8.7,
    marginBottom: 2,
  },
  valueBox: {
    borderWidth: 0.6,
    borderColor: LINE,
    minHeight: 26,
    paddingHorizontal: 6,
    paddingVertical: 5,
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 9,
    lineHeight: 1.3,
  },
  fieldRow: {
    marginBottom: 6,
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.4,
    borderBottomColor: LINE,
    paddingVertical: 4,
    gap: 6,
  },
  dataRowLast: {
    flexDirection: 'row',
    paddingTop: 4,
    gap: 6,
  },
  dataLabel: {
    width: '39%',
    fontFamily: 'Times-Bold',
    fontSize: 8.8,
  },
  dataValue: {
    width: '61%',
    fontSize: 8.8,
    lineHeight: 1.3,
  },
  infoNote: {
    borderWidth: 0.6,
    borderColor: LINE,
    backgroundColor: '#F4F8FB',
    padding: 8,
    marginTop: 6,
  },
  infoTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 8.7,
    marginBottom: 3,
  },
  infoText: {
    fontSize: 8.5,
    lineHeight: 1.35,
  },
  bullet: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 3,
  },
  bulletDot: {
    width: 8,
    fontFamily: 'Times-Bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 8.8,
    lineHeight: 1.3,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkboxLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    width: '48%',
    marginBottom: 4,
  },
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 0.8,
    borderColor: NAVY,
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 7.5,
    fontFamily: 'Times-Bold',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 8.8,
    lineHeight: 1.25,
  },
  moneyGrid: {
    borderWidth: 0.6,
    borderColor: LINE,
    backgroundColor: WHITE,
  },
  moneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 0.4,
    borderBottomColor: LINE,
    gap: 8,
  },
  moneyLabel: {
    width: '68%',
    fontSize: 8.8,
    lineHeight: 1.3,
  },
  moneyValue: {
    width: '28%',
    fontSize: 8.8,
    textAlign: 'right',
    fontFamily: 'Times-Bold',
  },
  signatureWrap: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 0.6,
    borderColor: LINE,
    backgroundColor: WHITE,
    padding: 10,
    minHeight: 150,
  },
  signatureTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 9.2,
    marginBottom: 5,
  },
  signatureMeta: {
    fontSize: 8.7,
    color: MUTED,
    marginBottom: 10,
  },
  signatureImage: {
    width: 110,
    height: 56,
    marginTop: 22,
  },
  signatureLine: {
    marginTop: 58,
    borderTopWidth: 0.6,
    borderTopColor: NAVY,
  },
  footer: {
    position: 'absolute',
    left: 34,
    right: 34,
    bottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: MUTED,
  },
})

function formatDateFr(value: string | null | undefined): string {
  if (!value) return 'Non renseigne'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

function formatCurrencyFr(value: number | null | undefined): string {
  if (value == null) return 'Non renseigne'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

function formatNumber(value: number | null | undefined, suffix = ''): string {
  if (value == null) return 'Non renseigne'
  return `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(value)}${suffix}`
}

function yesNo(value: boolean): string {
  return value ? 'Oui' : 'Non'
}

function textOrFallback(value: string | null | undefined, fallback = 'Non renseigne'): string {
  return value && value.trim() ? value.trim() : fallback
}

function joinLocation(address: string, zip: string, city: string, unitDetails: string | null): string {
  return [address, zip && city ? `${zip} ${city}` : city, unitDetails].filter(Boolean).join(', ')
}

function PageFrame({
  number,
  title,
  children,
}: {
  number: number
  title: string
  children: ReactNode
}) {
  return (
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <View style={s.topLine}>
          <Text style={s.pageChip}>Page {number}</Text>
          <Text style={s.pageChip}>Contrat type logement meuble</Text>
        </View>
        <View style={s.titleWrap}>
          <Text style={s.title}>CONTRAT DE LOCATION / COLOCATION - LOGEMENT MEUBLE</Text>
          <Text style={s.subtitle}>{title}</Text>
        </View>
        <Text style={s.sourceNote}>
          Structure fondee sur l annexe 2 du decret n° 2015-587 du 29 mai 2015, version en vigueur depuis le 1er janvier 2025
          (modifiee par le decret n° 2023-796 du 18 aout 2023).
        </Text>
      </View>

      {children}

      <View style={s.footer} fixed>
        <Text>RentFlow - contrat location meublee</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
      </View>
    </Page>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.block}>{children}</View>
    </View>
  )
}

function Field({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <View style={s.fieldRow}>
      <Text style={s.label}>{label}</Text>
      <View style={s.valueBox}>
        <Text style={s.valueText}>{value}</Text>
      </View>
    </View>
  )
}

function DataRow({
  label,
  value,
  last = false,
}: {
  label: string
  value: string
  last?: boolean
}) {
  return (
    <View style={last ? s.dataRowLast : s.dataRow}>
      <Text style={s.dataLabel}>{label}</Text>
      <Text style={s.dataValue}>{value}</Text>
    </View>
  )
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <View style={s.bullet}>
      <Text style={s.bulletDot}>-</Text>
      <Text style={s.bulletText}>{children}</Text>
    </View>
  )
}

function CheckLine({
  label,
  checked,
}: {
  label: string
  checked: boolean
}) {
  return (
    <View style={s.checkboxLine}>
      <View style={s.checkbox}>
        <Text>{checked ? 'X' : ''}</Text>
      </View>
      <Text style={s.checkboxLabel}>{label}</Text>
    </View>
  )
}

function MoneyRow({
  label,
  value,
  last = false,
}: {
  label: string
  value: string
  last?: boolean
}) {
  return (
    <View style={[s.moneyRow, last ? { borderBottomWidth: 0 } : null]}>
      <Text style={s.moneyLabel}>{label}</Text>
      <Text style={s.moneyValue}>{value}</Text>
    </View>
  )
}

export function FurnishedLeaseContractPDF({ data }: { data: FurnishedLeaseContractPdfData }) {
  const rentComplementLabel = data.rentComplement != null
    ? `${formatCurrencyFr(data.rentComplement)}${data.rentComplementReason ? ` - ${data.rentComplementReason}` : ''}`
    : 'Aucun'
  const previousTenantSummary = data.previousTenantRent != null
    ? `${formatCurrencyFr(data.previousTenantRent)} ; dernier versement ${formatDateFr(data.previousTenantLastPaidOn)} ; derniere revision ${formatDateFr(data.previousTenantLastRevisionOn)}`
    : 'Non renseigne'
  const annualInsurance = data.colocInsuranceAnnualAmount != null
    ? `${formatCurrencyFr(data.colocInsuranceAnnualAmount)} / an`
    : 'Non renseigne'
  const tenantSignatureTitle = data.secondTenantName ? 'Signatures des locataires' : 'Signature du locataire'
  const tenantSignatureMeta = data.secondTenantName
    ? `${data.tenantName} / ${data.secondTenantName}`
    : data.tenantName

  return (
    <Document>
      <PageFrame number={1} title="I. Designation des parties - II. Objet du contrat">
        <Section title="I. Designation des parties">
          <View style={s.row}>
            <View style={s.col}>
              <Field
                label="Bailleur"
                value={`${data.landlordName}\n${data.landlordAddress}\n${data.landlordCity}`}
              />
            </View>
            <View style={s.col}>
              <Field
                label="Qualite du bailleur"
                value={`${data.landlordTypeLabel}${data.landlordFamilySci ? ' - SCI familiale' : ''}`}
              />
            </View>
          </View>

          <View style={s.row}>
            <View style={s.col}>
              <Field
                label="Coordonnees bailleur"
                value={[
                  data.landlordEmail ? `Email : ${data.landlordEmail}` : null,
                  data.landlordPhone ? `Telephone : ${data.landlordPhone}` : null,
                ].filter(Boolean).join('\n') || 'Non renseigne'}
              />
            </View>
            <View style={s.col}>
              <Field
                label="Mandataire"
                value={data.representedByMandataire
                  ? [
                    data.mandataireName,
                    data.mandataireAddress,
                    data.mandataireActivity,
                    data.professionalCard ? `Carte professionnelle : ${data.professionalCard}` : null,
                  ].filter(Boolean).join('\n')
                  : 'Aucun mandataire'}
              />
            </View>
          </View>

          <View style={s.row}>
            <View style={s.col}>
              <Field
                label="Locataire principal"
                value={`${data.tenantName}${data.tenantEmail ? `\nEmail : ${data.tenantEmail}` : ''}`}
              />
            </View>
            <View style={s.col}>
              <Field
                label="Second locataire / garant"
                value={[
                  data.secondTenantName ? `Colocataire : ${data.secondTenantName}` : null,
                  data.secondTenantEmail ? `Email : ${data.secondTenantEmail}` : null,
                  data.guarantorName ? `Garant : ${data.guarantorName}` : null,
                  data.guarantorAddress ? data.guarantorAddress : null,
                ].filter(Boolean).join('\n') || 'Aucun renseignement complementaire'}
              />
            </View>
          </View>

          <Text style={[s.paragraph, s.muted, { marginTop: 4 }]}>
            Le present contrat est conclu entre les parties ci-dessus designees, pour un logement meuble constituant la residence principale du locataire.
          </Text>
        </Section>

        <Section title="II. Objet du contrat - A. Consistance du logement">
          <DataRow label="Localisation du logement" value={joinLocation(data.propertyAddress, data.propertyZip, data.propertyCity, data.unitDetails)} />
          <DataRow label="Identifiant fiscal" value={textOrFallback(data.taxId)} />
          <DataRow label="Type d habitat" value={textOrFallback(data.habitatTypeLabel)} />
          <DataRow label="Regime juridique de l immeuble" value={textOrFallback(data.buildingRegimeLabel)} />
          <DataRow label="Periode de construction" value={textOrFallback(data.constructionPeriodLabel)} />
          <DataRow label="Surface habitable" value={data.surfaceHabitable != null ? `${formatNumber(data.surfaceHabitable, ' m2')}` : 'Non renseigne'} />
          <DataRow label="Nombre de pieces principales" value={formatNumber(data.mainRoomCount)} />
          <DataRow label="Autres parties du logement" value={textOrFallback(data.otherPartsLabel, 'Aucune')} last />
        </Section>

        <Section title="II. Objet du contrat - Equipements et usage">
          <DataRow label="Equipements du logement" value={textOrFallback(data.housingEquipment)} />
          <DataRow label="Installations sanitaires" value={textOrFallback(data.sanitaryInstallations)} />
          <DataRow label="Production de chauffage" value={[textOrFallback(data.heatingModeLabel), data.heatingDetails].filter((value) => Boolean(value && value !== 'Non renseigne')).join(' - ') || 'Non renseigne'} />
          <DataRow label="Production eau chaude sanitaire" value={[textOrFallback(data.hotWaterModeLabel), data.hotWaterDetails].filter((value) => Boolean(value && value !== 'Non renseigne')).join(' - ') || 'Non renseigne'} />
          <DataRow label="Destination des locaux" value={data.destinationLabel} />
          <DataRow label="Locaux accessoires privatifs" value={textOrFallback(data.privateAccessors, 'Aucun')} />
          <DataRow label="Parties, locaux ou services communs" value={textOrFallback(data.commonAccessors, 'Aucun')} />
          <DataRow label="Acces information / communication" value={textOrFallback(data.ictAccess, 'Non renseigne')} last />

          <View style={s.infoNote}>
            <Text style={s.infoTitle}>Rappel performance energetique minimale</Text>
            <Text style={s.infoText}>
              France metropolitaine : classe F minimale a compter du 1er janvier 2025, classe E a compter du 1er janvier 2028,
              classe D a compter du 1er janvier 2034. Logement renseigne : classe {textOrFallback(data.dpeClass)}.
            </Text>
          </View>
        </Section>
      </PageFrame>

      <PageFrame number={2} title="III. Date de prise d effet et duree du contrat">
        <Section title="III. Date de prise d effet et duree du contrat">
          <DataRow label="Date de prise d effet" value={formatDateFr(data.leaseStartDate)} />
          <DataRow
            label="Duree du contrat"
            value={data.studentLease
              ? `${formatNumber(data.durationMonths)} mois - location consentie a un etudiant`
              : `${formatNumber(data.durationMonths)} mois - reconduction tacite annuelle`}
          />
          <DataRow label="Depot de garantie prevu" value={formatCurrencyFr(data.depositAmount)} last />

          <View style={s.infoNote}>
            <Text style={s.infoTitle}>Rappel legal sur la duree</Text>
            <Bullet>Le bail meuble est conclu pour une duree minimale d un an.</Bullet>
            <Bullet>Lorsqu il est consenti a un etudiant, il peut etre limite a neuf mois sans reconduction tacite.</Bullet>
            <Bullet>Le locataire peut donner conge a tout moment dans les conditions prevues par la loi du 6 juillet 1989.</Bullet>
          </View>
        </Section>

        <Section title="II. Objet du contrat - Mentions complementaires">
          <DataRow label="Niveau de performance du logement" value={textOrFallback(data.dpeClass)} />
          <DataRow label="Depenses energetiques annuelles (information)" value={textOrFallback(data.energyExpenseEstimate)} />
          <DataRow label="Reference IRL prevue au bail" value={textOrFallback(data.irlReferenceQuarter)} last />
        </Section>

        <Section title="Rappel annexe et mobilier">
          <Text style={s.paragraph}>
            Le logement est loue meuble. L etat des lieux d entree, l inventaire et l etat detaille du mobilier
            doivent etre annexes au present contrat lors de la remise des cles.
          </Text>
          <Text style={[s.paragraph, s.muted]}>
            Le present PDF regroupe les mentions essentielles du contrat type. Les diagnostics,
            notices et annexes obligatoires restent a joindre lors de la signature.
          </Text>
        </Section>
      </PageFrame>

      <PageFrame number={3} title="IV. Conditions financieres">
        <Section title="IV. Conditions financieres - A. Loyer initial">
          <View style={s.moneyGrid}>
            <MoneyRow label="Montant du loyer mensuel" value={formatCurrencyFr(data.rentAmount)} />
            <MoneyRow label="Loyer de base" value={formatCurrencyFr(data.baseRent)} />
            <MoneyRow label="Complement de loyer" value={rentComplementLabel} />
            <MoneyRow label="Charges recuperables" value={formatCurrencyFr(data.chargesAmount)} />
            <MoneyRow label="Depot de garantie" value={formatCurrencyFr(data.depositAmount)} last />
          </View>

          <View style={s.blockSpaced}>
            <DataRow label="Decret relocation en zone tendue" value={yesNo(data.rentRelocationCap)} />
            <DataRow label="Loyer de reference majore applicable" value={yesNo(data.referenceRentApplies)} />
            <DataRow label="Loyer de reference" value={data.referenceRent != null ? `${formatNumber(data.referenceRent, ' EUR/m2')}` : 'Non renseigne'} />
            <DataRow label="Loyer de reference majore" value={data.referenceRentMajored != null ? `${formatNumber(data.referenceRentMajored, ' EUR/m2')}` : 'Non renseigne'} />
            <DataRow label="Informations sur le precedent locataire" value={previousTenantSummary} last />
          </View>
        </Section>

        <Section title="IV. Conditions financieres - B a F">
          <DataRow label="Modalite de recuperation des charges" value={textOrFallback(data.chargeRecoveryModeLabel)} />
          <DataRow label="Revision eventuelle du forfait de charges" value={textOrFallback(data.chargeRevisionNote, 'Non applicable')} />
          <DataRow label="Assurance colocataires souscrite par le bailleur" value={yesNo(data.colocInsuranceEnabled)} />
          <DataRow label="Montant annuel recuperable assurance" value={data.colocInsuranceEnabled ? annualInsurance : 'Non applicable'} />
          <DataRow label="Periodicite du paiement" value={textOrFallback(data.paymentFrequency)} />
          <DataRow label="Paiement" value={textOrFallback(data.paymentTimingLabel)} />
          <DataRow label="Date ou periode de paiement" value={textOrFallback(data.paymentPeriodText)} />
          <DataRow label="Lieu de paiement" value={textOrFallback(data.paymentPlace, 'Non precise')} />
          <DataRow label="Montant total du a la premiere echeance" value={formatCurrencyFr(data.firstPaymentTotal)} />
          <DataRow label="Reevaluation d un loyer manifestement sous evalue" value={data.reevaluatedRentAmount != null ? `${formatCurrencyFr(data.reevaluatedRentAmount)} ; modalite : ${textOrFallback(data.reevaluatedRentMode, 'Non renseignee')}` : 'Non applicable'} />
          <DataRow label="Depenses energetiques annuelles (information)" value={textOrFallback(data.energyExpenseEstimate)} last />
        </Section>
      </PageFrame>

      <PageFrame number={4} title="V. Travaux - IX. Honoraires de location">
        <Section title="V. Travaux">
          <DataRow label="Travaux deja realises" value={textOrFallback(data.worksCompleted, 'Aucun travail renseigne')} />
          <DataRow label="Majoration du loyer liee a des travaux" value={textOrFallback(data.worksRentIncrease, 'Aucune majoration')} />
          <DataRow label="Diminution de loyer au titre de travaux du locataire" value={textOrFallback(data.tenantWorksRentDecrease, 'Aucune diminution')} last />
        </Section>

        <Section title="VI. Garanties">
          <DataRow label="Montant du depot de garantie" value={formatCurrencyFr(data.depositAmount)} />
          <DataRow label="Garant mentionne au contrat" value={data.guarantorName ? `${data.guarantorName}${data.guarantorAddress ? ` - ${data.guarantorAddress}` : ''}` : 'Aucun garant renseigne'} last />
        </Section>

        <Section title="VII. Clause de solidarite - VIII. Clause resolutoire">
          <DataRow label="Clause de solidarite" value={data.solidarityClauseEnabled ? 'Clause activee en cas de pluralite de locataires.' : 'Aucune clause de solidarite specifique.'} />
          <DataRow
            label="Clause resolutoire"
            value={data.resolutoryClauseEnabled
              ? 'Le contrat prevoit une resiliation de plein droit en cas de manquement vise par la loi (loyer, charges, depot, assurance, troubles).'
              : 'Aucune clause resolutoire specifique renseignee.'}
            last
          />
        </Section>

        <Section title="IX. Honoraires de location">
          {!data.agencyFeesEnabled ? (
            <Text style={s.paragraph}>Aucun honoraire de location n est renseigne. Le contrat est presume conclu sans intermediaire facture.</Text>
          ) : (
            <View>
              <DataRow label="Honoraires bailleur - visite / dossier / bail" value={textOrFallback(data.agencyFeeVisitFileLeaseLandlord, 'Non renseigne')} />
              <DataRow label="Honoraires bailleur - etat des lieux" value={textOrFallback(data.agencyFeeInventoryLandlord, 'Non renseigne')} />
              <DataRow label="Honoraires bailleur - autres" value={textOrFallback(data.agencyFeeOtherLandlord, 'Aucun')} />
              <DataRow label="Honoraires locataire - visite / dossier / bail" value={textOrFallback(data.agencyFeeVisitFileLeaseTenant, 'Non renseigne')} />
              <DataRow label="Honoraires locataire - etat des lieux" value={textOrFallback(data.agencyFeeInventoryTenant, 'Non renseigne')} />
              <DataRow label="Honoraires locataire - autres" value={textOrFallback(data.agencyFeeOtherTenant, 'Aucun')} last />
            </View>
          )}

          <View style={s.infoNote}>
            <Text style={s.infoTitle}>Rappel legal</Text>
            <Text style={s.infoText}>
              Les honoraires imputes au locataire pour la visite, la constitution du dossier, la redaction du bail et l etat des lieux
              restent plafonnes par la loi et ne peuvent depasser ceux factures au bailleur.
            </Text>
          </View>
        </Section>
      </PageFrame>

      <PageFrame number={5} title="X. Autres conditions particulieres - XI. Annexes">
        <Section title="X. Autres conditions particulieres">
          <Text style={s.paragraph}>{textOrFallback(data.specialConditions, 'Aucune condition particuliere supplementaire n est renseignee.')}</Text>
        </Section>

        <Section title="XI. Annexes jointes au contrat">
          <View style={s.checkboxGrid}>
            {data.annexes.map((annex) => (
              <CheckLine key={annex.label} label={annex.label} checked={annex.checked} />
            ))}
          </View>
          <View style={s.infoNote}>
            <Text style={s.infoTitle}>Autres annexes ou precisions</Text>
            <Text style={s.infoText}>{textOrFallback(data.annexAdditional, 'Aucune annexe additionnelle.')}</Text>
          </View>
        </Section>

        <Section title="Signatures">
          <Text style={s.paragraph}>
            Fait a {data.signingCity}, le {formatDateFr(data.signingDate)}.
          </Text>

          <View style={s.signatureWrap}>
            <View style={s.signatureBox}>
              <Text style={s.signatureTitle}>Signature du bailleur</Text>
              <Text style={s.signatureMeta}>
                {data.landlordName}
                {data.representedByMandataire && data.mandataireName ? ` - represente par ${data.mandataireName}` : ''}
              </Text>
              {data.landlordSignature && data.landlordSignature.startsWith('data:image') ? (
                <Image src={{ uri: data.landlordSignature }} style={s.signatureImage} />
              ) : (
                <View style={s.signatureLine} />
              )}
            </View>

            <View style={s.signatureBox}>
              <Text style={s.signatureTitle}>{tenantSignatureTitle}</Text>
              <Text style={s.signatureMeta}>{tenantSignatureMeta}</Text>
              <View style={s.signatureLine} />
            </View>
          </View>
        </Section>
      </PageFrame>
    </Document>
  )
}
