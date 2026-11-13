/**
 * Tipos de domínio compartilhados entre o app e a API.
 *
 * Regra: este pacote contém SOMENTE tipos (nada que exista em tempo de execução).
 * Assim ele é importado com `import type` dos dois lados sem precisar de build.
 * Os tipos são um rascunho inicial e serão refinados nas próximas fases.
 */

export type HealthStatus = {
  status: 'ok' | 'degradado';
  db: 'ok' | 'erro';
};

export type ProductKind = 'alimento' | 'cosmetico';

/** Um item que compõe a nota — é exatamente o que a tela "por que essa nota" lista. */
export type ScoreItem = {
  id: string;
  label: string;
  /** Pontos somados (positivo) ou descontados (negativo) da nota. */
  pontos: number;
  motivo: string;
  /** Referência que justifica o item (ex.: "ANVISA RDC 429/2020"). */
  fonte: string;
  /** true quando o item foi inferido (ex.: NOVA estimada pela categoria), não lido do rótulo. */
  estimado?: boolean;
};

/** Rótulo da faixa da nota: 80–100, 60–79, 40–59, 20–39, 0–19. */
export type ScoreBand = 'excelente' | 'bom' | 'regular' | 'ruim' | 'pessimo';

export type AlertSeverity = 'baixo' | 'moderado' | 'alto';

export type Alert = {
  id: string;
  titulo: string;
  descricao: string;
  severidade: AlertSeverity;
  fonte: string;
  /** true quando o alerta é inferido pela categoria (ex.: mercúrio em atum), não medido no produto. */
  estimado: boolean;
  /** Cosméticos: os nomes do rótulo que ativaram o alerta (ex.: ["Methylparaben", "Propylparaben"]). */
  ingredientes?: string[];
};

export type NovaGroup = 1 | 2 | 3 | 4;
export type NutriScoreLetter = 'A' | 'B' | 'C' | 'D' | 'E';
export type FrontLabelNutrient = 'acucar_adicionado' | 'gordura_saturada' | 'sodio';

/**
 * Os pilares da nota em formato estruturado, para a tela de resultado montar cada seção
 * (NOVA, Nutri-Score, lupa) sem precisar interpretar o texto dos itens.
 */
export type AnalysisHighlights = {
  nova: {
    grupo: NovaGroup;
    /** Ex.: "Ultraprocessado". */
    nome: string;
    /** Diz também quando o grupo foi estimado (ex.: "Estimado pela categoria…"). */
    motivo: string;
  } | null;
  nutriScore: { letra: NutriScoreLetter } | null;
  /** Avisos da rotulagem frontal da ANVISA ("lupa"); vazio quando não há nenhum "alto em". */
  lupa: {
    nutriente: FrontLabelNutrient;
    /** Ex.: "Alto em açúcar adicionado". */
    titulo: string;
    /** Ex.: "33 g por 100 g (limite: 15 g)". */
    detalhe: string;
    estimado: boolean;
  }[];
};

/**
 * Resultado da análise. A nota é `100 + soma dos pontos dos itens`, limitada a 0–100
 * (ver docs/metodologia-nota.md).
 */
export type Analysis =
  | {
      status: 'completa';
      /** Nota de 0 a 100. */
      nota: number;
      faixa: ScoreBand;
      itens: ScoreItem[];
      alertas: Alert[];
      destaques: AnalysisHighlights;
    }
  | {
      /**
       * Faltou parte dos dados. Como quase todos os itens são descontos, a nota é um TETO:
       * com os dados completos ela só poderia ficar igual ou menor.
       */
      status: 'parcial';
      nota: number;
      faixa: ScoreBand;
      itens: ScoreItem[];
      alertas: Alert[];
      destaques: AnalysisHighlights;
      faltando: string[];
    }
  | {
      status: 'dados_insuficientes';
      /** O que faltou para calcular a nota (ex.: "tabela nutricional"). */
      faltando: string[];
      alertas: Alert[];
    };

export type Product = {
  barcode: string;
  tipo: ProductKind;
  nome: string;
  marca?: string;
  imagemUrl?: string;
  /** Categoria curta em português para exibição (ex.: "Biscoitos"); ausente quando não há uma confiável. */
  subtipo?: string;
  categorias: string[];
  ingredientes?: string;
};

/** Resposta de GET /produtos/:barcode. */
export type ProductResult = {
  produto: Product;
  analise: Analysis;
  /**
   * true quando a fonte (Open Food Facts) estava fora do ar e a resposta veio de uma cópia
   * antiga do cache. A análise continua válida, mas os dados do produto podem estar desatualizados.
   */
  desatualizado: boolean;
};

/** Corpo das respostas de erro da API. */
export type ApiError = {
  erro: 'codigo_invalido' | 'produto_nao_encontrado' | 'fonte_indisponivel';
  mensagem: string;
};

export type ProducerCategory =
  'laticinios' | 'carnes' | 'ovos' | 'aves' | 'hortifruti' | 'mel' | 'graos' | 'outros';

export type Producer = {
  id: string;
  nome: string;
  descricao?: string;
  categorias: ProducerCategory[];
  produtos: string[];
  /** Pode ser o ponto de venda (feira) ou uma localização aproximada. */
  local: {
    descricao: string;
    latitude: number;
    longitude: number;
  };
  whatsapp?: string;
  fotos: string[];
};

export type LogEntry = {
  id: string;
  barcode: string;
  tipo: ProductKind;
  nota: number | null;
  /** Data/hora ISO 8601 do consumo/uso. */
  registradoEm: string;
};
