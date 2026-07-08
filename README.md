# WhaSnow

> Biblioteca TypeScript para construir bots de WhatsApp, com uma API fluente sobre o [Baileys](https://github.com/WhiskeySockets/Baileys).

WhaSnow organiza o Baileys em entidades (`Chat`, `Group`, `Member`, `Message`, `Contact`), um roteador de comandos e uma hierarquia de erros tipados.

```ts
import { Client } from 'whasnow';

const client = new Client({ phoneNumber: '5511999999999' });

client.onMessage(async (ctx) => {
  if (ctx.message.text === '!ping') {
    await ctx.reply('pong 🏓');
  }
});

await client.start();
```

---

## Índice

- [Instalação](#instalação)
- [Conceitos principais](#conceitos-principais)
- [Conectando o cliente](#conectando-o-cliente)
- [Recebendo mensagens](#recebendo-mensagens)
- [Sistema de comandos](#sistema-de-comandos)
- [Middleware](#middleware)
- [Removendo listeners](#removendo-listeners)
- [Enviando mensagens e mídia](#enviando-mensagens-e-mídia)
- [Álbum de imagens](#álbum-de-imagens)
- [Criando stickers](#criando-stickers)
- [Trabalhando com grupos](#trabalhando-com-grupos)
- [Mute nativo](#mute-nativo)
- [Poll (enquetes) como mecanismo de interação](#poll-enquetes-como-mecanismo-de-interação)
- [Status (stories)](#status-stories)
- [Chamadas (call)](#chamadas-call)
- [Eventos](#eventos)
- [Tratamento de erros](#tratamento-de-erros)
- [Referência de configuração](#referência-de-configuração)

---

## Instalação

```bash
npm install whasnow
```

Requer **Node.js 20+** e **TypeScript 5+**. Os tipos já vêm inclusos, sem necessidade de `@types` separados.

---

## Conceitos principais

| Conceito                             | O que é                                                                                    |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| `Client`                             | Ponto de entrada. Gerencia conexão, sessão e despacha mensagens.                              |
| `Context` (`ctx`)                    | Objeto com tudo sobre uma mensagem recebida: quem enviou, de onde e como responder.           |
| `Chat`, `Group`, `Member`, `Contact` | Entidades para conversas, grupos, participantes e contatos, cada uma com seus próprios métodos.|
| `CommandRouter`                      | Roteador opcional de comandos baseado em prefixo (`!ping`, `!ban`, etc).                       |
| Erros tipados                        | Toda falha previsível é uma subclasse de `WhaSnowError`, nunca um `Error` genérico.            |

---

## Conectando o cliente

```ts
import { Client } from 'whasnow';

const client = new Client({
  phoneNumber: '5511999999999',
  authDir: './sessao', // onde a sessão autenticada é salva
  logLevel: 'warn',
});

await client.start();
```

Na primeira execução, a WhaSnow solicita um **código de pareamento** e o emite pelo evento `pairing.code`:

```ts
client.on('pairing.code', ({ code }) => {
  console.log(`Digite este código no WhatsApp: ${code}`);
});
```

Nas próximas execuções, a sessão salva em `authDir` é reaproveitada. Não é necessário parear de novo, e a reconexão automática (com backoff exponencial) é tratada internamente.

```ts
client.on('ready', () => console.log('Conectado!'));

client.on('disconnected', ({ reason, willReconnect }) => {
  if (!willReconnect) {
    console.log('Sessão encerrada, será necessário reautenticar.');
  }
});
```

---

## Recebendo mensagens

```ts
client.onMessage(async (ctx) => {
  console.log(`${ctx.from.jid} disse: ${ctx.message.text}`);
});
```

O `ctx` dá acesso a tudo sobre a mensagem recebida:

```ts
client.onMessage(async (ctx) => {
  ctx.message.text; // texto da mensagem
  ctx.message.isMedia; // se é imagem/vídeo/áudio/documento/sticker
  ctx.message.mediaType; // 'image' | 'video' | 'audio' | 'document' | 'sticker' | null
  ctx.isGroup; // se veio de um grupo
  ctx.from.jid; // quem enviou
  ctx.message.quoted; // mensagem citada (reply), se houver
  ctx.message.mentions; // JIDs mencionados na mensagem
});
```

### Respondendo

```ts
await ctx.reply('Recebido!'); // cita a mensagem original
await ctx.send('Mensagem solta'); // envia sem citar
await ctx.react('🔥'); // reage com emoji
```

### Aguardando uma resposta

`ctx.waitForReply()` espera a próxima mensagem do mesmo remetente, útil para fluxos de uma etapa só:

```ts
client.onMessage(async (ctx) => {
  if (ctx.message.text !== '!confirmar') return;

  await ctx.reply('Tem certeza? Responda "sim" ou "não".');

  try {
    const resposta = await ctx.waitForReply({ timeoutMs: 30_000 });

    if (resposta.message.text.toLowerCase() === 'sim') {
      await resposta.reply('Confirmado ✅');
    }
  } catch (err) {
    if (err instanceof ReplyTimeoutError) {
      await ctx.reply('Tempo esgotado.');
    }
  }
});
```

Use `client.waitForReply({ fromJid, filter, timeoutMs })` para esperar por alguém que não seja necessariamente quem enviou a mensagem atual.

### Aguardando a conexão

```ts
await client.start();
await client.waitUntilReady(); // resolve quando a conexão abrir

console.log('Pronto para uso!');
```

---

## Sistema de comandos

O `CommandRouter` evita ter que escrever `if (texto.startsWith('!'))` manualmente:

```ts
const router = client.commands({ prefix: '!' });

router.register({
  name: 'ping',
  execute(ctx) {
    return ctx.reply('pong 🏓');
  },
});

router.register({
  name: 'ban',
  onlyGroup: true, // só funciona dentro de grupos
  onlyAdmin: true, // só quem é admin do grupo pode rodar
  cooldownMs: 3_000, // 3s de cooldown por usuário
  async execute(ctx, args) {
    const targets = ctx.targets(); // menções + quem foi citado no reply
    // ...
  },
});

router.register({
  name: 'once',
  onlyOwner: true, // só executa se a mensagem for do próprio número do bot
  async execute(ctx) {
    // ...
  },
});
```

`execute` aceita `async`/`await` ou pode retornar a Promise direto (`return ctx.reply(...)`).

### Comandos restritos ao dono (`onlyOwner`)

Mensagens enviadas pelo próprio número autenticado do bot (`fromMe`) chegam normalmente aos handlers e ao `CommandRouter`, a WhaSnow não descarta mais essas mensagens. Isso permite, por exemplo, enviar comandos para o próprio bot a partir do celular do dono.

Para restringir um comando exclusivamente a essas mensagens, use `onlyOwner: true`:

```ts
router.register({
  name: 'once',
  onlyOwner: true,
  async execute(ctx) {
    return ctx.reply('Só o dono do bot chega até aqui.');
  },
});
```

Dentro de `execute` (ou em qualquer handler registrado com `client.onMessage`), também é possível checar isso manualmente através de `ctx.isOwner`:

```ts
client.onMessage(async (ctx) => {
  if (!ctx.isOwner) return;

  // lógica exclusiva do dono
});
```

`ctx.isOwner` reflete o `fromMe` reportado pelo próprio WhatsApp, então funciona mesmo em conversas consigo mesmo (onde o JID do remetente normalmente não vem preenchido no payload).

Para comandos simples, `router.registerMap()` evita repetir `name`: a chave já é o nome do comando.

```ts
router.registerMap({
  ping: (ctx) => {
    return ctx.reply('pong 🏓');
  },

  ban: {
    onlyGroup: true,
    onlyAdmin: true,
    async execute(ctx, args) {
      // ...
    },
  },
});
```

### Argumentos tipados

O segundo parâmetro de `execute` é um `ArgsParser`, não um `string[]` cru. Cada método consome o próximo argumento posicional já validado e convertido:

```ts
router.register({
  name: 'mute',
  onlyGroup: true,
  onlyAdmin: true,
  async execute(ctx, args) {
    const alvo = args.string('usuario');
    const minutos = args.number('minutos', { default: 5 });

    // ...
  },
});
```

- `args.string(nome, options?)`: string
- `args.number(nome, options?)`: number; lança `InvalidArgumentError` se não for numérico
- `args.boolean(nome, options?)`: aceita `sim/não`, `true/false`, `1/0`
- `args.rest(nome, options?)`: junta todo o restante em uma única string
- `args.remaining()`: o que ainda não foi consumido, como `string[]`
- `args.raw`: todos os tokens originais, sem consumir o cursor

Todos os métodos aceitam `{ default }` ou `{ optional: true }`. Sem nenhum dos dois, um argumento ausente lança `MissingArgumentError`.

### Bloqueio e erros de comando

Se um comando é bloqueado (`onlyGroup`, `onlyAdmin`, `onlyOwner`, `cooldownMs`) e nenhum `onBlocked` é informado, a WhaSnow responde com uma mensagem padrão em português. Para desabilitar isso, use `notifyBlocked: false`:

```ts
client.commands({
  prefix: '!',
  notifyBlocked: false, // nenhuma mensagem automática de bloqueio
});
```

Use `onBlocked` para controlar a mensagem:

```ts
client.commands({
  prefix: '!',
  onBlocked: (ctx, reason, command) => {
    if (reason === 'admin') {
      return ctx.reply(`Só admins podem usar !${command.name}.`);
    }
  },
});
```

`reason` é um dos valores: `'group' | 'admin' | 'cooldown'`.

Se o `execute()` de um comando lançar um erro, use `onError` para tratá-lo. Sem isso, o erro sobe até o `client.on('error', ...)` e a mensagem original fica sem resposta:

```ts
client.commands({
  prefix: '!',
  onError: (err, ctx, command) => {
    return ctx.reply('Deu ruim ao executar esse comando');
  },
});
```

### Auto-load de comandos

`router.loadCommands()` varre um diretório (recursivamente, por padrão) e registra todo `CommandDefinition` exportado em cada arquivo encontrado. Não precisa ser `export default`, qualquer export nomeado é detectado:

```ts
const router = client.commands({ prefix: '!' });

await router.loadCommands(new URL('./commands', import.meta.url));
```

Funciona tanto em desenvolvimento (`tsx`) quanto após o build (`tsc`), já que `import.meta.url` aponta sempre para o próprio arquivo em execução.

Um único arquivo pode exportar mais de um comando:

```ts
// commands/moderation/sanction.ts
export const ban: CommandDefinition = { name: 'ban' /* ... */ };
export const unban: CommandDefinition = { name: 'unban' /* ... */ };
```

Arquivos `*.test.ts`, `*.spec.ts` e `*.d.ts` são ignorados automaticamente. Outras opções:

```ts
await router.loadCommands(new URL('./commands', import.meta.url), {
  recursive: true, // varre subpastas (padrão: true)
  extensions: ['.ts'], // extensões aceitas (padrão: .js, .mjs, .cjs, .ts, .mts, .cts)

  filter: (command, filePath) => {
    // retorne false para pular um comando específico
    return true;
  },

  onFileLoaded: (filePath, commands) => {
    console.log(`${filePath}: ${commands.length} comando(s)`);
  },
});
```

`loadCommands()` retorna `{ commands, files }`. Se o diretório não existir, lança `CommandDirectoryNotFoundError`; se um arquivo falhar ao ser importado, lança `CommandLoadError` com a propriedade `path` apontando para o arquivo problemático.

---

## Middleware

`client.use()` registra um middleware no estilo Express/Koa: roda em sequência, antes de qualquer `onMessage()`, e interrompe a cadeia inteira ao não chamar `next()`.

```ts
client.use(async (ctx, next) => {
  if (await isBlacklisted(ctx.from.jid)) {
    return; // não chama next(): mensagem é descartada aqui
  }

  await next();
});

client.onMessage(async (ctx) => {
  // só roda se todos os middlewares chamarem next()
});
```

Útil para filtros globais: lista de bloqueio, log de auditoria, rate limit por usuário, tudo que deve rodar antes da lógica de qualquer comando.

---

## Removendo listeners

Todo `on`/`onMessage` tem seu par de remoção:

```ts
const handler = (ctx) => {
  /* ... */
};

client.onMessage(handler);
client.offMessage(handler); // remove

client.on('ready', onReady);
client.off('ready', onReady); // remove
```

---

## Enviando mensagens e mídia

`ctx.chat.send`, `Chat.send` e `Message` (via `replyWith*`) expõem os mesmos métodos de envio, no formato `(source, options?)`:

```ts
await ctx.chat.send.text('Olá!', { mentions: [ctx.from.jid] });

await ctx.chat.send.image('./foto.png', { caption: 'Legenda opcional' });
await ctx.chat.send.video('https://exemplo.com/video.mp4', { caption: 'Confira' });
await ctx.chat.send.audio('./audio.mp3', { voice: true });
await ctx.chat.send.document('./relatorio.pdf', {
  fileName: 'relatorio.pdf',
  caption: 'Segue o relatório',
});
await ctx.chat.send.sticker('./foto-qualquer.jpg'); // veja "Criando stickers" abaixo
```

O mesmo vale para responder a uma mensagem recebida:

```ts
await ctx.message.replyWithImage(image, { caption: 'Legenda' });
await ctx.message.replyWithAudio(audio, { voice: true });
await ctx.message.replyWithDocument(file, {
  fileName: 'Manual.pdf',
  caption: 'Leia este arquivo',
});
```

`MediaSource` aceita caminho de arquivo local, URL (`http://`/`https://`) ou `Buffer` em memória. Todos os métodos de mídia também aceitam `MediaSource | null | undefined`: se `source` for `null` ou `undefined`, o método não envia nada e resolve normalmente, sem lançar erro.

```ts
// Antes
if (track.coverUrl) {
  await message.replyWithImage(track.coverUrl);
}

// Agora
await message.replyWithImage(track.coverUrl);
```

Isso vale só para `null`/`undefined`. Uma string vazia ou um caminho inválido geram erro normalmente.

### Opções por tipo de mídia

Cada método tem sua própria interface de opções (`SendImageOptions`, `SendVideoOptions`, `SendAudioOptions`, `SendDocumentOptions`):

```ts
interface SendImageOptions {
  caption?: string;
  viewOnce?: boolean;
  mentions?: Jid[];
}

interface SendAudioOptions {
  voice?: boolean;
  viewOnce?: boolean;
}

interface SendDocumentOptions {
  fileName?: string;
  caption?: string;
  mentions?: Jid[];
}
```

`SendAudioOptions` não tem `caption`/`mentions`: o WhatsApp não exibe legenda nem menções em áudios.

### Mensagens "ver uma vez" (view-once)

`image`, `video` e `audio` aceitam `viewOnce` nas opções:

```ts
await ctx.chat.send.image('./foto.png', {
  caption: 'Some uma vez você vê',
  viewOnce: true,
});
await ctx.chat.send.video('./clipe.mp4', { viewOnce: true });
```

Para detectar se uma mensagem recebida é view-once ou efêmera:

```ts
client.onMessage(async (ctx) => {
  if (ctx.message.isViewOnce) {
    /* ... */
  }
  if (ctx.message.isEphemeral) {
    /* ... */
  }
});
```

Combine com `mediaType` para saber o que é o conteúdo antes de decidir o que fazer com ele — por exemplo, ao reenviar uma mídia "ver uma vez" para outro chat antes que ela seja apagada:

```ts
client.onMessage(async (ctx) => {
  const quoted = ctx.message.quoted;

  if (!quoted?.isViewOnce) return;

  const buffer = await quoted.downloadMedia();

  switch (quoted.mediaType) {
    case 'image':
      await ctx.chat.send.image(buffer, { caption: 'Salvei essa 👀' });
      break;
    case 'video':
      await ctx.chat.send.video(buffer, { caption: 'Salvei essa 👀' });
      break;
    case 'audio':
      await ctx.chat.send.audio(buffer);
      break;
    default:
      await ctx.chat.send.document(buffer, { fileName: 'view-once' });
  }
});
```

### Indicadores de digitação

```ts
await ctx.chat.typing(); // "digitando..."
await ctx.chat.recording(); // "gravando áudio..."
await ctx.chat.stopTyping(); // remove o indicador
```

### Ações sobre uma mensagem específica

```ts
await ctx.message.edit('Texto corrigido');
await ctx.message.delete(); // apaga para todos
await ctx.message.pin(); // fixa no chat
await ctx.message.forward(outroJid);
const buffer = await ctx.message.downloadMedia();
```

### Controle de envio em massa

Todo envio passa por uma fila interna com intervalo mínimo configurável, para proteger contra throttling/banimento do WhatsApp em rajadas:

```ts
const client = new Client({
  phoneNumber: '5511999999999',
  sendIntervalMs: 250, // padrão: ~4 mensagens/s. Use 0 para desabilitar.
});
```

O limite é por `Client` (conta), não por chat. Enviar para 10 chats diferentes ainda respeita o mesmo intervalo entre si.

---

## Álbum de imagens

`send.album()` agrupa várias imagens e vídeos numa única mensagem, na mesma visualização em grade que o WhatsApp usa nativamente:

```ts
await ctx.chat.send.album([
  { image: './foto1.jpg', caption: 'Legenda da primeira' },
  { image: './foto2.jpg' },
  { video: './clipe.mp4', caption: 'E um vídeo também' },
]);
```

Cada item aceita `image` ou `video` (nunca os dois no mesmo item), no mesmo formato de `MediaSource` usado pelos outros métodos de envio, com `caption` opcional por item.

```ts
await ctx.message.replyWithAlbum([{ image: fotoBuffer }, { image: outraFotoBuffer }]); // cita a mensagem original
```

Por baixo dos panos, a WhaSnow envia primeiro uma mensagem "contêiner" avisando quantas mídias vêm a seguir, e cada mídia é enviada individualmente apontando de volta pra esse contêiner. `send.album()`/`replyWithAlbum()` só resolvem depois que todas as mídias forem enviadas, e retornam a mensagem contêiner (um `Message`), não uma lista com as mídias individuais.

---

## Criando stickers

`send.sticker()` aceita **qualquer imagem, gif ou vídeo** (caminho, URL ou `Buffer`) e monta a figurinha: redimensiona pro quadrado 512x512, converte pra webp e, se for gif/vídeo, gera uma figurinha animada.

```ts
await ctx.chat.send.sticker('./foto.jpg'); // imagem comum -> sticker estático
await ctx.chat.send.sticker('./meme.gif'); // gif -> sticker animado
await ctx.chat.send.sticker('https://exemplo.com/x.png');
await ctx.message.replyWithSticker('./foto.jpg'); // cita a mensagem original
```

Se a mídia já for um `.webp` estático dentro dos limites do WhatsApp, a WhaSnow envia direto, sem reprocessar.

### Nome do pack e autor

Passe `packName`/`authorName` (e opcionalmente `categories`, os emojis do seletor de figurinhas) para gravar como metadado no arquivo:

```ts
await ctx.chat.send.sticker('./foto.jpg', {
  packName: 'Figurinhas do Grupo',
  authorName: 'WhaSnow Bot',
  categories: ['😂', '🔥'],
});
```

Figurinhas com o mesmo `packName`/`authorName` são agrupadas no mesmo pack. Para não repetir isso em todo envio, configure um padrão no `Client`:

```ts
const client = new Client({
  phoneNumber: '5511999999999',
  stickerDefaults: {
    packName: 'Figurinhas do Grupo',
    authorName: 'WhaSnow Bot',
  },
});
```

Qualquer `packName`/`authorName` passado direto na chamada tem prioridade sobre esse padrão.

### Enquadramento

Por padrão (`crop: 'contain'`), a imagem inteira é preservada e o espaço sobrando fica transparente (ou usa `backgroundColor`, se informado). Use `crop: 'cover'` para preencher o quadrado inteiro, cortando as bordas:

```ts
await ctx.chat.send.sticker('./foto-retrato.jpg', {
  crop: 'cover',
});
```

### Limites e erros

Figurinhas animadas são cortadas em até 6 segundos e reduzidas de qualidade automaticamente pra caber nos ~500KB que o WhatsApp aceita; estáticas seguem uma lógica parecida para o limite de ~1MB. Se não for possível gerar algo dentro do limite, ou a mídia de origem for inválida, o método rejeita com `StickerBuildError`:

```ts
import { StickerBuildError } from 'whasnow';

try {
  await ctx.chat.send.sticker(video);
} catch (err) {
  if (err instanceof StickerBuildError) {
    await ctx.reply('Não consegui transformar isso em figurinha 😕');
  }
}
```

---

## Trabalhando com grupos

```ts
const group = ctx.requireGroup(); // lança erro se não for grupo
// ou: const group = ctx.group(); // retorna null em vez de lançar

const membros = await group.members();
const admins = await group.admins();

await group.member(jid).promote();
await group.member(jid).demote();
await group.member(jid).remove();

await group.setName('Novo nome');
await group.open(); // só admins enviam mensagens
await group.close(); // todos enviam mensagem
await group.inviteLink();
await group.info(); // nome, descrição, dono, criação, etc.
await group.setLocked(true); // só admins editam infos do grupo
```

Use `ctx.group()` para tratar o caso "não é grupo" manualmente, e `ctx.requireGroup()` quando o comando só faz sentido dentro de um grupo.

### Criando e entrando em grupos

```ts
const group = await client.createGroup('Nome do grupo', [jid1, jid2]);

const group = await client.joinGroup('https://chat.whatsapp.com/XXXXXXXX');
```

### Solicitações de entrada

Grupos com aprovação de admin habilitada acumulam pedidos de entrada pendentes:

```ts
const solicitacoes = await group.joinRequests();

await group.approveJoinRequests([jid1, jid2]);
await group.rejectJoinRequests([jid3]);
```

---

## Mute nativo

A WhaSnow inclui um mute em nível de protocolo: mensagens de usuários mutados são automaticamente apagadas do grupo.

Para habilitar, informe `moderationDbPath` ao criar o `Client`:

```ts
const client = new Client({
  phoneNumber: '5511999999999',
  moderationDbPath: './moderacao.db',
});
```

E use a partir de qualquer `Member`:

```ts
await group.member(jid).mute({ duration: 3_600_000 }); // 1 hora em ms
await group.member(jid).mute(); // sem expiração
await group.member(jid).unmute();
group.member(jid).isMuted();
```

> Sem `moderationDbPath` configurado, chamar `.mute()`/`.unmute()`/`.isMuted()` lança `ModerationStoreUnavailableError`.

---

## Poll (enquetes) como mecanismo de interação

```ts
const poll = await ctx.chat.send.poll(
  'Qual prefere?',
  ['🍕 Pizza', '🍔 Hambúrguer', '🌮 Taco'],
  { selectableCount: 1 }, // 1 = escolha única (padrão). Use um valor maior para múltipla escolha.
);
```

Ouça os votos chegarem em tempo real:

```ts
client.on(
  'poll.vote',
  ({ chatId, pollMessageId, voterJid, selectedOptions }) => {
    console.log(`${voterJid} votou em: ${selectedOptions.join(', ')}`);
  },
);
```

Ou agregue os votos recebidos até agora a partir da própria mensagem da poll:

```ts
const resultados = poll.votes(); // PollVote[], só reflete votos chegados enquanto o processo está rodando
```

---

## Status (stories)

```ts
client.on('status.posted', ({ statusId, from, isMedia }) => {
  console.log(`${from} postou um status (${isMedia ? 'mídia' : 'texto'})`);
});

await client.status.text('Bom dia! ☀️', {
  statusJidList: [contatoJid1, contatoJid2], // obrigatório: quem pode ver
  backgroundColor: '#FF5733',
});

await client.status.image('./foto.jpg', {
  statusJidList: [contatoJid1, contatoJid2],
  caption: 'Legenda do status',
});

await client.status.video('./clipe.mp4', {
  statusJidList: [contatoJid1, contatoJid2],
});
```

> Receber `status.posted` de outros contatos depende das configurações de privacidade deles. A WhaSnow só recebe o que o WhatsApp decide entregar.

---

## Chamadas (call)

```ts
client.on('call', ({ callId, from, status, isVideo, isGroup }) => {
  console.log(`Chamada de ${from} (${isVideo ? 'vídeo' : 'voz'}): ${status}`);

  if (status === 'offer') {
    client.rejectCall(callId, from);
  }
});
```

`status` é um dos valores: `'offer' | 'ringing' | 'accept' | 'reject' | 'timeout'`. A WhaSnow não atende chamadas, apenas recusa (`rejectCall()`).

---

## Eventos

```ts
client.on('ready', () => {});
client.on('pairing.code', ({ code, phoneNumber }) => {});
client.on('disconnected', ({ reason, willReconnect, attempt }) => {});
client.on('reconnecting', ({ attempt }) => {});
client.on('error', (err) => {});

client.on('group.updated', (payload) => {});
client.on('group.participant', (payload) => {});
client.on('group.joinRequest', (payload) => {});
client.on('presence', (payload) => {});
client.on('message.edited', (payload) => {});
client.on('message.deleted', (payload) => {});
client.on('message.reaction', (payload) => {});
client.on('message.receipt', (payload) => {});

client.on('chat.upserted', (payload) => {});
client.on('chat.updated', (payload) => {});
client.on('chat.deleted', (payload) => {});

client.on('contact.upserted', (payload) => {});
client.on('contact.updated', (payload) => {});

client.on('blocklist.updated', (payload) => {});

client.on('call', (payload) => {});
client.on('poll.vote', (payload) => {});
client.on('status.posted', (payload) => {});
```

- `group.participant` carrega `actorId`: quem executou a ação (adicionou, removeu, promoveu ou rebaixou). Útil para auditoria e para reagir a mudanças de admin feitas por outra pessoa que não o próprio afetado.
- `group.joinRequest` dispara quando alguém pede pra entrar num grupo com aprovação de admin ativada, ou quando o pedido é retirado/negado (`action`: `'created'`, `'rejected'` ou `'revoked'`). Para aprovar ou negar, use `group.approveJoinRequests()` / `group.rejectJoinRequests()`.
- `message.reaction` dispara a cada reação (emoji) adicionada ou removida de uma mensagem; `emoji: null` e `removed: true` indicam que a reação foi retirada.
- `message.receipt` dispara conforme o status de entrega evolui (`'delivered'` → `'read'` → `'played'`, esse último só para mídia de voz/vídeo único).
- `chat.upserted`/`chat.updated`/`chat.deleted` acompanham a lista de conversas.
- `contact.upserted`/`contact.updated` acompanham a agenda de contatos sincronizada da conta conectada.
- `blocklist.updated` dispara tanto no snapshot inicial (`type: 'set'`) quanto quando alguém é bloqueado/desbloqueado (`type: 'add' | 'remove'`).

Use `.once()` em vez de `.on()` quando só precisar escutar a primeira ocorrência.

---

## Tratamento de erros

Toda exceção previsível lançada pela WhaSnow estende `WhaSnowError`, e cada uma tem um `code` estável que não muda entre versões.

```ts
import {
  WhaSnowError,
  NotStartedError,
  GroupContextError,
  ModerationStoreUnavailableError,
} from 'whasnow';

try {
  await client.group(jid).member(userJid).mute();
} catch (err) {
  if (err instanceof ModerationStoreUnavailableError) {
    console.log(err.code); // 'MODERATION_STORE_UNAVAILABLE'
  } else if (err instanceof WhaSnowError) {
    console.log('Erro conhecido da WhaSnow:', err.code);
  } else {
    throw err; // erro inesperado, deixe subir
  }
}
```

### Erros disponíveis

| Classe                            | `code`                         | Quando ocorre                                                                                       |
| --------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `AlreadyStartedError`             | `CLIENT_ALREADY_STARTED`       | `client.start()` chamado mais de uma vez                                                                |
| `NotStartedError`                 | `CLIENT_NOT_STARTED`           | Operação que precisa de conexão ativa, chamada antes de `start()`                                       |
| `PairingCodeError`                | `PAIRING_CODE_FAILED`          | Falha ao gerar/solicitar o código de pareamento                                                         |
| `ConnectionError`                 | `CONNECTION_FAILED`            | Falha de conexão não recuperável, ou timeout em `waitUntilReady()`                                      |
| `GroupContextError`               | `GROUP_CONTEXT_REQUIRED`       | `ctx.requireGroup()` chamado fora de um grupo                                                           |
| `ModerationStoreUnavailableError` | `MODERATION_STORE_UNAVAILABLE` | Mute nativo usado sem `moderationDbPath` configurado                                                    |
| `MessageSendError`                | `MESSAGE_SEND_FAILED`          | O envio de uma mensagem falhou silenciosamente                                                          |
| `MediaDownloadError`              | `MEDIA_DOWNLOAD_FAILED`        | Download de mídia de uma mensagem falhou                                                                |
| `InvalidMediaSourceError`         | `INVALID_MEDIA_SOURCE`         | Caminho de arquivo/URL inválido ao enviar mídia                                                         |
| `PollVoteDecryptError`            | `POLL_VOTE_DECRYPT_FAILED`     | Falha ao decifrar um voto de poll recebido (mensagem de criação da poll não encontrada no store interno)|
| `StickerBuildError`               | `STICKER_BUILD_FAILED`         | Não foi possível transformar a mídia em uma figurinha válida                                             |
| `ReplyTimeoutError`               | `REPLY_TIMEOUT`                | `waitForReply()` não recebeu resposta a tempo                                                           |
| `WaitForReplyUnavailableError`    | `WAIT_FOR_REPLY_UNAVAILABLE`   | `ctx.waitForReply()` chamado num `Context` criado manualmente, sem referência ao `Client`                |
| `CommandDirectoryNotFoundError`   | `COMMAND_DIRECTORY_NOT_FOUND`  | `router.loadCommands()` apontado para um diretório que não existe                                       |
| `CommandLoadError`                | `COMMAND_LOAD_FAILED`          | Um arquivo de comando falhou ao ser importado (erro de sintaxe, dependência ausente, etc); `err.path` aponta para o arquivo |

Todas estendem `WhaSnowError`, então `catch (err) { if (err instanceof WhaSnowError) }` cobre qualquer uma delas de uma vez.

---

## Referência de configuração

```ts
interface WhaSnowConfig {
  phoneNumber: string; // obrigatório

  authDir?: string; // padrão: './whasnow-session'
  browserName?: string; // padrão: 'Safari'

  markOnlineOnConnect?: boolean; // padrão: true
  generateHighQualityLinkPreview?: boolean; // padrão: true
  syncFullHistory?: boolean; // padrão: false

  maxReconnectAttempts?: number; // padrão: 5
  reconnectBaseDelayMs?: number; // padrão: 3000

  sendIntervalMs?: number; // padrão: 250 (~4 msg/s). 0 desabilita.

  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'; // padrão: 'warn'

  moderationDbPath?: string; // habilita o mute nativo (ver seção acima)

  stickerDefaults?: {
    // branding padrão aplicado a send.sticker()
    packName?: string;
    authorName?: string;
  };
}
```

---

## Licença

MIT
