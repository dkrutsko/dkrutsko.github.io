////////////////////////////////////////////////////////////////////////////////
// -------------------------------------------------------------------------- //
//                                                                            //
//                        (C) 2012-2016  David Krutsko                        //
//                                                                            //
// -------------------------------------------------------------------------- //
////////////////////////////////////////////////////////////////////////////////

"use strict";

//----------------------------------------------------------------------------//
// Application                                                                //
//----------------------------------------------------------------------------//

////////////////////////////////////////////////////////////////////////////////

$(function()
{
	////////////////////////////////////////////////////////////////////////////////
	/// Shim for requesting a single animation frame

	var requestAnimationFrame = function()
	{
		return window.requestAnimationFrame    ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			window.oRequestAnimationFrame      ||
			window.msRequestAnimationFrame     ||
			function (callback) {
				window.setTimeout (callback, 1000 / 60);
			};
	}();

	////////////////////////////////////////////////////////////////////////////////
	/// Ease in-out exponential easing

	function easeInOutExpo (t)
	{
		var value = 1.0; if (t < 0.5)
			value = 8 * t * t * t * t;

		else
		{
			t = t - 1;
			value = 8 * t * t * t * t;
			value = 1 - value;
		}

		return (value > 1) ? 1 : value;
	}

	////////////////////////////////////////////////////////////////////////////////
	/// Creates and controls the skills section doughnut charts

	$.fn.doughnut = function (options)
	{
		// Set constant values
		var w = this.width ();
		var h = this.height();
		var centerX = w * 0.5;
		var centerY = h * 0.5;

		var dRadius = Math.min
			(centerX, centerY) - 10;
		var cRadius = dRadius * .25;

		// Check doughnut validity and begin showing it
		if (options === "show" && this.data ("doughnut"))
		{
			var count = 0, steps = 1/60;
			// Retrieve attached doughnut data
			var data = this.data ("doughnut");

			// One animation frame
			var frame = function()
			{
				count += steps;
				// Skip animation on mobile
				if (isMobile()) count = 1;

				// Radius to start animating from
				var startRadius = -Math.PI * 0.5;

				var twoPi = Math.PI * 2;
				// Get the current rotation angle
				var current =  easeInOutExpo (count);
				data.group.attr ("opacity", current);

				// Update each path based on frame progress
				for (var i = 0; i < data.data.length; ++i)
				{
					var angle = current * (data.data[i].
								value / data.total * twoPi);
					var stopRadius =  (startRadius + angle);

					// Determine the current radius value using the skill value
					var radius = data.sstep * data.data[i].skill + cRadius + 3;

					var sx1 = centerX + Math.cos (startRadius) *  radius;
					var sy1 = centerY + Math.sin (startRadius) *  radius;
					var tx1 = centerX + Math.cos ( stopRadius) *  radius;
					var ty1 = centerY + Math.sin ( stopRadius) *  radius;
					var sx2 = centerX + Math.cos ( stopRadius) * cRadius;
					var sy2 = centerY + Math.sin ( stopRadius) * cRadius;
					var tx2 = centerX + Math.cos (startRadius) * cRadius;
					var ty2 = centerY + Math.sin (startRadius) * cRadius;

					var command =
					[
						"M", sx1, sy1,
						"A",  radius,  radius, 0, 0, 1, tx1, ty1, // Outer
						"L", sx2, sy2,
						"A", cRadius, cRadius, 0, 0, 0, tx2, ty2, // Inner
						"Z"
					];

					// Apply the path data
					data.paths[i].attr ("d",
						command.join (" "));
					startRadius += angle;
				}

				if (count < 1)
					// Queue next animation frame
					requestAnimationFrame (frame);
			};

			// Fade doughnut group element
			data.group.stop().fadeIn (0);

			// Start the animation routine
			requestAnimationFrame (frame);
		}

		// Check doughnut validity and begin hiding it
		if (options === "hide" && this.data ("doughnut"))
		{
			// Retrieve attached doughnut data
			var data = this.data ("doughnut");

			// Fade doughnut group element
			data.group.stop().fadeOut (600);
		}

		// Create the doughnut
		if ($.isArray (options))
		{
			this.empty(); var data = { };
			// Create an empty data value
			this.data ("doughnut", data);
			data.data = options;

			var tip = $("#skills-tooltip");
			// Called when entering a path
			var pathEnter = function (event)
			{
				tip.text ($(this).data ("label"));
				pathMove (event); tip.show();
			}

			// Called when leaving a path
			var pathLeave = function (event)
			{
				tip.hide();
			}

			// Called when moving in a path
			var pathMove = function (event)
			{
				var x = 0;
				var y = 0;

				if (event.originalEvent.touches)
				{
					x = event.originalEvent.touches[0].pageX +  0;
					y = event.originalEvent.touches[0].pageY - 20;
				}

				else
				{
					x = event.pageX;
					y = event.pageY;
				}

				tip.css
				({
					left: x - 10 - tip.width () / 2,
					 top: y - 10 - tip.height()
				});
			}

			// Create the doughnut SVG and append it to the DOM
			data.svg = $('<svg width="' + w + '" height="' + h +
					  '" viewBox="0 0 ' + w + ' ' + h + '" />');
			data.svg.appendTo (this);

			// Create a group for svg path elements
			data.group = $(document.createElementNS
				("http://www.w3.org/2000/svg", "g"))
				.appendTo (data.svg);

			data.max = 0; data.total = 0; data.paths = [ ];
			// Loop data and add the new slice paths
			for (var i = 0; i < options.length; ++i)
			{
				// Update the max skill value
				if (data.max < options[i].skill)
					data.max = options[i].skill;

				data.total += options[i].value;
				// Create and add new slice path to the SVG
				data.paths[i] = $(document.createElementNS
					("http://www.w3.org/2000/svg", "path"))
					.appendTo (data.group);

				data.paths[i].on ("touchstart", pathEnter);
				data.paths[i].on ("mouseenter", pathEnter);
				data.paths[i].on ("mouseleave", pathLeave);
				data.paths[i].on ("mousemove" , pathMove );

				data.paths[i].data ("label", options[i].label);
			}

			// Determine single skill-step radius value
			data.sstep = (dRadius - cRadius) / data.max;

			data.scale = [ ];
			for (var i = 0; i < data.max; ++i)
			{
				data.scale[i] = $(document.createElementNS
					("http://www.w3.org/2000/svg", "circle"))
					.prependTo (data.svg);

				// Determine the current skill radius value
				var radius = data.sstep * (i + 1) + cRadius;

				data.scale[i].attr
				({
					"cx" : centerX,
					"cy" : centerY,
					"r"  : radius
				});
			}
		}

		return this;
	};

	////////////////////////////////////////////////////////////////////////////////
	/// Checks if an element is scrolled into view

	function isScrolledIntoView (element)
	{
		var view = $(window ).scrollTop()  + $(window ).height();
		var elem = $(element).offset().top + $(element).height();
		return view >= elem;
	}

	////////////////////////////////////////////////////////////////////////////////
	/// Returns true if the current browser is mobile

	function isMobile()
	{
		return /Android|webOS|iPhone|iPad|iPod|BlackBerry/i.test (navigator.userAgent);
	}

	////////////////////////////////////////////////////////////////////////////////

	// Create a new polar doughnut for the lang part
	var langChart = $("#skills .lang .chart").doughnut
	([
		{ value: 25, skill: 5, label: "C/C++"			},
		{ value: 20, skill: 4, label: "JavaScript"		},
		{ value:  5, skill: 4, label: "C#"				},
		{ value:  5, skill: 4, label: "Java"			},
		{ value: 10, skill: 5, label: "HTML 5"			},
		{ value: 10, skill: 5, label: "CSS 3"			},
		{ value:  5, skill: 3, label: "Lua"				},
		{ value: 10, skill: 1, label: "Objective-C"		},
		{ value:  5, skill: 2, label: "GLSL"			},
		{ value:  5, skill: 2, label: "x86 Assembly"	}
	]);

	// Create a new polar doughnut for the tech part
	var techChart = $("#skills .tech .chart").doughnut
	([
		{ value: 20, skill: 5, label: "Qt"				},
		{ value:  5, skill: 2, label: "OpenGL"			},
		{ value:  5, skill: 2, label: "SDL"				},
		{ value: 15, skill: 4, label: "System APIs"		},
		{ value:  5, skill: 3, label: "WPF"				},
		{ value: 20, skill: 5, label: "Node.js"			},
		{ value: 10, skill: 4, label: "JQuery"			},
		{ value: 10, skill: 5, label: "ReactJS"			},
		{ value: 10, skill: 4, label: "Webpack/Gulp"	},
	]);

	// Create a new polar doughnut for the tool part
	var toolChart = $("#skills .tool .chart").doughnut
	([
		{ value: 20, skill: 5, label: "Visual Studio"	},
		{ value:  5, skill: 4, label: "GCC/Make"		},
		{ value:  5, skill: 2, label: "Unity"			},
		{ value: 10, skill: 4, label: "GitHub"			},
		{ value: 20, skill: 5, label: "Photoshop"		},
		{ value: 10, skill: 4, label: "Illustrator"		},
		{ value: 10, skill: 5, label: "MS Office"		},
		{ value:  5, skill: 2, label: "Softimage"		},
		{ value:  5, skill: 3, label: "FL Studio"		},
		{ value: 10, skill: 2, label: "IDA Pro"			}
	]);

	if (!isMobile())
	{
		// Generic smooth scrolling header buttons
		$(".smooth-scroll").click (function (event)
		{
			event.preventDefault();

			// Retrieve the destination id
			var lnk = $(this).attr ("href");
			var top = $(lnk ).offset().top - 58;

			// Smoothly scroll to that id
			$("body, html").stop().animate
				({ scrollTop: top }, 800);
		});

		// Enable use of the scroller
		$(window).scroll (function()
		{
			$(this).scrollTop() < 200 ?
				$("#scroller").stop().fadeOut (600) :
				$("#scroller").stop().fadeIn  (600);
		});

		// Enable smooth scrolling to top
		$("#scroller").click (function()
		{
			$("body, html").stop().animate
				({ scrollTop: 0 }, 800);
		});

		// Enable image blurring FX
		$(window).scroll (function()
		{
			$(".scroll-blur .blurred").each (function()
			{
				// Determine start of transition
				var view = $(this).offset().top -
					$(document).scrollTop() + 0;

				// Edge case for fixed position sections
				if ($(this).css ("position") === "fixed")
					view = -$(document).scrollTop();

				// Compute the targets opacity
				var h = $(this).height() - 0;
				var opacity = (h + view) / h;

				// Increase the speed of the blur transition
				if (opacity < 1) opacity = opacity * 3 - 2;

				// Negate the opacity
				opacity = 1 - opacity;

				// Clamp and set the opacity value of the target
					 if (opacity > 1) $(this).css ("opacity", 1);
				else if (opacity < 0) $(this).css ("opacity", 0);
				else $(this).css ("opacity", opacity);
			});
		});

		(function()
		{
			// Create an HTML5 video tag for looping header video
			var video = $('<video src="images/header.mp4" loop>');

			// Show and play the video when loaded
			video.on ("loadedmetadata", function() {
				this.play(); $("#header .regular").fadeOut (2000);
			});

			// Add the new video tag to the document
			$("#header .scroll-blur").prepend (video);
		})();

		// Helper to display the charts
		var displayCharts = function()
		{
			if (isScrolledIntoView ("#skills"))
			{
				setTimeout (function()
				{
					langChart.doughnut ("show");
					$("#skills .lang .icon").fadeIn (1200);
					$("#skills .lang h1"   ).fadeIn (1200);
					$("#skills .lang h2"   ).fadeIn (1200);

				}, 0);

				setTimeout (function()
				{
					techChart.doughnut ("show");
					$("#skills .tech .icon").fadeIn (1200);
					$("#skills .tech h1"   ).fadeIn (1200);
					$("#skills .tech h2"   ).fadeIn (1200);

				}, 400);

				setTimeout (function()
				{
					toolChart.doughnut ("show");
					$("#skills .tool .icon").fadeIn (1200);
					$("#skills .tool h1"   ).fadeIn (1200);
					$("#skills .tool h2"   ).fadeIn (1200);

				}, 800);

				// Turn off further scroll notifications
				$(window).off ("scroll", displayCharts);
			}
		}

		// Begin displaying skill charts
		$(window).scroll (displayCharts);

		(function()
		{
			// Create the interactive tile container
			var contact = $('<div class="tiles" />')
							.prependTo ("#contact");

			// Append interactive tiles
			for (var y = 0; y <  6; ++y)
			for (var x = 0; x < 20; ++x)
			{
				$('<div class="tile" style="left: ' +
					(x * 96) + 'px; top: ' + (y * 96) +
					'px;"></div>').appendTo (contact);
			}
		})();

		// Initial scroll
		$(window).scroll();
	}

	else
	{
		langChart.doughnut ("show");
		$("#skills .lang .icon").show();
		$("#skills .lang h1"   ).show();
		$("#skills .lang h2"   ).show();

		techChart.doughnut ("show");
		$("#skills .tech .icon").show();
		$("#skills .tech h1"   ).show();
		$("#skills .tech h2"   ).show();

		toolChart.doughnut ("show");
		$("#skills .tool .icon").show();
		$("#skills .tool h1"   ).show();
		$("#skills .tool h2"   ).show();
	}

	$("#skills .lang").show();
	$("#skills .tech").show();
	$("#skills .tool").show();

	// Allow menu to stick on top
	$(window).scroll (function()
	{
		// Check if page is above the menu
		var top = $(document).scrollTop();
		if (top < 440)
		{
			$("#menu").css
			({
				"margin-top": "-60px",
				"background": "rgba(0, 0, 0, 0.25)",
					"position": "relative"
			});
		}

		else
		{
			$("#menu").css
			({
				"margin-top": "0px",
				"background": "rgb(40, 40, 40)",
					"position": "fixed"
			});
		}

		$("#menu a").removeClass ("highlight");
		// Simple way of highlighting the menu system
		if (top >= $("#contact"   ).offset().top - 60)
			$($("#menu a")[4]).addClass ("highlight"); else
		if (top >= $("#skills"    ).offset().top - 60)
			$($("#menu a")[3]).addClass ("highlight"); else
		if (top >= $("#experience").offset().top - 60)
			$($("#menu a")[2]).addClass ("highlight"); else
		if (top >= $("#projects"  ).offset().top - 60)
			$($("#menu a")[1]).addClass ("highlight"); else
		if (top >= $("#about"     ).offset().top - 60)
			$($("#menu a")[0]).addClass ("highlight");
	});

	// Validate the contact form on submit
	$("#contact form").submit (function()
	{
		var result = true;
		var fields = [ ];
		var format =  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$/;

		// Retrieve and store the form elements
		fields.push ($("#contact form .name"   ));
		fields.push ($("#contact form .email1" ));
		fields.push ($("#contact form .subject"));
		fields.push ($("#contact form textarea"));

		// Verify whether any fields are empty
		for (var i = 0; i < fields.length; ++i)
		{
			if (fields[i].val().length > 0)
				fields[i].removeClass ("error");

			else
			{
				result = false;
				fields[i].addClass ("error");
			}
		}

		// Verify whether or not the email field is valid
		if (!format.test (fields[1].val().toLowerCase()))
		{
			result = false;
			fields[1].addClass ("error");
		}

		if (result)
		{
			// Display the loading animation
			$("#contact form .loader").show();
			$("#contact form  button").hide();
		}

		return result;
	});

	// Start tree
	Tree.Start();

	// Enable script
	svg4everybody();
});



