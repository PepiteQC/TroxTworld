/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  ETHERWORLD — src/server/db/TroxTParameter.cs                ║
 * ║  TroxT ADO.NET Parameter & Collection (Ultimate Edition)     ║
 * ║  Portneuf, Québec 🍁 · fr-CA · TroxTetherworld v7.0 Enterprise ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

using System;
using System.Collections;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;

namespace TroxT.Engine.Client;

#pragma warning disable CS8765

/// <summary>
/// Implémentation ADO.NET DbParameter haute performance pour le moteur TroxTetherworld.
/// Gère l'inférence automatique de type (compatible Dapper/EF Core) et le nettoyage des préfixes de paramètres.
/// </summary>
public class TroxTParameter : DbParameter
{
    private DbType _dbType = DbType.Object;
    private bool _dbTypeSet;
    private object? _value;
    private string _parameterName = string.Empty;

    /// <summary>Type de données du paramètre SQL</summary>
    public override DbType DbType
    {
        get => _dbType;
        set
        {
            _dbType = value;
            _dbTypeSet = true;
        }
    }

    public override ParameterDirection Direction { get; set; } = ParameterDirection.Input;

    public override bool IsNullable { get; set; }

    /// <summary>Nom du paramètre (Nettoie automatiquement les préfixes @, : ou ?)</summary>
    public override string ParameterName
    {
        get => _parameterName;
        set => _parameterName = CleanParameterName(value);
    }

    public override int Size { get; set; }

    public override string SourceColumn { get; set; } = string.Empty;

    public override bool SourceColumnNullMapping { get; set; }

    /// <summary>Valeur du paramètre (Déduit automatiquement le DbType si non explicitement défini)</summary>
    public override object? Value
    {
        get => _value;
        set
        {
            _value = value;
            if (!_dbTypeSet && value != null && value != DBNull.Value)
            {
                _dbType = InferDbType(value);
            }
        }
    }

    public override DataRowVersion SourceVersion { get; set; }

    public override void ResetDbType()
    {
        _dbType = DbType.Object;
        _dbTypeSet = false;
    }

    #region Helpers Internes

    /// <summary>Nettoie les préfixes de symboles pour une compatibilité parfaite avec Dapper et EF Core</summary>
    internal static string CleanParameterName(string? name)
    {
        if (string.IsNullOrEmpty(name)) return string.Empty;
        return name.StartsWith('@') || name.StartsWith('?') || name.StartsWith(':')
            ? name[1..]
            : name;
    }

    /// <summary>Déduction automatique du DbType pour accélérer le mapping réseau</summary>
    private static DbType InferDbType(object value) => value switch
    {
        string => DbType.String,
        int => DbType.Int32,
        long => DbType.Int64,
        bool => DbType.Boolean,
        DateTime => DbType.DateTime,
        DateTimeOffset => DbType.DateTimeOffset,
        TimeSpan => DbType.Time,
        decimal => DbType.Decimal,
        double => DbType.Double,
        float => DbType.Single,
        Guid => DbType.Guid,
        byte[] => DbType.Binary,
        short => DbType.Int16,
        byte => DbType.Byte,
        _ => DbType.Object
    };

    #endregion
}

/// <summary>
/// Collection de paramètres ADO.NET optimisée pour TroxT, avec recherche insensible à la casse et aux préfixes.
/// </summary>
public class TroxTParameterCollection : DbParameterCollection
{
    private readonly List<TroxTParameter> _parameters = [];

    public override int Count => _parameters.Count;
    public override object SyncRoot { get; } = new object();
    public override bool IsFixedSize => false;
    public override bool IsReadOnly => false;
    public override bool IsSynchronized => false;

    public override int Add(object value)
    {
        ArgumentNullException.ThrowIfNull(value);
        _parameters.Add((TroxTParameter)value);
        return _parameters.Count - 1;
    }

    public override void AddRange(Array values)
    {
        ArgumentNullException.ThrowIfNull(values);
        foreach (var p in values)
        {
            if (p is TroxTParameter param)
            {
                _parameters.Add(param);
            }
        }
    }

    public override void Clear() => _parameters.Clear();

    public override bool Contains(object value) => value is TroxTParameter p && _parameters.Contains(p);

    public override bool Contains(string value) => IndexOf(value) >= 0;

    public override void CopyTo(Array array, int index) => ((ICollection)_parameters).CopyTo(array, index);

    public override IEnumerator GetEnumerator() => _parameters.GetEnumerator();

    public override int IndexOf(object value) => value is TroxTParameter p ? _parameters.IndexOf(p) : -1;

    /// <summary>Recherche robuste ignorant la casse et les symboles de préfixe ORM</summary>
    public override int IndexOf(string parameterName)
    {
        var target = TroxTParameter.CleanParameterName(parameterName);
        for (var i = 0; i < _parameters.Count; i++)
        {
            if (string.Equals(_parameters[i].ParameterName, target, StringComparison.OrdinalIgnoreCase))
                return i;
        }
        return -1;
    }

    public override void Insert(int index, object value)
    {
        ArgumentNullException.ThrowIfNull(value);
        _parameters.Insert(index, (TroxTParameter)value);
    }

    public override void Remove(object value)
    {
        if (value is TroxTParameter p)
        {
            _parameters.Remove(p);
        }
    }

    public override void RemoveAt(int index) => _parameters.RemoveAt(index);

    public override void RemoveAt(string parameterName)
    {
        var index = IndexOf(parameterName);
        if (index >= 0) _parameters.RemoveAt(index);
    }

    protected override DbParameter GetParameter(int index) => _parameters[index];

    protected override DbParameter GetParameter(string parameterName)
    {
        var index = IndexOf(parameterName);
        // 🔥 CONFORMITÉ ADO.NET : Lève IndexOutOfRangeException si le paramètre est introuvable
        if (index < 0) throw new IndexOutOfRangeException($"[TroxTParameterCollection] ❌ Paramètre '{parameterName}' introuvable.");
        return _parameters[index];
    }

    protected override void SetParameter(int index, DbParameter value)
    {
        ArgumentNullException.ThrowIfNull(value);
        _parameters[index] = (TroxTParameter)value;
    }

    protected override void SetParameter(string parameterName, DbParameter value)
    {
        ArgumentNullException.ThrowIfNull(value);
        var index = IndexOf(parameterName);
        if (index < 0) throw new IndexOutOfRangeException($"[TroxTParameterCollection] ❌ Paramètre '{parameterName}' introuvable.");
        _parameters[index] = (TroxTParameter)value;
    }
}