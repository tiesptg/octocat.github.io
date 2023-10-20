"use strict";

class Field {
	constructor() {
		this.width=40;
		this.height=25;
		this.visited = new Set();
		this.animal = null;
		this.lostCount = 0;
		this.horizontal = new Set();
		this.vertical = new Set();
		this.lines = [];
	}
	
	setLines(array) {
		this.lines = array;
		this.vertical.clear();
		this.horizontal.clear();
		for (const line of this.lines) {
			this.doLine(line[0],line[1],line[2],line[3]);
		}
	}
	
	addLine(x1,y1,x2,y2) {
		this.lines.push([x1,y1,x2,y2]);
		this.doLine(x1,y1,x2,y2);
	}
	
	removeLine(pos) {
		this.lines.splice(pos,1);
		this.vertical.clear();
		this.horizontal.clear();
		for (const line of this.lines) {
			this.doLine(line[0],line[1],line[2],line[3]);
		}
	}
	
	doLine(x1,y1,x2,y2) {
		let xunit = x1 < x2 ? 1 : -1;
		let y = y1;
		let x = x1;
		let yreal = y1;
		let yunit = y1 < y2 ? 1 : -1;
		let ydelta = x2 === x1 ? yunit : (y2-y1) / Math.abs(x2 -x1);
		let xadj = x1 < x2 ? 0 : 1;
		let yadj = y1 < y2 ? 0 : 1;
		while (x !== x2 || y !== y2) {
			if (x !== x2) {
				this.horizontal.add((x - xadj) * this.width + y - 1);
				x += xunit;
			}
			yreal += ydelta;
			let ygoal = Math.round(yreal);
			if (y !== ygoal) {
				this.vertical.add((x-1) * this.width + y - yadj);
				y += yunit;
			}
		}
	}
	
	setAnimal(animal) {
		this.visited.clear();
		this.animal = animal;
		this.animal.field = this;
		this.visit(animal.x,animal.y);
		this.reset();
	}
	
	reset() {
		this.visited.clear();
		this.animal.reset();
	}
	
	leftBorder(x,y) {
		if (this.vertical.has((x-1) * this.width + y)) return true;
		if (x === 0) return true;
		return false;
	}
	
	rightBorder(x,y) {
		if (this.vertical.has((x) * this.width + y)) return true;
		if (x === this.width-1) return true;
		return false;
	}
	
	topBorder(x,y) {
		if (this.horizontal.has(x * this.width + y - 1)) return true;
		if (y === 0) return true;
		return false;
	}
	
	bottomBorder(x,y) {
		if (this.horizontal.has(x * this.width + y)) return true;
		if (y === this.height -1) return true;
		return false;
	}
	
	isVisited(x,y) {
		return this.visited.has(y * this.width + x);
	}
	
	visit(x,y) {
		this.visited.add(y * this.width + x);
	}
	
	clear() {
		this.visited.clear();
	}
	
	step() {
		let forward = this.animal.script[this.animal.at] === Inst.FORWARD;
		this.animal.step();
		if (!this.isVisited(this.animal.x,this.animal.y)) {
			this.animal.score++;
			this.visit(this.animal.x,this.animal.y);
		} else {
			if (forward) {
				this.animal.score-= 0.25;
			} else {
				this.animal.score -= 0.1;
			}
		}
	}
	
	test() {
		let score = -1000;
		let at = 0;
		for (let i = 0; i - at < 200; ++i) {
			this.step();
			if (this.animal.score > score) {
				at = i;
				score = this.animal.score;
			}
		}
		return this.animal.score;
	}
}
	
const Dir = {LEFT:0,UP:1,RIGHT:2,DOWN:3};
const Inst = {FORWARD:-1,TURN_LEFT:-2,TURN_RIGHT:-3,GOTO:-4};
const Act = {MUTATION:0,ADD:1,DELETE:2,COPY:3};

class Animal {
	constructor(field,script,generation) {
		this.score = -script.length;
		this.field = field;
		this.script = script;
		this.x = 0;
		this.y = 0;
		this.direction = Dir.DOWN;
		this.at = 0;
		this.generation = generation;
		this.reset();
	}

	reset() {
		this.direction = Dir.DOWN;
		this.x = Math.floor(this.field.width/2);
		this.y = Math.floor(this.field.height/2);
		this.at = 0;
	}

	
	scriptString() {
		return this.getScript().join(', ');
	}
	
	getScript() {
		let result = [];
		for (let i = 0; i < this.script.length; ++i) {
			switch (this.script[i]) {
				case Inst.FORWARD: result.push(i + ':FORWARD'); break;
				case Inst.TURN_LEFT: result.push(i + ':LEFT'); break;
				case Inst.TURN_RIGHT: result.push(i + ':RIGHT'); break;
				default: result.push(i + ':GOTO(' + this.script[i] + ')');
			}
		}
		return result;
	}
	
