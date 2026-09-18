// ============================================================
//  public/loaders/LoadingManager.js
//  Gestionnaire centralisé de chargement, progression et handlers
//  TroxT EtherWorld v5.5 🍁 — Standalone ES Module
// ============================================================

class LoadingManager {
  constructor( onLoad, onProgress, onError ) {
    this.isLoading = false;
    this.itemsLoaded = 0;
    this.itemsTotal = 0;
    this.urlModifier = undefined;
    this.handlers = [];
    this.abortController = new AbortController();

    this.onStart = undefined;
    this.onLoad = onLoad;
    this.onProgress = onProgress;
    this.onError = onError;
  }

  itemStart( url ) {
    this.itemsTotal++;
    if ( this.isLoading === false ) {
      this.isLoading = true;
      if ( this.onStart !== undefined ) {
        this.onStart( url, this.itemsLoaded, this.itemsTotal );
      }
    }
  }

  itemEnd( url ) {
    this.itemsLoaded++;
    if ( this.onProgress !== undefined ) {
      this.onProgress( url, this.itemsLoaded, this.itemsTotal );
    }
    if ( this.itemsLoaded === this.itemsTotal ) {
      this.isLoading = false;
      if ( this.onLoad !== undefined ) {
        this.onLoad();
      }
    }
  }

  itemError( url ) {
    if ( this.onError !== undefined ) {
      this.onError( url );
    }
  }

  resolveURL( url ) {
    if ( this.urlModifier !== undefined ) {
      return this.urlModifier( url );
    }
    return url;
  }

  setURLModifier( transform ) {
    this.urlModifier = transform;
    return this;
  }

  addHandler( regex, loader ) {
    this.handlers.push( { regex, loader } );
    return this;
  }

  removeHandler( regex ) {
    const index = this.handlers.findIndex( entry => entry.regex.source === regex.source );
    if ( index !== -1 ) {
      this.handlers.splice( index, 1 );
    }
    return this;
  }

  getHandler( file ) {
    for ( let i = 0, l = this.handlers.length; i < l; i++ ) {
      const handler = this.handlers[ i ];
      if ( handler.regex.test( file ) ) {
        return handler.loader;
      }
    }
    return null;
  }

  getProgress() {
    if ( this.itemsTotal === 0 ) return 100;
    return Math.round( ( this.itemsLoaded / this.itemsTotal ) * 100 );
  }

  abort() {
    this.abortController.abort();
    this.abortController = new AbortController();
    this.reset();
    return this;
  }

  reset() {
    this.isLoading = false;
    this.itemsLoaded = 0;
    this.itemsTotal = 0;
  }
}

const DefaultLoadingManager = new LoadingManager();

export { DefaultLoadingManager, LoadingManager };
export default LoadingManager;
