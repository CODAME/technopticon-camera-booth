var VIDEO_FPS = 10;
var WIDTH = 200;
var HEIGHT = 150;

var RESOLUTION = 512; //power of 2
var MOUSE = { x: 0, y: 0 };
var CLOCK = new THREE.Clock();
var BUFFER_STATE = 0;
var USE_MIC = false;
var USE_FULL_FPS = true;

window.THRESHOLD = 0.05;
window.SHIFT = 10.0;
window.USE_RGB_SHIFT = true;
window.USE_HUE_SHIFT = true;

var canvas, video, videoTextureCurrent, videoTextureStill, simUniforms, simScene, simBuffer, backBuffer, displayScene, camera, renderer, outQuad;
var mic = null;

var shaders = {
    vertex: '',
    datamosh: ''
};

function CameraFX(_video){
	video = _video;
	video.autoplay = true;
	video.loop = true;
	
	loadShaders(function(){
		init();
		takeStill();
		
		if(USE_FULL_FPS){
			requestAnimationFrame(animate);
		}else{
			animate();
			setInterval(animate, 1000/VIDEO_FPS);
		}


		if(USE_MIC){
			mic = new Microphone();
	  		mic.initialize();

	  		var waitForMic = setInterval(function(){
	  			if(mic.isInitialized()){
	  				clearInterval(waitForMic);
	    			mic.startListening();
	  			}
	  		}, 300);
		}
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

	camera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );
	renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
	canvas = renderer.domElement;
	document.body.appendChild(canvas);
	renderer.autoClear = false;
	renderer.domElement.id = "webgl-canvas";
	renderer.setSize(WIDTH, HEIGHT);
	document.getElementById('video-container').appendChild( renderer.domElement );

	simBuffer =  new THREE.WebGLRenderTarget( RESOLUTION, RESOLUTION, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat } );
	backBuffer = new THREE.WebGLRenderTarget( RESOLUTION, RESOLUTION, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, format: THREE.RGBAFormat } );

	simScene = new THREE.Scene();
	displayScene = new THREE.Scene();

	//init video texture
	videoTextureCurrent = new THREE.Texture( video );
	videoTextureCurrent.minFilter = THREE.LinearFilter;
	videoTextureCurrent.magFilter = THREE.LinearFilter;

	//init video texture
	videoTextureStill = videoTextureCurrent.clone();

	simUniforms = { 
		"currentFrame" : { type: "t",  value: videoTextureCurrent },
		"backbuffer"   : { type: "t",  value: backBuffer },
		"resolution"   : { type: "v2", value: new THREE.Vector2(RESOLUTION, RESOLUTION) },
		"threshold"    : { type: "f", value: window.THRESHOLD },
		"time"         : { type: "f", value: 0 },
		"shift"        : { type: "f", value: window.SHIFT },
		"USE_RGB_SHIFT": { type: "i", value: window.SHIFT },
		"USE_HUE_SHIFT": { type: "i", value: window.SHIFT }
	};

	var simQuad = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), new THREE.ShaderMaterial({ uniforms: simUniforms, vertexShader: shaders.vertex, fragmentShader: shaders.datamosh }) );
	simScene.add(simQuad);
	simScene.add(camera);

	outQuad = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), new THREE.MeshBasicMaterial({ map: simBuffer }) );
	displayScene.add(outQuad);
	displayScene.add(camera);

	window.addEventListener('resize', onResize, false);
	onResize();
}

function animate() {

	if(USE_MIC && mic && mic.isInitialized()){ 
		window.THRESHOLD = (1-(Math.abs(mic.getMaxInputAmplitude())/120))/2;
	}

	simUniforms.threshold.value = window.THRESHOLD;
	simUniforms.shift.value = window.SHIFT;
	simUniforms.USE_RGB_SHIFT.value = window.USE_RGB_SHIFT;
	simUniforms.USE_HUE_SHIFT.value = window.USE_HUE_SHIFT;
	simUniforms.time.value += 1;

	if ( video.readyState === video.HAVE_ENOUGH_DATA ) { if ( videoTextureCurrent ) videoTextureCurrent.needsUpdate = true; }

	if (!BUFFER_STATE) {
		renderer.render(simScene, camera, backBuffer, false);
		simUniforms.backbuffer.value = backBuffer;
		BUFFER_STATE = 1;
	} else {
		renderer.render(simScene, camera, simBuffer, false);
		simUniforms.backbuffer.value = simBuffer;
		BUFFER_STATE = 0;
	}

	renderer.render(displayScene, camera);
	if(USE_FULL_FPS){ requestAnimationFrame(animate); }
}

function takeStill() {
	videoTextureStill.needsUpdate = true;
	simUniforms.backbuffer.value = videoTextureStill;
}

function onResize() {
	//renderer.setSize(window.innerWidth, window.innerHeight);
	document.getElementById('webgl-canvas').style.width = '100%';
	document.getElementById('webgl-canvas').style.height = '100%';
}