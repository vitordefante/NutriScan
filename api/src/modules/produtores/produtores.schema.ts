import type {
  Producer,
  ProducerCategory,
  ProducerItem,
  ProducerPhoto,
  ProducerPlace,
  ProducerRequest,
} from '@nutriscan/shared';
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
/** Só dígitos, com DDI: "047 99999-9999", "0 15 47 99999-9999" e "0055…" viram "55…". */
export function normalizarWhatsapp(numero: string): string {
  const d = numero.replace(/\D/g, '');
  // 00 + DDI: discagem internacional.
  if (d.startsWith('00')) return d.slice(2);
  if (d.startsWith('0')) {
    const nacional = d.slice(1);
    // 0 + DDD + número, ou 0 + operadora (2 dígitos) + DDD + número.
    if (nacional.length === 10 || nacional.length === 11) return `55${nacional}`;
    if (nacional.length === 12 || nacional.length === 13) return `55${nacional.slice(2)}`;
    return d;
  }
  // Só DDD + número (10 ou 11 dígitos): é do Brasil, falta o 55.
  return d.length === 10 || d.length === 11 ? `55${d}` : d;
}

const whatsapp = z
  .string()
  .transform(normalizarWhatsapp)
  // DDI + DDD + número: 12 ou 13 dígitos no Brasil (55); até 15 pelo padrão internacional.
  .pipe(
    z
      .string()
      .regex(/^[1-9]\d{11,14}$/, 'WhatsApp com DDD, ex.: (47) 99999-9999')
      .refine(
        (d) => !d.startsWith('55') || d.length <= 13,
        'WhatsApp com DDD, ex.: (47) 99999-9999',
      ),
  );
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

export const MAXIMO_FOTOS = 8;
export const MAXIMO_ITENS = 30;

/** Caminho dentro de `api/data/fotos/`, ex.: "sitio-boa-vista/banca.jpg". */
const arquivoDeFoto = texto(200).refine(
  (a) => !a.startsWith('/') && !a.split('/').includes('..'),
  'Caminho dentro de api/data/fotos/, ex.: "sitio/banca.jpg"',
);

const fotoSchema = z.object({ arquivo: arquivoDeFoto, legenda: texto(120).optional() });

const itemSchema = z.object({
  nome: texto(60),
  descricao: texto(120).optional(),
  preco: texto(40).optional(),
  foto: arquivoDeFoto.optional(),
});

/** Um produtor no arquivo local (`api/data/produtores.local.json`). */
export const produtorLocalSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'id em minúsculas com hífens'),
    nome: texto(120),
    responsavel: texto(120).optional(),
    descricao: texto(200).optional(),
    categorias: z.array(z.enum(CATEGORIAS)).min(1),
    /** Opcional quando há catálogo: os nomes dos itens entram na lista. */
    produtos: z.array(texto(60)).min(1).max(30).optional(),
    /** Itens com foto, descrição e preço ("O que vende"). */
    catalogo: z.array(itemSchema).min(1).max(MAXIMO_ITENS).optional(),
    cultivo: z.enum(['organico_certificado', 'agroecologico', 'convencional']).optional(),
    certificacao: texto(120).optional(),
    entrega: texto(200).optional(),
    contato: z
      .object({ whatsapp: whatsapp.optional(), instagram: instagram.optional() })
      .refine((c) => c.whatsapp || c.instagram, 'Pelo menos um contato (WhatsApp ou Instagram)'),
    locais: z.array(localSchema).min(1),
    /** Arquivos em `api/data/fotos/` (fora do Git), na ordem de exibição: a primeira é a capa. */
    fotos: z.array(fotoSchema).max(MAXIMO_FOTOS).optional(),
    autorizacao: z.object({
      publicar: z.literal(true, 'Sem autorização para publicar, o produtor não entra no mapa'),
      /** Autorização para publicar as fotos (imagem também é dado pessoal). */
      fotos: z.boolean().optional(),
      data,
    }),
    visitadoEm: data.optional(),
  })
  .refine((p) => p.cultivo !== 'organico_certificado' || p.certificacao, {
    message: 'Orgânico certificado precisa da certificação (selo/certificadora)',
    path: ['certificacao'],
  })
  .refine((p) => p.produtos || p.catalogo, {
    message: 'Informe os produtos ou o catálogo',
    path: ['produtos'],
  })
  .refine((p) => arquivosDeFoto(p).length === 0 || p.autorizacao.fotos === true, {
    message: 'Fotos precisam da autorização do produtor ("autorizacao": { "fotos": true })',
    path: ['autorizacao', 'fotos'],
  });

export const arquivoLocalSchema = z
  .object({ produtores: z.array(produtorLocalSchema) })
  .refine((a) => new Set(a.produtores.map((p) => p.id)).size === a.produtores.length, {
    message: 'Há ids repetidos',
  });

/** ~1,1 km: duas casas decimais de grau. */
const arredondar = (grau: number) => Math.round(grau * 100) / 100;

export type ProdutorLocal = z.output<typeof produtorLocalSchema>;

/** Todas as fotos do produtor no arquivo local: a galeria e as do catálogo. */
export function arquivosDeFoto(p: {
  fotos?: readonly { arquivo: string }[];
  catalogo?: readonly { foto?: string }[];
}): string[] {
  return [
    ...(p.fotos ?? []).map((f) => f.arquivo),
    ...(p.catalogo ?? []).flatMap((i) => (i.foto ? [i.foto] : [])),
  ];
}

/** Foto já preparada (ver `prepararFoto`), sem a legenda (que vem do arquivo local). */
export type FotoPublicada = Omit<ProducerPhoto, 'legenda'>;
/** Fotos preparadas, pelo caminho em `api/data/fotos/`. */
export type FotosPreparadas = ReadonlyMap<string, FotoPublicada>;

/**
 * O que vai para o banco (e para o app): sem a autorização, e os locais aproximados com a
 * posição arredondada e sem endereço — a posição exata não sai do arquivo local. Os caminhos das
 * fotos viram as fotos preparadas; os nomes do catálogo que faltam em `produtos` entram no fim.
 */
export function paraPublicar(
  { autorizacao: _, fotos: galeria = [], catalogo: itens, produtos = [], ...p }: ProdutorLocal,
  preparadas: FotosPreparadas = new Map(),
): Producer {
  const locais = p.locais.map(({ endereco, ...l }): ProducerPlace =>
    l.precisao === 'aproximada'
      ? { ...l, latitude: arredondar(l.latitude), longitude: arredondar(l.longitude) }
      : { ...l, ...(endereco && { endereco }) },
  );
  const fotos = galeria.flatMap(({ arquivo, legenda }): ProducerPhoto[] => {
    const f = preparadas.get(arquivo);
    return f ? [{ ...f, ...(legenda && { legenda }) }] : [];
  });
  const catalogo = itens?.map(({ foto, ...item }): ProducerItem => {
    const f = foto && preparadas.get(foto);
    return { ...item, ...(f && { foto: { ...f } }) };
  });
  const jaListados = new Set(produtos.map((n) => n.toLocaleLowerCase('pt-BR')));
  const todos = [
    ...produtos,
    ...(catalogo ?? [])
      .map((i) => i.nome)
      .filter((n) => !jaListados.has(n.toLocaleLowerCase('pt-BR'))),
  ];
  return {
    ...p,
    produtos: todos,
    ...(catalogo && { catalogo }),
    locais,
    ...(fotos.length > 0 && { fotos }),
  };
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
