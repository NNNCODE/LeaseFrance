export function ownerDisplayName(owner: Pick<UserProfile, 'name'> | Pick<OwnerProfile, 'name'> | null, fallback: string) {
  return owner?.name?.trim() || fallback
}

export function ownerTypeLabel(owner: Pick<OwnerProfile, 'legalType'> | Pick<UserProfile, 'legalType'> | null, t: (key: string) => string) {
  return owner?.legalType === 'personne_morale'
    ? t('profile.ownerTypeCompany')
    : t('profile.ownerTypePerson')
}
