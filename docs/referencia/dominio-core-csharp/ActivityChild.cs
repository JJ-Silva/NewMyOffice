using System;
using MyOffice.Domain.Exceptions;

namespace MyOffice.Domain.Entities
{
    /// <summary>
    /// Atividade de prazo processual (contestação, recursos, prazos judiciais).
    /// 
    /// CARACTERÍSTICAS:
    /// - Sempre visível na agenda desde a criação até conclusão
    /// - Não pode ter recorrência (prazos são únicos por processo)
    /// - Prioridade crítica baseada em proximidade do vencimento
    /// - Usado para prazos que não podem ser perdidos
    /// </summary>
    public class DeadlineActivity : ActivityBase
    {
        // ============ PROPRIEDADES ABSTRATAS IMPLEMENTADAS ============

        /// <summary>
        /// Aparece imediatamente na agenda (não espera X dias antes)
        /// </summary>
        public override int DefaultDaysBeforeVisible => 0;

        /// <summary>
        /// Persiste na agenda até ser concluída
        /// </summary>
        public override bool IsPersistentInAgenda => true;

        /// <summary>
        /// Prazos processuais não se repetem
        /// </summary>
        public override bool CanHaveRecurrence => false;

        /// <summary>
        /// Identificação do tipo
        /// </summary>
        public override string ActivityType => "Deadline";

        // ============ CONSTRUTORES ============

        /// <summary>
        /// Construtor protegido para EF Core
        /// </summary>
        protected DeadlineActivity() : base() { }

        /// <summary>
        /// Construtor para criar nova atividade de prazo
        /// </summary>
        /// <param name="treatmentId">ID do tratamento (ex: "Contestação", "Recurso")</param>
        /// <param name="fatalDeadline">Data limite do prazo</param>
        /// <param name="description">Descrição adicional do prazo</param>
        /// <param name="manualPriority">Prioridade manual (opcional)</param>
        public DeadlineActivity(int treatmentId, DateTime fatalDeadline,string? description = null,Priority manualPriority = Priority.High)
                                : base(treatmentId, description, manualPriority)
        {
            UpdateFatalDeadline(fatalDeadline);
        }

        // ============ MÉTODOS ESPECÍFICOS ============

        /// <summary>
        /// Configura o prazo com validações específicas para atividades de deadline
        /// </summary>
        /// <param name="fatalDeadline">Nova data limite</param>
        public void SetDeadline(DateTime fatalDeadline)
        {
            if (fatalDeadline <= DateTime.Today)
                throw new ActivityException("Prazo processual deve ser uma data futura");

            UpdateFatalDeadline(fatalDeadline);
        }

        /// <summary>
        /// Prorroga o prazo (comum em processos judiciais)
        /// </summary>
        /// <param name="newFatalDeadline">Nova data limite</param>
        /// <param name="reason">Motivo da prorrogação</param>
        public void ExtendDeadline(DateTime newFatalDeadline, string? reason = null)
        {
            if (newFatalDeadline <= FatalDeadline)
                throw new ActivityException("Prorrogação deve ser para data posterior ao prazo atual");

            if (Status == ActivityStatus.Completed)
                throw new ActivityException("Não é possível prorrogar prazo já cumprido");

            UpdateFatalDeadline(newFatalDeadline);

            if (!string.IsNullOrWhiteSpace(reason))
                AddObservation($"Prazo prorrogado: {reason}");
        }
    }

    /// <summary>
    /// Atividade de compromisso com data/hora específica (audiências, reuniões).
    /// 
    /// CARACTERÍSTICAS:
    /// - Aparece na agenda 5 dias antes por padrão
    /// - Não persiste (só aparece no período de visibilidade)
    /// - Pode ter recorrência (reuniões periódicas)
    /// - Horário específico importante
    /// </summary>
    public class AppointmentActivity : ActivityBase
    {
        // ============ PROPRIEDADES ESPECÍFICAS ============

        /// <summary>
        /// Horário específico do compromisso
        /// </summary>
        public TimeSpan? AppointmentTime { get; private set; }

        /// <summary>
        /// Local do compromisso
        /// </summary>
        public string? Location { get; private set; }

        /// <summary>
        /// Duração estimada do compromisso (em minutos)
        /// </summary>
        public int? EstimatedDurationMinutes { get; private set; }

        // ============ PROPRIEDADES ABSTRATAS IMPLEMENTADAS ============

        /// <summary>
        /// Aparece 5 dias antes por padrão
        /// </summary>
        public override int DefaultDaysBeforeVisible => 5;

        /// <summary>
        /// Não persiste - só aparece no período de visibilidade
        /// </summary>
        public override bool IsPersistentInAgenda => false;

        /// <summary>
        /// Compromissos podem se repetir (reuniões periódicas)
        /// </summary>
        public override bool CanHaveRecurrence => true;

