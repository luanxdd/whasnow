/**
 * O Baileys oficial (`@whiskeysockets/baileys`) monta e relaya
 * `buttonsMessage`/`listMessage` corretamente em termos de protobuf, mas
 * parou de anexar um conjunto de nós binários extras que o app oficial do
 * WhatsApp sempre envia junto — sem eles, o WhatsApp não renderiza a
 * mensagem (ou nunca confirma o envio).
 *
 * Essa técnica é uma reconstituição não-oficial (engenharia reversa) desses
 * nós, replicada por vários forks/patches da comunidade (itsukichan,
 * pacotes "button-helper", Evolution API). Pode parar de funcionar a
 * qualquer momento se o WhatsApp mudar o protocolo — trate como recurso
 * experimental, não crítico.
 */

export interface InteractiveBinaryNode {
  tag: string;
  attrs: Record<string, string>;
  content?: InteractiveBinaryNode[];
}

export function buildButtonsNodes(isGroup: boolean): InteractiveBinaryNode[] {
  const nodes: InteractiveBinaryNode[] = [
    {
      tag: 'biz',
      attrs: {},
      content: [
        {
          tag: 'interactive',
          attrs: { type: 'native_flow', v: '1' },
          content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }],
        },
      ],
    },
  ];

  if (!isGroup) {
    nodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });
  }

  return nodes;
}

export function buildListNodes(isGroup: boolean): InteractiveBinaryNode[] {
  const nodes: InteractiveBinaryNode[] = [
    {
      tag: 'biz',
      attrs: {},
      content: [{ tag: 'list', attrs: { type: 'product_list', v: '2' } }],
    },
  ];

  if (!isGroup) {
    nodes.push({ tag: 'bot', attrs: { biz_bot: '1' } });
  }

  return nodes;
}
