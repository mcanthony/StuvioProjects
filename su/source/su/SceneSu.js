// SceneSu.js

(function() {
	//	Imports
	var GL = bongiovi.GL;
	var gl = GL.gl;
	var GLTexture = bongiovi.GLTexture;
	var ViewCopy = bongiovi.ViewCopy;

	SceneSu = function() {
		bongiovi.Scene.call(this);
		// this.camera.setPerspective(45*Math.PI/180, GL.aspectRatio, 5, 3000);

		window.params = {
			constellationIndex:-1,
			cameraRadius:500
		};

		// this._initGUI();
		this.sceneRotation.rotateMargin = 200;
		this.sceneRotation.inverseControl(true);
		this._invert = false;

		this.cameraPositions = SuModel.cameraPositions;
		window.addEventListener("keydown", this._onSave.bind(this));
		GL.canvas.addEventListener("mousedown", this._onMouseDown.bind(this));

		params.constellationIndex = 0;
		this._onConstellationChange();
	}

	var p = SceneSu.prototype = new bongiovi.Scene();
	var s = bongiovi.Scene.prototype;

	p._initGUI = function() {
		this._gui = new dat.GUI({width:300});
		
		var that = this;
		this._gui.add(params, "constellationIndex", 0, 88).listen().onChange(function() {
			that._onConstellationChange();
		});
	};


	p.refresh = function(mSettings) {
		if(params.constellationIndex != mSettings.constellationIndex.value -1) {
			params.constellationIndex = mSettings.constellationIndex.value -1;
			this._onConstellationChange();
		}

		this._invert = mSettings.invertColor.value;

		if(this._fbo) {
			if(GL.width != this._fbo.width || GL.height != this._fbo.height) {
				this._fbo = new bongiovi.FrameBuffer(GL.width, GL.height);
				this._passInvert = new bongiovi.Pass("assets/shaders/invert.frag", GL.width, GL.height);
			}
		}
	};


	p._onConstellationChange = function() {
		var path = Sutils.getDrawingPath(params.constellationIndex);

		var cameraPos = this.cameraPositions[params.constellationIndex];
		if(cameraPos) {
			this.sceneRotation.setCameraPos(cameraPos.quat);
			this.camera.radius.value = cameraPos.z;
		}

		var that = this;

		if(path != '') {
			var img = new Image();
			img.addEventListener('load', this._onImageLoaded.bind(this));
			img.src = path;
			this._vCircleBg.targetAlpha = 1;
			this._vDrawings.tweenAlpha(0, 0);
		} else {
			console.log("Image doesn't exist : ", Sutils.getConstellatinDetail(params.constellationIndex));
			this._vDrawings.targetAlpha = 0;
			this._vCircleBg.targetAlpha = 0;
		}

		var oDetail = Sutils.getConstellatinDetail(params.constellationIndex);
		if(!oDetail) return;
		var imgDesc = new Image();
		imgDesc.addEventListener('load', this._onDescImageLoaded.bind(this));
		imgDesc.src = "assets/images/copy/" + oDetail.abb + ".png";
		this._vDesc.tweenAlpha(0, 0);

		this._vCopyMilkyway.targetAlpha = 0;
		this._vCopyEliptic.targetAlpha = 0;
	};


	p._onImageLoaded = function(e) {
		if(this._textDrawing == undefined) {
			this._textDrawing = new GLTexture(e.target);
		} else {
			this._textDrawing.updateTexture(e.target);
		}

		this._vDrawings.tweenAlpha(0, 1);
	};


	p._onDescImageLoaded = function(e) {
		if(this._textDesc == undefined) {
			this._textDesc = new GLTexture(e.target);
		} else {
			this._textDesc.updateTexture(e.target);
		}

		this._vDesc.tweenAlpha(0, 1);
	};


	p._initTextures = function() {
		gl = GL.gl;
		this._textBG = new GLTexture(SuModel.images.bg);
		this._textStar = new GLTexture(SuModel.images.starLine);
		this._textCircleBg = new GLTexture(SuModel.images.ConstellationCircle);
		this._textMilkyCopy = new GLTexture(SuModel.images.milkyWayCopy);

		this._fbo = new bongiovi.FrameBuffer(GL.width, GL.height);
	};


	p._initViews = function() {
		this._vCopy = new ViewCopy();
		this._vStars = new ViewStars();
		this._vLines = new ViewLines();
		this._vStarmap = new ViewStarmap();
		this._vMilkyway = new ViewMilkyWays();
		this._vEcliptic = new ViewMilkyWays(true)
		this._vCircleBg = new ViewDrawings([0, .0, 0], 1.03);
		this._vDrawings = new ViewDrawings([0, 0, 0], 1.25);
		this._vDesc = new ViewDrawings([0, -.68, 0], 1.0, .25);
		this._vGlobeLines = new ViewGlobeLines();
		this._vBlack = new ViewCopy(null, "assets/shaders/black.frag");
		this._vCopyMilkyway = new ViewMilkyWayCopy();
		this._vCopyEliptic = new ViewMilkyWayCopy(true);

		this._effectComposer = new bongiovi.EffectComposer();
		this._passInvert = new bongiovi.Pass("assets/shaders/invert.frag", GL.width, GL.height);
		this._effectComposer.addPass(this._passInvert);
	};


	p.render = function() {
		params.cameraRadius = this.camera.radius.value;
		if(this._invert) {
			this.renderInvert();
			return;
		}

		gl.lineWidth(1.5);

		gl.disable(gl.DEPTH_TEST);
		GL.setMatrices(this.cameraOtho);
		GL.rotate(this.rotationFront);
		this._vCopy.render(this._textBG);


		GL.setMatrices(this.camera);
		GL.rotate(this.sceneRotation.matrix);
		this._vGlobeLines.render();
		this._vMilkyway.render();
		this._vEcliptic.render();
		this._vCopyMilkyway.render(this._textMilkyCopy);
		this._vCopyEliptic.render(this._textMilkyCopy);
//*		
		this._vStars.render(this._textStar);
		this._vLines.render();
		// gl.disable(gl.DEPTH_TEST);
		GL.setMatrices(this.cameraOtho);
		GL.rotate(this.rotationFront);
		
		if(this._textDrawing) {
			this._vCircleBg.render(this._textCircleBg);
			GL.enableAdditiveBlending();
			this._vBlack.render(this._textCircleBg);
			GL.enableAlphaBlending();
			this._vDrawings.render(this._textDrawing);	
		}

		if(this._textDesc) {
			this._vDesc.render(this._textDesc);
		}

//*/

	}

	p.renderInvert = function() {
		gl.lineWidth(1.5);

		this._fbo.bind();
		GL.clear(0, 0, 0, 0);
		gl.disable(gl.DEPTH_TEST);
		GL.setMatrices(this.cameraOtho);
		GL.rotate(this.rotationFront);
		this._vCopy.render(this._textBG);


		GL.setMatrices(this.camera);
		GL.rotate(this.sceneRotation.matrix);
		this._vGlobeLines.render();
		this._vMilkyway.render();
		this._vEcliptic.render();
		this._vCopyMilkyway.render(this._textMilkyCopy);
		this._vCopyEliptic.render(this._textMilkyCopy);
//*		
		this._vStars.render(this._textStar);
		this._vLines.render();
		gl.disable(gl.DEPTH_TEST);
		GL.setMatrices(this.cameraOtho);
		GL.rotate(this.rotationFront);
		
		if(this._textDrawing) {
			GL.enableAdditiveBlending();
			this._vDrawings.render(this._textDrawing);	
			GL.enableAlphaBlending();
			// this._vCircleBg.render(this._textCircleBg);
			
			// this._vBlack.render(this._textCircleBg);
			
		}

		if(this._textDesc) {
			this._vDesc.render(this._textDesc);
		}


		this._fbo.unbind();

		GL.setMatrices(this.cameraOtho);
		GL.rotate(this.rotationFront);
		this._effectComposer.render(this._fbo.getTexture() );
		this._vCopy.render(this._effectComposer.getTexture());
	};

	p._onMouseDown = function(e) {
		params.constellationIndex = -1;
		if(this._vDrawings) this._vDrawings.targetAlpha = 0;
		if(this._vDesc) this._vDesc.targetAlpha = 0;
		if(this._vCircleBg) this._vCircleBg.targetAlpha = 0;
		this._vCopyMilkyway.targetAlpha = 1;
		this._vCopyEliptic.targetAlpha = 1;
	};

	p._onSave = function(e) {
		if(e.keyCode == 83) {
			var dt = GL.canvas.toDataURL('image/jpeg');
			var img = new Image();
			img.src = dt;
			document.body.appendChild(img);
			img.style.position = 'absolute';
		} else if(e.keyCode == 84) {
			var cameraPos = SuModel.cameraPositions[75].quaternion;
			var _quat = Sutils.getQuatRotation(cameraPos);
			this.sceneRotation.setCameraPos(_quat);
		} else if(e.keyCode == 39) {
			params.constellationIndex++;
			this._onConstellationChange();
		} else if(e.keyCode == 37) {
			params.constellationIndex--;
			if(params.constellationIndex < 0) params.constellationIndex = 0;
			this._onConstellationChange();
		} else if(e.keyCode == 80) {
			this.cameraPositions[params.constellationIndex] = {
				z:this.camera.position[2], 
				quat:[	getFloat(this.sceneRotation.tempRotation[0]), 
						getFloat(this.sceneRotation.tempRotation[1]), 
						getFloat(this.sceneRotation.tempRotation[2]), 
						getFloat(this.sceneRotation.tempRotation[3])
						] };
			console.log("Saving : ", this.cameraPositions[params.constellationIndex]);
		} else if(e.keyCode == 87) {
			saveJson(this.cameraPositions);
		}
	};


	var getFloat = function(value, precision) {
		precision = precision || 4;
		var p = Math.pow(10, precision);

		return Math.floor(value * p) / p;
	}


	var saveJson = function(obj) {
		var str = JSON.stringify(obj);
		var data = encode( str );

		var blob = new Blob( [ data ], {
			type: 'application/octet-stream'
		});
		
		url = URL.createObjectURL( blob );
		var link = document.createElement( 'a' );
		link.setAttribute( 'href', url );
		link.setAttribute( 'download', 'cameraPosition.json' );
		var event = document.createEvent( 'MouseEvents' );
		event.initMouseEvent( 'click', true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
		link.dispatchEvent( event );
	}


	var encode = function( s ) {
		var out = [];
		for ( var i = 0; i < s.length; i++ ) {
			out[i] = s.charCodeAt(i);
		}
		return new Uint8Array( out );
	}
})();