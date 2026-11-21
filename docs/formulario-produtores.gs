/**
 * Cria no Google Forms o formulário "Quero aparecer no mapa — NutriScan", com as perguntas no
 * mesmo formato do cadastro do app (ver docs/produtores.md, seção "Formulário online").
 *
 * Como usar:
 *   1. Em forms.google.com, crie um formulário EM BRANCO e copie o id dele da barra de
 *      endereço: docs.google.com/forms/d/<ESTE TRECHO>/edit
 *      (Criar pelo script — FormApp.create — às vezes falha com "Falha ao criar o novo
 *      formulário"; preencher um formulário já criado não tem esse problema.)
 *   2. Preencha ID_FORMULARIO, AUTOR e CONTATO abaixo.
 *   3. Abra script.google.com → "Novo projeto" → apague o conteúdo e cole este arquivo.
 *   4. Escolha a função criarFormulario → "Executar" → autorize com sua conta Google.
 *   5. Os links (responder e editar) aparecem no "Registro de execução".
 *   6. No formulário (link de editar), adicione a pergunta das fotos — o Apps Script não cria
 *      pergunta de envio de arquivo — e, na aba Respostas, "Vincular ao Planilhas".
 */

const ID_FORMULARIO = '';
const AUTOR = '[seu nome]';
const CONTATO = '[seu WhatsApp, ex.: (47) 99999-9999]';

const CATEGORIAS = [
  'Verduras e legumes (alface, couve, cenoura, aipim)',
  'Frutas (banana, laranja, morango)',
  'Ovos (caipira, de codorna)',
  'Leite e queijos (leite, queijo colonial, nata, iogurte)',
  'Carnes (frango caipira, suínos, embutidos)',
  'Peixes e frutos do mar',
  'Mel (mel, própolis, melado)',
  'Grãos e farinhas (feijão, arroz, milho, farinha de mandioca)',
  'Feitos à mão (pão, geleia, conserva, cuca, café)',
  'Cosméticos naturais (sabonete artesanal, óleos)',
];

