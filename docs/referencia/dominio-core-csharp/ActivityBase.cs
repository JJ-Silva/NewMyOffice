using System;
using System.Collections.Generic;
using MyOffice.Domain.Exceptions;

namespace MyOffice.Domain.Entities
{
    /// <summary>
    /// Classe base abstrata para todas as atividades do sistema.
    /// 
    /// SISTEMA DE PRIORIDADES:
    /// - Prioridade baseada em prazos tem precedência sobre prioridade manual
    /// - Atividades com vencimento em até 5 dias = Priority.High (4)
    /// - Atividades com vencimento amanhã = Priority.Critical (5)
    /// - Priority manual serve para organização adicional
    /// 
    /// SISTEMA DE VISIBILIDADE:
    /// - Cada tipo tem padrão de DaysBeforeVisible
    /// - Usuário pode configurar individualmente por atividade
    /// - Agenda dinâmica usa esta lógica para mostrar/ocultar atividades
    /// </summary>
    public abstract class ActivityBase : EntityBase
    {
        // ============ CAMPOS PRIVADOS ============

        /// <summary>
        /// Lista de observações da atividade
        /// </summary>
        private readonly List<ActivityObservation> _observations = new();

        // ============ PROPRIEDADES PÚBLICAS ============

        /// <summary>
        /// ID do processo (sempre preenchido)
        /// NÃO há navigation property de volta
        /// </summary>
        public int ProcessId { get; private set; }

        /// <summary>
        /// ID do tratamento da atividade (referência para ActivityTreatment)
        /// O título da atividade vem do tratamento
        /// </summary>
        public int TreatmentId { get; private set; }

        /// <summary>
        /// Descrição detalhada (opcional)
        /// </summary>
        public string? Description { get; private set; }

        // ============ DATAS E PRAZOS ============

        /// <summary>
        /// Prazo fatal da atividade
        /// </summary>
        public DateTime? FatalDeadline { get; private set; }

        /// <summary>
        /// Data de conclusão
        /// </summary>
        public DateTime? CompletedAt { get; private set; }

        // ============ SISTEMA DE PRIORIDADES ============

        /// <summary>
        /// Prioridade manual da atividade (0-5)
        /// Secundária em relação à prioridade baseada em prazos
        /// </summary>
        public Priority ManualPriority { get; private set; } = Priority.Medium;

        /// <summary>
        /// Prioridade efetiva (calculada automaticamente)
        /// Combina prioridade manual com urgência de prazos
        /// </summary>
        public Priority EffectivePriority => CalculateEffectivePriority();

        // ============ STATUS E CONFIGURAÇÕES ============

        /// <summary>
        /// Status atual da atividade
        /// </summary>
        public ActivityStatus Status { get; private set; } = ActivityStatus.Pending;

        // ============ SISTEMA DE VISIBILIDADE NA AGENDA ============

        /// <summary>
        /// Dias antes da data de vencimento que a atividade fica visível na agenda
        /// Se null, usa o padrão do tipo de atividade
        /// </summary>
        public int? CustomDaysBeforeVisible { get; private set; }

        /// <summary>
        /// Dias efetivos antes do vencimento que fica visível
        /// Usa custom ou padrão do tipo
        /// </summary>
        public int EffectiveDaysBeforeVisible =>
            CustomDaysBeforeVisible ?? DefaultDaysBeforeVisible;

        // ============ SISTEMA DE RECORRÊNCIA ============

        /// <summary>
        /// ID da configuração de recorrência (se aplicável)
        /// </summary>
        public int? RecurrenceId { get; private set; }

        /// <summary>
        /// Indica se esta atividade é uma instância recorrente
        /// </summary>
        public bool IsRecurrenceInstance { get; private set; } = false;

        /// <summary>
        /// ID da atividade original (para instâncias recorrentes)
        /// </summary>
        public int? OriginalActivityId { get; private set; }

        // ============ PROPRIEDADES ABSTRATAS (IMPLEMENTADAS PELAS FILHAS) ============

