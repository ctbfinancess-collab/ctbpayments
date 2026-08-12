import { formatCents } from './accountMapper';

const minor = (value, field) => {
  if (!Number.isInteger(value)) throw new TypeError(`${field} must use integer minor units`);
  return value;
};
const dateBr = (iso) => iso ? iso.slice(0, 10).split('-').reverse().join('/') : '';

export function mapSandboxBill(value = {}) {
  for (const field of ['originalAmountMinor', 'discountMinor', 'interestMinor', 'fineMinor', 'totalAmountMinor']) minor(value[field], field);
  return { ...value, id: value.billId, code: value.digitableLine || value.barcode, beneficiary: value.beneficiary?.name, beneficiaryDocument: value.beneficiary?.documentMasked, bank: value.bankName, dueDate: dateBr(value.dueDate), documentValue: formatCents(value.originalAmountMinor), discount: formatCents(value.discountMinor), interest: formatCents(value.interestMinor), fine: formatCents(value.fineMinor), total: formatCents(value.totalAmountMinor) };
}

export function mapSandboxPaymentValidation(value = {}) {
  for (const field of ['amountMinor', 'feeMinor', 'totalDebitMinor']) minor(value[field], field);
  return { ...value, bill: mapSandboxBill(value.bill), amount: formatCents(value.amountMinor), fee: formatCents(value.feeMinor), totalDebit: formatCents(value.totalDebitMinor), scheduled: Boolean(value.scheduledFor) };
}

export function mapSandboxInstallments(value = {}) {
  return (value.options || []).map((item) => {
    for (const field of ['installmentAmountMinor', 'totalAmountMinor', 'feeMinor']) minor(item[field], field);
    return { ...item, simulationId: value.simulationId, count: item.installments, installmentValue: formatCents(item.installmentAmountMinor), total: formatCents(item.totalAmountMinor), fee: formatCents(item.feeMinor), simulated: true };
  });
}

export function mapSandboxPayment(value = {}) {
  minor(value.amountMinor, 'amountMinor');
  return { ...value, amount: formatCents(value.amountMinor), sandboxMode: value.environment === 'SANDBOX', simulated: value.simulated === true };
}

export function mapSandboxPaymentReceipt(value = {}) {
  minor(value.amountMinor, 'amountMinor');
  return { ...value, amount: formatCents(value.amountMinor), beneficiaryName: value.beneficiary?.name, beneficiaryDocument: value.beneficiary?.documentMasked, simulated: value.simulated === true };
}
