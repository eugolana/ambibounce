var canvas = document.getElementById('myCanvas')
// canvas.width = window.width;


var audioContext = new (window.AudioContext || window.webkitAudioContext);

var masterGain = audioContext.createGain();
masterGain.value = 0.05;
masterGain.connect(audioContext.destination);

var bgrnd = new Path.Rectangle(new Rectangle(new Point(0,0), new Point(canvas.width, canvas.height)));
bgrnd.fillColor = new Color(0.8,0.8,0.8);

var Ball = function(pos, size, weight){
	this.pos = pos;
	this.size = size;
	this.weight = weight

	this.traj = new Point(0,0);
	this.ball = new Group()
	this.inner = Path.Circle(this.pos, size/3);
	this.inner.opacity = 1;
	this.mid = Path.Circle(this.pos, size * 0.66)
	this.mid.opacity = 0.3;
	this.outer = Path.Circle(this.pos, size);
	this.outer.opacity = 0.3;
	this.shell = Path.Circle(this.pos, size * 1.33);
	this.shell.opacity = 0.2;

	this.soundBall = Path.Circle(this.pos, size/3);
	this.soundBall.opacity = 0.0;

	this.ball.addChildren([this.inner, this.mid, this.outer, this.shell, this.soundBall]);
	this.ball.fillColor = 'black';

	this.soundBall.fillColor = 'white';
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
				this.soundBall.opacity = Math.min(0.8, this.soundBall.opacity + 0.4);
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
	this.innerLine.strokeColor = new Color(0,0,0,0.5);

	this.midLine = new Path(this.posA, this.posB)
	this.midLine.strokeWidth = 7;
	this.midLine.strokeCap = 'round';
	this.midLine.strokeColor = new Color(0,0,0,0.4);

	this.outerLine = new Path(this.posA, this.posB);
	this.outerLine.strokeColor = new Color(0,0,0,0.2);
	this.outerLine.strokeCap = 'round';
	this.outerLine.strokeWidth = 10;
	// this.outerLine.opacity = 0.3;

	this.soundLine = new Path(this.posA, this.posB);
	this.soundLine.strokeWidth = 1.7;
	this.soundLine.strokeCap = 'round';
	this.soundLine.strokeColor = new Color(255,255,255, 0.0);

	this.line.addChildren([this.innerLine, this.midLine, this.outerLine, this.soundLine])
	this.pitch = 440 / (this.outerLine.length/400);
	this.oscList = [];

	this.outerLine.onMouseEnter = function(event){
		this.strokeColor = new Color(128, 0, 0, 0.2);
	}
	this.outerLine.onMouseLeave = function(event){
		this.strokeColor = new Color(0, 0, 0, 0.2);
	}
	this.outerLine.onDoubleClick = this.deleteLine();
	this.soundLine.onDoubleClick = this.deleteLine();

}

Line.prototype.run = function(){
	if (this.soundLine.strokeColor.alpha > 0.0) {
		this.soundLine.strokeColor.setAlpha(this.soundLine.strokeColor.alpha  * 0.99)
	}
}

Line.prototype.updateLine = function(posB) {
	this.posB = posB;
	this.innerLine.removeSegment(1);
	this.innerLine.add(this.posB)

	this.outerLine.removeSegment(1);
	this.outerLine.add(this.posB)

	this.midLine.removeSegment(1);
	this.midLine.add(this.posB)

	this.soundLine.removeSegment(1);
	this.soundLine.add(this.posB)

	this.angle = (this.posB - this.posA).angle;
	this.pitch = 440 / (this.innerLine.length/400);
}

Line.prototype.sound = function(ball) {
	osc = audioContext.createOscillator();
	osc.frequency.value = this.pitch;
	var volume = Math.min(ball.traj.length / 10, 1);
	ge = createEnv(0.1, 0.6, 0.5, 1.0, volume, audioContext);
	gain = ge[0]
	end = ge[1]
	gain.connect(this.gain)
	osc.connect(gain);
	osc.start();
	this.end = end;
	this.oscList.push([osc, end]);
	this.soundLine.strokeColor.setAlpha(Math.min(1.0, this.soundLine.strokeColor.alpha + 0.4));
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

var tempPoint;
var tempLine;

balls = [];
lines = [];

var helloText =  new PointText(new Point(20, 15))

helloText.content = "Double click to spawn a ball. Click and drag to draw a line."


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


function onMouseDown(event) {
	tempPoint = event.point;
}

bgrnd.onMouseDrag = function(event) {
	if (!tempLine) {
		if ((tempPoint - event.point).length >= 10) {
			tempLine = new Line(tempPoint, event.point, masterGain);
			lines.push(tempLine)
		}
	}
	else {
		tempLine.updateLine(event.point)
	}
}

bgrnd.onMouseUp = function(event) {
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
	a = now + a;
	d = a + d;
	r = d + r;
	gain.gain.linearRampToValueAtTime(1.0 * volume, a);
	gain.gain.linearRampToValueAtTime(s * volume, d);
	gain.gain.linearRampToValueAtTime(0.0, r);
	return [gain, r];
}

