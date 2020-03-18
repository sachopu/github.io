var model;
var clock = new THREE.Clock();
var mixers = [];
var objPositions;

function isMobile() {
    return /Android|mobile|iPad|iPhone/i.test(navigator.userAgent);
}

var interpolationFactor = 3;

var trackedMatrix = {
    // for interpolation
    delta: [
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ],
    interpolated: [
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0,
        0, 0, 0, 0
    ]
}

var markers = {
    pinball: {
        width: 1250,
        height: 1667,
        dpi: 150,
        url: "../DataNFT/mark2"
    }
};

var setMatrix = function (matrix, value) {
    var array = [];
    for (var key in value) {
        array[key] = value[key];
    }
    if (typeof matrix.elements.set === "function") {
        matrix.elements.set(array);
    } else {
        matrix.elements = [].slice.call(array);
    }
};

function start( container, marker, video, input_width, input_height, canvas_draw, render_update, track_update) {
    var vw, vh;
    var sw, sh;
    var pscale, sscale;
    var w, h;
    var pw, ph;
    var ox, oy;
    var worker;
    var camera_para = "../Data/camera_para-iPhone 5 rear 640x480 1.0m.dat";

    var canvas_process = document.createElement("canvas");
    var context_process = canvas_process.getContext("2d");

    // var context_draw = canvas_draw.getContext('2d');
    var renderer = new THREE.WebGLRenderer({
        canvas: canvas_draw,
        alpha: true,
        antialias: true,
        precision: 'mediump'//'lowp'
        
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    //renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.gammaOutput = true;
    //renderer.gammaFactor = 2.2;
    //renderer.shadowMap.enabled = true;
    //renderer.setClearColor(0x000000, 0);
    //renderer.sortObjects = false;
    //renderer.gammaInput =true;
    //renderer.autoClear = false;
    var scene = new THREE.Scene();

    camera = new THREE.Camera();
   
    //var camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 1000);
    
   // camera.position.z = 0;

    scene.add(camera);
    camera.matrixAutoUpdate = false;

    var light = new THREE.AmbientLight(0xffffff);
   scene.add( light );
    
    var directionalLight = new THREE.DirectionalLight( 0x222222, 4 );
					directionalLight.position.set( 0, 0, 2 ).normalize();
					scene.add( directionalLight );
                    
    
    var root = new THREE.Object3D();
   

  /* var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshPhongMaterial({
            transparent: true,
            opacity: 0.0,
           })
    );
    sphere.scale.set(1000,1000,1000);*/
    
    
    var root = new THREE.Group();
    
  


    /* Load Model */
    var threeGLTFLoader = new THREE.GLTFLoader();


     

            threeGLTFLoader.load("./models/test2.glb", function (gltf) {
            model = gltf.scene.children[2];
            //model.name = "test2";
            // gltf.flatShading;
            //model.castShadow = true;
           // model.receiveShadow = true;
            //gltf.frustumCulled = false;
            //THREE.DRACOLoader.releaseDecoderModule();

            model.rotation.x = 0*Math.PI;
            model.rotation.y = 1*Math.PI;
            model.position.z = 0;
            model.position.x = 200;
            model.position.y = 200;
            model.scale.set(40,40,40);
            
     
            var animation = gltf.animations[0];
            var mixer = new THREE.AnimationMixer(model);
            mixers.push(mixer);
            var action = mixer.clipAction(animation);
            action.play();

            root.matrixAutoUpdate = false;
           
            //ここ追加
            //var dimensions = new THREE.Box3().setFromObject(model);
            //    objPositions = {
            //    width: dimensions.max.x - dimensions.min.x,
            //    height: dimensions.max.y - dimensions.min.y
            //};
            root.add(model); 
            scene.add(root);
            
        }
        
    );
    var load = function() {
        vw = input_width;
        vh = input_height;

        pscale = 320 / Math.max(vw, (vh / 3) * 4);
        sscale = isMobile() ? window.outerWidth / input_width : 1;

        sw = vw * sscale;
        sh = vh * sscale;
        video.style.width = sw + "px";
        video.style.height = sh + "px";
        container.style.width = sw + "px";
        container.style.height = sh + "px";
        canvas_draw.style.clientWidth = sw + "px";
        canvas_draw.style.clientHeight = sh + "px";
        canvas_draw.width = sw;
        canvas_draw.height = sh;
        w = vw * pscale;
        h = vh * pscale;
        pw = Math.max(w, (h / 3) * 4);
        ph = Math.max(h, (w / 4) * 3);
        ox = (pw - w) / 2;
        oy = (ph - h) / 2;
        canvas_process.style.clientWidth = pw + "px";
        canvas_process.style.clientHeight = ph + "px";
        canvas_process.width = pw;
        canvas_process.height = ph;

        renderer.setSize(sw, sh);

        worker = new Worker("./js/artoolkit.worker.js");

        worker.postMessage({
            type: "load",
            pw: pw,
            ph: ph,
            camera_para: camera_para,
            marker: marker.url
        });

        worker.onmessage = function(ev) {
            var msg = ev.data;
            switch (msg.type) {
                case "loaded": {
                    var proj = JSON.parse(msg.proj);
                    var ratioW = pw / w;
                    var ratioH = ph / h;
                    proj[0] *= ratioW;
                    proj[4] *= ratioW;
                    proj[8] *= ratioW;
                    proj[12] *= ratioW;
                    proj[1] *= ratioH;
                    proj[5] *= ratioH;
                    proj[9] *= ratioH;
                    proj[13] *= ratioH;
                    setMatrix(camera.projectionMatrix, proj);
                    break;
                }

                case "endLoading": {
                    if (msg.end == true) {
                        // removing loader page if present
                        var loader = document.getElementById('loading');
                        if (loader) {
                            loader.querySelector('.loading-text').innerText = 'Start the tracking!';
                            setTimeout(function(){
                                loader.parentElement.removeChild(loader);
                            }, 2000);
                        }
                    }
                    break;
                }

                case "found": {
                    found(msg);
                    break;
                }
                case "not found": {
                    found(null);
                    break;
                }
            }
          
            process();
        };
    };

    var world;

    var found = function(msg) {
        if (!msg) {
            world = null;
        } else {
            world = JSON.parse(msg.matrixGL_RH);
            msg.width = msg.width/10;
            msg.height = msg.height/10;
            //追加
           if (!window.firstPositioning) {
                window.firstPositioning = true;
                //model.position.y = (msg.width / msg.dpi) * 1000 / objPositions.width;
                //model.position.x = (msg.height / msg.dpi) * 1000 / objPositions.height;
            }
            console.log("NFT width: ", msg.width);
            console.log("NFT height: ", msg.height);
            console.log("NFT dpi: ", msg.dpi);
           // var o_view = scene.getObjectByName('test2');
           // console.log(o_view);

        }
    };
    

    var lasttime = Date.now();
    var time = 0;

    function process() {
        context_process.fillStyle = "black";
        context_process.fillRect(0, 0, pw, ph);
        context_process.drawImage(video, 0, 0, vw, vh, ox, oy, w, h);

        var imageData = context_process.getImageData(0, 0, pw, ph);
        worker.postMessage({ type: "process", imagedata: imageData }, [
            imageData.data.buffer
        ]);
    }

   

    var tick = function() {
        draw();
       // positionsinc();
        requestAnimationFrame(tick);

       if (mixers.length > 0) {
            for (var i = 0; i < mixers.length; i++) {
                mixers[i].update(clock.getDelta());
            }
        }
    };

    var draw = function() {


        if (!world) {
            root.visible = false;
        } else {
            root.visible = true;


            // interpolate matrix
            for (var i = 0; i < 16; i++) {
                trackedMatrix.delta[i] = world[i] - trackedMatrix.interpolated[i];
                trackedMatrix.interpolated[i] =
                    trackedMatrix.interpolated[i] +
                    trackedMatrix.delta[i] / interpolationFactor;
            }

            // set matrix of 'root' by detected 'world' matrix
            setMatrix(root.matrix, trackedMatrix.interpolated);
        }

        renderer.render(scene, camera);
    };

    load();
    tick();
    process();
}
