import { onlyDigits } from './cpf.js';

// Porta exata de src/utils/pixValidation.js (frontend) — mesmo algoritmo
// de dígito verificador do CNPJ, pra cadastro de empresa (backend) e PIX
// (frontend) nunca divergirem sobre o que é um CNPJ válido.
export { onlyDigits };

export function isValidCnpj(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;

  const calculateDigit = (length: number): number => {
    const weights = length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const total = weights.reduce((sum, weight, index) => sum + Number(cnpj[index]) * weight, 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  return calculateDigit(12) === Number(cnpj[12]) && calculateDigit(13) === Number(cnpj[13]);
}
