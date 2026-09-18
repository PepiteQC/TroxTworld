// ============================================================
//  public/loaders/AnimationLoader.js
// ============================================================
import * as THREE from 'three';

class AnimationLoader extends THREE.Loader {
  constructor( manager ) {
    super( manager );
  }

  load( url, onLoad, onProgress, onError ) {
    const scope = this;
    const loader = new THREE.FileLoader( this.manager );
    loader.setPath( this.path );
    loader.setRequestHeader( this.requestHeader );
    loader.setWithCredentials( this.withCredentials );
    loader.load( url, function ( text ) {
      try {
        onLoad( scope.parse( JSON.parse( text ) ) );
      } catch ( e ) {
        if ( onError ) {
          onError( e );
        } else {
          console.error( e );
        }
        scope.manager.itemError( url );
      }
    }, onProgress, onError );
  }

  parse( json ) {
    const animations = [];
    for ( let i = 0; i < json.length; i ++ ) {
      const clip = THREE.AnimationClip.parse( json[ i ] );
      animations.push( clip );
    }
    return animations;
  }
}

export { AnimationLoader };
export default AnimationLoader;
