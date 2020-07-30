import { GLTFLoader } from '../three/examples/jsm/loaders/GLTFLoader.js';

import { OBJLoader } from '../three/examples/jsm/loaders/OBJLoader.js';

var loader = new OBJLoader();

loader.load(
    // resource URL
    '../models/audi-r8-red-obj/audi-r8-red.obj',
    
    // onLoad callback
    function ( gltf ) {
        scene.add( gltf.scene );
    },
    
    undefined,
    
    function ( error ) {
        console.error( error );
    }
);