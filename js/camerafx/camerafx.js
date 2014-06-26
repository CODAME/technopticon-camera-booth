var WIDTH = 200;
var HEIGHT = 150;

var camera, scene, renderer;
var video, videoTexture;
var composer;
var shaderTime = 0;
var badTVPass;	
var rgbPass;

var shaders = {
    vertex: '',
    badtv: '',
    rgbshift: ''
};

function CameraFX(_video){
	video = _video;
	video.autoplay = true;
	video.loop = true;
	
	loadShaders(function(){
		init();
		animate();
	});
}

// Populates shader object with loaded GLSL code
function loadShaders( callback ) {

    var queue = 0;

    function loadHandler( name, req ) {

        return function() {
            shaders[ name ] = req.responseText;
            if ( --queue <= 0 ) callback();
        };
    }

    for ( var name in shaders ) {

        queue++;

        var req = new XMLHttpRequest();
        req.onload = loadHandler( name, req );
        req.open( 'get', 'js/camerafx/glsl/' + name + '.glsl', true );
        req.send();
    }
}

function init() {

	var uniforms = {
		"tDiffuse": { type: "t", value: null },
		"uTime":     { type: "f", value: 0.0 }
	}

	camera = new THREE.Camera();
	scene = new THREE.Scene();
	renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
	renderer.domElement.id = "webgl-canvas";
	renderer.setSize(WIDTH, HEIGHT);
	document.getElementById('video-container').appendChild( renderer.domElement );

	//init video texture
	videoTexture = new THREE.Texture( video );
	videoTexture.minFilter = THREE.LinearFilter;
	videoTexture.magFilter = THREE.LinearFilter;
	var videoMaterial = new THREE.MeshBasicMaterial( { map: videoTexture } );

	//Add video plane
	var planeGeometry = new THREE.PlaneGeometry( 2, 2, 0 );
	var plane = new THREE.Mesh( planeGeometry, videoMaterial );
	scene.add( plane );

	//POST PROCESSING
	//Create Shader Passes
	badTVPass     = new THREE.ShaderPass( { uniforms: uniforms,  vertexShader: shaders.vertex, fragmentShader: shaders.badtv } );
	rgbPass       = new THREE.ShaderPass( { uniforms: uniforms , vertexShader: shaders.vertex, fragmentShader: shaders.rgbshift } );

	//Add Shader Passes to Composer
	//order is important 
	composer = new THREE.EffectComposer( renderer );
	composer.addPass( new THREE.RenderPass( scene, camera ) );
	composer.addPass( badTVPass );
	composer.addPass( rgbPass );
	rgbPass.renderToScreen = true;

	window.addEventListener('resize', onResize, false);
	onResize();
}

function animate() {

	shaderTime += 0.1;
	badTVPass.uniforms['uTime'].value =  shaderTime;
	rgbPass.uniforms['uTime'].value   =  shaderTime;

	if ( video.readyState === video.HAVE_ENOUGH_DATA ) {
		if ( videoTexture ) videoTexture.needsUpdate = true;
	}

	requestAnimationFrame( animate );
	composer.render( 0.1 );
}

function onResize() {
	//renderer.setSize(window.innerWidth, window.innerHeight);
	document.getElementById('webgl-canvas').style.width = window.innerWidth+'px';
	document.getElementById('webgl-canvas').style.height = window.innerHeight+'px';
}