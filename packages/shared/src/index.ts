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
   * true quando a base aberta estava fora do ar e a resposta veio de uma cópia
   * antiga do cache. A análise continua válida, mas os dados do produto podem estar desatualizados.
   */
  desatualizado: boolean;
  /** De onde vieram os dados do produto: a base aberta, ou só as fotos do rótulo. */
  fonte: ProductSource;
  /** A análise usa a leitura de fotos do rótulo enviadas no app (sozinha ou completando a base). */
  rotuloPorFoto: boolean;
};

export type ProductSource = 'open_food_facts' | 'open_beauty_facts' | 'foto';

/** Um produto da mesma categoria com nota maior (resumo para a lista de alternativas). */
export type Alternative = {
  barcode: string;
  tipo: ProductKind;
  nome: string;
  marca?: string;
  imagemUrl?: string;
  nota: number;
  faixa: ScoreBand;
  /** Alimentos: os pilares da nota, para mostrar em que a alternativa é melhor. */
  nova: NovaGroup | null;
  nutriScore: NutriScoreLetter | null;
  /** Quantos avisos "alto em" (lupa da ANVISA). */
  lupa: number;
  /** Quantos alertas (aditivos; em cosméticos, ingredientes de atenção). */
  alertas: number;
};

/** Resposta de GET /produtos/:barcode/alternativas. */
export type AlternativesResult =
  | {
      /** O cadastro do produto não tem categoria: não há com o que comparar. */
      status: 'sem_categoria';
    }
  | {
      status: 'ok';
      /** Nome da categoria comparada (ex.: "Maionese"); ausente quando não há um nome confiável. */
      categoria?: string;
      /**
       * Nota do produto escaneado usada como referência; null quando ele não tem nota — aí a
       * lista traz os mais bem avaliados da categoria, sem afirmar que são melhores.
       */
      referencia: number | null;
      /** Quantos produtos da categoria, vendidos no Brasil, tinham dados para a nota completa. */
      comparados: number;
      /**
       * Cadastros deixados de fora por valores fora do padrão da categoria (ex.: os valores de
       * uma porção digitados como "por 100 g").
       */
      ignorados: number;
      /**
       * Uma das buscas falhou (base fora do ar): a lista pode estar incompleta. O app não a
       * guarda, para buscar de novo da próxima vez.
       */
      incompleta: boolean;
      /** Da maior nota para a menor. */
      alternativas: Alternative[];
    };

/**
 * Uma linha de texto lida (OCR) na foto de um rótulo, no próprio aparelho.
 * Posição normalizada (0–1) com origem no canto superior esquerdo da foto em pé.
 */
export type LabelLine = {
  texto: string;
  x: number;
  y: number;
  largura: number;
  altura: number;
};

/** Corpo de POST /produtos/:barcode/rotulo: o texto lido nas fotos (as fotos não saem do aparelho). */
export type LabelSubmission = {
  tipo: ProductKind;
  /** Nome digitado pelo usuário, para produtos que não estão nas bases. */
  nome?: string;
  /** Foto da lista de ingredientes. */
  ingredientes?: LabelLine[];
  /** Foto da tabela nutricional (alimentos). */
  tabela?: LabelLine[];
};

/** Corpo das respostas de erro da API. */
export type ApiError = {
  erro:
    | 'codigo_invalido'
    | 'produto_nao_encontrado'
    | 'fonte_indisponivel'
    | 'rotulo_invalido'
    | 'rotulo_ilegivel'
    | 'dados_invalidos'
    | 'nao_autenticado'
    | 'email_em_uso'
    | 'credenciais_invalidas'
    | 'muitas_tentativas'
    | 'registro_nao_encontrado'
    | 'produtor_nao_encontrado'
    | 'foto_nao_encontrada'
    | 'nao_e_produtor'
    | 'convite_invalido'
    | 'produtor_ja_vinculado'
    | 'conta_ja_vinculada'
    | 'item_nao_encontrado'
    | 'proposta_nao_encontrada'
    | 'limite_itens'
    | 'foto_invalida';
  mensagem: string;
};

// ---------------------------------------------------------------------------------------------
// Produtores rurais (mapa)

