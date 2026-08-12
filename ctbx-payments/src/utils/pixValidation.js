export function onlyDigits(value = '') {
  return value.replace(/\D/g, '');
}

export function isValidCpf(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;

  const calculateDigit = (length) => {
    let total = 0;
    for (let index = 0; index < length; index += 1) {
      total += Number(cpf[index]) * (length + 1 - index);
    }
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(9) === Number(cpf[9]) && calculateDigit(10) === Number(cpf[10]);
}

export function isValidCnpj(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const calculateDigit = (length) => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const total = weights.reduce((sum, weight, index) => sum + Number(cnpj[index]) * weight, 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(12) === Number(cnpj[12]) && calculateDigit(13) === Number(cnpj[13]);
}

export function isValidEmail(value = '') {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function validatePixKey(type, value) {
  if (!value.trim()) return 'Preencha a chave PIX.';
  if (type === 'cpf' && !isValidCpf(value)) return 'CPF inválido.';
  if (type === 'cnpj' && !isValidCnpj(value)) return 'CNPJ inválido.';
  if (type === 'phone' && onlyDigits(value).length < 10) return 'Celular inválido.';
  if (type === 'email' && !isValidEmail(value)) return 'E-mail inválido.';
  return null;
}

export function parseCurrency(value = '') {
  const normalized = value.replace(/R\$/g, '').replace(/\./g, '').replace(',', '.').trim();
  return Number.parseFloat(normalized) || 0;
}
