import { formatCents } from './accountMapper';

export function mapSandboxBeneficiary(value = {}) {
  return { beneficiaryId: value.beneficiaryId, name: value.name, bank: value.bankName, agency: value.branch, account: value.accountMasked, document: value.documentMasked, accountType: value.accountType };
}

export function mapSandboxPixLookup(value) {
  return { ...value, keyType: value.keyType, beneficiary: mapSandboxBeneficiary(value.beneficiary) };
}

export function mapSandboxQrLookup(value) {
  if (value.amountMinor !== undefined && !Number.isInteger(value.amountMinor)) throw new TypeError('PIX money must use integer minor units');
  return { ...value, key: value.key, keyType: value.keyType, amount: value.amountMinor === undefined ? '' : formatCents(value.amountMinor), amountMinor: value.amountMinor, message: value.description || '', beneficiary: mapSandboxBeneficiary(value.beneficiary) };
}

export const mapSandboxPixKeys = (items = []) => items.map((item) => ({ ...item, value: item.keyMasked, type: ({ EMAIL: 'E-mail', PHONE: 'Celular', RANDOM: 'Chave aleatória' }[item.type] || item.type), status: item.status === 'ACTIVE' ? 'Ativo' : item.status }));

export function mapSandboxReceiveQr(value, keyValue = '') {
  if (!Number.isInteger(value?.amountMinor)) throw new TypeError('PIX receive money must use integer minor units');
  return { ...value, keyValue, amount: formatCents(value.amountMinor), payload: value.copyPaste };
}

const assertMinor = (value, field) => { if (!Number.isInteger(value)) throw new TypeError(`${field} must use integer minor units`); };
export function mapSandboxPixValidation(value = {}) {
  for (const field of ['amountMinor', 'feeMinor', 'totalDebitMinor']) assertMinor(value[field], field);
  return { ...value, beneficiary: mapSandboxBeneficiary(value.beneficiary), amount: formatCents(value.amountMinor), fee: formatCents(value.feeMinor), totalDebit: formatCents(value.totalDebitMinor), scheduled: Boolean(value.scheduledFor) };
}
export function mapSandboxPixTransfer(value = {}) {
  assertMinor(value.amountMinor, 'amountMinor');
  return { ...value, beneficiary: mapSandboxBeneficiary(value.beneficiary), amount: formatCents(value.amountMinor), simulated: value.simulated === true, sandboxMode: value.environment === 'SANDBOX', scheduled: value.status === 'SCHEDULED' };
}
export function mapSandboxPixReceipt(value = {}) {
  assertMinor(value.amountMinor, 'amountMinor');
  return { ...value, beneficiary: mapSandboxBeneficiary(value.beneficiary), amount: formatCents(value.amountMinor), simulated: value.simulated === true };
}