export type ProducerCategory =
  | 'hortalicas'
  | 'frutas'
  | 'ovos'
  | 'laticinios'
  | 'carnes'
  | 'pescados'
  | 'mel'
  | 'graos'
  | 'artesanais'
  | 'cosmeticos';

/**
 * Como o produtor diz que produz. Só `organico_certificado` tem selo (SisOrg/OPAC/OCS); os
 * outros são declarados pelo produtor e o app mostra assim.
 */
export type ProducerFarming = 'organico_certificado' | 'agroecologico' | 'convencional';

/**
 * Foto do produtor (banca, produtos, plantação, criação), servida em GET /produtores/fotos/:id.
 * Reduzida e sem metadados (o EXIF do celular pode ter a posição GPS da casa do produtor).
 */
export type ProducerPhoto = {
  /** Hash do conteúdo: a mesma foto tem sempre o mesmo id (cache eterno no app). */
  id: string;
  largura: number;
  altura: number;
  legenda?: string;
};

/** Unidades de venda do catálogo (lista fechada: os preços ficam padronizados). */
export type PriceUnit =
  | 'unidade'
  | 'kg'
  | 'litro'
  | 'duzia'
  | 'bandeja'
  | 'pacote'
  | 'pote'
  | 'garrafa'
  | 'maco'
  | 'caixa';

/** Preço de um item: valor em centavos (sem arredondamento de ponto flutuante) por unidade. */
export type ProducerPrice = { centavos: number; unidade: PriceUnit };

/** Um item do catálogo do produtor ("O que vende"). */
export type ProducerItem = {
  nome: string;
  /** Embalagem, quantidade, como é feito ("Garrafa de vidro de 1 L, retornável"). */
  descricao?: string;
  preco?: ProducerPrice;
  /** Data (AAAA-MM-DD) da última mudança de preço feita pelo produtor no app. */
  precoAtualizadoEm?: string;
  foto?: ProducerPhoto;
};

/**
 * Item novo, ou mudança de nome/descrição/foto de um item, enviado pelo produtor: só entra no
 * mapa depois de o autor do app conferir.
 */
export type ItemProposal = {
  id: string;
  nome: string;
  descricao?: string;
  preco?: ProducerPrice;
  foto?: ProducerPhoto;
  situacao: 'em_analise' | 'recusada';
  /** Por que foi recusada (escrito pelo autor). */
  motivo?: string;
  /** Data e hora ISO. */
  enviadaEm: string;
};

/** Um item publicado, como o dono vê: com a mudança que ele mandou, se houver. */
export type MyCatalogItem = ProducerItem & { id: string; alteracao?: ItemProposal };

/** Resposta de GET /produtor/catalogo (área do produtor no Perfil). */
export type MyCatalog = {
  produtor: { id: string; nome: string };
  itens: MyCatalogItem[];
  /** Itens novos ainda não publicados (em análise ou recusados). */
  novos: ItemProposal[];
  /** Quantos itens (publicados + novos) o catálogo comporta. */
  limite: number;
};

/** Corpo de POST /produtor/catalogo/propostas. */
export type ItemProposalInput = {
  /** Presente = mudança de um item publicado; ausente = item novo. */
  itemId?: string;
  nome: string;
  descricao?: string;
  /** Só para item novo (o preço de um item publicado muda na hora, em outra rota). */
  preco?: ProducerPrice;
  /** Id devolvido por POST /produtor/fotos (ou a foto que o item já tem). */
  fotoId?: string;
};

/** Um lugar onde o produtor vende (um pino no mapa). */
export type ProducerPlace = {
  tipo: 'feira' | 'loja' | 'propriedade';
  nome?: string;
  endereco?: string;
  cidade: string;
  latitude: number;
  longitude: number;
  /** `aproximada`: a posição foi arredondada (~1 km) a pedido do produtor; sem endereço. */
  precisao: 'exata' | 'aproximada';
  /** Dias e horário, em texto livre ("Sábado, 7h às 12h"). */
  horario?: string;
};