        /// <summary>
        /// Identificação do tipo
        /// </summary>
        public override string ActivityType => "Appointment";

        // ============ CONSTRUTORES ============

        /// <summary>
        /// Construtor protegido para EF Core
        /// </summary>
        protected AppointmentActivity() : base() { }

        /// <summary>
        /// Construtor para criar novo compromisso
        /// </summary>
        /// <param name="treatmentId">ID do tratamento (ex: "Audiência", "Reunião")</param>
        /// <param name="appointmentDate">Data do compromisso</param>
        /// <param name="appointmentTime">Horário do compromisso</param>
        /// <param name="location">Local do compromisso</param>
        /// <param name="description">Descrição adicional</param>
        /// <param name="manualPriority">Prioridade manual</param>
        public AppointmentActivity(
            int treatmentId,
            DateTime appointmentDate,
            TimeSpan? appointmentTime = null,
            string? location = null,
            string? description = null,
            Priority manualPriority = Priority.Medium)
            : base(treatmentId, description, manualPriority)
        {
            UpdateFatalDeadline(appointmentDate);
            AppointmentTime = appointmentTime;
            Location = location;
        }

        // ============ MÉTODOS ESPECÍFICOS ============

        /// <summary>
        /// Atualiza informações do compromisso
        /// </summary>
        /// <param name="appointmentDate">Nova data</param>
        /// <param name="appointmentTime">Novo horário</param>
        /// <param name="location">Novo local</param>
        /// <param name="estimatedDurationMinutes">Duração estimada</param>
        public void UpdateAppointmentDetails(
            DateTime? appointmentDate = null,
            TimeSpan? appointmentTime = null,
            string? location = null,
            int? estimatedDurationMinutes = null)
        {
            if (appointmentDate.HasValue)
            {
                if (appointmentDate <= DateTime.Today && Status == ActivityStatus.Pending)
                    throw new ActivityException("Compromisso não pode ser agendado para data passada");

                UpdateFatalDeadline(appointmentDate);
            }

            if (appointmentTime.HasValue)
                AppointmentTime = appointmentTime;

            Location = location;

            if (estimatedDurationMinutes.HasValue)
            {
                if (estimatedDurationMinutes < 0)
                    throw new ActivityException("Duração não pode ser negativa");

                EstimatedDurationMinutes = estimatedDurationMinutes;
            }

            UpdateTimestamp();
        }

        /// <summary>
        /// Reagenda o compromisso
        /// </summary>
        /// <param name="newDate">Nova data</param>
        /// <param name="newTime">Novo horário</param>
        /// <param name="reason">Motivo do reagendamento</param>
        public void Reschedule(DateTime newDate, TimeSpan? newTime = null, string? reason = null)
        {
            if (newDate <= DateTime.Today)
                throw new ActivityException("Reagendamento deve ser para data futura");

            if (Status == ActivityStatus.Completed)
                throw new ActivityException("Não é possível reagendar compromisso já realizado");

            var oldDate = FatalDeadline;
            var oldTime = AppointmentTime;

            UpdateFatalDeadline(newDate);
            AppointmentTime = newTime ?? AppointmentTime;

            var observation = $"Reagendado de {oldDate:dd/MM/yyyy}";
            if (oldTime.HasValue)
                observation += $" às {oldTime:hh\\:mm}";

            observation += $" para {newDate:dd/MM/yyyy}";
            if (AppointmentTime.HasValue)
                observation += $" às {AppointmentTime:hh\\:mm}";

            if (!string.IsNullOrWhiteSpace(reason))
                observation += $". Motivo: {reason}";

            AddObservation(observation);
        }

        /// <summary>
        /// Data e hora completa do compromisso
        /// </summary>
        public DateTime? FullAppointmentDateTime =>
            FatalDeadline.HasValue && AppointmentTime.HasValue
                ? FatalDeadline.Value.Date + AppointmentTime.Value
                : FatalDeadline;
    }

    /// <summary>
    /// Atividade de monitoramento/verificação (verificar certidão, acompanhar processo).
    /// 
    /// CARACTERÍSTICAS:
    /// - Aparece apenas no dia (não precisa antecipação)
    /// - Não persiste (só aparece no dia específico)
    /// - Pode ter recorrência (verificações periódicas)
    /// - Menos crítica que prazos e compromissos
    /// </summary>
    public class MonitoringActivity : ActivityBase
    {
        // ============ PROPRIEDADES ESPECÍFICAS ============

        /// <summary>
        /// URL ou referência do que deve ser monitorado
        /// </summary>
        public string? MonitoringTarget { get; private set; }

        /// <summary>
        /// Indica se é monitoramento automático (pode ser automatizado no futuro)
        /// </summary>
        public bool IsAutomaticMonitoring { get; private set; } = false;

