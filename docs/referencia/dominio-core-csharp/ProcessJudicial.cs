using System;
using System.Collections.Generic;
using System.Linq;
using MyOffice.Domain.Exceptions;

namespace MyOffice.Domain.Entities
{
    /// <summary>
    /// Representa um processo judicial com informações específicas do judiciário.
    /// 
    /// NÚCLEO MINIMALISTA:
    /// - Herda funcionalidades básicas de Process
    /// - Adiciona validação CNJ automática
    /// - Informações específicas do judiciário brasileiro
    /// - Suporte a diferentes instâncias e tribunais
    /// </summary>
    public class ProcessJudicial : Process
    {
        // ============ PROPRIEDADES ESPECÍFICAS JUDICIAIS ============

        /// <summary>
        /// Vara responsável pelo processo
        /// Ex: "1ª Vara Cível", "2ª Vara do Trabalho"
        /// </summary>
        public string? Vara { get; private set; }

        /// <summary>
        /// Comarca onde tramita o processo
        /// Ex: "São Paulo", "Rio de Janeiro", "Campinas"
        /// </summary>
        public string? Comarca { get; private set; }

        /// <summary>
        /// Tipo de ação judicial
        /// Ex: "Ação de Cobrança", "Ação Trabalhista", "Mandado de Segurança"
        /// </summary>
        public string? TipoAcao { get; private set; }

        /// <summary>
        /// Instância do processo
        /// Ex: "1ª Instância", "2ª Instância", "STF", "STJ"
        /// </summary>
        public string? Instancia { get; private set; }

        /// <summary>
        /// Segmento do poder judiciário (extraído do CNJ)
        /// 1=STF, 2=CNJ, 3=STJ, 4=Justiça Federal, 5=Justiça do Trabalho, 
        /// 6=Justiça Eleitoral, 7=Justiça Militar da União, 8=Justiça Estadual, 9=Justiça Militar Estadual
        /// </summary>
        public int? SegmentoJudiciario { get; private set; }

        /// <summary>
        /// Código do tribunal (extraído do CNJ)
        /// </summary>
        public int? CodigoTribunal { get; private set; }

        /// <summary>
        /// Código da origem (extraído do CNJ)
        /// </summary>
        public int? CodigoOrigem { get; private set; }

        /// <summary>
        /// Ano do processo (extraído do CNJ)
        /// </summary>
        public int? AnoProcesso { get; private set; }

        /// <summary>
        /// Número sequencial do processo (extraído do CNJ)
        /// </summary>
        public long? NumeroSequencial { get; private set; }

        /// <summary>
        /// Data de distribuição do processo
        /// </summary>
        public DateTime? DataDistribuicao { get; private set; }

          /// <summary>
        /// Situação atual do processo no tribunal
        /// Ex: "Em andamento", "Suspenso", "Baixado", "Arquivado"
        /// </summary>
        public string? Situacao { get; private set; }

        // ============ PROPRIEDADES CALCULADAS ============

        /// <summary>
        /// Indica se é processo judicial (sempre true para esta classe)
        /// </summary>
        public override bool IsGeneric => false;

        /// <summary>
        /// Descrição do segmento judiciário
        /// </summary>
        public string? DescricaoSegmento => SegmentoJudiciario switch
        {
            1 => "STF",
            2 => "CNJ",
            3 => "STJ",
            4 => "Justiça Federal",
            5 => "Justiça do Trabalho",
            6 => "Justiça Eleitoral",
            7 => "Justiça Militar da União",
            8 => "Justiça Estadual",
            9 => "Justiça Militar Estadual",
            _ => "Não identificado"
        };

        /// <summary>
        /// Número CNJ formatado para exibição
        /// </summary>
        public string? CNJFormatado
        {
            get
            {
                if (string.IsNullOrEmpty(Number) || !IsValidCNJFormat(Number))
                    return Number;

                // Remove formatação existente
                var apenasNumeros = Number.Replace("-", "").Replace(".", "");

                if (apenasNumeros.Length != 20)
                    return Number;

                // Formata: NNNNNNN-DD.AAAA.J.TR.OOOO
                return $"{apenasNumeros.Substring(0, 7)}-{apenasNumeros.Substring(7, 2)}.{apenasNumeros.Substring(9, 4)}.{apenasNumeros.Substring(13, 1)}.{apenasNumeros.Substring(14, 2)}.{apenasNumeros.Substring(16, 4)}";
            }
        }

