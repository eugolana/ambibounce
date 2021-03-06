var App = function(canvasId) {
	this.canvas = document.getElementById(canvasId);
	this.width = this.canvas.width / devicePixelRatio;
	this.height = this.canvas.height / devicePixelRatio;
	this.audioContext = (new window.AudioContext() || new window.webkitAudioContext());
	this.masterGain = this.audioContext.createGain();
	this.masterGain.gain.value = 0.3;
	this.masterGain.connect(this.audioContext.destination);
	this.initialiseScales();
	this.waveType = 'sine';
	this.gravity = 0.075;
	this.tempPoint = undefined;
	this.tempLine = undefined;
	this.snapToScale = false;
	this.selectedScale = this.scales.chromatic;
	this.colorSplash = true;
	this.balls = [];
	this.lines = [];
	this.setupUI();
	this.parseQS();
	this.initShareLink();
	this.linkVisible = false;
	this.setSaveQS();
};

App.prototype.initShareLink = function() {
	var div = document.createElement('div');
	div.id = 'popup';
	var p = document.createElement('p');
	p.innerText = _this.qs;
	div.appendChild(p);
	document.body.appendChild(div);
	this.linkElement = div;
}

App.prototype.gravityShift = function(amount) {
	if (this.gravity == 0) {
		this.tempGravity *= amount;
	} else {
		this.gravity *= amount;
	}
};

App.prototype.initLines = function(lines){
	for (var i = 0; i < lines.length; i++) {
		var p1 = new Point(lines[i][0][0], lines[i][0][1]);
		var p2 = new Point(lines[i][1][0], lines[i][1][1]);
		var line = new Line(p1, p2, this);
		line.getSoundOut().connect(this.masterGain);
		line.rest();
		this.lines.push(line);
	}
};

App.prototype.initBalls = function(balls){
	for (var i = 0; i < balls.length; i++) {
		this.balls.push(new Ball(new Point(parseFloat(balls[i][0]), parseFloat(balls[i][1])), 10, 10, this));
	}
};

App.prototype.setupUI = function(){
	this.pre_bgrnd = new Path.Rectangle(new Rectangle(new Point(0,0), new Point(this.width, this.height)));
	this.pre_bgrnd.fillColor = 'black';
	this.bgrnd = new Path.Rectangle(new Rectangle(new Point(0,0), new Point(this.width, this.height)));
	this.bgrnd.fillColor = new Color(0.0,0.0,0.0, 0.1);
	this.bgrnd.onMouseDown = this.initialiseLine();
	this.bgrnd.onMouseDrag = this.updateLine();
	this.bgrnd.onMouseUp =  this.settleLine();
	this.bgrnd.onDoubleClick = this.spawnBall();
	this.snapToggle = this.constructButton(new Point(25,125), new Size(125, 15), 'Snap to scale - off', 'white');
	this.snapToggle.onClick = this.toggleSnap();
	this.freqText = new PointText(new Point(25, this.height - 40));
	this.freqText.content = " ";
	this.freqText.fillColor = 'white';
	this.freqText.opacity = 0.8;
	this.splashToggle = this.constructButton(new Point(this.width - 145,30), new Size(125, 15), 'Note Splash - on', 'white');
	this.splashToggle.onClick = this.toggleSplash();
	this.splashToggle.opacity = 0.8;
	this.gravityToggle = this.constructButton(new Point(this.width - 145,60), new Size(125, 15), 'Gravity - on', 'white');
	this.gravityToggle.opacity = 0.8;
	this.gravityToggle.onClick = this.toggleGravity();
	this.gravityIncrease = this.constructButton(new Point(this.width - 145, 80), new Size(125, 15), 'Increase Gravity', 'white');
	this.gravityIncrease.onClick = this.editGravity(1.1);
	this.gravityDecrease = this.constructButton(new Point(this.width - 145, 100), new Size(125, 15), 'Decrease Gravity', 'white');
	this.gravityDecrease.onClick = this.editGravity(0.9);
	this.help = this.constructButton(new Point(20, this.height - 30), new Size(20, 15), '?', 'white');
	this.showingHelp = false;
	this.help.onMouseEnter = this.textFocus;
	this.help.onMouseLeave = this.textBlur;
	this.help.onClick = this.toggleHelp();

	this.copyLinkButton = this.constructButton(new Point(this.width - 145, 120), new Size(125, 15), 'Copy Sharable Link', 'white');
	this.copyLinkButton.onClick = this.copyLink();
	this.initScaleChooser();
	this.initWaveTypeChooser();
};

