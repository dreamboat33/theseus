window.Editor = (function() {

	const MIN_WIDTH = 3;
	const MAX_WIDTH = 30;
	const MIN_HEIGHT = 3;
	const MAX_HEIGHT = 30;

	const SAVED_FIELDS = ["width", "height", "maze", "exit", "theseus", "minotaur"];

	function Editor(options) {
		this.view = {
			buttons: options.view.buttons,
			templates: options.view.templates,
			labels: options.view.labels
		};
		this.selectedCells = null;
		this.level = {
			title: "Level Editor",
			width: 3,
			height: 3,
			maze: [
				 6,14,12,
				 7,15,13,
				 3,11, 9
			],
			exit: 0,
			theseus: 2,
			minotaur: 8
		};
		this.loadEditorLevel();
	}

	Editor.prototype.registerComponents = function(components) {
		this.components = components;
		this.registerEventListeners();
	};

	Editor.prototype.registerEventListeners = function() {

		var editor = this;
		var game = this.components.game;

		function _newMaze(maze, oldW, oldH, newW, newH) {
			var newMaze = [];
			for (var y = 0; y < newH; y++) {
				for (var x = 0; x < newW; x++) {
					var cell = x < oldW && y < oldH ? maze[y * oldW + x] : (Dir.N | Dir.E | Dir.S | Dir.W);
					if (x == oldW - 1) cell |= Dir.E;
					if (y == oldH - 1) cell |= Dir.S;

					if (x == 0) cell &= ~Dir.W;
					if (y == 0) cell &= ~Dir.N;
					if (x == newW - 1) cell &= ~Dir.E;
					if (y == newH - 1) cell &= ~Dir.S;
					newMaze.push(cell);
				}
			}
			return newMaze;
		}

		function _newCell(cell, oldW, oldH, newW, newH) {
			var x = cell % oldW;
			var y = cell / oldW | 0;
			return Math.min(y, newH - 1) * newW + Math.min(x, newW - 1);
		}

		function resizeLevel(level, newW, newH) {
			level.maze = _newMaze(level.maze, level.width, level.height, newW, newH);
			for (var name of ["exit", "theseus", "minotaur"]) {
				level[name] = _newCell(level[name], level.width, level.height, newW, newH);
			}
			level.width = newW;
			level.height = newH;
			editor.saveEditorLevel();
			return level;
		}

		this.view.buttons.size.$widthDecrement.addEventListener("tap", function() {
			if (!editor.isEditing() || editor.level.width <= MIN_WIDTH) return;
			resizeLevel(editor.level, editor.level.width - 1, editor.level.height);
			editor.start();
		});
		this.view.buttons.size.$widthIncrement.addEventListener("tap", function() {
			if (!editor.isEditing() || editor.level.width >= MAX_WIDTH) return;
			resizeLevel(editor.level, editor.level.width + 1, editor.level.height);
			editor.start();
		});
		this.view.buttons.size.$heightDecrement.addEventListener("tap", function() {
			if (!editor.isEditing() || editor.level.height <= MIN_HEIGHT) return;
			resizeLevel(editor.level, editor.level.width, editor.level.height - 1);
			editor.start();
		});
		this.view.buttons.size.$heightIncrement.addEventListener("tap", function() {
			if (!editor.isEditing() || editor.level.height >= MAX_HEIGHT) return;
			resizeLevel(editor.level, editor.level.width, editor.level.height + 1);
			editor.start();
		});

		this.view.buttons.mode.$test.addEventListener("tap", function() {
			editor.level.best = (game.maze.solve() || []).length;
			Sections.get("$game").classList.remove("editor-editing");
			editor.clearSelectedCells();
		});
		this.view.buttons.mode.$edit.addEventListener("tap", function() {
			Sections.get("$game").classList.add("editor-editing");
			game.startEditorLevel(editor.level);
		});

		this.view.buttons.$help.addEventListener("tap", function() {
			var messages = [
				["Editor", "This is sandbox mode where you can create and test your own level."],
				["Assets", "Reposition the Minotaur, Theseus and the exit by dragging them around."],
				["Walls", "Select cells by dragging across the maze and then use the <span class='brick-bw-img-icon'></span>"
					+ " buttons (or WASD or arrow keys) to modify walls of the selected cells."],
				["Test Mode", "Play the level by tapping the <span class='play-bw-img-icon'></span> button. You cannot edit the level while in test mode."]
			];

			var $fragment = editor.view.templates.$help.content.cloneNode(true);
			var $bigText = $fragment.querySelector(".big-text");
			var $text = $fragment.querySelector(".text");

			$bigText.textContent = messages[0][0];
			$text.innerHTML = messages[0][1];

			var i = 0;
			var onbeforeclose = function() {
				if (++i < messages.length) {
					$bigText.textContent = messages[i][0];
					$text.innerHTML = messages[i][1];
				} else {
					Overlay.off("beforeclose", onbeforeclose);
					Overlay.close();
				}
				return false;
			};

			Overlay.on("beforeclose", onbeforeclose);
			Overlay.open($fragment);
		});

		(function wallEditEvents() {

			function toggleWalls(dir) {
				var y1 = dir === Dir.S ? editor.selectedCells.maxY : editor.selectedCells.minY;
				var y2 = dir === Dir.N ? editor.selectedCells.minY : editor.selectedCells.maxY;
				var x1 = dir === Dir.E ? editor.selectedCells.maxX : editor.selectedCells.minX;
				var x2 = dir === Dir.W ? editor.selectedCells.minX : editor.selectedCells.maxX;

				var oppo =	dir === Dir.N ? Dir.S :
							dir === Dir.S ? Dir.N :
							dir === Dir.E ? Dir.W :
							dir === Dir.W ? Dir.E : null;

				var delta =	dir === Dir.E ? +1 :
							dir === Dir.W ? -1 :
							dir === Dir.S ? +editor.level.width :
							dir === Dir.N ? -editor.level.width : 0;

				var addWall = false;
				outer: for (var y = y1; y <= y2; y++) {
					for (var x = x1; x <= x2; x++) {
						var id = y * editor.level.width + x;
						if (editor.level.maze[id] & dir) {
							addWall = true;
							break outer;
						}
					}
				}
				for (var y = y1; y <= y2; y++) {
					for (var x = x1; x <= x2; x++) {
						var id = y * editor.level.width + x;
						if (addWall) {
							editor.level.maze[id] &= ~dir;
							editor.level.maze[id + delta] &= ~oppo;
						} else {
							editor.level.maze[id] |= dir;
							editor.level.maze[id + delta] |= oppo;
						}
					}
				}

				editor.saveEditorLevel();
				game.startEditorLevel(editor.level);
			}

			const DIR_MAP = {
				"up": Dir.N,
				"down": Dir.S,
				"left": Dir.W,
				"right": Dir.E
			};
			for (let key in DIR_MAP) {
				editor.view.buttons.wall["$" + key].addEventListener("tap", function() {
					if (!editor.isEditing() || !editor.selectedCells) return;
					toggleWalls(DIR_MAP[key]);
				});
			}

			editor.view.buttons.wall.$delete.addEventListener("tap", function() {
				if (!editor.isEditing() || !editor.selectedCells) return;
				for (var y = editor.selectedCells.minY; y <= editor.selectedCells.maxY; y++) {
					for (var x = editor.selectedCells.minX; x <= editor.selectedCells.maxX; x++) {
						var id = y * editor.level.width + x;
						editor.level.maze[id] = Dir.N | Dir.E | Dir.S | Dir.W;

						if (x === 0) editor.level.maze[id] &= ~Dir.W;
						else editor.level.maze[id - 1] |= Dir.E;

						if (x === editor.level.width - 1) editor.level.maze[id] &= ~Dir.E;
						else editor.level.maze[id + 1] |= Dir.W;

						if (y === 0) editor.level.maze[id] &= ~Dir.N;
						else editor.level.maze[id - editor.level.width] |= Dir.S;

						if (y === editor.level.height - 1) editor.level.maze[id] &= ~Dir.S;
						else editor.level.maze[id + editor.level.width] |= Dir.N;
					}
				}
				editor.saveEditorLevel();
				game.startEditorLevel(editor.level);
			});

			document.addEventListener("keydown", function(e) {
				if (!editor.isEditing() || !editor.selectedCells) return;
				switch (e.key) {
					case "ArrowUp": case "Up":
					case "w": case "W":
						toggleWalls(Dir.N);
						break;
					case "ArrowRight": case "Right":
					case "d": case "D":
						toggleWalls(Dir.E);
						break;
					case "ArrowDown": case "Down":
					case "s": case "S":
						toggleWalls(Dir.S);
						break;
					case "ArrowLeft": case "Left":
					case "a": case "A":
						toggleWalls(Dir.W);
						break;
				}
			});
		})();

		(function mazeGestureEditEvents() {

			function _clamp(min, val, max) {
				return val < min ? min : val > max ? max : val;
			}

			var type = null;
			var time = null;
			var startId = null;
			var endId = null;

			var onDown = function(e) {
				if (!editor.isEditing()) return;

				var rect = game.view.$maze.getBoundingClientRect();
				var size = game.view.cellSize + game.view.borderSize;

				var w = editor.level.width;
				var h = editor.level.height;
				var x = Math.floor((EventHelper.getEventCoord(e).clientX - rect.left) / size);
				var y = Math.floor((EventHelper.getEventCoord(e).clientY - rect.top) / size);
				var id = _clamp(0, y, h - 1) * w + _clamp(0, x, w - 1);

				if (id === editor.level.minotaur) type = "minotaur";
				else if (id === editor.level.theseus) type = "theseus";
				else if (id === editor.level.exit) type = "exit";
				else {
					type = "select";
					time = Date.now();
					startId = id;
					editor.clearSelectedCells();
				}
			};
			var _onMove = function(e) {
				if (!type) return;

				var rect = game.view.$maze.getBoundingClientRect();
				var size = game.view.cellSize + game.view.borderSize;

				var w = editor.level.width;
				var h = editor.level.height;
				var x = Math.floor((EventHelper.getEventCoord(e).clientX - rect.left) / size);
				var y = Math.floor((EventHelper.getEventCoord(e).clientY - rect.top) / size);
				var id = _clamp(0, y, h - 1) * w + _clamp(0, x, w - 1);

				if (type === "select") {
					if (endId == null && (id !== startId || Date.now() - time > 200) || endId != null && endId !== id) {
						var startX = startId % w;
						var startY = startId / w | 0;
						editor.selectCells(Math.min(x, startX), Math.max(x, startX), Math.min(y, startY), Math.max(y, startY));
						endId = id;
					}
				} else if (id !== editor.level[type]) {
					editor.level[type] = id;
					editor.saveEditorLevel();
					game.startEditorLevel(editor.level);
				}
			};
			var onMoveDebounce = EventHelper.debounce(_onMove, 20);
			var onUp = function(e) {
				_onMove(e);
				reset();
			};
			var reset = function() {
				type = null;
				time = null;
				startId = null;
				endId = null;
			};

			game.view.$maze.addEventListener("mousedown", onDown);
			game.view.$maze.addEventListener("mousemove", onMoveDebounce);
			document.addEventListener("mouseup", onUp);

			EventHelper.bindTouchEvents(game.view.$maze, {
				touchstart: onDown,
				touchmove: onMoveDebounce,
				touchend: onUp,
				touchcancel: reset
			});

			game.view.$maze.addEventListener("doubletap", function(e) {
				if (!editor.isEditing()) return;

				var rect = game.view.$maze.getBoundingClientRect();
				var size = game.view.cellSize + game.view.borderSize;

				var w = editor.level.width;
				var h = editor.level.height;
				var x = _clamp(0, Math.floor((e.detail.xEnd - rect.left) / size), w - 1);
				var y = _clamp(0, Math.floor((e.detail.yEnd - rect.top) / size), h - 1);

				editor.selectCells(x, x, y, y);
			});
		})();
	};

	Editor.prototype.start = function() {
		Sections.get("$game").classList.add("editor-active", "editor-editing");
		this.components.game.startEditorLevel(this.level);

		this.view.buttons.size.$widthDecrement.classList.toggle("disabled", this.level.width <= MIN_WIDTH);
		this.view.buttons.size.$widthIncrement.classList.toggle("disabled", this.level.width >= MAX_WIDTH);
		this.view.labels.$width.textContent = this.level.width;

		this.view.buttons.size.$heightDecrement.classList.toggle("disabled", this.level.height <= MIN_HEIGHT);
		this.view.buttons.size.$heightIncrement.classList.toggle("disabled", this.level.height >= MAX_HEIGHT);
		this.view.labels.$height.textContent = this.level.height;

		this.clearSelectedCells();
	};

	Editor.prototype.end = function() {
		this.components.game.endEditorLevel();
		Sections.get("$game").classList.remove("editor-active", "editor-editing");
		this.clearSelectedCells();
	};

	Editor.prototype.isEditing = function() {
		return Sections.get("$game").classList.contains("editor-editing");
	};

	Editor.prototype.clearSelectedCells = function() {
		this.selectedCells = null;
		this.redrawSelectedCells();
	};

	Editor.prototype.selectCells = function(minX, maxX, minY, maxY) {
		this.selectedCells = {
			minX: minX,
			maxX: maxX,
			minY: minY,
			maxY: maxY
		};
		this.redrawSelectedCells();
	};

	Editor.prototype.redrawSelectedCells = function() {
		var $maze = this.components.game.view.$maze;
		if (this.selectedCells == null) {
			$maze.querySelectorAll(".cell.highlight").forEach(function($cell) {
				$cell.classList.remove("highlight");
			});

			for (var key of ["up", "down", "left", "right", "delete"]) {
				this.view.buttons.wall["$" + key].classList.add("disabled");
			}
		} else {
			var minX = this.selectedCells.minX;
			var maxX = this.selectedCells.maxX;
			var minY = this.selectedCells.minY;
			var maxY = this.selectedCells.maxY;
			for (var y = 0; y < this.level.height; y++) {
				for (var x = 0; x < this.level.width; x++) {
					$maze.children[y].children[x].classList.toggle("highlight", minX <= x && x <= maxX && minY <= y && y <= maxY);
				}
			}

			this.view.buttons.wall.$up.classList.toggle("disabled", minY === 0);
			this.view.buttons.wall.$down.classList.toggle("disabled", maxY === this.level.height - 1);
			this.view.buttons.wall.$left.classList.toggle("disabled", minX === 0);
			this.view.buttons.wall.$right.classList.toggle("disabled", maxX === this.level.width - 1);
			this.view.buttons.wall.$delete.classList.remove("disabled");
		}
	};

	Editor.prototype.saveEditorLevel = function() {
		try {
			var data = {};
			for (var key of SAVED_FIELDS) {
				data[key] = this.level[key];
			}
			localStorage.setItem("theseusEditor", JSON.stringify(data));
		} catch (e) {
		}
	};

	Editor.prototype.loadEditorLevel = function() {
		function _clamp(min, val, max) {
			val = +val | 0;
			return val < min ? min : val > max ? max : val;
		}

		try {
			var data = JSON.parse(localStorage.getItem("theseusEditor") || "{}") || {};
			for (var key of SAVED_FIELDS) {
				this.level[key] = data[key] == null ? this.level[key] : data[key];
			}
		} catch (e) {
		}

		this.level.width = _clamp(MIN_WIDTH, this.level.width, MAX_WIDTH);
		this.level.height = _clamp(MIN_HEIGHT, this.level.height, MAX_HEIGHT);

		if (!Array.isArray(this.level.maze)) this.level.maze = [];
		this.level.maze.length = this.level.width * this.level.height;
		for (var y = 0; y < this.level.height; y++) {
			for (var x = 0; x < this.level.width; x++) {
				var i = y * this.level.width + x;
				var cell = this.level.maze[i] & (Dir.N | Dir.E | Dir.S | Dir.W);
				if (x == 0) cell &= ~Dir.W;
				if (y == 0) cell &= ~Dir.N;
				if (x == this.level.width - 1) cell &= ~Dir.E;
				if (y == this.level.height - 1) cell &= ~Dir.S;
				this.level.maze[i] = cell;
			}
		}

		for (var key of ["exit", "theseus", "minotaur"]) {
			this.level[key] = _clamp(0, this.level[key], this.level.maze.length - 1);
		}
	};

	return Editor;
})();