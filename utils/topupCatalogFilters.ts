/** 1 GiB in bytes — top-up UX hides allowances of 1 GB or less. */
export const TOPUP_HIDE_LTE_VOLUME_BYTES = 1024 ** 3;

/** Evair recharge catalogue filter: strictly more than 1 GiB. */
export function topUpKeepsStrictlyGreaterThanOneGib(volumeBytes: number | undefined): boolean {
  const v = typeof volumeBytes === 'number' && Number.isFinite(volumeBytes) ? volumeBytes : 0;
  return v > TOPUP_HIDE_LTE_VOLUME_BYTES;
}
