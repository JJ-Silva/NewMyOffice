using System;
using System.Collections.Generic;
using System.Linq;
using MyOffice.Domain.Exceptions;

namespace MyOffice.Domain.Entities
{
    /// <summary>
    /// Representa um processo (judicial, administrativo ou principal de pasta).
    /// 
    /// NÚCLEO MINIMALISTA: Contém apenas dados essenciais. Funcionalidades específicas 
    /// como informações judiciais detalhadas, gestão financeira e partes envolvidas
    /// serão adicionadas através de herança (ProcessJudicial, ProcessAdm) ou plugins.
    /// 
    /// Navigation: Process → Activity (unidirecional)
    /// NÃO possui navigation de volta para Folder (evita referência circular)
    /// </summary>
    public class Process : EntityBase
    {
        // ============ CAMPOS PRIVADOS ============

        /// <summary>
        /// Lista de atividades do processo
        /// </summary>
        private readonly List<ActivityBase> _activities = new();

        // ============ PROPRIEDADES PÚBLICAS ============

        /// <summary>
        /// ID da pasta que contém este processo
        /// NÃO há navigation property de volta (evita referência circular)
        /// </summary>
        public int? FolderId { get; private set; }

        /// <summary>
        /// Número/identificação do processo
        /// Pode ser CNJ, número administrativo, ou qualquer outro formato
        /// </summary>
        public virtual string Number { get; protected set; } = string.Empty;

        /// <summary>
        /// Indica se este é o processo principal da pasta
        /// Processo principal representa a própria pasta e recebe atividades gerais
        /// </summary>
        public bool IsMainProcess { get; private set; }

        /// <summary>
        /// Status atual do processo
        /// </summary>
        public ProcessStatus Status { get; private set; } = ProcessStatus.Active;

        /// <summary>
        /// Observações gerais do processo
        /// Campo livre para anotações importantes
        /// </summary>
        public string? Notes { get; private set; }

        // ============ NAVIGATION PROPERTIES ============

        /// <summary>
        /// Atividades do processo
        /// Navigation Property: Process → Activity
        /// </summary>
        public IReadOnlyCollection<ActivityBase> Activities => _activities.AsReadOnly();

        // ============ PROPRIEDADES CALCULADAS ============

        /// <summary>
        /// Conta total de atividades
        /// </summary>
        public int ActivityCount => _activities.Count;

        /// <summary>
        /// Conta atividades pendentes
        /// </summary>
        public int PendingActivityCount => _activities.Count(a => a.Status == ActivityStatus.Pending);

        /// <summary>
        /// Conta atividades concluídas
        /// </summary>
        public int CompletedActivityCount => _activities.Count(a => a.Status == ActivityStatus.Completed);

        /// <summary>
        /// Conta atividades em atraso
        /// </summary>
        public int OverdueActivityCount => _activities.Count(a => a.IsOverdue);

        /// <summary>
        /// Indica se o processo tem atividades pendentes
        /// </summary>
        public bool HasPendingActivities => _activities.Any(a => a.Status == ActivityStatus.Pending);

        /// <summary>
        /// Indica se o processo tem atividades em atraso
        /// </summary>
        public bool HasOverdueActivities => _activities.Any(a => a.IsOverdue);

        /// <summary>
        /// Última atividade concluída
        /// </summary>
        public ActivityBase? LastCompletedActivity => _activities
            .Where(a => a.Status == ActivityStatus.Completed)
            .OrderByDescending(a => a.CompletedAt)
            .FirstOrDefault();

        /// <summary>
        /// Indica se é processo genérico (não judicial nem administrativo)
        /// Classes filhas podem sobrescrever esta propriedade
        /// </summary>
        public virtual bool IsGeneric => true;

        // ============ CONSTRUTORES ============

        /// <summary>
        /// Construtor protegido para EF Core/ORM
        /// </summary>
        protected Process() { }

        /// <summary>
        /// Construtor interno para MainProcess (chamado pela Folder)
        /// </summary>
        /// <param name="number">Número/identificação do processo</param>
        /// <param name="isMainProcess">Se é processo principal da pasta</param>
        internal Process(string number, bool isMainProcess)
        {
            SetNumber(number);
            IsMainProcess = isMainProcess;
            Status = ProcessStatus.Active;
        }

        /// <summary>
        /// Construtor público para processos adicionais
        /// </summary>
        /// <param name="number">Número/identificação do processo</param>
        public Process(string number)
        {
            SetNumber(number);
            IsMainProcess = false;
            Status = ProcessStatus.Active;
        }

        // ============ MÉTODOS PÚBLICOS ============

        /// <summary>
        /// Define o número do processo com validação básica
        /// Classes filhas podem sobrescrever para validações específicas
        /// </summary>
        /// <param name="number">Número do processo</param>
        public virtual void SetNumber(string number)
        {
            ValidateNumber(number);
            Number = number;
            UpdateTimestamp();
        }

        /// <summary>
        /// Define observações do processo
        /// </summary>
        /// <param name="notes">Observações do processo</param>
        public void SetNotes(string? notes)
        {
            Notes = notes;
            UpdateTimestamp();
        }

        /// <summary>
        /// Adiciona uma atividade ao processo
        /// </summary>
        /// <param name="activity">Atividade a ser adicionada</param>
        public void AddActivity(ActivityBase activity)
        {
            if (activity == null)
                throw new ArgumentNullException(nameof(activity));

            _activities.Add(activity);
            activity.SetProcess(this.Id);
            UpdateTimestamp();
        }