	idString() {
		let result = [];
		for (let i = 0; i < this.script.length; ++i) {
			switch (this.script[i]) {
				case Inst.FORWARD: result.push('F'); break;
				case Inst.TURN_LEFT: result.push('L'); break;
				case Inst.TURN_RIGHT: result.push('R'); break;
				default: result.push('G' + this.script[i]); break;
			}
		}
		return result.join('');
	}
	
	mutate() {
		let script = [...this.script];
		do {
			let position = this.random(script.length);
			let action = this.random(4);
			switch (action) {
				case Act.MUTATION: script[position] = this.randomStep(script.length); break;
				case Act.ADD: {
					let before = this.random(2);
					let newStep = this.randomStep(script.length+1);
					if (before) {
						script.splice(position,0,newStep);
					} else if (position +1 === script.length){
						script.push(newStep);
					} else {
						script.splice(position+1,0,newStep);
					}
					for (let i = 0; i < script.length; ++i) {
						if (script[i] > position) {
							script[i]++;
						}
					}
					break;
				}
				case Act.DELETE: { 
					script.splice(position,1);
					for (let i = 0; i < script.length; ++i) {
						if (script[i] >= position) {
							script[i]--;
						}
					} 
					break;
				}
				case Act.COPY: {
					let end = this.random(script.length-position+1) + position;
					let destination = this.random(script.length);
					let slice = script.slice(position,end);
					script.splice(destination,0,...slice);
					break;
				}
			}
		} while (Math.random() < 0.7);
		return new Animal(this.field,script,this.generation+1);
	}
	
	randomStep(scriptLength) {
		let step = this.random(4)-3;
		if (step === 0) {
			step = this.random(scriptLength);
		}
		return step;
	}
	
	random(limit) {
		return Math.floor(Math.random() * limit);
	}
	
	draw(ctx) {
		let unit = Math.min(this.field.cellWidth,this.field.cellHeight) / 5;
		let marginX = (this.field.cellWidth - (5 * unit)) / 2;
		let marginY = (this.field.cellHeight - (5 * unit)) / 2;
		ctx.fillStyle = 'rgb(100,100,200)';
		ctx.fillRect(this.x * this.field.cellWidth + marginX + unit,this.y * this.field.cellHeight + marginX + unit,this.field.cellWidth-(2 * unit),this.field.cellHeight- (2*unit));
		let x = this.x * this.field.cellWidth + marginX + 2 * unit;
		let y = this.y * this.field.cellHeight + marginY + 2 * unit;
		switch (this.direction) {
			case Dir.LEFT: x -= unit; break;
			case Dir.RIGHT: x += unit; break;
			case Dir.UP: y -= unit; break;
			case Dir.DOWN: y += unit; break;
		}
		ctx.fillStyle = 'rgb(255,0,0)';
		ctx.fillRect(x,y,unit,unit);
	}
	
	step() {
		switch (this.script[this.at]) {
			case Inst.FORWARD: this.forward(); break;
			case Inst.TURN_LEFT: this.turnLeft(); break;
			case Inst.TURN_RIGHT: this.turnRight(); break;
			default: this.goto(this.script[this.at]); break;
		}
	}
	
	advance(steps) {
		this.at += steps;
		while (this.at >= this.script.length) {
			this.at -= this.script.length;
		}
	}
	
	forward() {
		switch (this.direction) {
			case Dir.UP: {
				if (this.field.topBorder(this.x,this.y)) {
					this.advance(2);
				} else {
					this.y--;
					this.advance(1);
				}
				break;
			}
			case Dir.DOWN: {
				if (this.field.bottomBorder(this.x,this.y)) {
					this.advance(2);
				} else {
					this.y++;
					this.advance(1);
				}
				break;
			}
			case Dir.LEFT: {
				if (this.field.leftBorder(this.x,this.y)) {
					this.advance(2);
				} else {
					this.x--;
					this.advance(1);
				}
				break;
			}
			case Dir.RIGHT: {
				if (this.field.rightBorder(this.x,this.y)) {
					this.advance(2);
				} else {
					this.x++;
					this.advance(1);
				}
				break;
			}
		}
	}
	
	turnLeft() {
		this.direction--;
		if (this.direction < 0) {
			this.direction = 3;
		}
		this.advance(1);
	}
	
	turnRight() {
		this.direction++;
		if (this.direction > 3) {
			this.direction = 0;
		}
		this.advance(1);
	}
	
	goto(nr) {
		this.at = nr % this.script.length;
	}
}


