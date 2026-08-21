import type { Environment } from '../config/env.js';
import type { EmailProvider } from './EmailProvider.js';
import { InMemoryEmailProvider } from './InMemoryEmailProvider.js';
import { ResendEmailProvider } from './ResendEmailProvider.js';

export interface EmailProviderConfig {
  nodeEnv: Environment;
  resendApiKey: string | undefined;
  emailFrom: string | undefined;
}

// Única função que decide QUAL EmailProvider usar — nenhum outro lugar do
// código deve instanciar Resend/InMemory diretamente, pra essa regra ficar
// centralizada num só ponto.
//
// Fail-closed em produção: RESEND_API_KEY/EMAIL_FROM ausentes ou inválidas
// faz ResendEmailProvider lançar na própria construção (ver aquela classe)
// — isso propaga daqui pra cima, nunca cai silenciosamente pro mock em
// produção.
//
// Fora de produção (development/test/staging), o mock é o padrão seguro
// (nenhum e-mail de verdade sai sem querer durante desenvolvimento), mas
// se alguém configurar as duas variáveis localmente (pra testar contra a
// API real do Resend de propósito), usa o provider real do mesmo jeito.
export function createEmailProvider(config: EmailProviderConfig): EmailProvider {
  if (config.nodeEnv === 'production') return new ResendEmailProvider(config.resendApiKey, config.emailFrom);
  if (config.resendApiKey && config.emailFrom) return new ResendEmailProvider(config.resendApiKey, config.emailFrom);
  return new InMemoryEmailProvider();
}
