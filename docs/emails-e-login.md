# Emails de conta e formas de entrar

Guia para pôr a funcionar a criação de conta, a recuperação de password e o "Entrar com Google".
Tudo se faz no painel do Supabase (https://supabase.com/dashboard, projeto do Footer) e, para o Google, na Google Cloud.

## Como funciona na app (desde 2026-11-10)

- **Criar conta:** a pessoa preenche os dados, recebe um email com um **código** e escreve-o na app. O link do mesmo email também funciona.
- **Esqueci-me da password:** escreve o email ou username, recebe um código, escreve-o e escolhe logo a nova password. Se carregar no link do email, a app abre diretamente em "escolher nova password".
- **Link expirado:** a app avisa e deixa pedir um código novo.
- **Entrar com o email por confirmar:** a app envia um código novo e abre o ecrã para o escrever.
- **Manter sessão:** quem entra fica com a sessão iniciada nesse aparelho até carregar em "Sair". "Sair" fecha a sessão só nesse aparelho.
- **Entrar com Google:** botão no topo de "Entrar" e "Criar conta", visível só depois de ligado (ver abaixo). Para já só aparece no site; na app instalada fica escondido até haver ligação de volta para a app.

Os códigos funcionam igual no site e na app Android/iOS. Não dependem do browser em que o link abre.

## 1. Servidor de email (SMTP)

O SendGrid acabou com o plano grátis em 2025. Opções:

### Opção A: Gmail (grátis, para já)

O Supabase passa a enviar os emails pela tua conta Gmail, como se fosses tu a enviá-los.

1. Na conta Google que vai enviar, ligar a **verificação em 2 passos** (Conta Google > Segurança).
2. Abrir https://myaccount.google.com/apppasswords, criar uma palavra-passe de app com o nome `Footer Supabase` e copiar as 16 letras. São mostradas uma única vez.
3. No Supabase: **Authentication > Emails > SMTP Settings**, ligar **Enable custom SMTP** e preencher:
   - Sender email: o endereço Gmail
   - Sender name: `Footer`
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: o endereço Gmail completo
   - Password: as 16 letras da palavra-passe de app (sem espaços)
4. Guardar e testar com "Esqueci-me da password" numa conta tua.

Em uso desde 2026-11-10 com a conta `footer.info.app@gmail.com`. Cuidado: a palavra-passe de app tem de ser criada nessa conta (ver a foto no canto) e só aparece com a verificação em 2 passos ligada; com a password normal o Gmail responde "Username and Password not accepted".

Limites: cerca de 500 emails por dia. Os emails saem do teu endereço pessoal. Para mudar, apaga essa palavra-passe de app e configura outro fornecedor.

### Opção B: domínio próprio + Resend (definitivo)

Precisa de um domínio (10–15 €/ano). Resend grátis: 100 emails/dia e 3000/mês. No Resend: adicionar o domínio, copiar os registos DNS para o sítio onde o domínio foi comprado e esperar pela verificação. Depois, SMTP no Supabase: host `smtp.resend.com`, porta `587`, username `resend`, password = API key do Resend, remetente `nao-responder@<dominio>`. A app não muda.

## 2. Textos dos emails (com código)

Supabase > **Authentication > Emails > Templates**. Substituir o assunto e o corpo de cada um. Em **Authentication > Sign In / Providers > Email**, `Email OTP Length` = `6`.

### Confirm signup

Assunto: `O teu código do Footer: {{ .Token }}`

```html
<h2>Bem-vindo ao Footer</h2>
<p>O teu código para confirmar o email:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Escreve-o na app. Também podes <a href="{{ .ConfirmationURL }}">confirmar por este link</a>.</p>
<p>Se não foste tu, ignora este email.</p>
```

### Reset password

Assunto: `Código para mudar a password do Footer: {{ .Token }}`

```html
<h2>Mudar a password</h2>
<p>O teu código:</p>
<p style="font-size:32px;font-weight:bold;letter-spacing:6px">{{ .Token }}</p>
<p>Escreve-o na app e escolhe a nova password. Também podes <a href="{{ .ConfirmationURL }}">abrir este link</a>.</p>
<p>Se não pediste isto, ignora este email: a password fica igual.</p>
```

## 3. Endereços autorizados

Supabase > **Authentication > URL Configuration**:

- Site URL: `https://kre-master.github.io/footer/`
- Redirect URLs: `https://kre-master.github.io/footer/**` (e `http://localhost:5173/**` para testes)

Sem isto, os links dos emails e o regresso do Google vão parar ao sítio errado.

## 4. Entrar com Google (grátis)

1. https://console.cloud.google.com > criar projeto `Footer`.
2. **APIs e serviços > Ecrã de consentimento OAuth**: tipo Externo, nome `Footer`, email de apoio. Publicar ("Em produção") para qualquer pessoa poder entrar.
3. **Credenciais > Criar credenciais > ID de cliente OAuth** > Aplicação Web.
   - Origens JavaScript autorizadas: `https://kre-master.github.io`
   - URIs de redirecionamento autorizados: `https://zccfakuauedtfneysieo.supabase.co/auth/v1/callback`
4. Copiar o **ID de cliente** e o **segredo do cliente**.
5. Supabase > **Authentication > Sign In / Providers > Google**: ligar e colar os dois valores. Guardar.
6. Na app, em `app-config.js`: `authProviders: ["google"]` (o Claude faz isto quando o passo 5 estiver feito).

O segredo do cliente só vai para o Supabase. Nunca o pôr na app, no Git nem no chat.

Quem entra com Google não precisa de confirmar o email nem de password. Se já tinha conta com o mesmo email, o Supabase junta as duas contas.

Mais tarde:
- **Facebook:** também é grátis, mas a Meta exige verificação da empresa/app para uso público. Fica para depois.
- **Apple:** obrigatório na App Store do iPhone se a app tiver "Entrar com Google". Precisa da conta de programador Apple (99 $/ano), que já é precisa para publicar na App Store.
