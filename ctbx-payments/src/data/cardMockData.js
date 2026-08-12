// MOCK TEMPORÁRIO: substitui cartao/consultar, cartao/dados-conta e cartao/transacoes.
export const MOCK_FINANCIAL_CARD = {
  id: 'ctbx-mastercard', holder: 'ELMA BICHARA', lastFour: '4821', expiry: '08/29',
  status: 'Desbloqueado', balance: 'R$ 2.450,80', brand: 'Mastercard',
};

export const MOCK_CARD_TRANSACTIONS = [
  { id: 'tx-1', title: 'Mercado Central', date: 'Hoje, 10:42', value: '- R$ 86,40', status: 'Aprovada', authorization: 'CTBX80421' },
  { id: 'tx-2', title: 'Recarga do cartão', date: 'Ontem, 16:18', value: '+ R$ 300,00', status: 'Concluída', authorization: 'CTBX79914' },
  { id: 'tx-3', title: 'Farmácia Avenida', date: '08 ago, 09:13', value: '- R$ 42,90', status: 'Aprovada', authorization: 'CTBX78205' },
];

export const MOCK_TRANSPORT_CARD = { lastFour: '9073', balance: 'R$ 48,20', status: 'Ativo' };

export const CARD_ENDPOINTS = [
  'cartao/consultar', 'cartao/codigo-validacao', 'cartao/valida-codigo',
  'cartao/gerar-senha-e-login-v2', 'cartao/unlock-card', 'cartao/pass-card',
  'cartao/desbloqueio', 'cartao/gerar-boleto', 'cartao/pdf-boleto',
  'cartao/trocar-senha', 'cartao/bloqueio-cartao', 'cartao/transacoes',
  'cartao/comprovante-pdf', 'pedido-cartao/novo', 'tarifa/consulta', 'termos/texto',
];