        /// <summary>
        /// Padrão de dias antes do vencimento que fica visível na agenda
        /// Implementado por cada tipo de atividade
        /// </summary>
        public abstract int DefaultDaysBeforeVisible { get; }

        /// <summary>
        /// Indica se atividade persiste na agenda até conclusão
        /// Implementado por cada tipo de atividade
        /// </summary>
        public abstract bool IsPersistentInAgenda { get; }

        /// <summary>
        /// Indica se este tipo de atividade pode ter recorrência
        /// Implementado por cada tipo de atividade
        /// </summary>
        public abstract bool CanHaveRecurrence { get; }

        /// <summary>
        /// Tipo da atividade (para identificação)
        /// Implementado por cada tipo de atividade
        /// </summary>
        public abstract string ActivityType { get; }

        // ============ NAVIGATION PROPERTIES ============

        /// <summary>
        /// Observações da atividade
        /// Navigation Property: Activity → ActivityObservation
        /// </summary>
        public IReadOnlyList<ActivityObservation> Observations => _observations.AsReadOnly();

        // ============ CONSTRUTORES ============

        /// <summary>
        /// Construtor protegido para EF Core
        /// </summary>
        protected ActivityBase() { }

        /// <summary>
        /// Construtor para classes filhas
        /// </summary>
        /// <param name="treatmentId">ID do tratamento da atividade</param>
        /// <param name="description">Descrição opcional</param>
        /// <param name="manualPriority">Prioridade manual</param>
        protected ActivityBase(int treatmentId, string? description = null, Priority manualPriority = Priority.Medium)
        {
            TreatmentId = treatmentId;
            Description = description;
            ManualPriority = manualPriority;
            Status = ActivityStatus.Pending;
        }

        // ============ MÉTODOS PÚBLICOS ============

        /// <summary>
        /// Define o processo (usado quando adicionado a um processo)
        /// </summary>
        internal void SetProcess(int? processId)
        {
            if (processId == null)
            {
                throw new ActivityException("Processo deve estar persistido para receber atividades");
            }
            ProcessId = processId.Value;
            UpdateTimestamp();
   
        }

        /// <summary>
        /// Atualiza a descrição da atividade
        /// </summary>
        public void UpdateDescription(string? description)
        {
            Description = description;
            UpdateTimestamp();
        }

        /// <summary>
        /// Atualiza a data de prazo fatal
        /// </summary>
        public void UpdateFatalDeadline(DateTime? fatalDeadline)
        {
            ValidateFatalDeadline(fatalDeadline);
            FatalDeadline = fatalDeadline;
            UpdateTimestamp();
        }

        /// <summary>
        /// Atualiza a prioridade manual da atividade
        /// </summary>
        public void UpdateManualPriority(Priority priority)
        {
            ManualPriority = priority;
            UpdateTimestamp();
        }

        /// <summary>
        /// Configura visibilidade customizada na agenda
        /// </summary>
        public void SetCustomVisibility(int? daysBeforeVisible)
        {
            if (daysBeforeVisible.HasValue && daysBeforeVisible < 0)
                throw new ActivityException("Dias antes da visibilidade não pode ser negativo");

            CustomDaysBeforeVisible = daysBeforeVisible;
            UpdateTimestamp();
        }

        /// <summary>
        /// Atualiza o tratamento da atividade
        /// </summary>
        public void UpdateTreatment(int treatmentId)
        {
            TreatmentId = treatmentId;
            UpdateTimestamp();
        }

        /// <summary>
        /// Marca como em andamento
        /// </summary>
        public void MarkAsInProgress()
        {
            ValidateStatusTransition(ActivityStatus.InProgress);
            Status = ActivityStatus.InProgress;
            UpdateTimestamp();
        }

        /// <summary>
        /// Marca como concluída
        /// </summary>
        public void MarkAsCompleted()
        {
            if (Status == ActivityStatus.Cancelled)
                throw new ActivityException("Não é possível concluir atividade cancelada");

            Status = ActivityStatus.Completed;
            CompletedAt = DateTime.Now;
            UpdateTimestamp();
        }