//----------------------------------------------------------------------------//
// Tree                                                                       //
//----------------------------------------------------------------------------//

////////////////////////////////////////////////////////////////////////////////
/// Represents the main tree application

var Tree =
{
	//----------------------------------------------------------------------------//
	// Leaf                                                                       //
	//----------------------------------------------------------------------------//

	////////////////////////////////////////////////////////////////////////////////
	/// Represents a single falling leaf

	Leaf : function (target, spawns)
	{
		//----------------------------------------------------------------------------//
		// Properties                                                                 //
		//----------------------------------------------------------------------------//

		this.PosX		= 0;	// Leaf X position
		this.PosY		= 0;	// Leaf Y position

		this.Rotation	= 0;	// Current rotation
		this.Speed		= 0;	// Leaf fall speed

		this.Size		= 0;	// Current leaf size
		this.SizeMax	= 0;	// Maximum leaf size

		this.Sway		= 0;	// Current leaf sway
		this.SwayMax	= 0;	// Maximum leaf sway
		this.SwayDir	= 0;	// Direction of sway

		this.Element	= null;	// Leaf DOM element



		//----------------------------------------------------------------------------//
		// Constructor                                                                //
		//----------------------------------------------------------------------------//

		////////////////////////////////////////////////////////////////////////////////
		/// Initialize this leaf with random values

		(function()
		{
			var pos = Math.floor
				// Pick random starting location
				(Math.random() * spawns.length);

			this.PosX     = spawns[pos].x;
			this.PosY     = spawns[pos].y;
			this.Rotation = spawns[pos].r;

			this.Speed    = 0.4;
			this.SizeMax  = 0.1;

			this.SwayMax  = Math.random() * 5 + 5;

			// Detach towards an edge
			if (this.Rotation > 45 &&
				this.Rotation < 225)
				this.SwayDir = -0.25;
			else
				this.SwayDir =  0.25;

			// Create new leaf element
			this.Element = $(document.createElementNS
				("http://www.w3.org/2000/svg", "path"))
				.attr ({ d: "M256 256C80 256 0 160 0 0C160 0 256 80 256 256z" })
				.appendTo (target);

		}).bind (this)();



		//----------------------------------------------------------------------------//
		// Functions                                                                  //
		//----------------------------------------------------------------------------//

		////////////////////////////////////////////////////////////////////////////////
		/// Performs a single update on this leaf object
		/// Returns true if this leaf needs to be removed

		this.Update = function()
		{
			// Leaf is currently growing
			if (this.Size < this.SizeMax)
				this.Size += 0.0006;

			else
			{
				var p = Math.abs (this.Sway) / this.SwayMax;
				if (p > 1) p = 1; p -= 0.10;
				this.PosY += p * this.Speed;

				// Check if out of bounds
				if (this.PosY > 625) {
					this.Element.remove();
					return true;
				}

				this.Sway += this.SwayDir;

				if (this.Sway < -this.SwayMax)
					this.SwayDir += 0.005;

				if (this.Sway >  this.SwayMax)
					this.SwayDir -= 0.005;

				if (this.SwayDir > 0)
					this.Rotation -= this.SwayDir * 1;
				else
					this.Rotation -= this.SwayDir * 3;
			}

			this.Element.attr
			({
				// Apply current leaf transformation
				transform: "translate(" + (this.PosX
					+ this.Sway) + " " + this.PosY +
					") scale(" + this.Size +
					") rotate(" + this.Rotation + ")"
			});
		}
	},



	//----------------------------------------------------------------------------//
	// Model                                                                      //
	//----------------------------------------------------------------------------//

	mTarget		: null,		// Tree DOM object
	mLeaves		: [ ],		// Array of leaves
	mSpawns		: [ ],		// Spawn locations



	//----------------------------------------------------------------------------//
	// Functions                                                                  //
	//----------------------------------------------------------------------------//

	////////////////////////////////////////////////////////////////////////////////
	/// Entry point for the tree application

	Start : function()
	{
		// Get a reference to the tree SVG
		this.mTarget = $("#contact .tree");

		this.mSpawns =
		[
			// These values have been auto-generated using a stroked path and turned 45 degrees
			{ x: 216, y: 479, r: 321 }, { x: 221, y: 463, r:  16 }, { x: 238, y: 456, r:  27 },
			{ x: 255, y: 451, r:  34 }, { x: 273, y: 448, r:  39 }, { x: 291, y: 446, r:  45 },
			{ x: 306, y: 441, r: 309 }, { x: 304, y: 423, r: 309 }, { x: 302, y: 406, r: 304 },
			{ x: 298, y: 388, r: 297 }, { x: 290, y: 374, r: 208 }, { x: 272, y: 379, r: 212 },
			{ x: 255, y: 383, r: 219 }, { x: 237, y: 385, r: 225 }, { x: 220, y: 381, r: 291 },
			{ x: 215, y: 364, r: 309 }, { x: 213, y: 346, r: 309 }, { x: 212, y: 329, r: 315 },
			{ x: 212, y: 311, r: 321 }, { x: 214, y: 293, r: 326 }, { x: 219, y: 275, r: 352 },
			{ x: 231, y: 262, r:   8 }, { x: 245, y: 252, r:  11 }, { x: 261, y: 242, r:  13 },
			{ x: 277, y: 234, r:  21 }, { x: 293, y: 227, r:  28 }, { x: 304, y: 217, r: 298 },
			{ x: 298, y: 200, r: 293 }, { x: 290, y: 183, r: 278 }, { x: 279, y: 169, r: 274 },
			{ x: 266, y: 159, r: 188 }, { x: 252, y: 170, r: 188 }, { x: 237, y: 181, r: 193 },
			{ x: 222, y: 190, r: 196 }, { x: 206, y: 198, r: 207 }, { x: 189, y: 204, r: 242 },
			{ x: 175, y: 195, r: 291 }, { x: 168, y: 178, r: 291 }, { x: 161, y: 162, r: 298 },
			{ x: 155, y: 145, r: 298 }, { x: 149, y: 128, r: 298 }, { x: 143, y: 111, r: 298 },
			{ x: 138, y:  93, r: 297 }, { x: 133, y:  76, r: 278 }, { x: 119, y:  68, r: 214 },
			{ x: 101, y:  71, r: 207 }, { x:  85, y:  77, r: 196 }, { x:  69, y:  86, r: 191 },
			{ x:  62, y:  99, r: 111 }, { x:  70, y: 115, r: 106 }, { x:  78, y: 131, r: 106 },
			{ x:  86, y: 147, r: 111 }, { x:  94, y: 164, r: 111 }, { x: 101, y: 180, r: 111 },
			{ x: 108, y: 197, r: 111 }, { x: 115, y: 213, r: 118 }, { x: 121, y: 230, r: 118 },
			{ x: 126, y: 248, r: 117 }, { x: 131, y: 265, r: 124 }, { x: 135, y: 282, r: 124 },
			{ x: 139, y: 300, r: 124 }, { x: 138, y: 317, r: 212 }, { x: 121, y: 319, r: 231 },
			{ x: 103, y: 316, r: 238 }, { x:  86, y: 312, r: 236 }, { x:  68, y: 308, r: 162 },
			{ x:  61, y: 324, r: 148 }, { x:  57, y: 341, r: 141 }, { x:  55, y: 359, r: 141 },
			{ x:  54, y: 377, r:  81 }, { x:  69, y: 383, r:  45 }, { x:  87, y: 384, r:  56 },
			{ x: 104, y: 388, r:  56 }, { x: 122, y: 392, r:  63 }, { x: 138, y: 399, r: 103 }
		];

		// Start tree
		this.Update();
	},

	////////////////////////////////////////////////////////////////////////////////
	/// Performs a single update on the tree

	Update : function (dontAnimate)
	{
		// Create new leaf for the tree
		if (this.mLeaves.length < 40 &&
			Math.random() * 100 <= 1.6)
		{
			this.mLeaves.push (new this.Leaf
				(this.mTarget, this.mSpawns));
		}

		// Update and remove leaves which are out of bounds
		for (var i = this.mLeaves.length - 1; i >= 0; --i)
		{
			if (this.mLeaves[i].Update())
				this.mLeaves.splice (i, 1);
		}

		// Queue the next animation frame and bind this
		requestAnimationFrame (this.Update.bind (this));
	}
};
