// Dados estruturais/fictícios do Painel Administrativo — mesmo espírito do
// modo DEMO já usado no app cliente. Não existe (ainda) nenhum endpoint
// administrativo real no backend, então tudo aqui é mock só para visualizar
// a estrutura (Etapa 1). Nada disso deve ser tratado como dado real.
export const ADMIN_DASHBOARD_STATS = [
  { id: 'active_clients', label: 'Clientes ativos', value: '2.847', delta: '+3,2%', trend: 'up', icon: 'people-outline' },
  { id: 'open_accounts', label: 'Contas abertas', value: '3.102', delta: '+1,8%', trend: 'up', icon: 'wallet-outline' },
  { id: 'total_balance', label: 'Saldo total', value: 'R$ 18.420.750,00', delta: '+0,9%', trend: 'up', icon: 'cash-outline' },
  { id: 'pix_today', label: 'Volume PIX hoje', value: 'R$ 1.247.890,50', delta: '+18,6%', trend: 'up', icon: 'flash-outline' },
  { id: 'pix_month', label: 'Volume PIX no mês', value: 'R$ 28.913.420,00', delta: '+9,4%', trend: 'up', icon: 'trending-up-outline' },
  { id: 'tx_today', label: 'Transações hoje', value: '3.682', delta: '+14,2%', trend: 'up', icon: 'swap-horizontal-outline' },
  { id: 'tx_pending', label: 'Transações pendentes', value: '18', delta: '—', trend: 'flat', icon: 'time-outline' },
  { id: 'kyc_pending', label: 'KYC pendentes', value: '24', delta: '—', trend: 'flat', icon: 'shield-checkmark-outline' },
];

export const ADMIN_RECENT_TRANSACTIONS = [
  { id: 'tx-1', client: 'João da Silva', type: 'Recebimento', value: 'R$ 1.250,00', status: 'Concluído', at: '17/08/2026 16:42' },
  { id: 'tx-2', client: 'Maria Oliveira', type: 'Envio', value: '- R$ 320,00', status: 'Concluído', at: '17/08/2026 16:41' },
  { id: 'tx-3', client: 'Carlos Pereira', type: 'Recebimento', value: 'R$ 500,00', status: 'Concluído', at: '17/08/2026 16:39' },
  { id: 'tx-4', client: 'Ana Costa', type: 'Envio', value: '- R$ 850,00', status: 'Em processamento', at: '17/08/2026 16:38' },
  { id: 'tx-5', client: 'Fernanda Lima', type: 'Envio', value: '- R$ 150,00', status: 'Falha', at: '17/08/2026 16:33' },
];

export const ADMIN_ALERTS = [
  { id: 'alert-1', level: 'warning', message: '24 verificações de KYC aguardando análise há mais de 48h.' },
  { id: 'alert-2', level: 'danger', message: '24 transações PIX falharam nas últimas 24h (0,65% do total).' },
  { id: 'alert-3', level: 'info', message: 'Ambiente sandbox — nenhuma operação aqui é real.' },
];

export const ADMIN_RECENT_ACTIVITY = [
  { id: 'act-1', actor: 'Elma Bichara', action: 'Consultou detalhes da transação PIX17659801251563', at: 'há 4 min' },
  { id: 'act-2', actor: 'Elma Bichara', action: 'Acessou o Painel Administrativo', at: 'há 12 min' },
];

// ── Clientes ────────────────────────────────────────────────────────────
export const ADMIN_CLIENTS = [
  { id: 'cli-1', name: 'João da Silva', document: '123.456.789-34', type: 'PF', account: 'SBX-000123-4', status: 'Ativo', kycStatus: 'Aprovado', balance: 'R$ 12.480,50', createdAt: '14/02/2025' },
  { id: 'cli-2', name: 'Maria Oliveira', document: '987.654.321-12', type: 'PF', account: 'SBX-000456-7', status: 'Ativo', kycStatus: 'Aprovado', balance: 'R$ 3.250,00', createdAt: '02/05/2025' },
  { id: 'cli-3', name: 'Comércio Pereira Ltda', document: '12.345.678/0001-90', type: 'PJ', account: 'SBX-000789-1', status: 'Ativo', kycStatus: 'Em análise', balance: 'R$ 84.900,00', createdAt: '19/07/2025' },
  { id: 'cli-4', name: 'Ana Costa', document: '456.789.123-56', type: 'PF', account: 'SBX-001012-3', status: 'Bloqueado', kycStatus: 'Recusado', balance: 'R$ 0,00', createdAt: '30/09/2025' },
  { id: 'cli-5', name: 'Lucas Souza', document: '321.654.987-78', type: 'PF', account: 'SBX-001345-6', status: 'Ativo', kycStatus: 'Aprovado', balance: 'R$ 7.640,20', createdAt: '11/11/2025' },
  { id: 'cli-6', name: 'Fernanda Lima', document: '789.123.456-90', type: 'PF', account: 'SBX-001678-9', status: 'Inativo', kycStatus: 'Aprovado', balance: 'R$ 150,00', createdAt: '05/01/2026' },
  { id: 'cli-7', name: 'Ricardo Alves', document: '654.321.789-01', type: 'PF', account: 'SBX-001901-2', status: 'Ativo', kycStatus: 'Pendente', balance: 'R$ 980,00', createdAt: '22/03/2026' },
  { id: 'cli-8', name: 'Comércio Martins ME', document: '98.765.432/0001-10', type: 'PJ', account: 'SBX-002234-5', status: 'Ativo', kycStatus: 'Aprovado', balance: 'R$ 41.200,00', createdAt: '08/06/2026' },
];

// ── Contas ──────────────────────────────────────────────────────────────
export const ADMIN_ACCOUNTS = [
  { id: 'acc-1', number: 'SBX-000123-4', holder: 'João da Silva', document: '123.456.789-34', type: 'Conta Corrente', balance: 'R$ 12.480,50', status: 'Ativa', openedAt: '14/02/2025' },
  { id: 'acc-2', number: 'SBX-000456-7', holder: 'Maria Oliveira', document: '987.654.321-12', type: 'Conta Corrente', balance: 'R$ 3.250,00', status: 'Ativa', openedAt: '02/05/2025' },
  { id: 'acc-3', number: 'SBX-000789-1', holder: 'Comércio Pereira Ltda', document: '12.345.678/0001-90', type: 'Conta PJ', balance: 'R$ 84.900,00', status: 'Ativa', openedAt: '19/07/2025' },
  { id: 'acc-4', number: 'SBX-001012-3', holder: 'Ana Costa', document: '456.789.123-56', type: 'Conta Corrente', balance: 'R$ 0,00', status: 'Bloqueada', openedAt: '30/09/2025' },
  { id: 'acc-5', number: 'SBX-001345-6', holder: 'Lucas Souza', document: '321.654.987-78', type: 'Conta Corrente', balance: 'R$ 7.640,20', status: 'Ativa', openedAt: '11/11/2025' },
  { id: 'acc-6', number: 'SBX-001678-9', holder: 'Fernanda Lima', document: '789.123.456-90', type: 'Conta Corrente', balance: 'R$ 150,00', status: 'Encerrada', openedAt: '05/01/2026' },
  { id: 'acc-7', number: 'SBX-001901-2', holder: 'Ricardo Alves', document: '654.321.789-01', type: 'Conta Corrente', balance: 'R$ 980,00', status: 'Ativa', openedAt: '22/03/2026' },
  { id: 'acc-8', number: 'SBX-002234-5', holder: 'Comércio Martins ME', document: '98.765.432/0001-10', type: 'Conta PJ', balance: 'R$ 41.200,00', status: 'Ativa', openedAt: '08/06/2026' },
];

// ── PIX (admin) ─────────────────────────────────────────────────────────
export const ADMIN_PIX_STATS = [
  { id: 'pix_volume_today', label: 'Volume PIX hoje', value: 'R$ 1.247.890,50', delta: '+18,6%', trend: 'up', icon: 'cash-outline' },
  { id: 'pix_sent', label: 'PIX enviados', value: '1.940', delta: '+11,2%', trend: 'up', icon: 'arrow-up-circle-outline' },
  { id: 'pix_received', label: 'PIX recebidos', value: '1.742', delta: '+16,7%', trend: 'up', icon: 'arrow-down-circle-outline' },
  { id: 'pix_pending', label: 'Pendentes', value: '18', trend: 'flat', icon: 'time-outline' },
  { id: 'pix_failed', label: 'Falhas', value: '24', trend: 'flat', icon: 'alert-circle-outline' },
];

export const ADMIN_PIX_TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'sent', label: 'Enviadas' },
  { id: 'received', label: 'Recebidas' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'failed', label: 'Falhas' },
  { id: 'refunded', label: 'Devoluções' },
  { id: 'keys', label: 'Chaves PIX' },
  { id: 'qr', label: 'QR Codes' },
];

export const ADMIN_PIX_TRANSACTIONS = [
  { id: 'PIX17659801251563', occurredAt: '17/08/2026 16:42:31', client: 'João da Silva', type: 'sent', typeLabel: 'Envio', value: '- R$ 320,00', status: 'failed', statusLabel: 'Falha', endToEndId: 'E90400888202608171941a8b7c', txId: 'TXID9401A8B7C2026', payer: 'João da Silva', payerDocument: '123.***.***-34', payee: 'Maria Oliveira', payeeDocument: '987.***.***-12', description: 'Pagamento combinado', origin: 'Chave PIX (telefone)', key: '(11) 98765-4321', errorMessage: 'PSP do recebedor indisponível (timeout).', timeline: [{ label: 'Enviado pelo pagador', at: '16:42:31' }, { label: 'Encaminhado ao PSP recebedor', at: '16:42:33' }, { label: 'Falha na liquidação', at: '16:42:41' }] },
  { id: 'PIX17659801251564', occurredAt: '17/08/2026 16:42:31', client: 'João da Silva', type: 'received', typeLabel: 'Recebimento', value: 'R$ 1.250,00', status: 'completed', statusLabel: 'Concluído', endToEndId: 'E904008882026081719 42s5d0f3', txId: 'TXID942S5D0F32026', payer: 'Carlos Pereira', payerDocument: '456.***.***-78', payee: 'João da Silva', payeeDocument: '123.***.***-34', description: 'Recebimento de aluguel', origin: 'Chave PIX (e-mail)', key: 'joao.silva@email.com', timeline: [{ label: 'Recebido pelo PSP', at: '16:42:31' }, { label: 'Validado', at: '16:42:32' }, { label: 'Liquidação', at: '16:42:34' }, { label: 'Disponibilizado', at: '16:42:35' }] },
  { id: 'PIX17659801251565', occurredAt: '17/08/2026 16:41:08', client: 'Maria Oliveira', type: 'sent', typeLabel: 'Envio', value: '- R$ 320,00', status: 'completed', statusLabel: 'Concluído', endToEndId: 'E90400888202608171941a8b7c', txId: 'TXID941A8B7C2026', payer: 'Maria Oliveira', payerDocument: '987.***.***-12', payee: 'Cliente Recebedor', payeeDocument: '***.***.***-**', description: '—', origin: 'Chave PIX (telefone)', key: '(11) 98765-4321', timeline: [{ label: 'Enviado pelo pagador', at: '16:41:08' }, { label: 'Encaminhado ao PSP recebedor', at: '16:41:09' }, { label: 'Liquidação', at: '16:41:10' }, { label: 'Confirmado', at: '16:41:11' }] },
  { id: 'PIX17659801251566', occurredAt: '17/08/2026 16:39:55', client: 'Carlos Pereira', type: 'received', typeLabel: 'Recebimento', value: 'R$ 500,00', status: 'completed', statusLabel: 'Concluído', endToEndId: 'E90400888202608171939d9e1f', txId: 'TXID939D9E1F2026', payer: 'Cliente Pagador', payerDocument: '***.***.***-**', payee: 'Carlos Pereira', payeeDocument: '456.***.***-78', description: 'Pagamento de serviço', origin: 'Chave PIX (e-mail)', key: 'carlos.pereira@ctbx.com', timeline: [{ label: 'Recebido pelo PSP', at: '16:39:55' }, { label: 'Validado', at: '16:39:56' }, { label: 'Disponibilizado', at: '16:39:58' }] },
  { id: 'PIX17659801251567', occurredAt: '17/08/2026 16:38:12', client: 'Ana Costa', type: 'sent', typeLabel: 'Envio', value: '- R$ 850,00', status: 'pending', statusLabel: 'Em processamento', endToEndId: 'E90400888202608171938g2h3i', txId: 'TXID938G2H3I2026', payer: 'Ana Costa', payerDocument: '456.***.***-56', payee: 'Fornecedor Sandbox', payeeDocument: '**.***.***/****-**', description: 'Pagamento de fornecedor', origin: 'QR Code estático', key: '00020101021226880014br.gov.bcb.pix', timeline: [{ label: 'Enviado pelo pagador', at: '16:38:12' }, { label: 'Em análise de segurança', at: '16:38:14' }] },
  { id: 'PIX17659801251568', occurredAt: '17/08/2026 16:35:44', client: 'Lucas Souza', type: 'received', typeLabel: 'Recebimento', value: 'R$ 2.400,00', status: 'completed', statusLabel: 'Concluído', endToEndId: 'E90400888202608171935j4k5l', txId: 'TXID935J4K5L2026', payer: 'Cliente Pagador', payerDocument: '***.***.***-**', payee: 'Lucas Souza', payeeDocument: '321.***.***-78', description: 'Reembolso', origin: 'Chave PIX (e-mail)', key: 'lucas.souza@outlook.com', timeline: [{ label: 'Recebido pelo PSP', at: '16:35:44' }, { label: 'Validado', at: '16:35:45' }, { label: 'Disponibilizado', at: '16:35:47' }] },
  { id: 'PIX17659801251569', occurredAt: '17/08/2026 16:33:21', client: 'Fernanda Lima', type: 'refunded', typeLabel: 'Devolução', value: '- R$ 150,00', status: 'completed', statusLabel: 'Concluído', endToEndId: 'E90400888202608171933m6n7o', txId: 'TXID933M6N7O2026', payer: 'Fernanda Lima', payerDocument: '789.***.***-90', payee: 'Cliente Recebedor', payeeDocument: '***.***.***-**', description: 'Devolução solicitada pelo recebedor', origin: 'Devolução de PIX', key: 'fernanda.lima@ctbx.com', timeline: [{ label: 'Devolução solicitada', at: '16:33:21' }, { label: 'Processada', at: '16:33:24' }] },
  { id: 'PIX17659801251570', occurredAt: '17/08/2026 16:31:02', client: 'Ricardo Alves', type: 'received', typeLabel: 'Recebimento', value: 'R$ 780,00', status: 'completed', statusLabel: 'Concluído', endToEndId: 'E90400888202608171931p8q9r', txId: 'TXID931P8Q9R2026', payer: 'Cliente Pagador', payerDocument: '***.***.***-**', payee: 'Ricardo Alves', payeeDocument: '654.***.***-01', description: '—', origin: 'Chave PIX (telefone)', key: '(21) 99876-5432', timeline: [{ label: 'Recebido pelo PSP', at: '16:31:02' }, { label: 'Validado', at: '16:31:03' }, { label: 'Disponibilizado', at: '16:31:05' }] },
];

export const ADMIN_PIX_KEYS = [
  { id: 'key-1', owner: 'João da Silva', type: 'E-mail', value: 'joao.silva@email.com', createdAt: '14/02/2025', status: 'Ativa' },
  { id: 'key-2', owner: 'Maria Oliveira', type: 'Telefone', value: '(11) 98765-4321', createdAt: '02/05/2025', status: 'Ativa' },
  { id: 'key-3', owner: 'Comércio Pereira Ltda', type: 'CNPJ', value: '12.345.678/0001-90', createdAt: '19/07/2025', status: 'Ativa' },
  { id: 'key-4', owner: 'Ana Costa', type: 'Aleatória', value: 'a1b2c3d4-e5f6-...', createdAt: '30/09/2025', status: 'Bloqueada' },
  { id: 'key-5', owner: 'Lucas Souza', type: 'E-mail', value: 'lucas.souza@outlook.com', createdAt: '11/11/2025', status: 'Ativa' },
];

// ── Compliance / KYC ────────────────────────────────────────────────────
export const ADMIN_KYC_TABS = [
  { id: 'pending', label: 'Pendentes' },
  { id: 'in_review', label: 'Em análise' },
  { id: 'approved', label: 'Aprovados' },
  { id: 'rejected', label: 'Recusados' },
];

export const ADMIN_KYC_REQUESTS = [
  { id: 'kyc-1', client: 'Ricardo Alves', document: '654.321.789-01', type: 'PF', requestedAt: '10/08/2026', status: 'pending', statusLabel: 'Pendente', reviewer: '—', registration: { name: 'Ricardo Alves', document: '654.321.789-01', birthDate: '12/04/1990', phone: '(21) 99876-5432', email: 'ricardo.alves@ctbx.com', address: 'Rua Fictícia SANDBOX, 123 — Rio de Janeiro/RJ' }, documents: ['Documento de identificação (RG/CNH)', 'Comprovante de residência', 'Selfie de verificação'], timeline: [{ label: 'Cadastro criado', at: '22/03/2026' }, { label: 'Documentos enviados', at: '10/08/2026' }, { label: 'Aguardando análise', at: '10/08/2026' }] },
  { id: 'kyc-2', client: 'Comércio Pereira Ltda', document: '12.345.678/0001-90', type: 'PJ', requestedAt: '09/08/2026', status: 'in_review', statusLabel: 'Em análise', reviewer: 'Elma Bichara', registration: { name: 'Comércio Pereira Ltda', document: '12.345.678/0001-90', birthDate: '—', phone: '(11) 3456-7890', email: 'contato@pereira.ctbx.com', address: 'Av. Fictícia SANDBOX, 456 — São Paulo/SP' }, documents: ['Contrato social', 'Cartão CNPJ', 'Comprovante de endereço da empresa'], timeline: [{ label: 'Cadastro criado', at: '19/07/2025' }, { label: 'Documentos enviados', at: '05/08/2026' }, { label: 'Em análise por Elma Bichara', at: '09/08/2026' }] },
  { id: 'kyc-3', client: 'João da Silva', document: '123.456.789-34', type: 'PF', requestedAt: '14/02/2025', status: 'approved', statusLabel: 'Aprovado', reviewer: 'Elma Bichara', registration: { name: 'João da Silva', document: '123.456.789-34', birthDate: '05/09/1988', phone: '(11) 91234-5678', email: 'joao.silva@email.com', address: 'Rua Fictícia SANDBOX, 789 — São Paulo/SP' }, documents: ['Documento de identificação (RG/CNH)', 'Comprovante de residência', 'Selfie de verificação'], timeline: [{ label: 'Cadastro criado', at: '14/02/2025' }, { label: 'Documentos enviados', at: '14/02/2025' }, { label: 'Aprovado por Elma Bichara', at: '15/02/2025' }] },
  { id: 'kyc-4', client: 'Ana Costa', document: '456.789.123-56', type: 'PF', requestedAt: '30/09/2025', status: 'rejected', statusLabel: 'Recusado', reviewer: 'Elma Bichara', registration: { name: 'Ana Costa', document: '456.789.123-56', birthDate: '20/01/1995', phone: '(31) 99988-7766', email: 'ana.costa@ctbx.com', address: 'Rua Fictícia SANDBOX, 321 — Belo Horizonte/MG' }, documents: ['Documento de identificação (RG/CNH)', 'Comprovante de residência', 'Selfie de verificação'], timeline: [{ label: 'Cadastro criado', at: '30/09/2025' }, { label: 'Documentos enviados', at: '01/10/2025' }, { label: 'Recusado por Elma Bichara — documento ilegível', at: '02/10/2025' }] },
];

// ── Transferências (admin) ─────────────────────────────────────────────
// Mocks próprios desta tela — deliberadamente não compartilhados com os
// registros de PIX acima, mesmo havendo campos parecidos.
export const ADMIN_TRANSFERS_STATS = [
  { id: 'transfers_volume_today', label: 'Volume transferido hoje', value: 'R$ 486.320,00', delta: '+7,4%', trend: 'up', icon: 'swap-horizontal-outline' },
  { id: 'transfers_sent', label: 'Transferências realizadas', value: '312', delta: '+5,1%', trend: 'up', icon: 'arrow-up-circle-outline' },
  { id: 'transfers_received', label: 'Transferências recebidas', value: '289', delta: '+6,3%', trend: 'up', icon: 'arrow-down-circle-outline' },
  { id: 'transfers_pending', label: 'Pendentes', value: '9', trend: 'flat', icon: 'time-outline' },
  { id: 'transfers_failed', label: 'Falhas', value: '5', trend: 'flat', icon: 'alert-circle-outline' },
];

export const ADMIN_TRANSFER_TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'sent', label: 'Enviadas' },
  { id: 'received', label: 'Recebidas' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'completed', label: 'Concluídas' },
  { id: 'failed', label: 'Falhas' },
  { id: 'cancelled', label: 'Canceladas' },
];

const TRANSFER_TYPE_LABEL = { internal: 'Transferência entre contas CTBX', bank: 'Transferência bancária', ted: 'TED' };

export const ADMIN_TRANSFERS = [
  { id: 'TRF-2026081701', occurredAt: '17/08/2026 15:12:08', client: 'João da Silva', document: '123.456.789-34', direction: 'sent', originAccount: 'SBX-000123-4', destinationAccount: 'SBX-000456-7', destinationBank: null, agency: '0001', accountNumber: '000456-7', type: 'internal', typeLabel: TRANSFER_TYPE_LABEL.internal, value: 'R$ 1.200,00', fee: 'R$ 0,00', netValue: 'R$ 1.200,00', statusKey: 'completed', statusLabel: 'Concluída', description: 'Transferência entre contas CTBX', timeline: [{ label: 'Solicitada pelo cliente', at: '15:12:08' }, { label: 'Validada', at: '15:12:09' }, { label: 'Concluída', at: '15:12:10' }] },
  { id: 'TRF-2026081702', occurredAt: '17/08/2026 14:58:41', client: 'Maria Oliveira', document: '987.654.321-12', direction: 'sent', originAccount: 'SBX-000456-7', destinationAccount: '654321-2', destinationBank: 'Banco Sandbox B', agency: '0002', accountNumber: '654321-2', type: 'ted', typeLabel: TRANSFER_TYPE_LABEL.ted, value: 'R$ 5.000,00', fee: 'R$ 8,90', netValue: 'R$ 4.991,10', statusKey: 'pending', statusLabel: 'Em processamento', description: 'TED para conta externa', timeline: [{ label: 'Solicitada pelo cliente', at: '14:58:41' }, { label: 'Em processamento pelo banco destino', at: '14:58:45' }] },
  { id: 'TRF-2026081703', occurredAt: '17/08/2026 14:30:02', client: 'Comércio Pereira Ltda', document: '12.345.678/0001-90', direction: 'received', originAccount: '112233-9', destinationAccount: 'SBX-000789-1', destinationBank: null, agency: '0001', accountNumber: '000789-1', type: 'bank', typeLabel: TRANSFER_TYPE_LABEL.bank, value: 'R$ 18.000,00', fee: 'R$ 0,00', netValue: 'R$ 18.000,00', statusKey: 'completed', statusLabel: 'Concluída', description: 'Recebimento de cliente PJ', timeline: [{ label: 'Recebida', at: '14:30:02' }, { label: 'Validada', at: '14:30:03' }, { label: 'Disponibilizada', at: '14:30:05' }] },
  { id: 'TRF-2026081704', occurredAt: '17/08/2026 13:47:19', client: 'Ana Costa', document: '456.789.123-56', direction: 'sent', originAccount: 'SBX-001012-3', destinationAccount: '998877-1', destinationBank: 'Banco Sandbox A', agency: '0004', accountNumber: '998877-1', type: 'ted', typeLabel: TRANSFER_TYPE_LABEL.ted, value: 'R$ 850,00', fee: 'R$ 8,90', netValue: 'R$ 858,90', statusKey: 'failed', statusLabel: 'Falha', description: 'TED rejeitada pelo banco destino', timeline: [{ label: 'Solicitada pelo cliente', at: '13:47:19' }, { label: 'Enviada ao banco destino', at: '13:47:21' }, { label: 'Rejeitada — conta destino inválida', at: '13:47:30' }] },
  { id: 'TRF-2026081705', occurredAt: '17/08/2026 12:59:53', client: 'Lucas Souza', document: '321.654.987-78', direction: 'received', originAccount: 'SBX-000123-4', destinationAccount: 'SBX-001345-6', destinationBank: null, agency: '0001', accountNumber: '001345-6', type: 'internal', typeLabel: TRANSFER_TYPE_LABEL.internal, value: 'R$ 300,00', fee: 'R$ 0,00', netValue: 'R$ 300,00', statusKey: 'completed', statusLabel: 'Concluída', description: 'Transferência entre contas CTBX', timeline: [{ label: 'Recebida', at: '12:59:53' }, { label: 'Concluída', at: '12:59:54' }] },
  { id: 'TRF-2026081706', occurredAt: '17/08/2026 12:10:37', client: 'Fernanda Lima', document: '789.123.456-90', direction: 'sent', originAccount: 'SBX-001678-9', destinationAccount: '445566-3', destinationBank: 'Banco Sandbox B', agency: '0002', accountNumber: '445566-3', type: 'bank', typeLabel: TRANSFER_TYPE_LABEL.bank, value: 'R$ 120,00', fee: 'R$ 0,00', netValue: 'R$ 120,00', statusKey: 'cancelled', statusLabel: 'Cancelada', description: 'Cancelada pelo cliente antes da liquidação', timeline: [{ label: 'Solicitada pelo cliente', at: '12:10:37' }, { label: 'Cancelada pelo cliente', at: '12:11:02' }] },
  { id: 'TRF-2026081707', occurredAt: '17/08/2026 11:22:14', client: 'Ricardo Alves', document: '654.321.789-01', direction: 'received', originAccount: 'SBX-000789-1', destinationAccount: 'SBX-001901-2', destinationBank: null, agency: '0001', accountNumber: '001901-2', type: 'internal', typeLabel: TRANSFER_TYPE_LABEL.internal, value: 'R$ 2.100,00', fee: 'R$ 0,00', netValue: 'R$ 2.100,00', statusKey: 'completed', statusLabel: 'Concluída', description: 'Pagamento de serviço', timeline: [{ label: 'Recebida', at: '11:22:14' }, { label: 'Concluída', at: '11:22:15' }] },
  { id: 'TRF-2026081708', occurredAt: '17/08/2026 10:05:48', client: 'Comércio Martins ME', document: '98.765.432/0001-10', direction: 'sent', originAccount: 'SBX-002234-5', destinationAccount: '778899-4', destinationBank: 'Banco Sandbox A', agency: '0004', accountNumber: '778899-4', type: 'ted', typeLabel: TRANSFER_TYPE_LABEL.ted, value: 'R$ 12.500,00', fee: 'R$ 8,90', netValue: 'R$ 12.508,90', statusKey: 'pending', statusLabel: 'Pendente', description: 'TED de pagamento a fornecedor', timeline: [{ label: 'Solicitada pelo cliente', at: '10:05:48' }, { label: 'Aguardando janela bancária', at: '10:05:50' }] },
];