        /// <summary>
        /// Cancela a atividade
        /// </summary>
        public void Cancel()
        {
            if (Status == ActivityStatus.Completed)
                throw new ActivityException("Não é possível cancelar atividade concluída");

            Status = ActivityStatus.Cancelled;
            UpdateTimestamp();
        }

        /// <summary>
        /// Adia a atividade
        /// </summary>
        public void Postpone(DateTime? newFatalDeadline = null)
        {
            ValidateStatusTransition(ActivityStatus.Postponed);

            Status = ActivityStatus.Postponed;

            if (newFatalDeadline.HasValue)
                FatalDeadline = newFatalDeadline;

            UpdateTimestamp();
        }

        /// <summary>
        /// Retorna a atividade ao status pendente
        /// </summary>
        public void Resume()
        {
            if (Status == ActivityStatus.Completed)
                throw new ActivityException("Não é possível reativar atividade concluída");

            if (Status == ActivityStatus.Cancelled)
                throw new ActivityException("Não é possível reativar atividade cancelada");

            Status = ActivityStatus.Pending;
            UpdateTimestamp();
        }

        /// <summary>
        /// Adiciona uma observação à atividade
        /// </summary>
        public void AddObservation(string observation)
        {
            if (!Id.HasValue)
                throw new InvalidOperationException("Não é possível adicionar observação a uma atividade não persistida.");

            if (string.IsNullOrWhiteSpace(observation))
                throw new ActivityException("Observação não pode estar vazia");

            var obs = new ActivityObservation(this.Id.Value, observation);
            _observations.Add(obs);
            UpdateTimestamp();
        }

        /// <summary>
        /// Remove uma observação
        /// </summary>
        public void RemoveObservation(int observationId)
        {
            var observation = _observations.Find(o => o.Id == observationId);
            if (observation != null)
            {
                _observations.Remove(observation);
                UpdateTimestamp();
            }
        }

        // ============ LÓGICA DE VISIBILIDADE NA AGENDA ============

        /// <summary>
        /// Verifica se a atividade deve ser visível na agenda em uma data específica
        /// </summary>
        public bool IsVisibleInAgenda(DateTime agendaDate)
        {
            // Atividades concluídas ou canceladas não aparecem
            if (Status == ActivityStatus.Completed || Status == ActivityStatus.Cancelled)
                return false;

            // Atividades persistentes sempre aparecem (ex: prazos processuais)
            if (IsPersistentInAgenda && Status == ActivityStatus.Pending)
                return true;

            // Para atividades com data específica, verifica período de visibilidade
            if (!FatalDeadline.HasValue)
                return IsPersistentInAgenda; // Sem data, só aparece se for persistente

            var showFromDate = FatalDeadline.Value.AddDays(-EffectiveDaysBeforeVisible);
            return agendaDate >= showFromDate.Date && agendaDate <= FatalDeadline.Value.Date;
        }

        /// <summary>
        /// Configura recorrência para a atividade
        /// </summary>
        public void SetRecurrence(int recurrenceId)
        {
            if (!CanHaveRecurrence)
                throw new ActivityException($"Atividades do tipo {ActivityType} não podem ter recorrência");

            RecurrenceId = recurrenceId;
            UpdateTimestamp();
        }

        /// <summary>
        /// Marca como instância recorrente
        /// </summary>
        internal void MarkAsRecurrenceInstance(int originalActivityId)
        {
            IsRecurrenceInstance = true;
            OriginalActivityId = originalActivityId;
            UpdateTimestamp();
        }

        // ============ PROPRIEDADES CALCULADAS ============

        /// <summary>
        /// Indica se a atividade está atrasada
        /// </summary>
        public bool IsOverdue =>
            FatalDeadline.HasValue &&
            FatalDeadline < DateTime.Now &&
            Status != ActivityStatus.Completed;

        /// <summary>
        /// Indica se o prazo fatal foi atingido
        /// </summary>
        public bool IsFatalDeadlineReached =>
            FatalDeadline.HasValue &&
            FatalDeadline < DateTime.Now &&
            Status != ActivityStatus.Completed;

