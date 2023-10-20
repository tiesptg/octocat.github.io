importScripts('evolution.js');

class Life {
	constructor() {
		this.field = new Field();
		this.population = [new Animal(this.field,[0],0)];
		this.index = new Set();
		this.index.add(this.population[0].idString());
		this.attempts = 0;
		this.interval = 0;
		this.max = 1000;
		this.bestScore = -1000;
		this.lastBest = 0;
		this.stopWorker = true;
	}
	
	stop() {
		if (!this.stopWorker) {
			this.stopWorker = true;
		}
	}
	
	start(lines) {
		if (this.stopWorker) {
			this.field.setLines(lines);
			this.stopWorker = false;
			this.evolve();
		}
	}
	
	reset() {
		this.index.clear();
		this.population = [new Animal(this.field,[0],0)];
		this.index.add(this.population[0].idString());
		this.bestScore = -1000;
		this.attempts = 0;
	}
	
	evolve() {
		while (!this.stopWorker) {
			let index = Math.floor(Math.random() * this.population.length);
			let child = this.population[index].mutate();
			if (child.script.length !== 0 && !this.index.has(child.idString())) {
				this.field.setAnimal(child);
				this.field.test();
				this.add(child);
				if (child.score > this.bestScore) {
					this.bestScore = child.score;
					this.lastBest = this.attempts;
					let message = {score:child.score,script:child.script,generation:child.generation};
					postMessage("b:" + JSON.stringify(message));
				}
			}
			this.attempts++;
			if (this.attempts % 100 === 0) {
				postMessage("a:100");
			}
			if (this.attempts - this.lastBest > 1000000) {
				this.reset();
				postMessage('k');
			}
		}			
	}
	
	add(animal) {
		let id = animal.idString();
		if (animal.score > this.bestScore) {
			this.population.unshift(animal);
			this.index.add(animal.idString());
		} else if (!this.index.has(id)){
			this.index.add(id);
			if (animal.score < this.population[this.population.length-1].score) {
				this.population.push(animal);
			} else {
				let start = 0;
				let end = this.population.length-1;
				while (end - start > 1) {
					let mid = Math.floor((end+start)/2);
					if (this.population[mid].score >= animal.score) {
						start = mid;
					} else {
						end = mid;						
					}
				}
				this.population.splice(end,0,animal);
			}
			while (this.population.length > this.max) {
				let lost = this.population.pop();
				this.index.delete(lost.idString());
			}
		}
	}
}

var life = new Life();


onmessage = function(e) {
	life.start(e.data);
};

