using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MyOffice.Domain.Exceptions;

namespace MyOffice.Domain.Entities
{
    /// <summary>
    /// Configuração para contagem de prazos de uma atividade específica.
    /// 
    /// NÚCLEO MINIMALISTA:
    /// - Cada atividade tem sua própria configuração de contagem
    /// - Sistema sugere configuração baseada no ActivityTreatment
    /// - Usuário pode modificar individualmente cada atividade
    /// - Suporte a cálculos complexos de prazos jurídicos
    /// </summary>
    public class ConfiguracaoContagem : EntityBase
    {
        // ============ PROPRIEDADES PÚBLICAS ============

        /// <summary>
        /// ID da atividade que usa esta configuração
        /// Relacionamento 1:1 com ActivityBase
        /// </summary>
        public int ActivityId { get; private set; }

        /// <summary>
        /// Considera apenas dias úteis (segunda a sexta)
        /// </summary>
        public bool DiasUteis { get; private set; } = true;

        /// <summary>
        /// Aplica prazo dobrado (dobra automaticamente o prazo)
        /// Comum para advogados que atuam fora da comarca
        /// </summary>
        public bool PrazoDobrado { get; private set; } = false;

        /// <summary>
        /// Exclui feriados do cálculo de prazos
        /// </summary>
        public bool ExcluiFeriados { get; private set; } = true;

        /// <summary>
        /// Considera sábados como dia útil
        /// Usado em alguns tipos de processo
        /// </summary>
        public bool SabadoUtil { get; private set; } = false;

        /// <summary>
        /// Duração base do prazo em dias
        /// Usado para cálculo automático quando atividade não tem data específica
        /// </summary>
        public int DuracaoDias { get; private set; } = 0;

        /// <summary>
        /// Data base para cálculo do prazo
        /// Se null, usa data de criação da atividade
        /// </summary>
        public DateTime? DataBase { get; private set; }

        /// <summary>
        /// Observações específicas sobre a configuração
        /// Ex: "Prazo dobrado por atuar fora da comarca"
        /// </summary>
        public string? Observacoes { get; private set; }

        // ============ CONSTRUTORES ============

        /// <summary>
        /// Construtor protegido para EF Core
        /// </summary>
        protected ConfiguracaoContagem() { }

        /// <summary>
        /// Construtor para criar nova configuração
        /// </summary>
        /// <param name="activityId">ID da atividade</param>
        /// <param name="diasUteis">Considera apenas dias úteis</param>
        /// <param name="prazoDobrado">Aplica prazo dobrado</param>
        /// <param name="excluiFeriados">Exclui feriados</param>
        /// <param name="duracaoDias">Duração em dias</param>
        public ConfiguracaoContagem(
            int activityId,
            bool diasUteis = true,
            bool prazoDobrado = false,
            bool excluiFeriados = true,
            int duracaoDias = 0)
        {
            if (activityId <= 0)
                throw new ArgumentException("ActivityId deve ser válido", nameof(activityId));

            if (duracaoDias < 0)
                throw new ArgumentException("Duração não pode ser negativa", nameof(duracaoDias));

            ActivityId = activityId;
            DiasUteis = diasUteis;
            PrazoDobrado = prazoDobrado;
            ExcluiFeriados = excluiFeriados;
            DuracaoDias = duracaoDias;
        }

        // ============ MÉTODOS PÚBLICOS ============

        /// <summary>
        /// Atualiza a configuração de contagem
        /// </summary>
        /// <param name="diasUteis">Considera apenas dias úteis</param>
        /// <param name="prazoDobrado">Aplica prazo dobrado</param>
        /// <param name="excluiFeriados">Exclui feriados</param>
        /// <param name="sabadoUtil">Considera sábado como útil</param>
        public void AtualizarConfiguracao(
            bool diasUteis,
            bool prazoDobrado,
            bool excluiFeriados,
            bool sabadoUtil = false)
        {
            DiasUteis = diasUteis;
            PrazoDobrado = prazoDobrado;
            ExcluiFeriados = excluiFeriados;
            SabadoUtil = sabadoUtil;
            UpdateTimestamp();
        }

        /// <summary>
        /// Define a duração base do prazo
        /// </summary>
        /// <param name="duracaoDias">Duração em dias</param>
        public void DefinirDuracao(int duracaoDias)
        {
            if (duracaoDias < 0)
                throw new DomainException("Duração não pode ser negativa");

            DuracaoDias = duracaoDias;
            UpdateTimestamp();
        }

        /// <summary>
        /// Define a data base para cálculo
        /// </summary>
        /// <param name="dataBase">Data base para cálculo</param>
        public void DefinirDataBase(DateTime? dataBase)
        {
            DataBase = dataBase;
            UpdateTimestamp();
        }

        /// <summary>
        /// Adiciona observações sobre a configuração
        /// </summary>
        /// <param name="observacoes">Observações</param>
        public void AdicionarObservacoes(string? observacoes)
        {
            Observacoes = observacoes;
            UpdateTimestamp();
        }

