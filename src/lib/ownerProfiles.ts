export function formatOwnerDisplayName(
  profile: Pick<UserProfile, 'name'> | null | undefined,
  fallback: string,
): string {
  const normalized = profile?.name?.trim()
  return normalized || fallback
}

export function resolveOwnerProfileById(
  owners: OwnerProfile[],
  ownerProfileId: string | null | undefined,
): OwnerProfile | null {
  const normalized = ownerProfileId?.trim()
  if (!normalized) return null
  return owners.find((owner) => owner.id === normalized) ?? null
}

export function resolveOwnerProfileForLease(
  owners: OwnerProfile[],
  lease: Pick<Lease, 'owner_profile_id' | 'property_owner_profile_id'>,
  fallback: UserProfile | OwnerProfile | null,
): UserProfile | OwnerProfile | null {
  return resolveOwnerProfileById(owners, lease.owner_profile_id)
    ?? resolveOwnerProfileById(owners, lease.property_owner_profile_id)
    ?? fallback
}
