import { AlertTriangle, Info } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  BUILDING_REGIME_OPTIONS,
  CHARGE_MODE_OPTIONS,
  CONSTRUCTION_PERIOD_OPTIONS,
  DESTINATION_OPTIONS,
  HABITAT_TYPE_OPTIONS,
  HEATING_MODE_OPTIONS,
  HOT_WATER_MODE_OPTIONS,
  PAYMENT_TIMING_OPTIONS,
} from '@/lib/leaseContractDocument'
import { OTHER_PART_OPTIONS } from '@/shared/leaseContract'

export default function FurnishedLeaseContractEditor({
  lease,
  details,
  blockingIssues,
  advisories,
  onChange,
}: {
  lease: Lease
  details: LeaseContractDetails
  blockingIssues: string[]
  advisories: string[]
  onChange: (next: LeaseContractDetails) => void
}) {
  function setField<K extends keyof LeaseContractDetails>(field: K, value: LeaseContractDetails[K]) {
    onChange({ ...details, [field]: value })
  }

  function setNullableText<K extends keyof LeaseContractDetails>(field: K, value: string) {
    onChange({ ...details, [field]: (value.trim() === '' ? null : value) as LeaseContractDetails[K] })
  }

  function setNullableNumber<K extends keyof LeaseContractDetails>(field: K, value: string) {
    onChange({ ...details, [field]: (value.trim() === '' ? null : Number(value)) as LeaseContractDetails[K] })
  }

  function toggleOtherPart(key: string) {
    const next = details.otherParts.includes(key)
      ? details.otherParts.filter((entry) => entry !== key)
      : [...details.otherParts, key]
    onChange({ ...details, otherParts: next })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-surfaceHigh rounded-lg p-3 text-xs text-textMuted">
        Bailleur repris depuis le profil. Bien et locataire repris depuis le bail selectionne.
        Les champs ci-dessous couvrent les mentions complementaires du contrat meublé officiel.
      </div>

      {blockingIssues.length > 0 && (
        <div className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-danger mt-0.5 shrink-0" />
            <div className="text-xs text-textPrimary">
              <p className="font-semibold">Points a corriger avant generation</p>
              <ul className="mt-1 space-y-1 text-textMuted">
                {blockingIssues.map((issue) => <li key={issue}>- {issue}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {advisories.length > 0 && (
        <div className="rounded-xl border border-warning/20 bg-warning/10 px-4 py-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <div className="text-xs text-textPrimary">
              <p className="font-semibold">Mentions conseillees</p>
              <ul className="mt-1 space-y-1 text-textMuted">
                {advisories.map((issue) => <li key={issue}>- {issue}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <SectionCard title="Parties">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SelectField
              label="Qualite du bailleur"
              value={details.landlordType}
              onChange={(value) => setField('landlordType', value as LeaseContractDetails['landlordType'])}
              options={[
                { value: 'personne_physique', label: 'Personne physique' },
                { value: 'personne_morale', label: 'Personne morale' },
              ]}
            />
            <TextField
              label="Email bailleur (optionnel)"
              value={details.landlordEmailOverride ?? ''}
              onChange={(value) => setNullableText('landlordEmailOverride', value)}
              placeholder="Laisser vide pour reprendre le profil"
            />
            <CheckboxField
              label="SCI familiale"
              checked={details.landlordFamilySci}
              onChange={(checked) => setField('landlordFamilySci', checked)}
            />
            <CheckboxField
              label="Bail signe via mandataire"
              checked={details.representedByMandataire}
              onChange={(checked) => setField('representedByMandataire', checked)}
            />
          </div>

          {details.representedByMandataire && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <TextField label="Nom du mandataire" value={details.mandataireName ?? ''} onChange={(value) => setNullableText('mandataireName', value)} />
              <TextField label="Adresse du mandataire" value={details.mandataireAddress ?? ''} onChange={(value) => setNullableText('mandataireAddress', value)} />
              <TextField label="Activite du mandataire" value={details.mandataireActivity ?? ''} onChange={(value) => setNullableText('mandataireActivity', value)} />
              <TextField label="Numero de carte professionnelle" value={details.professionalCardNumber ?? ''} onChange={(value) => setNullableText('professionalCardNumber', value)} />
              <TextField label="Lieu de delivrance carte" value={details.professionalCardLocation ?? ''} onChange={(value) => setNullableText('professionalCardLocation', value)} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <TextField label="Second locataire (nom complet)" value={details.secondTenantName ?? ''} onChange={(value) => setNullableText('secondTenantName', value)} />
            <TextField label="Email second locataire" value={details.secondTenantEmail ?? ''} onChange={(value) => setNullableText('secondTenantEmail', value)} />
            <TextField label="Garant (nom)" value={details.guarantorNameOverride ?? ''} onChange={(value) => setNullableText('guarantorNameOverride', value)} placeholder={lease.tenant_guarantor_name ?? 'Nom du garant'} />
            <TextField label="Garant (adresse)" value={details.guarantorAddressOverride ?? ''} onChange={(value) => setNullableText('guarantorAddressOverride', value)} placeholder={lease.tenant_guarantor_address ?? 'Adresse du garant'} />
          </div>
        </SectionCard>

        <SectionCard title="Description du logement">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <TextField label="Batiment / escalier / etage / porte" value={details.unitDetails ?? ''} onChange={(value) => setNullableText('unitDetails', value)} />
            <TextField label="Identifiant fiscal" value={details.taxId ?? ''} onChange={(value) => setNullableText('taxId', value)} />
            <NumberField label="Surface habitable (m2)" value={details.surfaceHabitableOverride} onChange={(value) => setNullableNumber('surfaceHabitableOverride', value)} placeholder={lease.property_area_m2 != null ? `Fiche bien: ${lease.property_area_m2}` : 'Ex: 28'} />
            <SelectField label="Type d habitat" value={details.habitatType} onChange={(value) => setField('habitatType', value as LeaseContractDetails['habitatType'])} options={HABITAT_TYPE_OPTIONS} />
            <SelectField label="Regime juridique" value={details.buildingRegime} onChange={(value) => setField('buildingRegime', value as LeaseContractDetails['buildingRegime'])} options={BUILDING_REGIME_OPTIONS} />
            <SelectField label="Periode de construction" value={details.constructionPeriod} onChange={(value) => setField('constructionPeriod', value as LeaseContractDetails['constructionPeriod'])} options={CONSTRUCTION_PERIOD_OPTIONS} />
            <NumberField label="Nombre de pieces principales" value={details.mainRoomCount} onChange={(value) => setNullableNumber('mainRoomCount', value)} />
            <SelectField label="Destination" value={details.destination} onChange={(value) => setField('destination', value as LeaseContractDetails['destination'])} options={DESTINATION_OPTIONS} />
            <TextField label="DPE (classe)" value={details.dpeClass ?? ''} onChange={(value) => setNullableText('dpeClass', value)} placeholder="Ex: E" />
          </div>

          <div className="mt-3">
            <p className="text-xs font-medium text-textMuted mb-2">Autres parties du logement</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {OTHER_PART_OPTIONS.map((part) => (
                <CheckboxField
                  key={part}
                  label={part}
                  checked={details.otherParts.includes(part)}
                  onChange={() => toggleOtherPart(part)}
                />
              ))}
            </div>
            <div className="mt-2">
              <TextField label="Autre partie" value={details.otherPartsOther ?? ''} onChange={(value) => setNullableText('otherPartsOther', value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <TextAreaField label="Equipements du logement" value={details.housingEquipment ?? ''} onChange={(value) => setNullableText('housingEquipment', value)} placeholder="Cuisine equipee, lit, table, lave-linge..." />
            <TextAreaField label="Installations sanitaires" value={details.sanitaryInstallations ?? ''} onChange={(value) => setNullableText('sanitaryInstallations', value)} placeholder="Douche, WC, lavabo..." />
            <SelectField label="Chauffage" value={details.heatingMode} onChange={(value) => setField('heatingMode', value as LeaseContractDetails['heatingMode'])} options={HEATING_MODE_OPTIONS} />
            <TextField label="Details chauffage" value={details.heatingDetails ?? ''} onChange={(value) => setNullableText('heatingDetails', value)} placeholder="Ex: electrique individuel" />
            <SelectField label="Eau chaude" value={details.hotWaterMode} onChange={(value) => setField('hotWaterMode', value as LeaseContractDetails['hotWaterMode'])} options={HOT_WATER_MODE_OPTIONS} />
            <TextField label="Details eau chaude" value={details.hotWaterDetails ?? ''} onChange={(value) => setNullableText('hotWaterDetails', value)} placeholder="Ex: ballon individuel" />
            <TextAreaField label="Locaux accessoires privatifs" value={details.privateAccessors ?? ''} onChange={(value) => setNullableText('privateAccessors', value)} placeholder="Cave, parking, garage..." />
            <TextAreaField label="Parties / services communs" value={details.commonAccessors ?? ''} onChange={(value) => setNullableText('commonAccessors', value)} placeholder="Ascenseur, local velo, gardien..." />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <TextAreaField label="Acces TV / Internet" value={details.ictAccess ?? ''} onChange={(value) => setNullableText('ictAccess', value)} />
            <TextAreaField label="Estimation depenses energetiques" value={details.energyExpenseEstimate ?? ''} onChange={(value) => setNullableText('energyExpenseEstimate', value)} placeholder="Ex: entre 620 € et 890 € par an, prix de reference 2023" />
          </div>
        </SectionCard>

        <SectionCard title="Duree et conditions financieres">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <CheckboxField label="Location etudiante (9 mois)" checked={details.studentLease} onChange={(checked) => setField('studentLease', checked)} />
            <NumberField label="Duree du bail (mois)" value={details.durationMonths} onChange={(value) => setNullableNumber('durationMonths', value)} placeholder={details.studentLease ? '9' : '12'} />
            <TextField label="Periodicite du paiement" value={details.paymentFrequency ?? ''} onChange={(value) => setNullableText('paymentFrequency', value)} placeholder="Mensuelle" />
            <SelectField label="Paiement" value={details.paymentTiming} onChange={(value) => setField('paymentTiming', value as LeaseContractDetails['paymentTiming'])} options={PAYMENT_TIMING_OPTIONS} />
            <TextField label="Date / periode de paiement" value={details.paymentPeriodText ?? ''} onChange={(value) => setNullableText('paymentPeriodText', value)} placeholder="Avant le 5 de chaque mois" />
            <TextField label="Lieu de paiement" value={details.paymentPlace ?? ''} onChange={(value) => setNullableText('paymentPlace', value)} placeholder="Virement bancaire" />
            <SelectField label="Mode de charges" value={details.chargeRecoveryMode} onChange={(value) => setField('chargeRecoveryMode', value as LeaseContractDetails['chargeRecoveryMode'])} options={CHARGE_MODE_OPTIONS} />
            <TextField label="Revision du forfait de charges" value={details.chargeRevisionNote ?? ''} onChange={(value) => setNullableText('chargeRevisionNote', value)} placeholder="Laisser vide si non applicable" />
            <NumberField label="Montant total 1ere echeance" value={details.firstPaymentTotal} onChange={(value) => setNullableNumber('firstPaymentTotal', value)} placeholder="Ex: 700" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <CheckboxField label="Logement soumis au decret relocation" checked={details.rentRelocationCap} onChange={(checked) => setField('rentRelocationCap', checked)} />
            <CheckboxField label="Loyer de reference majore applicable" checked={details.referenceRentApplies} onChange={(checked) => setField('referenceRentApplies', checked)} />
            <CheckboxField label="Assurance colocataires par bailleur" checked={details.colocInsuranceEnabled} onChange={(checked) => setField('colocInsuranceEnabled', checked)} />
            <NumberField label="Loyer de reference (€/m2)" value={details.referenceRent} onChange={(value) => setNullableNumber('referenceRent', value)} />
            <NumberField label="Loyer de reference majore (€/m2)" value={details.referenceRentMajored} onChange={(value) => setNullableNumber('referenceRentMajored', value)} />
            <NumberField label="Loyer de base (€)" value={details.baseRent} onChange={(value) => setNullableNumber('baseRent', value)} placeholder={`Bail: ${lease.rent_amount}`} />
            <NumberField label="Complement de loyer (€)" value={details.rentComplement} onChange={(value) => setNullableNumber('rentComplement', value)} />
            <NumberField label="Dernier loyer precedent locataire (€)" value={details.previousTenantRent} onChange={(value) => setNullableNumber('previousTenantRent', value)} />
            <NumberField label="Assurance colocataires / an (€)" value={details.colocInsuranceAnnualAmount} onChange={(value) => setNullableNumber('colocInsuranceAnnualAmount', value)} />
            <TextField label="Justification complement de loyer" value={details.rentComplementReason ?? ''} onChange={(value) => setNullableText('rentComplementReason', value)} />
            <TextField label="Date dernier versement precedent locataire" type="date" value={details.previousTenantLastPaidOn ?? ''} onChange={(value) => setNullableText('previousTenantLastPaidOn', value)} />
            <TextField label="Date derniere revision precedente" type="date" value={details.previousTenantLastRevisionOn ?? ''} onChange={(value) => setNullableText('previousTenantLastRevisionOn', value)} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <TextAreaField label="Travaux deja realises" value={details.worksCompleted ?? ''} onChange={(value) => setNullableText('worksCompleted', value)} />
            <TextAreaField label="Majoration liee a des travaux" value={details.worksRentIncrease ?? ''} onChange={(value) => setNullableText('worksRentIncrease', value)} />
            <TextAreaField label="Diminution de loyer pour travaux du locataire" value={details.tenantWorksRentDecrease ?? ''} onChange={(value) => setNullableText('tenantWorksRentDecrease', value)} />
            <div className="grid grid-cols-1 gap-2">
              <CheckboxField label="Clause de solidarite" checked={details.solidarityClauseEnabled} onChange={(checked) => setField('solidarityClauseEnabled', checked)} />
              <CheckboxField label="Clause resolutoire" checked={details.resolutoryClauseEnabled} onChange={(checked) => setField('resolutoryClauseEnabled', checked)} />
              <CheckboxField label="Honoraires d agence applicables" checked={details.agencyFeesEnabled} onChange={(checked) => setField('agencyFeesEnabled', checked)} />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Honoraires, clauses et annexes">
          {details.agencyFeesEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextAreaField label="Honoraires bailleur" value={[details.agencyFeeVisitFileLeaseLandlord, details.agencyFeeInventoryLandlord, details.agencyFeeOtherLandlord].filter(Boolean).join('\n')} onChange={() => {}} disabled />
              <TextAreaField label="Honoraires locataire" value={[details.agencyFeeVisitFileLeaseTenant, details.agencyFeeInventoryTenant, details.agencyFeeOtherTenant].filter(Boolean).join('\n')} onChange={() => {}} disabled />
            </div>
          )}

          {details.agencyFeesEnabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              <TextAreaField label="Visite / dossier / bail - bailleur" value={details.agencyFeeVisitFileLeaseLandlord ?? ''} onChange={(value) => setNullableText('agencyFeeVisitFileLeaseLandlord', value)} />
              <TextAreaField label="Visite / dossier / bail - locataire" value={details.agencyFeeVisitFileLeaseTenant ?? ''} onChange={(value) => setNullableText('agencyFeeVisitFileLeaseTenant', value)} />
              <TextAreaField label="Etat des lieux - bailleur" value={details.agencyFeeInventoryLandlord ?? ''} onChange={(value) => setNullableText('agencyFeeInventoryLandlord', value)} />
              <TextAreaField label="Etat des lieux - locataire" value={details.agencyFeeInventoryTenant ?? ''} onChange={(value) => setNullableText('agencyFeeInventoryTenant', value)} />
              <TextAreaField label="Autres honoraires bailleur" value={details.agencyFeeOtherLandlord ?? ''} onChange={(value) => setNullableText('agencyFeeOtherLandlord', value)} />
              <TextAreaField label="Autres honoraires locataire" value={details.agencyFeeOtherTenant ?? ''} onChange={(value) => setNullableText('agencyFeeOtherTenant', value)} />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <TextAreaField label="Conditions particulieres" value={details.specialConditions ?? ''} onChange={(value) => setNullableText('specialConditions', value)} />
            <TextAreaField label="Annexes additionnelles" value={details.annexAdditional ?? ''} onChange={(value) => setNullableText('annexAdditional', value)} />
          </div>

          <div className="mt-3">
            <p className="text-xs font-medium text-textMuted mb-2">Annexes</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <CheckboxField label="Extrait reglement de copropriete" checked={details.annexCoproExcerpt} onChange={(checked) => setField('annexCoproExcerpt', checked)} />
              <CheckboxField label="Dossier de diagnostics" checked={details.annexDiagnostics} onChange={(checked) => setField('annexDiagnostics', checked)} />
              <CheckboxField label="Notice d information" checked={details.annexInformationNotice} onChange={(checked) => setField('annexInformationNotice', checked)} />
              <CheckboxField label="Etat des lieux / inventaire mobilier" checked={details.annexInventory} onChange={(checked) => setField('annexInventory', checked)} />
              <CheckboxField label="Autorisation prealable de mise en location" checked={details.annexPriorAuthorization} onChange={(checked) => setField('annexPriorAuthorization', checked)} />
              <CheckboxField label="References de loyers comparables" checked={details.annexReferenceRents} onChange={(checked) => setField('annexReferenceRents', checked)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <TextField label="Lieu de signature" value={details.signingCity ?? ''} onChange={(value) => setNullableText('signingCity', value)} />
            <TextField label="Date de signature" type="date" value={details.signingDate ?? ''} onChange={(value) => setNullableText('signingDate', value)} />
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surfaceHigh/40 p-4">
      <p className="text-sm font-semibold text-textPrimary">{title}</p>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function FieldWrapper({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-textMuted">{label}</label>
      {children}
    </div>
  )
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <FieldWrapper label={label}>
      <Input value={value} type={type} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </FieldWrapper>
  )
}

function NumberField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: number | null
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <FieldWrapper label={label}>
      <Input value={value ?? ''} type="number" step="0.01" onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </FieldWrapper>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: ReadonlyArray<{ value: string; label: string }>
}) {
  return (
    <FieldWrapper label={label}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-lg border border-border bg-surface px-3 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Selectionner</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </FieldWrapper>
  )
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <FieldWrapper label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={4}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-textPrimary focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
      />
    </FieldWrapper>
  )
}

function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-textPrimary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="rounded border-border"
      />
      <span>{label}</span>
    </label>
  )
}