        /// <summary>
        /// Calcula a data final do prazo baseado na configuração
        /// </summary>
        /// <param name="dataInicio">Data de início (se null, usa DataBase ou hoje)</param>
        /// <returns>Data final calculada</returns>
        public DateTime CalcularDataFinal(DateTime? dataInicio = null)
        {
            if (DuracaoDias <= 0)
                throw new DomainException("Duração deve ser maior que zero para calcular data final");

            var inicio = dataInicio ?? DataBase ?? DateTime.Today;
            var diasParaAdicionar = DuracaoDias;

            // Aplica prazo dobrado se configurado
            if (PrazoDobrado)
                diasParaAdicionar *= 2;

            var dataFinal = inicio;
            var diasAdicionados = 0;

            while (diasAdicionados < diasParaAdicionar)
            {
                dataFinal = dataFinal.AddDays(1);

                // Se considera apenas dias úteis, pula fins de semana
                if (DiasUteis)
                {
                    // Pula domingo sempre
                    if (dataFinal.DayOfWeek == DayOfWeek.Sunday)
                        continue;

                    // Pula sábado se não é considerado útil
                    if (dataFinal.DayOfWeek == DayOfWeek.Saturday && !SabadoUtil)
                        continue;
                }

                // Se exclui feriados, pula feriados (implementação básica)
                if (ExcluiFeriados && EhFeriado(dataFinal))
                    continue;

                diasAdicionados++;
            }

            return dataFinal;
        }

        /// <summary>
        /// Calcula quantos dias úteis existem entre duas datas
        /// </summary>
        /// <param name="dataInicio">Data inicial</param>
        /// <param name="dataFim">Data final</param>
        /// <returns>Número de dias úteis</returns>
        public int CalcularDiasUteis(DateTime dataInicio, DateTime dataFim)
        {
            if (dataFim < dataInicio)
                return 0;

            int diasUteis = 0;
            var dataAtual = dataInicio.Date;

            while (dataAtual <= dataFim.Date)
            {
                if (DiasUteis)
                {
                    // Pula domingo sempre
                    if (dataAtual.DayOfWeek == DayOfWeek.Sunday)
                    {
                        dataAtual = dataAtual.AddDays(1);
                        continue;
                    }

                    // Pula sábado se não é considerado útil
                    if (dataAtual.DayOfWeek == DayOfWeek.Saturday && !SabadoUtil)
                    {
                        dataAtual = dataAtual.AddDays(1);
                        continue;
                    }
                }

                // Se exclui feriados, pula feriados
                if (ExcluiFeriados && EhFeriado(dataAtual))
                {
                    dataAtual = dataAtual.AddDays(1);
                    continue;
                }

                diasUteis++;
                dataAtual = dataAtual.AddDays(1);
            }

            return diasUteis;
        }

        /// <summary>
        /// Cria uma cópia da configuração para outra atividade
        /// </summary>
        /// <param name="novoActivityId">ID da nova atividade</param>
        /// <returns>Nova configuração idêntica</returns>
        public ConfiguracaoContagem ClonarPara(int novoActivityId)
        {
            return new ConfiguracaoContagem(
                novoActivityId,
                DiasUteis,
                PrazoDobrado,
                ExcluiFeriados,
                DuracaoDias)
            {
                SabadoUtil = this.SabadoUtil,
                DataBase = this.DataBase,
                Observacoes = this.Observacoes
            };
        }

        // ============ PROPRIEDADES CALCULADAS ============

        /// <summary>
        /// Multiplicador do prazo (1 para normal, 2 para dobrado)
        /// </summary>
        public int MultiplicadorPrazo => PrazoDobrado ? 2 : 1;

        /// <summary>
        /// Duração efetiva considerando prazo dobrado
        /// </summary>
        public int DuracaoEfetiva => DuracaoDias * MultiplicadorPrazo;

        /// <summary>
        /// Indica se a configuração considera fins de semana
        /// </summary>
        public bool ConsideraFimDeSemana => !DiasUteis;

        /// <summary>
        /// Resumo textual da configuração
        /// </summary>
        public string ResumoConfiguracao
        {
            get
            {
                var resumo = $"{DuracaoEfetiva} dias";

                if (DiasUteis)
                    resumo += " úteis";

                if (SabadoUtil)
                    resumo += " (sábado útil)";

                if (ExcluiFeriados)
                    resumo += ", excluindo feriados";

                if (PrazoDobrado)
                    resumo += " (dobrado)";

                return resumo;
            }
        }

        // ============ MÉTODOS PRIVADOS ============

        /// <summary>
        /// Verifica se uma data é feriado
        /// Implementação básica - pode ser expandida com tabela de feriados
        /// </summary>
        /// <param name="data">Data a verificar</param>
        /// <returns>True se é feriado</returns>
        private static bool EhFeriado(DateTime data)
        {
            // Implementação básica apenas com feriados fixos nacionais
            // TODO: Expandir com tabela de feriados configurável

            // Ano Novo
            if (data.Month == 1 && data.Day == 1) return true;

            // Tiradentes
            if (data.Month == 4 && data.Day == 21) return true;

            // Dia do Trabalho
            if (data.Month == 5 && data.Day == 1) return true;

            // Independência do Brasil
            if (data.Month == 9 && data.Day == 7) return true;

            // Nossa Senhora Aparecida
            if (data.Month == 10 && data.Day == 12) return true;

            // Finados
            if (data.Month == 11 && data.Day == 2) return true;

            // Proclamação da República
            if (data.Month == 11 && data.Day == 15) return true;

            // Natal
            if (data.Month == 12 && data.Day == 25) return true;

            // TODO: Adicionar feriados móveis (Carnaval, Páscoa, etc.)
            // TODO: Adicionar feriados municipais/estaduais configuráveis

            return false;
        }
    }
}
