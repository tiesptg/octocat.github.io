"use strict";

class GuiField extends Field {
	constructor(ctx) {
		super();
		this.ctx = ctx;
		this.cellWidth = ctx ? ctx.canvas.width/this.width : 0;
		this.cellHeight = ctx ? ctx.canvas.height/this.height : 0;
		this.onstep = null;
	}
	
	setAnimal(animal) {
		super.setAnimal(animal);
		if (this.ctx) {
			this.draw();
		}
	}
	
	step() {
		let current = [this.animal.x,this.animal.y];
		let score = this.animal.score;
		super.step();
		if (score < this.animal.score) {
			this.lostScore = 0;
		} else {
			if (++this.lostScore > 200) {
				this.reset();
				this.draw();
			}
		}
		this.drawCell(current[0],current[1]);
		this.drawCell(this.animal.x,this.animal.y);
		this.animal.draw(this.ctx);
		if (this.onstep) {
			this.onstep(this.animal);
		}
	}
	
	draw() {
		for (let x = 0; x < this.width; ++x) {
			for (let y = 0; y < this.height; ++y) {
				this.drawCell(x,y);
			}
		}
		if (this.animal) {
			this.animal.draw(this.ctx);
		}
	}
	
	drawCell(x,y) {
		if (this.isVisited(x,y)) {
			this.ctx.fillStyle = 'rgb(225,225,225)';
		} else {
			this.ctx.fillStyle = 'rgb(255,255,255)';
		}
		this.ctx.strokeStyle = 'rgb(155,155,155)';
		this.ctx.lineWidth = 0.5;
		this.ctx.fillRect(x * this.cellWidth,y * this.cellHeight,this.cellWidth,this.cellHeight);
		this.ctx.strokeRect(x * this.cellWidth,y * this.cellHeight,this.cellWidth,this.cellHeight);
		this.ctx.fillStyle = 'rgb(0,0,0)';
		if (this.leftBorder(x,y)) {
			this.ctx.fillRect(x * this.cellWidth,y * this.cellHeight,2,this.cellHeight);
		}
		if (this.rightBorder(x,y)) {
			this.ctx.fillRect((x+1) * this.cellWidth - 2,y * this.cellHeight,2,this.cellHeight);
		}
		if (this.topBorder(x,y)) {
			this.ctx.fillRect(x * this.cellWidth,y * this.cellHeight,this.cellWidth,2);
		}
		if (this.bottomBorder(x,y)) {
			this.ctx.fillRect(x * this.cellWidth,(y+1) * this.cellHeight-2,this.cellWidth,2);
		}
	}
}

class DrawField extends GuiField {
	constructor(ctx) {
		super(ctx);
		ctx.canvas.addEventListener('click',(e) => this.doClick(e));
		ctx.canvas.addEventListener('mousemove',(e) => this.doMove(e));
		this.x1 = -1;
		this.y1 = -1;
		this.x2 = -1;
		this.y2 = -1;
	}
	
	doClick(e) {
		if (this.x1 === -1) {
			this.x1 = this.x2 = Math.round(e.offsetX / this.cellWidth);
			this.y1 = this.y2 = Math.round(e.offsetY / this.cellHeight);
			this.addLine(this.x1,this.y1,this.x2,this.y2);
			this.draw();
		} else {
			this.x1 = this.y1 = this.x2 = this.y2 = -1;
		}
	}
	
	doMove(e) {
		if (this.x1 !== -1) {
			let x2 = Math.round(e.offsetX / this.cellWidth);
			let y2 = Math.round(e.offsetY / this.cellHeight);
			if (x2 !== this.x2 || y2 !== this.y2) {
				this.x2 = x2;
				this.y2 = y2;
				this.removeLine(this.lines.length -1);
				this.addLine(this.x1,this.y1,this.x2,this.y2);
				this.draw();
			}
		}
	}
}

