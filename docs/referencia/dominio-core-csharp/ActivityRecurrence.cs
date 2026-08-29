using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MyOffice.Domain.Exceptions;

namespace MyOffice.Domain.Entities
{
    /// <summary>
    /// Configuração de recorrência para atividades que se repetem.
    /// 
    /// NÚCLEO MINIMALISTA:
    /// - Suporte a padrões simples e complexos de repetição
    /// - Usado por AppointmentActivity e MonitoringActivity
    /// - DeadlineActivity não pode ter recorrência
    /// - Sistema gera automaticamente próximas instâncias
    /// </summary>
    public class ActivityRecurrence : EntityBase
    {
        // ============ PROPRIEDADES PÚBLICAS ============

        /// <summary>
        /// ID da atividade original (template)
        /// </summary>
        public int OriginalActivityId { get; private set; }

        /// <summary>
        /// Tipo de recorrência
        /// </summary>
        public RecurrenceType Type { get; private set; }

        /// <summary>
        /// Intervalo de repetição
        /// Ex: A cada 2 semanas = Interval = 2, Type = Weekly
        /// </summary>
        public int Interval { get; private set; } = 1;

        /// <summary>
        /// Dias da semana para recorrência semanal
        /// Bitmask: Segunda=1, Terça=2, Quarta=4, Quinta=8, Sexta=16, Sábado=32, Domingo=64
        /// Ex: Segunda e Quarta = 1 + 4 = 5
        /// </summary>
        public int? DaysOfWeek { get; private set; }

        /// <summary>
        /// Dia do mês para recorrência mensal (1-31)
        /// Ex: Todo dia 15 do mês
        /// </summary>
        public int? DayOfMonth { get; private set; }

        /// <summary>
        /// Semana do mês para recorrência mensal complexa (1-5)
        /// Ex: Primeira segunda-feira do mês = WeekOfMonth=1, DayOfWeek=Monday
        /// </summary>
        public int? WeekOfMonth { get; private set; }

        /// <summary>
        /// Data de início da recorrência
        /// </summary>
        public DateTime StartDate { get; private set; }

        /// <summary>
        /// Data de fim da recorrência (opcional)
        /// </summary>
        public DateTime? EndDate { get; private set; }

        /// <summary>
        /// Número máximo de ocorrências (alternativa ao EndDate)
        /// </summary>
        public int? MaxOccurrences { get; private set; }

        /// <summary>
        /// Número atual de ocorrências criadas
        /// </summary>
        public int CurrentOccurrences { get; private set; } = 0;

        /// <summary>
        /// Indica se a recorrência está ativa
        /// </summary>
        public bool RecurrenceIsActive { get; private set; } = true; 

        /// <summary>
        /// Data da última instância criada
        /// </summary>
        public DateTime? LastInstanceDate { get; private set; }

        /// <summary>
        /// Observações sobre a recorrência
        /// </summary>
        public string? Notes { get; private set; }

        // ============ CONSTRUTORES ============

        /// <summary>
        /// Construtor protegido para EF Core
        /// </summary>
        protected ActivityRecurrence() { }

        /// <summary>
        /// Construtor para recorrência simples (diária, semanal, mensal, anual)
        /// </summary>
        /// <param name="originalActivityId">ID da atividade original</param>
        /// <param name="type">Tipo de recorrência</param>
        /// <param name="interval">Intervalo de repetição</param>
        /// <param name="startDate">Data de início</param>
        /// <param name="endDate">Data de fim (opcional)</param>
        /// <param name="maxOccurrences">Máximo de ocorrências (opcional)</param>
        public ActivityRecurrence(
            int originalActivityId,
            RecurrenceType type,
            int interval,
            DateTime startDate,
            DateTime? endDate = null,
            int? maxOccurrences = null)
        {
            ValidateParameters(originalActivityId, type, interval, startDate, endDate, maxOccurrences);

            OriginalActivityId = originalActivityId;
            Type = type;
            Interval = interval;
            StartDate = startDate;
            EndDate = endDate;
            MaxOccurrences = maxOccurrences;
        }

        // ============ MÉTODOS PÚBLICOS ============

        /// <summary>
        /// Configura recorrência semanal com dias específicos
        /// </summary>
        /// <param name="daysOfWeek">Dias da semana (bitmask)</param>
        public void SetWeeklyRecurrence(DaysOfWeekFlag daysOfWeek)
        {
            if (Type != RecurrenceType.Weekly)
                throw new DomainException("Configuração de dias da semana só é válida para recorrência semanal");

            DaysOfWeek = (int)daysOfWeek;
            UpdateTimestamp();
        }

