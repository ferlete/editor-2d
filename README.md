# 2D Layout Editor

## Descrição

Este projeto é um editor de layout 2D para planejamento de corte de materiais. Ele permite aos usuários criar, editar e organizar peças em uma chapa de material, visualizando o aproveitamento e detectando colisões.

## Funcionalidades

*   **Criação de Peças:** Defina novas peças com formas (polígono, círculo) e dimensões específicas.
*   **Edição de Peças:** Modifique as propriedades de peças existentes, como nome, quantidade, tipo de borda, cor da borda e cor da peça.
*   **Importação de Peças via CSV:** Adicione múltiplas peças ao projeto de uma só vez, importando um arquivo CSV com nome e quantidade.
*   **Gestão de Plano de Corte:** Visualize uma chapa de material e posicione as peças nela.
*   **Arrastar e Soltar Peças:** Adicione peças do painel lateral para o canvas e mova-as livremente.
*   **Configuração de Atributos das Peças:** Altere dinamicamente o tipo de borda (linear, pontilhada), cor da borda e cor da peça para cada item.

## Tecnologias Utilizadas

*   **Next.js:** Framework React para aplicações web com renderização no lado do servidor (SSR) e geração de sites estáticos (SSG).
*   **React:** Biblioteca JavaScript para construção de interfaces de usuário.
*   **TypeScript:** Superset tipado do JavaScript que melhora a manutenibilidade e a detecção de erros.
*   **Tailwind CSS:** Framework CSS utilitário para estilização rápida e responsiva.
*   **react-i18next:** Biblioteca de internacionalização para React, facilitando a tradução da interface do usuário para múltiplos idiomas.

## Detalhes Técnicos

*   **Lógica de Colisão:** Implementação de um algoritmo de Separating Axis Theorem (SAT) para detecção de colisão entre polígonos e círculos no canvas, incluindo uma margem de colisão configurável.
*   **Estrutura do i18n:** Utilização do `react-i18next` com `i18next-http-backend` para carregar arquivos de tradução (`.json`) sob demanda e `i18next-browser-languagedetector` para detecção automática do idioma do navegador. As traduções são organizadas por namespaces (e.g., `common`, `config`, `planner`).
*   **Dados Mockados:** Os dados iniciais de materiais e peças do projeto são fornecidos por serviços mockados (`MaterialService.mock.ts`, `ProjectPartService.mock.ts`), permitindo o desenvolvimento e teste sem a necessidade de um backend real.
*   **Gerenciamento de Estado:** Uso de `useState` e `useRef` do React para gerenciar o estado local dos componentes, como as formas no canvas, histórico de ações (desfazer/refazer) e configurações das peças.
*   **Drag and Drop:** Implementação de funcionalidade de arrastar e soltar para adicionar peças ao canvas, com atualização automática da quantidade de peças disponíveis.

## Instalação e Configuração

Para configurar e executar o projeto localmente, siga os passos abaixo:

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd editor-2d
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```

## Executando a Aplicação

Para iniciar o servidor de desenvolvimento:

```bash
npm run dev
# ou
yarn dev
```

A aplicação estará disponível em `http://localhost:3000`.
