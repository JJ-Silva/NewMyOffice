using System;
using System.Collections.Generic;
using System.Linq;
using MyOffice.Domain.Exceptions;

namespace MyOffice.Domain.Entities
{
    /// <summary>
    /// Representa um processo administrativo com informações específicas de órgãos públicos.
    /// 
    /// NÚCLEO MINIMALISTA:
    /// - Herda funcionalidades básicas de Process
    /// - Informações específicas para processos administrativos
    /// - Suporte a diferentes órgãos e esferas administrativas
    /// - Validação básica (sem padrão específico como CNJ)
    /// </summary>
    public class ProcessAdm : Process
    {
        // ============ PROPRIEDADES ESPECÍFICAS ADMINISTRATIVAS ============

        /// <summary>
        /// Número administrativo específico
        /// Ex: "2024/001234-5", "PROC-2024-0001234"
        /// </summary>
        public string? NumeroAdministrativo { get; private set; }

        /// <summary>
        /// Órgão julgador responsável pelo processo
        /// Ex: "INSS", "Receita Federal", "Prefeitura Municipal", "DETRAN"
        /// </summary>
        public string? OrgaoJulgador { get; private set; }

        /// <summary>
        /// Secretaria ou departamento específico
        /// Ex: "Secretaria da Fazenda", "Secretaria de Obras", "Departamento de Trânsito"
        /// </summary>
        public string? Secretaria { get; private set; }

        /// <summary>
        /// Tipo do processo administrativo
        /// Ex: "Defesa Prévia", "Recurso Administrativo", "Licitação", "Concurso Público"
        /// </summary>
        public string? TipoProcessoAdm { get; private set; }

        /// <summary>
        /// Esfera administrativa
        /// Ex: "Federal", "Estadual", "Municipal"
        /// </summary>
        public string? EsferaAdministrativa { get; private set; }

        /// <summary>
        /// Assunto principal do processo
        /// Ex: "Tributário", "Trabalhista", "Previdenciário", "Licitação"
        /// </summary>
        public string? Assunto { get; private set; }

        /// <summary>
        /// Autoridade competente
        /// Ex: "Delegado da Receita Federal", "Secretário Municipal", "Diretor do INSS"
        /// </summary>
        public string? AutoridadeCompetente { get; private set; }

        /// <summary>
        /// Protocolo de entrada/registro
        /// </summary>
        public string? Protocolo { get; private set; }

        /// <summary>
        /// Data de protocolo/entrada
        /// </summary>
        public DateTime? DataProtocolo { get; private set; }

        /// <summary>
        /// Observações específicas do processo administrativo
        /// </summary>
        public string? ObservacoesAdm { get; private set; }

        // ============ PROPRIEDADES CALCULADAS ============

        /// <summary>
        /// Indica se é processo administrativo (sempre true para esta classe)
        /// </summary>
        public override bool IsGeneric => false;

        /// <summary>
        /// Número para exibição (prioriza NumeroAdministrativo se disponível)
        /// </summary>
        public string NumeroExibicao => !string.IsNullOrEmpty(NumeroAdministrativo)
            ? NumeroAdministrativo
            : Number;


        // ============ CONSTRUTORES ============

        /// <summary>
        /// Construtor protegido para EF Core
        /// </summary>
        protected ProcessAdm() : base() { }

        /// <summary>
        /// Construtor público para processos administrativos adicionais
        /// </summary>
        /// <param name="numeroProcesso">Número do processo administrativo</param>
        public ProcessAdm(string numeroProcesso) : base(numeroProcesso)
        {
        }

        // ============ MÉTODOS PÚBLICOS ============

        /// <summary>
        /// Define número administrativo específico
        /// Mantém o Number da classe base, mas adiciona número específico
        /// </summary>
        /// <param name="numeroAdministrativo">Número administrativo</param>
        public void SetNumeroAdministrativo(string? numeroAdministrativo)
        {
            NumeroAdministrativo = numeroAdministrativo;
            UpdateTimestamp();
        }

        /// <summary>
        /// Atualiza informações básicas do órgão
        /// </summary>
        /// <param name="orgaoJulgador">Órgão responsável</param>
        /// <param name="secretaria">Secretaria/departamento</param>
        /// <param name="esferaAdministrativa">Esfera (Federal/Estadual/Municipal)</param>
        /// <param name="autoridadeCompetente">Autoridade responsável</param>
        public void UpdateOrgaoInfo(
            string? orgaoJulgador = null,
            string? secretaria = null,
            string? esferaAdministrativa = null,
            string? autoridadeCompetente = null)
        {
            OrgaoJulgador = orgaoJulgador;
            Secretaria = secretaria;
            EsferaAdministrativa = esferaAdministrativa;
            AutoridadeCompetente = autoridadeCompetente;
            UpdateTimestamp();
        }

        /// <summary>
        /// Define tipo e assunto do processo
        /// </summary>
        /// <param name="tipoProcessoAdm">Tipo do processo</param>
        /// <param name="assunto">Assunto principal</param>
        public void SetTipoAssunto(string? tipoProcessoAdm, string? assunto = null)
        {
            TipoProcessoAdm = tipoProcessoAdm;
            Assunto = assunto;
            UpdateTimestamp();
        }

        /// <summary>
        /// Adiciona observações administrativas
        /// </summary>
        /// <param name="observacoes">Observações</param>
        public void UpdateObservacoesAdm(string? observacoes)
        {
            ObservacoesAdm = observacoes;
            UpdateTimestamp();
        }

        /// <summary>
        /// Gera relatório das informações administrativas
        /// </summary>
        /// <returns>Relatório formatado</returns>
        public string GerarRelatorioAdministrativo()
        {
            var relatorio = $"=== PROCESSO ADMINISTRATIVO ==={Environment.NewLine}";
            relatorio += $"Número: {NumeroExibicao}{Environment.NewLine}";

            if (!string.IsNullOrEmpty(Protocolo))
                relatorio += $"Protocolo: {Protocolo}{Environment.NewLine}";

            if (!string.IsNullOrEmpty(TipoProcessoAdm))
                relatorio += $"Tipo: {TipoProcessoAdm}{Environment.NewLine}";

            if (!string.IsNullOrEmpty(Assunto))
                relatorio += $"Assunto: {Assunto}{Environment.NewLine}";

            if (!string.IsNullOrEmpty(OrgaoJulgador))
                relatorio += $"Órgão: {OrgaoJulgador}{Environment.NewLine}";

            if (!string.IsNullOrEmpty(Secretaria))
                relatorio += $"Secretaria: {Secretaria}{Environment.NewLine}";

            if (!string.IsNullOrEmpty(EsferaAdministrativa))
                relatorio += $"Esfera: {EsferaAdministrativa}{Environment.NewLine}";

            if (!string.IsNullOrEmpty(AutoridadeCompetente))
                relatorio += $"Autoridade: {AutoridadeCompetente}{Environment.NewLine}";

            if (DataProtocolo.HasValue)
                relatorio += $"Data Protocolo: {DataProtocolo:dd/MM/yyyy}{Environment.NewLine}";

            return relatorio;
        }
    }
}