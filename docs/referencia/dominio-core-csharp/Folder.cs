using System;
using System.Collections.Generic;
using System.Linq;
using MyOffice.Domain.Exceptions;

namespace MyOffice.Domain.Entities
{
    /// <summary>
    /// Representa uma pasta que agrupa processos relacionados.
    /// Toda pasta possui um processo principal que a representa,
    /// permitindo que a pasta tenha comportamento de processo (receber atividades).
    /// 
    /// NÚCLEO MINIMALISTA: Funcionalidades como categorização e gestão de clientes
    /// serão adicionadas através de plugins específicos.
    /// 
    /// Navigation: Folder → Process (unidirecional)
    /// Navigation: Folder → Activity (através do MainProcess)
    /// </summary>
    public class Folder : EntityBase
    {

        /// <summary>
        /// MainProcess FORA da lista (conceito separado)
        /// Representa a própria pasta como um processo
        /// </summary>
        private Process _mainProcess = null!;

        /// <summary>
        /// Lista de processos adicionais (judiciais, administrativos, etc.)
        /// NÃO inclui o MainProcess
        /// </summary>
        private readonly List<Process> _processes = new();

        /// <summary>
        /// Nome da pasta
        /// </summary>
        public string Name { get; private set; } = string.Empty;

        /// <summary>
        /// Descrição opcional da pasta
        /// </summary>
        public string? Description { get; private set; }

        /// <summary>
        /// Indica se a pasta está arquivada
        /// </summary>
        public bool IsArchived { get; private set; } = false;

        /// <summary>
        /// Processo principal que representa a pasta
        /// Navigation Property: Folder → Process
        /// Permite que a pasta tenha atividades próprias
        /// </summary>
        public Process MainProcess => _mainProcess;

        /// <summary>
        /// ID do processo principal (convenience property)
        /// </summary>
        public int? MainProcessId => _mainProcess?.Id;

        /// <summary>
        /// Processos adicionais (NÃO inclui o MainProcess)
        /// Navigation Property: Folder → Process
        /// </summary>
        public IReadOnlyCollection<Process> Processes => _processes.AsReadOnly();

        // ============ PROPRIEDADES CALCULADAS ============

        /// <summary>
        /// TODAS as atividades (pasta + todos os processos)
        /// Calculada através das navegações
        /// </summary>
        public IEnumerable<ActivityBase> AllActivities =>
            _mainProcess.Activities.Concat(_processes.SelectMany(p => p.Activities));

        /// <summary>
        /// Atividades da pasta (atividades do MainProcess)
        /// </summary>
        public IReadOnlyCollection<ActivityBase> FolderActivities => _mainProcess.Activities;

        /// <summary>
        /// Total de processos (incluindo MainProcess)
        /// </summary>
        public int TotalProcessCount => _processes.Count + 1;

        /// <summary>
        /// Apenas processos adicionais
        /// </summary>
        public int AdditionalProcessCount => _processes.Count;

        /// <summary>
        /// Total de atividades (pasta + processos)
        /// </summary>
        public int TotalActivitiesCount =>
            _mainProcess.Activities.Count + _processes.Sum(p => p.Activities.Count);

        /// <summary>
        /// Atividades pendentes em toda a pasta
        /// </summary>
        public int PendingActivitiesCount =>
            AllActivities.Count(a => a.Status == ActivityStatus.Pending);

        /// <summary>
        /// Atividades em atraso em toda a pasta
        /// </summary>
        public int OverdueActivitiesCount =>
            AllActivities.Count(a => a.IsOverdue);

        /// <summary>
        /// Indica se a pasta tem atividades pendentes
        /// </summary>
        public bool HasPendingActivities =>
            AllActivities.Any(a => a.Status == ActivityStatus.Pending);

        /// <summary>
        /// Indica se a pasta tem atividades em atraso
        /// </summary>
        public bool HasOverdueActivities =>
            AllActivities.Any(a => a.IsOverdue);

        // ============ CONSTRUTORES ============

        /// <summary>
        /// Construtor protegido para EF Core/ORM
        /// </summary>
        protected Folder() { }

        /// <summary>
        /// Construtor público - cria pasta com processo principal automaticamente
        /// </summary>
        /// <param name="name">Nome da pasta (obrigatório)</param>
        /// <param name="description">Descrição opcional</param>
        public Folder(string name, string? description = null)
        {
            SetName(name);
            Description = description;

            // Criar MainProcess automaticamente com mesmo nome da pasta
            CreateMainProcess();
        }

        // ============ MÉTODOS PÚBLICOS ============

        /// <summary>
        /// Define o nome da pasta e atualiza o MainProcess
        /// </summary>
        /// <param name="name">Novo nome da pasta</param>
        public void SetName(string name)
        {
            ValidateName(name);

            Name = name;

            // Atualizar número do MainProcess se já existir
            if (_mainProcess != null)
                _mainProcess.SetNumber(name);

            UpdateTimestamp();
        }

        /// <summary>
        /// Atualiza a descrição da pasta
        /// </summary>
        /// <param name="description">Nova descrição</param>
        public void SetDescription(string? description)
        {
            Description = description;
            UpdateTimestamp();
        }

