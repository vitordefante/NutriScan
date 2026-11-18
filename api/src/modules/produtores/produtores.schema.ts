import type { Producer, ProducerCategory, ProducerPlace, ProducerRequest } from '@nutriscan/shared';
import { z } from 'zod';

/** Na ordem em que aparecem no filtro do mapa. */
export const CATEGORIAS = [
  'hortalicas',
  'frutas',
  'ovos',
  'laticinios',
  'carnes',
  'pescados',
  'mel',
  'graos',
  'artesanais',
  'cosmeticos',
] as const satisfies readonly ProducerCategory[];

const texto = (max: number) => z.string().trim().min(1).max(max);
const whatsapp = z
  .string()
  .transform((s) => s.replace(/\D/g, ''))
  // Só DDD + número (10 ou 11 dígitos): é do Brasil, falta o 55.
  .transform((d) => (d.length === 10 || d.length === 11 ? `55${d}` : d))
  // DDI + DDD + número (12 ou 13 dígitos no Brasil; até 15 pelo padrão internacional).
  .pipe(z.string().regex(/^\d{12,15}$/, 'WhatsApp com DDD, ex.: (47) 99999-9999'));
const instagram = z
  .string()
  .trim()
  .transform((s) => s.replace(/^@/, ''))
  .pipe(z.string().regex(/^[A-Za-z0-9._]{1,30}$/, 'Instagram inválido'));
const data = z.iso.date();

const localSchema = z.object({
  tipo: z.enum(['feira', 'loja', 'propriedade']),
  nome: texto(120).optional(),
  endereco: texto(200).optional(),
  cidade: texto(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  precisao: z.enum(['exata', 'aproximada']),
  horario: texto(120).optional(),
});

/** Um produtor no arquivo local (`api/data/produtores.local.json`). */
export const produtorLocalSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id em minúsculas com hífens'),
    nome: texto(120),
    responsavel: texto(120).optional(),
    descricao: texto(200).optional(),
    categorias: z.array(z.enum(CATEGORIAS)).min(1),
    produtos: z.array(texto(60)).min(1).max(30),
    cultivo: z.enum(['organico_certificado', 'agroecologico', 'convencional']).optional(),
    certificacao: texto(120).optional(),
    entrega: texto(200).optional(),
    contato: z
      .object({ whatsapp: whatsapp.optional(), instagram: instagram.optional() })
      .refine((c) => c.whatsapp || c.instagram, 'Pelo menos um contato (WhatsApp ou Instagram)'),
    locais: z.array(localSchema).min(1),
    autorizacao: z.object({
      publicar: z.literal(true, 'Sem autorização para publicar, o produtor não entra no mapa'),
      data,
    }),
    visitadoEm: data.optional(),
  })
  .refine((p) => p.cultivo !== 'organico_certificado' || p.certificacao, {
    message: 'Orgânico certificado precisa da certificação (selo/certificadora)',
    path: ['certificacao'],
  });

export const arquivoLocalSchema = z
  .object({ produtores: z.array(produtorLocalSchema) })
  .refine((a) => new Set(a.produtores.map((p) => p.id)).size === a.produtores.length, {
    message: 'Há ids repetidos',
  });

/** ~1,1 km: duas casas decimais de grau. */
const arredondar = (grau: number) => Math.round(grau * 100) / 100;

/**
 * O que vai para o banco (e para o app): sem a autorização, e os locais aproximados com a
 * posição arredondada e sem endereço — a posição exata não sai do arquivo local.
 */
export function paraPublicar({
  autorizacao: _,
  ...p
}: z.output<typeof produtorLocalSchema>): Producer {
  const locais = p.locais.map(({ endereco, ...l }): ProducerPlace =>
    l.precisao === 'aproximada'
      ? { ...l, latitude: arredondar(l.latitude), longitude: arredondar(l.longitude) }
      : { ...l, ...(endereco && { endereco }) },
  );
  return { ...p, locais };
}

/** Corpo de POST /produtores/pedidos. */
export const pedidoSchema = z.object({
  nome: texto(120),
  categorias: z.array(z.enum(CATEGORIAS)).min(1).max(CATEGORIAS.length),
  produtos: texto(300),
  local: texto(300),
  whatsapp,
  instagram: instagram.optional(),
  mensagem: texto(500).optional(),
  autorizaPublicar: z.literal(true),
}) satisfies z.ZodType<ProducerRequest, unknown>;