        // ============ CONSTRUTORES ============

        /// <summary>
        /// Construtor protegido para EF Core
        /// </summary>
        protected ProcessJudicial() : base() { }

        /// <summary>
        /// Construtor para MainProcess judicial
        /// </summary>
        /// <param name="number">Número CNJ do processo</param>
        /// <param name="isMainProcess">Se é processo principal</param>
        internal ProcessJudicial(string number, bool isMainProcess) : base(number, isMainProcess)
        {
            // Extrai informações do CNJ se válido
            ExtractCNJInfo(number);
        }

        /// <summary>
        /// Construtor público para processos judiciais adicionais
        /// </summary>
        /// <param name="numeroCNJ">Número CNJ do processo</param>
        public ProcessJudicial(string numeroCNJ) : base(numeroCNJ)
        {
            // Extrai informações do CNJ se válido
            ExtractCNJInfo(numeroCNJ);
        }

        // ============ MÉTODOS PÚBLICOS ============

        /// <summary>
        /// Define número CNJ com validação específica
        /// Sobrescreve o método da classe base
        /// </summary>
        /// <param name="numeroCNJ">Número CNJ</param>
        public override void SetNumber(string numeroCNJ)
        {
            ValidateNumberJudicial(numeroCNJ);
            Number = numeroCNJ;
            ExtractCNJInfo(numeroCNJ);
            UpdateTimestamp();
        }

        /// <summary>
        /// Atualiza informações básicas do processo judicial
        /// </summary>
        /// <param name="vara">Vara responsável</param>
        /// <param name="comarca">Comarca</param>
        /// <param name="tipoAcao">Tipo de ação</param>
        /// <param name="instancia">Instância</param>
        public void UpdateJudicialInfo(
            string? vara = null,
            string? comarca = null,
            string? tipoAcao = null,
            string? instancia = null)
        {
            Vara = vara;
            Comarca = comarca;
            TipoAcao = tipoAcao;
            Instancia = instancia;
            UpdateTimestamp();
        }

        /// <summary>
        /// Atualiza a situação do processo judicial
        /// </summary>
        /// <param name="situacao">Situação atual</param>
        public void UpdateJudgeInfo(string? situacao = null)
        {
            Situacao = situacao;
            UpdateTimestamp();
        }

        /// <summary>
        /// Valida se número está no formato CNJ
        /// </summary>
        /// <param name="numero">Número a validar</param>
        /// <returns>True se está no formato CNJ</returns>
        public static bool IsValidCNJFormat(string numero)
        {
            if (string.IsNullOrWhiteSpace(numero))
                return false;

            // Remove formatação
            var apenasNumeros = numero.Replace("-", "").Replace(".", "");

            // Deve ter exatamente 20 dígitos
            if (apenasNumeros.Length != 20)
                return false;

            // Todos devem ser números
            return long.TryParse(apenasNumeros, out _);
        }

        /// <summary>
        /// Valida dígito verificador CNJ
        /// Implementação convertida do VBA original
        /// </summary>
        /// <param name="numeroCNJ">Número CNJ completo</param>
        /// <returns>True se dígito verificador está correto</returns>
        public static bool ValidarDigitoVerificadorCNJ(string numeroCNJ)
        {
            if (!IsValidCNJFormat(numeroCNJ))
                return false;

            // Remove caracteres não numéricos
            string apenasNumeros = numeroCNJ.Replace("-", "").Replace(".", "");

            // Extrai as partes conforme posições do formato original
            string num = apenasNumeros.Substring(0, 7);        // NNNNNNN
            string dvDigitado = apenasNumeros.Substring(7, 2); // DD  
            string ano = apenasNumeros.Substring(9, 4);        // AAAA
            string j = apenasNumeros.Substring(13, 1);         // J
            string tr = apenasNumeros.Substring(14, 2);        // TR  
            string oooo = apenasNumeros.Substring(16, 4);      // OOOO

            // Concatena conforme algoritmo original
            long numAno = long.Parse(num + ano);               // Num + ano
            long fim = long.Parse(j + tr + oooo);              // J + TR + OOOO

            // Aplica fórmula módulo 97 (conversão direta do VBA)
            long resto1 = numAno % 97;
            long calculo = (resto1 * 1000000000L + fim * 100L);
            long resto2 = calculo % 97;
            long digitoCalculado = 98 - resto2;

            return digitoCalculado == long.Parse(dvDigitado);
        }