// ── Pagamentos (admin) ──────────────────────────────────────────────────
// Mocks próprios desta tela — não compartilhados com PIX nem Transferências.
export const ADMIN_PAYMENTS_STATS = [
  { id: 'payments_volume_today', label: 'Volume pago hoje', value: 'R$ 212.640,00', delta: '+4,8%', trend: 'up', icon: 'document-text-outline' },
  { id: 'payments_completed', label: 'Pagamentos realizados', value: '547', delta: '+3,6%', trend: 'up', icon: 'checkmark-done-outline' },
  { id: 'payments_scheduled', label: 'Pagamentos agendados', value: '38', trend: 'flat', icon: 'calendar-outline' },
  { id: 'payments_pending', label: 'Pendentes', value: '12', trend: 'flat', icon: 'time-outline' },
  { id: 'payments_failed', label: 'Falhas', value: '7', trend: 'flat', icon: 'alert-circle-outline' },
];

export const ADMIN_PAYMENT_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'boleto', label: 'Boletos' },
  { id: 'bill', label: 'Contas/Convênios' },
  { id: 'scheduled', label: 'Agendados' },
  { id: 'completed', label: 'Concluídos' },
  { id: 'pending', label: 'Pendentes' },
  { id: 'failed', label: 'Falhas' },
  { id: 'cancelled', label: 'Cancelados' },
];

const PAYMENT_TYPE_LABEL = { boleto: 'Boleto', consumption: 'Conta de consumo', convenio: 'Convênio' };

export const ADMIN_PAYMENTS = [
  { id: 'PAY-2026081701', occurredAt: '17/08/2026 09:14:22', client: 'João da Silva', document: '123.456.789-34', type: 'boleto', typeLabel: PAYMENT_TYPE_LABEL.boleto, payee: 'Distribuidora Sandbox Ltda', identifier: '00190500954014481606906809350314337370000000100', value: 'R$ 340,00', fee: 'R$ 0,00', totalValue: 'R$ 340,00', dueDate: '18/08/2026', paymentDate: '17/08/2026', statusKey: 'completed', statusLabel: 'Concluído', description: 'Pagamento de boleto', timeline: [{ label: 'Boleto lido', at: '09:14:22' }, { label: 'Validado', at: '09:14:24' }, { label: 'Pago', at: '09:14:26' }] },
  { id: 'PAY-2026081702', occurredAt: '17/08/2026 08:50:07', client: 'Maria Oliveira', document: '987.654.321-12', type: 'consumption', typeLabel: PAYMENT_TYPE_LABEL.consumption, payee: 'Companhia de Energia Sandbox', identifier: '83650000012 3456789012 3456789013 3456789014', value: 'R$ 189,40', fee: 'R$ 0,00', totalValue: 'R$ 189,40', dueDate: '20/08/2026', paymentDate: '17/08/2026', statusKey: 'completed', statusLabel: 'Concluído', description: 'Pagamento de conta de luz', timeline: [{ label: 'Conta lida', at: '08:50:07' }, { label: 'Validada', at: '08:50:08' }, { label: 'Paga', at: '08:50:10' }] },
  { id: 'PAY-2026081703', occurredAt: '20/08/2026 06:00:00', client: 'Comércio Pereira Ltda', document: '12.345.678/0001-90', type: 'convenio', typeLabel: PAYMENT_TYPE_LABEL.convenio, payee: 'Convênio Sandbox Municipal', identifier: 'CONV-SBX-84421', value: 'R$ 4.200,00', fee: 'R$ 0,00', totalValue: 'R$ 4.200,00', dueDate: '20/08/2026', paymentDate: '—', statusKey: 'scheduled', statusLabel: 'Agendado', description: 'Pagamento de convênio agendado', timeline: [{ label: 'Agendado pelo cliente', at: '16/08/2026 11:20' }, { label: 'Aguardando data de vencimento', at: '17/08/2026 08:00' }] },
  { id: 'PAY-2026081704', occurredAt: '17/08/2026 07:32:55', client: 'Ana Costa', document: '456.789.123-56', type: 'boleto', typeLabel: PAYMENT_TYPE_LABEL.boleto, payee: 'Fornecedor Sandbox ME', identifier: '00190500954014481606906809350314337370000085000', value: 'R$ 850,00', fee: 'R$ 0,00', totalValue: 'R$ 850,00', dueDate: '17/08/2026', paymentDate: '—', statusKey: 'failed', statusLabel: 'Falha', description: 'Falha no processamento do boleto', errorMessage: 'Boleto vencido há mais de 90 dias — pagamento não permitido.', timeline: [{ label: 'Boleto lido', at: '07:32:55' }, { label: 'Validação rejeitada', at: '07:32:58' }] },
  { id: 'PAY-2026081705', occurredAt: '17/08/2026 07:10:12', client: 'Lucas Souza', document: '321.654.987-78', type: 'consumption', typeLabel: PAYMENT_TYPE_LABEL.consumption, payee: 'Companhia de Água Sandbox', identifier: '83650000045 6789012345 6789012346 6789012347', value: 'R$ 96,80', fee: 'R$ 0,00', totalValue: 'R$ 96,80', dueDate: '19/08/2026', paymentDate: '—', statusKey: 'pending', statusLabel: 'Pendente', description: 'Aguardando confirmação de saldo', timeline: [{ label: 'Conta lida', at: '07:10:12' }, { label: 'Aguardando confirmação', at: '07:10:14' }] },
  { id: 'PAY-2026081706', occurredAt: '17/08/2026 06:48:39', client: 'Fernanda Lima', document: '789.123.456-90', type: 'boleto', typeLabel: PAYMENT_TYPE_LABEL.boleto, payee: 'Loja Sandbox Varejo', identifier: '00190500954014481606906809350314337370000015000', value: 'R$ 150,00', fee: 'R$ 0,00', totalValue: 'R$ 150,00', dueDate: '17/08/2026', paymentDate: '17/08/2026', statusKey: 'pending', statusLabel: 'Em processamento', description: 'Pagamento em processamento pelo emissor', timeline: [{ label: 'Boleto lido', at: '06:48:39' }, { label: 'Em processamento pelo emissor', at: '06:48:41' }] },
  { id: 'PAY-2026081707', occurredAt: '16/08/2026 18:05:02', client: 'Ricardo Alves', document: '654.321.789-01', type: 'convenio', typeLabel: PAYMENT_TYPE_LABEL.convenio, payee: 'Convênio Sandbox Estadual', identifier: 'CONV-SBX-19207', value: 'R$ 610,00', fee: 'R$ 0,00', totalValue: 'R$ 610,00', dueDate: '16/08/2026', paymentDate: '—', statusKey: 'cancelled', statusLabel: 'Cancelado', description: 'Cancelado pelo cliente antes do vencimento', timeline: [{ label: 'Agendado pelo cliente', at: '10/08/2026' }, { label: 'Cancelado pelo cliente', at: '16/08/2026 18:05' }] },
  { id: 'PAY-2026081708', occurredAt: '16/08/2026 15:40:19', client: 'Comércio Martins ME', document: '98.765.432/0001-10', type: 'consumption', typeLabel: PAYMENT_TYPE_LABEL.consumption, payee: 'Companhia de Telefonia Sandbox', identifier: '83650000078 9012345678 9012345679 9012345680', value: 'R$ 1.240,00', fee: 'R$ 0,00', totalValue: 'R$ 1.240,00', dueDate: '18/08/2026', paymentDate: '16/08/2026', statusKey: 'completed', statusLabel: 'Concluído', description: 'Pagamento de conta de telefonia PJ', timeline: [{ label: 'Conta lida', at: '15:40:19' }, { label: 'Validada', at: '15:40:20' }, { label: 'Paga', at: '15:40:22' }] },
];

// ── Investimentos (admin) ───────────────────────────────────────────────
// Mocks próprios desta tela — não compartilhados com PIX, Transferências ou
// Pagamentos. Tudo estrutural: nenhuma integração real com mercado financeiro.
export const ADMIN_INVESTMENTS_STATS = [
  { id: 'inv_total_patrimony', label: 'Patrimônio total investido', value: 'R$ 6.480.250,00', delta: '+2,1%', trend: 'up', icon: 'trending-up-outline' },
  { id: 'inv_clients', label: 'Clientes investidores', value: '412', delta: '+1,4%', trend: 'up', icon: 'people-outline' },
  { id: 'inv_applications_today', label: 'Aplicações hoje', value: 'R$ 84.300,00', trend: 'flat', icon: 'arrow-up-circle-outline' },
  { id: 'inv_redemptions_today', label: 'Resgates hoje', value: 'R$ 31.900,00', trend: 'flat', icon: 'arrow-down-circle-outline' },
  { id: 'inv_avg_return', label: 'Rentabilidade média', value: '108% do CDI', trend: 'flat', icon: 'stats-chart-outline' },
];

export const ADMIN_INVESTMENT_TABS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'positions', label: 'Posições' },
  { id: 'applications', label: 'Aplicações' },
  { id: 'redemptions', label: 'Resgates' },
  { id: 'products', label: 'Produtos' },
  { id: 'maturities', label: 'Vencimentos' },
];

const POSITION_STATUS_TONE = { active: 'success', processing: 'info', maturing: 'warning', matured: 'danger', redeemed: 'neutral' };
const OPERATION_STATUS_TONE = { requested: 'info', processing: 'warning', completed: 'success', declined: 'danger', cancelled: 'neutral' };

export { POSITION_STATUS_TONE, OPERATION_STATUS_TONE };

// Posições — usadas pelas abas "Visão geral" e "Posições" (mesma tabela).
export const ADMIN_INVESTMENT_POSITIONS = [
  { id: 'INV-POS-0001', client: 'João da Silva', document: '123.456.789-34', account: 'SBX-000123-4', product: 'CDB CTBX 2027', issuer: 'CTBX Payments Sandbox', category: 'CDB', indexer: 'CDI', rate: '108% do CDI', appliedValue: 'R$ 25.000,00', currentBalance: 'R$ 26.850,40', accumulatedReturn: 'R$ 1.850,40 (7,40%)', appliedAt: '15/02/2025', maturity: '15/02/2027', liquidity: 'No vencimento', statusKey: 'active', statusLabel: 'Ativo', timeline: [{ label: 'Aplicação confirmada', at: '15/02/2025' }, { label: 'Rendimento em curso', at: '17/08/2026' }] },
  { id: 'INV-POS-0002', client: 'Maria Oliveira', document: '987.654.321-12', account: 'SBX-000456-7', product: 'Tesouro Selic 2029', issuer: 'Tesouro Nacional (SANDBOX)', category: 'Tesouro', indexer: 'Selic', rate: 'Selic + 0,05%', appliedValue: 'R$ 8.000,00', currentBalance: 'R$ 8.412,10', accumulatedReturn: 'R$ 412,10 (5,15%)', appliedAt: '02/05/2025', maturity: '01/03/2029', liquidity: 'Diária', statusKey: 'active', statusLabel: 'Ativo', timeline: [{ label: 'Aplicação confirmada', at: '02/05/2025' }, { label: 'Rendimento em curso', at: '17/08/2026' }] },
  { id: 'INV-POS-0003', client: 'Comércio Pereira Ltda', document: '12.345.678/0001-90', account: 'SBX-000789-1', product: 'Fundo Multimercado CTBX', issuer: 'CTBX Asset Sandbox', category: 'Fundos', indexer: 'CDI', rate: '115% do CDI (histórico)', appliedValue: 'R$ 120.000,00', currentBalance: 'R$ 128.640,00', accumulatedReturn: 'R$ 8.640,00 (7,20%)', appliedAt: '19/07/2025', maturity: 'Sem vencimento', liquidity: 'D+30', statusKey: 'active', statusLabel: 'Ativo', timeline: [{ label: 'Aplicação confirmada', at: '19/07/2025' }, { label: 'Rendimento em curso', at: '17/08/2026' }] },
  { id: 'INV-POS-0004', client: 'Ana Costa', document: '456.789.123-56', account: 'SBX-001012-3', product: 'LCI Sandbox Imobiliário', issuer: 'Banco Sandbox A', category: 'LCI/LCA', indexer: 'CDI', rate: '96% do CDI', appliedValue: 'R$ 15.000,00', currentBalance: 'R$ 15.510,00', accumulatedReturn: 'R$ 510,00 (3,40%)', appliedAt: '30/09/2025', maturity: '25/08/2026', liquidity: 'No vencimento', statusKey: 'maturing', statusLabel: 'Vencendo', timeline: [{ label: 'Aplicação confirmada', at: '30/09/2025' }, { label: 'Próximo do vencimento', at: '17/08/2026' }] },
  { id: 'INV-POS-0005', client: 'Lucas Souza', document: '321.654.987-78', account: 'SBX-001345-6', product: 'CDB CTBX 2026', issuer: 'CTBX Payments Sandbox', category: 'CDB', indexer: 'CDI', rate: '102% do CDI', appliedValue: 'R$ 6.000,00', currentBalance: 'R$ 6.180,00', accumulatedReturn: 'R$ 180,00 (3,00%)', appliedAt: '11/11/2025', maturity: '10/08/2026', liquidity: 'No vencimento', statusKey: 'matured', statusLabel: 'Vencido', timeline: [{ label: 'Aplicação confirmada', at: '11/11/2025' }, { label: 'Vencido — aguardando resgate automático', at: '10/08/2026' }] },
  { id: 'INV-POS-0006', client: 'Fernanda Lima', document: '789.123.456-90', account: 'SBX-001678-9', product: 'Renda Fixa Sandbox Plus', issuer: 'CTBX Payments Sandbox', category: 'Renda Fixa', indexer: 'IPCA', rate: 'IPCA + 6,20% a.a.', appliedValue: 'R$ 3.000,00', currentBalance: 'R$ 0,00', accumulatedReturn: 'R$ 190,00 (6,33%)', appliedAt: '05/01/2026', maturity: '05/01/2028', liquidity: 'No vencimento', statusKey: 'redeemed', statusLabel: 'Resgatado', timeline: [{ label: 'Aplicação confirmada', at: '05/01/2026' }, { label: 'Resgate solicitado', at: '15/08/2026' }, { label: 'Resgate concluído', at: '16/08/2026' }] },
  { id: 'INV-POS-0007', client: 'Ricardo Alves', document: '654.321.789-01', account: 'SBX-001901-2', product: 'Fundo Multimercado CTBX', issuer: 'CTBX Asset Sandbox', category: 'Fundos', indexer: 'CDI', rate: '115% do CDI (histórico)', appliedValue: 'R$ 4.500,00', currentBalance: 'R$ 4.590,00', accumulatedReturn: 'R$ 90,00 (2,00%)', appliedAt: '22/03/2026', maturity: 'Sem vencimento', liquidity: 'D+30', statusKey: 'processing', statusLabel: 'Em processamento', timeline: [{ label: 'Aplicação solicitada', at: '22/03/2026' }, { label: 'Em processamento pelo administrador do fundo', at: '17/08/2026' }] },
  { id: 'INV-POS-0008', client: 'Comércio Martins ME', document: '98.765.432/0001-10', account: 'SBX-002234-5', product: 'Tesouro IPCA+ 2030', issuer: 'Tesouro Nacional (SANDBOX)', category: 'Tesouro', indexer: 'IPCA', rate: 'IPCA + 5,80% a.a.', appliedValue: 'R$ 60.000,00', currentBalance: 'R$ 63.720,00', accumulatedReturn: 'R$ 3.720,00 (6,20%)', appliedAt: '08/06/2026', maturity: '15/05/2030', liquidity: 'Diária', statusKey: 'active', statusLabel: 'Ativo', timeline: [{ label: 'Aplicação confirmada', at: '08/06/2026' }, { label: 'Rendimento em curso', at: '17/08/2026' }] },
];

export const ADMIN_INVESTMENT_APPLICATIONS = [
  { id: 'INV-APP-0001', occurredAt: '17/08/2026 09:05:12', client: 'João da Silva', document: '123.456.789-34', account: 'SBX-000123-4', product: 'CDB CTBX 2027', issuer: 'CTBX Payments Sandbox', category: 'CDB', indexer: 'CDI', rate: '108% do CDI', appliedValue: 'R$ 5.000,00', value: 'R$ 5.000,00', currentBalance: 'R$ 5.000,00', accumulatedReturn: 'R$ 0,00 (0,00%)', appliedAt: '17/08/2026', maturity: '15/02/2027', liquidity: 'No vencimento', operationStatusKey: 'completed', operationStatusLabel: 'Concluído', timeline: [{ label: 'Aplicação solicitada', at: '09:05:12' }, { label: 'Saldo debitado', at: '09:05:13' }, { label: 'Aplicação confirmada', at: '09:05:15' }] },
  { id: 'INV-APP-0002', occurredAt: '17/08/2026 08:40:33', client: 'Comércio Martins ME', document: '98.765.432/0001-10', account: 'SBX-002234-5', product: 'Fundo Multimercado CTBX', issuer: 'CTBX Asset Sandbox', category: 'Fundos', indexer: 'CDI', rate: '115% do CDI (histórico)', appliedValue: 'R$ 20.000,00', value: 'R$ 20.000,00', currentBalance: 'R$ 20.000,00', accumulatedReturn: 'R$ 0,00 (0,00%)', appliedAt: '17/08/2026', maturity: 'Sem vencimento', liquidity: 'D+30', operationStatusKey: 'processing', operationStatusLabel: 'Em processamento', timeline: [{ label: 'Aplicação solicitada', at: '08:40:33' }, { label: 'Em processamento pelo administrador do fundo', at: '08:40:35' }] },
  { id: 'INV-APP-0003', occurredAt: '16/08/2026 17:22:48', client: 'Ricardo Alves', document: '654.321.789-01', account: 'SBX-001901-2', product: 'Fundo Multimercado CTBX', issuer: 'CTBX Asset Sandbox', category: 'Fundos', indexer: 'CDI', rate: '115% do CDI (histórico)', appliedValue: 'R$ 4.500,00', value: 'R$ 4.500,00', currentBalance: 'R$ 4.500,00', accumulatedReturn: 'R$ 0,00 (0,00%)', appliedAt: '16/08/2026', maturity: 'Sem vencimento', liquidity: 'D+30', operationStatusKey: 'requested', operationStatusLabel: 'Solicitado', timeline: [{ label: 'Aplicação solicitada', at: '17:22:48' }] },
  { id: 'INV-APP-0004', occurredAt: '16/08/2026 14:03:07', client: 'Ana Costa', document: '456.789.123-56', account: 'SBX-001012-3', product: 'LCI Sandbox Imobiliário', issuer: 'Banco Sandbox A', category: 'LCI/LCA', indexer: 'CDI', rate: '96% do CDI', appliedValue: 'R$ 500,00', value: 'R$ 500,00', currentBalance: 'R$ 0,00', accumulatedReturn: 'R$ 0,00 (0,00%)', appliedAt: '16/08/2026', maturity: '25/08/2026', liquidity: 'No vencimento', operationStatusKey: 'declined', operationStatusLabel: 'Recusado', timeline: [{ label: 'Aplicação solicitada', at: '14:03:07' }, { label: 'Recusada — abaixo da aplicação mínima', at: '14:03:09' }] },
  { id: 'INV-APP-0005', occurredAt: '15/08/2026 10:15:51', client: 'Lucas Souza', document: '321.654.987-78', account: 'SBX-001345-6', product: 'Tesouro Selic 2029', issuer: 'Tesouro Nacional (SANDBOX)', category: 'Tesouro', indexer: 'Selic', rate: 'Selic + 0,05%', appliedValue: 'R$ 2.000,00', value: 'R$ 2.000,00', currentBalance: 'R$ 0,00', accumulatedReturn: 'R$ 0,00 (0,00%)', appliedAt: '15/08/2026', maturity: '01/03/2029', liquidity: 'Diária', operationStatusKey: 'cancelled', operationStatusLabel: 'Cancelado', timeline: [{ label: 'Aplicação solicitada', at: '10:15:51' }, { label: 'Cancelada pelo cliente', at: '10:20:02' }] },
  { id: 'INV-APP-0006', occurredAt: '14/08/2026 09:30:00', client: 'Comércio Pereira Ltda', document: '12.345.678/0001-90', account: 'SBX-000789-1', product: 'Fundo Multimercado CTBX', issuer: 'CTBX Asset Sandbox', category: 'Fundos', indexer: 'CDI', rate: '115% do CDI (histórico)', appliedValue: 'R$ 30.000,00', value: 'R$ 30.000,00', currentBalance: 'R$ 31.020,00', accumulatedReturn: 'R$ 1.020,00 (3,40%)', appliedAt: '14/08/2026', maturity: 'Sem vencimento', liquidity: 'D+30', operationStatusKey: 'completed', operationStatusLabel: 'Concluído', timeline: [{ label: 'Aplicação solicitada', at: '09:30:00' }, { label: 'Saldo debitado', at: '09:30:02' }, { label: 'Aplicação confirmada', at: '09:30:05' }] },
];