        /// <summary>
        /// Última data de verificação bem-sucedida
        /// </summary>
        public DateTime? LastSuccessfulCheck { get; private set; }

        // ============ PROPRIEDADES ABSTRATAS IMPLEMENTADAS ============

        /// <summary>
        /// Aparece apenas no dia (não precisa antecipação)
        /// </summary>
        public override int DefaultDaysBeforeVisible => 0;

        /// <summary>
        /// Não persiste - só aparece no dia específico
        /// </summary>
        public override bool IsPersistentInAgenda => false;

        /// <summary>
        /// Monitoramentos podem se repetir (verificações periódicas)
        /// </summary>
        public override bool CanHaveRecurrence => true;

        /// <summary>
        /// Identificação do tipo
        /// </summary>
        public override string ActivityType => "Monitoring";

        // ============ CONSTRUTORES ============

        /// <summary>
        /// Construtor protegido para EF Core
        /// </summary>
        protected MonitoringActivity() : base() { }

        /// <summary>
        /// Construtor para criar nova atividade de monitoramento
        /// </summary>
        /// <param name="treatmentId">ID do tratamento (ex: "Verificar Certidão", "Acompanhar Processo")</param>
        /// <param name="monitoringTarget">O que deve ser monitorado</param>
        /// <param name="checkDate">Data para verificação (opcional)</param>
        /// <param name="description">Descrição adicional</param>
        /// <param name="manualPriority">Prioridade manual</param>
        public MonitoringActivity(
            int treatmentId,
            string? monitoringTarget = null,
            DateTime? checkDate = null,
            string? description = null,
            Priority manualPriority = Priority.Low)
            : base(treatmentId, description, manualPriority)
        {
            MonitoringTarget = monitoringTarget;

            if (checkDate.HasValue)
                UpdateFatalDeadline(checkDate);
        }

        // ============ MÉTODOS ESPECÍFICOS ============

        /// <summary>
        /// Atualiza o alvo do monitoramento
        /// </summary>
        /// <param name="target">Novo alvo (URL, número do processo, etc.)</param>
        public void UpdateMonitoringTarget(string? target)
        {
            MonitoringTarget = target;
            UpdateTimestamp();
        }

        /// <summary>
        /// Marca como monitoramento automático
        /// </summary>
        /// <param name="isAutomatic">Se é automático</param>
        public void SetAutomaticMonitoring(bool isAutomatic)
        {
            IsAutomaticMonitoring = isAutomatic;
            UpdateTimestamp();
        }

        /// <summary>
        /// Registra uma verificação realizada
        /// </summary>
        /// <param name="checkDate">Data da verificação</param>
        /// <param name="result">Resultado da verificação</param>
        /// <param name="foundChanges">Se foram encontradas mudanças</param>
        public void RegisterCheck(DateTime? checkDate = null, string? result = null, bool foundChanges = false)
        {
            var checkDateTime = checkDate ?? DateTime.Now;
            LastSuccessfulCheck = checkDateTime;

            var observation = $"Verificação realizada em {checkDateTime:dd/MM/yyyy HH:mm}";

            if (!string.IsNullOrWhiteSpace(result))
                observation += $": {result}";

            if (foundChanges)
            {
                observation += " (MUDANÇAS DETECTADAS)";
                // Se encontrou mudanças, pode elevar a prioridade temporariamente
                if (ManualPriority < Priority.High)
                    UpdateManualPriority(Priority.High);
            }

            AddObservation(observation);

            // Se foi concluída com sucesso e há recorrência, não marca como completed
            // A recorrência criará uma nova instância
            if (!foundChanges && RecurrenceId == null)
                MarkAsCompleted();

            UpdateTimestamp();
        }

        /// <summary>
        /// Agenda próxima verificação
        /// </summary>
        /// <param name="nextCheckDate">Data da próxima verificação</param>
        public void ScheduleNextCheck(DateTime nextCheckDate)
        {
            if (nextCheckDate <= DateTime.Today)
                throw new ActivityException("Próxima verificação deve ser em data futura");

            UpdateFatalDeadline(nextCheckDate);
            AddObservation($"Próxima verificação agendada para {nextCheckDate:dd/MM/yyyy}");
        }

        /// <summary>
        /// Indica se está atrasada para verificação
        /// </summary>
        public bool IsOverdueForCheck =>
            FatalDeadline.HasValue &&
            FatalDeadline < DateTime.Today &&
            Status == ActivityStatus.Pending;

        /// <summary>
        /// Dias desde a última verificação bem-sucedida
        /// </summary>
        public int? DaysSinceLastCheck =>
            LastSuccessfulCheck.HasValue
                ? (int)(DateTime.Today - LastSuccessfulCheck.Value.Date).TotalDays
                : null;
    }
}