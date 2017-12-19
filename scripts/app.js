var canvas = document.getElementById('myCanvas')
// canvas.width = window.width;


var audioContext = new (window.AudioContext || window.webkitAudioContext);

var masterGain = audioContext.createGain();
masterGain.value = 0.05;
masterGain.connect(audioContext.destination);

var bgrnd = new Path.Rectangle(new Rectangle(new Point(0,0), new Point(canvas.width, canvas.height)));
bgrnd.fillColor = 'blue';

var Ball = function(pos, size, weight){
	this.pos = pos;
	this.size = size
	this.weight = weight

	this.traj = new Point(0,0);
	this.ball = new Path.Circle(this.pos, size);
	this.ball.fillColor = 'black';
	this.bounced = 0;
}

Ball.prototype.run = function(gravity, lines) {
	if (this.bounced == 0) {
		for (var i = 0; i < lines.length; i++) {
			var line = lines[i]
			if (this.ball.intersects(line.line)){
				a =  this.traj.angle - line.angle
				b = 180 - a;
				c = a - b;
				this.traj = this.traj.rotate(-180 - c, new Point(0,0))
				this.bounced = 6;
				line.sound(this);
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
}


var Line = function(posA, posB, soundOut) {
	this.posA = posA;
	this.posB = posB;
	this.soundOut = soundOut;
	this.angle = (posB - posA).angle;
	this.line = new Path(posA, posB);
	this.pitch = 440 / (this.line.length/400);
	this.line.strokeColor = 'black';
	this.line.strokeWidth = 3;
	this.oscList = [];
}

Line.prototype.updateLine = function(posB) {
	this.posB = posB;
	this.line.removeSegment(1);
	this.line.add(this.posB)
	this.angle = (this.posB - this.posA).angle;
	this.pitch = 440 / (this.line.length/400);
}

Line.prototype.sound = function(ball) {
	osc = audioContext.createOscillator();
	osc.frequency.value = this.pitch;
	var volume = Math.min(ball.traj.length / 10, 1);
	ge = createEnv(0.1, 0.6, 0.5, 1.0, volume, audioContext);
	gain = ge[0]
	end = ge[1]
	gain.connect(this.soundOut)
	osc.connect(gain);
	osc.start();
	this.end = end;
	this.oscList.push([osc, end]);
}

Line.prototype.purge = function(now){
	for (var i = 0; i < this.oscList.length;){

		oe = this.oscList[i];
		osc = oe[0]
		end = oe[1]
		if (end <= now) {
			osc.stop()
			this.oscList.splice(i, 1)
			console.log('osc purged')
		} else {
			i++
		}
	}
}


// var b = new Ball(new Point(100, 0), 10, 10);

// var l = new Line(new Point(50, 140), new Point(150, 240), masterGain);
// var l2 = new Line(new Point(750, 240), new Point(850, 140), masterGain);

var tempPoint;
var tempLine;

balls = [];
lines = [];

var helloText =  new PointText(new Point(canvas.width/2, 20))

helloText.content = "double click to spawn a ball. Click and drag to draw a line."


function onFrame(){
	var now = audioContext.currentTime;
	for (var i = 0; i < lines.length; i++) {
		lines[i].purge(now);
	}
	for (var i = 0; i < balls.length; i++) {
		balls[i].run(0.05, lines);
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
	gain.gain.value = 0.001;
	var now = context.currentTime;
	a = now + a;
	d = a + d;
	r = d + r;
	gain.gain.linearRampToValueAtTime(1.0 * volume, a);
	gain.gain.linearRampToValueAtTime(s * volume, d);
	gain.gain.linearRampToValueAtTime(0.0, r);
	return [gain, r];
}