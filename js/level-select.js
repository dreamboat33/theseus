window.LevelSelect = (function() {

	const SCORE_CLASSES = ["score-pass", "score-perfect"];
	const DUMMY_ITEM_COUNT = 50;

	function LevelSelect(options) {
		this.view = {
			buttons: options.view.buttons,
			templates: options.view.templates,
			$levels: options.view.$levels
		};
		this.levels = options.levels;
		this.scores = this.loadScores();
		this.draw();
	}

	LevelSelect.prototype.registerComponents = function(components) {
		this.components = components;
		this.registerEventListeners();
	};

	LevelSelect.prototype.draw = function() {

		while (this.view.$levels.lastChild) {
			this.view.$levels.lastChild.remove();
		}

		for (var i = 0; i < this.levels.length; i++) {
			var $element = document.createElement("div");
			$element.classList.add("level-item");
			if (this.scores[this.levels[i].id]) {
				$element.classList.add(SCORE_CLASSES[this.scores[this.levels[i].id] - 1]);
			}
			$element.textContent = i + 1;
			$element.dataset.id = i;
			this.view.$levels.appendChild($element);
		}

		for (var i = 0; i < DUMMY_ITEM_COUNT; i++) {
			var $element = document.createElement("div");
			$element.classList.add("level-item", "level-item-dummy");
			this.view.$levels.appendChild($element);
		}
	};

	LevelSelect.prototype.registerEventListeners = function() {
		var levelSelect = this;
		var game = this.components.game;

		this.view.$levels.addEventListener("tap", function(e) {
			if (!e.target.matches(".level-item:not(.level-item-dummy)")) return;
			Sections.push("$game");
			game.setLevel(+e.target.dataset.id);
			e.stopPropagation();
			e.preventDefault();
		});

		this.view.buttons.$close.addEventListener("tap", function() {
			Sections.pop();
		});

		this.view.buttons.$clear.addEventListener("tap", function() {
			var fragment = levelSelect.view.templates.$confirmClear.content.cloneNode(true);
			fragment.querySelector(".button.confirm-symbol").addEventListener("tap", function() {
				levelSelect.clearScores();
				Overlay.close();
			});
			fragment.querySelector(".button.close-symbol").addEventListener("tap", function() {
				Overlay.close();
			});
			Overlay.open(fragment);
		});
	};

	LevelSelect.prototype.clearScores = function() {
		var $elements = this.view.$levels.querySelectorAll(SCORE_CLASSES.map(x => "." + x).join(", "));
		for (var $element of $elements) {
			$element.classList.remove.apply($element.classList, SCORE_CLASSES);
		}
		this.scores = {};
		this.saveScores();
	};

	LevelSelect.prototype.loadScores = function() {
		try {
			return JSON.parse(localStorage.getItem("theseusLevel") || "{}") || {};
		} catch (e) {
			return {};
		}
	};

	LevelSelect.prototype.saveScores = function() {
		try {
			localStorage.setItem("theseusLevel", JSON.stringify(this.scores));
		} catch (e) {
		}
	};

	LevelSelect.prototype.updateLevelScore = function(level, score) {
		if (!this.levels[level].id) return;
		if (score > (this.scores[this.levels[level].id] || 0)) {
			this.scores[this.levels[level].id] = score;
			this.saveScores();
			var $element = this.view.$levels.querySelectorAll(".level-item")[level];
			$element.classList.remove.apply($element.classList, SCORE_CLASSES);
			$element.classList.add(SCORE_CLASSES[score - 1]);
		}
	};

	return LevelSelect;
})();