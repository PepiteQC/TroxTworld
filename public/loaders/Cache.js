// ============================================================
//  public/loaders/Cache.js
//  Système de cache mémoire haute performance (LRU + TTL)
//  TroxT EtherWorld v5.5 🍁 — Compatible Three.js Loaders
// ============================================================

const Cache = {
  enabled: false,
  files: {},
  _meta: new Map(),
  _lruOrder: new Set(),
  config: {
    maxEntries: 350,
    maxMemoryBytes: 512 * 1024 * 1024,
    defaultTTL: 0,
    debug: false,
  },
  stats: {
    hits: 0,
    misses: 0,
    evictions: 0,
    currentMemoryBytes: 0,
  },
  add: function ( key, file, ttl = this.config.defaultTTL ) {
    if ( !this.enabled || file === undefined || file === null ) return;
    if ( isNonCacheableURL( key ) ) return;

    if ( this._meta.has( key ) ) {
      this.stats.currentMemoryBytes -= this._meta.get( key ).size;
      this._lruOrder.delete( key );
    }

    const estimatedSize = estimateObjectSize( file );

    while (
      ( this._lruOrder.size >= this.config.maxEntries ||
      ( this.stats.currentMemoryBytes + estimatedSize > this.config.maxMemoryBytes ) ) &&
      this._lruOrder.size > 0
    ) {
      this._evictOldest();
    }

    const now = Date.now();
    this.files[ key ] = file;
    this._lruOrder.add( key );
    this._meta.set( key, {
      size: estimatedSize,
      lastAccessed: now,
      addedAt: now,
      ttl: ttl || this.config.defaultTTL
    });

    this.stats.currentMemoryBytes += estimatedSize;

    if ( this.config.debug ) {
      console.log(`[Cache] 📥 Ajouté : ${truncateKey(key)} (~${(estimatedSize / 1024).toFixed(1)} Ko)`);
    }
  },
  get: function ( key ) {
    if ( !this.enabled || isNonCacheableURL( key ) ) return undefined;

    const file = this.files[ key ];

    if ( file === undefined ) {
      this.stats.misses++;
      return undefined;
    }

    const meta = this._meta.get( key );
    const now = Date.now();

    if ( meta && meta.ttl > 0 && ( now - meta.addedAt > meta.ttl ) ) {
      if ( this.config.debug ) {
        console.warn(`[Cache] ⏱️ Expiré (TTL) : ${truncateKey(key)}`);
      }
      this.remove( key );
      this.stats.misses++;
      return undefined;
    }

    this._lruOrder.delete( key );
    this._lruOrder.add( key );
    if ( meta ) meta.lastAccessed = now;

    this.stats.hits++;
    return file;
  },
  has: function ( key ) {
    if ( !this.enabled ) return false;
    return this.files.hasOwnProperty( key );
  },
  remove: function ( key ) {
    if ( this._meta.has( key ) ) {
      const meta = this._meta.get( key );
      this.stats.currentMemoryBytes = Math.max( 0, this.stats.currentMemoryBytes - meta.size );
      this._meta.delete( key );
    }

    this._lruOrder.delete( key );

    const item = this.files[ key ];
    if ( item && typeof item.dispose === 'function' ) {
      try { item.dispose(); } catch ( e ) {}
    }

    delete this.files[ key ];
  },
  clear: function () {
    for ( const key in this.files ) {
      const item = this.files[ key ];
      if ( item && typeof item.dispose === 'function' ) {
        try { item.dispose(); } catch ( e ) {}
      }
    }

    this.files = {};
    this._meta.clear();
    this._lruOrder.clear();
    this.stats.currentMemoryBytes = 0;

    if ( this.config.debug ) {
      console.log('[Cache] 🧹 Cache nettoyé complètement.');
    }
  },
  _evictOldest: function () {
    const oldestKey = this._lruOrder.values().next().value;
    if ( !oldestKey ) return;

    if ( this.config.debug ) {
      console.warn(`[Cache] 🗑️ Éviction LRU : ${truncateKey(oldestKey)}`);
    }

    this.remove( oldestKey );
    this.stats.evictions++;
  },
  getReport: function () {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (( this.stats.hits / totalRequests ) * 100).toFixed(1) + '%' : '0%';

    return {
      enabled: this.enabled,
      entriesCount: this._lruOrder.size,
      maxEntries: this.config.maxEntries,
      memoryUsage: ( this.stats.currentMemoryBytes / ( 1024 * 1024 ) ).toFixed(2) + ' Mo',
      maxMemory: ( this.config.maxMemoryBytes / ( 1024 * 1024 ) ).toFixed(0) + ' Mo',
      hitRate: hitRate,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
    };
  }
};

function isNonCacheableURL( key ) {
  if ( typeof key !== 'string' ) return true;
  if ( key.startsWith( 'blob:' ) || key.startsWith( 'data:' ) ) return true;

  try {
    const cleanKey = key.includes( ':' ) ? key.slice( key.indexOf( ':' ) + 1 ) : key;
    if ( cleanKey.startsWith( '//' ) || cleanKey.startsWith( 'http' ) ) {
      const url = new URL( cleanKey, window.location.href );
      return url.protocol === 'blob:' || url.protocol === 'data:';
    }
  } catch {
    return false;
  }

  return false;
}

function estimateObjectSize( obj ) {
  if ( !obj ) return 0;
  if ( typeof obj === 'string' ) return obj.length * 2;
  if ( typeof obj === 'number' ) return 8;
  if ( typeof obj === 'boolean' ) return 4;
  if ( obj instanceof ArrayBuffer ) return obj.byteLength;
  if ( ArrayBuffer.isView( obj ) ) return obj.byteLength;
  if ( typeof Blob !== 'undefined' && obj instanceof Blob ) return obj.size;

  if ( typeof obj === 'object' ) {
    try {
      return Object.keys( obj ).length * 32 + 128;
    } catch {
      return 512;
    }
  }
  return 256;
}

function truncateKey( key ) {
  if ( key.length <= 60 ) return key;
  return key.slice( 0, 25 ) + '...' + key.slice( -30 );
}

export { Cache };
export default Cache;
