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
};

export type AlertSeverity = 'baixo' | 'moderado' | 'alto';

export type Alert = {
  id: string;
  titulo: string;
  descricao: string;
  severidade: AlertSeverity;
  fonte: string;
  /** true quando o alerta é inferido pela categoria (ex.: mercúrio em atum), não medido no produto. */
  estimado: boolean;
};

export type Analysis =
  | {
      status: 'ok';
      /** Nota de 0 a 100. */
      nota: number;
      itens: ScoreItem[];
      alertas: Alert[];
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
  categorias: string[];
  ingredientes?: string;
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
