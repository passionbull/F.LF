define(['LF/global','LF/network','LF/soundpack','world/match','LF/util','LF/touchcontroller','third_party/random',
'core/util','LF/sprite-select','core/sprite-dom','core/animator','core/controller','core/resourcemap','core/support'],
function(global,network,Soundpack,Match,util,Touchcontroller,Random,
Futil,Fsprite,Fsprite_dom,Fanimator,Fcontroller,Fresourcemap,Fsupport)
{

function Manager(package, buildinfo)
{
	var param = util.location_parameters();
	
	var sel = package.data.UI.data.character_selection;
	var char_list,
		img_list,
		AI_list,
		bg_list,
		diff_list,
		timer,
		randomseed,
		resourcemap;
	var manager = this,
		settings,
		session,
		controllers,
		window_state;
	
	var client = new Colyseus.Client('ws://localhost:2657');
	var room = client.join("state_handler");
	console.log("Hey guy");

	room.listen("players/:id", function(change) {
	if (change.operation === "add") {
		console.log("player add");
		console.log("id: "+change.path.id);
		console.log("x: "+change.value.x);
		console.log("y: "+change.value.y);
	    }
	else if (change.operation === "remove") {
		console.log("player remove");
		console.log("id: "+change.path.id);
		}
    });

	room.listen("players/:id/:axis", function(change) {
          console.log("player move");
          console.log("player value: "+change.path.axis+" - " +change.value);
	});

	function send (data) {
        room.send(data);
	}

	this.send =function(data){
        room.send(data);
	}


	this.create=function()
	{
		require(['core/css!'+package.path+'UI/UI.css'],function(){});
		
		//window sizing
		window_state=
		{
			maximized:false,
			wide:false,
			allow_wide:false
		};
		function onresize()
		{
			if( window.innerWidth<global.application.window.outer_width ||
				window.innerHeight<global.application.window.outer_height )
			{
				if( !window_state.maximized)
				{
					util.div('maximize_button').onclick();
				}
			}
			resizer();
		}
		function getFeature(from, feature)
		{
			function cap(a)
			{
				return a.charAt(0).toUpperCase() + a.substr(1);
			}
			var val = from[feature] || from[Fsupport.prefix_js+cap(feature)];
			if (typeof val==='function')
				return val.bind(from);
			return val;
		}
		
		session=
		{
			network:false,
			control:null,
			player:[]
		};
		
		var settings_format_version=1.00002;
		settings=
		{
			version:settings_format_version,
			control:
			[
				{
					type:'keyboard',
					config: { up:'w',down:'s',left:'a',right:'d',def:'u',jump:'y',att:'t' }
				},
				{
					type:'keyboard',
					config: { up:'h',down:'n',left:'b',right:'m',def:'p',jump:'o',att:'i' }
				}
			],
			player:
			[
				{name:'player1'},{name:'player2'}
			],
			server:
			{
				'Project F Official Lobby':'http://lobby.projectf.hk'
			},
			support_sound:false
		};
		if( Fsupport.localStorage)
		{
			if( Fsupport.localStorage.getItem('F.LF/settings'))
			{
				var obj = JSON.parse(Fsupport.localStorage.getItem('F.LF/settings'));
				if( obj.version===settings_format_version)
					settings = obj;
			}
		}
		for( var i=0; i<settings.player.length; i++)
		{
			session.player[i] = settings.player[i];
		}
		
		//touch
		document.addEventListener('touchstart', ontouch, false);
		function ontouch()
		{
			settings.control[0].type = 'touch';
			session.control[0] = controllers.touch.c;
			session.control.f = controllers.touch.f;
			document.removeEventListener('touchstart', ontouch, false);
		}
		
		//control
		var functionkey_config = { 'esc':'esc','F1':'F1','F2':'F2','F3':'F3','F4':'F4','F5':'F5','F6':'F6','F7':'F7','F8':'F8','F9':'F9','F10':'F10' };
		controllers=
		{
			keyboard:
			{
				c0: new Fcontroller(settings.control[0].config),
				c1: new Fcontroller(settings.control[1].config),
				f: new Fcontroller(functionkey_config)
			}
		};

		session.control=
		{
			f: controllers.keyboard.f,
			length: 2,
			my_offset: 0
		};
		for( var i=0; i<session.control.length; i++)
		{
			switch (settings.control[i].type)
			{
				case 'keyboard':
					session.control[i] = controllers.keyboard['c'+i];
					break;
				case 'touch':
					session.control[i] = controllers.touch.c;
					session.control.f = controllers.touch.f;
					console.log(session.control.f.type);
					break;
			}
		}
		
		//setup resource map
		util.organize_package(package);
		resourcemap = new Fresourcemap(util.setup_resourcemap(package));
		Fsprite.masterconfig_set('resourcemap',resourcemap);
		Fsprite_dom.masterconfig_set('resourcemap',resourcemap);
		
		//icon
		var icon = document.createElement('link');
		icon.rel = 'icon'
		icon.href = Fsprite.resolve_resource(package.data.icon);
		document.head.appendChild(icon);
		
		//sound
		if( !settings.support_sound)
		{
			manager.sound = new Soundpack(null);
			Soundpack.support(function(features)
			{
				settings.support_sound = true;
				setup_sound();
			});
		}
		else
		{
			setup_sound();
		}
		function setup_sound()
		{
			manager.sound = new Soundpack({
				packs: package.data.sound,
				resourcemap: resourcemap
			});
		}
		
		//rand
		manager.random = function()
		{
			return randomseed.next();
		}
		randomseed = new Random();
		randomseed.seed(824163532);
		
		//prepare
		char_list = util.select_from(package.data.object,{type:'character'});
		char_list[-1] = {name:'Random'}
		img_list = Futil.extract_array(char_list,'pic').pic;
		img_list.waiting = sel.waiting.pic;
		img_list[-1] = package.data.UI.data.character_selection.random.pic;
		AI_list = package.data.AI.slice(0);
		AI_list[-1] = {name:'Random'};
		bg_list = package.data.background.slice(0);
		bg_list[-1] = {name:'Random'};
		diff_list = ['Easy','Normal','Difficult'];
		
		this.create_UI();
		this.start_world();
		// if(param.world)
		// 	this.start_world();
		// else
		// 	this.switch_UI('frontpage');

		window.addEventListener('resize', onresize, false);
		onresize();
	}
	this.UI_list=
	{
		'frontpage':
		{
			bgcolor:package.data.UI.data.frontpage.bg_color,
			create:function()
			{
				new Fsprite_dom({
					canvas: util.div('frontpage_content'),
					img: package.data.UI.data.frontpage.pic,
					wh: 'fit'
				});
				this.dialog = new vertical_menu_dialog({
					canvas: util.div('frontpage_content'),
					data: package.data.UI.data.frontpage_dialog,
					mousehover: true,
					onclick: function(I)
					{
						if( I===0)
						{
							//manager.start_game();
							manager.start_world();
						}
						else if( I===1) //network game
						{

						}
						else if( I===2)
						{
							manager.switch_UI('settings');
						}
					}
				});
			},
			onactive:function()
			{
				this.demax(!window_state.maximized);
			},
			deactive:function()
			{
				this.demax(true);
			},
			demax:function(demax)
			{
				if( !demax) //maximize
				{
					var holder = util.div('frontpage');
					holder.parentNode.removeChild(holder);
					holder.classList.add('maximized');
					util.root.insertBefore(holder,util.root.firstChild);
					hide(util.div('window'));
					var canx = window.innerWidth/2-parseInt(window.getComputedStyle(util.div('frontpage_content'),null).getPropertyValue('width'))/2;
					if( canx<0)
						util.div('frontpage_content').style.left= canx+'px';
				}
				else //demaximize
				{
					var holder = util.div('frontpage');
					holder.parentNode.removeChild(holder);
					holder.classList.remove('maximized');
					util.div('window').insertBefore(holder,util.div('window').firstChild);
					show(util.div('window'));
					util.div('frontpage_content').style.left='';
				}
			}
		},
		'settings':
		{
			bgcolor:package.data.UI.data.settings.bg_color,
			create:function()
			{
				new Fsprite_dom({
					canvas: util.div('settings'),
					img: package.data.UI.data.settings.pic,
					wh: 'fit'
				});
				new vertical_menu_dialog({
					canvas: util.div('settings'),
					data: package.data.UI.data.settings.ok_button,
					mousehover: true,
					onclick: function(I)
					{
						manager.switch_UI('frontpage');
					}
				});
				this.keychanger.call(this);
			},
			keychanger:function()
			{
				var keychanger = util.div('keychanger');
				if( keychanger)
					keychanger.parentNode.removeChild(keychanger);
				var keychanger = document.createElement('div');
					keychanger.className = 'keychanger';
				util.div('settings').appendChild(keychanger);
				var brbr=create_at(keychanger, 'br'),
					table=create_at(keychanger, 'table'),
					row=[],
					change_active=false;
				var column = this.column = [];
				
				table.style.display='inline-block';
				for( var i=0; i<9; i++)
					row[i]=create_at(table, 'tr');
				var i=0;
				left_cell(row[i++],'name');
				left_cell(row[i++],'type');
				for( var I in settings.control[0].config)
					left_cell(row[i++],I);
				for( var i=0; i<session.control.length; i++)
					column[i] = new Control(i);
				
				function Control(num)
				{
					var This=this;
					var name = right_cell(row[0],'');
					var type = right_cell(row[1],'');
					var cells = {};
					var i=2;
					for( var I in settings.control[0].config)
						cells[I] = add_changer(row[i++],I);
					this.update = update;
					update();
					if( session.control[num].role===undefined)
					{
						name.onclick=function()
						{
							name.innerHTML = settings.player[num-session.control.my_offset].name = (prompt('Enter player name:',name.innerHTML) || name.innerHTML);
						}
						type.onclick=function()
						{
							if( session.control[num].type==='keyboard')
							{	//switch to touch
								settings.control[num].type = 'touch';
								session.control[num] = controllers.touch.c;
								session.control.f = controllers.touch.f;
							}
							else
							{	//switch to keyboard
								settings.control[num].type = 'keyboard';
								session.control[num] = controllers.keyboard['c'+num];
								session.control.f = controllers.keyboard.f;
							}
							update();
						}
					}
					function add_changer(R,name)
					{
						var cell=right_cell(R,'');
						var target;
						cell.onclick=function()
						{
							if( session.control[num].type==='keyboard')
							{
								if( !change_active)
								{
									change_active=true;
									target=this;
									target.style.color='#000';
									target.style.backgroundColor='#FFF';
									document.addEventListener('keydown', keydown, true);
								}
								else
								{
									if( target)
									{
										target.style.color='';
										target.style.backgroundColor='';
										target=null;
										change_active=false;
									}
									document.removeEventListener('keydown', keydown, true);
								}
							}
						}
						function keydown(e)
						{
							var con = session.control[num];
							if (!e) e = window.event;
							var value=e.keyCode;
							cell.innerHTML=Fcontroller.keycode_to_keyname(value);
							con.config[name]=Fcontroller.keycode_to_keyname(value);
							con.keycode[name]=value;
							target.style.color='';
							target.style.backgroundColor='';
							change_active=false;
							document.removeEventListener('keydown', keydown, true);
						}
						return cell;
					}
					function update()
					{
						var con = session.control[num];
						name.innerHTML = session.player[num].name;
						type.innerHTML = con.role==='remote'?'network':con.type;
						for( var I in cells)
							if( con.type==='keyboard')
								cells[I].innerHTML = con.config[I];
							else
								cells[I].innerHTML = '-';
					}
				}
				
				function create_at(parent, tag, id)
				{
					var E = document.createElement(tag);
					parent.appendChild(E);
					if( id)
						E.id = id;
					return E;
				}
				
				function add_cell(row, content, bg_color, text_color)
				{
					var td = create_at(row, 'td')
					td.innerHTML= content;
					if( bg_color)
						td.style.backgroundColor = bg_color;
					if( text_color)
						td.style.color = text_color;
					return td;
				}
				function left_cell(A,B)
				{
					var bg_color = package.data.UI.data.settings.leftmost_column_bg_color,
						text_color = package.data.UI.data.settings.leftmost_column_text_color;
					var cell = add_cell(A,B,bg_color,text_color);
					cell.style.textAlign='right';
					cell.style.width='80px';
					cell.style.padding='0 20px';
					return cell;
				}
				function right_cell(A,B)
				{
					var cell = add_cell(A,B);
						cell.style.cursor='pointer';
					return cell;
				}
			},
			onactive:function()
			{
				for( var i=0; i<this.column.length; i++)
				{
					this.column[i].update();
				}
			}
		},
		'network_game':
		{
		},
		'lobby':
		{
		},
		'character_selection':
		{},
		'gameplay':
		{
			allow_wide:true,
			create:function()
			{
				if( util.div('pause_message'))
				{
					var dat = package.data.UI.data.message_overlay;
					manager.overlay_mess = new Fsprite_dom({
						div: util.div('pause_message'),
						img: dat.pic
					});
					manager.overlay_mess.hide();
				}
				manager.gameplay = util.div('gameplay');
				manager.canvas = get_canvas();
				manager.background_layer = new Fsprite({
					canvas:manager.canvas,
					type:'group'
				});
				manager.panel_layer = new Fsprite({
					canvas:manager.canvas,
					type:'group',
					wh:{w:package.data.UI.data.panel.width,h:package.data.UI.data.panel.height}
				});
				manager.summary = new summary_dialog({
					div:util.div('summary_dialog'),
					data:package.data.UI.data.summary
				});

				if( Fsprite.renderer==='DOM')
				{
					manager.panel_layer.el.className = 'panel';
					manager.background_layer.el.className = 'background';
				}
				var panels=[];
				for( var i=0; i<8; i++)
				{
					var pane = new Fsprite({
						canvas: manager.panel_layer,
						img: package.data.UI.data.panel.pic,
						wh: 'fit'
					});
					pane.set_x_y(package.data.UI.data.panel.pane_width*(i%4), package.data.UI.data.panel.pane_height*Math.floor(i/4));
					panels.push(pane);
				}
				function get_canvas()
				{
					if( Fsprite.renderer==='DOM')
					{
						return new Fsprite({
							div:util.div('gameplay'),
							type:'group'
						});
					}
					else if( Fsprite.renderer==='canvas')
					{
						var canvas_node = util.div('gameplay').getElementsByClassName('canvas')[0];
						canvas_node.width = global.application.window.width;
						canvas_node.height = global.application.window.height;
						return new Fsprite({
							canvas:canvas_node,
							type:'group',
							bgcolor:'#676767',
							wh:{w:global.application.window.width,h:global.application.window.height}
						})
					}
				}
			}
		}
	};
	function resizer(ratio)
	{
		var demax = ratio===1;
		if( window_state.maximized)
		{
			var landscape = false;
			//if( window.innerWidth < 400 && window.innerWidth < window.innerHeight)
				//landscape = true;
			var last_window_state_wide = window_state.wide;
			var want_wide;
			if( !landscape)
				want_wide = window.innerWidth/window.innerHeight > 15/9;
			else
				want_wide = window.innerHeight/window.innerWidth > 15/9;
			if( want_wide)
			{
				if( window_state.allow_wide && !window_state.wide)
				{
					window_state.wide=true;
					util.container.classList.add('wideWindow');
					//double arrow symbol '&#8622;&#8596;'
				}
			}
			if( window_state.wide &&
				(!window_state.allow_wide || !want_wide))
			{
				window_state.wide=false;
				util.container.classList.remove('wideWindow');
			}
			var fratio = ratio;
			if( typeof ratio!=='number')
			{
				var width = parseInt(window.getComputedStyle(util.container,null).getPropertyValue('width')),
					height = parseInt(window.getComputedStyle(util.container,null).getPropertyValue('height'));
				this.width = width;
				if( height>100) this.height = height;
				if( !landscape)
				{
					var ratioh = window.innerHeight/this.height;
					var ratiow = window.innerWidth/this.width;
				}
				else
				{
					var ratioh = window.innerHeight/this.width;
					var ratiow = window.innerWidth/this.height;
				}
				ratio = ratioh<ratiow? ratioh:ratiow;
				fratio = ratio;
				ratio = Math.floor(ratio*100)/100;
			}
			if( manager.active_UI==='frontpage')
			{
				manager.UI_list['frontpage'].demax(demax);
			}
			if( !ratio) return;
			var canx=0, cany=0;
			if( !landscape)
				canx = window.innerWidth/2-parseInt(window.getComputedStyle(util.container,null).getPropertyValue('width'))/2*ratio;
			else
				cany = window.innerHeight/2-parseInt(window.getComputedStyle(util.container,null).getPropertyValue('width'))/2*ratio;
			if( demax) canx=0;
			if( Fsupport.css3dtransform)
			{
				util.container.style[Fsupport.css3dtransform+'Origin']= '0 0';
				util.container.style[Fsupport.css3dtransform]=
					'translate3d('+canx+'px,'+cany+'px,0) '+
					'scale3d('+ratio+','+ratio+',1.0) '+
					(landscape?'translateX('+(window_state.wide?450:580)+'px) rotateZ(90deg) ':'');
			}
			else if( Fsupport.css2dtransform)
			{
				util.container.style[Fsupport.css2dtransform+'Origin']= '0 0';
				util.container.style[Fsupport.css2dtransform]=
					'translate('+canx+'px,0) '+
					'scale('+ratio+','+ratio+') ';
			}
			if( last_window_state_wide !== window_state.wide)
			{	//wide state changed
				if( window_state.wide)
				{
					manager.background_layer.set_x_y(0,-package.data.UI.data.panel.height);
					manager.panel_layer.set_alpha(0.5);
				}
				else
				{
					manager.background_layer.set_x_y(0,0);
					manager.panel_layer.set_alpha(1.0);
				}
				if( util.div('canvas').width)
				{	//using canvas rendering backend
					var owidth = global.application.window.width;
					var wide_width = global.application.window.wide_width;
					if( window_state.wide)
					{	//widen the canvas
						util.div('canvas').width = wide_width;
						var offx = Math.floor((wide_width-owidth)/2);
						util.div('canvas').style.left = -offx+'px';
						manager.canvas.set_x_y(offx,0);
						manager.canvas.set_w(wide_width);
					}
					else
					{	//restore the canvas
						util.div('canvas').width = owidth;
						util.div('canvas').style.left = 0;
						manager.canvas.set_x_y(0,0);
						manager.canvas.set_w(owidth);
					}
					manager.canvas.render();
				}
			}
		}
	}
	this.frame=function()
	{
		this.dispatch_event('frame');
	}
	this.key=function()
	{
		this.dispatch_event('key',arguments);
	}
	this.dispatch_event=function(event,args)
	{
		var active = this.UI_list[this.active_UI];
		if( active && active[event])
			active[event].apply(active,args);
	}
	this.create_UI=function()
	{
		for( var I in this.UI_list)
		{
			if( this.UI_list[I].create)
				this.UI_list[I].create.call(this.UI_list[I]);
		}
	}
	this.switch_UI=function(page)
	{
		this.dispatch_event('deactive');
		this.active_UI = page;
		for( var P in this.UI_list)
		{
			//util.div(P).style.display = page===P? '':'none';
		}
		if( window_state.allow_wide !== this.UI_list[page].allow_wide)
		{
			window_state.allow_wide = this.UI_list[page].allow_wide;
			if( window_state.maximized && window_state.wide!==window_state.allow_wide)
				resizer();
		}
		util.div('window').style.background = this.UI_list[page].bgcolor || '';
		if( window_state.maximized)
		{
			document.body.style.background = this.UI_list[page].bgcolor || '#676767';
		}
		this.dispatch_event('onactive');
	}
	this.match_end=function(event)
	{
		this.switch_UI('frontpage');
	}
	
	this.start_match=function(config)
	{
		this.switch_UI('gameplay');

		if( timer)
		{
			network.clearInterval(timer);
			timer = null;
		}

		for( var i=0; i<session.control.length; i++)
			session.control[i].child=[];
		if( !config.demo_mode)
		{
			session.control.f.child=[];
			if( session.control.f.show)
				session.control.f.show();
		}

		var match = new Match
		({
			manager: this,
			package: package
		});
		match.create
		({
			control: config.demo_mode?null:session.control.f,
			player: get_players(),
			background: { id: get_background() },
			set: {
				weapon:true,
				demo_mode:config.demo_mode
			}
		});
		return match;

		function get_players()
		{
			var players = config.players;
			var arr = [];
			for( var i=0; i<players.length; i++)
			{
				if( players[i].use)
					arr.push({
						name: players[i].name,
						controller: players[i].type==='human'?session.control[i]:{type:'AIscript',id:AI_list[players[i].selected_AI].id},
						id: char_list[players[i].selected].id,
						team: players[i].team===0? 10+i : players[i].team
					});
			}
			return arr;
		}
		function get_background()
		{
			var options = config.options;
			if( options.background===-1)
				return bg_list[Math.floor(randomseed.next()*bg_list.length)].id;
			else
				return bg_list[options.background].id;
		}
	}
	this.start_world=function()
	{
		var match = this.start_match({
			players:[
				{
					use:true,
					name:'Player1',
					type:'human',
					selected:8,
					team:1
				},
				{
					use:true,
					name:'Player2',
					type:'human',
					selected:3,
					team:2
				}
			],
			options:{
				background:0, //random
				difficulty:2 //difficult
			}
		});
	}
	//constructor
	this.create();
}

//util
function show(div)
{
	div.style.display='';
}
function hide(div)
{
	div.style.display='none';
}
function show_hide(div)
{
	div.style.display= div.style.display===''?'none':'';
}
function defined(x)
{
	return x!==undefined && x!==null;
}
function point_in_rect(x,y,R)
{
	return (inbetween(x,R[0],R[0]+R[2]) && inbetween(y,R[1],R[1]+R[3]));
	function inbetween(x,L,R)
	{
		var l,r;
		if ( L<=R) { l=L; r=R; }
		else { l=R; r=L; }
		return x>=l && x<=r;
	}
}
function create_textbox(config)
{
	var box = new Fsprite_dom({
		canvas: config.canvas,
		xywh: config.xywh
	});
	box.el.classList.add('textbox');
	if( config.color)
		box.el.style.color = config.color;
	box.el.style['line-height'] = config.xywh[3]+'px';
	return box.el;
}
function vertical_menu_dialog(config)
{
	var This = this;
	var data = this.data = config.data;
	this.dia = new Fsprite_dom({canvas:config.canvas, type:'group'});
	this.bg = new Fsprite_dom({canvas: this.dia, img: data.bg});
	this.menu = new Fsprite_dom({canvas: this.dia, img: data.pic});
	this.it = new Fsprite_dom({canvas: this.dia, img: data.pic});
	this.dia.set_x_y(data.x,data.y);
	for( var I in {bg:0,menu:0})
		this[I].set_x_y(0,0);
	for( var I in {dia:0,bg:0,menu:0})
		this[I].set_w_h(data.width,data.height);
	if( config.mousehover)
	{	//activate items automatically by mouse hovering
		var trans=function(el,e)
		{
			var rect = el.getBoundingClientRect();
			var x = e.clientX - rect.left - el.clientLeft + el.scrollLeft;
			var y = e.clientY - rect.top - el.clientTop + el.scrollTop;
			return {x:x,y:y}
		}
		this.dia.el.onmousemove=function(e)
		{
			e=e?e:event;
			var P = trans(this,e);
			This.mousemove(P.x,P.y);
		}
		this.dia.el.onmouseout=function(e)
		{
			This.mousemove(-10,-10);
		}
		this.it.hide();
		if( config.onclick)
		{
			this.onclick = config.onclick;
			this.dia.el.onmousedown=function(e)
			{
				e=e?e:event;
				var P = trans(this,e);
				This.mousedown(P.x,P.y);
			}
		}
	}
	else
	{
		this.activate_item(0);
	}
}
var vmdp = vertical_menu_dialog.prototype;
vmdp.activate_item = function(num)
{
	if( num!==null && num!==undefined)
		this.active_item = num;
	else
		num = this.active_item;
	var item = this.data.item[num];
	this.it.set_x_y(item[0],item[1]);
	this.it.set_img_x_y(-this.data.width-item[0],-item[1]);
	this.it.set_w_h(item[2],item[3]);
}
vmdp.nav_up = function()
{
	if( this.active_item>0)
		this.active_item--;
	else
		this.active_item = this.data.item.length-1;
	this.activate_item();
}
vmdp.nav_down = function()
{
	if( this.active_item<this.data.item.length-1)
		this.active_item++;
	else
		this.active_item = 0;
	this.activate_item();
}
vmdp.show = function()
{
	this.dia.show();
}
vmdp.hide = function()
{
	this.dia.hide();
}
vmdp.get_mouse_target = function(x,y)
{
	var target;
	for( var i=0; i<this.data.item.length; i++)
	{
		if( point_in_rect(x,y,this.data.item[i]))
		{
			target = i;
			break;
		}
	}
	return target;
}
vmdp.mousemove = function(x,y)
{
	var target = this.get_mouse_target(x,y);
	if( defined(target))
	{
		this.activate_item(target);
		this.it.show();
	}
	else
	{
		this.it.hide();
	}
}
vmdp.mousedown = function(x,y)
{
	var target = this.get_mouse_target(x,y);
	if( this.onclick && defined(target))
		this.onclick(target);
}
function horizontal_number_dialog(config)
{
	var This = this;
	var data = this.data = config.data;
	this.dia = new Fsprite_dom({canvas:config.canvas, type:'group'});
	this.dia.set_x_y(data.x,data.y);
	this.bg = new Fsprite_dom({canvas: this.dia, img: data.bg});
	this.bg.set_x_y(0,0);
	for( var I in {dia:0,bg:0})
		this[I].set_w_h(data.width,data.height);
	this.it = [];
	this.active_item = 0;
	for( var i=0; i<=7; i++)
	{
		var sp = new Fsprite_dom({canvas: this.dia});
		sp.set_x_y(data.item_x+i*data.item_space, data.item_y);
		sp.set_w_h(data.item_width, data.item_height);
		sp.el.classList.add('textbox');
		sp.el.style['line-height'] = data.item_height+'px';
		sp.el.innerHTML = i+'';
		this.it[i] = sp;
	}
}
var hndp = horizontal_number_dialog.prototype;
hndp.init = function(lower_bound,upper_bound)
{
	for( var i=0; i<this.it.length; i++)
		this.it[i].el.style.color=this.data.inactive_color;
	for( var i=lower_bound; i<=upper_bound; i++)
		this.it[i].el.style.color=this.data.active_color;
	this.activate_item(lower_bound);
	this.lower_bound = lower_bound;
	this.upper_bound = upper_bound;
}
hndp.activate_item = function(num)
{
	var it = this.it[this.active_item];
	it.el.style.border='';
	this.active_item = num;
	var it = this.it[this.active_item];
	it.el.style.border='1px solid white';
}
hndp.nav_left = function()
{
	this.activate_item(
		this.active_item>this.lower_bound ?
			this.active_item-1
		:
			this.upper_bound
		);
}
hndp.nav_right = function()
{
	this.activate_item(
		this.active_item<this.upper_bound ?
			this.active_item+1
		:
			this.lower_bound
		);
}
hndp.show = function()
{
	this.dia.show();
}
hndp.hide = function()
{
	this.dia.hide();
}
function summary_dialog(config)
{
	var data = this.data = config.data;
	this.status_colors = [data.text_color[6], data.text_color[7]];
	this.dialog = new Fsprite_dom({
		div: config.div,
		type: 'group',
		wh:{w:data.width, h:100}
	});
	this.hide();
	for( var part in {'head':1,'foot':1})
	{
		this[part+'_holder'] = new Fsprite_dom({
			canvas: this.dialog,
			type: 'group'
		});
		this[part] = new Fsprite_dom({
			canvas: this[part+'_holder'],
			img: data.pic,
			wh:{w:data.width, h:data[part][3]}
		});
		this[part].set_img_x_y(-data[part][0], -data[part][1]);
	}
	this.rows=[]
	for( var i=0; i<8; i++)
	{
		var gp = new Fsprite_dom({
			canvas: this.dialog,
			type: 'group'
		});
		var bg = new Fsprite_dom({
			canvas: gp,
			img: data.pic,
			wh:{w:data.width, h:data.body[3]}
		});
		bg.set_img_x_y(-data.body[0], -data.body[1]);
		var icon = new Fsprite_dom({
			canvas: gp,
			xywh: data.icon
		});
		this.rows[i] = {
			gp:gp,
			icon:icon,
			boxes:[]
		};
		for( var j=0; j<data.text.length; j++)
		{
			var tb = create_textbox({
				canvas: gp,
				xywh: data.text[j],
				color: data.text_color[j]
			});
			this.rows[i].boxes.push(tb);
		}
		//name
		this.rows[i].boxes[0].style['font-size'] = '10px';
		//status
		this.rows[i].boxes[6].style['font-size'] = '9px';
	}
	this.time = create_textbox({
		canvas: this.foot_holder,
		xywh: data.time,
		color: data.time_color
	});
}
summary_dialog.prototype.show = function()
{
	this.dialog.show();
}
summary_dialog.prototype.hide = function()
{
	this.dialog.hide();
}
summary_dialog.prototype.set_rows=function(num)
{
	var y=this.data.head[3];
	for( var i=0; i<8; i++)
	{
		this.rows[i].gp.set_x_y(0, y);
		if (i<num)
		{
			y += this.data.body[3];
			this.rows[i].gp.show();
		}
		else
			this.rows[i].gp.hide();
	}
	this.foot_holder.set_x_y(0, y);
	y += this.data.foot[3];
	this.dialog.set_h(y);
}
summary_dialog.prototype.set_info=function(info)
{
	/* info=
	[
		[ Icon, Name, Kill, Attack, HP Lost, MP Usage, Picking, Status ]...
	]
	*/
	this.set_rows(info.length);
	for( var i=0; i<info.length; i++)
	{
		this.set_row_data(i, info[i]);
	}
}
summary_dialog.prototype.set_time=function(time)
{
	this.time.innerHTML = time;
}
summary_dialog.prototype.set_row_data=function(i, data)
{
	var row = this.rows[i].boxes;
	var icon = this.rows[i].icon;
	icon.remove_img('0');
	icon.add_img(data[0],'0');
	for( var i=1; i<data.length; i++)
	{
		row[i-1].innerHTML = data[i];
	}
	if( data[7].indexOf('Win')!==-1)
		row[6].style.color = this.status_colors[0];
	else
		row[6].style.color = this.status_colors[1];
}

return Manager;
});
