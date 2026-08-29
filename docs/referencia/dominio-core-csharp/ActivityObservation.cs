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
    /// Observação de uma atividade
    /// </summary>
    public class ActivityObservation : EntityBase
    {
        public int ActivityId { get; private set; }
        public string Observation { get; private set; } = string.Empty;

        protected ActivityObservation() { }

        public ActivityObservation(int activityId, string observation)
        {
            if (activityId <= 0)
                throw new ArgumentException("ActivityId deve ser válido");

            if (string.IsNullOrWhiteSpace(observation))
                throw new DomainException("Observação não pode estar vazia");

            ActivityId = activityId;
            Observation = observation;
        }

        public void UpdateObservation(string observation)
        {
            if (string.IsNullOrWhiteSpace(observation))
                throw new DomainException("Observação não pode estar vazia");

            Observation = observation;
            UpdateTimestamp();
        }
    }
}
