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