        /// <summary>
        /// Adiciona um processo adicional à pasta
        /// </summary>
        /// <param name="process">Processo a ser adicionado</param>
        public void AddProcess(Process process)
        {
            if (process == null)
                throw new ArgumentNullException(nameof(process));

            if (process.IsMainProcess)
                throw new FolderException("Não é possível adicionar um processo principal como processo adicional");

            if (_processes.Any(p => p.Number == process.Number))
                throw new FolderException($"Já existe um processo com número '{process.Number}' nesta pasta");

            if (_mainProcess.Number == process.Number)
                throw new FolderException($"O número '{process.Number}' já é usado pelo processo principal da pasta");

            _processes.Add(process);
            process.SetFolderId(this.Id);
            UpdateTimestamp();
        }

        /// <summary>
        /// Remove um processo adicional
        /// </summary>
        /// <param name="processId">ID do processo a ser removido</param>
        public void RemoveProcess(int processId)
        {
            var process = _processes.FirstOrDefault(p => p.Id == processId);
            if (process != null)
            {
                _processes.Remove(process);
                UpdateTimestamp();
            }
        }

        /// <summary>
        /// Adiciona uma atividade ao processo principal (pasta)
        /// </summary>
        /// <param name="activity">Atividade a ser adicionada</param>
        public void AddActivity(ActivityBase activity)
        {
            if (activity == null)
                throw new ArgumentNullException(nameof(activity));

            _mainProcess.AddActivity(activity);
            activity.SetProcess (_mainProcess.Id);
            UpdateTimestamp();
        }

        /// <summary>
        /// Busca processo por número (incluindo MainProcess)
        /// </summary>
        /// <param name="number">Número do processo</param>
        /// <returns>Processo encontrado ou null</returns>
        public Process? FindProcessByNumber(string number)
        {
            if (string.IsNullOrWhiteSpace(number))
                return null;

            if (_mainProcess.Number.Equals(number, StringComparison.OrdinalIgnoreCase))
                return _mainProcess;

            return _processes.FirstOrDefault(p =>
                p.Number.Equals(number, StringComparison.OrdinalIgnoreCase));
        }

        /// <summary>
        /// Obtém todas as atividades por status
        /// </summary>
        /// <param name="status">Status das atividades</param>
        /// <returns>Atividades com o status especificado</returns>
        public IEnumerable<ActivityBase> GetActivitiesByStatus(ActivityStatus status)
        {
            return AllActivities.Where(a => a.Status == status);
        }

        /// <summary>
        /// Arquiva a pasta e todos os seus processos
        /// </summary>
        public void Archive()
        {
            IsArchived = true;
            _mainProcess.Archive();

            foreach (var process in _processes)
            {
                process.Archive();
            }

            UpdateTimestamp();
        }

        /// <summary>
        /// Desarquiva a pasta e reativa o processo principal
        /// </summary>
        public void Unarchive()
        {
            IsArchived = false;
            _mainProcess.Reactivate();
            UpdateTimestamp();
        }

        // ============ VALIDAÇÕES PRIVADAS ============

        /// <summary>
        /// Valida o nome da pasta
        /// </summary>
        /// <param name="name">Nome a ser validado</param>
        private static void ValidateName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new FolderException("Nome da pasta é obrigatório");

            if (name.Length < 3)
                throw new FolderException("Nome deve ter pelo menos 3 caracteres");

            if (name.Length > 200)
                throw new FolderException("Nome não pode exceder 200 caracteres");

            // Validar caracteres inválidos para nome de pasta
            char[] invalidChars = { '/', '\\', ':', '*', '?', '"', '<', '>', '|' };
            if (name.IndexOfAny(invalidChars) >= 0)
                throw new FolderException("Nome contém caracteres inválidos");
        }

        // ============ MÉTODOS PRIVADOS ============

        /// <summary>
        /// Cria o processo principal da pasta
        /// </summary>
        private void CreateMainProcess()
        {
            _mainProcess = new Process(Name, true); // true = isMainProcess
            _mainProcess.SetFolderId(this.Id);
        }

        // ============ MÉTODOS INTERNOS (EF CORE/ORM) ============

        /// <summary>
        /// Define o MainProcess (usado pelo EF Core durante reconstrução)
        /// </summary>
        /// <param name="mainProcess">Processo principal</param>
        internal void SetMainProcess(Process mainProcess)
        {
            if (mainProcess == null)
                throw new ArgumentNullException(nameof(mainProcess));

            if (!mainProcess.IsMainProcess)
                throw new FolderException("Processo deve ser marcado como principal");

            _mainProcess = mainProcess;
        }

        /// <summary>
        /// Adiciona processo à lista interna (usado pelo EF Core/ORM)
        /// </summary>
        /// <param name="process">Processo a ser adicionado</param>
        internal void AddProcessToCollection(Process process)
        {
            if (process != null && !_processes.Contains(process))
            {
                _processes.Add(process);
            }
        }

        /// <summary>
        /// Remove processo da lista interna (usado pelo EF Core/ORM)
        /// </summary>
        /// <param name="process">Processo a ser removido</param>
        internal void RemoveProcessFromCollection(Process process)
        {
            if (process != null)
            {
                _processes.Remove(process);
            }
        }
    }
}