import { formatCents } from './accountMapper';

const assertMinor = (value, field) => {
  if (!Number.isInteger(value)) throw new TypeError(`${field} must use integer minor units`);
  return value;
};

export function mapSandboxBank(value = {}) {
  return { ...value, active: value.status === 'ACTIVE' };
}

export function mapSandboxTransferBeneficiary(value = {}) {
  const accountMasked = value.accountMasked || '';
  const parts = accountMasked.split('-');
  return {
    ...value,
    id: value.beneficiaryId || value.id,
    beneficiaryId: value.beneficiaryId,
    document: value.documentMasked,
    bank: value.bank?.name,
    bankData: value.bank,
    agency: value.branch,
    account: parts[0] || accountMasked,
    digit: parts[1] || '',
    mode: value.transferType === 'INTERNAL' ? 'internal' : 'external',
  };
}

export const mapSandboxTransferFavorites = (items = []) => items.map(mapSandboxTransferBeneficiary);

export function mapSandboxTransferValidation(value = {}) {
  assertMinor(value.amountMinor, 'amountMinor');
  assertMinor(value.feeMinor, 'feeMinor');
  assertMinor(value.totalDebitMinor, 'totalDebitMinor');
  return {
    ...value,
    beneficiary: mapSandboxTransferBeneficiary(value.beneficiary),
    amount: formatCents(value.amountMinor),
    fee: formatCents(value.feeMinor),
    totalDebit: formatCents(value.totalDebitMinor),
    scheduled: Boolean(value.scheduledFor),
    scheduleNotice: value.scheduledFor ? 'Agendamento validado no ambiente sandbox' : '',
  };
}

export function mapSandboxTransfer(value = {}) {
  assertMinor(value.amountMinor, 'amountMinor');
  assertMinor(value.feeMinor, 'feeMinor');
  assertMinor(value.totalDebitMinor, 'totalDebitMinor');
  return {
    ...value,
    id: value.transferId,
    beneficiary: mapSandboxTransferBeneficiary(value.beneficiary),
    amount: formatCents(value.amountMinor),
    fee: formatCents(value.feeMinor),
    totalDebit: formatCents(value.totalDebitMinor),
    scheduled: value.status === 'SCHEDULED',
    sandboxMode: value.environment === 'SANDBOX',
    simulated: value.simulated === true,
  };
}

export function mapSandboxTransferReceipt(value = {}) {
  assertMinor(value.amountMinor, 'amountMinor');
  assertMinor(value.feeMinor, 'feeMinor');
  return {
    ...value,
    id: value.transferId,
    beneficiary: mapSandboxTransferBeneficiary(value.beneficiary),
    amount: formatCents(value.amountMinor),
    fee: formatCents(value.feeMinor),
    scheduled: value.status === 'SCHEDULED',
    sandboxMode: value.environment === 'SANDBOX',
    simulated: value.simulated === true,
  };
}