App.prototype.copyLink = function() {
	var _this = this;
	return function() {

		if (! _this.linkVisible) {
			_this.setSaveQS();
			_this.linkVisible = true;
			_this.linkElement.children[0].innerText = _this.qs;
			_this.linkElement.style.display = 'block';
			this.opacity = 1.0;
		} else {
			_this.linkVisible = false;
			_this.linkElement.style.display = 'none';
			this.opacity = 0.5;
		}
	}
}

App.prototype.editGravity = function(amount) {
	var _this = this;
	return function(event) {
		_this.gravityShift(amount);
	};
};

App.prototype.textFocus = function(){
	this.opacity = 0.8;
};

App.prototype.textBlur = function(){
	this.opacity = 0.5;
};

App.prototype.toggleHelp = function(){
	var _this = this;
	return function(){
		if (!_this.showingHelp) {
			this.children[1].content = "Double click to spawn a ball. Click and drag to draw a line.";
			_this.showingHelp = true;
		} else {
			_this.showingHelp = false;
			this.children[1].content = "?";
		}
	};
};

App.prototype.toggleGravity = function() {
	var _this = this;
	return function(event) {
		if (_this.gravity > 0) {
			_this.tempGravity = _this.gravity;
			_this.gravity = 0.0;
			this.children[1].content = 'Gravity - off';
			this.opacity = 0.3;
		} else {
			_this.gravity = _this.tempGravity;
			this.children[1].content = 'Gravity - on';
			this.opacity = 0.8;
		}
	};
};

App.prototype.toggleSplash = function() {
	var _this = this;
	return function() {
		if (_this.colorSplash){
			_this.colorSplash = false;
			this.opacity = 0.5;
			this.children[1].content = 'Note splash - off';
		} else {
			_this.colorSplash = true;
			this.opacity = 0.8;
			this.children[1].content = 'Note splash - on';
		}
	};
};

App.prototype.initialiseLine = function(){
	var _this = this;
	return function(event) {
		_this.tempPoint = event.point;
	};
};	

App.prototype.updateLine = function() {
	var _this = this;
	return function(event){
		if (!_this.tempLine) {
			if ((_this.tempPoint - event.point).length >= 10) {
				_this.tempLine = new Line(_this.tempPoint, event.point, _this);
				_this.tempLine.getSoundOut().connect(_this.masterGain);
				_this.lines.push(_this.tempLine);
			}
		}
		else {
			_this.tempLine.updateLine(event.point, _this.snapToScale);
		}
	};
};

App.prototype.settleLine = function() {
	var _this = this;
	return function(event) {
		if (_this.tempLine) {
			_this.tempLine.rest();
			_this.setSaveQS();
		}
		_this.tempLine = undefined;
		_this.tempPoint = undefined;
	};
};

App.prototype.spawnBall = function(){
	var _this = this;
	return function(event) {
		_this.balls.push(new Ball(event.point, 10, 10, _this));
	};
};

App.prototype.toggleSnap = function() {
	_this = this;
	return function(){
		_this.snapToScale = !_this.snapToScale;
		if (_this.snapToScale) {
			this.children[1].content = "Snap to scale - on";
			this.opacity = 0.8;
			_this.scaleChooser.bringToFront();
			_this.scaleChooser.opacity = 0.5;
		} else {
			this.children[1].content = "Snap to scale - off";
			this.opacity = 0.5;
			_this.scaleChooser.sendToBack();
			_this.scaleChooser.opacity = 0.0;
		}
	};
};

App.prototype.constructButton = function(pos, size, text, color) {
	var g = new Group();
	var rect = new Path.Rectangle(new Rectangle(pos, size));
	var t = new PointText(pos + new Point(5, 10));
	t.content = text;
	t.fillColor = color;
	g.addChildren([rect, t]);
	g.opacity = 0.5;
	return g;
};

App.prototype.initScaleChooser = function() {
	this.scaleChooser = new Group();
	var startPos = new Point(25, 145);
	var buttonShift = new Point(0, 15);
	var buttonSize = new Size(125, 15);
	var scaleKeys = Object.keys(this.scales);
	for (var i = 0; i < scaleKeys.length; i++) {
		var pos = startPos + (buttonShift * i);
		var button = this.constructButton(pos, buttonSize, scaleKeys[i], 'white');
		button.opacity = 0.8;
		button.onClick = this.selectScaleClick(scaleKeys[i]);
		this.scaleChooser.addChild(button);
	}
	this.scaleChooser.sendToBack();
};

