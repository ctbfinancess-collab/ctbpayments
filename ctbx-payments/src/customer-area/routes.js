// Endereços e títulos das páginas da Área do Cliente (Fase 3).
// Endereços em português. Os três de e-mail (verify-email, reset-password,
// confirm-email-change) mantêm o caminho que a API já usa nos links.
export const linking = {
  prefixes: [],
  config: {
    screens: {
      Login: 'entrar',
      Register: 'abrir-conta',
      ForgotPassword: 'esqueci-minha-senha',
      Dashboard: 'painel',
      Profile: 'meus-dados',
      Kyc: 'verificacao',
      Security: 'seguranca',
      VerifyEmail: 'verify-email',
      ResetPassword: 'reset-password',
      ConfirmEmailChange: 'confirm-email-change',
    },
  },
};

export const TITLES = {
  Login: 'Entrar', Register: 'Abrir conta', ForgotPassword: 'Esqueci minha senha', Dashboard: 'Painel', Profile: 'Meus dados',
  Kyc: 'Verificação de identidade', Security: 'Segurança', VerifyEmail: 'Confirmar e-mail', ResetPassword: 'Redefinir senha', ConfirmEmailChange: 'Confirmar troca de e-mail',
};