export const ADMIN_INVESTMENT_REDEMPTIONS = [
  { id: 'INV-RED-0001', occurredAt: '17/08/2026 08:12:40', client: 'Fernanda Lima', document: '789.123.456-90', account: 'SBX-001678-9', product: 'Renda Fixa Sandbox Plus', issuer: 'CTBX Payments Sandbox', category: 'Renda Fixa', indexer: 'IPCA', rate: 'IPCA + 6,20% a.a.', appliedValue: 'R$ 3.000,00', requestedValue: 'R$ 3.190,00', netValue: 'R$ 3.190,00', currentBalance: 'R$ 0,00', accumulatedReturn: 'R$ 190,00 (6,33%)', appliedAt: '05/01/2026', maturity: '05/01/2028', liquidity: 'No vencimento', operationStatusKey: 'completed', operationStatusLabel: 'Concluído', timeline: [{ label: 'Resgate solicitado', at: '15/08/2026' }, { label: 'Resgate processado', at: '16/08/2026' }, { label: 'Valor disponibilizado', at: '16/08/2026' }] },
  { id: 'INV-RED-0002', occurredAt: '16/08/2026 16:48:19', client: 'Lucas Souza', document: '321.654.987-78', account: 'SBX-001345-6', product: 'CDB CTBX 2026', issuer: 'CTBX Payments Sandbox', category: 'CDB', indexer: 'CDI', rate: '102% do CDI', appliedValue: 'R$ 6.000,00', requestedValue: 'R$ 6.180,00', netValue: 'R$ 6.180,00', currentBalance: 'R$ 6.180,00', accumulatedReturn: 'R$ 180,00 (3,00%)', appliedAt: '11/11/2025', maturity: '10/08/2026', liquidity: 'No vencimento', operationStatusKey: 'processing', operationStatusLabel: 'Em processamento', timeline: [{ label: 'Resgate solicitado (vencimento automático)', at: '10/08/2026' }, { label: 'Em processamento', at: '16/08/2026 16:48' }] },
  { id: 'INV-RED-0003', occurredAt: '15/08/2026 11:02:37', client: 'João da Silva', document: '123.456.789-34', account: 'SBX-000123-4', product: 'Tesouro Selic 2029', issuer: 'Tesouro Nacional (SANDBOX)', category: 'Tesouro', indexer: 'Selic', rate: 'Selic + 0,05%', appliedValue: 'R$ 1.000,00', requestedValue: 'R$ 1.041,20', netValue: 'R$ 1.041,20', currentBalance: 'R$ 1.041,20', accumulatedReturn: 'R$ 41,20 (4,12%)', appliedAt: '10/02/2025', maturity: '01/03/2029', liquidity: 'Diária', operationStatusKey: 'requested', operationStatusLabel: 'Solicitado', timeline: [{ label: 'Resgate solicitado', at: '11:02:37' }] },
  { id: 'INV-RED-0004', occurredAt: '14/08/2026 13:55:04', client: 'Comércio Martins ME', document: '98.765.432/0001-10', account: 'SBX-002234-5', product: 'Fundo Multimercado CTBX', issuer: 'CTBX Asset Sandbox', category: 'Fundos', indexer: 'CDI', rate: '115% do CDI (histórico)', appliedValue: 'R$ 10.000,00', requestedValue: 'R$ 10.680,00', netValue: 'R$ 10.680,00', currentBalance: 'R$ 10.680,00', accumulatedReturn: 'R$ 680,00 (6,80%)', appliedAt: '20/01/2026', maturity: 'Sem vencimento', liquidity: 'D+30', operationStatusKey: 'declined', operationStatusLabel: 'Recusado', timeline: [{ label: 'Resgate solicitado', at: '13:55:04' }, { label: 'Recusado — fora da janela de liquidez D+30', at: '13:55:06' }] },
  { id: 'INV-RED-0005', occurredAt: '13/08/2026 09:18:22', client: 'Ana Costa', document: '456.789.123-56', account: 'SBX-001012-3', product: 'LCI Sandbox Imobiliário', issuer: 'Banco Sandbox A', category: 'LCI/LCA', indexer: 'CDI', rate: '96% do CDI', appliedValue: 'R$ 15.000,00', requestedValue: 'R$ 15.510,00', netValue: 'R$ 15.510,00', currentBalance: 'R$ 15.510,00', accumulatedReturn: 'R$ 510,00 (3,40%)', appliedAt: '30/09/2025', maturity: '25/08/2026', liquidity: 'No vencimento', operationStatusKey: 'cancelled', operationStatusLabel: 'Cancelado', timeline: [{ label: 'Resgate solicitado', at: '09:18:22' }, { label: 'Cancelado pelo cliente', at: '09:25:00' }] },
];

export const ADMIN_INVESTMENT_PRODUCTS = [
  { id: 'prod-1', name: 'CDB CTBX 2027', category: 'CDB', issuer: 'CTBX Payments Sandbox', indexer: 'CDI', rate: '108% do CDI', liquidity: 'No vencimento', maturity: '15/02/2027', minApplication: 'R$ 1.000,00', appliedPatrimony: 'R$ 31.000,00', investorsCount: 2, status: 'Ativo' },
  { id: 'prod-2', name: 'CDB CTBX 2026', category: 'CDB', issuer: 'CTBX Payments Sandbox', indexer: 'CDI', rate: '102% do CDI', liquidity: 'No vencimento', maturity: '10/08/2026', minApplication: 'R$ 500,00', appliedPatrimony: 'R$ 6.000,00', investorsCount: 1, status: 'Encerrado' },
  { id: 'prod-3', name: 'Fundo Multimercado CTBX', category: 'Fundos', issuer: 'CTBX Asset Sandbox', indexer: 'CDI', rate: '115% do CDI (histórico)', liquidity: 'D+30', maturity: 'Sem vencimento', minApplication: 'R$ 500,00', appliedPatrimony: 'R$ 154.500,00', investorsCount: 3, status: 'Ativo' },
  { id: 'prod-4', name: 'LCI Sandbox Imobiliário', category: 'LCI/LCA', issuer: 'Banco Sandbox A', indexer: 'CDI', rate: '96% do CDI', liquidity: 'No vencimento', maturity: '25/08/2026', minApplication: 'R$ 1.000,00', appliedPatrimony: 'R$ 15.000,00', investorsCount: 1, status: 'Ativo' },
  { id: 'prod-5', name: 'Tesouro Selic 2029', category: 'Tesouro', issuer: 'Tesouro Nacional (SANDBOX)', indexer: 'Selic', rate: 'Selic + 0,05%', liquidity: 'Diária', maturity: '01/03/2029', minApplication: 'R$ 100,00', appliedPatrimony: 'R$ 8.000,00', investorsCount: 1, status: 'Ativo' },
  { id: 'prod-6', name: 'Tesouro IPCA+ 2030', category: 'Tesouro', issuer: 'Tesouro Nacional (SANDBOX)', indexer: 'IPCA', rate: 'IPCA + 5,80% a.a.', liquidity: 'Diária', maturity: '15/05/2030', minApplication: 'R$ 100,00', appliedPatrimony: 'R$ 60.000,00', investorsCount: 1, status: 'Ativo' },
  { id: 'prod-7', name: 'Renda Fixa Sandbox Plus', category: 'Renda Fixa', issuer: 'CTBX Payments Sandbox', indexer: 'IPCA', rate: 'IPCA + 6,20% a.a.', liquidity: 'No vencimento', maturity: '05/01/2028', minApplication: 'R$ 500,00', appliedPatrimony: 'R$ 0,00', investorsCount: 0, status: 'Ativo' },
];

export const ADMIN_INVESTMENT_MATURITIES = [
  { id: 'mat-1', date: '25/08/2026', client: 'Ana Costa', product: 'LCI Sandbox Imobiliário', estimatedValue: 'R$ 15.510,00', daysLeft: 8, status: 'Vencendo' },
  { id: 'mat-2', date: '10/09/2026', client: 'João da Silva', product: 'CDB CTBX 2027', estimatedValue: 'R$ 27.100,00', daysLeft: 24, status: 'Programado' },
  { id: 'mat-3', date: '10/08/2026', client: 'Lucas Souza', product: 'CDB CTBX 2026', estimatedValue: 'R$ 6.180,00', daysLeft: -7, status: 'Vencido' },
  { id: 'mat-4', date: '05/01/2028', client: 'Fernanda Lima', product: 'Renda Fixa Sandbox Plus', estimatedValue: 'R$ 3.190,00', daysLeft: 507, status: 'Programado' },
  { id: 'mat-5', date: '15/02/2027', client: 'João da Silva', product: 'CDB CTBX 2027', estimatedValue: 'R$ 26.850,40', daysLeft: 182, status: 'Programado' },
];

// ── Cartões (admin) ─────────────────────────────────────────────────────
// Mocks próprios desta tela — não compartilhados com PIX, Transferências,
// Pagamentos ou Investimentos. Nunca inclui número completo, CVV ou senha/PIN.
export const ADMIN_CARDS_STATS = [
  { id: 'cards_active', label: 'Cartões ativos', value: '2.318', delta: '+2,4%', trend: 'up', icon: 'card-outline' },
  { id: 'cards_blocked', label: 'Cartões bloqueados', value: '47', trend: 'flat', icon: 'lock-closed-outline' },
  { id: 'cards_limit_total', label: 'Limite total concedido', value: 'R$ 9.860.000,00', trend: 'flat', icon: 'wallet-outline' },
  { id: 'cards_purchases_today', label: 'Compras hoje', value: 'R$ 187.430,00', delta: '+9,7%', trend: 'up', icon: 'cart-outline' },
  { id: 'cards_invoices_open', label: 'Faturas em aberto', value: '1.204', trend: 'flat', icon: 'document-text-outline' },
];

export const ADMIN_CARD_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'physical', label: 'Físicos' },
  { id: 'virtual', label: 'Virtuais' },
  { id: 'active', label: 'Ativos' },
  { id: 'blocked', label: 'Bloqueados' },
  { id: 'cancelled', label: 'Cancelados' },
  { id: 'invoices', label: 'Faturas' },
  { id: 'transactions', label: 'Transações' },
];

const CARD_TYPE_LABEL = { physical: 'Físico', virtual: 'Virtual' };
const CARD_STATUS_TONE = { active: 'success', blocked: 'danger', temp_blocked: 'warning', cancelled: 'neutral', issuing: 'info' };
const INVOICE_STATUS_TONE = { open: 'info', closed: 'neutral', paid: 'success', overdue: 'danger' };
const TRANSACTION_STATUS_TONE = { approved: 'success', pending: 'warning', declined: 'danger', reversed: 'neutral' };

export { CARD_STATUS_TONE, INVOICE_STATUS_TONE, TRANSACTION_STATUS_TONE };

export const ADMIN_CARDS = [
  { id: 'CARD-0001', client: 'João da Silva', document: '123.456.789-34', type: 'physical', typeLabel: CARD_TYPE_LABEL.physical, lastFour: '4821', brand: 'Mastercard', limitTotal: 'R$ 8.000,00', limitAvailable: 'R$ 5.240,00', limitUsed: 'R$ 2.760,00', invoiceDueDate: '10/09/2026', bestPurchaseDay: '2', statusKey: 'active', statusLabel: 'Ativo', issuedAt: '14/02/2025', timeline: [{ label: 'Cartão emitido', at: '14/02/2025' }, { label: 'Ativado pelo cliente', at: '18/02/2025' }] },
  { id: 'CARD-0002', client: 'Maria Oliveira', document: '987.654.321-12', type: 'virtual', typeLabel: CARD_TYPE_LABEL.virtual, lastFour: '1190', brand: 'Visa', limitTotal: 'R$ 3.500,00', limitAvailable: 'R$ 3.500,00', limitUsed: 'R$ 0,00', invoiceDueDate: '05/09/2026', bestPurchaseDay: '28', statusKey: 'active', statusLabel: 'Ativo', issuedAt: '02/05/2025', timeline: [{ label: 'Cartão virtual gerado', at: '02/05/2025' }, { label: 'Ativado pelo cliente', at: '02/05/2025' }] },
  { id: 'CARD-0003', client: 'Comércio Pereira Ltda', document: '12.345.678/0001-90', type: 'physical', typeLabel: CARD_TYPE_LABEL.physical, lastFour: '7734', brand: 'Mastercard', limitTotal: 'R$ 25.000,00', limitAvailable: 'R$ 18.900,00', limitUsed: 'R$ 6.100,00', invoiceDueDate: '15/09/2026', bestPurchaseDay: '10', statusKey: 'active', statusLabel: 'Ativo', issuedAt: '19/07/2025', timeline: [{ label: 'Cartão emitido', at: '19/07/2025' }, { label: 'Ativado pelo cliente', at: '22/07/2025' }] },
  { id: 'CARD-0004', client: 'Ana Costa', document: '456.789.123-56', type: 'physical', typeLabel: CARD_TYPE_LABEL.physical, lastFour: '2245', brand: 'Elo', limitTotal: 'R$ 2.000,00', limitAvailable: 'R$ 2.000,00', limitUsed: 'R$ 0,00', invoiceDueDate: '—', bestPurchaseDay: '15', statusKey: 'blocked', statusLabel: 'Bloqueado', issuedAt: '30/09/2025', timeline: [{ label: 'Cartão emitido', at: '30/09/2025' }, { label: 'Bloqueado — suspeita de fraude', at: '29/07/2026' }] },
  { id: 'CARD-0005', client: 'Lucas Souza', document: '321.654.987-78', type: 'virtual', typeLabel: CARD_TYPE_LABEL.virtual, lastFour: '9931', brand: 'Visa', limitTotal: 'R$ 4.200,00', limitAvailable: 'R$ 1.850,00', limitUsed: 'R$ 2.350,00', invoiceDueDate: '08/09/2026', bestPurchaseDay: '1', statusKey: 'temp_blocked', statusLabel: 'Temporariamente bloqueado', issuedAt: '11/11/2025', timeline: [{ label: 'Cartão virtual gerado', at: '11/11/2025' }, { label: 'Bloqueado temporariamente pelo cliente', at: '16/08/2026' }] },
  { id: 'CARD-0006', client: 'Fernanda Lima', document: '789.123.456-90', type: 'physical', typeLabel: CARD_TYPE_LABEL.physical, lastFour: '3067', brand: 'Mastercard', limitTotal: 'R$ 1.500,00', limitAvailable: 'R$ 0,00', limitUsed: 'R$ 0,00', invoiceDueDate: '—', bestPurchaseDay: '20', statusKey: 'cancelled', statusLabel: 'Cancelado', issuedAt: '05/01/2026', timeline: [{ label: 'Cartão emitido', at: '05/01/2026' }, { label: 'Cancelado pelo cliente', at: '10/07/2026' }] },
  { id: 'CARD-0007', client: 'Ricardo Alves', document: '654.321.789-01', type: 'virtual', typeLabel: CARD_TYPE_LABEL.virtual, lastFour: '5502', brand: 'Visa', limitTotal: 'R$ 2.800,00', limitAvailable: 'R$ 2.800,00', limitUsed: 'R$ 0,00', invoiceDueDate: '—', bestPurchaseDay: '5', statusKey: 'issuing', statusLabel: 'Em emissão', issuedAt: '17/08/2026', timeline: [{ label: 'Solicitação recebida', at: '17/08/2026' }, { label: 'Em emissão', at: '17/08/2026' }] },
  { id: 'CARD-0008', client: 'Comércio Martins ME', document: '98.765.432/0001-10', type: 'physical', typeLabel: CARD_TYPE_LABEL.physical, lastFour: '6689', brand: 'Elo', limitTotal: 'R$ 18.000,00', limitAvailable: 'R$ 12.300,00', limitUsed: 'R$ 5.700,00', invoiceDueDate: '12/09/2026', bestPurchaseDay: '7', statusKey: 'active', statusLabel: 'Ativo', issuedAt: '08/06/2026', timeline: [{ label: 'Cartão emitido', at: '08/06/2026' }, { label: 'Ativado pelo cliente', at: '10/06/2026' }] },
];

export const ADMIN_CARD_INVOICES = [
  { id: 'INV-CARD-0001', client: 'João da Silva', lastFour: '4821', competence: 'Ago/2026', invoiceValue: 'R$ 2.760,00', minPayment: 'R$ 414,00', dueDate: '10/09/2026', statusKey: 'open', statusLabel: 'Aberta', totalValue: 'R$ 2.760,00', paidValue: 'R$ 0,00', remainingBalance: 'R$ 2.760,00', timeline: [{ label: 'Fatura aberta', at: '10/08/2026' }, { label: 'Fechamento em 10/09/2026', at: '—' }] },
  { id: 'INV-CARD-0002', client: 'Comércio Pereira Ltda', lastFour: '7734', competence: 'Ago/2026', invoiceValue: 'R$ 6.100,00', minPayment: 'R$ 915,00', dueDate: '15/09/2026', statusKey: 'open', statusLabel: 'Aberta', totalValue: 'R$ 6.100,00', paidValue: 'R$ 0,00', remainingBalance: 'R$ 6.100,00', timeline: [{ label: 'Fatura aberta', at: '15/08/2026' }] },
  { id: 'INV-CARD-0003', client: 'Lucas Souza', lastFour: '9931', competence: 'Jul/2026', invoiceValue: 'R$ 2.350,00', minPayment: 'R$ 352,50', dueDate: '08/08/2026', statusKey: 'paid', statusLabel: 'Paga', totalValue: 'R$ 2.350,00', paidValue: 'R$ 2.350,00', remainingBalance: 'R$ 0,00', timeline: [{ label: 'Fatura fechada', at: '01/08/2026' }, { label: 'Pagamento recebido', at: '07/08/2026' }] },
  { id: 'INV-CARD-0004', client: 'Comércio Martins ME', lastFour: '6689', competence: 'Jul/2026', invoiceValue: 'R$ 5.700,00', minPayment: 'R$ 855,00', dueDate: '12/08/2026', statusKey: 'overdue', statusLabel: 'Vencida', totalValue: 'R$ 5.700,00', paidValue: 'R$ 0,00', remainingBalance: 'R$ 5.700,00', timeline: [{ label: 'Fatura fechada', at: '05/08/2026' }, { label: 'Vencida sem pagamento', at: '12/08/2026' }] },
  { id: 'INV-CARD-0005', client: 'Maria Oliveira', lastFour: '1190', competence: 'Jul/2026', invoiceValue: 'R$ 0,00', minPayment: 'R$ 0,00', dueDate: '05/08/2026', statusKey: 'closed', statusLabel: 'Fechada', totalValue: 'R$ 0,00', paidValue: 'R$ 0,00', remainingBalance: 'R$ 0,00', timeline: [{ label: 'Fatura fechada sem movimentação', at: '01/08/2026' }] },
];

export const ADMIN_CARD_TRANSACTIONS = [
  { id: 'CTX-2026081701', occurredAt: '17/08/2026 12:40:02', client: 'João da Silva', lastFour: '4821', merchant: 'Supermercado Sandbox', category: 'Alimentação', value: 'R$ 340,80', type: 'purchase', typeLabel: 'Compra', statusKey: 'approved', statusLabel: 'Aprovada' },
  { id: 'CTX-2026081702', occurredAt: '17/08/2026 11:15:47', client: 'Comércio Pereira Ltda', lastFour: '7734', merchant: 'Distribuidora Sandbox Ltda', category: 'Fornecedores', value: 'R$ 2.100,00', type: 'purchase', typeLabel: 'Compra', statusKey: 'approved', statusLabel: 'Aprovada' },
  { id: 'CTX-2026081703', occurredAt: '17/08/2026 10:02:19', client: 'Comércio Martins ME', lastFour: '6689', merchant: 'Posto Sandbox Combustíveis', category: 'Combustível', value: 'R$ 480,00', type: 'purchase', typeLabel: 'Compra', statusKey: 'pending', statusLabel: 'Pendente' },
  { id: 'CTX-2026081704', occurredAt: '16/08/2026 19:30:55', client: 'Lucas Souza', lastFour: '9931', merchant: 'Loja Sandbox Eletrônicos', category: 'Eletrônicos', value: 'R$ 1.200,00', type: 'purchase', typeLabel: 'Compra', statusKey: 'declined', statusLabel: 'Recusada' },
  { id: 'CTX-2026081705', occurredAt: '16/08/2026 15:08:33', client: 'João da Silva', lastFour: '4821', merchant: 'Restaurante Sandbox', category: 'Alimentação', value: 'R$ 89,90', type: 'refund', typeLabel: 'Estorno', statusKey: 'reversed', statusLabel: 'Estornada' },
  { id: 'CTX-2026081706', occurredAt: '16/08/2026 09:44:10', client: 'Comércio Pereira Ltda', lastFour: '7734', merchant: 'Ajuste administrativo Sandbox', category: 'Ajuste', value: 'R$ 50,00', type: 'adjustment', typeLabel: 'Ajuste', statusKey: 'approved', statusLabel: 'Aprovada' },
  { id: 'CTX-2026081707', occurredAt: '15/08/2026 14:20:00', client: 'Comércio Martins ME', lastFour: '6689', merchant: 'Saque Sandbox 24h', category: 'Saque', value: 'R$ 500,00', type: 'withdrawal', typeLabel: 'Saque', statusKey: 'approved', statusLabel: 'Aprovada' },
];

// ── Limites (admin) ─────────────────────────────────────────────────────
// Mocks próprios desta tela — limites por cliente/conta (PIX diurno/noturno,
// transferência e saque). Somente leitura nesta etapa: nenhuma ação altera
// limite real, só exibe o estado atual simulado.
export const ADMIN_LIMITS_STATS = [
  { id: 'limits_configured', label: 'Clientes com limites configurados', value: '8', trend: 'flat', icon: 'people-outline' },
  { id: 'limits_within', label: 'Dentro do limite', value: '4', trend: 'flat', icon: 'checkmark-circle-outline' },
  { id: 'limits_near', label: 'Próximos do limite', value: '2', trend: 'flat', icon: 'alert-circle-outline' },
  { id: 'limits_exceeded', label: 'Limite excedido', value: '1', trend: 'flat', icon: 'warning-outline' },
  { id: 'limits_pix_day_total', label: 'Limite diário PIX total concedido', value: 'R$ 125.000,00', trend: 'flat', icon: 'flash-outline' },
];

export const ADMIN_LIMIT_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'within', label: 'Dentro do limite' },
  { id: 'near', label: 'Próximo do limite' },
  { id: 'exceeded', label: 'Limite excedido' },
  { id: 'blocked', label: 'Limites suspensos' },
];

const LIMIT_STATUS_TONE = { within: 'success', near: 'warning', exceeded: 'danger', blocked: 'neutral' };
const LIMIT_STATUS_LABEL = { within: 'Dentro do limite', near: 'Próximo do limite', exceeded: 'Limite excedido', blocked: 'Suspenso (conta bloqueada)' };

export { LIMIT_STATUS_TONE, LIMIT_STATUS_LABEL };