App.prototype.selectScaleClick = function(key){
	_this = this;
	return function(event){
		for (var i = 0; i < _this.scaleChooser.children.length; i++) {
			_this.scaleChooser.children[i].opacity = 0.5;
		}
		this.opacity = 1.0;
		_this.selectedScale = _this.scales[key];
	};
};

App.prototype.initWaveTypeChooser = function() {
	this.waveTypeChooser = new Group();
	var startPos = new Point(25, 45);
	var buttonShift = new Point(0, 15);
	var buttonSize = new Size(80, 15);
	var label =  new PointText(startPos + new Point(5, -10));
	label.content = "Wavetype: ";
	label.fillColor = 'white';
	label.opacity = 0.8;
	this.waveTypeChooser.addChild(label);
	var waveTypes = ['sine', 'square', 'sawtooth', 'triangle']
	for (var i = 0; i < waveTypes.length; i++) {
		var pos = startPos + ( buttonShift * i)
		var button = this.constructButton(pos, buttonSize, waveTypes[i], 'white');
		button.opacity = 0.5;
		button.onClick = this.selectWaveTypeClick(waveTypes[i]);
		this.waveTypeChooser.addChild(button);
	}
	this.waveTypeChooser.children[1].opacity = 1.0
};

App.prototype.selectWaveTypeClick = function(type){
	_this = this;
	return function(event){
		for (var i = 1; i < _this.waveTypeChooser.children.length; i++) {
			_this.waveTypeChooser.children[i].opacity = 0.5;
		}
		this.opacity = 1.0;
		_this.waveType = type;
	};
};


App.prototype.run = function(){
	var now = this.audioContext.currentTime;
	for (var i = 0; i < this.lines.length;) {
		var line = this.lines[i];
		line.purge(now);
		if (!line.line && line.oscList.length == 0) {
			this.lines.splice(i, 1);
		} else {
			line.run();
			i++;
		}
	}
	for (var ii = 0; ii < this.balls.length;) {
		var ball = this.balls[ii];
		if (!ball.run()) {
			this.balls.splice(ii, 1);
		} else {
			ii++;
		}
	}
};

App.prototype.initialiseScales = function() {
	var notes = ["B", "C","C#", "D", "D#", "E", "F", "F#", "G", "G#", "A"].reverse();
	var chromatic_scale = [];
	for (var i = 0; i < 150; i++) {
		chromatic_scale.push([1454.54545454545/Math.pow(2, (120 - i)/12), notes[i%12]]);
	}

	var pentatonic_scale = [];
	pentapattern = [3,2,2,3,2].reverse();
	n = 0;
	while (n < chromatic_scale.length){
		pentatonic_scale.push(chromatic_scale[n]);
		n += pentapattern[(pentatonic_scale.length-1) % pentapattern.length];
	}

	var major_scale = [];
	majorPattern = [2,2,1,2,2,2,1].reverse();
	n = 0;
	while (n < chromatic_scale.length){
		major_scale.push(chromatic_scale[n]);
		n += majorPattern[(major_scale.length - 1) % majorPattern.length];
	}
	this.scales = {
		'chromatic': chromatic_scale,
		'major': major_scale,
		'pentatonic': pentatonic_scale
	};
};

App.prototype.setSaveQS = function(){
	var obj = {};
	if (this.lines.length > 0) {
		obj.lines = [];
		for (var i = 0; i < this.lines.length; i++){
			var line = this.lines[i];
			obj.lines.push([[line.posA.x, line.posA.y], [line.posB.x, line.posB.y]]);
		}
	}
	if (this.balls.length > 0) {
		obj.balls = [];
		for (var ii = 0; ii < this.balls.length; ii++){
			var ball = this.balls[ii];
			obj.balls.push([parseFloat(ball.pos.x.toFixed(2)), parseFloat(ball.pos.y.toFixed(2))]);
		}
	}
	this.qs = [location.protocol, '//', location.host, location.pathname].join('') + "?obj=" +  JSON.stringify(obj);
};

App.prototype.parseQS = function(){
	var qs = getQueryVariable('obj');
	if (qs) {
		var obj = JSON.parse(getQueryVariable('obj'));
		if (obj.lines){
			this.initLines(obj.lines);
		}
		if (obj.balls) {
			this.initBalls(obj.balls);
		}
	}
};

