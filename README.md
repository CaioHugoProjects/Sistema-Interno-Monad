# Sistema Interno Monad:
Gerador de Documentos de Saúde Ocupacional (Clínica Monad)

Um sistema web single-page desenvolvido para automatizar e padronizar a emissão de documentos oficiais de medicina do trabalho. A aplicação substitui fluxos manuais por uma interface digital rápida, permitindo que a recepção e a equipe médica busquem pacientes, preencham dados complementares em tempo real e gerem arquivos prontos para impressão em formato A4, com layout fiel aos modelos em papel.

Principais Funcionalidades:

-Busca Integrada: Consulta assíncrona ao banco de dados para localizar colaboradores por data de exame, nome ou CPF.

-Preenchimento Rápido (Modal): Interface dinâmica para inserção de dados complementares antes da impressão, incluindo Mapeamento de Riscos (PGR), dados da empresa, conclusão médica (Apto/Inapto) e controle dinâmico de Normas Regulamentadoras (NRs).

-Layout Print-Ready: CSS avançado configurado com @media print para garantir margens milimétricas, ocultação de elementos de interface e formatação tipográfica exata para folhas A4, mimetizando a estrutura de editores de texto tradicionais (Word).

Prontuário e Anamnese: Geração automática da ficha médica do paciente contendo anamnese detalhada, antecedentes familiares e ocupacionais para preenchimento à caneta.

Tecnologias Utilizadas:

Frontend: HTML5, CSS3, JavaScript Vanilla.

Backend/Banco de Dados: Supabase (PostgreSQL e REST API).

Arquitetura: Single-Page Application (SPA) focada na usabilidade local de clínicas.
