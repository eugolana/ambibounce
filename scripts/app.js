var canvas = document.getElementById('myCanvas')
// canvas.width = window.width;


var audioContext = new (window.AudioContext || window.webkitAudioContext);

var masterGain = audioContext.createGain();
masterGain.gain.value = 0.3;
masterGain.connect(audioContext.destination);

var pre_bgrnd = new Path.Rectangle(new Rectangle(new Point(0,0), new Point(canvas.width, canvas.height)));
pre_bgrnd.fillColor = 'black'


var bgrnd = new Path.Rectangle(new Rectangle(new Point(0,0), new Point(canvas.width, canvas.height)));
bgrnd.fillColor = new Color(0.0,0.0,0.0, 0.1);

var Ball = function(pos, size, weight){
	this.pos = pos;
	this.size = size;
	this.weight = weight

	this.traj = new Point(0,0);
	this.ball = new Group()
	this.inner = Path.Circle(this.pos, size/3);
	this.inner.opacity = 1;
	this.mid = Path.Circle(this.pos, size * 0.66)
	this.mid.opacity = 0.2;
	this.outer = Path.Circle(this.pos, size);
	this.outer.opacity = 0.2;
	this.shell = Path.Circle(this.pos, size * 1.33);
	this.shell.opacity = 0.1;

	this.soundBall = Path.Circle(this.pos, size/3);
	this.soundBall.opacity = 0.0;

	this.ball.addChildren([this.inner, this.mid, this.outer, this.shell, this.soundBall]);
	this.ball.fillColor = 'white';

	this.soundBall.fillColor = 'black';
	this.bounced = 0;
}

Ball.prototype.run = function(gravity, lines) {
	if (this.bounced == 0) {
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i]
			if (this.outer.intersects(line.innerLine)){
				a =  this.traj.angle - line.angle
				b = 180 - a;
				c = a - b;
				this.traj = this.traj.rotate(-180 - c, new Point(0,0))
				this.bounced = 2;
				line.sound(this);
				this.soundBall.opacity = Math.min(0.8, this.soundBall.opacity + 0.3);
			} else {
				//
			}
		}
	}
	else {
		this.bounced -= 1;
	}
	this.traj += new Point(0, gravity);
	this.pos += this.traj;
	this.ball.translate(this.traj);
	this.soundBall.opacity = this.soundBall.opacity * 0.99;
}


var Line = function(posA, posB, soundOut) {
	this.posA = posA;
	this.posB = posB;
	this.soundOut = soundOut;
	this.angle = (posB - posA).angle;
	this.line = new Group()

	this.gain = audioContext.createGain();
	this.gain.gain.value = 0.8;
	this.gain.connect(this.soundOut)

	this.innerLine = new Path(this.posA, this.posB);
	this.innerLine.strokeWidth = 1.7;
	this.innerLine.opacity = 0.8;
	this.innerLine.strokeCap = 'round';
	this.innerLine.strokeColor = new Color(0.0,0.0,0.0,1.0);

	this.midLine = new Path(this.posA, this.posB)
	this.midLine.strokeWidth = 2;
	this.midLine.strokeCap = 'round';
	this.midLine.strokeColor = new Color(0.3,0.3,0.3,0.3);

	this.outerLine = new Path(this.posA, this.posB);
	this.outerLine.strokeColor = new Color(0.2,0.2,0.2,0.2);
	this.outerLine.strokeCap = 'round';
	this.outerLine.strokeWidth = 8;
	// this.outerLine.opacity = 0.3;

	this.soundLine = new Path(this.posA, this.posB);
	this.soundLine.strokeWidth = 1.0;
	this.soundLine.strokeCap = 'round';
	this.soundLine.strokeColor = new Color(1.0,1.0,1.0, 0.0);

	this.line.addChildren([this.innerLine, this.midLine, this.outerLine, this.soundLine])
	this.pitch = 160000 / this.outerLine.length;
	
	this.oscList = [];
	this.splashes = [];

	this.outerLine.onMouseEnter = this.focusFunc();
	this.outerLine.onMouseLeave = this.blurFunc();
	this.outerLine.onDoubleClick = this.deleteLine();
	this.soundLine.onDoubleClick = this.deleteLine();

	this.moving = true;
}

Line.prototype.rest = function(){
	this.moving = false;
	this.outerLine.strokeColor = new Color(0, 0, 0, 0.2);
	this.outerLine.strokeWidth -= 1;
}

Line.prototype.run = function(){
	if (this.soundLine.strokeColor.alpha > 0.0) {
		this.soundLine.strokeColor.setAlpha(this.soundLine.strokeColor.alpha  * 0.98)
	}
	for (var i = 0; i < this.splashes.length; i++) {
		if (!this.splashes[i].run()){
			this.splashes.splice(i, 1);
		} else {
			i++;
		}
	}
}

