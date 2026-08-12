export const idSchema = { type: 'string', minLength: 1, maxLength: 128, pattern: '^[A-Za-z0-9._:-]+$' } as const;
export const moneySchema = {
  type: 'object', additionalProperties: false, required: ['amount', 'currency'],
  properties: { amount: { type: 'integer' }, currency: { type: 'string', pattern: '^[A-Z]{3}$' } },
} as const;

export const objectSchema = (required: string[], properties: Record<string, unknown>) => ({
  type: 'object', additionalProperties: false, required, properties,
});

export const emptyObjectSchema = objectSchema([], {});
