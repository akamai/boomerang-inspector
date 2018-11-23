	/**
	 * JSURL reserved value map
	 */
	var JSURL_RESERVED = {
		"true": true,
		"false": false,
		"null": null
	};

	/**
	 * Converts from JSURL to JSON
	 * Adapted from https://github.com/Sage/jsurl

	 * @param {string} s JSURL string
	 *
	 * @returns {object} Decompressed object
	 */
	jsUrlDecompress = function(s) {
		if (typeof s !== "string") {
			return s;
		}

		var i = 0;
		var len = s.length;

		/**
		 * Eats the specified character, and throws an exception if another character
		 * was found
		 *
		 * @param {string} expected Expected string
		 */
		function eat(expected) {
			if (s.charAt(i) !== expected) {
				throw new Error("bad JSURL syntax: expected " + expected + ", got " + (s && s.charAt(i))
					+ " from:" + s
					+ " length:" + s.length.toString()
					+ " char at:" + s.charAt(i));
			}

			i++;
		}

		/**
		 * Decodes the next value
		 *
		 * @returns {string} Next value
		 */
		function decode() {
			var beg = i;
			var ch;
			var r = "";

			// iterate until we reach the end of the string or "~" or ")"
			while (i < len && (ch = s.charAt(i)) !== "~" && ch !== ")") {
				switch (ch) {
				case "*":
					if (beg < i) {
						r += s.substring(beg, i);
					}

					if (s.charAt(i + 1) === "*") {
						// Unicode characters > 0xff (255), which are encoded as "**[4-digit code]"
						r += String.fromCharCode(parseInt(s.substring(i + 2, i + 6), 16));
						beg = (i += 6);
					}
					else {
						// Unicode characters <= 0xff (255), which are encoded as "*[2-digit code]"
						r += String.fromCharCode(parseInt(s.substring(i + 1, i + 3), 16));
						beg = (i += 3);
					}
					break;

				case "!":
					if (beg < i) {
						r += s.substring(beg, i);
					}

					r += "$";
					beg = ++i;
					break;

				default:
					i++;
				}
			}

			return r + s.substring(beg, i);
		}

		return (function parseOne() {
			var result, ch, beg;

			eat("~");

			switch (ch = s.charAt(i)) {
			case "(":
				i++;
				if (s.charAt(i) === "~") {
					// this is an Array
					result = [];

					if (s.charAt(i + 1) === ")") {
						i++;
					}
					else {
						do {
							result.push(parseOne());
						} while (s.charAt(i) === "~");
					}
				}
				else {
					// this is an object
					result = {};

					if (s.charAt(i) !== ")") {
						do {
							var key = decode();
							result[key] = parseOne();
						} while (s.charAt(i) === "~" && ++i);
					}
				}
				eat(")");
				break;

			case "'":
				i++;
				result = decode();
				break;

			default:
				beg = i++;
				while (i < len && /[^)~]/.test(s.charAt(i))) {
					i++;
				}

				var sub = s.substring(beg, i);

				if (/[\d\-]/.test(ch)) {
					result = parseFloat(sub);
				}
				else {
					result = JSURL_RESERVED[sub];

					if (typeof result === "undefined") {
						throw new Error("bad value keyword: " + sub);
					}
				}
			}

			return result;
		}());
	};


		/**
		 * Decompresses URL-transmitted BoomerangErrors back into the full object
		 *
		 * @params {BoomerangError[]} errors Errors array
		 *
		 * @returns {BoomerangError[]} Decompressed errors array
		 */
		decompressErrors = function(errors) {
			var i, j, err, frame;
			var SOURCE_APP= 1, VIA_APP= 1;

			// get the origin
			//o = BOOMR.window.location.origin;
                        o = "location";

			for (i = 0; i < errors.length; i++) {
				err = errors[i];

				// 1-count is assumed
				if (err.n) {
					err.count = parseInt(err.n, 10);
				}
				else {
					err.count = 1;
				}

				// timestamp is base-36
				if (err.d) {
					err.timestamp = parseInt(err.d, 36);
				}

				// frames
				err.frames = [];

				if (err.m) {
					err.message = err.m;
				}

				// start reconstructing the stack
				err.stack = err.message ? (err.message + " ") : "";

				// decompress all frames
				if (err.f) {
					for (j = 0; j < err.f.length; j++) {
						frame = err.f[j];

						// replace minimized property names with their full ones
						if (frame.l) {
							frame.lineNumber = parseInt(frame.l, 10);
						}

						if (frame.c) {
							frame.columnNumber = parseInt(frame.c, 10);
						}

						if (frame.f) {
							frame.functionName = frame.f;
						}

						if (frame.w) {
							frame.fileName = frame.w;
						}

						if (frame.wo) {
							frame.fileName = o + frame.wo;
						}

						delete frame.c;
						delete frame.l;
						delete frame.f;
						delete frame.w;
						delete frame.wo;

						err.frames.push(frame);

						// reconstruct the stack
						if (j !== 0) {
							err.stack += "\n";
						}

						err.stack += "at";

						if (frame.functionName) {
							err.stack += " " + frame.functionName;
						}

						if (frame.functionName && frame.fileName) {
							err.stack += " (" + frame.fileName;
						}
						else if (!frame.functionName && frame.fileName) {
							err.stack += " " + frame.fileName;
						}

						if (frame.lineNumber) {
							err.stack += ":" + frame.lineNumber;
						}

						if (frame.columnNumber) {
							err.stack += ":" + frame.columnNumber;
						}

						if (frame.functionName && frame.fileName) {
							err.stack += ")";
						}
					}

					// copy propeties from top frame
					err.lineNumber = err.frames[0].lineNumber;
					err.columnNumber = err.frames[0].columnNumber;
					err.functionName = err.frames[0].functionName;
					err.fileName = err.frames[0].fileName;
				}

				err.events = err.e || [];

				// copy over values or defaults
				err.source = err.s ? err.s : SOURCE_APP;
				err.via = err.v ? err.v : VIA_APP;
				err.type = err.t ? err.t : "Error";

				if (err.x) {
					err.extra = err.x;
				}

				if (err.c) {
					err.code = parseInt(err.c, 10);
				}

				// delete minimized property names
				delete err.c;
				delete err.f;
				delete err.e;
				delete err.s;
				delete err.v;
				delete err.t;
				delete err.m;
				delete err.n;
				delete err.x;
				delete err.d;
			}

			return errors;
		};


//console.log(decompressErrors(jsUrlDecompress("~(~(d~'itomfwgn~m~'GeoComply*20lib*20is*20not*20present*21~v~4))")));
