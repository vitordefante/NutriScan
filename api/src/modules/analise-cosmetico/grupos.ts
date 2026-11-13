/**
 * Lista curada de ingredientes de atenção em cosméticos — docs/metodologia-cosmeticos.md, seção 4.
 * Mudou um grupo aqui? Atualize o documento e a calibração (calibracao.test.ts) juntos.
 *
 * Os padrões comparam cada ingrediente da lista já normalizado (minúsculas, sem acentos — ver
 * ingredientes.ts) e cobrem o nome INCI e os nomes comuns em português e inglês.
 */

export type NivelCosmetico = 'alto' | 'moderado' | 'baixo';

export type GrupoCosmetico = {
  id: string;
  nome: string;
  nivel: NivelCosmetico;
  padrao: RegExp;
  motivo: string;
  fonte: string;
  /**
   * Exposição potencial (ex.: contaminante possível): o produto não foi medido, o alerta é
   * inferido pelo ingrediente. Aparece como "estimado" na tela.
   */
  exposicaoPotencial?: boolean;
  /** Desconto próprio do grupo, quando o autor decidiu um valor fora do padrão do nível. */
  pontos?: number;
};

const AUTOR = 'metodologia do autor (docs/metodologia-cosmeticos.md)';

export const GRUPOS_COSMETICOS: GrupoCosmetico[] = [
  // ---------------------------------------------------------------- alto
  {
    id: 'parabenos-proibidos',
    nome: 'Parabenos proibidos',
    nivel: 'alto',
    padrao:
      /\b(?:isopropyl|isobutyl|phenyl|benzyl|pentyl) ?-?paraben|\b(?:isopropil|isobutil|fenil|benzil|pentil) ?-?parabeno/,
    motivo: 'Proibidos em cosméticos por falta de dados que comprovem a segurança.',
    fonte: 'Regulamento (UE) 358/2014; ANVISA, RDC 529/2021',
  },
  {
    id: 'lilial',
    nome: 'Lilial',
    nivel: 'alto',
    padrao: /butylphenyl methylpropional|\blilial\b/,
    motivo: 'Classificado como tóxico para a reprodução (CMR 1B); proibido em cosméticos.',
    fonte: 'Regulamento (UE) 2021/1902; ANVISA, RDC 529/2021 (alterada pela RDC 1.030/2026)',
  },
  {
    id: 'formaldeido',
    nome: 'Formaldeído',
    nivel: 'alto',
    // Só o ingrediente em si: "liberadores de formaldeído" são outro grupo.
    padrao: /^(?:formaldehyde|formalin|methylene glycol|formaldeido|formol)$/,
    motivo: 'Cancerígeno para humanos (Grupo 1).',
    fonte: 'IARC, Monografia 100F',
  },
  {
    id: 'hidroquinona',
    nome: 'Hidroquinona',
    nivel: 'alto',
    padrao: /\bhydroquinone\b|\bhidroquinona\b/,
    motivo: 'Proibida em cosméticos; uso permitido apenas em medicamentos.',
    fonte: 'Regulamento (CE) 1223/2009, Anexo II',
  },

  // ---------------------------------------------------------------- moderado
  {
    id: 'liberadores-formaldeido',
    nome: 'Liberadores de formaldeído',
    nivel: 'moderado',
    padrao:
      /dmdm hydantoin|imidazolidinyl urea|diazolidinyl urea|quaternium-15|2-bromo-2-nitropropane-1,3-diol|\bbronopol\b|sodium hydroxymethylglycinate|\bmethenamine\b|imidazolidinil ureia|diazolidinil ureia|hidantoina dmdm/,
    motivo: 'Liberam formaldeído (cancerígeno, Grupo 1) aos poucos; na UE o rótulo precisa avisar.',
    fonte: 'Regulamento (UE) 2022/1181; IARC, Monografia 100F',
  },
  {
    id: 'parabenos-restritos',
    nome: 'Propil e butilparabeno',
    nivel: 'moderado',
    padrao: /\b(?:propyl|butyl) ?-?paraben|\b(?:propil|butil) ?-?parabeno/,
    motivo:
      'Uso limitado a 0,14%; proibidos em produtos sem enxágue para a área da fralda de crianças até 3 anos.',
    fonte: 'Regulamento (UE) 358/2014; SCCS',
  },
  {
    id: 'isotiazolinonas',
    nome: 'Isotiazolinonas (MIT/MCI)',
    nivel: 'moderado',
    padrao:
      /methyl ?chloro ?isothiazolinone|methyl ?isothiazolinone|metil ?cloro ?isotiazolinona|metil ?isotiazolinona/,
    motivo: 'Alérgenos de contato frequentes; proibidas em produtos sem enxágue na UE.',
    fonte: 'Regulamentos (UE) 2016/1198 e 2017/1224',
  },
  {
    id: 'triclosan',
    nome: 'Triclosan',
    nivel: 'moderado',
    padrao: /\btriclosan\b|\btriclosano\b/,
    motivo: 'Antibacteriano de uso restrito; suspeito de desregular hormônios.',
    fonte: 'Regulamento (UE) 358/2014; SCCS',
  },
  {
    id: 'filtros-uv-restritos',
    nome: 'Filtros UV com restrição',
    nivel: 'moderado',
    padrao:
      /benzophenone-3|\boxybenzone\b|\boctocrylene\b|\bhomosalate\b|benzofenona-3|\boxibenzona\b|\boctocrileno\b|\bhomossalato\b/,
    motivo:
      'Suspeitos de desregular hormônios; a UE limitou concentração e uso (homossalato só no rosto).',
    fonte: 'Regulamentos (UE) 2022/1176 e 2022/2195; SCCS',
  },
  {
    id: 'bha',
    nome: 'BHA',
    nivel: 'moderado',
    padrao: /\bbha\b|butylated hydroxyanisole|butil-?hidroxianisol/,
    motivo: 'Antioxidante sintético possivelmente cancerígeno (Grupo 2B).',
    fonte: 'IARC, Monografia 40',
  },
  {
    id: 'siloxanos-ciclicos',
    nome: 'Siloxanos cíclicos (D4, D5, D6)',
    nivel: 'moderado',
    padrao:
      /cyclotetrasiloxane|cyclopentasiloxane|cyclohexasiloxane|cyclomethicone|ciclometicona|ciclopentassiloxano/,
    motivo: 'Persistentes e bioacumuláveis no ambiente; uso restrito na UE.',
    fonte: 'Regulamentos (UE) 2018/35 e 2024/1328 (REACH)',
  },
  {
    id: 'talco',
    nome: 'Talco',
    nivel: 'moderado',
    padrao: /^(?:talc|talco|talcum)$/,
    motivo:
      'Provavelmente cancerígeno (Grupo 2A) e com risco de contaminação por amianto — exposição potencial, não medida no produto.',
    fonte: 'IARC, Monografia 136 (2024)',
    exposicaoPotencial: true,
  },
  {
    id: 'microplasticos',
    nome: 'Microplásticos',
    nivel: 'moderado',
    padrao:
      /\bpolyethylene\b(?! glycol)|\bpolypropylene\b(?! glycol)|\bnylon-?(?:6|12)\b|polymethyl methacrylate|\bpolietileno\b(?! glicol)|\bpolipropileno\b(?! glicol)/,
    motivo: 'Partículas plásticas que persistem no ambiente; restrição progressiva na UE.',
    fonte: 'Regulamento (UE) 2023/2055',
  },
  {
    id: 'pfas',
    nome: 'PFAS ("químicos eternos")',
    nivel: 'moderado',
    padrao: /\bptfe\b|polytetrafluoroethylene|perfluoro|polyfluoro|politetrafluoretileno/,
    motivo:
      'Compostos fluorados que praticamente não se degradam — exposição potencial, não medida no produto.',
    fonte: 'ECHA, proposta de restrição universal de PFAS (2023)',
    exposicaoPotencial: true,
  },
  {
    id: 'disruptores-em-avaliacao',
    nome: 'Disruptor endócrino em avaliação',
    nivel: 'moderado',
    // Meio-termo entre baixo e moderado, por decisão do autor (12/11/2026).
    pontos: -6,
    padrao:
      /\bbenzyl salicylate\b|salicilato de benzila|\bbht\b|butylated hydroxytoluene|butil-?hidroxitolueno|\bresorcinol\b|kojic acid|acido kojico|4-methylbenzylidene camphor|enzacamene|\btriclocarban\b/,
    motivo:
      'Na lista da Comissão Europeia de possíveis disruptores endócrinos em avaliação. O SCCS viu indícios de ação hormonal, mas não comprovou efeito nas doses permitidas — por isso o peso intermediário, escolha do autor.',
    fonte: `Comissão Europeia, chamada de dados sobre potenciais disruptores endócrinos em cosméticos (2019); SCCS; ${AUTOR}`,
  },
  {
    id: 'fragrancia',
    nome: 'Fragrância não revelada',
    nivel: 'moderado',
    // "Aroma" não entra: em creme dental é o aromatizante de sabor.
    padrao: /^(?:parfum|fragrance|perfume|fragrancia|essencia)$/,
    motivo:
      'Mistura de composição oculta e principal causa de alergia de contato a cosméticos. Peso moderado por escolha do autor.',
    fonte: `Regulamento (UE) 2023/1545; ${AUTOR}`,
  },

  // ---------------------------------------------------------------- baixo (viés do autor)
  {
    id: 'alergenos-fragrancia',
    nome: 'Alérgenos de fragrância',
    nivel: 'baixo',
    padrao:
      /^(?:limonene|d-limonene|linalool|citral|eugenol|isoeugenol|coumarin|geraniol|citronellol|hexyl cinnamal|benzyl salicylate|benzyl benzoate|benzyl cinnamate|benzyl alcohol|cinnamal|cinnamyl alcohol|amyl cinnamal|amylcinnamyl alcohol|farnesol|hydroxycitronellal|alpha-isomethyl ionone|anise alcohol|evernia prunastri extract|evernia furfuracea extract|methyl 2-octynoate)$/,
    motivo: 'Alérgenos que a UE obriga a declarar no rótulo.',
    fonte: `Regulamento (UE) 2023/1545; ${AUTOR}`,
  },
  {
    id: 'sulfatos',
    nome: 'Lauril sulfato (SLS/ALS)',
    nivel: 'baixo',
    padrao: /\blauryl sulfate\b|\blauril sulfato\b/,
    motivo: 'Detergente que pode irritar pele e mucosas.',
    fonte: `Cosmetic Ingredient Review (CIR); ${AUTOR}`,
  },
  {
    id: 'etoxilados',
    nome: 'Etoxilados (PEGs)',
    nivel: 'baixo',
    padrao:
      /^peg-|\bpeg-\d|\b(?:laureth|ceteareth|steareth|oleth|ceteth|pareth)\b|\b(?:laureth|ceteareth|steareth|oleth|ceteth)-\d|\bpolysorbate\b|\bpolissorbato\b|\blaureth sulfate\b|\blauril eter sulfato\b/,
    motivo:
      'Podem trazer 1,4-dioxano (possivelmente cancerígeno, Grupo 2B) como contaminante do processo — exposição potencial.',
    fonte: `IARC, Monografia 110; ${AUTOR}`,
    exposicaoPotencial: true,
  },
  {
    id: 'derivados-petroleo',
    nome: 'Derivados de petróleo',
    nivel: 'baixo',
    padrao:
      /paraffinum liquidum|mineral oil|\bpetrolatum\b|\bparaffin\b|oleo mineral|\bvaselina\b|\bparafina\b|petrolato/,
    motivo: 'Ingredientes de origem fóssil; entram pela preferência do autor por insumos naturais.',
    fonte: AUTOR,
  },
  {
    id: 'parabenos-curtos',
    nome: 'Metil e etilparabeno',
    nivel: 'baixo',
    padrao: /\b(?:methyl|ethyl) ?-?paraben|\b(?:metil|etil) ?-?parabeno/,
    motivo:
      'Considerados seguros pelo SCCS nas doses permitidas; entram só pela preferência do autor por evitar parabenos.',
    fonte: `SCCS (2013); ${AUTOR}`,
  },
  {
    id: 'fluor',
    nome: 'Flúor',
    nivel: 'baixo',
    padrao:
      /sodium monofluorophosphate|sodium fluoride|stannous fluoride|amine fluoride|\bolaflur\b|monofluorfosfato de sodio|fluoreto de sodio|fluoreto estanoso/,
    motivo:
      'Ingerido em doses altas, foi associado a QI mais baixo em crianças (NTP, 2024) e causa fluorose dental quando crianças engolem a pasta. No uso tópico, OMS e Ministério da Saúde o recomendam contra cáries — entra pela preferência do autor.',
    fonte: `NTP, Monografia sobre flúor e neurodesenvolvimento (2024); ${AUTOR}`,
  },
  {
    id: 'silicones-lineares',
    nome: 'Silicones',
    nivel: 'baixo',
    padrao: /dimethicone|dimethiconol|dimeticona|dimeticonol|trimethicone|\bsiloxane\b/,
    motivo:
      'Sem risco à saúde apontado pelo SCCS; persistentes no ambiente — entram pelo viés ambiental do autor.',
    fonte: AUTOR,
  },
];