class Gui {
	constructor() {
		this.ctx = document.getElementById('field').getContext('2d');
		this.drawCtx = document.getElementById('drawField').getContext('2d');
		let lines = JSON.parse(localStorage.getItem("lines"));
		this.field = new GuiField(this.ctx);
		this.field.setAnimal(new Animal(this,[0],0));
		this.drawField = new DrawField(this.drawCtx);
		if (lines) {
			this.field.setLines(lines);
			this.drawField.setLines(lines);
		} 
		this.field.draw();
		this.drawField.draw();
		this.field.onstep = (animal) => this.scriptStep(animal.at);
		this.bestScore = -1000;
		this.workers = [];
		this.maxWorkers = 8;
		this.stopWorkers = true;
		this.stepInterval = 25;
		this.attempts = 0;
		this.at = 0;
		this.animals = [];
		this.colors = ['rgb(255,0,0)','rgb(0,0,255)','rgb(0,200,100)','rgb(175,125,0)','rgb(200,255,0)','rgb(0,200,200)','rgb(200,0,200)','rgb(100,100,100)'];
		for (let i = 0; i < this.maxWorkers; ++i) {
			this.animals.push([]);
		}
		this.drawGraph();
	}
	
	reset() {
		this.bestScore = -1000;
		this.attempts = 0;
		this.field.reset();
		this.setScore(0);
		document.getElementById('best').innerHTML = "";
	}
	
	setScore(score) {
		score = Math.round(score * 100) / 100;
		document.getElementById('score').textContent = score;
	}
	
	setSpeed(ms) {
		this.stepInterval = ms;
		if (!this.stopWorkers) {
			clearInterval(this.interval);
			this.interval = setInterval(() => {
				this.field.step();
			},this.stepInterval);
		}
	}
	
	toggleSpeed() {
		if (this.stepInterval < 100) {
			this.setSpeed(500);
			document.getElementById('speed').textContent = "Fast";
		} else {
			this.setSpeed(25);
			document.getElementById('speed').textContent = "Slow";
		}
	}
	
	start() {
		if (this.stopWorkers) {
			this.stopWorkers = false;
			this.field.reset();
			this.field.draw();
			this.setScore(this.field.animal.score);
			this.evolve();
			this.interval = setInterval(() => {
				this.field.step();
			},this.stepInterval);
		}
	}
	
	restart() {
		this.stop();
		this.reset();
		this.start();
	}
	
	stop() {
		if (!this.stopWorkers) {
			this.stopWorkers = true;
			for (const population of this.animals) {
				population.length = 0;
			}
			clearInterval(this.interval);
			for (let worker of this.workers) {
				worker.terminate();
			}
			this.workers.length = 0;
		}
	}
	
	scriptStep(at) {
		let old = document.getElementById('s' + this.at);
		if (old) {
			old.style.backgroundColor = 'white';
			old.style.color = 'black';
		}
		let step = document.getElementById('s' + at);
		if (step) {
			step.style.color = 'white';
			step.style.backgroundColor = 'darkgray';
		}
		this.at = at;
	}
	
	setScript(animal) {
		let script = animal.getScript();
		let node = document.getElementById("script");
		node.innerHTML = "";
		for (let i = 0; i < script.length; ++i) {
			let child = document.createElement('div');
			child.style.color = 'red';
			child.style.backgroundColor = 'white';
			child.id = 's' + i;
			child.textContent = script[i];
			node.appendChild(child);
		}
	}
	
	setBest(animal,score,worker) {
		this.bestScore = score;
		this.setScore(this.bestScore);
		document.getElementById('generations').textContent = animal.generation;
		let list = document.getElementById('best');
		let inField = list.selectedIndex < 1;
		let option = document.createElement('option');
		option.textContent = (Math.round(score * 100) / 100) + " (generation=" + animal.generation + ", worker=" + worker + ")";
		option.value = JSON.stringify({score:animal.score,script:animal.script,generation:animal.generation});
		option.style.color = this.colors[worker];
		list.add(option,0);
		if (inField) {
			list.selectedIndex = 0;
			this.setScript(animal);
			this.field.setAnimal(animal);
		}
	}
	
	selectAnimal() {
		let list = document.getElementById('best');
		if (list.selectedIndex !== -1) {
			let selected = JSON.parse(list.value);
			let animal = new Animal(this.field,selected.script,selected.generation);
			this.setScript(animal);
			this.field.setAnimal(animal);
		}
	}
	
