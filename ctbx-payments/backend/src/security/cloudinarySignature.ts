import { createHash } from 'node:crypto';

// Implementa o algoritmo de assinatura de upload do Cloudinary (documentado
// em https://cloudinary.com/documentation/authentication_signatures):
// ordena os parâmetros por chave, concatena como "chave=valor&...", anexa o
// api_secret (sem separador) e aplica SHA-1. Nunca inclui api_key nem
// api_secret entre os parâmetros assinados — eles não fazem parte do
// conjunto ordenado, só o secret é anexado ao final antes do hash.
export type SignableParams = Record<string, string | number | undefined>;

export function signCloudinaryParams(params: SignableParams, apiSecret: string): string {
  const toSign = Object.keys(params)
    .filter((key) => params[key] !== undefined && params[key] !== '')
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(`${toSign}${apiSecret}`).digest('hex');
}
