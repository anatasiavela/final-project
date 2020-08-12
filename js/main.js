import * as THREE from '/js/three/build/three.module.js';

import Stats from '/js/three/examples/jsm/libs/stats.module.js';

import { OrbitControls } from '/js/three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from '/js/three/examples/jsm/environments/RoomEnvironment.js';

import { GLTFLoader } from '/js/three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from '/js/three/examples/jsm/loaders/DRACOLoader.js';

import { update as update_motion } from './motion.js';

var camera, fakeCamera, scene, renderer;
var stats;

var grid, wheels = [];
var chassis;
var carWhole;
var brakeMaterial;

var controls;

var lastRenderTime = 0;

function init() {

    var container = document.getElementById( 'container' );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setAnimationLoop( render );
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    container.appendChild( renderer.domElement );

    window.addEventListener( 'resize', onWindowResize, false );

    stats = new Stats();
    container.appendChild( stats.dom );

    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 0.1, 100 );
    camera.position.set( 4.25, 1.9, - 4.5 );

    fakeCamera = camera.clone();
    controls = new OrbitControls( fakeCamera, container );
    controls.target.set( 0, 0.5, 0 );
    controls.update();

    var environment = new RoomEnvironment();
    var pmremGenerator = new THREE.PMREMGenerator( renderer );

    scene = new THREE.Scene();
    scene.background = new THREE.Color( 0xeeeeee );
    scene.environment = pmremGenerator.fromScene( environment ).texture;
    scene.fog = new THREE.Fog( 0xeeeeee, 10, 50 );

    grid = new THREE.GridHelper( 1000, 400, 0x000000, 0x000000 );
    grid.material.opacity = 0.2;
    grid.material.depthWrite = false;
    grid.material.transparent = true;
    scene.add( grid );

    // materials

    var bodyMaterial = new THREE.MeshPhysicalMaterial( {
        color: 0xff0000, metalness: 0.6, roughness: 0.4, clearcoat: 0.05, clearcoatRoughness: 0.05
    } );

    var rimsMaterial = new THREE.MeshStandardMaterial( {
        color: 0xffffff, metalness: 1.0, roughness: 0.5
    } );

    var stitchingMaterial = new THREE.MeshStandardMaterial( {
        color: 0xffffff, metalness: 1.0, roughness: 0.5
    } );

    brakeMaterial = new THREE.MeshPhysicalMaterial( {
        color: 0xff0000, roughness: 0.6, transparent:true
    } );

    var glassMaterial = new THREE.MeshPhysicalMaterial( {
        color: 0xffffff, metalness: 0, roughness: 0.1, transmission: 0.9, transparent: true
    } );

    var bodyColorInput = document.getElementById( 'body-color' );
    bodyColorInput.addEventListener( 'input', function () {
        bodyMaterial.color.set( this.value );
    } );

    var rimsColorInput = document.getElementById( 'rims-color' );
    rimsColorInput.addEventListener( 'input', function () {
        rimsMaterial.color.set( this.value );
    } );

    var stitchingColorInput = document.getElementById( 'stitching-color' );
    stitchingColorInput.addEventListener( 'input', function () {
        stitchingMaterial.color.set( this.value );
    } );

    var glassColorInput = document.getElementById( 'glass-color' );
    glassColorInput.addEventListener( 'input', function () {
        glassMaterial.color.set( this.value );
    } );

    // Car

    var shadow = new THREE.TextureLoader().load( '/js/three/examples/models/gltf/ferrari_ao.png' );

    var dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath( '/js/three/examples/js/libs/draco/gltf/' );

    var loader = new GLTFLoader();
    loader.setDRACOLoader( dracoLoader );

    loader.load( '/js/three/examples/models/gltf/ferrari.glb', function ( gltf ) {

        var carModel = gltf.scene.children[ 0 ];
        carWhole = carModel;

        carModel.getObjectByName('brakes').material = brakeMaterial;

        chassis = carModel.getObjectByName( 'body' );
        chassis.material = bodyMaterial;

        carModel.getObjectByName( 'rim_fl' ).material = rimsMaterial;
        carModel.getObjectByName( 'rim_fr' ).material = rimsMaterial;
        carModel.getObjectByName( 'rim_rr' ).material = rimsMaterial;
        carModel.getObjectByName( 'rim_rl' ).material = rimsMaterial;

        carModel.getObjectByName( 'trim' ).material = stitchingMaterial;

        carModel.getObjectByName( 'glass' ).material = glassMaterial;

        wheels.push(
            carModel.getObjectByName( 'wheel_fl' ),
            carModel.getObjectByName( 'wheel_fr' ),
            carModel.getObjectByName( 'wheel_rl' ),
            carModel.getObjectByName( 'wheel_rr' )
        );

        // shadow
        var mesh = new THREE.Mesh(
            new THREE.PlaneBufferGeometry( 0.655 * 4, 1.3 * 4 ),
            new THREE.MeshBasicMaterial( {
                map: shadow, blending: THREE.MultiplyBlending, toneMapped: false, transparent: true
            } )
        );
        mesh.rotation.x = - Math.PI / 2;
        mesh.renderOrder = 2;
        carModel.add( mesh );

        scene.add( carModel );
        carModel.add(camera);
    } );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );
}

function render() {
    var time = performance.now() / 1000;

    camera.copy(fakeCamera);
    renderer.render( scene, camera );
    update_motion(time, lastRenderTime);

    stats.update();

    lastRenderTime = time;
}

init();

export {wheels, grid, chassis, brakeMaterial, carWhole};