        /// <summary>
        /// Configura recorrência mensal por dia específico
        /// </summary>
        /// <param name="dayOfMonth">Dia do mês (1-31)</param>
        public void SetMonthlyByDay(int dayOfMonth)
        {
            if (Type != RecurrenceType.Monthly)
                throw new DomainException("Configuração de dia do mês só é válida para recorrência mensal");

            if (dayOfMonth < 1 || dayOfMonth > 31)
                throw new ArgumentException("Dia do mês deve estar entre 1 e 31", nameof(dayOfMonth));

            DayOfMonth = dayOfMonth;
            WeekOfMonth = null; // Limpa configuração por semana
            UpdateTimestamp();
        }

        /// <summary>
        /// Configura recorrência mensal por semana específica
        /// Ex: Primeira segunda-feira do mês
        /// </summary>
        /// <param name="weekOfMonth">Semana do mês (1-5)</param>
        /// <param name="dayOfWeek">Dia da semana</param>
        public void SetMonthlyByWeek(int weekOfMonth, DayOfWeek dayOfWeek)
        {
            if (Type != RecurrenceType.Monthly)
                throw new DomainException("Configuração por semana só é válida para recorrência mensal");

            if (weekOfMonth < 1 || weekOfMonth > 5)
                throw new ArgumentException("Semana do mês deve estar entre 1 e 5", nameof(weekOfMonth));

            WeekOfMonth = weekOfMonth;
            DaysOfWeek = (int)ConvertDayOfWeekToFlag(dayOfWeek);
            DayOfMonth = null; // Limpa configuração por dia
            UpdateTimestamp();
        }

        /// <summary>
        /// Atualiza observações da recorrência
        /// </summary>
        /// <param name="notes">Novas observações</param>
        public void UpdateNotes(string? notes)
        {
            Notes = notes;
            UpdateTimestamp();
        }

        /// <summary>
        /// Ativa ou desativa a recorrência
        /// </summary>
        /// <param name="RecurrenceIsActive">Se deve estar ativa</param>
        public void SetActive(bool recurrenceIsActive)
        {
            RecurrenceIsActive = recurrenceIsActive;
            UpdateTimestamp();
        }

        /// <summary>
        /// Registra que uma nova instância foi criada
        /// </summary>
        /// <param name="instanceDate">Data da instância criada</param>
        public void RegisterNewInstance(DateTime instanceDate)
        {
            CurrentOccurrences++;
            LastInstanceDate = instanceDate;
            UpdateTimestamp();
        }

        /// <summary>
        /// Calcula a próxima data de ocorrência baseada na última instância
        /// </summary>
        /// <returns>Próxima data ou null se recorrência terminou</returns>
        public DateTime? CalculateNextOccurrence()
        {
            if (!RecurrenceIsActive)
                return null;

            // Verifica se atingiu máximo de ocorrências
            if (MaxOccurrences.HasValue && CurrentOccurrences >= MaxOccurrences.Value)
                return null;

            var baseDate = LastInstanceDate ?? StartDate;

            var nextDate = Type switch
            {
                RecurrenceType.Daily => CalculateNextDaily(baseDate),
                RecurrenceType.Weekly => CalculateNextWeekly(baseDate),
                RecurrenceType.Monthly => CalculateNextMonthly(baseDate),
                RecurrenceType.Yearly => CalculateNextYearly(baseDate),
                _ => throw new NotSupportedException($"Tipo de recorrência {Type} não suportado")
            };

            // Verifica se passou da data final
            if (EndDate.HasValue && nextDate > EndDate.Value)
                return null;

            return nextDate;
        }

        /// <summary>
        /// Verifica se a recorrência deve continuar ativa
        /// </summary>
        /// <returns>True se deve continuar</returns>
        public bool ShouldContinue()
        {
            if (!RecurrenceIsActive)
                return false;

            if (MaxOccurrences.HasValue && CurrentOccurrences >= MaxOccurrences.Value)
                return false;

            if (EndDate.HasValue && DateTime.Today > EndDate.Value)
                return false;

            return true;
        }

        // ============ PROPRIEDADES CALCULADAS ============

        /// <summary>
        /// Descrição textual da recorrência
        /// </summary>
        public string Description
        {
            get
            {
                var desc = Type switch
                {
                    RecurrenceType.Daily => Interval == 1 ? "Diariamente" : $"A cada {Interval} dias",
                    RecurrenceType.Weekly => GetWeeklyDescription(),
                    RecurrenceType.Monthly => GetMonthlyDescription(),
                    RecurrenceType.Yearly => Interval == 1 ? "Anualmente" : $"A cada {Interval} anos",
                    _ => "Recorrência personalizada"
                };

                if (EndDate.HasValue)
                    desc += $" até {EndDate:dd/MM/yyyy}";
                else if (MaxOccurrences.HasValue)
                    desc += $" por {MaxOccurrences} vezes";

                return desc;
            }
        }

