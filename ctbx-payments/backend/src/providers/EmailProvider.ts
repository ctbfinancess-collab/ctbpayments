// Contrato de e-mail — Etapa 1 da infraestrutura Resend. Nenhuma rota
// consome isto ainda (nenhum fluxo real de e-mail existe no produto hoje —
// ver auditoria: ForgotPasswordScreen é 100% mock, "não enviaremos
// mensagens"). Esta interface é o formato mínimo e genérico o bastante
// pra qualquer fluxo futuro (recuperação de senha, confirmação de
// cadastro, alerta, comprovante) construir em cima sem precisar mudar o
// contrato — mesmo espírito de todo outro `interface X` + implementação(ões)
// deste backend (SandboxXProvider, repositórios, etc.).
export interface SendEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

export interface SendEmailResult {
  id: string;
}

export interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