export const ADMIN_LIMITS = [
  { id: 'LIM-0001', client: 'João da Silva', document: '123.456.789-34', account: 'SBX-000123-4', clientType: 'PF',
    pixDayUsed: 'R$ 1.200,00', pixDayLimit: 'R$ 5.000,00', pixDayAvailable: 'R$ 3.800,00', pixDaySummary: 'R$ 1.200,00 / R$ 5.000,00',
    pixNightUsed: 'R$ 0,00', pixNightLimit: 'R$ 1.000,00', pixNightAvailable: 'R$ 1.000,00', pixNightSummary: 'R$ 0,00 / R$ 1.000,00',
    transferUsed: 'R$ 2.000,00', transferLimit: 'R$ 10.000,00', transferAvailable: 'R$ 8.000,00', transferSummary: 'R$ 2.000,00 / R$ 10.000,00',
    withdrawalUsed: 'R$ 300,00', withdrawalLimit: 'R$ 2.000,00', withdrawalAvailable: 'R$ 1.700,00', withdrawalSummary: 'R$ 300,00 / R$ 2.000,00',
    statusKey: 'within', statusLabel: LIMIT_STATUS_LABEL.within, lastReviewAt: '14/02/2025',
    timeline: [{ label: 'Limites padrão definidos na abertura da conta', at: '14/02/2025' }] },
  { id: 'LIM-0002', client: 'Maria Oliveira', document: '987.654.321-12', account: 'SBX-000456-7', clientType: 'PF',
    pixDayUsed: 'R$ 400,00', pixDayLimit: 'R$ 5.000,00', pixDayAvailable: 'R$ 4.600,00', pixDaySummary: 'R$ 400,00 / R$ 5.000,00',
    pixNightUsed: 'R$ 0,00', pixNightLimit: 'R$ 1.000,00', pixNightAvailable: 'R$ 1.000,00', pixNightSummary: 'R$ 0,00 / R$ 1.000,00',
    transferUsed: 'R$ 1.500,00', transferLimit: 'R$ 10.000,00', transferAvailable: 'R$ 8.500,00', transferSummary: 'R$ 1.500,00 / R$ 10.000,00',
    withdrawalUsed: 'R$ 0,00', withdrawalLimit: 'R$ 2.000,00', withdrawalAvailable: 'R$ 2.000,00', withdrawalSummary: 'R$ 0,00 / R$ 2.000,00',
    statusKey: 'within', statusLabel: LIMIT_STATUS_LABEL.within, lastReviewAt: '02/05/2025',
    timeline: [{ label: 'Limites padrão definidos na abertura da conta', at: '02/05/2025' }] },
  { id: 'LIM-0003', client: 'Comércio Pereira Ltda', document: '12.345.678/0001-90', account: 'SBX-000789-1', clientType: 'PJ',
    pixDayUsed: 'R$ 42.000,00', pixDayLimit: 'R$ 50.000,00', pixDayAvailable: 'R$ 8.000,00', pixDaySummary: 'R$ 42.000,00 / R$ 50.000,00',
    pixNightUsed: 'R$ 3.000,00', pixNightLimit: 'R$ 10.000,00', pixNightAvailable: 'R$ 7.000,00', pixNightSummary: 'R$ 3.000,00 / R$ 10.000,00',
    transferUsed: 'R$ 88.000,00', transferLimit: 'R$ 100.000,00', transferAvailable: 'R$ 12.000,00', transferSummary: 'R$ 88.000,00 / R$ 100.000,00',
    withdrawalUsed: 'R$ 4.000,00', withdrawalLimit: 'R$ 10.000,00', withdrawalAvailable: 'R$ 6.000,00', withdrawalSummary: 'R$ 4.000,00 / R$ 10.000,00',
    statusKey: 'near', statusLabel: LIMIT_STATUS_LABEL.near, lastReviewAt: '05/08/2026',
    timeline: [{ label: 'Limites PJ definidos na abertura da conta', at: '19/07/2025' }, { label: 'Limite de transferência revisado — aumento por volume', at: '05/08/2026' }] },
  { id: 'LIM-0004', client: 'Ana Costa', document: '456.789.123-56', account: 'SBX-001012-3', clientType: 'PF',
    pixDayUsed: 'R$ 0,00', pixDayLimit: 'R$ 0,00', pixDayAvailable: 'R$ 0,00', pixDaySummary: 'R$ 0,00 / R$ 0,00',
    pixNightUsed: 'R$ 0,00', pixNightLimit: 'R$ 0,00', pixNightAvailable: 'R$ 0,00', pixNightSummary: 'R$ 0,00 / R$ 0,00',
    transferUsed: 'R$ 0,00', transferLimit: 'R$ 0,00', transferAvailable: 'R$ 0,00', transferSummary: 'R$ 0,00 / R$ 0,00',
    withdrawalUsed: 'R$ 0,00', withdrawalLimit: 'R$ 0,00', withdrawalAvailable: 'R$ 0,00', withdrawalSummary: 'R$ 0,00 / R$ 0,00',
    statusKey: 'blocked', statusLabel: LIMIT_STATUS_LABEL.blocked, lastReviewAt: '29/07/2026',
    timeline: [{ label: 'Limites padrão definidos na abertura da conta', at: '30/09/2025' }, { label: 'Limites suspensos — conta bloqueada por suspeita de fraude', at: '29/07/2026' }] },
  { id: 'LIM-0005', client: 'Lucas Souza', document: '321.654.987-78', account: 'SBX-001345-6', clientType: 'PF',
    pixDayUsed: 'R$ 5.000,00', pixDayLimit: 'R$ 5.000,00', pixDayAvailable: 'R$ 0,00', pixDaySummary: 'R$ 5.000,00 / R$ 5.000,00',
    pixNightUsed: 'R$ 850,00', pixNightLimit: 'R$ 1.000,00', pixNightAvailable: 'R$ 150,00', pixNightSummary: 'R$ 850,00 / R$ 1.000,00',
    transferUsed: 'R$ 9.800,00', transferLimit: 'R$ 10.000,00', transferAvailable: 'R$ 200,00', transferSummary: 'R$ 9.800,00 / R$ 10.000,00',
    withdrawalUsed: 'R$ 1.200,00', withdrawalLimit: 'R$ 2.000,00', withdrawalAvailable: 'R$ 800,00', withdrawalSummary: 'R$ 1.200,00 / R$ 2.000,00',
    statusKey: 'exceeded', statusLabel: LIMIT_STATUS_LABEL.exceeded, lastReviewAt: '17/08/2026',
    timeline: [{ label: 'Limites padrão definidos na abertura da conta', at: '11/11/2025' }, { label: 'Limite diário PIX atingido', at: '17/08/2026' }, { label: 'Solicitação de aumento de limite em análise', at: '17/08/2026' }] },
  { id: 'LIM-0006', client: 'Fernanda Lima', document: '789.123.456-90', account: 'SBX-001678-9', clientType: 'PF',
    pixDayUsed: 'R$ 0,00', pixDayLimit: 'R$ 5.000,00', pixDayAvailable: 'R$ 5.000,00', pixDaySummary: 'R$ 0,00 / R$ 5.000,00',
    pixNightUsed: 'R$ 0,00', pixNightLimit: 'R$ 1.000,00', pixNightAvailable: 'R$ 1.000,00', pixNightSummary: 'R$ 0,00 / R$ 1.000,00',
    transferUsed: 'R$ 0,00', transferLimit: 'R$ 10.000,00', transferAvailable: 'R$ 10.000,00', transferSummary: 'R$ 0,00 / R$ 10.000,00',
    withdrawalUsed: 'R$ 0,00', withdrawalLimit: 'R$ 2.000,00', withdrawalAvailable: 'R$ 2.000,00', withdrawalSummary: 'R$ 0,00 / R$ 2.000,00',
    statusKey: 'within', statusLabel: LIMIT_STATUS_LABEL.within, lastReviewAt: '05/01/2026',
    timeline: [{ label: 'Limites padrão definidos na abertura da conta', at: '05/01/2026' }] },
  { id: 'LIM-0007', client: 'Ricardo Alves', document: '654.321.789-01', account: 'SBX-001901-2', clientType: 'PF',
    pixDayUsed: 'R$ 4.100,00', pixDayLimit: 'R$ 5.000,00', pixDayAvailable: 'R$ 900,00', pixDaySummary: 'R$ 4.100,00 / R$ 5.000,00',
    pixNightUsed: 'R$ 200,00', pixNightLimit: 'R$ 1.000,00', pixNightAvailable: 'R$ 800,00', pixNightSummary: 'R$ 200,00 / R$ 1.000,00',
    transferUsed: 'R$ 3.000,00', transferLimit: 'R$ 10.000,00', transferAvailable: 'R$ 7.000,00', transferSummary: 'R$ 3.000,00 / R$ 10.000,00',
    withdrawalUsed: 'R$ 500,00', withdrawalLimit: 'R$ 2.000,00', withdrawalAvailable: 'R$ 1.500,00', withdrawalSummary: 'R$ 500,00 / R$ 2.000,00',
    statusKey: 'near', statusLabel: LIMIT_STATUS_LABEL.near, lastReviewAt: '22/03/2026',
    timeline: [{ label: 'Limites padrão definidos na abertura da conta', at: '22/03/2026' }] },
  { id: 'LIM-0008', client: 'Comércio Martins ME', document: '98.765.432/0001-10', account: 'SBX-002234-5', clientType: 'PJ',
    pixDayUsed: 'R$ 15.000,00', pixDayLimit: 'R$ 50.000,00', pixDayAvailable: 'R$ 35.000,00', pixDaySummary: 'R$ 15.000,00 / R$ 50.000,00',
    pixNightUsed: 'R$ 1.000,00', pixNightLimit: 'R$ 10.000,00', pixNightAvailable: 'R$ 9.000,00', pixNightSummary: 'R$ 1.000,00 / R$ 10.000,00',
    transferUsed: 'R$ 20.000,00', transferLimit: 'R$ 100.000,00', transferAvailable: 'R$ 80.000,00', transferSummary: 'R$ 20.000,00 / R$ 100.000,00',
    withdrawalUsed: 'R$ 2.000,00', withdrawalLimit: 'R$ 10.000,00', withdrawalAvailable: 'R$ 8.000,00', withdrawalSummary: 'R$ 2.000,00 / R$ 10.000,00',
    statusKey: 'within', statusLabel: LIMIT_STATUS_LABEL.within, lastReviewAt: '08/06/2026',
    timeline: [{ label: 'Limites PJ definidos na abertura da conta', at: '08/06/2026' }] },
];

// ── Tarifas (admin) ──────────────────────────────────────────────────────
// Mocks próprios desta tela — tarifas por produto/serviço. Somente leitura
// nesta etapa: nenhuma ação altera valor ou vigência de tarifa real.
export const ADMIN_FEES_STATS = [
  { id: 'fees_total', label: 'Tarifas cadastradas', value: '19', trend: 'flat', icon: 'pricetag-outline' },
  { id: 'fees_active', label: 'Tarifas ativas', value: '17', trend: 'flat', icon: 'checkmark-circle-outline' },
  { id: 'fees_free', label: 'Tarifas isentas', value: '8', trend: 'flat', icon: 'gift-outline' },
  { id: 'fees_revenue', label: 'Receita estimada em tarifas (mês)', value: 'R$ 21.780,00', delta: '+4,8%', trend: 'up', icon: 'cash-outline' },
];

export const ADMIN_FEE_TABS = [
  { id: 'all', label: 'Todas' },
  { id: 'pix', label: 'PIX' },
  { id: 'transfers', label: 'Transferências' },
  { id: 'payments', label: 'Pagamentos' },
  { id: 'cards', label: 'Cartões' },
  { id: 'investments', label: 'Investimentos' },
  { id: 'account', label: 'Conta' },
];

const FEE_CATEGORY_LABEL = { pix: 'PIX', transfers: 'Transferências', payments: 'Pagamentos', cards: 'Cartões', investments: 'Investimentos', account: 'Conta' };
const FEE_TYPE_LABEL = { free: 'Isenta', fixed: 'Fixa', percentage: 'Percentual' };
const FEE_STATUS_TONE = { active: 'success', inactive: 'neutral' };
const FEE_STATUS_LABEL = { active: 'Ativa', inactive: 'Inativa' };

export { FEE_CATEGORY_LABEL, FEE_TYPE_LABEL, FEE_STATUS_TONE, FEE_STATUS_LABEL };

export const ADMIN_FEES = [
  { id: 'FEE-001', category: 'pix', categoryLabel: FEE_CATEGORY_LABEL.pix, product: 'Transferência PIX (pessoa física)', typeKey: 'free', typeLabel: FEE_TYPE_LABEL.free, value: 'R$ 0,00', charge: 'Por transação', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Sem cobrança de tarifa para transferências PIX enviadas por pessoa física.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-002', category: 'pix', categoryLabel: FEE_CATEGORY_LABEL.pix, product: 'Transferência PIX (pessoa jurídica)', typeKey: 'free', typeLabel: FEE_TYPE_LABEL.free, value: 'R$ 0,00', charge: 'Por transação', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Sem cobrança de tarifa para transferências PIX enviadas por pessoa jurídica.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-003', category: 'pix', categoryLabel: FEE_CATEGORY_LABEL.pix, product: 'Chave PIX adicional (a partir da 6ª chave)', typeKey: 'fixed', typeLabel: FEE_TYPE_LABEL.fixed, value: 'R$ 1,50', charge: 'Por chave cadastrada', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/03/2025', description: 'As primeiras 5 chaves PIX por conta são gratuitas; a partir da 6ª, cobra-se por chave adicional.', timeline: [{ label: 'Tarifa cadastrada', at: '01/03/2025' }] },
  { id: 'FEE-004', category: 'pix', categoryLabel: FEE_CATEGORY_LABEL.pix, product: 'Devolução PIX', typeKey: 'free', typeLabel: FEE_TYPE_LABEL.free, value: 'R$ 0,00', charge: 'Por devolução', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Sem cobrança de tarifa para devolução de valores recebidos via PIX.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-005', category: 'transfers', categoryLabel: FEE_CATEGORY_LABEL.transfers, product: 'TED', typeKey: 'fixed', typeLabel: FEE_TYPE_LABEL.fixed, value: 'R$ 8,90', charge: 'Por transferência', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Tarifa cobrada por transferência TED enviada para outras instituições.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-006', category: 'transfers', categoryLabel: FEE_CATEGORY_LABEL.transfers, product: 'TEF entre contas CTBX', typeKey: 'free', typeLabel: FEE_TYPE_LABEL.free, value: 'R$ 0,00', charge: 'Por transferência', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Sem cobrança de tarifa para transferências internas entre contas CTBX Payments.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-007', category: 'transfers', categoryLabel: FEE_CATEGORY_LABEL.transfers, product: 'DOC', typeKey: 'fixed', typeLabel: FEE_TYPE_LABEL.fixed, value: 'R$ 6,50', charge: 'Por transferência', statusKey: 'inactive', statusLabel: FEE_STATUS_LABEL.inactive, effectiveFrom: '01/01/2025', description: 'Modalidade descontinuada — mantida apenas para consulta histórica.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }, { label: 'Tarifa desativada — modalidade descontinuada', at: '10/03/2026' }] },
  { id: 'FEE-008', category: 'payments', categoryLabel: FEE_CATEGORY_LABEL.payments, product: 'Pagamento de boleto (acima de 5/mês)', typeKey: 'fixed', typeLabel: FEE_TYPE_LABEL.fixed, value: 'R$ 2,90', charge: 'Por boleto', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Os primeiros 5 boletos pagos por mês são gratuitos; a partir do 6º, cobra-se por boleto.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-009', category: 'payments', categoryLabel: FEE_CATEGORY_LABEL.payments, product: 'Pagamento de conta de consumo', typeKey: 'free', typeLabel: FEE_TYPE_LABEL.free, value: 'R$ 0,00', charge: 'Por pagamento', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Sem cobrança de tarifa para pagamento de contas de consumo (água, luz, gás).', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-010', category: 'payments', categoryLabel: FEE_CATEGORY_LABEL.payments, product: 'Recarga de celular', typeKey: 'fixed', typeLabel: FEE_TYPE_LABEL.fixed, value: 'R$ 1,00', charge: 'Por recarga', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/06/2025', description: 'Tarifa de serviço cobrada por recarga de celular pré-pago.', timeline: [{ label: 'Tarifa cadastrada', at: '01/06/2025' }] },
  { id: 'FEE-011', category: 'cards', categoryLabel: FEE_CATEGORY_LABEL.cards, product: 'Anuidade cartão físico', typeKey: 'fixed', typeLabel: FEE_TYPE_LABEL.fixed, value: 'R$ 120,00', charge: 'Anual', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Anuidade cobrada uma vez ao ano para cartões físicos ativos.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-012', category: 'cards', categoryLabel: FEE_CATEGORY_LABEL.cards, product: 'Anuidade cartão virtual', typeKey: 'free', typeLabel: FEE_TYPE_LABEL.free, value: 'R$ 0,00', charge: 'Anual', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Sem cobrança de anuidade para cartões virtuais.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-013', category: 'cards', categoryLabel: FEE_CATEGORY_LABEL.cards, product: 'Saque no crédito (função saque)', typeKey: 'percentage', typeLabel: FEE_TYPE_LABEL.percentage, value: '3,5%', charge: 'Por operação', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Percentual cobrado sobre o valor sacado utilizando a função saque do cartão de crédito.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-014', category: 'cards', categoryLabel: FEE_CATEGORY_LABEL.cards, product: '2ª via de cartão físico', typeKey: 'fixed', typeLabel: FEE_TYPE_LABEL.fixed, value: 'R$ 15,00', charge: 'Por emissão', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Tarifa cobrada na emissão de segunda via de cartão físico.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-015', category: 'cards', categoryLabel: FEE_CATEGORY_LABEL.cards, product: 'Saque em espécie (rede externa)', typeKey: 'percentage', typeLabel: FEE_TYPE_LABEL.percentage, value: '3,0%', charge: 'Por operação', statusKey: 'inactive', statusLabel: FEE_STATUS_LABEL.inactive, effectiveFrom: '01/01/2025', description: 'Substituída pela tarifa de saque no crédito (FEE-013) — mantida apenas para consulta histórica.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }, { label: 'Tarifa desativada — substituída por FEE-013', at: '15/04/2026' }] },
  { id: 'FEE-016', category: 'investments', categoryLabel: FEE_CATEGORY_LABEL.investments, product: 'Resgate antecipado de CDB', typeKey: 'free', typeLabel: FEE_TYPE_LABEL.free, value: 'R$ 0,00', charge: 'Por resgate', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Sem cobrança de tarifa para resgate antecipado de CDB — sujeito às regras de rentabilidade do produto.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-017', category: 'investments', categoryLabel: FEE_CATEGORY_LABEL.investments, product: 'Custódia de fundos de investimento', typeKey: 'percentage', typeLabel: FEE_TYPE_LABEL.percentage, value: '0,5% a.a.', charge: 'Anual, sobre o saldo', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Taxa de administração/custódia cobrada anualmente sobre o saldo aplicado em fundos de investimento.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-018', category: 'account', categoryLabel: FEE_CATEGORY_LABEL.account, product: 'Manutenção de conta PF', typeKey: 'free', typeLabel: FEE_TYPE_LABEL.free, value: 'R$ 0,00', charge: 'Mensal', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Sem cobrança de tarifa de manutenção para contas de pessoa física.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
  { id: 'FEE-019', category: 'account', categoryLabel: FEE_CATEGORY_LABEL.account, product: 'Manutenção de conta PJ', typeKey: 'fixed', typeLabel: FEE_TYPE_LABEL.fixed, value: 'R$ 29,90', charge: 'Mensal', statusKey: 'active', statusLabel: FEE_STATUS_LABEL.active, effectiveFrom: '01/01/2025', description: 'Tarifa mensal de manutenção para contas de pessoa jurídica.', timeline: [{ label: 'Tarifa cadastrada', at: '01/01/2025' }] },
];

// ── Relatórios (admin) ───────────────────────────────────────────────────
// Mocks próprios desta tela — relatórios gerados e resumo por período.
// Somente leitura: nenhum download, exportação ou geração real de arquivo.
export const ADMIN_REPORTS_STATS = [
  { id: 'reports_volume_today', label: 'Volume transacionado hoje', value: 'R$ 421.880,00', trend: 'flat', icon: 'trending-up-outline' },
  { id: 'reports_volume_month', label: 'Volume transacionado no mês', value: 'R$ 10.242.200,00', trend: 'flat', icon: 'bar-chart-outline' },
  { id: 'reports_fees_revenue', label: 'Receita de tarifas no mês', value: 'R$ 21.780,00', delta: '+4,8%', trend: 'up', icon: 'cash-outline' },
  { id: 'reports_active_clients', label: 'Clientes ativos', value: '6', trend: 'flat', icon: 'people-outline' },
  { id: 'reports_failed_tx', label: 'Transações com falha', value: '3', trend: 'flat', icon: 'alert-circle-outline' },
];

// Abas de categoria — 'overview' mostra todos os relatórios, sem filtrar por categoria.
export const ADMIN_REPORT_TABS = [
  { id: 'overview', label: 'Visão geral' },
  { id: 'pix', label: 'PIX' },
  { id: 'transfers', label: 'Transferências' },
  { id: 'payments', label: 'Pagamentos' },
  { id: 'cards', label: 'Cartões' },
  { id: 'investments', label: 'Investimentos' },
  { id: 'clients', label: 'Clientes' },
  { id: 'compliance', label: 'Compliance/KYC' },
];

export const ADMIN_REPORT_STATUS_TABS = [
  { id: 'all', label: 'Todos os status' },
  { id: 'available', label: 'Disponível' },
  { id: 'processing', label: 'Processando' },
  { id: 'failed', label: 'Falha' },
  { id: 'expired', label: 'Expirado' },
];

export const ADMIN_REPORT_PERSON_TABS = [
  { id: 'all', label: 'PF e PJ' },
  { id: 'PF', label: 'Pessoa Física' },
  { id: 'PJ', label: 'Pessoa Jurídica' },
];

export const ADMIN_REPORT_PERIOD_TABS = [
  { id: 'all', label: 'Todos os períodos' },
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: 'month', label: 'Mês atual' },
  { id: 'last_month', label: 'Mês anterior' },
];

const REPORT_STATUS_TONE = { available: 'success', processing: 'warning', failed: 'danger', expired: 'neutral' };
const REPORT_STATUS_LABEL = { available: 'Disponível', processing: 'Processando', failed: 'Falha', expired: 'Expirado' };
const REPORT_PERSON_LABEL = { all: 'Todos (PF e PJ)', PF: 'Pessoa Física', PJ: 'Pessoa Jurídica' };
const REPORT_PERIOD_LABEL = { today: 'Hoje', '7d': 'Últimos 7 dias', month: 'Mês atual', last_month: 'Mês anterior' };

export { REPORT_STATUS_TONE, REPORT_STATUS_LABEL, REPORT_PERSON_LABEL, REPORT_PERIOD_LABEL };

// Um "slot" fixo de período/status/segmento, aplicado a toda categoria — garante
// que cada categoria tenha as 4 janelas de período e os 4 status representados,
// além de registros "Todos"/PF/PJ, para que os filtros combinados quase sempre
// encontrem resultado (só uma combinação bem específica fica vazia).
const REPORT_SLOTS = [
  { periodKey: 'today', statusKey: 'available', personKey: 'all', date: '17/08/2026', hour: 9, minute: 12 },
  { periodKey: 'today', statusKey: 'processing', personKey: 'PF', date: '17/08/2026', hour: 8, minute: 40 },
  { periodKey: '7d', statusKey: 'available', personKey: 'PJ', date: '13/08/2026', hour: 16, minute: 55 },
  { periodKey: '7d', statusKey: 'failed', personKey: 'all', date: '14/08/2026', hour: 10, minute: 5 },
  { periodKey: 'month', statusKey: 'available', personKey: 'PF', date: '05/08/2026', hour: 11, minute: 18 },
  { periodKey: 'month', statusKey: 'expired', personKey: 'PJ', date: '02/08/2026', hour: 18, minute: 10 },
  { periodKey: 'last_month', statusKey: 'available', personKey: 'all', date: '22/07/2026', hour: 8, minute: 20 },
  { periodKey: 'last_month', statusKey: 'failed', personKey: 'PF', date: '21/07/2026', hour: 21, minute: 37 },
];

const REPORT_FILE_SIZES = ['1,2 MB', '780 KB', '340 KB', '1,8 MB', '990 KB', '520 KB', '150 KB', '430 KB'];
const REPORT_FORMATS_CYCLE = ['PDF', 'CSV', 'XLSX'];
const pad2 = (n) => String(n).padStart(2, '0');

function buildReportTimeline(statusKey, requestedAt, generatedAt) {
  if (statusKey === 'processing') return [{ label: 'Relatório solicitado', at: requestedAt }, { label: 'Processamento em andamento', at: requestedAt }];
  if (statusKey === 'failed') return [{ label: 'Relatório solicitado', at: requestedAt }, { label: 'Falha ao gerar relatório — tente novamente', at: requestedAt }];
  if (statusKey === 'expired') return [{ label: 'Relatório solicitado', at: requestedAt }, { label: 'Relatório disponibilizado para download', at: generatedAt }, { label: 'Link expirado após o prazo de retenção', at: generatedAt }];
  return [{ label: 'Relatório solicitado', at: requestedAt }, { label: 'Relatório disponível para download', at: generatedAt }];
}

// categoryOffset desloca minutos/horas de cada categoria (índice × 7) só para
// os horários não ficarem idênticos entre categorias — não afeta os dados reais.
function buildCategoryReports({ categoryKey, categoryLabel, idPrefix, requesters, categoryOffset, types }) {
  return REPORT_SLOTS.map((slot, index) => {
    const minute = (slot.minute + categoryOffset) % 60;
    const hour = (slot.hour + Math.floor((slot.minute + categoryOffset) / 60)) % 24;
    const requestedAt = `${slot.date} ${pad2(hour)}:${pad2(minute)}:00`;
    const isAvailable = slot.statusKey === 'available' || slot.statusKey === 'expired';
    const genMinute = (minute + 2) % 60;
    const genHour = (hour + Math.floor((minute + 2) / 60)) % 24;
    const generatedAt = isAvailable ? `${slot.date} ${pad2(genHour)}:${pad2(genMinute)}:${pad2(20 + index)}` : '—';
    return {
      id: `${idPrefix}-${pad2(index + 1)}`,
      requestedAt,
      type: types[index % types.length],
      categoryKey,
      categoryLabel,
      periodKey: slot.periodKey,
      format: REPORT_FORMATS_CYCLE[index % REPORT_FORMATS_CYCLE.length],
      requestedBy: requesters[index % requesters.length],
      statusKey: slot.statusKey,
      personKey: slot.personKey,
      fileSize: isAvailable ? REPORT_FILE_SIZES[(index + categoryOffset) % REPORT_FILE_SIZES.length] : '—',
      generatedAt,
    };
  });
}

