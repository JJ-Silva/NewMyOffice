using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace MyOffice.Domain.Entities
{
    public class ProcessParts : EntityBase
    {
        public int ProcessId { get; private set; }
        public Process Process { get; private set; } = null!;
        public string Name { get; private set; } = string.Empty;
        public string PartyType { get; private set; } = string.Empty; // Réu, Terceiro, etc.

        // Construtor protegido para EF Core
        protected ProcessParts() { }

        public ProcessParts(Process process, string name, string partyType = "Opposing")
        {
            ValidateName(name);
            ValidatePartyType(partyType);

            Process = process ?? throw new ArgumentNullException(nameof(process));
            if(process.Id is null)
            {
                throw new ArgumentException("Processo deve ser persistido antes de adicionar partes.", nameof(process));
                
            }
            ProcessId = process.Id.Value;           
            Name = name;
            PartyType = partyType;
        }

        public void UpdateDetails(string name, string partyType)
        {
            ValidateName(name);
            ValidatePartyType(partyType);

            Name = name;
            PartyType = partyType;
            UpdateTimestamp();
        }

        private static void ValidateName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new ArgumentException("Nome da parte não pode estar vazio.");

            if (name.Length > 250)
                throw new ArgumentException("Nome da parte não pode exceder 250 caracteres.");
        }

        private static void ValidatePartyType(string partyType)
        {
            if (string.IsNullOrWhiteSpace(partyType))
                throw new ArgumentException("Tipo da parte não pode estar vazio.");

            if (partyType.Length > 50)
                throw new ArgumentException("Tipo da parte não pode exceder 50 caracteres.");
        }
    }
}