        /// <summary>
        /// Remove uma atividade do processo
        /// </summary>
        /// <param name="activityId">ID da atividade a ser removida</param>
        public void RemoveActivity(int activityId)
        {
            var activity = _activities.FirstOrDefault(a => a.Id == activityId);
            if (activity != null)
            {
                _activities.Remove(activity);
                UpdateTimestamp();
            }
        }

        /// <summary>
        /// Obtém atividades por status
        /// </summary>
        /// <param name="status">Status das atividades</param>
        /// <returns>Atividades com o status especificado</returns>
        public IEnumerable<ActivityBase> GetActivitiesByStatus(ActivityStatus status)
        {
            return _activities.Where(a => a.Status == status);
        }

        /// <summary>
        /// Obtém atividades por prioridade
        /// </summary>
        /// <param name="priority">Prioridade das atividades</param>
        /// <returns>Atividades com a prioridade especificada</returns>
        public IEnumerable<ActivityBase> GetActivitiesByPriority(Priority priority)
        {
            return _activities.Where(a => a.EffectivePriority == priority);
        }

        /// <summary>
        /// Obtém atividades vencidas
        /// </summary>
        /// <returns>Atividades em atraso</returns>
        public IEnumerable<ActivityBase> GetOverdueActivities()
        {
            return _activities.Where(a => a.IsOverdue);
        }

        /// <summary>
        /// Atualiza o status do processo
        /// </summary>
        /// <param name="newStatus">Novo status</param>
        public void UpdateStatus(ProcessStatus newStatus)
        {
            Status = newStatus;
            UpdateTimestamp();
        }

        /// <summary>
        /// Suspende o processo
        /// </summary>
        public void Suspend()
        {
            if (Status == ProcessStatus.Completed)
                throw new ProcessException("Não é possível suspender processo concluído");

            if (Status == ProcessStatus.Archived)
                throw new ProcessException("Não é possível suspender processo arquivado");

            Status = ProcessStatus.Suspended;
            UpdateTimestamp();
        }

        /// <summary>
        /// Reativa o processo suspenso
        /// </summary>
        public void Reactivate()
        {
            if (Status == ProcessStatus.Completed)
                throw new ProcessException("Não é possível reativar processo concluído");

            Status = ProcessStatus.Active;
            UpdateTimestamp();
        }

        /// <summary>
        /// Finaliza o processo
        /// </summary>
        public void Complete()
        {
            Status = ProcessStatus.Completed;
            UpdateTimestamp();
        }

        /// <summary>
        /// Arquiva o processo
        /// </summary>
        public void Archive()
        {
            Status = ProcessStatus.Archived;
            UpdateTimestamp();
        }

        // ============ VALIDAÇÕES PRIVADAS ============

        /// <summary>
        /// Validação básica do número do processo
        /// Classes filhas podem implementar validações específicas
        /// </summary>
        /// <param name="number">Número a ser validado</param>
        protected virtual void ValidateNumber(string number)
        {
            if (string.IsNullOrWhiteSpace(number))
                throw new ProcessException("Número do processo é obrigatório");

            if (number.Length > 100)
                throw new ProcessException("Número do processo não pode exceder 100 caracteres");

            // Validação básica - sem caracteres especiais problemáticos
            char[] invalidChars = { '\r', '\n', '\t' };
            if (number.IndexOfAny(invalidChars) >= 0)
                throw new ProcessException("Número do processo contém caracteres inválidos");
        }

        // ============ MÉTODOS INTERNOS ============

        /// <summary>
        /// Atualiza o número internamente (usado pela Folder)
        /// </summary>
        /// <param name="number">Novo número</param>
        internal void UpdateNumber(string number)
        {
            SetNumber(number);
        }

        /// <summary>
        /// Define a pasta do processo (usado quando adicionado a uma pasta)
        /// </summary>
        /// <param name="folderId">ID da pasta</param>
        internal void SetFolderId(int? folderId)
        {
            FolderId = folderId;
            UpdateTimestamp();
        }

        /// <summary>
        /// Adiciona atividade à lista interna (usado pelo EF Core/ORM)
        /// </summary>
        /// <param name="activity">Atividade a ser adicionada</param>
        internal void AddActivityToCollection(ActivityBase activity)
        {
            if (activity != null && !_activities.Contains(activity))
            {
                _activities.Add(activity);
            }
        }

        /// <summary>
        /// Remove atividade da lista interna (usado pelo EF Core/ORM)
        /// </summary>
        /// <param name="activity">Atividade a ser removida</param>
        internal void RemoveActivityFromCollection(ActivityBase activity)
        {
            if (activity != null)
            {
                _activities.Remove(activity);
            }
        }
    }

    /// <summary>
    /// Status possíveis para um processo
    /// </summary>
    public enum ProcessStatus
    {
        /// <summary>
        /// Processo ativo - em andamento normal
        /// </summary>
        Active,

        /// <summary>
        /// Processo suspenso temporariamente
        /// </summary>
        Suspended,

        /// <summary>
        /// Processo arquivado - inativo mas não finalizado
        /// </summary>
        Archived,

        /// <summary>
        /// Processo concluído - finalizado definitivamente
        /// </summary>
        Completed
    }
}