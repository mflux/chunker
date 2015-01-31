var init = function(){
  var renderWidth = window.innerWidth;
  var renderHeight = window.innerHeight;

  var renderer = new THREE.WebGLRenderer(
    {
      antialias: false,
    }
  );
  renderer.setClearColor( 0x444444, 1 );
  renderer.setSize( renderWidth, renderHeight );
  renderer.shadowMapEnabled = true;
  renderer.shadowMapType = THREE.PCFSoftShadowMap;
  renderer.shadowMapDarkness = 0.5;

  document.body.appendChild( renderer.domElement );

  var camera = new THREE.PerspectiveCamera( 45, renderWidth/renderHeight, 1, 4000 );
  camera.position.set( 700, 700, 700 );
  camera.lookAt( new THREE.Vector3() );

  var scene = new THREE.Scene();
  scene.add( camera );

  // cubeCamera = new THREE.CubeCamera( 1, 4000, 512 );
  // cubeCamera.renderTarget.minFilter = THREE.LinearMipMapLinearFilter;
  // scene.add( cubeCamera );

  var container = new THREE.Object3D();
  container.rotation.x = 90 * Math.PI / 180;
  scene.add( container );


  var depthMaterial, depthTarget, composer;

  function setupEffects(){
    var depthShader = THREE.ShaderLib[ "depthRGBA" ];
    var depthUniforms = THREE.UniformsUtils.clone( depthShader.uniforms );

    depthMaterial = new THREE.ShaderMaterial( { fragmentShader: depthShader.fragmentShader, vertexShader: depthShader.vertexShader, uniforms: depthUniforms } );
    depthMaterial.blending = THREE.NoBlending;

    composer = new THREE.EffectComposer( renderer );
    composer.setSize( window.innerWidth, window.innerHeight );

    depthTarget = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      antialias: true
    });

    var ssao = new THREE.ShaderPass( THREE.SSAOShader );
    ssao.uniforms[ 'tDepth' ].value = depthTarget;
    ssao.uniforms[ 'size' ].value.set( window.innerWidth, window.innerHeight );
    ssao.uniforms[ 'cameraNear' ].value = camera.near;
    ssao.uniforms[ 'cameraFar' ].value = camera.far * 0.8;
    ssao.uniforms[ 'aoClamp' ].value = 0.3;
    ssao.uniforms[ 'lumInfluence' ].value = 0.1;

    var fxaa = new THREE.ShaderPass( THREE.FXAAShader );
    fxaa.uniforms[ 'resolution' ].value = new THREE.Vector2( 1/window.innerWidth, 1/window.innerHeight );

    var effectBloom = new THREE.BloomPass( 1.3 );

    var bokeh = new THREE.BokehPass( scene, camera, {
      focus : 1.0,
      aperture : 0.005,
      maxblur : 0.4
    });
    bokeh.needsSwap = true;

    var renderPass = new THREE.RenderPass( scene, camera );

    var effectCopy = new THREE.ShaderPass( THREE.CopyShader );
    effectCopy.renderToScreen = true;

    composer.addPass( renderPass );
    composer.addPass( ssao );
    composer.addPass( bokeh );
    composer.addPass( fxaa );
    // composer.addPass( effectBloom );
    composer.addPass( effectCopy );
  }

  var controls = new THREE.OrbitControls( camera, renderer.domElement );
  controls.center.set( 0, 0, 0 );
  controls.userPanSpeed = 0.3;

  setupEffects();

  createDirectionalLights( scene );


  var loader = new THREE.OBJLoader();
  loader.load( 'assets/T-rex.obj', function ( object ) {

    object.traverse( function ( child ) {
      if ( child instanceof THREE.Mesh ) {
        child.material = new THREE.MeshPhongMaterial({
          color: 0xff0000,
          emissive: 0x555555,
          shading: THREE.FlatShading,
        });
        child.geometry.computeVertexNormals();

        child.castShadow = true;
        child.receiveShadow = true;

        console.log( child );
      }
    });

    // object.scale.setLength( 300.0 );

    object.scale.setLength( 6.0 );
    object.position.y = 1100;

    object.rotation.x = -Math.PI / 2;
    container.add( object );
  });

  container.add( makeCubes() );


  var planeGeo = new THREE.PlaneGeometry( 4000, 4000, 1, 1 );
  var planeMat = new THREE.MeshPhongMaterial({
    color: 0xeeeeee
  });
  var plane = new THREE.Mesh( planeGeo, planeMat );
  plane.receiveShadow = true;
  plane.rotation.x = Math.PI;
  plane.position.z = 0;
  container.add( plane );

  (function mainLoop()
  {
    scene.traverse( function( obj ){
      if( obj.update ){
        obj.update();
      }
    });

    controls.update();

    // renderer.clear( false, true, false );
    // cubeCamera.updateCubeMap( renderer, scene );

    scene.overrideMaterial = depthMaterial;
    renderer.render( scene, camera, depthTarget );
    scene.overrideMaterial = null;
    composer.render( 0.05 );

    requestAnimationFrame( mainLoop );
  })();
}