        // ============ MÉTODOS PRIVADOS ============

        private static void ValidateParameters(
            int originalActivityId,
            RecurrenceType type,
            int interval,
            DateTime startDate,
            DateTime? endDate,
            int? maxOccurrences)
        {
            if (originalActivityId <= 0)
                throw new ArgumentException("ID da atividade deve ser válido", nameof(originalActivityId));

            if (interval < 1)
                throw new ArgumentException("Intervalo deve ser maior que zero", nameof(interval));

            if (endDate.HasValue && endDate <= startDate)
                throw new ArgumentException("Data final deve ser posterior à data inicial", nameof(endDate));

            if (maxOccurrences.HasValue && maxOccurrences <= 0)
                throw new ArgumentException("Máximo de ocorrências deve ser maior que zero", nameof(maxOccurrences));
        }

        private DateTime CalculateNextDaily(DateTime baseDate)
        {
            return baseDate.AddDays(Interval);
        }

        private DateTime CalculateNextWeekly(DateTime baseDate)
        {
            if (DaysOfWeek.HasValue)
            {
                // Recorrência semanal com dias específicos
                return CalculateNextWeeklyWithSpecificDays(baseDate);
            }
            else
            {
                // Recorrência semanal simples
                return baseDate.AddDays(7 * Interval);
            }
        }

        private DateTime CalculateNextWeeklyWithSpecificDays(DateTime baseDate)
        {
            var nextDate = baseDate.AddDays(1);
            if (!DaysOfWeek.HasValue)
                return baseDate.AddDays(7 * Interval); // Fallback or throw exception

            var daysFlag = (DaysOfWeekFlag)DaysOfWeek.Value;

            // Procura próximo dia da semana válido
            for (int i = 0; i < 14; i++) // Máximo 2 semanas para encontrar
            {
                var dayFlag = ConvertDayOfWeekToFlag(nextDate.DayOfWeek);
                if (daysFlag.HasFlag(dayFlag))
                    return nextDate;

                nextDate = nextDate.AddDays(1);
            }

            return baseDate.AddDays(7 * Interval); // Fallback
        }

        private DateTime CalculateNextMonthly(DateTime baseDate)
        {
            if (DayOfMonth.HasValue)
            {
                return CalculateNextMonthlyByDay(baseDate);
            }
            else if (WeekOfMonth.HasValue)
            {
                return CalculateNextMonthlyByWeek(baseDate);
            }
            else
            {
                return baseDate.AddMonths(Interval);
            }
        }

        private DateTime CalculateNextMonthlyByDay(DateTime baseDate)
        {
            var nextMonth = baseDate.AddMonths(Interval);
            if (!DayOfMonth.HasValue)
                return baseDate.AddMonths(Interval); // Fallback or throw

            var targetDay = Math.Min(DayOfMonth.Value, DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month));
            return new DateTime(nextMonth.Year, nextMonth.Month, targetDay);
        }

        private DateTime CalculateNextMonthlyByWeek(DateTime baseDate)
        {
            var nextMonth = baseDate.AddMonths(Interval);
            if (!DaysOfWeek.HasValue || !WeekOfMonth.HasValue)
                return baseDate.AddMonths(Interval); // Fallback or throw

            var firstDayOfMonth = new DateTime(nextMonth.Year, nextMonth.Month, 1);
            var targetDayOfWeek = ConvertFlagToDayOfWeek((DaysOfWeekFlag)DaysOfWeek.Value);

            // Encontra primeira ocorrência do dia da semana no mês
            var firstOccurrence = firstDayOfMonth;
            while (firstOccurrence.DayOfWeek != targetDayOfWeek)
                firstOccurrence = firstOccurrence.AddDays(1);

            // Adiciona semanas conforme necessário
            var targetDate = firstOccurrence.AddDays(7 * (WeekOfMonth.Value - 1));

            // Verifica se ainda está no mesmo mês
            if (targetDate.Month != nextMonth.Month)
                return CalculateNextMonthlyByDay(baseDate); // Fallback

            return targetDate;
        }

        private DateTime CalculateNextYearly(DateTime baseDate)
        {
            return baseDate.AddYears(Interval);
        }

        private static DaysOfWeekFlag ConvertDayOfWeekToFlag(DayOfWeek dayOfWeek)
        {
            return dayOfWeek switch
            {
                DayOfWeek.Monday => DaysOfWeekFlag.Monday,
                DayOfWeek.Tuesday => DaysOfWeekFlag.Tuesday,
                DayOfWeek.Wednesday => DaysOfWeekFlag.Wednesday,
                DayOfWeek.Thursday => DaysOfWeekFlag.Thursday,
                DayOfWeek.Friday => DaysOfWeekFlag.Friday,
                DayOfWeek.Saturday => DaysOfWeekFlag.Saturday,
                DayOfWeek.Sunday => DaysOfWeekFlag.Sunday,
                _ => DaysOfWeekFlag.Monday
            };
        }

