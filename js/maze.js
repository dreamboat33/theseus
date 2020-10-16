const Dir = Object.freeze({
	NULL: 0,
	N: 1,
	E: 2,
	S: 4,
	W: 8
});

const Status = Object.freeze({
	WIN: "win",
	LOSE: "lose",
	PLAY: "play"
});

window.Maze = (function() {

	const MINOTAUR_TURNS = 2;

	function Maze(options) {
		this.width = options.width;
		this.height = options.height;
		this.maze = options.maze;
		this.exit = options.exit;
		this.theseus = options.theseus;
		this.minotaur = options.minotaur;
	}

	Maze.prototype.status = function() {
		if (this.theseus === this.minotaur) return Status.LOSE;
		if (this.theseus === this.exit) return Status.WIN;
		return Status.PLAY;
	};

	Maze.prototype._move = function(location, dir) {
		switch (dir) {
			case Dir.N: return location - this.width;
			case Dir.E: return location + 1;
			case Dir.S: return location + this.width;
			case Dir.W: return location - 1;
		}
		return location;
	}

	Maze.prototype.tryMove = function(dir) {
		if (this.status() !== Status.PLAY) return null;
		if (dir === Dir.NULL || (this.maze[this.theseus] & dir)) {
			var theseus = this._move(this.theseus, dir);
			var minotaur = this.minotaur;
			var dirs = [];
			for (var i = 0; i < MINOTAUR_TURNS; i++) {
				var theseusX = theseus % this.width;
				var minotaurX = minotaur % this.width;
				var minotaurDir = null;
				if (theseusX < minotaurX && (this.maze[minotaur] & Dir.W)) {
					minotaurDir = Dir.W;
				} else if (theseusX > minotaurX && (this.maze[minotaur] & Dir.E)) {
					minotaurDir = Dir.E;
				}
				if (minotaurDir == null) {
					var theseusY = theseus / this.width | 0;
					var minotaurY = minotaur / this.width | 0;
					if (theseusY < minotaurY && (this.maze[minotaur] & Dir.N)) {
						minotaurDir = Dir.N;
					} else if (theseusY > minotaurY && (this.maze[minotaur] & Dir.S)) {
						minotaurDir = Dir.S;
					}
				}
				if (minotaurDir == null) break;
				dirs.push(minotaurDir);
				minotaur = this._move(minotaur, minotaurDir);
			}
			return {
				dir: {
					theseus: dir,
					minotaur: dirs
				},
				move: {
					theseus: theseus,
					minotaur: minotaur
				}
			};
		}
		return null;
	};

	Maze.prototype.move = function(move) {
		this.theseus = move.theseus;
		this.minotaur = move.minotaur;
	};

	Maze.prototype.solve = function() {
		if (this.status() !== Status.PLAY) return null;

		var start = {
			theseus: this.theseus,
			minotaur: this.minotaur
		};
		var queue = [start], visited = {};
		var solution = null;
		while (queue.length) {
			var move = queue.shift();
			var code = move.minotaur * this.width * this.height + move.theseus;
			if (visited[code]) continue;

			visited[code] = true;
			this.move(move);
			var status = this.status();
			if (status === Status.WIN) {
				solution = move;
				break;
			} else if (status === Status.LOSE) {
				continue;
			}
			for (var dir of [Dir.NULL, Dir.N, Dir.E, Dir.S, Dir.W]) {
				var next = this.tryMove(dir);
				if (next) {
					next.move.parent = move;
					next.move.dir = dir;
					queue.push(next.move);
				}
			}
		}
		this.move(start);

		if (!solution) return null;
		var dirs = [];
		while (solution.parent) {
			dirs.push(solution.dir);
			solution = solution.parent;
		}
		return dirs.reverse();
	};

	return Maze;
})();

/*
VGhhbmtzLCBkYWQsIGZvciBpbnRyb2R1Y2luZyBjb21wdXRlciBhbmQgc29tZSBjb25jZXB0cyBvZiBwcm9ncmFtbWluZyB0byBtZSB3aGVuIEkgd2FzIHlvdW5nLiBUaGF0IHBsYXllZCBhIGh1Z2Ugcm9sZSBpbiBtZSBqb2luaW5nIHRoZSBMYSBTYWxsZSBDb2xsZWdlIENvbXB1dGVyIFRlYW0uCkkgbWlzcyB5b3UsIGRhZC4gTWF5IEdvZCBibGVzcyB5b3VyIHNvdWwgYW5kIGdyYW50IHlvdSBldGVybmFsIHBlYWNlLgoKSW4gTFNDQ1QsIHRoZXJlIHdlcmUgYSBsb3Qgb2YgdHJhaW5pbmcgZXhlcmNpc2VzIGFuZCB0aGVyZSB3YXMgdGhpcyBhdXRvbWF0aWMgb25saW5lIGp1ZGdlIHN5c3RlbSB0aGF0IGxvb2tlZCBsaWtlIG1hZ2ljIHRvIG1lIGF0IHRoZSB0aW1lLgpTb2x2aW5nIFRoZXNldXMgYW5kIHRoZSBNaW5vdGF1ciB3YXMgb25lIG9mIHRoZSBlYXJsaWVzdCBleGVyY2lzZXMgdGhhdCBzdHVtcGVkIG1lLiBJdCBpcyBhbHNvIGEgZnVuIGxpdHRsZSBnYW1lLCBzbyBpdCBoYXMgYSBzcGVjaWFsIHBsYWNlIGluIG15IGhlYXJ0LgpTcGVjaWFsIHRoYW5rcyB0byBFZGR5LWRhcywgR2FyeSBIbywgYW5kIFJvYmVydCBXb25nIGZvciBoZWxwaW5nIG1lIGdyb3cgbXkgaG9iYnkvaW50ZXJlc3QgaW50byBzb21ldGhpbmcgbXVjaCBiaWdnZXIgYW5kIG5vdyBhIGpvYiB0aGF0IEkgZW5qb3ku
*/