export type Producer = {
  id: string;
  nome: string;
  responsavel?: string;
  descricao?: string;
  categorias: ProducerCategory[];
  /** Lista curta do que vende (cartão da lista e busca); inclui os nomes do catálogo. */
  produtos: string[];
  /** Itens com foto, descrição e preço, na ordem escolhida pelo autor. */
  catalogo?: ProducerItem[];
  cultivo?: ProducerFarming;
  /** Selo/certificadora, quando `cultivo` é `organico_certificado`. */
  certificacao?: string;
  /** Se e onde entrega, em texto livre. */
  entrega?: string;
  contato: {
    /** Só dígitos, com DDI e DDD (5547999999999). */
    whatsapp?: string;
    /** Sem o @. */
    instagram?: string;
  };
  locais: ProducerPlace[];
  /** Na ordem escolhida pelo autor; a primeira é a capa. */
  fotos?: ProducerPhoto[];
  /** Data (AAAA-MM-DD) da visita do autor; ausente quando veio só do formulário. */
  visitadoEm?: string;
};

/** Resposta de GET /produtos/:barcode/produtores: quem vende o que substitui o produto. */
export type ProducersForProduct = {
  /** null quando o produto não corresponde a nenhuma categoria de produtor. */
  categoria: ProducerCategory | null;
  produtores: Producer[];
};

/** Corpo de POST /produtores/pedidos ("Quero aparecer no mapa"). */
export type ProducerRequest = {
  nome: string;
  categorias: ProducerCategory[];
  /** O que vende, em texto livre. */
  produtos: string;
  /** Onde vende (feira, loja, cidade), em texto livre: o autor confere antes de aprovar. */
  local: string;
  whatsapp: string;
  instagram?: string;
  mensagem?: string;
  /** O produtor autoriza publicar nome, produtos, local de venda e contato. */
  autorizaPublicar: true;
};

// ---------------------------------------------------------------------------------------------
// Contas, histórico e log de exposição

export type User = { id: string; email: string };

/** Resposta de POST /contas e POST /contas/entrar. */
export type AuthResult = { token: string; usuario: User };

/** Um produto escaneado (resumo para a lista do histórico). */
export type HistoryItem = {
  barcode: string;
  tipo: ProductKind;
  nome: string;
  marca?: string;
  imagemUrl?: string;
  /** null quando o produto não tem nota (faltam dados). */
  nota: number | null;
  faixa: ScoreBand | null;
  /** Data/hora ISO 8601 do último scan. */
  escaneadoEm: string;
};

/**
 * Um consumo (alimento) ou uso (cosmético) registrado pelo usuário. Guarda a análise do momento
 * do registro: o log mostra o que se sabia do produto quando ele foi consumido.
 */
export type LogEntry = {
  id: string;
  barcode: string;
  tipo: ProductKind;
  nome: string;
  marca?: string;
  imagemUrl?: string;
  nota: number | null;
  faixa: ScoreBand | null;
  /** Alimentos: grupo NOVA (null se não houve como classificar). */
  nova: NovaGroup | null;
  /** Avisos "alto em" da lupa da ANVISA. */
  altoEm: FrontLabelNutrient[];
  /** Títulos dos alertas (aditivos; em cosméticos, ingredientes de atenção). */
  alertas: string[];
  /** Data/hora ISO 8601 do consumo/uso. */
  registradoEm: string;
};

/** Resumo do que o usuário consumiu/usou no período. */
export type ExposureSummary = {
  /** Tamanho do período em dias, terminando agora. */
  dias: number;
  registros: number;
  alimentos: number;
  cosmeticos: number;
  /**
   * Média das notas de alimentos e, à parte, de cosméticos (metodologias diferentes: uma média
   * única misturaria as duas réguas); null se não há registro com nota daquele tipo.
   */
  mediaAlimentos: { nota: number; faixa: ScoreBand } | null;
  mediaCosmeticos: { nota: number; faixa: ScoreBand } | null;
  /** Alimentos com grupo NOVA conhecido, e quantos deles são ultraprocessados (NOVA 4). */
  comNova: number;
  ultraprocessados: number;
  /** Quantas vezes cada "alto em" apareceu, do mais frequente para o menos. */
  altoEm: { nutriente: FrontLabelNutrient; vezes: number }[];
  /** Alertas mais frequentes (até 5 de cada tipo), do mais frequente para o menos. */
  aditivos: { titulo: string; vezes: number }[];
  ingredientesAtencao: { titulo: string; vezes: number }[];
};

/** Resposta de GET /registros: o resumo do período e os registros (os mais recentes primeiro). */
export type LogPeriod = { resumo: ExposureSummary; registros: LogEntry[] };
