// Catálogo exclusivamente formado por caminhos recuperados do Hermes e já documentados no projeto.
export const endpoints = Object.freeze({
  auth: { login: 'usuario/login', otpCreate: 'otp/gerar', tokenCreate: 'token2f/novo', tokenValidate: 'token2f/valida' },
  account: { balance: 'conta/saldo', statement: 'conta/extrato', statementCsv: 'conta/extrato-csv', statementPdf: 'conta/extrato-novo-pdf', futureEntries: 'conta/lancamentos-futuros', receiptPdf: 'conta/comprovante-pdf' },
  pix: { balance: 'conta/saldo', favorites: 'favorecido/lista', lookupKey: 'pix/pix/consultar-chave', listKeys: 'pix/pix/consultar-chaves', availableKeys: 'pix/pix/chaves-disponiveis', lookupQr: 'pix/pix/consultar-qrcode', createKey: 'pix/pix/criar-chave', deleteKey: 'pix/pix/excluir-chave', createQr: 'pix/pix/gera-qrcode-estatico', send: 'pix/pix/enviar-pix', schedule: 'pix/pix/agendar-pix', blockedStatement: 'pix-bloqueados/extrato-pix-bloqueados', blockedResponses: 'pix-bloqueados/respostas' },
  transfers: { beneficiaryByPhone: 'conta/busca-por-telefone', beneficiaryByDocument: 'conta/busca-por-documento', beneficiaryByAccount: 'conta/busca-por-agencia-e-conta', favorites: 'favorecido/lista', create: 'transferencia/nova', fee: 'tarifa/consulta' },
  payments: { lookup: 'pagamento/consulta', create: 'pagamento/novo', receipts: 'comprovante/lista' },
  statement: { list: 'conta/extrato', csv: 'conta/extrato-csv', pdf: 'conta/extrato-novo-pdf' },
  cards: { get: 'cartao/consultar', transactions: 'cartao/transacoes', unlock: 'cartao/unlock-card', changePassword: 'cartao/trocar-senha', block: 'cartao/bloqueio-cartao', receiptPdf: 'cartao/comprovante-pdf', request: 'pedido-cartao/novo' },
  services: { investments: 'investimento/lista', investmentSimulation: 'investimento/simulacao', billing: 'boleto/boleto/boleto-cobranca', consignedRequest: 'consignado-pedido/solicitacao', terms: 'termos/texto', fees: 'cdi/lista-cdi' },
  profile: { photo: 'usuario/nova-foto-perfil', terms: 'termos/texto', reportError: 'reportar-erro/reportar' },
});
