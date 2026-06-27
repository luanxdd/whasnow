# WhaSnow

> Uma biblioteca moderna em TypeScript para construir bots de WhatsApp, com uma API fluente por cima do [Baileys](https://github.com/WhiskeySockets/Baileys).

WhaSnow não reimplementa o protocolo do WhatsApp — ela organiza o Baileys em entidades (`Chat`, `Group`, `Member`, `Message`, `Contact`), um roteador de comandos e uma hierarquia de erros tipados, para que você escreva menos código repetitivo e mais lógica de bot.

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
- [Enviando mensagens e mídia](#enviando-mensagens-e-mídia)
- [Trabalhando com grupos](#trabalhando-com-grupos)
- [Mute nativo](#mute-nativo)
- [Eventos](#eventos)
- [Tratamento de erros](#tratamento-de-erros)
- [Referência de configuração](#referência-de-configuração)

---

## Instalação

```bash
npm install whasnow
```

Requer **Node.js 20+** e **TypeScript 5+** (a biblioteca é distribuída com tipos prontos, não é necessário instalar `@types` separados).

---

## Conceitos principais

| Conceito | O que é |
|---|---|
| `Client` | Ponto de entrada. Gerencia conexão, sessão e despacha mensagens. |
| `Context` (`ctx`) | Tudo que você precisa sobre uma mensagem recebida: quem enviou, de onde, e como responder. |
| `Chat`, `Group`, `Member`, `Contact` | Entidades que representam conversas, grupos, participantes e contatos — cada uma com seus próprios métodos de ação. |
| `CommandRouter` | Roteador opcional de comandos baseado em prefixo (`!ping`, `!ban`, etc). |
| Erros tipados | Toda falha previsível da biblioteca é uma subclasse de `WhaSnowError`, nunca um `Error` genérico. |

---

## Conectando o cliente

```ts
import { Client } from 'whasnow';

const client = new Client({
  phoneNumber: '5511999999999',
  authDir: './sessao',       // onde a sessão autenticada é salva
  logLevel: 'warn',
});

await client.start();
```

Na primeira execução, a WhaSnow solicita automaticamente um **código de pareamento** (pairing code) e o emite pelo evento `pairing.code`:

```ts
client.on('pairing.code', ({ code }) => {
  console.log(`Digite este código no WhatsApp: ${code}`);
});
```

Nas próximas execuções, a sessão salva em `authDir` é reaproveitada — não é necessário pareAR de novo, e a reconexão automática (com backoff exponencial) já é tratada internamente.

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

O jeito mais simples de reagir a mensagens é `client.onMessage()`:

```ts
client.onMessage(async (ctx) => {
  console.log(`${ctx.from.jid} disse: ${ctx.message.text}`);
});
```

O `ctx` (Context) é o objeto central — a partir dele você acessa tudo sobre a mensagem recebida:

```ts
client.onMessage(async (ctx) => {
  ctx.message.text;       // texto da mensagem
  ctx.message.isMedia;    // se é imagem/vídeo/áudio/documento/sticker
  ctx.isGroup;            // se veio de um grupo
  ctx.from.jid;           // quem enviou
  ctx.message.quoted;     // mensagem citada (reply), se houver
  ctx.message.mentions;   // JIDs mencionados na mensagem
});
```

### Respondendo

```ts
await ctx.reply('Recebido!');           // cita a mensagem original
await ctx.send('Mensagem solta');       // envia sem citar
await ctx.react('🔥');                  // reage com emoji
```

### Aguardando uma resposta

`ctx.waitForReply()` espera a próxima mensagem do mesmo remetente — útil para fluxos de uma etapa só, sem montar um sistema de sessão manualmente:

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

Use `client.waitForReply({ fromJid, filter, timeoutMs })` quando precisar esperar por alguém que não seja necessariamente quem enviou a mensagem atual.

### Aguardando a conexão

```ts
await client.start();
await client.waitUntilReady(); // resolve quando a conexão abrir

console.log('Pronto para uso!');
```

---

## Sistema de comandos

Para bots maiores, o `CommandRouter` evita que você mesmo escreva o `if (texto.startsWith('!'))` toda vez:

```ts
const router = client.commands({ prefix: '!' });

router.register({
  name: 'ping',
  async execute(ctx) {
    await ctx.reply('pong 🏓');
  },
});

router.register({
  name: 'ban',
  onlyGroup: true,        // só funciona dentro de grupos
  onlyAdmin: true,        // só quem é admin do grupo pode rodar
  cooldownMs: 3_000,      // 3s de cooldown por usuário
  async execute(ctx, args) {
    const targets = ctx.targets(); // menções + quem foi citado no reply
    // ...
  },
});
```

Use `onBlocked` para tratar quando um comando é bloqueado (sem ser admin, fora de cooldown, etc):

```ts
client.commands({
  prefix: '!',
  onBlocked: async (ctx, reason, command) => {
    if (reason === 'admin') {
      await ctx.reply(`Só admins podem usar !${command.name}.`);
    }
  },
});
```

`reason` é um dos valores: `'group' | 'admin' | 'cooldown'`.

### Auto-load de comandos

Em vez de importar e registrar cada comando manualmente, `router.loadCommands()` varre um diretório (recursivamente, por padrão) e registra todo `CommandDefinition` exportado em cada arquivo encontrado — não precisa ser `export default`, qualquer export nomeado é detectado:

```ts
const router = client.commands({ prefix: '!' });

await router.loadCommands(new URL('./commands', import.meta.url));
```

Isso funciona tanto em desenvolvimento (`tsx`) quanto após o build (`tsc`), já que `import.meta.url` aponta sempre para o próprio arquivo em execução — sem depender de caminhos relativos ao diretório onde o processo foi iniciado.

Um único arquivo pode exportar mais de um comando:

```ts
// commands/moderation/sanction.ts
export const ban: CommandDefinition = { name: 'ban', /* ... */ };
export const unban: CommandDefinition = { name: 'unban', /* ... */ };
```

Arquivos `*.test.ts`, `*.spec.ts` e `*.d.ts` são ignorados automaticamente. Outras opções:

```ts
await router.loadCommands(new URL('./commands', import.meta.url), {
  recursive: true,        // varre subpastas (padrão: true)
  extensions: ['.ts'],    // extensões aceitas (padrão: .js, .mjs, .cjs, .ts, .mts, .cts)

  filter: (command, filePath) => {
    // retorne false para pular um comando específico
    return true;
  },

  onFileLoaded: (filePath, commands) => {
    console.log(`${filePath}: ${commands.length} comando(s)`);
  },
});
```

`loadCommands()` retorna `{ commands, files }` com tudo que foi encontrado — útil para logs (`router.list().length` continua funcionando normalmente depois). Se o diretório não existir, é lançado `CommandDirectoryNotFoundError`; se um arquivo falhar ao ser importado (erro de sintaxe, dependência ausente, etc), é lançado `CommandLoadError` com a propriedade `path` apontando para o arquivo problemático.

---

## Middleware

`client.use()` registra um middleware no estilo Express/Koa: roda em sequência, antes de qualquer `onMessage()`, e pode interromper a cadeia inteira ao não chamar `next()`.

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

Útil para filtros globais: lista de bloqueio, log de auditoria, rate limit por usuário, etc — tudo que deve rodar antes da lógica de qualquer comando.

---

## Removendo listeners

Todo `on`/`onMessage` tem seu par de remoção:

```ts
const handler = (ctx) => { /* ... */ };

client.onMessage(handler);
client.offMessage(handler); // remove

client.on('ready', onReady);
client.off('ready', onReady); // remove
```

---

## Enviando mensagens e mídia

Tanto `ctx.chat`, `Chat` e `Message` expõem os mesmos métodos de envio:

```ts
await ctx.chat.send.text('Olá!', { mentions: [ctx.from.jid] });
await ctx.chat.send.image('./foto.png', 'Legenda opcional');
await ctx.chat.send.video('https://exemplo.com/video.mp4');
await ctx.chat.send.audio('./audio.mp3', true); // true = nota de voz
await ctx.chat.send.document('./relatorio.pdf', 'relatorio.pdf');
await ctx.chat.send.sticker('./figurinha.webp');
```

`MediaSource` aceita três formatos: caminho de arquivo local, URL (`http://`/`https://`) ou `Buffer` em memória.

### Indicadores de digitação

```ts
await ctx.chat.typing();      // "digitando..."
await ctx.chat.recording();   // "gravando áudio..."
await ctx.chat.stopTyping();  // remove o indicador
```

### Ações sobre uma mensagem específica

```ts
await ctx.message.edit('Texto corrigido');
await ctx.message.delete();           // apaga para todos
await ctx.message.pin();              // fixa no chat
await ctx.message.forward(outroJid);
const buffer = await ctx.message.downloadMedia();
```

### Controle de envio em massa

Todo envio passa por uma fila interna com intervalo mínimo configurável, para proteger contra throttling/banimento do WhatsApp em rajadas (ex: um `!all` mencionando 200 pessoas, ou um broadcast em loop):

```ts
const client = new Client({
  phoneNumber: '5511999999999',
  sendIntervalMs: 250, // padrão: ~4 mensagens/s. Use 0 para desabilitar.
});
```

O limite é por `Client` (conta), não por chat — então enviar para 10 chats diferentes ainda respeita o mesmo intervalo entre si.

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
await group.setAnnouncementOnly(true); // só admins enviam mensagens

const link = await group.inviteLink();
```

Use `ctx.group()` quando quiser tratar o caso "não é grupo" manualmente, e `ctx.requireGroup()` quando o comando só faz sentido dentro de um grupo (mais comum dentro de `execute()` de um comando com `onlyGroup: true`).

---

## Mute nativo

A WhaSnow inclui um mute em nível de protocolo: mensagens de usuários mutados são automaticamente apagadas do grupo, sem você precisar escrever essa lógica.

Para habilitar, informe `moderationDbPath` ao criar o `Client`:

```ts
const client = new Client({
  phoneNumber: '5511999999999',
  moderationDbPath: './moderacao.db',
});
```

E use a partir de qualquer `Member`:

```ts
group.member(jid).mute({ duration: 3_600_000 }); // 1 hora em ms
group.member(jid).mute();                        // sem expiração
group.member(jid).unmute();
group.member(jid).isMuted();
```

> Sem `moderationDbPath` configurado, chamar `.mute()`/`.unmute()`/`.isMuted()` lança `ModerationStoreUnavailableError`.

---

## Eventos

```ts
client.on('ready', () => {});
client.on('pairing.code', ({ code, phoneNumber }) => {});
client.on('disconnected', ({ reason, willReconnect, attempt }) => {});
client.on('reconnecting', ({ attempt }) => {});
client.on('error', (err) => {});

client.on('group.update', (payload) => {});
client.on('group.participant', (payload) => {});
client.on('presence', (payload) => {});
client.on('message.edited', (payload) => {});
client.on('message.deleted', (payload) => {});
```

Use `.once()` em vez de `.on()` quando só precisar escutar a primeira ocorrência.

---

## Tratamento de erros

Toda exceção previsível lançada pela WhaSnow estende `WhaSnowError`, e cada uma tem um `code` estável que não muda entre versões — então você nunca precisa comparar strings de mensagem.

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

| Classe | `code` | Quando ocorre |
|---|---|---|
| `AlreadyStartedError` | `CLIENT_ALREADY_STARTED` | `client.start()` chamado mais de uma vez |
| `NotStartedError` | `CLIENT_NOT_STARTED` | Operação que precisa de conexão ativa, chamada antes de `start()` |
| `PairingCodeError` | `PAIRING_CODE_FAILED` | Falha ao gerar/solicitar o código de pareamento |
| `ConnectionError` | `CONNECTION_FAILED` | Falha de conexão não recuperável, ou timeout em `waitUntilReady()` |
| `GroupContextError` | `GROUP_CONTEXT_REQUIRED` | `ctx.requireGroup()` chamado fora de um grupo |
| `ModerationStoreUnavailableError` | `MODERATION_STORE_UNAVAILABLE` | Mute nativo usado sem `moderationDbPath` configurado |
| `MessageSendError` | `MESSAGE_SEND_FAILED` | O envio de uma mensagem falhou silenciosamente |
| `MediaDownloadError` | `MEDIA_DOWNLOAD_FAILED` | Download de mídia de uma mensagem falhou |
| `InvalidMediaSourceError` | `INVALID_MEDIA_SOURCE` | Caminho de arquivo/URL inválido ao enviar mídia |
| `ReplyTimeoutError` | `REPLY_TIMEOUT` | `waitForReply()` não recebeu resposta a tempo |
| `WaitForReplyUnavailableError` | `WAIT_FOR_REPLY_UNAVAILABLE` | `ctx.waitForReply()` chamado num `Context` criado manualmente, sem referência ao `Client` |
| `CommandDirectoryNotFoundError` | `COMMAND_DIRECTORY_NOT_FOUND` | `router.loadCommands()` apontado para um diretório que não existe |
| `CommandLoadError` | `COMMAND_LOAD_FAILED` | Um arquivo de comando falhou ao ser importado por `router.loadCommands()` (erro de sintaxe, dependência ausente, etc) — `err.path` aponta para o arquivo |

Todas estendem `WhaSnowError`, então `catch (err) { if (err instanceof WhaSnowError) }` cobre qualquer uma delas de uma vez.

---

## Referência de configuração

```ts
interface WhaSnowConfig {
  phoneNumber: string;              // obrigatório

  authDir?: string;                 // padrão: './whasnow-session'
  browserName?: string;             // padrão: 'Safari'

  markOnlineOnConnect?: boolean;    // padrão: true
  generateHighQualityLinkPreview?: boolean; // padrão: true
  syncFullHistory?: boolean;        // padrão: false

  maxReconnectAttempts?: number;    // padrão: 5
  reconnectBaseDelayMs?: number;    // padrão: 3000

  sendIntervalMs?: number;          // padrão: 250 (~4 msg/s). 0 desabilita.

  logLevel?: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent'; // padrão: 'warn'

  moderationDbPath?: string;        // habilita o mute nativo (ver seção acima)
}
```

---

## Licença

MIT
