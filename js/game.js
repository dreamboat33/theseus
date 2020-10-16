window.Game = (function() {

	const POPUP_MESSAGES = {
		STUCK: {
			template: "$fail",
			title: ["DOOMED", "STUCK"],
			body: [
				"The Minotaur has you cornered.",
				"Caught between a rock and a hard place."
			]
		},
		FAIL: {
			template: "$fail",
			title: ["WELP", "TRY AGAIN"],
			body: [
				"The Minotaur caught you.",
				"Don't give up just yet."
			]
		},
		PASS: {
			template: "$pass",
			title: ["PASS"],
			body: [
				"You can do better than ${moves} moves.<br>Wanna retry?",
				"You could have spent less time with the Minotaur.<br>Try finding a solution shorter than ${moves} moves."
			]
		},
		ASSISTED: {
			template: "$pass",
			title: ["GREAT"],
			body: [
				"You escaped in ${moves} moves.<br>But can you do that without using undo or hint?"
			]
		},
		PERFECT: {
			template: "$perfect",
			title: ["BRAVO", "PERFECT", "WELL DONE"],
			body: [
				"Flawless victory in ${moves} moves!"
			]
		}
	};

	function Game(options) {
		this.view = {
			buttons: options.view.buttons,
			templates: options.view.templates,
			$title: options.view.$title,
			$maze: options.view.$maze,
			$mazeWrapper: options.view.$mazeWrapper
		};
		this.level = -1;
		this.levels = options.levels;
		this.isEditorLevel = false;
		this.assisted = false;
		this.animation = true;
		this.isAnimating = false;
		this.bufferedMove = null;
		this.solution = null;
	}

	Game.prototype.isActive = function() {
		return Sections.get("$game").classList.contains("active");
	};

	Game.prototype.registerComponents = function(components) {
		this.components = components;
		this.registerEventListeners();
	};

	Game.prototype.registerEventListeners = function() {

		var game = this;
		var editor = this.components.editor;

		this.view.buttons.$prev.addEventListener("tap", function() {
			game.setLevel(game.level - 1);
		});
		this.view.buttons.$next.addEventListener("tap", function() {
			game.setLevel(game.level + 1);
		});
		this.view.buttons.$reset.addEventListener("tap", function() {
			game.setLevel(game.level);
		});
		this.view.buttons.$undo.addEventListener("tap", function() {
			game.undo();
		});
		this.view.buttons.$hint.addEventListener("tap", function() {
			game.hint();
		});
		this.view.buttons.$close.addEventListener("tap", function() {
			if (game.isShowingMessages()) game.finishMessages();
			Sections.pop();
			editor.end();
		});

		window.addEventListener("resize", EventHelper.debounce(function() {
			if (game.isActive()) {
				game.draw();
			}
		}, 100));

		document.addEventListener("keydown", function(e) {
			if (game.isActive() && !game.isShowingMessages() && !editor.isEditing()) {
				switch (e.key) {
					case "ArrowUp": case "Up":
					case "w": case "W":
						game.play(Dir.N);
						break;
					case "ArrowRight": case "Right":
					case "d": case "D":
						game.play(Dir.E);
						break;
					case "ArrowDown": case "Down":
					case "s": case "S":
						game.play(Dir.S);
						break;
					case "ArrowLeft": case "Left":
					case "a": case "A":
						game.play(Dir.W);
						break;
					case " ": case "Spacebar":
						game.play(Dir.NULL);
						break;
					case "Backspace":
						game.undo();
						break;
				}
			}
		});

		this.view.$maze.addEventListener("swipe", function(e) {
			if (game.isActive() && !game.isShowingMessages() && !editor.isEditing()) {
				switch (e.detail.dir) {
					case "up": game.play(Dir.N); break;
					case "right": game.play(Dir.E); break;
					case "down": game.play(Dir.S); break;
					case "left": game.play(Dir.W); break;
				}
			}
		});

		this.view.$maze.addEventListener("doubletap", function() {
			if (game.isActive() && !game.isShowingMessages() && !editor.isEditing()) {
				game.play(Dir.NULL);
			}
		});
	};

	Game.prototype.isShowingMessages = function() {
		return this._beforecloseListener != null;
	};

	Game.prototype.showMessages = function(messages) {
		if (messages == null || messages.length == 0) return;

		var game = this;
		var $fragment = this.view.templates.$message.content.cloneNode(true);
		var $text = $fragment.querySelector(".text");

		var i = 0;
		$text.innerHTML = messages[i++];
		this._beforecloseListener = function() {
			if (i < messages.length) {
				$text.innerHTML = messages[i++];
			} else {
				game.finishMessages();
			}
			return false;
		};
		Overlay.on("beforeclose", this._beforecloseListener);

		Overlay.open($fragment);
	};

	Game.prototype.finishMessages = function() {
		Overlay.off("beforeclose", this._beforecloseListener);
		Overlay.close();
		this._beforecloseListener = null;
	};

	Game.prototype.setLevel = function(level) {
		this.level = level;
		this.maze = new Maze(this.levels[level]);
		this.assisted = false;
		this.solution = null;
		this.view.$title.textContent = this.levels[level].title || "Level " + (level + 1);
		this.view.buttons.$prev.classList.toggle("disabled", level <= 0);
		this.view.buttons.$next.classList.toggle("disabled", level >= this.levels.length - 1);

		this.history = [{
			theseus: this.maze.theseus,
			minotaur: this.maze.minotaur
		}];
		this.historyIndex = 0;
		this.showMessages(this.levels[level].messages);
		this.draw();
	};

	Game.prototype.setAnimation = function(animation) {
		this.animation = animation;
	};

	Game.prototype.popup = function(key, moveCount) {
		var game = this;
		var details = POPUP_MESSAGES[key];

		var $fragment = this.view.templates[details.template].content.cloneNode(true);
		$fragment.querySelector(".big-text").textContent = details.title[Math.random() * details.title.length | 0];
		$fragment.querySelector(".text").innerHTML = details.body[Math.random() * details.body.length | 0].replace(/\$\{moves\}/gi, moveCount);

		$fragment.querySelector(".button.reset-symbol").addEventListener("tap", function() {
			Overlay.close();
			game.setLevel(game.level);
		});

		var $nextButton = $fragment.querySelector(".button.next-symbol");
		if ($nextButton) {
			if (this.level >= this.levels.length - 1) {
				$nextButton.classList.add("disabled");
			} else {
				$nextButton.addEventListener("tap", function() {
					Overlay.close();
					game.setLevel(game.level + 1);
				});
			}
		}

		Overlay.open($fragment);
	};

	Game.prototype.draw = function() {

		while (this.view.$maze.lastChild) {
			this.view.$maze.lastChild.remove();
		}

		const MIN_BORDER_SIZE = 1;
		const MAX_BORDER_SIZE = 5;
		const PADDING = 20;

		var rect = this.view.$mazeWrapper.getBoundingClientRect();
		var targetSize = Math.min((rect.width - MAX_BORDER_SIZE - PADDING) / this.maze.width, (rect.height - MAX_BORDER_SIZE - PADDING) / this.maze.height) | 0;
		var borderSize = Math.max(MIN_BORDER_SIZE, Math.min(targetSize / 10 | 0, MAX_BORDER_SIZE));
		var cellSize = targetSize - borderSize;

		this.animating = false;
		this.view.cellSize = cellSize;
		this.view.borderSize = borderSize;

		function $_newWall(dir, active) {
			var $wall = document.createElement("div");
			$wall.classList.add("wall");
			switch (dir) {
				case Dir.N:
				case Dir.S: {
					$wall.classList.add(dir === Dir.N ? "wall-n" : "wall-s");
					$wall.style.width = cellSize + borderSize * 2 + "px";
					$wall.style.height = borderSize + "px";
					break;
				}
				case Dir.E:
				case Dir.W: {
					$wall.classList.add(dir === Dir.E ? "wall-e" : "wall-w");
					$wall.style.width = borderSize + "px";
					$wall.style.height = cellSize + borderSize * 2 + "px";
					break;
				}
			}
			if (active) $wall.classList.add("wall-active");
			return $wall;
		}

		for (var y = 0; y < this.maze.height; y++) {
			var $row = document.createElement("div");
			$row.classList.add("row");
			for (var x = 0; x < this.maze.width; x++) {
				var $cell = document.createElement("div");
				$cell.classList.add("cell");
				$cell.style.width = cellSize + "px";
				$cell.style.height = cellSize + "px";
				$cell.style.paddingLeft = borderSize + "px";
				$cell.style.paddingTop = borderSize + "px";

				var id = y * this.maze.width + x;
				if (this.maze.exit === id) {
					$cell.classList.add("exit");
				}

				var cell = this.maze.maze[id];
				$cell.appendChild($_newWall(Dir.N, !(cell & Dir.N)));
				$cell.appendChild($_newWall(Dir.W, !(cell & Dir.W)));
				if (x == this.maze.width - 1) {
					$cell.style.paddingRight = borderSize + "px";
					$cell.appendChild($_newWall(Dir.E, !(cell & Dir.E)));
				}
				if (y == this.maze.height - 1) {
					$cell.style.paddingBottom = borderSize + "px";
					$cell.appendChild($_newWall(Dir.S, !(cell & Dir.S)));
				}

				$row.appendChild($cell);
			}
			this.view.$maze.appendChild($row);
		}

		for (var name of ["theseus", "minotaur"]) {
			var $element = document.createElement("div");
			$element.classList.add(name);
			$element.style.pointerEvents = "none";
			$element.style.width = cellSize + "px";
			$element.style.height = cellSize + "px";
			this.view.$maze.appendChild($element);
			this.view["$" + name] = $element;
		}

		this.redraw();

		if (this.components.editor.isEditing()) {
			this.components.editor.redrawSelectedCells();
		}
	};

	Game.prototype.animateMove = function(move) {

		const DURATION = this.animation ? 0.1 : 0;

		function _deltaX(dir) {
			return dir === Dir.E ? 1 : dir === Dir.W ? -1 : 0;
		}
		function _deltaY(dir) {
			return dir === Dir.S ? 1 : dir === Dir.N ? -1 : 0;
		}

		var game = this;
		var levelSelect = this.components.levelSelect;

		this.isAnimating = true;

		var $theseus = this.view.$theseus;
		var $minotaur = this.view.$minotaur;
		var theseusX = this.maze.theseus % this.maze.width;
		var theseusY = this.maze.theseus / this.maze.width | 0;
		var minotaurX = this.maze.minotaur % this.maze.width;
		var minotaurY = this.maze.minotaur / this.maze.width | 0;
		var cellSize = this.view.cellSize;
		var borderSize = this.view.borderSize;

		function _moveMinotaur(i) {
			if (i >= move.minotaur.length) {
				$theseus.style.transition = "";
				$minotaur.style.transition = "";
				game.isAnimating = false;

				var gameStatus = game.maze.status();
				if (gameStatus === Status.LOSE) {
					game.popup("FAIL", null);
				} else if (gameStatus === Status.WIN) {
					var moveCount = game.history.length - 1;
					if (moveCount > game.levels[game.level].best) {
						game.popup("PASS", moveCount);
						levelSelect.updateLevelScore(game.level, 1);
					} else if (game.assisted) {
						game.popup("ASSISTED", moveCount);
						levelSelect.updateLevelScore(game.level, 1);
					} else {
						game.popup("PERFECT", moveCount);
						levelSelect.updateLevelScore(game.level, 2);
					}
				} else if (game.bufferedMove != null) {
					var bufferedMove = game.bufferedMove;
					setTimeout(function() {
						game.play(bufferedMove);
					}, 0);
				}

				game.bufferedMove = null;
				return;
			}
			minotaurX += _deltaX(move.minotaur[i]);
			minotaurY += _deltaY(move.minotaur[i]);
			$minotaur.style.top = minotaurY * (cellSize + borderSize) + borderSize + "px";
			$minotaur.style.left = minotaurX * (cellSize + borderSize) + borderSize + "px";
			setTimeout(function() {
				_moveMinotaur(i + 1);
			}, DURATION * 1000);
		}

		$theseus.style.transition = `top ${DURATION}s, left ${DURATION}s`;
		$minotaur.style.transition = `top ${DURATION}s, left ${DURATION}s`;
		$theseus.style.top = (theseusY + _deltaY(move.theseus)) * (cellSize + borderSize) + borderSize + "px";
		$theseus.style.left = (theseusX + _deltaX(move.theseus)) * (cellSize + borderSize) + borderSize + "px";

		setTimeout(function() {
			_moveMinotaur(0);
		}, DURATION * 1000);
	};

	Game.prototype.redraw = function() {
		var cellSize = this.view.cellSize;
		var borderSize = this.view.borderSize;
		for (var name of ["theseus", "minotaur"]) {
			var $element = this.view["$" + name];
			$element.style.top = (this.maze[name] / this.maze.width | 0) * (cellSize + borderSize) + borderSize + "px";
			$element.style.left = (this.maze[name] % this.maze.width) * (cellSize + borderSize) + borderSize + "px";
		}
	};

	Game.prototype.play = function(dir) {
		if (this.isAnimating) {
			this.bufferedMove = dir;
			return;
		}
		if (Overlay.isOpen()) return;

		var move = this.maze.tryMove(dir);
		if (move == null) return;

		this.history.length = ++this.historyIndex;
		this.history.push(move.move);

		if (this.solution && this.solution.length) {
			if (dir === this.solution[0]) this.solution.shift();
			else this.solution = null;
		}

		this.animateMove(move.dir);
		this.maze.move(move.move);
	};

	Game.prototype.hint = function() {
		if (this.isAnimating || Overlay.isOpen()) return;
		if (this.maze.status() !== Status.PLAY) return;

		this.assisted = true;
		this.solution = this.solution || this.maze.solve() || [];
		if (this.solution.length == 0) {
			this.popup("STUCK", null);
		} else {
			this.play(this.solution[0]);
		}
	};

	Game.prototype.undo = function() {
		if (this.isAnimating || Overlay.isOpen()) return;
		if (this.historyIndex == 0) return;

		this.assisted = true;
		this.maze.move(this.history[--this.historyIndex]);
		if (this.historyIndex == 0) this.assisted = false;
		this.solution = null;
		this.redraw();
	};

	Game.prototype.startEditorLevel = function(level) {
		if (!this.isEditorLevel) {
			this._levels = this.levels;
		}
		this.levels = [level];
		this.setLevel(0);
		this.isEditorLevel = true;
	};

	Game.prototype.endEditorLevel = function() {
		if (this.isEditorLevel) {
			this.levels = this._levels;
			delete this._levels;
		}
		this.isEditorLevel = false;
	};

	return Game;
})();
