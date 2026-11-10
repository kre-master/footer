# Footer

App estatica para gerar equipas equilibradas de futebol 5v5, guardar historico e exportar PNG.

## Usar localmente

Abre `index.html` no browser. Sem Supabase configurado, a app usa `localStorage`.

## Configurar Supabase

1. Cria um projeto no Supabase.
2. Vai a `SQL Editor`.
3. Executa o ficheiro `supabase/schema.sql`.
4. Vai a `Authentication > Users` e cria o teu utilizador admin com email/password.
5. Vai a `Project Settings > API`.
6. Copia `Project URL` e `anon public key`.
7. Edita `app-config.js`:

```js
window.FIVE5_CONFIG = {
  supabaseUrl: "https://o-teu-projeto.supabase.co",
  supabaseAnonKey: "a-tua-anon-key",
};
```

### Configurar SMTP para emails de conta

Guia atualizado (Gmail ou Resend, textos dos emails com codigo, Entrar com Google): `docs/emails-e-login.md`.

O email interno do Supabase serve apenas para testes e tem um limite muito baixo. Para criar contas, confirmar emails e recuperar passwords sem bater no erro `email rate limit exceeded`, configura um SMTP externo.

Opcao simples para comecar:

1. Cria conta num provider com plano gratis, por exemplo Resend ou Brevo.
2. No provider, cria/valida o remetente ou dominio.
3. Copia os dados SMTP: host, port, username, password e remetente.
4. No Supabase, abre `Authentication > Settings > SMTP`.
5. Ativa `Enable Custom SMTP`.
6. Preenche:
   - `Sender email`: email remetente validado no provider.
   - `Sender name`: `Footer`.
   - `Host`: host SMTP do provider.
   - `Port`: normalmente `587`.
   - `Username`: utilizador SMTP/API key indicado pelo provider.
   - `Password`: password/token SMTP indicado pelo provider.
7. Guarda e testa criar uma conta nova.

Enquanto a app ainda esta em testes, tambem podes desligar temporariamente a confirmacao por email em `Authentication > Providers > Email > Confirm email`. Para uso real com jogadores, manter a confirmacao ligada e usar SMTP.

Para producao:

- `Authentication > Providers > Email > Confirm email` deve ficar ligado.
- `Authentication > Rate Limits` deve ser revisto antes de abrir a app fora do grupo de amigos.
- O login pode ser feito por email ou username. Isto usa uma funcao Supabase de lookup username -> email e deve ser protegido com rate limits/captcha se a app sair do grupo fechado de amigos.

## Como funciona online

- Visitantes podem ver a app e criar conta.
- Jogadores criam conta por email/password, escolhem username e depois reclamam o perfil de jogador que ja existe.
- O login aceita email ou username com password.
- No separador `Conta`, os utilizadores podem definir username, mudar password e pedir recuperacao de password por email.
- Admin aprova pedidos de associacao entre conta e perfil.
- Admin lanca convocatorias com data, hora, local e limite de jogadores.
- Jogadores com perfil associado respondem `Vou`, `Talvez` ou `Nao vou`.
- Admin pode carregar os confirmados da convocatoria para o gerador de equipas.
- Adicionar um convidado cria um jogador permanente no Supabase, mesmo sem conta associada. O perfil fica disponivel para jogos seguintes e pode ser reclamado por uma conta mais tarde.
- Ao adicionar um nome que ja existe (ignorando acentos, maiusculas e espacos repetidos), a app reutiliza o perfil sem alterar a nota, foto ou conta. Se houver varios perfis com esse nome, seleciona o jogador na lista. A nota 0-10 so e obrigatoria para um jogador novo.
- Admin pode editar jogadores/fotos, confirmar jogos, editar resultados e historico.
- Admin pode gerir pagamentos mensais no separador `Pagamentos`: idas ajustaveis, pagamentos manuais, dividas de ajuste e export WhatsApp.
- Votos MVP sao confidenciais: a app usa contagens agregadas e nao deve expor quem votou em quem.
- O primeiro utilizador autenticado criado depois de aplicar o schema fica como admin inicial.
- O botao `Entrar` faz login com email/password do Supabase.
- Se uma conta existir em `Authentication > Users` mas nao aparecer em `Pedidos/Contas`, pede ao utilizador para entrar novamente depois de aplicares o schema mais recente; a app cria/repara a linha em `profiles` no login.

## Atualizar schema depois de novas funcionalidades

Quando a app ganha novas tabelas, volta a executar o ficheiro completo `supabase/schema.sql` no `SQL Editor` do Supabase. O separador `Pagamentos` precisa das tabelas `payments`, `attendance_overrides` e `finance_settings`.

## Publicar com GitHub Pages

1. Cria um repositorio no GitHub.
2. Envia estes ficheiros para o repositorio.
3. Em `Settings > Pages`, escolhe deploy a partir da branch principal.
4. Abre o URL publicado.

## Publicar com Netlify

1. Cria um site novo no Netlify a partir do repositorio GitHub.
2. Build command: vazio.
3. Publish directory: `/`.
4. Faz deploy.

## Apps mobile

A app mobile usa Capacitor e reaproveita o bundle web gerado em `www/`.

### Atualizar Android

Sempre que a versao web mudar:

```bash
npm run cap:sync:android
cd android
.\gradlew.bat assembleDebug
```

O APK debug fica em `android/app/build/outputs/apk/debug/app-debug.apk`.

Para abrir no Android Studio:

```bash
npm run cap:open:android
```

### Preparar iPhone

O projeto iOS esta em `ios/`, mas build/teste iPhone precisa de macOS com Xcode e CocoaPods.

No Mac:

```bash
npm install
npm run cap:sync:ios
npm run cap:open:ios
```

Depois configura signing, bundle id e App Store Connect no Xcode.

## Nota sobre fotos

As fotos ficam guardadas como base64 na tabela `players.photo_data_url`. Para este grupo e poucas fotos, isto chega no plano gratuito. Mais tarde pode ser migrado para Supabase Storage se quiseres ficheiros separados.
