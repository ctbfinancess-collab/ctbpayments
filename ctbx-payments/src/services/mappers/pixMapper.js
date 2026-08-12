import { formatCents } from './accountMapper';

export function mapSandboxBeneficiary(value = {}) {
  return { name: value.name, bank: value.bankName, agency: value.branch, account: value.accountMasked, document: value.documentMasked, accountType: value.accountType };
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