Line.prototype.updateLine = function(posB) {
	
	if (snapToScale) {
		var tempLine = (posB - this.posA);
		length = tempLine.length;
		var i = 0;
		while (true) {
			// console.log('checking against')
			// console.log(chromatic_scale[i])
			if (length < selectedScale[i][0]) {
				this.posB = this.posA + tempLine.normalize(selectedScale[i-1][0]);
				this.note = selectedScale[i-1][1]
				break;
			}
			i++;
		}
	} else {
		this.posB = posB;
	}



	this.innerLine.removeSegment(1);
	this.innerLine.add(this.posB)

	this.outerLine.removeSegment(1);
	this.outerLine.add(this.posB)

	this.midLine.removeSegment(1);
	this.midLine.add(this.posB)

	this.soundLine.removeSegment(1);
	this.soundLine.add(this.posB)

	this.angle = (this.posB - this.posA).angle;

	this.pitch = 160000 /this.innerLine.length;
	var text = "frequency: " + parseFloat(this.pitch).toFixed(2).toString()
	if (this.note) {
		text += " (" + this.note + ")"
	}
	freqText.content = text;
}

Line.prototype.sound = function(ball) {
	osc = audioContext.createOscillator();
	osc.frequency.value = this.pitch;
	var volume = Math.min(ball.traj.length / 10, 1);
	ge = createEnv(0.05, 0.6, 0.5, 1.0, volume, audioContext);
	gain = ge[0]
	end = ge[1]
	gain.connect(this.gain)
	osc.connect(gain);
	osc.start();
	this.end = end;
	this.oscList.push([osc, end]);
	this.soundLine.strokeColor.setAlpha(Math.min(1.0, this.soundLine.strokeColor.alpha + (0.6 * volume)));
	var intersections = this.innerLine.getIntersections(ball.outer);
	if (intersections.length < 2) {
		var splashpos = intersections[0].point;
	} else {
		var splashpos = (intersections[0].point + intersections[1].point) / 2;
		
	}
	if (colorSplash) {
		this.splashes.push(new Splash(splashpos, this.pitch, volume))
	}
}

Line.prototype.purge = function(now){
	for (var i = 0; i < this.oscList.length;){

		oe = this.oscList[i];
		osc = oe[0]
		end = oe[1]
		if (end <= now) {
			osc.stop()
			this.oscList.splice(i, 1)
		} else {
			i++
		}
	}
}

Line.prototype.remove = function(){
	this.line.remove();
	this.line = false;
	this.innerLine = false;
}

Line.prototype.deleteLine = function(){
		var line = this;
		return function(event) {
			line.remove();
	}
}

Line.prototype.focusFunc = function() {
	var line = this;
	return function(event) {
		line.outerLine.strokeColor = new Color(0.2, 0.2, 0.2, 0.3);
		var text = "frequency: " + parseFloat(line.pitch).toFixed(2).toString() 
		if (line.note) {
			text += " (" + line.note + ")"
		}
		freqText.content = text;
	}
}

Line.prototype.blurFunc = function() {
	var line = this;
	return function(event) {
		if (!line.moving) {
			line.outerLine.strokeColor = new Color(0, 0, 0, 0.2);
			freqText.content = " ";
		}
	}
}

var Splash = function(pos, freq, volume) {
	this.pos = pos;
	this.freq = freq;
	this.volume = volume;
	this.circle = new Path.Circle(pos, 2.5);
	this.color = new Color({
		'hue': Math.log2(this.freq) % 1 * 360 ,
		'saturation':  volume,
		'brightness': volume
	});
	this.circle.fillColor = this.color;
	this.circle.opacity = volume;
	this.circle.insertBelow(bgrnd)
	this.length = 3 + 10  * volume	;
	this.time = 0;
}

Splash.prototype.run = function(){
	if (this.time < this.length){
		this.circle.scale(1.5 - ( 0.35 * this.time/this.length)  , this.pos);

		this.circle.opacity *= 0.85;
		this.time ++;
		return true;
	} else {
		this.circle.remove();
		return false;
	}
}




var tempPoint;
var tempLine;

var snapToScale = false;
var selectedScale = chromatic_scale;

var colorSplash = false;

balls = [];
lines = [];






function onFrame(){
	var now = audioContext.currentTime;
	for (var i = 0; i < lines.length;) {
		lines[i].purge(now);
		if (!lines[i].line && lines[i].oscList.length == 0) {
			lines.splice(i, 1);
		} else {
			lines[i].run();
			i++;
		}
	}
	for (var i = 0; i < balls.length; i++) {
		balls[i].run(0.075, lines);
	}
}


bgrnd.onMouseDown = function(event) {
	tempPoint = event.point;
}

bgrnd.onMouseDrag = function(event) {
	if (!tempLine) {
		if ((tempPoint - event.point).length >= 10) {
			if (snapToScale) {
				// Math.pow(2, n/12) ;
			}
			tempLine = new Line(tempPoint, event.point, masterGain);
			lines.push(tempLine)
		}
	}
	else {
		tempLine.updateLine(event.point)
	}
}

bgrnd.onMouseUp = function(event) {
	if (tempLine) {
		tempLine.rest();
	}
	tempLine = undefined;
	tempPoint = undefined
}

