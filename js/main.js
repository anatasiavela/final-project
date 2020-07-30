import * as THREE from '../three/src/Three.js';

import { GLTFLoader } from '../three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from '../three/examples/jsm/loaders/DRACOLoader.js';


var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

var geometry = new THREE.BoxGeometry();
var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
var cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

var animate = function () {
	requestAnimationFrame( animate );

	cube.rotation.x += 0.01;
	cube.rotation.y += 0.01;

	renderer.render( scene, camera );
};

animate();


var loader = new GLTFLoader();

var dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( '../three/examples/js/libs/draco/' );
loader.setDRACOLoader( dracoLoader );

loader.load(
    // resource URL
	'../three/examples/models/gltf/ferrari.glb',
	
    // onLoad callback
    function ( gltf ) {
        scene.add( gltf.scene );
    },
    
    function ( xhr ) {
		console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
	},
    
    function ( error ) {
        console.error( error );
    }
);


renderer.render( scene, camera );