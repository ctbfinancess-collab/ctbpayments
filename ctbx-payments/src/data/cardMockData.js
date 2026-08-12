// MOCK TEMPORÁRIO: substitui cartao/consultar, cartao/dados-conta e cartao/transacoes.
export const MOCK_FINANCIAL_CARD = {
  id: 'ctbx-mastercard-demo', holder: 'CLIENTE DEMONSTRAÇÃO', lastFour: '0000', expiry: '08/29',
  status: 'Desbloqueado', balance: 'R$ 2.450,80', brand: 'Mastercard',
};

export const MOCK_CARD_TRANSACTIONS = [
  { id: 'DEMO-CARD-0001', title: 'Estabelecimento Demonstração', date: 'Hoje, 10:42', occurredAt: new Date().toISOString(), value: '- R$ 86,40', status: 'Aprovada', authorization: 'DEMO-0001' },
  { id: 'DEMO-CARD-0002', title: 'Recarga de demonstração', date: '8 dias atrás', occurredAt: new Date(Date.now() - 8 * 86400000).toISOString(), value: '+ R$ 300,00', status: 'Concluída', authorization: 'DEMO-0002' },
  { id: 'DEMO-CARD-0003', title: 'Compra Demonstração', date: '20 dias atrás', occurredAt: new Date(Date.now() - 20 * 86400000).toISOString(), value: '- R$ 42,90', status: 'Aprovada', authorization: 'DEMO-0003' },
];

export const MOCK_TRANSPORT_CARD = { lastFour: '9073', balance: 'R$ 48,20', status: 'Ativo' };

export const CARD_ENDPOINTS = [
  'cartao/consultar', 'cartao/codigo-validacao', 'cartao/valida-codigo',
  'cartao/gerar-senha-e-login-v2', 'cartao/unlock-card', 'cartao/pass-card',
  'cartao/desbloqueio', 'cartao/gerar-boleto', 'cartao/pdf-boleto',
  'cartao/trocar-senha', 'cartao/bloqueio-cartao', 'cartao/transacoes',
  'cartao/comprovante-pdf', 'pedido-cartao/novo', 'tarifa/consulta', 'termos/texto',
];
