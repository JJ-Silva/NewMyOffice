using System;

namespace MyOffice.Domain.Entities
{
    /// <summary>
    /// Classe base para todas as entidades do domínio
    /// </summary>
    public abstract class EntityBase
    {
        /// <summary>
        /// ID da entidade - null apenas antes da persistência no banco
        /// </summary>
        public int? Id { get; protected set; } = null;

        /// <summary>
        /// Data de criação da entidade
        /// </summary>
        public DateTime CreatedAt { get; protected set; }

        /// <summary>
        /// Data da última atualização
        /// </summary>
        public DateTime? UpdatedAt { get; protected set; }

        /// <summary>
        /// Indica se a entidade está ativa (soft delete)
        /// </summary>
        public bool IsActive { get; protected set; } = true;

        protected EntityBase()
        {
            CreatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Marca a entidade como atualizada
        /// </summary>
        protected void UpdateTimestamp()
        {
            UpdatedAt = DateTime.UtcNow;
        }

        /// <summary>
        /// Desativa a entidade (soft delete)
        /// </summary>
        public void Deactivate()
        {
            IsActive = false;
            UpdateTimestamp();
        }

        /// <summary>
        /// Ativa a entidade
        /// </summary>
        public void Activate()
        {
            IsActive = true;
            UpdateTimestamp();
        }

        /// <summary>
        /// Indica se a entidade foi persistida no banco
        /// </summary>
        public bool IsPersisted => Id.HasValue;

        // Override Equals e GetHashCode para comparação por ID
        public override bool Equals(object? obj)
        {
            if (obj is not EntityBase other)
                return false;

            if (ReferenceEquals(this, other))
                return true;

            if (GetType() != other.GetType())
                return false;

            if (!Id.HasValue || !other.Id.HasValue)
                return false;

            return Id == other.Id;
        }

        public override int GetHashCode()
        {
            return Id.HasValue ? (GetType().ToString() + Id).GetHashCode() : base.GetHashCode();
        }

        public static bool operator ==(EntityBase? left, EntityBase? right)
        {
            if (left is null && right is null)
                return true;

            if (left is null || right is null)
                return false;

            return left.Equals(right);
        }

        public static bool operator !=(EntityBase? left, EntityBase? right)
        {
            return !(left == right);
        }
    }
}