// 8 registros por categoria (dentro da faixa de 6 a 10 pedida), cobrindo hoje/
// últimos 7 dias/mês atual/mês anterior e os 4 status, com tipos de relatório
// próprios de cada módulo.
const REPORT_CATEGORY_DEFS = [
  { categoryKey: 'pix', categoryLabel: 'PIX', idPrefix: 'RPT-PIX', categoryOffset: 0,
    requesters: ['financeiro@ctbxpayments.com', 'operacoes@ctbxpayments.com', 'admin@ctbxpayments.com'],
    types: ['Volume PIX enviado', 'Volume PIX recebido', 'PIX devolvidos', 'PIX com falha', 'Chaves PIX cadastradas', 'QR Codes gerados'] },
  { categoryKey: 'transfers', categoryLabel: 'Transferências', idPrefix: 'RPT-TRF', categoryOffset: 7,
    requesters: ['financeiro@ctbxpayments.com', 'operacoes@ctbxpayments.com'],
    types: ['TED enviadas', 'Transferências recebidas', 'Transferências pendentes', 'Transferências canceladas', 'Transferências com falha'] },
  { categoryKey: 'payments', categoryLabel: 'Pagamentos', idPrefix: 'RPT-PAY', categoryOffset: 14,
    requesters: ['financeiro@ctbxpayments.com', 'operacoes@ctbxpayments.com'],
    types: ['Boletos pagos', 'Contas e convênios', 'Pagamentos agendados', 'Pagamentos pendentes', 'Pagamentos com falha'] },
  { categoryKey: 'cards', categoryLabel: 'Cartões', idPrefix: 'RPT-CRD', categoryOffset: 21,
    requesters: ['financeiro@ctbxpayments.com', 'cartoes@ctbxpayments.com', 'admin@ctbxpayments.com'],
    types: ['Compras aprovadas', 'Compras recusadas', 'Faturas', 'Cartões ativos', 'Cartões bloqueados', 'Cartões virtuais'] },
  { categoryKey: 'investments', categoryLabel: 'Investimentos', idPrefix: 'RPT-INV', categoryOffset: 28,
    requesters: ['investimentos@ctbxpayments.com', 'financeiro@ctbxpayments.com'],
    types: ['Posições', 'Aplicações', 'Resgates', 'Produtos', 'Vencimentos', 'Rentabilidade'] },
  { categoryKey: 'clients', categoryLabel: 'Clientes', idPrefix: 'RPT-CLI', categoryOffset: 35,
    requesters: ['admin@ctbxpayments.com', 'operacoes@ctbxpayments.com'],
    types: ['Clientes ativos', 'Novos clientes', 'Clientes pessoa física (PF)', 'Clientes pessoa jurídica (PJ)', 'Contas abertas', 'Clientes inativos'] },
  { categoryKey: 'compliance', categoryLabel: 'Compliance/KYC', idPrefix: 'RPT-KYC', categoryOffset: 42,
    requesters: ['compliance@ctbxpayments.com', 'admin@ctbxpayments.com'],
    types: ['KYC aprovados', 'KYC pendentes', 'KYC recusados', 'Revisões manuais', 'Alertas de compliance', 'Casos vencidos'] },
];

export const ADMIN_REPORTS = REPORT_CATEGORY_DEFS.flatMap(buildCategoryReports).map((report) => ({
  ...report,
  periodLabel: REPORT_PERIOD_LABEL[report.periodKey],
  statusLabel: REPORT_STATUS_LABEL[report.statusKey],
  personLabel: REPORT_PERSON_LABEL[report.personKey],
  timeline: buildReportTimeline(report.statusKey, report.requestedAt, report.generatedAt),
}));

// Segunda área da tela: resumo comparativo por período, um indicador por linha.
// Reage à aba de categoria selecionada — cada categoria tem seu próprio
// conjunto de indicadores; 'overview' mostra a visão consolidada.
export const ADMIN_REPORT_PERIOD_SUMMARY_BY_CATEGORY = {
  overview: [
    { id: 'summary_pix', indicator: 'Volume PIX', today: 'R$ 128.400,00', last7d: 'R$ 812.900,00', month: 'R$ 3.240.600,00', lastMonth: 'R$ 2.980.150,00', variation: '+8,7%', trend: 'up' },
    { id: 'summary_transfers', indicator: 'Volume Transferências', today: 'R$ 64.200,00', last7d: 'R$ 398.500,00', month: 'R$ 1.650.300,00', lastMonth: 'R$ 1.590.000,00', variation: '+3,8%', trend: 'up' },
    { id: 'summary_payments', indicator: 'Volume Pagamentos', today: 'R$ 41.850,00', last7d: 'R$ 265.700,00', month: 'R$ 1.120.400,00', lastMonth: 'R$ 1.205.600,00', variation: '−7,1%', trend: 'down' },
    { id: 'summary_cards', indicator: 'Volume Cartões', today: 'R$ 187.430,00', last7d: 'R$ 1.045.200,00', month: 'R$ 4.230.900,00', lastMonth: 'R$ 3.870.100,00', variation: '+9,3%', trend: 'up' },
    { id: 'summary_investments', indicator: 'Patrimônio Investimentos', today: 'R$ 2.480.600,00', last7d: '—', month: 'R$ 2.480.600,00', lastMonth: 'R$ 2.365.900,00', variation: '+4,8%', trend: 'up' },
    { id: 'summary_fees', indicator: 'Receita de Tarifas', today: 'R$ 890,00', last7d: 'R$ 5.240,00', month: 'R$ 21.780,00', lastMonth: 'R$ 20.780,00', variation: '+4,8%', trend: 'up' },
    { id: 'summary_new_clients', indicator: 'Novos Clientes', today: '0', last7d: '2', month: '3', lastMonth: '2', variation: '+50,0%', trend: 'up' },
    { id: 'summary_kyc', indicator: 'KYC aprovados', today: '1', last7d: '4', month: '9', lastMonth: '7', variation: '+28,6%', trend: 'up' },
    { id: 'summary_failed_tx', indicator: 'Transações com falha', today: '3', last7d: '11', month: '34', lastMonth: '41', variation: '−17,1%', trend: 'down' },
  ],
  pix: [
    { id: 'pix_sent', indicator: 'Volume PIX enviado', today: 'R$ 128.400,00', last7d: 'R$ 812.900,00', month: 'R$ 3.240.600,00', lastMonth: 'R$ 2.980.150,00', variation: '+8,7%', trend: 'up' },
    { id: 'pix_received', indicator: 'Volume PIX recebido', today: 'R$ 96.700,00', last7d: 'R$ 601.250,00', month: 'R$ 2.480.900,00', lastMonth: 'R$ 2.310.400,00', variation: '+7,4%', trend: 'up' },
    { id: 'pix_returned', indicator: 'PIX devolvidos', today: '2', last7d: '9', month: '31', lastMonth: '27', variation: '+14,8%', trend: 'up' },
    { id: 'pix_failed', indicator: 'PIX com falha', today: '1', last7d: '6', month: '18', lastMonth: '24', variation: '−25,0%', trend: 'down' },
    { id: 'pix_keys', indicator: 'Chaves PIX cadastradas', today: '3', last7d: '14', month: '52', lastMonth: '45', variation: '+15,6%', trend: 'up' },
    { id: 'pix_qr', indicator: 'QR Codes gerados', today: '22', last7d: '148', month: '610', lastMonth: '560', variation: '+8,9%', trend: 'up' },
  ],
  transfers: [
    { id: 'transfers_ted_sent', indicator: 'TED enviadas', today: '8', last7d: '46', month: '190', lastMonth: '172', variation: '+10,5%', trend: 'up' },
    { id: 'transfers_received', indicator: 'Transferências recebidas', today: '5', last7d: '33', month: '140', lastMonth: '128', variation: '+9,4%', trend: 'up' },
    { id: 'transfers_pending', indicator: 'Transferências pendentes', today: '2', last7d: '5', month: '12', lastMonth: '15', variation: '−20,0%', trend: 'down' },
    { id: 'transfers_cancelled', indicator: 'Transferências canceladas', today: '0', last7d: '2', month: '6', lastMonth: '9', variation: '−33,3%', trend: 'down' },
    { id: 'transfers_failed', indicator: 'Transferências com falha', today: '1', last7d: '3', month: '9', lastMonth: '13', variation: '−30,8%', trend: 'down' },
  ],
  payments: [
    { id: 'payments_bills', indicator: 'Boletos pagos', today: '34', last7d: '220', month: '940', lastMonth: '890', variation: '+5,6%', trend: 'up' },
    { id: 'payments_utilities', indicator: 'Contas e convênios', today: '12', last7d: '78', month: '320', lastMonth: '305', variation: '+4,9%', trend: 'up' },
    { id: 'payments_scheduled', indicator: 'Pagamentos agendados', today: '6', last7d: '41', month: '168', lastMonth: '150', variation: '+12,0%', trend: 'up' },
    { id: 'payments_pending', indicator: 'Pagamentos pendentes', today: '3', last7d: '9', month: '22', lastMonth: '28', variation: '−21,4%', trend: 'down' },
    { id: 'payments_failed', indicator: 'Pagamentos com falha', today: '1', last7d: '4', month: '11', lastMonth: '16', variation: '−31,3%', trend: 'down' },
  ],
  cards: [
    { id: 'cards_approved', indicator: 'Compras aprovadas', today: '210', last7d: '1.380', month: '5.640', lastMonth: '5.120', variation: '+10,2%', trend: 'up' },
    { id: 'cards_declined', indicator: 'Compras recusadas', today: '9', last7d: '62', month: '240', lastMonth: '275', variation: '−12,7%', trend: 'down' },
    { id: 'cards_invoices', indicator: 'Faturas emitidas', today: '0', last7d: '180', month: '1.204', lastMonth: '1.180', variation: '+2,0%', trend: 'up' },
    { id: 'cards_active', indicator: 'Cartões ativos', today: '—', last7d: '—', month: '2.318', lastMonth: '2.264', variation: '+2,4%', trend: 'up' },
    { id: 'cards_blocked', indicator: 'Cartões bloqueados', today: '—', last7d: '—', month: '47', lastMonth: '52', variation: '−9,6%', trend: 'down' },
    { id: 'cards_virtual', indicator: 'Cartões virtuais emitidos', today: '4', last7d: '21', month: '88', lastMonth: '74', variation: '+18,9%', trend: 'up' },
  ],
  investments: [
    { id: 'investments_positions', indicator: 'Posições ativas', today: '—', last7d: '—', month: '412', lastMonth: '398', variation: '+3,5%', trend: 'up' },
    { id: 'investments_applications', indicator: 'Aplicações', today: '3', last7d: '18', month: '76', lastMonth: '65', variation: '+16,9%', trend: 'up' },
    { id: 'investments_redemptions', indicator: 'Resgates', today: '1', last7d: '7', month: '29', lastMonth: '34', variation: '−14,7%', trend: 'down' },
    { id: 'investments_products', indicator: 'Produtos disponíveis', today: '—', last7d: '—', month: '6', lastMonth: '6', variation: '0,0%', trend: 'flat' },
    { id: 'investments_maturities', indicator: 'Vencimentos no período', today: '0', last7d: '2', month: '5', lastMonth: '4', variation: '+25,0%', trend: 'up' },
    { id: 'investments_yield', indicator: 'Rentabilidade média', today: '—', last7d: '—', month: '0,92%', lastMonth: '0,88%', variation: '+0,04pp', trend: 'up' },
  ],
  clients: [
    { id: 'clients_active', indicator: 'Clientes ativos', today: '—', last7d: '—', month: '6', lastMonth: '6', variation: '0,0%', trend: 'flat' },
    { id: 'clients_new', indicator: 'Novos clientes', today: '0', last7d: '2', month: '3', lastMonth: '2', variation: '+50,0%', trend: 'up' },
    { id: 'clients_pf', indicator: 'Clientes PF', today: '—', last7d: '—', month: '6', lastMonth: '6', variation: '0,0%', trend: 'flat' },
    { id: 'clients_pj', indicator: 'Clientes PJ', today: '—', last7d: '—', month: '2', lastMonth: '2', variation: '0,0%', trend: 'flat' },
    { id: 'clients_accounts_opened', indicator: 'Contas abertas', today: '0', last7d: '2', month: '3', lastMonth: '2', variation: '+50,0%', trend: 'up' },
    { id: 'clients_inactive', indicator: 'Clientes inativos', today: '—', last7d: '—', month: '1', lastMonth: '1', variation: '0,0%', trend: 'flat' },
  ],
  compliance: [
    { id: 'kyc_approved', indicator: 'KYC aprovados', today: '1', last7d: '4', month: '9', lastMonth: '7', variation: '+28,6%', trend: 'up' },
    { id: 'kyc_pending', indicator: 'KYC pendentes', today: '1', last7d: '2', month: '4', lastMonth: '3', variation: '+33,3%', trend: 'up' },
    { id: 'kyc_rejected', indicator: 'KYC recusados', today: '0', last7d: '1', month: '2', lastMonth: '3', variation: '−33,3%', trend: 'down' },
    { id: 'kyc_manual_review', indicator: 'Revisões manuais', today: '0', last7d: '1', month: '3', lastMonth: '2', variation: '+50,0%', trend: 'up' },
    { id: 'kyc_alerts', indicator: 'Alertas de compliance', today: '1', last7d: '3', month: '8', lastMonth: '10', variation: '−20,0%', trend: 'down' },
    { id: 'kyc_overdue', indicator: 'Casos vencidos', today: '0', last7d: '0', month: '1', lastMonth: '2', variation: '−50,0%', trend: 'down' },
  ],
};

// ── Usuários administrativos (admin) ─────────────────────────────────────
// Mocks próprios desta tela — usuários com acesso ao Painel Admin. Somente
// leitura: nenhuma ação cria, edita, bloqueia ou reseta usuário de verdade.
// Nunca inclui senha, hash, token, segredo, chave MFA ou qualquer credencial —
// só um indicador booleano de MFA ativo/inativo.
export const ADMIN_USERS_STATS = [
  { id: 'users_active', label: 'Administradores ativos', value: '9', trend: 'flat', icon: 'people-outline' },
  { id: 'users_mfa', label: 'Usuários com MFA', value: '10', trend: 'flat', icon: 'shield-checkmark-outline' },
  { id: 'users_access_today', label: 'Acessos hoje', value: '6', trend: 'flat', icon: 'log-in-outline' },
  { id: 'users_blocked', label: 'Usuários bloqueados', value: '2', trend: 'flat', icon: 'lock-closed-outline' },
  { id: 'users_invites_pending', label: 'Convites pendentes', value: '2', trend: 'flat', icon: 'mail-outline' },
];

// Abas mistas: as 3 primeiras filtram por status: as demais filtram por perfil
// (id da aba === profileKey do usuário) — "Administrador" é um perfil válido
// mas, como no brief, não tem aba própria.
export const ADMIN_USER_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Ativos' },
  { id: 'blocked', label: 'Bloqueados' },
  { id: 'pending', label: 'Convites pendentes' },
  { id: 'superadmin', label: 'Super Admin' },
  { id: 'ops', label: 'Operações' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'financeiro', label: 'Financeiro' },
  { id: 'suporte', label: 'Suporte' },
  { id: 'auditor', label: 'Auditoria' },
];

const USER_STATUS_TONE = { active: 'success', blocked: 'danger', pending: 'warning', suspended: 'neutral' };
const USER_STATUS_LABEL = { active: 'Ativo', blocked: 'Bloqueado', pending: 'Convite pendente', suspended: 'Suspenso' };
const USER_PROFILE_LABEL = { superadmin: 'Super Admin', admin: 'Administrador', ops: 'Operações', compliance: 'Compliance', financeiro: 'Financeiro', suporte: 'Suporte', auditor: 'Auditor' };

export { USER_STATUS_TONE, USER_STATUS_LABEL, USER_PROFILE_LABEL };

// Módulos exibidos na seção de permissões do DetailDrawer — todos "somente
// leitura" nesta etapa do painel (não existe permissão de escrita ainda).
const PERMISSION_MODULES = ['Clientes', 'Contas', 'PIX', 'Transferências', 'Pagamentos', 'Investimentos', 'Cartões', 'Compliance/KYC', 'Relatórios', 'Configurações'];

// Mapa perfil → acesso por módulo ('view' | 'none'), refletindo a área de
// atuação de cada perfil. Super Admin e Administrador enxergam tudo.
const PROFILE_ACCESS = {
  superadmin: ['view', 'view', 'view', 'view', 'view', 'view', 'view', 'view', 'view', 'view'],
  admin: ['view', 'view', 'view', 'view', 'view', 'view', 'view', 'view', 'view', 'view'],
  ops: ['view', 'view', 'view', 'view', 'view', 'none', 'view', 'none', 'view', 'none'],
  compliance: ['view', 'view', 'view', 'view', 'none', 'none', 'none', 'view', 'view', 'none'],
  financeiro: ['view', 'view', 'view', 'view', 'view', 'view', 'view', 'none', 'view', 'none'],
  suporte: ['view', 'view', 'view', 'view', 'view', 'none', 'view', 'none', 'none', 'none'],
  auditor: ['view', 'view', 'view', 'view', 'view', 'view', 'view', 'view', 'view', 'none'],
};

function buildUserPermissions(profileKey) {
  const access = PROFILE_ACCESS[profileKey] || PROFILE_ACCESS.admin;
  return PERMISSION_MODULES.map((module, index) => ({ module, access: access[index] === 'view' ? 'Visualizar' : 'Sem acesso' }));
}

export const ADMIN_USERS = [
  { id: 'ADMU-001', name: 'Ana Beatriz Ramos', email: 'ana.ramos@ctbxpayments.com', role: 'Diretora de Operações', profileKey: 'superadmin', statusKey: 'active', mfaEnabled: true, createdAt: '10/01/2025', lastAccessAt: '17/08/2026 07:58:12', lastAccessIp: '203.0.113.10', device: 'Chrome 128 · macOS',
    timeline: [{ label: 'Conta criada e convite aceito', at: '10/01/2025' }, { label: 'MFA ativado', at: '10/01/2025' }, { label: 'Login realizado', at: '17/08/2026 07:58:12' }] },
  { id: 'ADMU-002', name: 'Marina Castilho', email: 'marina.castilho@ctbxpayments.com', role: 'Head de Produto', profileKey: 'superadmin', statusKey: 'active', mfaEnabled: true, createdAt: '22/01/2025', lastAccessAt: '16/08/2026 18:20:40', lastAccessIp: '198.51.100.22', device: 'Safari 18 · macOS',
    timeline: [{ label: 'Conta criada e convite aceito', at: '22/01/2025' }, { label: 'MFA ativado', at: '22/01/2025' }, { label: 'Login realizado', at: '16/08/2026 18:20:40' }] },
  { id: 'ADMU-003', name: 'Carlos Eduardo Mendes', email: 'carlos.mendes@ctbxpayments.com', role: 'Gerente de Plataforma', profileKey: 'admin', statusKey: 'active', mfaEnabled: true, createdAt: '05/02/2025', lastAccessAt: '17/08/2026 08:10:05', lastAccessIp: '203.0.113.44', device: 'Chrome 128 · Windows',
    timeline: [{ label: 'Conta criada e convite aceito', at: '05/02/2025' }, { label: 'MFA ativado', at: '06/02/2025' }, { label: 'Login realizado', at: '17/08/2026 08:10:05' }] },
  { id: 'ADMU-004', name: 'Ana Paula Costa', email: 'anapaula.costa@ctbxpayments.com', role: 'Analista Administrativa', profileKey: 'admin', statusKey: 'pending', mfaEnabled: false, createdAt: '16/08/2026', lastAccessAt: '—', lastAccessIp: '—', device: '—',
    timeline: [{ label: 'Convite enviado', at: '16/08/2026 14:00:00' }, { label: 'Aguardando aceite do convite', at: '16/08/2026 14:00:00' }] },
  { id: 'ADMU-005', name: 'Juliana Prado', email: 'juliana.prado@ctbxpayments.com', role: 'Coordenadora de Operações', profileKey: 'ops', statusKey: 'active', mfaEnabled: true, createdAt: '18/02/2025', lastAccessAt: '17/08/2026 08:22:47', lastAccessIp: '203.0.113.61', device: 'Edge 128 · Windows',
    timeline: [{ label: 'Conta criada e convite aceito', at: '18/02/2025' }, { label: 'MFA ativado', at: '18/02/2025' }, { label: 'Login realizado', at: '17/08/2026 08:22:47' }] },
  { id: 'ADMU-006', name: 'Eduardo Martins', email: 'eduardo.martins@ctbxpayments.com', role: 'Analista de Operações Sênior', profileKey: 'ops', statusKey: 'blocked', mfaEnabled: true, createdAt: '02/03/2025', lastAccessAt: '10/08/2026 11:30:00', lastAccessIp: '198.51.100.9', device: 'Chrome 127 · Windows',
    timeline: [{ label: 'Conta criada e convite aceito', at: '02/03/2025' }, { label: 'Login realizado', at: '10/08/2026 11:30:00' }, { label: 'Usuário bloqueado — atividade incomum na conta', at: '11/08/2026 09:15:00' }] },
  { id: 'ADMU-007', name: 'Camila Torres', email: 'camila.torres@ctbxpayments.com', role: 'Analista de Compliance Sênior', profileKey: 'compliance', statusKey: 'active', mfaEnabled: true, createdAt: '14/03/2025', lastAccessAt: '17/08/2026 09:05:33', lastAccessIp: '203.0.113.77', device: 'Chrome 128 · macOS',
    timeline: [{ label: 'Conta criada e convite aceito', at: '14/03/2025' }, { label: 'MFA ativado', at: '14/03/2025' }, { label: 'Login realizado', at: '17/08/2026 09:05:33' }] },
  { id: 'ADMU-008', name: 'Marcos Vinícius Lopes', email: 'marcos.lopes@ctbxpayments.com', role: 'Especialista em Compliance', profileKey: 'compliance', statusKey: 'suspended', mfaEnabled: true, createdAt: '30/03/2025', lastAccessAt: '05/08/2026 16:40:00', lastAccessIp: '198.51.100.33', device: 'Firefox 129 · Linux',
    timeline: [{ label: 'Conta criada e convite aceito', at: '30/03/2025' }, { label: 'Login realizado', at: '05/08/2026 16:40:00' }, { label: 'Usuário suspenso — revisão periódica de acesso', at: '06/08/2026 10:00:00' }] },
  { id: 'ADMU-009', name: 'Patrícia Nogueira', email: 'patricia.nogueira@ctbxpayments.com', role: 'Gerente Financeira', profileKey: 'financeiro', statusKey: 'active', mfaEnabled: true, createdAt: '11/04/2025', lastAccessAt: '17/08/2026 09:40:18', lastAccessIp: '203.0.113.88', device: 'Chrome 128 · macOS',
    timeline: [{ label: 'Conta criada e convite aceito', at: '11/04/2025' }, { label: 'MFA ativado', at: '11/04/2025' }, { label: 'Login realizado', at: '17/08/2026 09:40:18' }] },
  { id: 'ADMU-010', name: 'Diego Ferreira', email: 'diego.ferreira@ctbxpayments.com', role: 'Analista Financeiro', profileKey: 'financeiro', statusKey: 'active', mfaEnabled: false, createdAt: '25/04/2025', lastAccessAt: '15/08/2026 13:12:00', lastAccessIp: '198.51.100.51', device: 'Chrome 128 · Windows',
    timeline: [{ label: 'Conta criada e convite aceito', at: '25/04/2025' }, { label: 'Login realizado', at: '15/08/2026 13:12:00' }] },
  { id: 'ADMU-011', name: 'Bianca Souza', email: 'bianca.souza@ctbxpayments.com', role: 'Especialista de Suporte N2', profileKey: 'suporte', statusKey: 'active', mfaEnabled: false, createdAt: '09/05/2025', lastAccessAt: '17/08/2026 10:15:52', lastAccessIp: '203.0.113.101', device: 'Chrome 128 · macOS',
    timeline: [{ label: 'Conta criada e convite aceito', at: '09/05/2025' }, { label: 'Login realizado', at: '17/08/2026 10:15:52' }] },
  { id: 'ADMU-012', name: 'Felipe Rocha', email: 'felipe.rocha@ctbxpayments.com', role: 'Analista de Suporte N1', profileKey: 'suporte', statusKey: 'pending', mfaEnabled: false, createdAt: '17/08/2026', lastAccessAt: '—', lastAccessIp: '—', device: '—',
    timeline: [{ label: 'Convite enviado', at: '17/08/2026 09:00:00' }, { label: 'Aguardando aceite do convite', at: '17/08/2026 09:00:00' }] },
  { id: 'ADMU-013', name: 'Renata Almeida', email: 'renata.almeida@ctbxpayments.com', role: 'Auditora Interna Sênior', profileKey: 'auditor', statusKey: 'active', mfaEnabled: true, createdAt: '20/05/2025', lastAccessAt: '16/08/2026 20:05:00', lastAccessIp: '198.51.100.67', device: 'Edge 128 · Windows',
    timeline: [{ label: 'Conta criada e convite aceito', at: '20/05/2025' }, { label: 'MFA ativado', at: '20/05/2025' }, { label: 'Login realizado', at: '16/08/2026 20:05:00' }] },
  { id: 'ADMU-014', name: 'Thiago Barbosa', email: 'thiago.barbosa@ctbxpayments.com', role: 'Auditor Interno', profileKey: 'auditor', statusKey: 'blocked', mfaEnabled: true, createdAt: '03/06/2025', lastAccessAt: '01/08/2026 09:00:00', lastAccessIp: '203.0.113.120', device: 'Chrome 126 · Windows',
    timeline: [{ label: 'Conta criada e convite aceito', at: '03/06/2025' }, { label: 'Login realizado', at: '01/08/2026 09:00:00' }, { label: 'Usuário bloqueado — múltiplas tentativas de login com MFA inválido', at: '02/08/2026 07:45:00' }] },
].map((user) => ({
  ...user,
  profileLabel: USER_PROFILE_LABEL[user.profileKey],
  statusLabel: USER_STATUS_LABEL[user.statusKey],
  mfaLabel: user.mfaEnabled ? 'Ativo' : 'Inativo',
  permissions: buildUserPermissions(user.profileKey),
}));

