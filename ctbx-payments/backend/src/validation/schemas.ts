export const idSchema = { type: 'string', minLength: 1, maxLength: 128, pattern: '^[A-Za-z0-9._:-]+$' } as const;
// Pasta/public_id de mídia do CMS — sempre sob a raiz "ctbx-payments", com
// segmentos alfanuméricos simples. Isso garante, por schema, que a rota de
// exclusão (media/destroy) só pode atingir assets dentro da pasta gerenciada
// pelo CTBX Payments no Cloudinary, nunca um asset arbitrário da conta.
export const mediaFolderSchema = { type: 'string', pattern: '^ctbx-payments(/[A-Za-z0-9_-]{1,60}){0,3}$' } as const;
export const mediaPublicIdSchema = { type: 'string', pattern: '^ctbx-payments(/[A-Za-z0-9_-]{1,60}){1,5}$' } as const;
export const moneySchema = {
  type: 'object', additionalProperties: false, required: ['amount', 'currency'],
  properties: { amount: { type: 'integer' }, currency: { type: 'string', pattern: '^[A-Z]{3}$' } },
} as const;

export const objectSchema = (required: string[], properties: Record<string, unknown>) => ({
  type: 'object', additionalProperties: false, required, properties,
});

export const emptyObjectSchema = objectSchema([], {});
