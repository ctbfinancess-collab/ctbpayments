// MOCK TEMPORARIO: retorno local das APIs de consulta, saldo, tarifa e pagamento.
export const MOCK_PAYMENT_BALANCE = '2.480,75';
export const MOCK_BILL = {
  beneficiary: 'Empresa beneficiária demonstração', beneficiaryDocument: '00.000.000/0001-00', payer: 'CLIENTE CTBX', dueDate: '30/12/2026', documentValue: '125,00', discount: '0,00', interest: '0,00', fine: '0,00', total: '125,00', bank: 'Banco emissor',
};

export const MOCK_INSTALLMENTS = [1, 2, 3, 4, 6, 8, 10, 12].map((count) => {
  const total = 125 * (1 + Math.max(0, count - 1) * 0.012);
  return { count, installmentValue: (total / count).toFixed(2).replace('.', ','), total: total.toFixed(2).replace('.', ',') };
});

export const PAYMENT_ENDPOINTS_RECOVERED = [
  'pagamento/consulta', 'pagamento/novo', 'tarifa/consulta', 'conta/saldo',
  'comprovante/lista', 'conta/comprovante-pdf', 'token2f/novo', 'token2f/valida',
  'usuario/login', 'gateway-cartao/bandeira', 'gateway/gateway-token/obtem-token',
  'gateway/gateway-simulacao/simulacao', 'gateway/gateway-token/pagamento-token',
  'gateway/gateway/comprovante-pdf', 'utilitarios/validacao-push-envio',
  'utilitarios/validacao-push-confere',
];

export function buildMockBill(code) { return { ...MOCK_BILL, code, id: `PG-${Date.now()}` }; }
