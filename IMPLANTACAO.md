# Implantação da sincronização

As alterações do navegador só passam a funcionar em produção depois da publicação do site e das regras do Firebase.

## 1. Publicar as regras

Na raiz deste projeto, com o Firebase CLI autenticado:

```bash
firebase deploy --only firestore:rules
```

As regras fazem o seguinte:

- consultor acessa somente seus próprios laudos;
- coordenador acessa os laudos cujo `coordinatorId` é o seu UID;
- administrador acessa todos os laudos, inclusive excluídos;
- exclusões de laudos são lógicas e não removem fotografias;
- fotografias ficam na subcoleção `laudos/{laudoId}/images`, divididas em blocos menores que 1 MiB;
- a solução funciona no plano gratuito Spark e não exige ativação de faturamento.

## 2. Publicar os arquivos do site

Publique `index.html`, `app.js`, `auth-store.js`, `style.css`, imagens e demais arquivos estáticos pelo processo de hospedagem já utilizado pelo projeto.

## 3. Migrar o administrador

No primeiro login do administrador antigo, o sistema converte automaticamente:

```text
role: admin
```

para:

```text
role: consultor
isAdmin: true
```

Depois, em **Usuários**, confirme que esse usuário está vinculado à coordenadora correta. Assim ele aparece como consultor para ela, mas continua com acesso administrativo global.

## 4. Recuperar laudos que ficaram somente no aparelho

Em cada aparelho que possa conter laudos antigos:

1. abra a nova versão do sistema;
2. entre com o mesmo usuário que criou os laudos;
3. aguarde a mensagem de migração;
4. confira no repositório se o status mudou de **Pendente** para **Sincronizado**;
5. teste o mesmo usuário em outro aparelho.

Imagens antigas salvas em Base64 são divididas e enviadas à subcoleção de imagens durante essa migração.

## 5. Teste mínimo antes de liberar à equipe

1. Consultor cria um laudo com duas fotos.
2. O laudo aparece como **Sincronizado**.
3. O mesmo consultor entra em outro aparelho e abre o laudo com as fotos.
4. A coordenadora visualiza e imprime o laudo, mas não consegue editá-lo.
5. A coordenadora exclui o laudo.
6. O laudo desaparece para consultor e coordenadora.
7. O administrador encontra o registro como **Excluído** e consegue restaurá-lo.
