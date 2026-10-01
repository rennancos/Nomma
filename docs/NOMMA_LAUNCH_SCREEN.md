# Nomma Launch Screen

Tela de abertura animada da Nomma. Entrou na versão 1.0.3 e foi consolidada na 1.0.5.

## Referência

`image/Gemini_Generated_Image_hr0fzthr0fzthr0f.jpg`: símbolo "N" com brilho, "NOMA" (nome anterior da marca, hoje Nomma), linha de carregamento e cinco indicadores, centralizados sobre azul-marinho.
Ela é usada como direção visual e o arquivo não é alterado. A composição foi refeita com componentes React Native; não há imagem inteira nem posição baseada na resolução da referência.

## Fluxo

```
Android → splash nativo (estático) → React Native carregado → NommaLaunchScreen (animada)
        → banco aberto + migrations + dados/configurações carregados → saída (fade) → rota inicial
```

1. **Splash nativo** (`expo-splash-screen`, configurado em `app.json`): fundo `#0D1E32` e o "N" com brilho (`assets/splash-icon.png`).
   No Android 12+, o sistema só permite ícone e cor nesta etapa.
2. **`NommaLaunchScreen`**: é montada na raiz (`src/app/_layout.tsx`), fora do `SQLiteProvider`, por cima do app. Por isso cobre a tela inclusive durante as migrations.
   Ao ser desenhada, ela esconde o splash nativo (`SplashScreen.hide()`, sem fade). Como as duas telas têm o mesmo fundo, a troca não pisca.
3. **App pronto**: `ready = status !== 'loading'` no `financeStore`. Isso significa banco aberto, migrations aplicadas e todos os dados carregados, incluindo tema e configurações.
   Um erro também conta como pronto, para que a tela de erro apareça e o loading nunca fique infinito.
4. **Saída**: respeita um mínimo de 800 ms na tela, para não piscar quando os dados locais carregam em milissegundos. Depois reduz o brilho e faz fade de 320 ms. Só então a tela é desmontada.

Não existe tempo fixo de carregamento: a saída depende do carregamento real.

## Componentes e arquivos

| Arquivo | Papel |
| --- | --- |
| `src/components/NommaLaunchScreen.tsx` | Tela: logo, nome, linha, indicadores, animações, saída |
| `src/app/_layout.tsx` | Mantém o splash nativo (`preventAutoHideAsync`, sem fade), monta a tela e informa `ready` |
| `src/constants/theme.ts` → `brand` | Tokens de cor da tela |
| `app.json` → `expo-splash-screen` | Fundo e ícone do splash nativo |

O projeto mantém os componentes numa pasta só (`src/components/`), então a tela não foi dividida em `branding/` e `loading/`.

## Tokens (`brand` em `src/constants/theme.ts`)

| Token | Valor | Uso |
| --- | --- | --- |
| `deep` | `#0D1E32` | Fundo (medido na referência). **Precisa ser igual** ao `backgroundColor` do splash no `app.json` |
| `text` | `#E0F2FE` | "NOMMA" |
| `glow` | `#7DD3FC` | Brilho do texto |
| `loadingActive` | `#67E8F9` | Luz da linha e indicador aceso |
| `loadingInactive` | `#1E3A52` | Indicador apagado |
| `loadingTrack` | `#16304A` | Linha base |

As cores são fixas, iguais nos temas claro e escuro, porque a tela é da marca e não do tema.

## Assets

| Asset | Origem | Situação |
| --- | --- | --- |
| `assets/icons/nexus-glow.png` (505 px, transparente) | Recorte do "N" da referência, com o fundo convertido em transparência | **Provisório.** Não existe versão vetorial desse "N" facetado com brilho |
| `assets/splash-icon.png` | Mesmo "N" com brilho, centralizado em 1024 px com margem para o recorte circular do Android 12+ | Provisório (mesma origem) |
| `assets/brand/nexus.svg` | Símbolo vetorial do ícone do app | Não usado aqui; o estilo é outro |

O "NOMMA" é texto real, não imagem: vem de `t('branding.name')` ("Nomma") e é exibido em caixa alta por estilo.

Pendência: definir o "N" oficial em vetor e decidir se ícone do app e abertura usam o mesmo símbolo. Hoje são dois estilos diferentes.

## Animações

Todas usam `Animated` do React Native com `useNativeDriver: true`: rodam na thread nativa e não travam enquanto o JS carrega o banco.
Não foi adicionada nenhuma biblioteca; o projeto não tem Reanimated.

| Elemento | Animação |
| --- | --- |
| Logo | Entrada: opacidade 0→1 e escala 0,92→1 em 700 ms (`easeOutCubic`) |
| Brilho do logo | Cópia desfocada do logo (`blurRadius`) por trás; cresce na entrada e depois "respira" entre 65% e 100% em ciclos de 3,2 s |
| "NOMMA" | Aparece na segunda metade da entrada; brilho por `textShadow` (raio 12), com o texto nítido por cima |
| Linha | Faixa ciano (35% da largura) atravessa da esquerda para a direita em loop de 1,4 s |
| Indicadores | Acendem em sequência, 1→5, em 1,75 s e reiniciam. Valor animado único, sem `setInterval` |
| Saída | Fade da tela e redução do brilho em 320 ms |

## Responsividade

Flexbox centralizado, com o bloco levemente acima do centro (`paddingBottom: 10%`), como na referência.
Os tamanhos vêm da largura da tela (`useWindowDimensions`): logo com 38% da largura e no máximo 180 dp, linha com 56% e no máximo 260 dp, texto proporcional ao logo.
Nada depende de uma resolução específica.

## Slogan

Aparece abaixo do nome, em texto menor e discreto (14 dp, 82% de opacidade), e segue o idioma do aparelho.
O texto vem de `t('branding.slogan')` (ver `docs/I18N.md`): "Seu dinheiro, em um só lugar." em português e "Your money, in one place." nos demais idiomas.
O i18n e o slogan foram adicionados pelo Codex e validados depois. Na validação, o nome voltou para caixa alta (`textTransform: 'uppercase'`)
e português sem região (`pt`, `pt_BR`) passou a ser reconhecido.

## Acessibilidade

- `AccessibilityInfo.isReduceMotionEnabled()`: com "Remover animações" ligado, a tela fica estática, sem pulsos, varredura ou entrada, e mesmo assim sai normalmente quando o app fica pronto.
- A tela é anunciada como `progressbar` com o rótulo "Nomma, carregando".
- O loading nunca fica infinito: a saída depende só de `ready`, que também vira true em caso de erro.

## Offline

Logo e ícones são assets locais empacotados no APK, e a fonte é a do sistema. Não há URL, fonte remota, API nem animação remota.
Não depende de Metro nem de Expo Go: o bundle JS vai dentro do APK de release.

## Testes e build

Ver `docs/TEST_REPORT.md` (seção "Launch screen e 1.0.5").
