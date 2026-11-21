import type { FastifyInstance } from 'fastify';
import type { InMemoryEmailProvider } from '../../src/providers/InMemoryEmailProvider.js';

// Confirma o e-mail como um usuário real faria: lê o último e-mail de
// verificação enviado (caixa de saída simulada, só em NODE_ENV=test) e
// chama /verify-email com o token do link.
export async function verifyEmail(app: FastifyInstance, email: string): Promise<void> {
  const outbox = (app as unknown as { testEmailOutbox?: InMemoryEmailProvider }).testEmailOutbox;
  if (!outbox) throw new Error('testEmailOutbox indisponível (NODE_ENV precisa ser test).');
  const message = [...outbox.sent].reverse().find((m) => m.to === email.toLowerCase() && /verify-email\?token=/.test(m.text ?? ''));
  const token = message?.text?.match(/verify-email\?token=([a-f0-9]+)/)?.[1];
  if (!token) throw new Error(`nenhum e-mail de verificação para ${email}`);
  const response = await app.inject({ method: 'POST', url: '/v1/customers/verify-email', payload: { token } });
  if (response.statusCode !== 204) throw new Error(`verify-email falhou: ${response.statusCode}`);
}

// Testes de serviço: devolve o cliente criado pelo register() (que agora
// responde { customer } e nunca revela duplicidade). Falha se nenhuma conta
// nova foi criada.
export async function registered<T>(result: Promise<{ customer: T | null }>): Promise<T> {
  const { customer } = await result;
  if (!customer) throw new Error('register não criou um cliente novo');
  return customer;
}