        private static DayOfWeek ConvertFlagToDayOfWeek(DaysOfWeekFlag flag)
        {
            return flag switch
            {
                DaysOfWeekFlag.Monday => DayOfWeek.Monday,
                DaysOfWeekFlag.Tuesday => DayOfWeek.Tuesday,
                DaysOfWeekFlag.Wednesday => DayOfWeek.Wednesday,
                DaysOfWeekFlag.Thursday => DayOfWeek.Thursday,
                DaysOfWeekFlag.Friday => DayOfWeek.Friday,
                DaysOfWeekFlag.Saturday => DayOfWeek.Saturday,
                DaysOfWeekFlag.Sunday => DayOfWeek.Sunday,
                _ => DayOfWeek.Monday
            };
        }

        private string GetWeeklyDescription()
        {
            if (DaysOfWeek.HasValue)
            {
                var daysFlag = (DaysOfWeekFlag)DaysOfWeek.Value;
                var days = new List<string>();

                if (daysFlag.HasFlag(DaysOfWeekFlag.Monday)) days.Add("Seg");
                if (daysFlag.HasFlag(DaysOfWeekFlag.Tuesday)) days.Add("Ter");
                if (daysFlag.HasFlag(DaysOfWeekFlag.Wednesday)) days.Add("Qua");
                if (daysFlag.HasFlag(DaysOfWeekFlag.Thursday)) days.Add("Qui");
                if (daysFlag.HasFlag(DaysOfWeekFlag.Friday)) days.Add("Sex");
                if (daysFlag.HasFlag(DaysOfWeekFlag.Saturday)) days.Add("Sáb");
                if (daysFlag.HasFlag(DaysOfWeekFlag.Sunday)) days.Add("Dom");

                return $"Semanalmente ({string.Join(", ", days)})";
            }

            return Interval == 1 ? "Semanalmente" : $"A cada {Interval} semanas";
        }

        private string GetMonthlyDescription()
        {
            if (DayOfMonth.HasValue)
                return $"Todo dia {DayOfMonth} do mês";

            if (WeekOfMonth.HasValue && DaysOfWeek.HasValue)
            {
                var weekDesc = WeekOfMonth.Value switch
                {
                    1 => "Primeira",
                    2 => "Segunda",
                    3 => "Terceira",
                    4 => "Quarta",
                    5 => "Última",
                    _ => WeekOfMonth.Value.ToString()
                };

                var dayFlag = (DaysOfWeekFlag)DaysOfWeek.Value;
                var dayDesc = ConvertFlagToDayOfWeek(dayFlag).ToString().ToLower();

                return $"{weekDesc} {dayDesc} do mês";
            }

            return Interval == 1 ? "Mensalmente" : $"A cada {Interval} meses";
        }
    }

    /// <summary>
    /// Tipos de recorrência suportados
    /// </summary>
    public enum RecurrenceType
    {
        /// <summary>
        /// Recorrência diária
        /// </summary>
        Daily,

        /// <summary>
        /// Recorrência semanal
        /// </summary>
        Weekly,

        /// <summary>
        /// Recorrência mensal
        /// </summary>
        Monthly,

        /// <summary>
        /// Recorrência anual
        /// </summary>
        Yearly
    }

    /// <summary>
    /// Flags para dias da semana (permite combinações)
    /// </summary>
    [Flags]
    public enum DaysOfWeekFlag
    {
        /// <summary>
        /// Nenhum dia
        /// </summary>
        None = 0,

        /// <summary>
        /// Segunda-feira
        /// </summary>
        Monday = 1,

        /// <summary>
        /// Terça-feira
        /// </summary>
        Tuesday = 2,

        /// <summary>
        /// Quarta-feira
        /// </summary>
        Wednesday = 4,

        /// <summary>
        /// Quinta-feira
        /// </summary>
        Thursday = 8,

        /// <summary>
        /// Sexta-feira
        /// </summary>
        Friday = 16,

        /// <summary>
        /// Sábado
        /// </summary>
        Saturday = 32,

        /// <summary>
        /// Domingo
        /// </summary>
        Sunday = 64,

        /// <summary>
        /// Todos os dias da semana
        /// </summary>
        All = Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday,

        /// <summary>
        /// Apenas dias úteis (segunda a sexta)
        /// </summary>
        Weekdays = Monday | Tuesday | Wednesday | Thursday | Friday,

        /// <summary>
        /// Apenas fim de semana
        /// </summary>
        Weekend = Saturday | Sunday
    }
}