        /// <summary>
        /// Dias restantes até o vencimento (negativo se atrasado)
        /// </summary>
        public int? DaysUntilDue =>
            FatalDeadline.HasValue ? (int)(FatalDeadline.Value.Date - DateTime.Today).TotalDays : null;

        /// <summary>
        /// Indica se a atividade vence hoje
        /// </summary>
        public bool IsDueToday =>
            FatalDeadline.HasValue && FatalDeadline.Value.Date == DateTime.Today;

        /// <summary>
        /// Indica se a atividade vence amanhã
        /// </summary>
        public bool IsDueTomorrow =>
            FatalDeadline.HasValue && FatalDeadline.Value.Date == DateTime.Today.AddDays(1);

        /// <summary>
        /// Indica se a atividade vence nos próximos 5 dias
        /// </summary>
        public bool IsDueInNext5Days =>
            FatalDeadline.HasValue &&
            FatalDeadline.Value.Date >= DateTime.Today &&
            FatalDeadline.Value.Date <= DateTime.Today.AddDays(5);

        // ============ VALIDAÇÕES E MÉTODOS PRIVADOS ============

        /// <summary>
        /// Calcula a prioridade efetiva baseada em prazos e prioridade manual
        /// </summary>
        private Priority CalculateEffectivePriority()
        {
            // Prioridade baseada em prazos tem precedência
            if (IsFatalDeadlineReached || IsOverdue)
                return Priority.Critical;

            if (IsDueToday)
                return Priority.Critical;

            if (IsDueTomorrow)
                return Priority.Critical;

            if (IsDueInNext5Days)
                return Priority.High;

            // Se não há urgência de prazo, usa prioridade manual
            return ManualPriority;
        }

        /// <summary>
        /// Valida prazo fatal
        /// </summary>
        private void ValidateFatalDeadline(DateTime? fatalDeadline)
        {
            if (fatalDeadline.HasValue && fatalDeadline < CreatedAt)
                throw new ActivityException("Prazo fatal não pode ser anterior à data de criação");
        }

        /// <summary>
        /// Valida transições de status
        /// </summary>
        private void ValidateStatusTransition(ActivityStatus newStatus)
        {
            if (Status == ActivityStatus.Completed)
                throw new ActivityException("Não é possível alterar status de atividade concluída");

            if (Status == ActivityStatus.Cancelled)
                throw new ActivityException("Não é possível alterar status de atividade cancelada");
        }

        /// <summary>
        /// Adiciona observação à lista interna (usado pelo EF Core)
        /// </summary>
        internal void AddObservationToList(ActivityObservation observation)
        {
            if (observation != null && !_observations.Contains(observation))
            {
                _observations.Add(observation);
            }
        }
    }

    /// <summary>
    /// Níveis de prioridade (0-5, quanto maior mais urgente)
    /// </summary>
    public enum Priority
    {
        /// <summary>
        /// Sem prioridade específica
        /// </summary>
        None = 0,

        /// <summary>
        /// Prioridade muito baixa
        /// </summary>
        VeryLow = 1,

        /// <summary>
        /// Prioridade baixa
        /// </summary>
        Low = 2,

        /// <summary>
        /// Prioridade média (padrão)
        /// </summary>
        Medium = 3,

        /// <summary>
        /// Prioridade alta
        /// </summary>
        High = 4,

        /// <summary>
        /// Prioridade crítica/urgente
        /// </summary>
        Critical = 5
    }

    /// <summary>
    /// Status possíveis para uma atividade
    /// </summary>
    public enum ActivityStatus
    {
        /// <summary>
        /// Atividade pendente
        /// </summary>
        Pending,

        /// <summary>
        /// Atividade em andamento
        /// </summary>
        InProgress,

        /// <summary>
        /// Atividade concluída
        /// </summary>
        Completed,

        /// <summary>
        /// Atividade cancelada
        /// </summary>
        Cancelled,

        /// <summary>
        /// Atividade adiada
        /// </summary>
        Postponed
    }
}