var createDirectionalLights = function( scene ){
  var target = new THREE.Object3D();
  target.position.set( 0, 300, 0 );
  var light1 = new THREE.SpotLight ( 0xdddacc, 1.3, 0 );
  light1.position.x = 1600;
  light1.position.y = 1600;
  light1.position.z = 3800;
  light1.castShadow = true;
  light1.shadowDarkness = 0.5;
  light1.shadowCameraNear = 3000;
  light1.shadowCameraFar = 7000;
  light1.shadowCameraFov = 16;
  light1.shadowBias = 0.0001;
  light1.shadowDarkness = 0.2;
  light1.shadowMapWidth = 4096;
  light1.shadowMapHeight = 4096;
  // light1.shadowCameraVisible  = true;
  light1.target = target;
  scene.add( light1 );
  scene.add( target);

  var light2 = new THREE.PointLight( 0x4477bb, .8, 0 );
  light2.position.x = 400;
  light2.position.y = 1700;
  light2.position.z = 5000;
  scene.add( light2 );

  var light3 = new THREE.PointLight( 0x4477bb, .8, 0 );
  light2.position.x = 400;
  light2.position.y = -1700;
  light2.position.z = -5000;
  scene.add( light2 );

  var hemiLight = new THREE.HemisphereLight( 0xaaaaaa, 0x333333, .5 );
  hemiLight.color.setRGB( .62, .6, .5 );
  hemiLight.groundColor.setHSL( 0.095, .7, 0.05 );
  hemiLight.position.set( 0, 500, 500 );
  scene.add( hemiLight );

  return {
    light1: light1,
    light2: light2,
    hemi: hemiLight
  }
}

function makeCubes(){
  var cubeContainer = new THREE.Object3D();
  cubeContainer.position.z = -300;

  var geo = new THREE.BoxGeometry( 50, 50, 50, 1, 1, 1);
  var mat = new THREE.MeshPhongMaterial({
    color: 0xbbbbbb,
    // envMap: cubeCamera.renderTarget,
    // reflectivity: 1.0,
    // emissive: 0xffffff,
  });
  var mesh = new THREE.Mesh( geo, mat );
  mesh.castShadow = true;
  mesh.receievShadow = true;

  var spread = 400;
  for( var i=0; i<200; i++ ){
    var m = mesh.clone();
    m.material = mat.clone();

    m.material.color.setHSL( 0, 0, Math.random() );
    m.material.emissive.setHex( 0x121214 );

    m.position.set(
      -spread + Math.random() * spread * 2,
      -spread + Math.random() * spread * 2,
      -spread + Math.random() * spread * 2
    );

    m.rotation.set(
      Math.PI * 2 * Math.random(),
      Math.PI * 2 * Math.random(),
      Math.PI * 2 * Math.random()
    );

    var s = Math.random() * 2;
    m.scale.set(
      s, s, s
    );

    m.castShadow = true;
    m.receiveShadow = true;

    m.rx = ( -0.5 + Math.random() ) * 0.01;
    m.ry = ( -0.5 + Math.random() ) * 0.01;
    m.rz = ( -0.5 + Math.random() ) * 0.01;
    // m.update = function(){
    //   this.rotation.x += this.rx;
    //   this.rotation.y += this.ry;
    //   this.rotation.z += this.rz;
    // }


    cubeContainer.add( m );
  }

  return cubeContainer;
}