// ── Configurações (admin) ─────────────────────────────────────────────────
// Mocks próprios desta tela — parâmetros da plataforma organizados por aba.
// Somente leitura: nenhuma ação altera configuração real. Nunca inclui
// segredo, chave de API, token ou credencial — "API base" e "commit/hash"
// aparecem mascarados/estruturais.
export const ADMIN_SETTINGS_TABS = [
  { id: 'general', label: 'Geral' },
  { id: 'operations', label: 'Operações' },
  { id: 'pix', label: 'PIX' },
  { id: 'transfers', label: 'Transferências' },
  { id: 'payments', label: 'Pagamentos' },
  { id: 'cards', label: 'Cartões' },
  { id: 'investments', label: 'Investimentos' },
  { id: 'security', label: 'Segurança' },
  { id: 'notifications', label: 'Notificações' },
  { id: 'integrations', label: 'Integrações' },
  { id: 'environment', label: 'Ambiente' },
];

const SETTINGS_STATUS_TONE = { active: 'success', inactive: 'neutral', configured: 'info', required: 'warning', info: 'neutral' };
const SETTINGS_STATUS_LABEL = { active: 'Ativo', inactive: 'Inativo', configured: 'Configurado', required: 'Obrigatório', info: 'Informativo' };
const INTEGRATION_STATUS_TONE = { connected: 'success', degraded: 'warning', disconnected: 'danger' };
const INTEGRATION_STATUS_LABEL = { connected: 'Conectado', degraded: 'Degradado', disconnected: 'Desconectado' };

export { SETTINGS_STATUS_TONE, SETTINGS_STATUS_LABEL, INTEGRATION_STATUS_TONE, INTEGRATION_STATUS_LABEL };

function withSettingMeta(tabId, items) {
  return items.map((item, index) => ({ id: `${tabId}-${index + 1}`, ...item, statusLabel: SETTINGS_STATUS_LABEL[item.statusKey] }));
}