var Ball = function(pos, size, weight, app){
	this.app = app;
	this.pos = pos;
	this.size = size;
	this.weight = weight;
	this.traj = new Point(0,0);
	this.ball = new Group();
	this.shell = Path.Circle(this.pos, size * 1.33);
	this.shell.opacity = 0.1;

	this.outer = Path.Circle(this.pos, size);
	this.outer.opacity = 0.2;

	this.mid = Path.Circle(this.pos, size * 0.66);
	this.mid.opacity = 0.2;

	// this.inner = Path.Circle(this.pos, size/3);
	// this.inner.opacity = 1;

	this.soundBall = Path.Circle(this.pos, size/3);
	this.soundBall.opacity = 0.0;
	this.ball.addChildren([this.inner, this.mid, this.outer, this.shell, this.soundBall]);
	this.ball.fillColor = 'white';
	this.soundBall.fillColor = 'white';
	this.bounced = 0;
};

Ball.prototype.run = function() {
	if (this.pos.x < 0 || this.pos.y < 0 || this.pos.x > this.app.with || this.pos.y > this.app.height) {
		this.delete();
		return false;
	}
	if (this.bounced == 0) {
		for (var i = 0; i < this.app.lines.length; i++) {
			var line = this.app.lines[i];
			if (this.outer.intersects(line.innerLine)){
				a =  this.traj.angle - line.angle;
				b = 180 - a;
				c = a - b;
				this.traj = this.traj.rotate(-180 - c, new Point(0,0));
				this.bounced = 1;
				line.sound(this);
				this.soundBall.opacity = Math.min(0.8, this.soundBall.opacity + 0.3);
			}
		}
	}
	else {
		this.bounced -= 1;
	}
	this.traj += new Point(0, this.app.gravity);
	this.pos += this.traj;
	this.ball.translate(this.traj);
	this.soundBall.opacity = this.soundBall.opacity * 0.99;
	return true;
};

Ball.prototype.delete = function() {
	this.ball.remove();
};

var Line = function(posA, posB, app) {
	this.app = app;
	this.audioContext = app.audioContext;
	this.posA = posA;
	this.posB = posB;
	this.angle = (posB - posA).angle;
	this.line = new Group();
	this.gain = this.audioContext.createGain();
	this.gain.gain.value = 0.8;

	this.color = new Color(1,1,1);

	this.innerLine = new Path(this.posA, this.posB);
	this.innerLine.strokeWidth = 1.7;
	this.innerLine.opacity = 0.8;
	this.innerLine.strokeCap = 'round';
	this.innerLine.strokeColor = new Color(0.1,0.1,0.1,1.0);

	this.outerLine = new Path(this.posA, this.posB);
	this.outerLine.strokeColor = new Color(0.3,0.3,0.3,0.3);
	this.outerLine.strokeCap = 'round';
	this.outerLine.strokeWidth = 8;

	this.soundLine = new Path(this.posA, this.posB);
	this.soundLine.strokeWidth = 1.0;
	this.soundLine.strokeCap = 'round';
	this.soundLine.strokeColor = this.color;

	this.line.addChildren([this.innerLine, this.outerLine, this.soundLine]);
	this.pitch = 160000 / this.outerLine.length;
	
	this.oscList = [];
	this.splashes = [];

	this.outerLine.onMouseEnter = this.focusFunc();
	this.outerLine.onMouseLeave = this.blurFunc();
	this.outerLine.onDoubleClick = this.deleteLine();
	this.soundLine.onDoubleClick = this.deleteLine();

	this.moving = true;
	this.updateInfo();
};

Line.prototype.getSoundOut = function() {
	return this.gain;
};

Line.prototype.rest = function(){
	this.moving = false;
	this.outerLine.strokeColor = new Color(0, 0, 0, 0.2);
};

Line.prototype.run = function(){
	if (this.soundLine.strokeColor.alpha > 0.0) {
		this.soundLine.strokeColor.setAlpha(this.soundLine.strokeColor.alpha  * 0.98);
	}
	for (var i = 0; i < this.splashes.length; i++) {
		if (!this.splashes[i].run()){
			this.splashes.splice(i, 1);
		} else {
			i++;
		}
	}
};

Line.prototype.updateLine = function(posB, snapToScale) {
	if (snapToScale) {
		var tempLine = (posB - this.posA);
		length = tempLine.length;
		var i = 0;
		while (true) {
			if (length < this.app.selectedScale[i][0]) {
				this.posB = this.posA + tempLine.normalize(this.app.selectedScale[i-1][0]);
				this.note = this.app.selectedScale[i-1][1];
				break;
			}
			i++;
		}
	} else {
		this.posB = posB;
	}

	this.innerLine.removeSegment(1);
	this.innerLine.add(this.posB);

	this.outerLine.removeSegment(1);
	this.outerLine.add(this.posB);

	this.soundLine.removeSegment(1);
	this.soundLine.add(this.posB);

	this.updateInfo();
};

