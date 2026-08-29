using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using MyOffice.Domain.Exceptions;

namespace MyOffice.Domain.Entities
{
    /// <summary>
    /// Tipo de tratamento da atividade
    /// </summary>
    public class ActivityTreatment : EntityBase
    {
        public string Name { get; private set; } = string.Empty;
        public string? Description { get; private set; }
        public bool RequiresDocument { get; private set; }
        public int DefaultDurationDays { get; private set; }

        protected ActivityTreatment() { }

        public ActivityTreatment(string name, string? description = null, bool requiresDocument = false, int defaultDurationDays = 0)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Nome do tratamento é obrigatório");

            Name = name;
            Description = description;
            RequiresDocument = requiresDocument;
            DefaultDurationDays = defaultDurationDays;
        }

        public void UpdateInfo(string name, string? description, bool requiresDocument, int defaultDurationDays)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new DomainException("Nome do tratamento é obrigatório");

            Name = name;
            Description = description;
            RequiresDocument = requiresDocument;
            DefaultDurationDays = Math.Max(0, defaultDurationDays);
            UpdateTimestamp();
        }
    }
}
