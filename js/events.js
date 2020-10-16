window.EventHelper = (function() {

	document.addEventListener("touchend", function(e) {
		if (e.cancelable) {
			e.preventDefault();
		}
	});

	function bindTouchEvents(element, eventHandlers) {
		const touchstart = eventHandlers.touchstart;
		const ontouchstart = function(e) {
			_bindSubsequentTouchEvents(e.target, {
				touchmove: eventHandlers.touchmove,
				touchend: eventHandlers.touchend,
				touchcancel: eventHandlers.touchcancel
			});
			touchstart.apply(this, arguments);
		};
		element.addEventListener("touchstart", ontouchstart);

		return {
			unbind: function() {
				element.removeEventListener("touchstart", ontouchstart);
			}
		};
	}

	function _bindSubsequentTouchEvents(target, eventHandlers) {
		var ontouchmove = eventHandlers.touchmove;
		var ontouchend = function() {
			eventHandlers.touchend && eventHandlers.touchend.apply(this, arguments);
			if (ontouchmove) target.removeEventListener("touchmove", ontouchmove);
			target.removeEventListener("touchend", ontouchend);
			target.removeEventListener("touchcancel", ontouchcancel);
		};
		var ontouchcancel = function() {
			eventHandlers.touchcancel && eventHandlers.touchcancel.apply(this, arguments);
			if (ontouchmove) target.removeEventListener("touchmove", ontouchmove);
			target.removeEventListener("touchend", ontouchend);
			target.removeEventListener("touchcancel", ontouchcancel);
		};

		if (ontouchmove) {
			target.addEventListener("touchmove", ontouchmove);
		}
		target.addEventListener("touchend", ontouchend);
		target.addEventListener("touchcancel", ontouchcancel);
	}

	function getEventCoord(e) {
		return e.touches && e.touches.length ? e.touches[0] : e.changedTouches ? e.changedTouches[0] : e;
	}

	function distSqr(x1, y1, x2, y2) {
		return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
	}

	(function swipeEvent() {

		const THRESHOLD = 20;
		const TIMEOUT = 500;

		var $element = null;
		var time = null;
		var xStart = null;
		var yStart = null;
		var xPrev = null;
		var yPrev = null;
		var dir = null;

		function reset() {
			$element = null;
			time = null;
			xStart = null;
			yStart = null;
			xPrev = null;
			yPrev = null;
			dir = null;
		}

		function compute(e, oldX, oldY, threshold) {
			var xDiff = oldX - getEventCoord(e).clientX;
			var yDiff = oldY - getEventCoord(e).clientY;
			if (Math.abs(xDiff) > Math.abs(yDiff)) {
				if (Math.abs(xDiff) > threshold) {
					return xDiff > 0 ? "left" : "right";
				}
			} else if (Math.abs(yDiff) > threshold) {
				return yDiff > 0 ? "up" : "down";
			}
			return null;
		}

		function update(e) {
			function _isOpposite(d1, d2) {
				return d1 === "left" && d2 === "right"
					|| d1 === "right" && d2 === "left"
					|| d1 === "up" && d2 === "down"
					|| d1 === "down" && d2 === "up";
			}

			var newDir = compute(e, xStart, yStart, THRESHOLD);
			var deltaDir = compute(e, xPrev, yPrev, 0);
			if (dir == null && newDir != null) {
				dir = newDir;
				time = Date.now();
			} else if (dir != null && (dir !== newDir || _isOpposite(dir, deltaDir))) {
				reset();
			}
		}

		function onDown(e) {
			reset();
			$element = e.target;
			xStart = getEventCoord(e).clientX;
			yStart = getEventCoord(e).clientY;
			xPrev = xStart;
			yPrev = yStart;
		}

		function onMove(e) {
			if (!$element) return;
			update(e);
			xPrev = getEventCoord(e).clientX;
			yPrev = getEventCoord(e).clientY;
		}

		function onUp(e) {
			if (!$element) return;

			update(e);
			if (!$element || !dir || Date.now() - time > TIMEOUT) {
				reset();
				return;
			}

			var eventData = {
				dir: dir,
				xStart: xStart,
				xEnd: getEventCoord(e).clientX,
				yStart: yStart,
				yEnd: getEventCoord(e).clientY
			};

			$element.dispatchEvent(new CustomEvent("swipe", { bubbles: true, cancelable: true, detail: eventData }));
			reset();
		}

		document.addEventListener("mousedown", onDown);
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);

		bindTouchEvents(document, {
			touchstart: onDown,
			touchmove: onMove,
			touchend: onUp,
			touchcancel: reset
		});
	})();

	(function singleTapEvent() {

		const SCROLL_DISPLACEMENT_THRESHOLD = 20;

		const AnyScroll = (function() {
			var $scrollElement = null;
			var scrollTop = null;
			var scrollLeft = null;
			var delta = 0;

			function onScroll(e) {
				if (e.target !== $scrollElement) {
					$scrollElement = e.target;
					scrollTop = e.target.scrollTop;
					scrollLeft = e.target.scrollLeft;
					delta = 0;
				} else {
					delta += Math.sqrt(distSqr(scrollLeft, $scrollElement.scrollLeft, scrollTop, $scrollElement.scrollTop));
					if (delta > SCROLL_DISPLACEMENT_THRESHOLD) {
						reset();
					}
				}
			}

			return {
				listen: function() {
					$scrollElement = null;
					document.addEventListener("scroll", onScroll, true);
				},
				unlisten: function() {
					$scrollElement = null;
					document.removeEventListener("scroll", onScroll, true);
				}
			};
		})();

		var $element = null;
		var time = null;

		function onDown(e) {
			$element = e.target;
			time = Date.now();
			AnyScroll.listen();
		}

		function onUp(e) {
			var x = getEventCoord(e).clientX;
			var y = getEventCoord(e).clientY;
			var target = document.elementFromPoint(x, y);
			if ($element === target) {
				var eventData = {
					x: x,
					y: y,
					time: Date.now() - time
				};
				$element.dispatchEvent(new CustomEvent("tap", { bubbles: true, cancelable: true, detail: eventData }));
			}
			reset();
		}

		function reset() {
			$element = null;
			time = null;
			AnyScroll.unlisten();
		}

		document.addEventListener("mousedown", onDown);
		document.addEventListener("mouseup", onUp);

		bindTouchEvents(document, {
			touchstart: onDown,
			touchend: onUp,
			touchcancel: reset
		});
	})();

	(function doubleTapEvent() {

		const THRESHOLD = 20;
		const TIMEOUT = 500;

		var count = 0;
		var time = null;
		var x = null;
		var y = null;

		function reset() {
			count = 0;
			time = null;
			x = null;
			y = null;
		}

		function update(e) {
			if (distSqr(x, y, getEventCoord(e).clientX, getEventCoord(e).clientY) >= THRESHOLD * THRESHOLD) {
				reset();
			}
		}

		function onDown(e) {
			if (count == 0 || Date.now() - time > TIMEOUT) {
				count = 1;
				time = Date.now();
				x = getEventCoord(e).clientX;
				y = getEventCoord(e).clientY;
			} else {
				count++;
			}
		}

		function onMove(e) {
			if (count == 0) return;
			update(e);
		}

		function onUp(e) {
			if (count == 0) return;
			if (Date.now() - time > TIMEOUT) {
				reset();
				return;
			}
			update(e);
			if (count >= 2) {
				var eventData = {
					xStart: x,
					xEnd: getEventCoord(e).clientX,
					yStart: y,
					yEnd: getEventCoord(e).clientY
				};
				e.target.dispatchEvent(new CustomEvent("doubletap", { bubbles: true, cancelable: true, detail: eventData }));
				reset();
			}
		}

		document.addEventListener("mousedown", onDown);
		document.addEventListener("mousemove", onMove);
		document.addEventListener("mouseup", onUp);

		bindTouchEvents(document, {
			touchstart: onDown,
			touchmove: onMove,
			touchend: onUp,
			touchcancel: reset
		});
	})();

	(function emulatedHoverClass() {
		const HOVER_CLASS = "mouse-hover";
		var $element;
		function reset() {
			if (!$element) return;
			for (var node = $element; node; node = node.parentElement) {
				node.classList.remove(HOVER_CLASS);
			}
			$element = null;
		}
		document.addEventListener("mouseover", function(e) {
			reset();
			$element = e.target;
			for (var node = e.target; node; node = node.parentElement) {
				node.classList.add(HOVER_CLASS);
			}
		});
		document.addEventListener("mouseout", function(e) {
			reset();
		});
	})();

	(function emulatedActiveClass() {
		const ACTIVE_CLASS = "pointer-down";
		var $element;
		function reset() {
			if (!$element) return;
			for (var node = $element; node; node = node.parentElement) {
				node.classList.remove(ACTIVE_CLASS);
			}
			$element = null;
		}
		function onDown(e) {
			reset();
			$element = e.target;
			for (var node = e.target; node; node = node.parentElement) {
				node.classList.add(ACTIVE_CLASS);
			}
		}
		function onUp(e) {
			reset();
		}
		document.addEventListener("mousedown", onDown);
		document.addEventListener("mouseup", onUp);
		bindTouchEvents(document, {
			touchstart: onDown,
			touchend: onUp,
			touchcancel: reset
		});
	})();

	return Object.freeze({
		debounce: function(func, delay) {
			var timeoutId = null;
			return function() {
				var context = this;
				var args = arguments;
				if (timeoutId != null) {
					clearTimeout(timeoutId);
				}
				timeoutId = setTimeout(function() {
					func.apply(context, args);
					timeoutId = null;
				}, delay);
			};
		},
		getEventCoord: getEventCoord,
		bindTouchEvents: bindTouchEvents
	});
})();