function criarFormulario() {
  const titulo = 'Quero aparecer no mapa — NutriScan';
  const form = ID_FORMULARIO ? FormApp.openById(ID_FORMULARIO) : FormApp.create(titulo);
  // Rodar duas vezes duplicaria as perguntas: só preenche formulário vazio.
  if (form.getItems().length > 0) {
    throw new Error(
      'Esse formulário já tem perguntas. Use um formulário em branco (ou apague as perguntas).',
    );
  }
  form
    .setTitle(titulo)
    .setDescription(
      'O NutriScan é um aplicativo (projeto de TCC de Engenharia de Software) que analisa ' +
        'alimentos e mostra num mapa produtores da região para quem quer comprar direto de quem ' +
        'produz. Aparecer no mapa é gratuito.\n\n' +
        `Antes de publicar, ${AUTOR} confere as informações com você pelo WhatsApp. Endereço de ` +
        'casa não é publicado: aparece o local de venda ou uma posição aproximada, como você ' +
        `preferir. Para corrigir algo ou sair do mapa, é só avisar: ${CONTATO}.`,
    )
    .setConfirmationMessage(
      'Recebido, obrigado! Vou conferir as informações com você pelo WhatsApp antes de ' +
        'publicar. Nada aparece no mapa sem essa conferência.',
    )
    .setProgressBar(true)
    .setShowLinkToRespondAgain(false);

  const ate = (n) =>
    FormApp.createTextValidation()
      .setHelpText(`No máximo ${n} caracteres.`)
      .requireTextLengthLessThanOrEqualTo(n)
      .build();
  const paragrafoAte = (n) =>
    FormApp.createParagraphTextValidation()
      .setHelpText(`No máximo ${n} caracteres.`)
      .requireTextLengthLessThanOrEqualTo(n)
      .build();

  // --- Produção ---------------------------------------------------------------------------
  form
    .addTextItem()
    .setTitle('Nome que vai aparecer no mapa')
    .setHelpText('Do sítio, da marca ou o seu.')
    .setRequired(true)
    .setValidation(ate(120));
  form
    .addTextItem()
    .setTitle('Seu nome')
    .setHelpText('Opcional: só se quiser que apareça no app.')
    .setValidation(ate(120));
  form
    .addCheckboxItem()
    .setTitle('O que você produz?')
    .setHelpText('Marque todas as que vende.')
    .setChoiceValues(CATEGORIAS)
    .setRequired(true);
  form
    .addParagraphTextItem()
    .setTitle('Quais produtos?')
    .setHelpText('Separe por vírgula. Ex.: alface, couve, aipim, ovos caipira')
    .setRequired(true)
    .setValidation(paragrafoAte(300));
  form
    .addMultipleChoiceItem()
    .setTitle('Como você produz?')
    .setChoiceValues([
      'Orgânico certificado (tenho selo ou certificação)',
      'Agroecológico ou sem agrotóxico (sem certificação)',
      'Convencional',
      'Prefiro não informar',
    ]);
  form
    .addTextItem()
    .setTitle('Se é orgânico certificado: qual a certificação?')
    .setHelpText('Ex.: SisOrg — OPAC Rede Ecovida')
    .setValidation(ate(120));
  form
    .addParagraphTextItem()
    .setTitle('Conte em uma frase sobre você ou sua produção')
    .setHelpText('Opcional. Aparece na sua página do app.')
    .setValidation(paragrafoAte(200));

  // --- Onde vender ------------------------------------------------------------------------
  form.addPageBreakItem().setTitle('Onde comprar de você');
  form
    .addCheckboxItem()
    .setTitle('Onde você vende?')
    .setChoiceValues([
      'Em feira',
      'Em loja, mercado ou empório',
      'Na propriedade (o cliente vai até lá)',
    ])
    .setRequired(true);
  form
    .addParagraphTextItem()
    .setTitle('Locais, dias e horários')
    .setHelpText(
      'Um local por linha: nome do lugar, endereço, cidade, dias e horários. ' +
        'Ex.: Feira do bairro, Rua Exemplo, Jaraguá do Sul — sábado, 7h às 12h',
    )
    .setRequired(true)
    .setValidation(paragrafoAte(600));
  form
    .addParagraphTextItem()
    .setTitle('Link de cada local no Google Maps')
    .setHelpText(
      'Opcional, mas ajuda muito. No Google Maps, segure o dedo em cima do local → ' +
        'Compartilhar → Copiar link. Um link por linha, na mesma ordem dos locais.',
    );
  form
    .addMultipleChoiceItem()
    .setTitle('Se vende na propriedade: como prefere que apareça no mapa?')
    .setChoiceValues([
      'Posição exata, com o endereço',
      'Posição aproximada (região de ~1 km), sem o endereço',
      'Não vendo na propriedade',
    ]);
  form
    .addTextItem()
    .setTitle('Faz entrega? Onde e quando?')
    .setHelpText('Opcional. Ex.: entrego no centro às sextas')
    .setValidation(ate(200));

  // --- Contato ----------------------------------------------------------------------------
  form.addPageBreakItem().setTitle('Contato que vai aparecer no app');
  form
    .addTextItem()
    .setTitle('WhatsApp (com DDD)')
    .setHelpText('O número para os clientes chamarem. Ex.: (47) 99999-9999')
    .setRequired(true)
    .setValidation(
      FormApp.createTextValidation()
        .setHelpText('Número com DDD, ex.: (47) 99999-9999')
        .requireTextMatchesPattern('^[0-9 ()+.-]{10,20}$')
        .build(),
    );
  form.addTextItem().setTitle('Instagram').setHelpText('Opcional. Ex.: @seuperfil');

  // --- Fotos e autorização ----------------------------------------------------------------
  form
    .addPageBreakItem()
    .setTitle('Fotos e autorização')
    .setHelpText(
      'Fotos deixam sua página bem mais bonita: de 2 a 5, da banca, dos produtos, da plantação ' +
        'ou da criação. Evite rostos de outras pessoas. Se preferir, mande as fotos pelo WhatsApp.',
    );
  form
    .addParagraphTextItem()
    .setTitle('Seus produtos para a vitrine do app (opcional)')
    .setHelpText(
      'Um por linha: nome — embalagem ou quantidade — preço. ' +
        'Ex.: Ovos caipira — bandeja com 30 — R$ 30. Mande uma foto de cada um junto com as outras.',
    )
    .setValidation(paragrafoAte(1500));
  // >>> Adicione aqui, pelo editor do Forms, a pergunta "Carregar arquivo" (fotos). <<<
  form
    .addMultipleChoiceItem()
    .setTitle('Posso publicar as fotos que você mandar?')
    .setChoiceValues(['Sim, pode publicar as fotos', 'Não quero fotos no app'])
    .setRequired(true);
  form
    .addCheckboxItem()
    .setTitle('Autorização')
    .setChoiceValues([
      'Autorizo publicar no app NutriScan o nome, os produtos, os locais de venda e os ' +
        'contatos que informei. Sei que posso pedir para sair do mapa quando quiser.',
    ])
    .setRequired(true);

  // Formulários novos podem nascer "não publicados" (mudança do Google Forms em 2025).
  if (typeof form.setPublished === 'function') form.setPublished(true);

  Logger.log('Link para mandar aos produtores: ' + form.getPublishedUrl());
  Logger.log('Link para editar: ' + form.getEditUrl());
}