// Cada item: { name, description, value, statusKey, lastChangedAt, changedBy }
// — os 6 campos pedidos no brief (nome/descrição/valor atual/status/última
// alteração/alterado por) para cada card de configuração.
export const ADMIN_SETTINGS_BY_TAB = {
  general: withSettingMeta('general', [
    { name: 'Nome da instituição', description: 'Razão social exibida no painel e nos comprovantes.', value: 'CTBX Payments', statusKey: 'configured', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
    { name: 'Moeda principal', description: 'Moeda padrão para saldos, limites e comprovantes.', value: 'BRL (Real brasileiro)', statusKey: 'configured', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
    { name: 'Fuso horário', description: 'Fuso usado para exibir datas e horários no painel.', value: 'America/Sao_Paulo (UTC-3)', statusKey: 'configured', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
    { name: 'Idioma', description: 'Idioma padrão da interface administrativa.', value: 'Português (Brasil)', statusKey: 'configured', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
    { name: 'Identificador do ambiente', description: 'Identificador interno usado para rastrear o ambiente nos logs.', value: 'ctbx-sandbox-01', statusKey: 'info', lastChangedAt: '10/01/2025', changedBy: 'sistema' },
    { name: 'Versão do painel', description: 'Versão atual do Painel Administrativo.', value: 'Admin v0.1.0 · estrutural', statusKey: 'info', lastChangedAt: '17/08/2026', changedBy: 'sistema' },
    { name: 'Status da plataforma', description: 'Status operacional geral da plataforma CTBX Payments.', value: 'Operacional', statusKey: 'active', lastChangedAt: '17/08/2026', changedBy: 'sistema' },
  ]),
  operations: withSettingMeta('operations', [
    { name: 'Horário operacional', description: 'Janela em que novas operações são processadas em tempo real.', value: '06:00 às 22:00', statusKey: 'configured', lastChangedAt: '14/02/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
    { name: 'Processamento em dias úteis', description: 'Define se operações fora do horário útil aguardam o próximo dia útil.', value: 'Segunda a sexta, exceto feriados nacionais', statusKey: 'configured', lastChangedAt: '14/02/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
    { name: 'Limite global diário', description: 'Teto de movimentação diária somando todos os produtos.', value: 'R$ 5.000.000,00', statusKey: 'configured', lastChangedAt: '12/08/2026', changedBy: 'ana.ramos@ctbxpayments.com' },
    { name: 'Liquidação automática', description: 'Liquidação automática das operações aprovadas ao final do processamento.', value: 'Ativada', statusKey: 'active', lastChangedAt: '14/02/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
    { name: 'Aprovação manual para operações excepcionais', description: 'Operações acima do limite padrão exigem aprovação manual da equipe de operações.', value: 'Ativada acima de R$ 100.000,00', statusKey: 'active', lastChangedAt: '14/02/2025', changedBy: 'juliana.prado@ctbxpayments.com' },
    { name: 'Janela de manutenção', description: 'Horário reservado para manutenção programada da plataforma.', value: 'Domingos, 02:00 às 04:00', statusKey: 'configured', lastChangedAt: '14/02/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  ]),
  pix: withSettingMeta('pix', [
    { name: 'PIX ativo', description: 'Habilita o produto PIX para todos os clientes.', value: 'Ativado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Limite por transação', description: 'Valor máximo permitido em uma única transação PIX.', value: 'R$ 20.000,00', statusKey: 'configured', lastChangedAt: '18/02/2025', changedBy: 'juliana.prado@ctbxpayments.com' },
    { name: 'Limite diário', description: 'Valor máximo movimentado em PIX por conta, por dia.', value: 'R$ 5.000,00 (PF) · R$ 50.000,00 (PJ)', statusKey: 'configured', lastChangedAt: '18/02/2025', changedBy: 'juliana.prado@ctbxpayments.com' },
    { name: 'Limite noturno', description: 'Valor máximo movimentado em PIX durante o horário noturno.', value: 'R$ 1.000,00 (PF) · R$ 10.000,00 (PJ)', statusKey: 'configured', lastChangedAt: '18/02/2025', changedBy: 'juliana.prado@ctbxpayments.com' },
    { name: 'Horário noturno', description: 'Janela considerada horário noturno para fins de limite reduzido.', value: '20:00 às 06:00', statusKey: 'configured', lastChangedAt: '18/02/2025', changedBy: 'juliana.prado@ctbxpayments.com' },
    { name: 'QR Code dinâmico', description: 'Permite geração de QR Code PIX dinâmico com valor e vencimento.', value: 'Habilitado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Chaves PIX permitidas por conta', description: 'Quantidade de chaves PIX que uma conta pode cadastrar.', value: '5 chaves gratuitas + adicionais tarifados', statusKey: 'configured', lastChangedAt: '08/08/2026', changedBy: 'juliana.prado@ctbxpayments.com' },
    { name: 'Devolução PIX', description: 'Permite solicitar devolução total ou parcial de um PIX recebido.', value: 'Habilitada', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Tempo de expiração de QR Code', description: 'Tempo até um QR Code PIX estático/dinâmico expirar.', value: '30 minutos', statusKey: 'configured', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
  ]),
  transfers: withSettingMeta('transfers', [
    { name: 'TED habilitada', description: 'Permite transferências TED para outras instituições.', value: 'Habilitada', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'TEF habilitada', description: 'Permite transferências eletrônicas entre contas de outras instituições participantes.', value: 'Habilitada', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Transferência entre contas CTBX', description: 'Permite transferência interna instantânea entre contas CTBX Payments.', value: 'Habilitada, sem tarifa', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Limite por operação', description: 'Valor máximo permitido em uma única transferência.', value: 'R$ 50.000,00', statusKey: 'configured', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Limite diário', description: 'Valor máximo movimentado em transferências por conta, por dia.', value: 'R$ 10.000,00 (PF) · R$ 100.000,00 (PJ)', statusKey: 'configured', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Horário limite para envio no mesmo dia', description: 'Horário limite para uma TED ser processada no mesmo dia útil.', value: '17:00', statusKey: 'configured', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Aprovação manual acima de valor', description: 'Transferências acima do valor definido exigem aprovação manual.', value: 'Ativada acima de R$ 50.000,00', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
  ]),
  payments: withSettingMeta('payments', [
    { name: 'Pagamento de boletos', description: 'Permite pagamento de boletos registrados.', value: 'Habilitado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Contas de consumo', description: 'Permite pagamento de contas de água, luz e gás.', value: 'Habilitado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Convênios', description: 'Permite pagamento de convênios e tributos (DARF, GPS, FGTS).', value: 'Habilitado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Agendamento de pagamentos', description: 'Permite agendar pagamentos para uma data futura.', value: 'Habilitado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Limite por pagamento', description: 'Valor máximo permitido em um único pagamento.', value: 'R$ 30.000,00', statusKey: 'configured', lastChangedAt: '01/08/2026', changedBy: 'patricia.nogueira@ctbxpayments.com' },
    { name: 'Limite diário', description: 'Valor máximo movimentado em pagamentos por conta, por dia.', value: 'R$ 8.000,00 (PF) · R$ 80.000,00 (PJ)', statusKey: 'configured', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Prazo máximo de agendamento', description: 'Prazo máximo no futuro para agendar um pagamento.', value: '90 dias', statusKey: 'configured', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
  ]),
  cards: withSettingMeta('cards', [
    { name: 'Cartões físicos', description: 'Permite emissão de cartões físicos.', value: 'Habilitado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Cartões virtuais', description: 'Permite emissão de cartões virtuais.', value: 'Habilitado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Compras online', description: 'Permite compras online (cartão não presente).', value: 'Habilitado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Compras internacionais', description: 'Permite compras em moeda estrangeira ou fora do Brasil.', value: 'Desabilitado por padrão · liberação sob solicitação', statusKey: 'inactive', lastChangedAt: '16/08/2026', changedBy: 'carlos.mendes@ctbxpayments.com' },
    { name: 'Contactless', description: 'Permite pagamento por aproximação (contactless).', value: 'Habilitado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Saque', description: 'Permite saque em espécie usando a função crédito do cartão.', value: 'Habilitado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Limite padrão de cartão', description: 'Limite de crédito padrão para novos cartões.', value: 'R$ 2.000,00 (PF) · R$ 15.000,00 (PJ)', statusKey: 'configured', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Bloqueio automático por risco', description: 'Bloqueia automaticamente o cartão diante de padrão de transação suspeito.', value: 'Ativado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
  ]),
  investments: withSettingMeta('investments', [
    { name: 'Investimentos habilitados', description: 'Habilita o módulo de investimentos para clientes elegíveis.', value: 'Habilitado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Perfil de investidor obrigatório', description: 'Exige questionário de perfil de investidor antes da primeira aplicação.', value: 'Obrigatório', statusKey: 'required', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Valor mínimo de aplicação', description: 'Valor mínimo permitido por aplicação em produtos de investimento.', value: 'R$ 100,00', statusKey: 'configured', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Resgate antecipado', description: 'Permite resgate antecipado de produtos com liquidez diária ou D+1.', value: 'Habilitado, conforme regra de cada produto', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Produtos ativos', description: 'Quantidade de produtos de investimento disponíveis para aplicação.', value: '6 produtos', statusKey: 'configured', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Horário de corte', description: 'Horário limite para uma aplicação ser processada no mesmo dia.', value: '16:30', statusKey: 'configured', lastChangedAt: '22/07/2026', changedBy: 'patricia.nogueira@ctbxpayments.com' },
  ]),
  security: withSettingMeta('security', [
    { name: 'MFA obrigatório para administradores', description: 'Exige autenticação multifator para todo login no Painel Admin.', value: 'Obrigatório', statusKey: 'required', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Tempo de sessão', description: 'Tempo de inatividade até a sessão administrativa expirar.', value: '30 minutos', statusKey: 'configured', lastChangedAt: '10/08/2026', changedBy: 'camila.torres@ctbxpayments.com' },
    { name: 'Tentativas máximas de login', description: 'Número de tentativas de login incorretas antes do bloqueio temporário.', value: '5 tentativas', statusKey: 'configured', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Bloqueio por IP', description: 'Bloqueia temporariamente o IP após excesso de tentativas malsucedidas.', value: 'Ativado · bloqueio de 15 minutos', statusKey: 'active', lastChangedAt: '28/07/2026', changedBy: 'ana.ramos@ctbxpayments.com' },
    { name: 'Política de senha', description: 'Requisitos mínimos para senha de acesso administrativo.', value: 'Mínimo 12 caracteres, com letras, números e símbolos', statusKey: 'configured', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Logs de acesso', description: 'Registra todo login e ação administrativa relevante.', value: 'Ativado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Retenção dos logs', description: 'Tempo de retenção dos logs de acesso e auditoria.', value: '180 dias', statusKey: 'configured', lastChangedAt: '15/08/2026', changedBy: 'ana.ramos@ctbxpayments.com' },
    { name: 'Detecção de dispositivo novo', description: 'Alerta quando um administrador acessa de um dispositivo não reconhecido.', value: 'Ativada', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
  ]),
  notifications: withSettingMeta('notifications', [
    { name: 'E-mail transacional', description: 'Envio de e-mail para eventos transacionais do cliente.', value: 'Ativado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Push', description: 'Envio de notificações push pelo aplicativo.', value: 'Ativado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'SMS', description: 'Envio de SMS para eventos críticos (ex.: OTP, alertas de segurança).', value: 'Ativado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Alertas administrativos', description: 'Notificações internas para a equipe administrativa.', value: 'Ativado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Alertas de falha PIX', description: 'Notifica a equipe operacional em caso de falha recorrente de PIX.', value: 'Ativado', statusKey: 'active', lastChangedAt: '05/08/2026', changedBy: 'juliana.prado@ctbxpayments.com' },
    { name: 'Alertas de KYC', description: 'Notifica a equipe de compliance sobre novas solicitações e pendências de KYC.', value: 'Ativado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
    { name: 'Alertas de segurança', description: 'Notifica a equipe de segurança sobre eventos suspeitos.', value: 'Ativado', statusKey: 'active', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
  ]),
  environment: withSettingMeta('environment', [
    { name: 'Ambiente atual', description: 'Ambiente de execução atual do Painel Admin e da API.', value: 'SANDBOX', statusKey: 'info', lastChangedAt: '17/08/2026', changedBy: 'sistema' },
    { name: 'API base', description: 'Endpoint base da API, mascarado por segurança.', value: 'https://api.sandbox.ctbxpayments.com/••••', statusKey: 'info', lastChangedAt: '17/08/2026', changedBy: 'sistema' },
    { name: 'Backend status', description: 'Status operacional do serviço de backend.', value: 'Operacional', statusKey: 'active', lastChangedAt: '17/08/2026', changedBy: 'sistema' },
    { name: 'Frontend status', description: 'Status operacional do aplicativo web/mobile.', value: 'Operacional', statusKey: 'active', lastChangedAt: '17/08/2026', changedBy: 'sistema' },
    { name: 'Versão da API', description: 'Versão atual da API consumida pelo painel.', value: 'v1.4.2', statusKey: 'info', lastChangedAt: '17/08/2026', changedBy: 'sistema' },
    { name: 'Região', description: 'Região de infraestrutura onde o ambiente está hospedado.', value: 'sa-east-1 (São Paulo)', statusKey: 'info', lastChangedAt: '10/01/2025', changedBy: 'sistema' },
    { name: 'Último deploy', description: 'Data e hora do último deploy realizado neste ambiente.', value: '17/08/2026 07:30:00', statusKey: 'info', lastChangedAt: '17/08/2026', changedBy: 'sistema' },
    { name: 'Commit/hash', description: 'Identificador curto do commit em produção neste ambiente (estrutural).', value: 'a1b2c3d', statusKey: 'info', lastChangedAt: '17/08/2026', changedBy: 'sistema' },
    { name: 'Modo de manutenção', description: 'Quando ativado, bloqueia novas operações para manutenção programada.', value: 'Desativado', statusKey: 'inactive', lastChangedAt: '01/01/2025', changedBy: 'sistema' },
  ]),
};

function withIntegrationMeta(items) {
  return items.map((item, index) => ({ id: `integration-${index + 1}`, ...item, statusLabel: INTEGRATION_STATUS_LABEL[item.statusKey] }));
}

// Aba Integrações tem forma própria (não é o card genérico de configuração) —
// nunca mostra URL secreta, API key, token ou credencial, só status mock.
export const ADMIN_SETTINGS_INTEGRATIONS = withIntegrationMeta([
  { name: 'Core Banking', statusKey: 'connected', environment: 'Sandbox', lastSyncAt: '17/08/2026 08:00:00', latency: '82 ms', availability: '99,95%' },
  { name: 'PIX', statusKey: 'connected', environment: 'Sandbox', lastSyncAt: '17/08/2026 08:05:00', latency: '64 ms', availability: '99,98%' },
  { name: 'KYC', statusKey: 'connected', environment: 'Sandbox', lastSyncAt: '17/08/2026 07:50:00', latency: '210 ms', availability: '99,80%' },
  { name: 'Cartões', statusKey: 'connected', environment: 'Sandbox', lastSyncAt: '17/08/2026 08:02:00', latency: '110 ms', availability: '99,90%' },
  { name: 'Notificações', statusKey: 'degraded', environment: 'Sandbox', lastSyncAt: '17/08/2026 07:40:00', latency: '340 ms', availability: '98,60%' },
  { name: 'Investimentos', statusKey: 'connected', environment: 'Sandbox', lastSyncAt: '17/08/2026 07:58:00', latency: '95 ms', availability: '99,92%' },
]);

// Histórico recente de alterações — consolidado, não filtrado por aba.
export const ADMIN_SETTINGS_CHANGE_HISTORY = [
  { id: 'chg-01', at: '17/08/2026 07:30:00', setting: 'Versão do painel', previousValue: 'Admin v0.0.9', newValue: 'Admin v0.1.0 · estrutural', user: 'sistema', environment: 'Sandbox' },
  { id: 'chg-02', at: '16/08/2026 14:00:00', setting: 'Compras internacionais', previousValue: 'Habilitado', newValue: 'Desabilitado por padrão', user: 'carlos.mendes@ctbxpayments.com', environment: 'Sandbox' },
  { id: 'chg-03', at: '15/08/2026 10:20:00', setting: 'Retenção dos logs', previousValue: '90 dias', newValue: '180 dias', user: 'ana.ramos@ctbxpayments.com', environment: 'Sandbox' },
  { id: 'chg-04', at: '12/08/2026 09:15:00', setting: 'Limite global diário', previousValue: 'R$ 3.000.000,00', newValue: 'R$ 5.000.000,00', user: 'ana.ramos@ctbxpayments.com', environment: 'Sandbox' },
  { id: 'chg-05', at: '10/08/2026 16:45:00', setting: 'Tempo de sessão', previousValue: '60 minutos', newValue: '30 minutos', user: 'camila.torres@ctbxpayments.com', environment: 'Sandbox' },
  { id: 'chg-06', at: '08/08/2026 11:00:00', setting: 'Chaves PIX permitidas por conta', previousValue: '3 chaves gratuitas', newValue: '5 chaves gratuitas', user: 'juliana.prado@ctbxpayments.com', environment: 'Sandbox' },
  { id: 'chg-07', at: '05/08/2026 13:30:00', setting: 'Alertas de falha PIX', previousValue: 'Desativado', newValue: 'Ativado', user: 'juliana.prado@ctbxpayments.com', environment: 'Sandbox' },
  { id: 'chg-08', at: '01/08/2026 09:50:00', setting: 'Limite por pagamento', previousValue: 'R$ 20.000,00', newValue: 'R$ 30.000,00', user: 'patricia.nogueira@ctbxpayments.com', environment: 'Sandbox' },
  { id: 'chg-09', at: '28/07/2026 15:10:00', setting: 'Bloqueio por IP', previousValue: 'Desativado', newValue: 'Ativado · bloqueio de 15 minutos', user: 'ana.ramos@ctbxpayments.com', environment: 'Sandbox' },
  { id: 'chg-10', at: '22/07/2026 08:40:00', setting: 'Horário de corte', previousValue: '15:00', newValue: '16:30', user: 'patricia.nogueira@ctbxpayments.com', environment: 'Sandbox' },
];

// ── Logs / Auditoria (admin) ──────────────────────────────────────────────
// Mocks próprios desta tela — trilha de auditoria estrutural/sandbox.
// Somente leitura: nenhuma ação real de alteração/exclusão. Nunca inclui
// senha, token, API key, secret, credencial, hash completo ou dado completo
// de cartão — IP sempre mascarado, número de cartão nunca aparece.
export const ADMIN_AUDIT_STATS = [
  { id: 'audit_today', label: 'Eventos hoje', value: '24', trend: 'flat', icon: 'time-outline' },
  { id: 'audit_admin_actions', label: 'Ações administrativas', value: '34', trend: 'flat', icon: 'construct-outline' },
  { id: 'audit_security_events', label: 'Eventos de segurança', value: '8', trend: 'flat', icon: 'shield-checkmark-outline' },
  { id: 'audit_failures', label: 'Falhas/erros', value: '24', trend: 'flat', icon: 'alert-circle-outline' },
  { id: 'audit_active_users', label: 'Usuários ativos', value: '9', trend: 'flat', icon: 'people-outline' },
];

// 'all' mostra todos os eventos; as demais filtram por categoryKey do evento.
export const ADMIN_AUDIT_CATEGORY_TABS = [
  { id: 'all', label: 'Todos' },
  { id: 'auth', label: 'Autenticação' },
  { id: 'users', label: 'Usuários' },
  { id: 'clients', label: 'Clientes' },
  { id: 'accounts', label: 'Contas' },
  { id: 'pix', label: 'PIX' },
  { id: 'transfers', label: 'Transferências' },
  { id: 'payments', label: 'Pagamentos' },
  { id: 'cards', label: 'Cartões' },
  { id: 'compliance', label: 'Compliance/KYC' },
  { id: 'settings', label: 'Configurações' },
  { id: 'security', label: 'Segurança' },
  { id: 'system', label: 'Sistema' },
];

export const ADMIN_AUDIT_STATUS_TABS = [
  { id: 'all', label: 'Todos os status' },
  { id: 'success', label: 'Sucesso' },
  { id: 'alert', label: 'Alerta' },
  { id: 'failure', label: 'Falha' },
];

export const ADMIN_AUDIT_PERIOD_TABS = [
  { id: 'all', label: 'Todos os períodos' },
  { id: 'today', label: 'Hoje' },
  { id: '7d', label: 'Últimos 7 dias' },
  { id: 'month', label: 'Mês atual' },
  { id: 'last_month', label: 'Mês anterior' },
];

const AUDIT_STATUS_TONE = { success: 'success', alert: 'warning', failure: 'danger' };
const AUDIT_STATUS_LABEL = { success: 'Sucesso', alert: 'Alerta', failure: 'Falha' };
const AUDIT_PERIOD_LABEL = { today: 'Hoje', '7d': 'Últimos 7 dias', month: 'Mês atual', last_month: 'Mês anterior' };

export { AUDIT_STATUS_TONE, AUDIT_STATUS_LABEL, AUDIT_PERIOD_LABEL };

// Mesmo princípio de "slot" fixo usado em Relatórios — garante as 4 janelas
// de período e os 3 status em toda categoria, pra nenhuma aba/filtro ficar
// vazio à toa.
const AUDIT_SLOTS = [
  { periodKey: 'today', statusKey: 'success', date: '17/08/2026', hour: 8, minute: 5 },
  { periodKey: 'today', statusKey: 'alert', date: '17/08/2026', hour: 9, minute: 20 },
  { periodKey: '7d', statusKey: 'success', date: '14/08/2026', hour: 10, minute: 40 },
  { periodKey: '7d', statusKey: 'failure', date: '13/08/2026', hour: 22, minute: 10 },
  { periodKey: 'month', statusKey: 'success', date: '05/08/2026', hour: 14, minute: 15 },
  { periodKey: 'month', statusKey: 'alert', date: '02/08/2026', hour: 19, minute: 50 },
  { periodKey: 'last_month', statusKey: 'success', date: '22/07/2026', hour: 8, minute: 30 },
  { periodKey: 'last_month', statusKey: 'failure', date: '21/07/2026', hour: 21, minute: 5 },
];

const AUDIT_DEVICES = ['Chrome 128 · macOS', 'Chrome 128 · Windows', 'Safari 18 · macOS', 'Edge 128 · Windows', 'Firefox 129 · Linux'];
const AUDIT_IP_OCTETS = [['203', '0', '113'], ['198', '51', '100'], ['192', '0', '2']];
const maskedIp = (index) => `${AUDIT_IP_OCTETS[index % AUDIT_IP_OCTETS.length].join('.')}.•••`;

// Perfil exibido no drawer — busca no cadastro de Usuários administrativos já
// criado; "sistema" e "desconhecido" (tentativa de login não autenticada)
// não têm cadastro, então recebem um rótulo próprio.
function profileForAuditUser(email) {
  if (email === 'sistema') return 'Sistema';
  if (email === 'desconhecido') return 'Não identificado';
  const match = ADMIN_USERS.find((user) => user.email === email);
  return match ? match.profileLabel : 'Administrador';
}

function buildCategoryLogs({ categoryKey, categoryLabel, idPrefix, events, users, categoryOffset, refs }) {
  return AUDIT_SLOTS.map((slot, index) => {
    const minute = (slot.minute + categoryOffset) % 60;
    const hour = (slot.hour + Math.floor((slot.minute + categoryOffset) / 60)) % 24;
    const at = `${slot.date} ${pad2(hour)}:${pad2(minute)}:${pad2(10 + index * 3)}`;
    const user = users[index % users.length];
    const eventDef = events[index % events.length];
    const isSystemRow = user === 'sistema';
    return {
      id: `${idPrefix}-${pad2(index + 1)}`,
      at,
      user,
      userProfile: profileForAuditUser(user),
      event: eventDef.event,
      description: eventDef.description,
      categoryKey,
      module: categoryLabel,
      statusKey: slot.statusKey,
      periodKey: slot.periodKey,
      ip: isSystemRow ? '—' : maskedIp(index + categoryOffset),
      device: isSystemRow ? '—' : AUDIT_DEVICES[(index + categoryOffset) % AUDIT_DEVICES.length],
      environment: 'Sandbox',
      relatedRef: refs ? refs[index % refs.length] : '—',
      previousValue: eventDef.previousValue,
      newValue: eventDef.newValue,
    };
  });
}

const AUDIT_CATEGORY_DEFS = [
  { categoryKey: 'auth', categoryLabel: 'Autenticação', idPrefix: 'LOG-AUTH', categoryOffset: 0,
    users: ['ana.ramos@ctbxpayments.com', 'carlos.mendes@ctbxpayments.com', 'juliana.prado@ctbxpayments.com', 'desconhecido'],
    events: [
      { event: 'Login realizado', description: 'Login administrativo concluído com sucesso.' },
      { event: 'Tentativa de login falhou', description: 'Senha incorreta informada no login administrativo.' },
      { event: 'Logout', description: 'Sessão administrativa encerrada pelo usuário.' },
      { event: 'Login com MFA validado', description: 'Segundo fator de autenticação validado com sucesso.' },
      { event: 'Sessão expirada', description: 'Sessão administrativa expirada por inatividade.' },
      { event: 'Tentativa de acesso sem permissão', description: 'Usuário tentou acessar uma seção fora do seu perfil de permissões.' },
    ] },
  { categoryKey: 'users', categoryLabel: 'Usuários', idPrefix: 'LOG-USR', categoryOffset: 7,
    users: ['ana.ramos@ctbxpayments.com', 'carlos.mendes@ctbxpayments.com'],
    events: [
      { event: 'Usuário administrativo acessou painel', description: 'Login no Painel Administrativo registrado.' },
      { event: 'Usuário administrativo criado (estrutural)', description: 'Registro estrutural de criação de usuário — nenhuma conta real foi criada.' },
      { event: 'Usuário administrativo bloqueado', description: 'Usuário administrativo bloqueado por revisão de acesso.' },
      { event: 'Permissões de usuário visualizadas', description: 'Consulta às permissões de um usuário administrativo.' },
      { event: 'Convite reenviado (estrutural)', description: 'Registro estrutural de reenvio de convite — nenhum e-mail real foi enviado.' },
      { event: 'Usuário administrativo editado (estrutural)', description: 'Registro estrutural de edição de cadastro — nenhuma alteração real foi aplicada.' },
    ] },
  { categoryKey: 'clients', categoryLabel: 'Clientes', idPrefix: 'LOG-CLI', categoryOffset: 14,
    users: ['juliana.prado@ctbxpayments.com', 'patricia.nogueira@ctbxpayments.com', 'bianca.souza@ctbxpayments.com'],
    refs: ADMIN_CLIENTS.map((client) => client.id),
    events: [
      { event: 'Consulta de cliente', description: 'Ficha cadastral do cliente consultada.' },
      { event: 'Documento de cliente consultado', description: 'CPF/CNPJ do cliente consultado na ficha cadastral.' },
      { event: 'Histórico de cliente consultado', description: 'Histórico de movimentações do cliente consultado.' },
      { event: 'Cliente bloqueado (estrutural)', description: 'Registro estrutural de bloqueio de cliente — nenhuma ação real aplicada.' },
      { event: 'Busca de cliente realizada', description: 'Busca por nome/documento realizada na tela de Clientes.' },
    ] },
  { categoryKey: 'accounts', categoryLabel: 'Contas', idPrefix: 'LOG-ACC', categoryOffset: 21,
    users: ['juliana.prado@ctbxpayments.com', 'patricia.nogueira@ctbxpayments.com'],
    refs: ADMIN_ACCOUNTS.map((account) => account.id),
    events: [
      { event: 'Consulta de conta', description: 'Dados cadastrais da conta consultados.' },
      { event: 'Extrato de conta consultado', description: 'Extrato da conta visualizado.' },
      { event: 'Saldo de conta consultado', description: 'Saldo da conta visualizado.' },
      { event: 'Conta bloqueada (estrutural)', description: 'Registro estrutural de bloqueio de conta — nenhuma ação real aplicada.' },
      { event: 'Abertura de conta consultada', description: 'Detalhes da abertura da conta consultados.' },
    ] },
  { categoryKey: 'pix', categoryLabel: 'PIX', idPrefix: 'LOG-PIX', categoryOffset: 28,
    users: ['juliana.prado@ctbxpayments.com', 'financeiro@ctbxpayments.com'],
    events: [
      { event: 'Consulta de transação PIX', description: 'Detalhes de uma transação PIX consultados.' },
      { event: 'Chave PIX consultada', description: 'Chave PIX cadastrada consultada.' },
      { event: 'Devolução PIX consultada', description: 'Solicitação de devolução PIX consultada.' },
      { event: 'QR Code PIX consultado', description: 'QR Code PIX gerado consultado.' },
      { event: 'Limite PIX consultado', description: 'Limite PIX do cliente consultado.' },
    ] },
  { categoryKey: 'transfers', categoryLabel: 'Transferências', idPrefix: 'LOG-TRF', categoryOffset: 35,
    users: ['juliana.prado@ctbxpayments.com', 'patricia.nogueira@ctbxpayments.com'],
    events: [
      { event: 'Transferência consultada', description: 'Detalhes de uma transferência consultados.' },
      { event: 'TED consultada', description: 'Transferência TED consultada.' },
      { event: 'Transferência cancelada (estrutural)', description: 'Registro estrutural de cancelamento — nenhuma ação real aplicada.' },
      { event: 'Aprovação manual consultada', description: 'Fluxo de aprovação manual de transferência consultado.' },
    ] },
  { categoryKey: 'payments', categoryLabel: 'Pagamentos', idPrefix: 'LOG-PAY', categoryOffset: 42,
    users: ['patricia.nogueira@ctbxpayments.com', 'diego.ferreira@ctbxpayments.com'],
    events: [
      { event: 'Pagamento consultado', description: 'Detalhes de um pagamento consultados.' },
      { event: 'Boleto consultado', description: 'Boleto pago consultado.' },
      { event: 'Agendamento consultado', description: 'Pagamento agendado consultado.' },
      { event: 'Pagamento cancelado (estrutural)', description: 'Registro estrutural de cancelamento — nenhuma ação real aplicada.' },
    ] },
  { categoryKey: 'cards', categoryLabel: 'Cartões', idPrefix: 'LOG-CRD', categoryOffset: 49,
    users: ['carlos.mendes@ctbxpayments.com', 'patricia.nogueira@ctbxpayments.com'],
    refs: ADMIN_CARDS.map((card) => card.id),
    events: [
      { event: 'Cartão consultado', description: 'Dados do cartão consultados (sem número completo).' },
      { event: 'Fatura de cartão consultada', description: 'Fatura do cartão consultada.' },
      { event: 'Limite de cartão consultado', description: 'Limite de crédito do cartão consultado.' },
      { event: 'Cartão bloqueado (estrutural)', description: 'Registro estrutural de bloqueio — nenhuma ação real aplicada.' },
      { event: 'Cartão desbloqueado (estrutural)', description: 'Registro estrutural de desbloqueio — nenhuma ação real aplicada.' },
    ] },
  { categoryKey: 'compliance', categoryLabel: 'Compliance/KYC', idPrefix: 'LOG-KYC', categoryOffset: 56,
    users: ['camila.torres@ctbxpayments.com', 'marcos.lopes@ctbxpayments.com'],
    events: [
      { event: 'KYC consultado', description: 'Solicitação de KYC consultada.' },
      { event: 'Solicitação de KYC revisada (estrutural)', description: 'Registro estrutural de revisão — nenhuma decisão real aplicada.' },
      { event: 'Documento de KYC consultado', description: 'Documento enviado para KYC consultado.' },
      { event: 'Alerta de compliance consultado', description: 'Alerta de compliance consultado.' },
    ] },
  { categoryKey: 'settings', categoryLabel: 'Configurações', idPrefix: 'LOG-CFG', categoryOffset: 3,
    users: ['ana.ramos@ctbxpayments.com', 'camila.torres@ctbxpayments.com'],
    events: [
      { event: 'Configuração visualizada', description: 'Card de configuração consultado.' },
      { event: 'Alteração de configuração registrada', description: 'Alteração de configuração registrada no histórico (estrutural).', previousValue: '30 minutos', newValue: '15 minutos' },
      { event: 'Histórico de configuração consultado', description: 'Histórico recente de alterações consultado.' },
      { event: 'Integração consultada', description: 'Status da integração PIX consultado na aba Integrações.' },
    ] },
  { categoryKey: 'security', categoryLabel: 'Segurança', idPrefix: 'LOG-SEC', categoryOffset: 10,
    users: ['ana.ramos@ctbxpayments.com', 'renata.almeida@ctbxpayments.com', 'desconhecido'],
    events: [
      { event: 'Tentativa de acesso sem permissão', description: 'Tentativa de acessar seção fora do perfil de permissões.' },
      { event: 'Bloqueio por IP aplicado (estrutural)', description: 'Registro estrutural de bloqueio temporário por IP.' },
      { event: 'Dispositivo novo detectado', description: 'Acesso administrativo detectado a partir de um dispositivo não reconhecido.' },
      { event: 'Política de senha consultada', description: 'Política de senha administrativa consultada (somente a regra, não valores).' },
      { event: 'Log de acesso consultado', description: 'Log de acesso de outro usuário consultado.' },
    ] },
  { categoryKey: 'system', categoryLabel: 'Sistema', idPrefix: 'LOG-SYS', categoryOffset: 17,
    users: ['sistema'],
    events: [
      { event: 'Relatório consultado', description: 'Relatório gerado no Painel Admin consultado.' },
      { event: 'Exportação/consulta de relatório', description: 'Consulta a um relatório exportável (estrutural — nenhum arquivo real gerado).' },
      { event: 'Sincronização de integração registrada', description: 'Sincronização periódica de integração registrada (estrutural).' },
      { event: 'Job de manutenção executado (estrutural)', description: 'Rotina de manutenção programada executada (estrutural).' },
      { event: 'Backup registrado (estrutural)', description: 'Registro estrutural de rotina de backup — nenhum dado real processado.' },
    ] },
];

export const ADMIN_AUDIT_LOGS = AUDIT_CATEGORY_DEFS.flatMap(buildCategoryLogs).map((log) => ({
  ...log,
  statusLabel: AUDIT_STATUS_LABEL[log.statusKey],
  periodLabel: AUDIT_PERIOD_LABEL[log.periodKey],
}));

// ── Conteúdo / CMS (admin) ────────────────────────────────────────────────
// Mocks próprios desta área — gestão de conteúdo visual/textual do app.
// Estrutural/mock/read-only nesta etapa: nenhum campo salva de verdade, não
// há upload real de mídia nem publicação real. Nunca inclui senha, token,
// API key, secret, credencial, private key, dados bancários, CVV ou PIN — e
// a biblioteca de mídia nunca expõe credenciais do Cloudinary (só nomes de
// arquivo mock).
export const ADMIN_CMS_STATS = [
  { id: 'cms_pages', label: 'Páginas gerenciáveis', value: '9', trend: 'flat', icon: 'document-text-outline' },
  { id: 'cms_published', label: 'Conteúdos publicados', value: '46', trend: 'flat', icon: 'checkmark-circle-outline' },
  { id: 'cms_drafts', label: 'Rascunhos', value: '5', trend: 'flat', icon: 'create-outline' },
  { id: 'cms_media', label: 'Imagens na biblioteca', value: '8', trend: 'flat', icon: 'image-outline' },
  { id: 'cms_recent_changes', label: 'Alterações recentes', value: '12', trend: 'flat', icon: 'time-outline' },
];

export const ADMIN_CMS_TABS = [
  { id: 'home', label: 'Home' },
  { id: 'login', label: 'Login' },
  { id: 'banners', label: 'Banners / Campanhas' },
  { id: 'services', label: 'Serviços' },
  { id: 'products', label: 'Produtos' },
  { id: 'texts', label: 'Textos' },
  { id: 'media', label: 'Imagens / Mídia' },
  { id: 'links', label: 'Links / Botões' },
  { id: 'navigation', label: 'Navegação' },
  { id: 'theme', label: 'Tema / Visual' },
  { id: 'seo', label: 'SEO / Metadados' },
  { id: 'history', label: 'Histórico' },
];

// Vocabulário de status usado consistentemente em todo o CMS (Home, Login,
// Textos, Produtos, Histórico...) — os 4 status pedidos no brief.
const CMS_STATUS_TONE = { draft: 'warning', published: 'success', restored: 'info', archived: 'neutral' };
const CMS_STATUS_LABEL = { draft: 'Rascunho', published: 'Publicado', restored: 'Restaurado', archived: 'Arquivado' };
const BANNER_STATUS_TONE = { active: 'success', scheduled: 'info', paused: 'warning', ended: 'neutral', draft: 'warning' };
const BANNER_STATUS_LABEL = { active: 'Ativa', scheduled: 'Agendada', paused: 'Pausada', ended: 'Encerrada', draft: 'Rascunho' };
const MEDIA_STATUS_TONE = { active: 'success', archived: 'neutral' };
const MEDIA_STATUS_LABEL = { active: 'Ativa', archived: 'Arquivada' };
const LINK_STATUS_TONE = { active: 'success', inactive: 'neutral' };
const LINK_STATUS_LABEL = { active: 'Ativo', inactive: 'Inativo' };

export { CMS_STATUS_TONE, CMS_STATUS_LABEL, BANNER_STATUS_TONE, BANNER_STATUS_LABEL, MEDIA_STATUS_TONE, MEDIA_STATUS_LABEL, LINK_STATUS_TONE, LINK_STATUS_LABEL };

function attachStatusLabel(items, labelMap, key = 'statusKey') {
  return items.map((item) => ({ ...item, statusLabel: labelMap[item[key]] }));
}

// Home — 13 blocos editáveis (título, banners, ordem/visibilidade das
// seções etc.), cada um com nome/valor atual/status/última alteração/quem
// alterou, como pedido no brief.
export const ADMIN_CMS_HOME_BLOCKS = attachStatusLabel([
  { id: 'home-1', label: 'Título principal', description: 'Título de destaque exibido no topo da Home.', value: 'Bem-vindo à CTBX Payments', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v4' },
  { id: 'home-2', label: 'Subtítulo', description: 'Texto de apoio abaixo do título principal.', value: 'Sua conta digital completa para pessoa física e jurídica', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v3' },
  { id: 'home-3', label: 'Saudação', description: 'Mensagem de saudação personalizada exibida ao abrir o app.', value: 'Olá, {primeiro_nome} 👋', statusKey: 'published', lastChangedAt: '22/03/2025', changedBy: 'carlos.mendes@ctbxpayments.com', version: 'v2' },
  { id: 'home-4', label: 'Banner principal', description: 'Banner de destaque no topo da Home — referencia a campanha ativa.', value: 'Banner "Super CTBX 2026" (ver Banners/Campanhas)', statusKey: 'published', lastChangedAt: '01/08/2026', changedBy: 'carlos.mendes@ctbxpayments.com', version: 'v6', mediaId: 'MED-01' },
  { id: 'home-5', label: 'Imagem de fundo', description: 'Imagem de fundo da tela Home.', value: 'ctbx-home-background.png (mock — biblioteca de mídia)', statusKey: 'published', lastChangedAt: '14/02/2025', changedBy: 'carlos.mendes@ctbxpayments.com', version: 'v2', mediaId: 'MED-07' },
  { id: 'home-6', label: 'Blocos da Home', description: 'Blocos que compõem a Home, na ordem de exibição.', value: 'Saudação, Saldo, Acesso rápido, Campanhas, Serviços, Investimentos', statusKey: 'published', lastChangedAt: '05/06/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v5' },
  { id: 'home-7', label: 'Cards de acesso rápido', description: 'Atalhos exibidos logo abaixo do saldo.', value: 'PIX, Transferir, Pagar, Investir', statusKey: 'published', lastChangedAt: '05/06/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v3', mediaId: 'MED-03' },
  { id: 'home-8', label: 'Campanhas', description: 'Campanhas ativas exibidas na Home.', value: '2 campanhas ativas (ver aba Banners/Campanhas)', statusKey: 'published', lastChangedAt: '01/08/2026', changedBy: 'carlos.mendes@ctbxpayments.com', version: 'v8', mediaId: 'MED-05' },
  { id: 'home-9', label: 'Textos promocionais', description: 'Texto promocional exibido no bloco de investimentos.', value: '"Invista a partir de R$ 100,00 com liquidez diária"', statusKey: 'published', lastChangedAt: '12/07/2026', changedBy: 'carlos.mendes@ctbxpayments.com', version: 'v2' },
  { id: 'home-10', label: 'Chamadas', description: 'Chamada (call to action) para abertura de conta.', value: '"Abra sua conta em poucos minutos"', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v1' },
  { id: 'home-11', label: 'Botões', description: 'Botões de ação secundária exibidos na Home.', value: 'Ver extrato, Meus cartões, Investir agora', statusKey: 'published', lastChangedAt: '05/06/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v2' },
  { id: 'home-12', label: 'Ordem das seções', description: 'Ordem de exibição das seções da Home.', value: 'Saudação → Saldo → Acesso rápido → Campanhas → Serviços → Investimentos', statusKey: 'published', lastChangedAt: '05/06/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v5' },
  { id: 'home-13', label: 'Visibilidade das seções', description: 'Seções visíveis ou ocultas por tipo de cliente.', value: 'Todas visíveis, exceto "Capital de Giro" (oculta para PF)', statusKey: 'draft', lastChangedAt: '17/08/2026', changedBy: 'carlos.mendes@ctbxpayments.com', version: 'v2', timeline: [{ label: 'Publicado', at: '05/06/2025' }, { label: 'Rascunho criado — ocultar Capital de Giro para PF', at: '17/08/2026' }] },
], CMS_STATUS_LABEL);

// Login — 11 campos, mesma estrutura de card do Home.
export const ADMIN_CMS_LOGIN_FIELDS = attachStatusLabel([
  { id: 'login-1', label: 'Logo', description: 'Logo exibida na tela de login.', value: 'ctbx-logo-full.svg (mock)', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v2', mediaId: 'MED-02' },
  { id: 'login-2', label: 'Título', description: 'Título principal da tela de login.', value: 'Acesse sua conta', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v1' },
  { id: 'login-3', label: 'Subtítulo', description: 'Texto de apoio abaixo do título.', value: 'Entre com seu CPF/CNPJ e senha', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v1' },
  { id: 'login-4', label: 'Imagem/fundo', description: 'Imagem ou gradiente de fundo da tela de login.', value: 'Gradiente preto/grafite padrão CTBX', statusKey: 'published', lastChangedAt: '14/02/2025', changedBy: 'carlos.mendes@ctbxpayments.com', version: 'v1' },
  { id: 'login-5', label: 'Texto de apoio', description: 'Texto auxiliar exibido próximo ao formulário.', value: '"Seus dados estão protegidos com criptografia de ponta a ponta"', statusKey: 'published', lastChangedAt: '22/03/2025', changedBy: 'camila.torres@ctbxpayments.com', version: 'v1' },
  { id: 'login-6', label: 'Texto de ambiente', description: 'Selo de ambiente exibido no rodapé do login.', value: '"Ambiente Sandbox — dados fictícios"', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v1' },
  { id: 'login-7', label: 'Botão Entrar', description: 'Texto do botão principal de login.', value: '"Entrar"', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v1' },
  { id: 'login-8', label: 'Texto "Esqueci minha senha"', description: 'Link para recuperação de senha.', value: '"Esqueci minha senha"', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v1' },
  { id: 'login-9', label: 'Texto "Abra sua conta"', description: 'Chamada para abertura de conta a partir do login.', value: '"Ainda não tem conta? Abra sua conta"', statusKey: 'published', lastChangedAt: '22/03/2025', changedBy: 'carlos.mendes@ctbxpayments.com', version: 'v2' },
  { id: 'login-10', label: 'Avisos', description: 'Avisos temporários exibidos no login (manutenção, instabilidade etc.).', value: 'Nenhum aviso ativo no momento', statusKey: 'published', lastChangedAt: '01/08/2026', changedBy: 'juliana.prado@ctbxpayments.com', version: 'v3' },
  { id: 'login-11', label: 'Rodapé', description: 'Texto de rodapé da tela de login.', value: '"CTBX Payments — Instituição de Pagamento"', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com', version: 'v1' },
], CMS_STATUS_LABEL);

// Banners / Campanhas — tabela + drawer.
export const ADMIN_CMS_BANNERS = attachStatusLabel([
  { id: 'BNR-01', name: 'Super CTBX 2026', image: 'banner-super-ctbx-2026.png', mediaId: 'MED-01', title: 'Super CTBX chegou', subtitle: 'Cashback em compras selecionadas', cta: 'Aproveitar agora', link: '/campanhas/super-ctbx', position: 'Home — topo', startDate: '01/08/2026', endDate: '31/08/2026', statusKey: 'active', priority: 1 },
  { id: 'BNR-02', name: 'Investimentos — CDB 2027', image: 'banner-cdb-2027.png', mediaId: 'MED-05', title: 'CDB CTBX 2027', subtitle: 'Liquidez diária e rentabilidade 110% do CDI', cta: 'Investir agora', link: '/investimentos/cdb-2027', position: 'Home — seção Investimentos', startDate: '15/07/2026', endDate: '15/09/2026', statusKey: 'active', priority: 2 },
  { id: 'BNR-03', name: 'Cartão virtual grátis', image: 'banner-cartao-virtual.png', title: 'Peça seu cartão virtual', subtitle: 'Emissão instantânea, sem anuidade', cta: 'Pedir cartão', link: '/cartoes/virtual', position: 'Home — seção Cartões', startDate: '01/09/2026', endDate: '30/09/2026', statusKey: 'scheduled', priority: 3 },
  { id: 'BNR-04', name: 'Antecipação Salarial', image: 'banner-antecipacao-salarial.png', mediaId: 'MED-08', title: 'Antecipe seu salário', subtitle: 'Direto na sua conta CTBX', cta: 'Simular', link: '/beneficios/antecipacao-salarial', position: 'Home — seção Serviços', startDate: '01/06/2026', endDate: '31/07/2026', statusKey: 'ended', priority: 4 },
  { id: 'BNR-05', name: 'Indique e ganhe', image: 'banner-indique-e-ganhe.png', title: 'Indique e ganhe R$ 50,00', subtitle: 'Por cada amigo que abrir conta', cta: 'Indicar agora', link: '/indicacao', position: 'Home — rodapé', startDate: '10/08/2026', endDate: '—', statusKey: 'paused', priority: 5 },
  { id: 'BNR-06', name: 'Capital de Giro PJ', image: 'banner-capital-giro.png', title: 'Capital de giro para o seu negócio', subtitle: 'Aprovação 100% digital', cta: 'Simular crédito', link: '/pj/capital-giro', position: 'Home — seção PJ', startDate: '—', endDate: '—', statusKey: 'draft', priority: 6 },
], BANNER_STATUS_LABEL);

// Serviços — cards de apresentação dos serviços do app (não altera os
// fluxos reais, só como são exibidos/ordenados/visíveis).
export const ADMIN_CMS_SERVICES = [
  { id: 'SVC-01', name: 'PIX', icon: 'flash-outline', mediaId: 'MED-03', description: 'Envie e receba PIX na hora', order: 1, visible: true, link: '/pix', category: 'Pagamentos' },
  { id: 'SVC-02', name: 'Transferências', icon: 'swap-horizontal-outline', description: 'TED e transferências entre contas', order: 2, visible: true, link: '/transferencias', category: 'Pagamentos' },
  { id: 'SVC-03', name: 'Pagamentos', icon: 'document-text-outline', description: 'Boletos, contas e convênios', order: 3, visible: true, link: '/pagamentos', category: 'Pagamentos' },
  { id: 'SVC-04', name: 'Investimentos', icon: 'trending-up-outline', description: 'CDB, fundos e mais', order: 4, visible: true, link: '/investimentos', category: 'Investimentos' },
  { id: 'SVC-05', name: 'Cartões', icon: 'card-outline', mediaId: 'MED-04', description: 'Cartão físico e virtual', order: 5, visible: true, link: '/cartoes', category: 'Cartões' },
  { id: 'SVC-06', name: 'Benefícios', icon: 'gift-outline', description: 'Vale-refeição e benefícios corporativos', order: 6, visible: true, link: '/beneficios', category: 'Benefícios' },
  { id: 'SVC-07', name: 'Antecipação Salarial', icon: 'cash-outline', description: 'Antecipe parte do seu salário', order: 7, visible: true, link: '/beneficios/antecipacao-salarial', category: 'Benefícios' },
  { id: 'SVC-08', name: 'Capital de Giro', icon: 'briefcase-outline', description: 'Crédito para capital de giro PJ', order: 8, visible: false, link: '/pj/capital-giro', category: 'PJ' },
  { id: 'SVC-09', name: 'Antecipação de Recebíveis', icon: 'trending-up-outline', description: 'Antecipe recebíveis de vendas', order: 9, visible: true, link: '/pj/antecipacao-recebiveis', category: 'PJ' },
  { id: 'SVC-10', name: 'POS', icon: 'card-outline', description: 'Maquininha CTBX para vendas', order: 10, visible: true, link: '/pj/pos', category: 'PJ' },
  { id: 'SVC-11', name: 'Microcrédito', icon: 'wallet-outline', description: 'Crédito para pequenos negócios', order: 11, visible: false, link: '/pj/microcredito', category: 'PJ' },
];

// Produtos — gestão estrutural dos produtos exibidos no app.
export const ADMIN_CMS_PRODUCTS = attachStatusLabel([
  { id: 'PRD-01', name: 'CDB CTBX 2027', category: 'Investimentos', description: 'CDB com liquidez diária e 110% do CDI', image: 'produto-cdb-2027.png', featured: true, statusKey: 'published', order: 1, cta: 'Investir agora', link: '/investimentos/cdb-2027', audience: 'PF e PJ', publishedAt: '15/07/2026' },
  { id: 'PRD-02', name: 'Fundo Multimercado CTBX', category: 'Investimentos', description: 'Fundo com gestão ativa e resgate D+1', image: 'produto-fundo-multi.png', featured: false, statusKey: 'published', order: 2, cta: 'Conhecer fundo', link: '/investimentos/fundo-multimercado', audience: 'PF e PJ', publishedAt: '01/03/2026' },
  { id: 'PRD-03', name: 'Cartão Black CTBX', category: 'Cartões', description: 'Cartão premium com cashback e sala VIP', image: 'produto-cartao-black.png', featured: true, statusKey: 'published', order: 3, cta: 'Solicitar cartão', link: '/cartoes/black', audience: 'PF', publishedAt: '10/06/2026' },
  { id: 'PRD-04', name: 'Conta PJ Premium', category: 'Contas', description: 'Conta PJ com tarifas reduzidas e gerente dedicado', image: 'produto-conta-pj-premium.png', featured: false, statusKey: 'draft', order: 4, cta: 'Saiba mais', link: '/pj/conta-premium', audience: 'PJ', publishedAt: '—' },
  { id: 'PRD-05', name: 'Capital de Giro Expresso', category: 'Crédito PJ', description: 'Crédito aprovado em até 24h', image: 'produto-capital-giro.png', featured: false, statusKey: 'published', order: 5, cta: 'Simular crédito', link: '/pj/capital-giro', audience: 'PJ', publishedAt: '01/06/2026' },
  { id: 'PRD-06', name: 'Antecipação Salarial Plus', category: 'Benefícios', description: 'Limite maior de antecipação para clientes elegíveis', image: 'produto-antecipacao-plus.png', featured: false, statusKey: 'archived', order: 6, cta: 'Saiba mais', link: '/beneficios/antecipacao-plus', audience: 'PF', publishedAt: '10/03/2026' },
], CMS_STATUS_LABEL);

// Textos — tabela de textos gerenciáveis por chave (estilo i18n).
export const ADMIN_CMS_TEXTS = attachStatusLabel([
  { id: 'TXT-01', key: 'home.welcome.title', screen: 'Home', section: 'Saudação', text: 'Bem-vindo à CTBX Payments', language: 'pt-BR', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'TXT-02', key: 'home.welcome.subtitle', screen: 'Home', section: 'Saudação', text: 'Sua conta digital completa para pessoa física e jurídica', language: 'pt-BR', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'TXT-03', key: 'login.title', screen: 'Login', section: 'Cabeçalho', text: 'Acesse sua conta', language: 'pt-BR', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'TXT-04', key: 'login.subtitle', screen: 'Login', section: 'Cabeçalho', text: 'Entre com seu CPF/CNPJ e senha', language: 'pt-BR', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'TXT-05', key: 'campaign.superctb.title', screen: 'Home', section: 'Campanhas', text: 'Super CTBX chegou', language: 'pt-BR', statusKey: 'published', lastChangedAt: '01/08/2026', changedBy: 'carlos.mendes@ctbxpayments.com' },
  { id: 'TXT-06', key: 'campaign.superctb.subtitle', screen: 'Home', section: 'Campanhas', text: 'Cashback em compras selecionadas', language: 'pt-BR', statusKey: 'published', lastChangedAt: '01/08/2026', changedBy: 'carlos.mendes@ctbxpayments.com' },
  { id: 'TXT-07', key: 'services.pix.title', screen: 'Home', section: 'Serviços', text: 'PIX', language: 'pt-BR', statusKey: 'published', lastChangedAt: '05/06/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'TXT-08', key: 'services.pix.description', screen: 'Home', section: 'Serviços', text: 'Envie e receba PIX na hora', language: 'pt-BR', statusKey: 'published', lastChangedAt: '05/06/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'TXT-09', key: 'products.cdb2027.description', screen: 'Produtos', section: 'Investimentos', text: 'CDB com liquidez diária e 110% do CDI', language: 'pt-BR', statusKey: 'published', lastChangedAt: '15/07/2026', changedBy: 'carlos.mendes@ctbxpayments.com' },
  { id: 'TXT-10', key: 'login.footer.environment', screen: 'Login', section: 'Rodapé', text: 'Ambiente Sandbox — dados fictícios', language: 'pt-BR', statusKey: 'published', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'TXT-11', key: 'home.section.capitalgiro.visibility_note', screen: 'Home', section: 'Visibilidade', text: 'Seção oculta para clientes PF', language: 'pt-BR', statusKey: 'draft', lastChangedAt: '17/08/2026', changedBy: 'carlos.mendes@ctbxpayments.com' },
  { id: 'TXT-12', key: 'referral.banner.title', screen: 'Home', section: 'Campanhas', text: 'Indique e ganhe R$ 50,00', language: 'pt-BR', statusKey: 'published', lastChangedAt: '10/08/2026', changedBy: 'juliana.prado@ctbxpayments.com' },
], CMS_STATUS_LABEL);

// Imagens / Mídia — biblioteca visual mock, preparada para integração
// futura com Cloudinary. Nenhum upload real nesta etapa.
export const ADMIN_CMS_MEDIA = attachStatusLabel([
  { id: 'MED-01', name: 'banner-super-ctbx-2026.png', type: 'Banner', dimensions: '1200×480', size: '480 KB', usage: 'Banner Home — Super CTBX 2026', uploadedAt: '30/07/2026', statusKey: 'active' },
  { id: 'MED-02', name: 'ctbx-logo-full.svg', type: 'Logo', dimensions: 'Vetorial', size: '18 KB', usage: 'Logo — Login e Splash', uploadedAt: '10/01/2025', statusKey: 'active' },
  { id: 'MED-03', name: 'icon-pix.svg', type: 'Ícone', dimensions: 'Vetorial', size: '4 KB', usage: 'Ícone — Serviço PIX', uploadedAt: '05/06/2025', statusKey: 'active' },
  { id: 'MED-04', name: 'icon-cartoes.svg', type: 'Ícone', dimensions: 'Vetorial', size: '4 KB', usage: 'Ícone — Serviço Cartões', uploadedAt: '05/06/2025', statusKey: 'active' },
  { id: 'MED-05', name: 'banner-cdb-2027.png', type: 'Banner', dimensions: '1200×480', size: '410 KB', usage: 'Banner Home — CDB CTBX 2027', uploadedAt: '10/07/2026', statusKey: 'active' },
  { id: 'MED-06', name: 'video-onboarding.mp4', type: 'Vídeo', dimensions: '1080×1920', size: '8,4 MB', usage: 'Vídeo de boas-vindas — onboarding', uploadedAt: '02/05/2025', statusKey: 'active' },
  { id: 'MED-07', name: 'ctbx-home-background.png', type: 'Imagem', dimensions: '1440×2960', size: '1,1 MB', usage: 'Imagem de fundo — Home', uploadedAt: '14/02/2025', statusKey: 'active' },
  { id: 'MED-08', name: 'banner-antecipacao-salarial.png', type: 'Banner', dimensions: '1200×480', size: '395 KB', usage: 'Banner Home — Antecipação Salarial (encerrado)', uploadedAt: '28/05/2026', statusKey: 'archived' },
], MEDIA_STATUS_LABEL);

// Links / Botões — gestão estrutural de CTAs do app.
export const ADMIN_CMS_LINKS = attachStatusLabel([
  { id: 'LNK-01', label: 'Entrar', action: 'submit_login', destination: '/home', screen: 'Login', position: 'Botão principal', statusKey: 'active', openMode: 'Interna' },
  { id: 'LNK-02', label: 'Abra sua conta', action: 'navigate', destination: '/onboarding', screen: 'Login', position: 'Rodapé', statusKey: 'active', openMode: 'Interna' },
  { id: 'LNK-03', label: 'Assista agora', action: 'navigate', destination: '/onboarding/video', screen: 'Home', position: 'Card de boas-vindas', statusKey: 'active', openMode: 'Interna' },
  { id: 'LNK-04', label: 'Ver detalhes', action: 'navigate', destination: '/investimentos/cdb-2027', screen: 'Produtos', position: 'Card de produto', statusKey: 'active', openMode: 'Interna' },
  { id: 'LNK-05', label: 'Saiba mais', action: 'navigate', destination: '/beneficios/antecipacao-salarial', screen: 'Home', position: 'Card de serviço', statusKey: 'active', openMode: 'Interna' },
  { id: 'LNK-06', label: 'Simular agora', action: 'navigate', destination: '/pj/capital-giro/simulacao', screen: 'Home', position: 'Banner PJ', statusKey: 'inactive', openMode: 'Interna' },
  { id: 'LNK-07', label: 'Baixar app', action: 'external_link', destination: 'https://ctbxpayments.com/app (mock)', screen: 'Institucional', position: 'Rodapé', statusKey: 'active', openMode: 'Externa' },
  { id: 'LNK-08', label: 'Falar com atendimento', action: 'external_link', destination: 'https://ajuda.ctbxpayments.com (mock)', screen: 'Ajuda', position: 'Menu secundário', statusKey: 'active', openMode: 'Externa' },
], LINK_STATUS_LABEL);

// Navegação — 4 grupos separados, como pedido no brief.
export const ADMIN_CMS_NAV_GROUPS = [
  { id: 'bottom_menu', label: 'Menu inferior do app', items: [
    { id: 'NAV-01', item: 'Início', icon: 'home-outline', route: '/home', order: 1, visible: true, audience: 'PF e PJ' },
    { id: 'NAV-02', item: 'PIX', icon: 'flash-outline', route: '/pix', order: 2, visible: true, audience: 'PF e PJ' },
    { id: 'NAV-03', item: 'Cartões', icon: 'card-outline', route: '/cartoes', order: 3, visible: true, audience: 'PF e PJ' },
    { id: 'NAV-04', item: 'Investimentos', icon: 'trending-up-outline', route: '/investimentos', order: 4, visible: true, audience: 'PF e PJ' },
    { id: 'NAV-05', item: 'Perfil', icon: 'person-outline', route: '/perfil', order: 5, visible: true, audience: 'PF e PJ' },
  ] },
  { id: 'home_shortcuts', label: 'Atalhos da Home', items: [
    { id: 'NAV-06', item: 'Transferir', icon: 'swap-horizontal-outline', route: '/transferencias', order: 1, visible: true, audience: 'PF e PJ' },
    { id: 'NAV-07', item: 'Pagar boleto', icon: 'document-text-outline', route: '/pagamentos/boleto', order: 2, visible: true, audience: 'PF e PJ' },
    { id: 'NAV-08', item: 'Investir', icon: 'trending-up-outline', route: '/investimentos', order: 3, visible: true, audience: 'PF e PJ' },
    { id: 'NAV-09', item: 'Meu cartão', icon: 'card-outline', route: '/cartoes', order: 4, visible: true, audience: 'PF e PJ' },
  ] },
  { id: 'secondary_menus', label: 'Menus secundários', items: [
    { id: 'NAV-10', item: 'Extrato', icon: 'reader-outline', route: '/contas/extrato', order: 1, visible: true, audience: 'PF e PJ' },
    { id: 'NAV-11', item: 'Limites', icon: 'speedometer-outline', route: '/perfil/limites', order: 2, visible: true, audience: 'PF e PJ' },
    { id: 'NAV-12', item: 'Ajuda', icon: 'help-circle-outline', route: '/ajuda', order: 3, visible: true, audience: 'PF e PJ' },
    { id: 'NAV-13', item: 'Configurações da conta', icon: 'settings-outline', route: '/perfil/configuracoes', order: 4, visible: true, audience: 'PF e PJ' },
  ] },
  { id: 'institutional_links', label: 'Links institucionais', items: [
    { id: 'NAV-14', item: 'Sobre a CTBX', icon: 'information-circle-outline', route: '/institucional/sobre', order: 1, visible: true, audience: 'Público' },
    { id: 'NAV-15', item: 'Termos de uso', icon: 'document-text-outline', route: '/institucional/termos', order: 2, visible: true, audience: 'Público' },
    { id: 'NAV-16', item: 'Política de privacidade', icon: 'shield-checkmark-outline', route: '/institucional/privacidade', order: 3, visible: true, audience: 'Público' },
    { id: 'NAV-17', item: 'Central de ajuda', icon: 'help-circle-outline', route: '/institucional/ajuda', order: 4, visible: true, audience: 'Público' },
  ] },
];

// Tema / Visual — só mostra os valores atuais e controles visuais; nenhuma
// alteração global real é aplicada nesta etapa.
export const ADMIN_CMS_THEME_TOKENS = [
  { id: 'THM-01', label: 'Cor principal', description: 'Cor de destaque usada em botões primários e links ativos.', value: '#7769E8 (roxo CTBX)', swatch: '#7769E8', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'THM-02', label: 'Cor secundária', description: 'Cor de apoio usada em elementos secundários.', value: '#151823 (grafite escuro)', swatch: '#151823', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'THM-03', label: 'Cor de destaque', description: 'Cor usada em alertas e chamadas de atenção.', value: '#F2C94C (amarelo)', swatch: '#F2C94C', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'THM-04', label: 'Fundo', description: 'Cor de fundo padrão das telas do painel/app.', value: '#0B0D14 (preto grafite)', swatch: '#0B0D14', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'THM-05', label: 'Cards', description: 'Cor de fundo dos cards.', value: '#12141C', swatch: '#12141C', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'THM-06', label: 'Bordas', description: 'Cor padrão de bordas em cards e inputs.', value: 'rgba(255,255,255,0.08)', swatch: '#2A2D3A', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'THM-07', label: 'Tipografia', description: 'Família tipográfica usada em todo o app.', value: 'Poppins', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'THM-08', label: 'Raio dos cards', description: 'Arredondamento padrão dos cards.', value: '16px', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'THM-09', label: 'Sombra', description: 'Sombra padrão aplicada a cards elevados.', value: '0px 4px 12px rgba(0,0,0,0.35)', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'THM-10', label: 'Espaçamento', description: 'Unidade base de espaçamento do grid.', value: '8px (escala 4/8/12/16/24/32)', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'THM-11', label: 'Estilo dos botões', description: 'Estilo padrão de botões primários.', value: 'Cantos arredondados, sem preenchimento sólido em estados ativos', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
];

// SEO / Metadados — campos estruturais, sem integração real de publicação.
export const ADMIN_CMS_SEO = [
  { id: 'SEO-01', label: 'Título da página', description: 'Título usado na aba do navegador e em buscadores.', value: 'CTBX Payments — Sua conta digital completa', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'SEO-02', label: 'Descrição', description: 'Descrição usada em buscadores e compartilhamentos.', value: 'Abra sua conta CTBX Payments e tenha PIX, cartão, investimentos e crédito PJ em um só lugar.', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'SEO-03', label: 'Imagem social', description: 'Imagem exibida ao compartilhar o link em redes sociais.', value: 'seo-share-image.png (mock — 1200×630)', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'SEO-04', label: 'Nome do app', description: 'Nome exibido em lojas de aplicativo e metadados.', value: 'CTBX Payments', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'SEO-05', label: 'Nome da instituição', description: 'Razão social usada em metadados institucionais.', value: 'CTBX Payments', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'SEO-06', label: 'Palavras-chave', description: 'Palavras-chave usadas para indexação.', value: 'conta digital, PIX, cartão, investimentos, capital de giro', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'SEO-07', label: 'Canonical (mock)', description: 'URL canônica estrutural — sem publicação real.', value: 'https://ctbxpayments.com/ (mock)', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'SEO-08', label: 'Open Graph title', description: 'Título usado em cartões de compartilhamento (Open Graph).', value: 'CTBX Payments — Sua conta digital completa', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'SEO-09', label: 'Open Graph description', description: 'Descrição usada em cartões de compartilhamento (Open Graph).', value: 'PIX, cartão, investimentos e crédito PJ — tudo em um só app.', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
  { id: 'SEO-10', label: 'Open Graph image', description: 'Imagem usada em cartões de compartilhamento (Open Graph).', value: 'seo-share-image.png (mock — 1200×630)', lastChangedAt: '10/01/2025', changedBy: 'ana.ramos@ctbxpayments.com' },
];

// Histórico — trilha mock de alterações de conteúdo (não é a mesma coisa
// que Logs/Auditoria — este histórico é específico do CMS).
export const ADMIN_CMS_HISTORY = attachStatusLabel([
  { id: 'CMH-01', at: '17/08/2026 09:10:00', user: 'carlos.mendes@ctbxpayments.com', section: 'Home', field: 'Visibilidade das seções', previousValue: 'Todas visíveis', newValue: 'Ocultar Capital de Giro para PF', statusKey: 'draft', version: 'v2' },
  { id: 'CMH-02', at: '10/08/2026 14:20:00', user: 'juliana.prado@ctbxpayments.com', section: 'Home', field: 'Campanhas', previousValue: 'Sem campanha de indicação', newValue: 'Banner "Indique e ganhe" adicionado', statusKey: 'published', version: 'v8' },
  { id: 'CMH-03', at: '01/08/2026 10:00:00', user: 'carlos.mendes@ctbxpayments.com', section: 'Home', field: 'Banner principal', previousValue: 'Banner "CDB 2027"', newValue: 'Banner "Super CTBX 2026"', statusKey: 'published', version: 'v6' },
  { id: 'CMH-04', at: '28/07/2026 16:40:00', user: 'carlos.mendes@ctbxpayments.com', section: 'Banners/Campanhas', field: 'Status do banner Antecipação Salarial', previousValue: 'Ativa', newValue: 'Encerrada', statusKey: 'archived', version: 'v4' },
  { id: 'CMH-05', at: '12/07/2026 11:15:00', user: 'carlos.mendes@ctbxpayments.com', section: 'Home', field: 'Textos promocionais', previousValue: '"Invista com liquidez diária"', newValue: '"Invista a partir de R$ 100,00 com liquidez diária"', statusKey: 'published', version: 'v2' },
  { id: 'CMH-06', at: '10/07/2026 09:00:00', user: 'carlos.mendes@ctbxpayments.com', section: 'Banners/Campanhas', field: 'Banner CDB 2027 (versão)', previousValue: 'v2 (rascunho abandonado)', newValue: 'v1 restaurada', statusKey: 'restored', version: 'v1' },
  { id: 'CMH-07', at: '05/06/2025 15:30:00', user: 'ana.ramos@ctbxpayments.com', section: 'Home', field: 'Ordem das seções', previousValue: 'Saudação → Serviços → Saldo', newValue: 'Saudação → Saldo → Acesso rápido → Campanhas → Serviços → Investimentos', statusKey: 'published', version: 'v5' },
  { id: 'CMH-08', at: '22/03/2025 10:45:00', user: 'carlos.mendes@ctbxpayments.com', section: 'Login', field: 'Texto "Abra sua conta"', previousValue: '"Não tem conta? Cadastre-se"', newValue: '"Ainda não tem conta? Abra sua conta"', statusKey: 'published', version: 'v2' },
  { id: 'CMH-09', at: '01/06/2026 09:00:00', user: 'juliana.prado@ctbxpayments.com', section: 'Serviços', field: 'Capital de Giro', previousValue: 'Visível', newValue: 'Oculto', statusKey: 'published', version: 'v3' },
  { id: 'CMH-10', at: '15/07/2026 08:30:00', user: 'carlos.mendes@ctbxpayments.com', section: 'Produtos', field: 'CDB CTBX 2027', previousValue: 'Rascunho', newValue: 'Publicado', statusKey: 'published', version: 'v1' },
  { id: 'CMH-11', at: '10/03/2026 09:00:00', user: 'ana.ramos@ctbxpayments.com', section: 'Produtos', field: 'Antecipação Salarial Plus', previousValue: 'Publicado', newValue: 'Arquivado', statusKey: 'archived', version: 'v2' },
  { id: 'CMH-12', at: '10/01/2025 08:00:00', user: 'ana.ramos@ctbxpayments.com', section: 'SEO/Metadados', field: 'Título da página', previousValue: '"CTBX — Conta digital"', newValue: '"CTBX Payments — Sua conta digital completa"', statusKey: 'published', version: 'v1' },
], CMS_STATUS_LABEL);