bgrnd.onDoubleClick = function(event) {
	balls.push(new Ball(event.point, 10, 10))
}

function createEnv(a,d,s,r,volume, context) {
	var gain = context.createGain();
	gain.gain.value = 0.0;
	var now = context.currentTime;
	gain.gain.setValueAtTime(gain.gain.value, now);
	a = now + a;
	d = a + d;
	r = d + r;
	gain.gain.linearRampToValueAtTime(1.0 * volume, a);
	gain.gain.linearRampToValueAtTime(s * volume, d);
	gain.gain.linearRampToValueAtTime(0.0, r);
	return [gain, r];
}


var notes = ["A#", "B", "C","C#", "D", "D#", "E", "F", "F#", "G", "G#", "A"].reverse()
var chromatic_scale = [];
for (var i = 0; i < 120; i++) {
	chromatic_scale.push([1454.54545454545/Math.pow(2, (120 - i)/12), notes[i%12]])
}

var pentatonic_scale = [];
pentapattern = [3,2,2,3,2].reverse()

n = 0;
while (n < chromatic_scale.length){
	pentatonic_scale.push(chromatic_scale[n]);
	n += pentapattern[(pentatonic_scale.length-1) % pentapattern.length];
}


var major_scale = []

majorPattern = [2,2,1,2,2,2,1].reverse()

n = 0;
while (n < chromatic_scale.length){
	major_scale.push(chromatic_scale[n]);
	n += majorPattern[(major_scale.length - 1) % majorPattern.length];
}


var getButton = function(pos, size, text, color) {
	var g = new Group()
	var rect = new Path.Rectangle(new Rectangle(pos, size));
	var t = new PointText(pos + new Point(5, 10))
	t.content = text
	t.fillColor = color
	// console.log
	g.addChildren([rect, t])
	g.opacity = 0.5;
	return g
}

var snapToggle = getButton(new Point(25,30), new Size(125, 15), 'Snap to scale - off', 'white');

var scaleChooser = new Group()

var chromButton = getButton(new Point(25, 50), new Size(125, 15), 'Chromatic', 'white')
chromButton.opacity = 0.8;

var majorButton = getButton(new Point(25, 70), new Size(125, 15), 'Major', 'white')
var pentatonicButton = getButton(new Point(25, 90), new Size(125, 15), 'Pentatonic', 'white')



scaleChooser.addChildren([chromButton, majorButton, pentatonicButton])

scaleChooser.sendToBack();


snapToggle.onClick = function(){
	snapToScale = !snapToScale
	if (snapToScale) {
		this.children[1].content = "Snap to scale - on"
		this.opacity = 0.8;
		scaleChooser.bringToFront();
		scaleChooser.opacity = 0.5;

	} else {
		this.children[1].content = "Snap to scale - off"
		this.opacity = 0.5;
		scaleChooser.sendToBack();
		scaleChooser.opacity = 0.0;
	}
}

chromButton.onClick = function() {
	if (this.opacity = 0.5) {
		for (var i = 0; i < scaleChooser.children.length; i++) {
			scaleChooser.children[i].opacity = 0.5;
		}
		this.opacity = 0.8;
		selectedScale = chromatic_scale;
	} 
}

majorButton.onClick = function() {
	if (this.opacity = 0.5) {
		for (var i = 0; i < scaleChooser.children.length; i++) {
			scaleChooser.children[i].opacity = 0.5;
		}
		this.opacity = 0.8;
		selectedScale = major_scale;
	} 
}

pentatonicButton.onClick = function() {
	if (this.opacity = 0.5) {
		for (var i = 0; i < scaleChooser.children.length; i++) {
			scaleChooser.children[i].opacity = 0.5;
		}
		this.opacity = 0.8;
		selectedScale = pentatonic_scale;
	} 
}


// var helloText =  new PointText(new Point(20, canvas.height - 5))


// helloText.content = "Double click to spawn a ball. Click and drag to draw a line."

// helloText.fillColor = 'white';

var freqText = new PointText(new Point(canvas.width - 140, 60))

freqText.content = " ";
freqText.fillColor = 'white';
freqText.opacity = 0.8;

var splashToggle = getButton(new Point(canvas.width - 145,30), new Size(125, 15), 'Note Splash - off', 'white');


splashToggle.onClick = function() {
	if (colorSplash){
		colorSplash = false;
		this.opacity = 0.5;
		this.children[1].content = 'Note splash - off'
	} else {
		colorSplash = true;
		this.opacity = 0.8;
		this.children[1].content = 'Note splash - on'
	}
}

var help = getButton(new Point(20, canvas.height - 30), new Size(20, 15), '?', 'white');

help.onMouseEnter = function(){
	this.opacity = 0.8;
}

help.showing = false;

help.onMouseLeave = function(){
	this.opacity = 0.5;
}

help.onClick = function(){
	if (!this.showing) {
		this.children[1].content = "Double click to spawn a ball. Click and drag to draw a line."
		this.showing = true;
	} else {
		this.showing = false;
		this.children[1].content = "?"
	}
}