        // ============ MÉTODOS PRIVADOS ============

        /// <summary>
        /// Valida número CNJ com todas as verificações
        /// </summary>
        /// <param name="numeroCNJ">Número a validar</param>
        private static void ValidateNumberJudicial(string numeroCNJ)
        {
            // Validação básica da classe pai
            if (string.IsNullOrWhiteSpace(numeroCNJ))
                throw new ProcessException("Número CNJ é obrigatório");

            // Se está no formato CNJ, valida completamente
            if (IsValidCNJFormat(numeroCNJ))
            {
                if (!ValidarDigitoVerificadorCNJ(numeroCNJ))
                    throw new ProcessException("Número CNJ inválido - dígito verificador incorreto");
            }
            // Se não é CNJ, apenas validação básica (permite outros formatos)
            else
            {
                if (numeroCNJ.Length > 100)
                    throw new ProcessException("Número do processo não pode exceder 100 caracteres");
            }
        }

        /// <summary>
        /// Extrai informações do número CNJ
        /// </summary>
        /// <param name="numeroCNJ">Número CNJ</param>
        private void ExtractCNJInfo(string numeroCNJ)
        {
            if (!IsValidCNJFormat(numeroCNJ))
                return;

            try
            {
                var apenasNumeros = numeroCNJ.Replace("-", "").Replace(".", "");

                // Extrai informações do CNJ
                NumeroSequencial = long.Parse(apenasNumeros.Substring(0, 7));
                AnoProcesso = int.Parse(apenasNumeros.Substring(9, 4));
                SegmentoJudiciario = int.Parse(apenasNumeros.Substring(13, 1));
                CodigoTribunal = int.Parse(apenasNumeros.Substring(14, 2));
                CodigoOrigem = int.Parse(apenasNumeros.Substring(16, 4));
            }
            catch (Exception ex) // Added Exception ex
            {
                // Se falhar a extração, mantém campos null
                // Não gera erro pois validação já foi feita
                // Log the exception for debugging purposes
                System.Diagnostics.Debug.WriteLine($"Erro ao extrair informações do CNJ '{numeroCNJ}': {ex.ToString()}");
            }
        }

        /// <summary>
        /// Gera relatório das informações judiciais
        /// </summary>
        /// <returns>Relatório formatado</returns>
        public string GerarRelatorioJudicial()
        {
            var relatorio = $"=== PROCESSO JUDICIAL ==={Environment.NewLine}";
            relatorio += $"Número: {CNJFormatado ?? Number}{Environment.NewLine}";

            if (!string.IsNullOrEmpty(TipoAcao))
                relatorio += $"Tipo de Ação: {TipoAcao}{Environment.NewLine}";

            if (!string.IsNullOrEmpty(DescricaoSegmento))
                relatorio += $"Segmento: {DescricaoSegmento}{Environment.NewLine}";

            if (!string.IsNullOrEmpty(Vara))
                relatorio += $"Vara: {Vara}{Environment.NewLine}";

            if (!string.IsNullOrEmpty(Comarca))
                relatorio += $"Comarca: {Comarca}{Environment.NewLine}";

            if (DataDistribuicao.HasValue)
                relatorio += $"Data de Distribuição: {DataDistribuicao:dd/MM/yyyy}{Environment.NewLine}";

            relatorio += $"Status: {Status}{Environment.NewLine}";
            relatorio += $"Atividades: {ActivityCount} ({PendingActivityCount} pendentes){Environment.NewLine}";

            return relatorio;
        }
    }
}