Line.prototype.updateInfo = function() {
	this.angle = (this.posB - this.posA).angle;
	this.pitch = 160000 /this.innerLine.length;

	this.color = new Color({
		'hue': Math.log2(this.pitch) % 1 * 360 ,
		'saturation':  1,
		'brightness': 0.5
	});

	this.soundLine.strokeColor = this.color;
	var text = "frequency: " + parseFloat(this.pitch).toFixed(2).toString();
	if (this.note) {
		text += " (" + this.note + ")";
	}
	this.app.freqText.content = text;
}

Line.prototype.sound = function(ball) {
	var osc = this.audioContext.createOscillator();
	osc.frequency.value = this.pitch;
	osc.type = this.app.waveType;
	var volume = Math.min(ball.traj.length / 10, 1);
	var ge = this.createEnv(0.05, 0.6, 0.5, 1.0, volume);
	var gain = ge[0];
	var end = ge[1];
	gain.connect(this.gain);
	osc.connect(gain);
	osc.start();
	this.end = end;
	this.oscList.push([osc, end]);
	this.soundLine.strokeColor.setAlpha(Math.min(1.0, this.soundLine.strokeColor.alpha + (0.6 * volume)));
	var intersections = this.innerLine.getIntersections(ball.outer);
	var splashpos;
	if (intersections.length < 2) {
		splashpos = intersections[0].point;
	} else {
		splashpos = (intersections[0].point + intersections[1].point) / 2;
	}
	if (this.app.colorSplash) {
		this.splashes.push(new Splash(splashpos, volume, this, app));
	}
};

Line.prototype.purge = function(now){
	for (var i = 0; i < this.oscList.length;){
		oe = this.oscList[i];
		osc = oe[0];
		end = oe[1];
		if (end <= now) {
			osc.stop();
			this.oscList.splice(i, 1);
		} else {
			i++;
		}
	}
};

Line.prototype.remove = function(){
	this.line.remove();
	this.line = false;
	this.innerLine = false;
};

Line.prototype.deleteLine = function(){
	var _this = this;
	return function(event) {
		_this.remove();
	};
};

Line.prototype.focusFunc = function() {
	var _this = this;
	return function(event) {
		_this.outerLine.strokeColor = new Color(0.2, 0.2, 0.2, 0.5);
		_this.soundLine.strokeColor.setAlpha(0.8);
		var text = "frequency: " + parseFloat(_this.pitch).toFixed(2).toString() ;
		if (_this.note) {
			text += " (" + _this.note + ")";
		}
		_this.app.freqText.content = text;
	};
};

Line.prototype.blurFunc = function() {
	var _this = this;
	return function(event) {
		if (!_this.moving) {
			_this.outerLine.strokeColor = new Color(0, 0, 0, 0.2);
			_this.app.freqText.content = " ";
		}
	};
};

Line.prototype.createEnv = function(a,d,s,r,volume) {
	var gain = this.audioContext.createGain();
	gain.gain.value = 0.0;
	var now = this.audioContext.currentTime;
	gain.gain.setValueAtTime(gain.gain.value, now);
	a = now + a;
	d = a + d;
	r = d + r;
	gain.gain.linearRampToValueAtTime(1.0 * volume, a);
	gain.gain.linearRampToValueAtTime(s * volume, d);
	gain.gain.linearRampToValueAtTime(0.0, r);
	return [gain, r];
};


var Splash = function(pos, volume, line, app) {
	this.app = app;
	this.line = line;
	this.pos = pos;
	this.freq = this.line.pitch;
	this.volume = volume;
	this.circle = new Path.Circle(pos, 2.5);
	this.color = this.line.color;
	this.circle.fillColor = this.color;
	this.circle.opacity = volume;
	this.circle.insertBelow(this.app.bgrnd);
	this.length = 3 + 10  * volume	;
	this.time = 0;
};

Splash.prototype.run = function(){
	if (this.time < this.length){
		this.circle.scale(1.5 - ( 0.35 * this.time/this.length) , this.pos);
		this.circle.opacity *= 0.85;
		this.time ++;
		return true;
	} else {
		this.circle.remove();
		return false;
	}
};

var app = new App('myCanvas');

function onFrame(){
	app.run();
}

function getQueryVariable(variable) {
    var query = window.location.search.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }
}