	drawGraph() {
		let graph = document.getElementById('graph');
		let ctx = graph.getContext('2d');
		ctx.fillStyle = 'rgb(255,255,255)';
		ctx.fillRect(0,0,graph.width,graph.height);
		ctx.strokeStyle = 'rgb(0,0,0)';
		ctx.strokeRect(0,0,graph.width,graph.height);
		ctx.lineWidth = 2;
		ctx.font = "12pt Arial, Helvetica";
		ctx.fillStyle = 'rgb(0,0,0)';
		ctx.fillText("score",10,20);
		let ts = ctx.measureText("generations");
		ctx.fillText("generations",graph.width - 10 - ts.width,graph.height - 10 - ts.fontBoundingBoxDescent);
		let x = 100;
		let y = 20;
		for (let w = 0; w < this.maxWorkers; ++w) {
			let text = "worker " + w;
			ts = ctx.measureText(text);
			ctx.strokeStyle = ctx.fillStyle = this.colors[w];
			ctx.beginPath();
			ctx.moveTo(x,y);
			x += 20;
			ctx.lineTo(x,y);
			ctx.stroke();
			x += 10;
			ctx.fillText(text,x,y);
			x += ts.width + 20;
		}
		let i = 0;
		let max = 0;
		for (const worker of this.animals) {
			for (let i = 0; i < worker.length; ++i) {
				if (max < worker[i].generation) {
					max = worker[i].generation;
				}
			}
		}
		ctx.strokeStyle = ctx.fillStyle = 'rgb(100,100,100)';
		ctx.beginPath();
		y = graph.height - this.bestScore * graph.height / 1000;
		ctx.moveTo(0,y);
		ctx.lineTo(graph.width,y);
		ctx.stroke();
		let text = Math.round(this.bestScore * 100) / 100;
		ts = ctx.measureText(text);
		ctx.fillText(text,graph.width - 10 - ts.width,y - ts.fontBoundingBoxDescent - 10);		
		for (const worker of this.animals) {
			if (worker.length) {
				ctx.strokeStyle = ctx.fillStyle = this.colors[i++];
				ctx.beginPath();
				let data = worker[0];
				x = data.generation * graph.width / max;
				y = graph.height - (data.score * graph.height / 1000);
				ctx.moveTo(x,y);
				for (let i = 1; i < worker.length; ++i) {
					data = worker[i];
					x = data.generation * graph.width / max;
					y = graph.height - (data.score * graph.height / 1000);
					ctx.lineTo(x,y);
				}
				ctx.stroke();
				text = Math.round(data.score * 100) / 100;
				ts = ctx.measureText(text);
				ctx.fillText(text,x - ts.width-10,y - ts.fontBoundingBoxDescent);
			}
		}
	}
	
	
	evolve() {
		for (let i = 0; i < this.maxWorkers; ++i) {
			let worker = new Worker('evolver.js')
			this.workers.push(worker);
			worker.postMessage(this.field.lines);
			worker.onmessage = (event) => {
				let message = event.data;
				if (message.startsWith('a:')) {
					this.attempts += parseInt(message.substring(2));
					document.getElementById('attempts').textContent = this.attempts;
				} else if (message.startsWith('b:')) {
					let animal = JSON.parse(message.substring(2));
					let index = this.workers.findIndex(i => i === event.target);
					this.animals[index].push({score:animal.score,generation:animal.generation,worker:worker});
					if (animal.score > this.bestScore) {
						this.setBest(new Animal(this.field,animal.script,animal.generation),animal.score,index);
					}
					this.drawGraph();
				} else if (message.startsWith('k')) {
					let index = this.workers.findIndex(i => i === event.target);
					this.animals[index].length = 0;					
				}
			}
		}
	}
	
	removeLastLine() {
		this.drawField.removeLine(this.drawField.lines.length-1);
		this.drawField.draw();
	}
	
	removeAllLines() {
		this.drawField.setLines([]);
		this.drawField.draw();
	}
	
	activateField() {
		this.field.setLines(this.drawField.lines);
		localStorage.setItem("lines",JSON.stringify(this.drawField.lines));
		this.restart();
	}
	
}

var gui = null;

