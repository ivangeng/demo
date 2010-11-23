windowXMLHttpRequest=window.XMLHttpRequest;

//Constants
Client.ELEMENT_NODE_TYPE = 1;

//VARIABLES
Client.variables = {};
Client.viewport = null;
Client.beforeCallbackListeners=new Array();
Client.afterCallbackListeners=new Array();
showMessage = function(message) {
	if (window.console)
		console.log(message);
}

//This functions serializes an object as XML to be sent to server
function serialize(object) {
    if (object instanceof Array) {
        //Serialize as a collection
        var collection = "";
        for (var i = 0; i < object.length; i++)
            collection += serialize(object[i]);
        return collection;
    } else if (object instanceof Object || typeof object == "object") {
        //Serialize objects as elements
        var name = "";
        var attributes = "";
        var content = "";
        //Analyze properties
        for (i in object) {
            switch (i) {
                case "_name":
                    //This defines tag name
                    name = object[i];
                    break;
                case "_children":
                    //This contains children nodes
                	content = serialize(object[i]);
                    break;
                default:
					//This is an attribute
					var value = object[i];
					if (!(value instanceof Function)) {
						if (!(value instanceof String))
							value = new String(value);
							
                       	//fix for CG-62: replace single quotes in attribute values with their encoded form.
                       	attributes += " " + i + "='" + value.replace("'", '&#39;') + "'";
                    };
            };
        };
        //Put all together
        if (!name)
          name = "anonymous";
        return "<" + name + attributes + ">" + content + "</" + name + ">";
    } else {
		//Serialize a literal (string, number)
        var str = new String(object);
        return str.replace(/([<>&])/g, '<![CDATA[$1]]>').replace('&nbsp;','&#160;');
    }
};


function registerAfterCallback(component){
	Client.afterCallbackListeners.push(component);
}

function registerBeforeCallback(component){
	Client.beforeCallbackListeners.push(component);
}

function unregisterBeforeCallback(component){
	var i=0;
    var j=undefined;
    for (i=0;i<Client.beforeCallbackListeners.length;i++)
    	if (Client.beforeCallbackListeners[i]==component){
    		j=i;
    		break;
    	}
   	if (j!=undefined){
   		Client.beforeCallbackListeners.splice(j,1);
   	}
}

function unregisterAfterCallback(component){
	var i=0;
    var j=undefined;
    for (i=0;i<Client.afterCallbackListeners.length;i++)
    	if (Client.afterCallbackListeners[i]==component){
    		j=i;
    		break;
    	}
   	if (j!=undefined){
   		Client.afterCallbackListeners.splice(j,1);
   	}
}

Client.alertAfterCallbackListeners=function(){
	var i=0;
	//alert('after '+Client.afterCallbackListeners.length);
	for (i=0;i<Client.afterCallbackListeners.length;i++)
   		Client.afterCallbackListeners[i].initialConfig.handlers.after();
};

Client.alertBerforeCallbackListeners=function(){
	var i=0;
	//alert('before '+Client.beforeCallbackListeners.length);
	for (i=0;i<Client.beforeCallbackListeners.length;i++)
   		Client.beforeCallbackListeners[i].initialConfig.handlers.before();
};

//Sends event to server and process its response
free = true;
requestQueue = [];
Client.sendCallback = function(event,roots) {
    //Collect variables
    var vars = [];
    for (variable in Client.variables)
        vars.push({_name : "var", id: variable, _children : [Client.variables[variable]]});

    //Collect submitted widgets
    for (var i=0;i < roots.length;i++) {
        var widgets = roots[i].xscontroller.getInputWidgets();
        for (var j = 0; j < widgets.length; j++) {
			event._children.push({
				_name: "widget",
				id: widgets[j].initialConfig.id,
				name: widgets[j].initialConfig.name,
				_children: [widgets[j].xscontroller.getValue()]
			});
		}
    };
    
    //Prepare request body
    var body = serialize(
        {_name : "request",
         _children : [{_name : "variables", _children : vars},
                      {_name : "events", _children : [event]}
                     ]
        });
    
	// Process requests one at a time
	requestQueue.push(body);
	if (free) {
		//free = false;
		while (requestQueue.length > 0) {
			body = requestQueue.shift();
		    //Create and send http-request. This is browser-dependant
		    if (windowXMLHttpRequest)
		        var request = new XMLHttpRequest();		    	
		    else
		        var request = new ActiveXObject("Microsoft.XMLHTTP");
		    //Point request to endpoint and send it. Note that execution is SYNCHRONIC (async = false)
		    
			this.alertBerforeCallbackListeners();
			request.onreadystatechange = function () {Client.processContents(request);};
            request.open("POST",JsEndpoint.contextPath + "/services/js-endpoint.xsp",true);
			if (!Ext.isIE) request.overrideMimeType('text/html'); // Workaround for Mozilla bug 384298
		    request.send(body);
		}
		free = true;
	}	
};


Client.processContents=function (request) {
	if (request.readyState == 4) {
		//Process request and fire events
        eval(request.responseText);			                        
		this.alertAfterCallbackListeners();	

		if (_stylesheet_selectors_.updated == true) {
			patchStyleSheet(_stylesheet_, "INTALIO-CRM", true);
			_stylesheet_selectors_.updated = false;
		}
		if (Client.variables["language-id"] == "ja"){
			addJapaneseStyleIEPatch();
		}
	}
};

//Show a exception
Client.showException = function(message) {
    showMessage(message);
};


function addJapaneseStyleIEPatch() {
	//CG-970 
	if (Ext.isIE8) {
		var patchIds = new Array(".x-btn-tex", ".x-panel-header-text",
				".x-toolbar TD", ".x-toolbar DIV", ".x-tab-strip-text",
				".x-form-item-label", "TD", "A", ".x-form-cb-label",
				".x-tab-strip-text", ".x-panel-body", ".fb-comp-txt");
		var fontStyle = "{font-family: verdana, tahoma, arial, helvetica, sans-serif !important;}";
		var style = "";
		for (id in patchIds) {
			style += patchIds[id] + fontStyle;
		}
		patchStyleSheet(style, "INTALIO-JAP-PATCH", false);
	}
	//CG-2334 CG-2665
	if (Ext.isIE7 || Ext.isIE8) {
		var patchs = new Array(".x-form-item .x-form-item-label{padding-top:6px !important;} ",
				".x-form-element .x-form-text{vertical-align:top; top:-1px !important;} "
				);
	
		if (Ext.isIE7) {
			patchs.push(".x-form-element .x-form-arrow-trigger{top:1px !important;} ");
			patchs.push(".x-form-element .x-form-date-trigger{top:1px !important;} ");
			patchs.push(".x-tab-strip span.x-tab-strip-text{padding: 6px 0px 2px 0px !important;} ");
			patchs.push(".x-link-label-top{margin-top:5px !important;} ");
		}
		
		if (Ext.isIE8) {
			patchs.push(".x-form-element .x-form-arrow-trigger{top:0px !important;} ");
			patchs.push(".x-form-element .x-form-date-trigger{top:0px !important;} ");
			patchs.push(".x-tree-node-anchor {vertical-align:middle !important;} ");
			patchs.push(".x-menu-item-icon {top:2px !important;} ");
			patchs.push(".x-tab-strip span.x-tab-strip-text{padding: 7px 0px 2px 0px !important;} ");
			patchs.push(".x-link-label-top{margin-top:3px\0 !important;} ");
		}
		
		var style = "";
		for (id in patchs) {
			style += patchs[id];
		}
		patchStyleSheet(style, "INTALIO-JAP-PATCH2", false);
		
	/*	if (!_stylesheet_selectors_["INTALIO-JAP-PATCH2"]){
			_stylesheet_selectors_["INTALIO-JAP-PATCH2"] = 1;
			Ext.util.CSS.updateStyleSheet(style, "INTALIO-JAP-PATCH2");
		}*/
	}
}


//CG-1869
function casLogout(logoutUrl, loginUrl){
      var id = Ext.id();
      var frame = document.createElement('iframe');
      frame.id = id;
      frame.name = id;
      document.body.appendChild(frame);
      var iframe = document.getElementById(id);
      iframe.src = logoutUrl;
      setTimeout("window.location.href='" + logoutUrl + "';",1000);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Ext.override(Ext.tree.TreeEditor, {
	// private
    triggerEdit : function(node, defer){
        this.completeEdit();
		if(node.attributes.editable !== false){
	       /**
	        * The tree node this editor is bound to. Read-only.
	        * @type Ext.tree.TreeNode
	        * @property editNode
	        */
			this.editNode = node;
            if(this.tree.autoScroll){
                // [Modified] A try-catch was added
                try {
                    node.ui.getEl().scrollIntoView(this.tree.body);
                } catch (e) {}
            }
            this.autoEditTimer = this.startEdit.defer(this.editDelay, this, [node.ui.textNode, node.text]);
            return false;
        }
    }
});

Ext.override(Ext.layout.TableLayout, {
	panelStyle : '',
    onLayout : function(ct, target){
        var cs = ct.items.items, len = cs.length, c, i;
        if(!this.table){
            target.addClass('x-table-layout-ct');
			target.addClass(this.panelStyle);
            this.table = target.createChild(
                {tag:'table', cls:'x-table-layout', cellspacing: 0, cn: {tag: 'tbody'}}, null, true);
        }
	this.renderAll(ct, target);//move out that can render items more than once.
    }
}); // To solve the table layout problem that produces an issue in the quick add panel

/**To patch, not solve, ie8 issues - fixes cg-956
* adds a guard for ds null. Needed for internet explorer.
* PAY ATTENTION: The next TWO overrides are needed for fix cg-956. if you are about to change one,
* maybe you need to change both
*/
//if (Ext.isIE) { //REMOVED BECAUSE THE ERROR APPEARS IN FIREFOX TOO
    Ext.override(Ext.grid.GridView, {
        processRows : function(startRow, skipStripe){
    	    if((!(this.ds))||(this.ds.getCount() < 1)){
    	        return;
    	    }
    	    skipStripe = skipStripe || !this.grid.stripeRows;
    	    startRow = startRow || 0;
    	    var rows = this.getRows();
    	    var cls = ' x-grid3-row-alt ';
    	    rows[0].className += ' x-grid3-row-first';
    	    rows[rows.length - 1].className += ' x-grid3-row-last';
    	    for(var i = startRow, len = rows.length; i < len; i++){
    	        var row = rows[i];
    	        row.rowIndex = i;
    	        if(!skipStripe){
    	            var isAlt = ((i+1) % 2 == 0);
    	            var hasAlt = (' '+row.className + ' ').indexOf(cls) != -1;
    	            if(isAlt == hasAlt){
    	                continue;
    	            }
    	            if(isAlt){
    	                row.className += " x-grid3-row-alt";
    	            }else{
    	                row.className = row.className.replace("x-grid3-row-alt", "");
    	            }
    	        }
    	    }
    	}
    });
    Ext.override(Ext.util.Observable, {
        processRows : function(startRow, skipStripe){
    	    if((!(this.ds))||(this.ds.getCount() < 1)){
    	        return;
    	    }
    	    skipStripe = skipStripe || !this.grid.stripeRows;
    	    startRow = startRow || 0;
    	    var rows = this.getRows();
    	    var cls = ' x-grid3-row-alt ';
    	    rows[0].className += ' x-grid3-row-first';
    	    rows[rows.length - 1].className += ' x-grid3-row-last';
    	    for(var i = startRow, len = rows.length; i < len; i++){
    	        var row = rows[i];
    	        row.rowIndex = i;
    	        if(!skipStripe){
    	            var isAlt = ((i+1) % 2 == 0);
    	            var hasAlt = (' '+row.className + ' ').indexOf(cls) != -1;
    	            if(isAlt == hasAlt){
    	                continue;
    	            }
    	            if(isAlt){
    	                row.className += " x-grid3-row-alt";
    	            }else{
    	                row.className = row.className.replace("x-grid3-row-alt", "");
    	            }
    	        }
    	    }
    	}
    });
//} //REMOVED BECAUSE THE ERROR APPEARS IN FIREFOX TOO

/**********************************************************************************************
 * 
 * FIX FOR BUG CG-743
 * 
 **********************************************************************************************/
var libFlyweight;

function fly(el) {
    if (!libFlyweight) {
        libFlyweight = new Ext.Element.Flyweight();
    }
    libFlyweight.dom = el;
    return libFlyweight;
}
Ext.lib.Dom.getXY =  function(el) {
    var p, pe, b, scroll, bd = (document.body || document.documentElement);
    el = Ext.getDom(el);
    if(el == bd){
        return [0, 0];
    }
    if (el.getBoundingClientRect) {
        try{                                                 // LB's code
            b = el.getBoundingClientRect();
        }catch(ex){
            return [0,0];
        }
        scroll = fly(document).getScroll();
        return [b.left + scroll.left, b.top + scroll.top];
    }
    var x = 0, y = 0;
    p = el;
    var hasAbsolute = fly(el).getStyle("position") == "absolute";
    while (p) {
        x += p.offsetLeft;
        y += p.offsetTop;
        if (!hasAbsolute && fly(p).getStyle("position") == "absolute") {
            hasAbsolute = true;
        }
        if (Ext.isGecko) {
            pe = fly(p);
            var bt = parseInt(pe.getStyle("borderTopWidth"), 10) || 0;
            var bl = parseInt(pe.getStyle("borderLeftWidth"), 10) || 0;
            x += bl;
            y += bt;
            if (p != el && pe.getStyle('overflow') != 'visible') {
                x += bl;
                y += bt;
            }
        }
        p = p.offsetParent;
    }
    if (Ext.isSafari && hasAbsolute) {
        x -= bd.offsetLeft;
        y -= bd.offsetTop;
    }
    if (Ext.isGecko && !hasAbsolute) {
        var dbd = fly(bd);
        x += parseInt(dbd.getStyle("borderLeftWidth"), 10) || 0;
        y += parseInt(dbd.getStyle("borderTopWidth"), 10) || 0;
    }

    p = el.parentNode;
    while (p && p != bd) {
        if (!Ext.isOpera || (p.tagName != 'TR' && fly(p).getStyle("display") != "inline")) {
            x -= p.scrollLeft;
            y -= p.scrollTop;
        }
        p = p.parentNode;
    }
    return [x, y];
}
/**********************************************************************************************
 * 
 * FIX FOR BUG CG-743
 * 
 **********************************************************************************************/

/**********************************************************************************************
 * 
 * FIX FOR BUG CG-745
 * 
 **********************************************************************************************/

Ext.override(Ext.Element, {
    mask: function(msg, msgCls) {
        if(this.getStyle("position") == "static"){
            //this.setStyle("position", "relative");
        	//Fix for CG-357, IE7 and I have test CG-745, no impact for it
            this.addClass("x-masked-relative");
        }

        if (this._maskMsg) { this._maskMsg.remove(); }
        if (this._mask){ this._mask.remove(); }
        
        this._mask = Ext.DomHelper.append(this.dom, {cls:"ext-el-mask"}, true);

        this.addClass("x-masked");
        this._mask.setDisplayed(true);
        if(typeof msg == 'string'){
            this._maskMsg = Ext.DomHelper.append(this.dom, {cls:"ext-el-mask-msg", cn:{tag:'div'}}, true);
            
            var mm = this._maskMsg;
            mm.dom.className = msgCls ? "ext-el-mask-msg " + msgCls : "ext-el-mask-msg";
            mm.dom.firstChild.innerHTML = msg;
            mm.setDisplayed(true);
            mm.center(this);
        }
        
        if(Ext.isIE && !Ext.isIE8 && !(Ext.isIE7 && Ext.isStrict) && this.getStyle('height') == 'auto'){ 
            this._mask.setHeight(this.getHeight());
        }
        
        return this._mask;
    }
}); //To avoid the internet explorer 7 and 8 problem in the form editor cg-630

//CG-630 fix for internet explorer y (ie7)
Ext.override(Ext.Shadow, {
	realign : function(l, t, w, h){
    if(!this.el){
        return;
    }
    var a = this.adjusts, d = this.el.dom, s = d.style;
    var iea = 0;
    s.left = (l+a.l)+"px";
    s.top = (t+a.t)+"px";
    var sw = Math.max(3,(w+a.w)), sh = Math.max(3,(h+a.h)), sws = sw +"px", shs = sh + "px";
    if(s.width != sws || s.height != shs){
        s.width = sws;
        s.height = shs;
        if(!Ext.isIE){
            var cn = d.childNodes;
            var sww = Math.max(0, (sw-12))+"px";
            cn[0].childNodes[1].style.width = sww;
            cn[1].childNodes[1].style.width = sww;
            cn[2].childNodes[1].style.width = sww;
            cn[1].style.height = Math.max(0, (sh-12))+"px";
        }
    }
}
});

//CG-4538 required icon appears at the wrong position with IE7
Ext.override(Ext.form.NumberField,{
		markInvalid : function(msg){
		    	Ext.form.TextField.superclass.markInvalid.call(this);
		    	if (Ext.isIE7) {
			    	var domObj = Ext.query('#' + this.errorIcon.id)[0];
			        var posTop = domObj.style.top;
			        if(posTop.substring(0, posTop.length-2) >0)
			        	domObj.style.top = '0px';
		        }
		    }

});


//@author Garay Leonardo - Just override the method to add the RegExp object to this.regex
Ext.override(Ext.form.TextField = Ext.extend(Ext.form.Field,{
    
    
    
    grow : false,
    
    growMin : 30,
    
    growMax : 800,
    
    vtype : null,
    
    maskRe : null,
    
    disableKeyFilter : false,
    
    allowBlank : true,
    
    minLength : 0,
    
    maxLength : Number.MAX_VALUE,
    
    minLengthText : "The minimum length for this field is {0}",
    
    maxLengthText : "The maximum length for this field is {0}",
    
    //CG-1974
    selectOnFocus : true,
    
    blankText : "This field is required",
    
    validator : null,
    
    regex : null,
    
    regexText : "",
    
    emptyText : null,
    
    emptyClass : 'x-form-empty-field',

    

    initComponent : function(){
        Ext.form.TextField.superclass.initComponent.call(this);
        this.addEvents(
            
            'autosize',

            
            'keydown',
            
            'keyup',
            
            'keypress'
        );
    },

    // private
    initEvents : function(){
        Ext.form.TextField.superclass.initEvents.call(this);
        if(this.validationEvent == 'keyup'){
            this.validationTask = new Ext.util.DelayedTask(this.validate, this);
            this.el.on('keyup', this.filterValidation, this);
        }
        else if(this.validationEvent !== false){
            this.el.on(this.validationEvent, this.validate, this, {buffer: this.validationDelay});
        }
        if(this.selectOnFocus || this.emptyText){
            this.on("focus", this.preFocus, this);
            this.el.on('mousedown', function(){
                if(!this.hasFocus){
                    this.el.on('mouseup', function(e){
                        e.preventDefault();
                    }, this, {single:true});
                }
            }, this);
            if(this.emptyText){
                this.on('blur', this.postBlur, this);
                this.applyEmptyText();
            }
        }
        if(this.maskRe || (this.vtype && this.disableKeyFilter !== true && (this.maskRe = XSVTypes[this.vtype+'Mask']))){
            this.el.on("keypress", this.filterKeys, this);
        }
        if(this.grow){
            this.el.on("keyup", this.onKeyUpBuffered,  this, {buffer:50});
            this.el.on("click", this.autoSize,  this);
        }

        if(this.enableKeyEvents){
            this.el.on("keyup", this.onKeyUp, this);
            this.el.on("keydown", this.onKeyDown, this);
            this.el.on("keypress", this.onKeyPress, this);
        }
    },

    processValue : function(value){
        if(this.stripCharsRe){
            var newValue = value.replace(this.stripCharsRe, '');
            if(newValue !== value){
                this.setRawValue(newValue);
                return newValue;
            }
        }
        return value;
    },

    filterValidation : function(e){
        if(!e.isNavKeyPress()){
            this.validationTask.delay(this.validationDelay);
        }
    },
    
    //private
    onDisable: function(){
        Ext.form.TextField.superclass.onDisable.call(this);
        if(Ext.isIE){
            this.el.dom.unselectable = 'on';
        }
    },
    
    //private
    onEnable: function(){
        Ext.form.TextField.superclass.onEnable.call(this);
        if(Ext.isIE){
            this.el.dom.unselectable = '';
        }
    },

    // private
    onKeyUpBuffered : function(e){
        if(!e.isNavKeyPress()){
            this.autoSize();
        }
    },

    // private
    onKeyUp : function(e){
        this.fireEvent('keyup', this, e);
    },

    // private
    onKeyDown : function(e){
        this.fireEvent('keydown', this, e);
    },

    // private
    onKeyPress : function(e){
        this.fireEvent('keypress', this, e);
    },

    
    reset : function(){
        Ext.form.TextField.superclass.reset.call(this);
        this.applyEmptyText();
    },
    
    //CG-4538 required icon appears at the wrong position with IE7
    markInvalid : function(msg){
    	Ext.form.TextField.superclass.markInvalid.call(this);
    	if (Ext.isIE7) {
	    	var domObj = Ext.query('#' + this.errorIcon.id)[0];
	        var posTop = domObj.style.top;
	        if(posTop.substring(0, posTop.length-2) >0)
	        	domObj.style.top = '0px';
        }
    },

    applyEmptyText : function(){
        if(this.rendered && this.emptyText && this.getRawValue().length < 1 && !this.hasFocus){
            this.setRawValue(this.emptyText);
            this.el.addClass(this.emptyClass);
        }
    },

    // private
    preFocus : function(){
        if(this.emptyText){
            if(this.el.dom.value == this.emptyText){
                this.setRawValue('');
            }
            this.el.removeClass(this.emptyClass);
        }
        if(this.selectOnFocus){
            this.el.dom.select();
        }
    },

    // private
    postBlur : function(){
        this.applyEmptyText();
    },

    // private
    filterKeys : function(e){
        if(e.ctrlKey){
            return;
        }
        var k = e.getKey();
        if(Ext.isGecko && (e.isNavKeyPress() || k == e.BACKSPACE || (k == e.DELETE && e.button == -1))){
            return;
        }
        var c = e.getCharCode(), cc = String.fromCharCode(c);
        if(!Ext.isGecko && e.isSpecialKey() && !cc){
            return;
        }
        if(!this.maskRe.test(cc)){
            e.stopEvent();
        }
    },

    setValue : function(v){
        if(this.emptyText && this.el && v !== undefined && v !== null && v !== ''){
            this.el.removeClass(this.emptyClass);
        }
        Ext.form.TextField.superclass.setValue.apply(this, arguments);
        this.applyEmptyText();
        this.autoSize();
    },

    
    validateValue : function(value){
        if(value.length < 1 || value === this.emptyText){ // if it's blank
             if(this.allowBlank){
                 this.clearInvalid();
                 return true;
             }else{
                 this.markInvalid(this.blankText);
                 return false;
             }
        }
        if(value.length < this.minLength){
            this.markInvalid(String.format(this.minLengthText, this.minLength));
            return false;
        }
        if(value.length > this.maxLength){
            this.markInvalid(String.format(this.maxLengthText, this.maxLength));
            return false;
        }
        if(this.vtype){
            var vt = XSVTypes();
            if(!vt[this.vtype](value, this)){
                this.markInvalid(this.vtypeText || vt[this.vtype +'Text']);
                return false;
            }
        }
        if(typeof this.validator == "function"){
            var msg = this.validator(value);
            if(msg !== true){
                this.markInvalid(msg);
                return false;
            }
        }
        
        //@author Garay Leonardo - There is a bug when the regexp value is tested because it is not a RegExp object
        if(this.regex){
        	this.regex = new RegExp(this.regex);
    	}
        
        if(this.regex && !this.regex.test(value)){
            this.markInvalid(this.regexText);
            return false;
        }
        return true;
    },

    
    selectText : function(start, end){
        var v = this.getRawValue();
        var doFocus = false;
        if(v.length > 0){
            start = start === undefined ? 0 : start;
            end = end === undefined ? v.length : end;
            var d = this.el.dom;
            if(d.setSelectionRange){
                d.setSelectionRange(start, end);
            }else if(d.createTextRange){
                var range = d.createTextRange();
                range.moveStart("character", start);
                range.moveEnd("character", end-v.length);
                range.select();
            }
            doFocus = Ext.isGecko || Ext.isOpera;
        }else{
            doFocus = true;
        }
        if(doFocus){
            this.focus();
        }
    },

    
    autoSize : function(){
        if(!this.grow || !this.rendered){
            return;
        }
        if(!this.metrics){
            this.metrics = Ext.util.TextMetrics.createInstance(this.el);
        }
        var el = this.el;
        var v = el.dom.value;
        var d = document.createElement('div');
        d.appendChild(document.createTextNode(v));
        v = d.innerHTML;
        Ext.removeNode(d);
        d = null;
        v += "&#160;";
        var w = Math.min(this.growMax, Math.max(this.metrics.getWidth(v) +  10, this.growMin));
        this.el.setWidth(w);
        this.fireEvent("autosize", this, w);
    }
}));
Ext.reg('textfield', Ext.form.TextField);
/**********************************************************************************************
 * 
 * Performance twak for CG-3726, which improves memory leak for forms
 * 
 **********************************************************************************************/
Ext.override(Ext.form.BasicForm, {
/**	Destroys this form, and all its Fields. */
	destroy: function() {
		this.destroyed = true;
		if (this.txId) {
			Ext.Ajax.abort(this.txId);
			delete this.txId;
		}
		this.items.each(function(f){
		   f.destroy();
		});
		this.purgeListeners();
		this.el.removeAllListeners();
		this.el.remove();
		Ext.ComponentMgr.unregister(this);
	}
});

/**********************************************************************************************
 * 
 * FIX FOR BUG CG-743
 * 
 **********************************************************************************************/
Ext.override(Ext.layout.FormLayout, {
	renderItem : function(c, position, target){
		if(c && !c.rendered && c.isFormField && c.inputType != 'hidden'){
			var args = [
				   c.id, c.fieldLabel,
				   c.labelStyle||this.labelStyle||'',
				   this.elementStyle||'',
				   typeof c.labelSeparator == 'undefined' ? this.labelSeparator : c.labelSeparator,
				   (c.itemCls||this.container.itemCls||'') + (c.hideLabel ? ' x-hide-label' : ''),
				   c.clearCls || 'x-form-clear-left' 
			];
	
			if(typeof position == 'number'){
				position = target.dom.childNodes[position] || null;
			}
			if(position){
				c.formItem = this.fieldTpl.insertBefore(position, args, true);
			}else{
				c.formItem = this.fieldTpl.append(target, args, true);
			}
			c.actionMode = 'formItem';
			c.render('x-form-el-'+c.id);
			c.container = c.formItem;
			c.actionMode = 'container';
		}else {
			Ext.layout.FormLayout.superclass.renderItem.apply(this, arguments);
		}
	},
	
	//CG-1198, set form field label to 140px to suitable for 900px width of pop up dialog
	 setContainer : function(ct){
        Ext.layout.FormLayout.superclass.setContainer.call(this, ct);

        if(ct.labelAlign){
            ct.addClass('x-form-label-'+ct.labelAlign);
        }

        if(ct.hideLabels){
            this.labelStyle = "display:none";
            this.elementStyle = "padding-left:0;";
            this.labelAdjust = 0;
        }else{
            this.labelSeparator = ct.labelSeparator || this.labelSeparator;
            ct.labelWidth = ct.labelWidth || 140;
            if(typeof ct.labelWidth == 'number'){
                var pad = (typeof ct.labelPad == 'number' ? ct.labelPad : 5);
                this.labelAdjust = ct.labelWidth+pad;
                this.labelStyle = "width:"+ct.labelWidth+"px;";
                this.elementStyle = "padding-left:"+(ct.labelWidth+pad)+'px';
             
            }
            if(ct.labelAlign == 'top'){
                this.labelStyle = "width:auto;";
                this.labelAdjust = 0;
                this.elementStyle = "padding-left:0;";
            }
        }

        if(!this.fieldTpl){
            // the default field template used by all form layouts
            //CG-2496
        	var divPrefix = '<div class="x-form-item {5}" tabIndex="-1">';
        	if (Ext.isIE7) {
        		divPrefix = '<div class="x-form-item {5}" tabIndex="-1" style="margin-bottom: 1px">'
        	}
        	if (Ext.isIE && !Ext.isIE7 && !Ext.isIE6) {//If IE8
        		divPrefix = '<div class="x-form-item {5}" tabIndex="-1" style="margin-bottom: 3px">'
        	}
            var t = new Ext.Template(
                divPrefix,
                    '<label for="{0}" style="{2}" class="x-form-item-label">{1}{4}</label>',
                    '<div class="x-form-element" id="x-form-el-{0}" style="{3}">',
                    '</div><div class="{6}"></div>',
                '</div>'
            );
            t.disableFormats = true;
            t.compile();
            Ext.layout.FormLayout.prototype.fieldTpl = t;
        }
    }
});

function XSVTypes(){
    var alpha = /^[a-zA-Z_]+$/;
    var alphanum = /^[a-zA-Z0-9]+$/;
    var alphanumus = /^[a-zA-Z0-9_]+$/;
    var alphanumusdash = /^[a-zA-Z0-9_-]+$/;
    var email = /^([\w]+)(.[\w]+)*@([\w-]+\.){1,5}([A-Za-z]){2,4}$/;
    var url = /(((((https?)|(ftp)):\/\/)?)([\w]+\.)+\w{2,3}(\/[%\-\w]+(\.\w{2,})?)*(([\w\-\.\?\\\/+@&#;`~=%!]*)(\.\w{2,})?)*\/?)/i;
    var phone = /^[\w\d\s\+\(\)\-]+$/;
    var alphabetic = /^[a-zA-Z]+$/;
    var dbcs = /^[^\x00-\xff]+$/;
    var normal = /^[^~!@#$%^&*\(\)+\\|'\"=`{}<>?/\,\.\[\];:]+$/;
    var alphanumericspe = /^[a-zA-Z0-9~!@#$%^&*\(\)+\\|'\"=`{}<>?/\,\.\[\];:_-]+$/;

    return {
        'email' : function(v) {
            return email.test(v);
        },

        'emailText' : 'This field should be an e-mail address in the format "user@domain.com"',

        'emailMask' : /[a-z0-9_\.\-@]/i,

        'url' : function(v) {
            return url.test(v);
        },

        'urlText' : 'This field should be a URL in the format "http:/'
                + '/www.domain.com"',

        'alpha' : function(v) {
            return alpha.test(v);
        },

        'alphaText' : 'This field should only contain letters and _',

        'alphaMask' : /[a-z_]/i,

        'alphanum' : function(v) {
            return alphanum.test(v);
        },

        'alphanumText' : 'This field should only contain letters and numbers',

        'alphanumMask' : /[a-z0-9]/i,
        
        'alphanumus' : function(v) {
            return alphanumus.test(v);
        },

        'alphanumusText' : 'This field should only contain letters, numbers and _',

        'alphanumusMask' : /[a-z0-9_]/i,      
        
        'alphanumusdash' : function(v) {
            return alphanumusdash.test(v);
        },

        'alphanumusdashText' : 'This field should only contain letters, numbers, _ and - ',

        'alphanumusdashMask' : /[a-z0-9_]/i,      
        
        'phone' : function(v){
            return phone.test(v);
        },
        
        'phoneText' : 'This field should only contain letters, numbers and _'
        ,
        'alphabetic' : function(v) {
    		return alphabetic.test(v);
    	},
    	'alphabeticText' : 'This field should only contain letters.',
    	'dbcs' : function(v) {
    		return dbcs.test(v);
    	},
    	'dbcsText' : 'This field should only contain DBCS charactors.',
    	'normal' : function(v) {
    		return normal.test(v);
    	},
    	'normalText' : 'This field any charactor except special chars: !$`~@#%^&*()=+[]{}\\|;:\'",.<>/?',
    	'alphanumericspe' : function(v) {
    		return alphanumericspe.test(v);
    	},
    	'alphanumericspeText' : 'This field should only contain alphanumeric and special characters !$`~@#%^&*()-_=+[]{}\\|;:\'",.<>/?'

    };    
};

//CG-1198, set form field input size to 23 to suitable for 900px width of pop up dialog
Ext.override(Ext.form.Field, {
    defaultAutoCreate : {tag: "input", type: "text", size: "23", autocomplete: "off"}
});

Ext.override(Ext.form.TriggerField, {
	actionMode: 'wrap',
	onShow: Ext.form.TriggerField.superclass.onShow,
	onHide: Ext.form.TriggerField.superclass.onHide
});
Ext.override(Ext.form.Checkbox, {
	actionMode: 'wrap',
	getActionEl: Ext.form.Checkbox.superclass.getActionEl
});
Ext.override(Ext.form.HtmlEditor, {
	actionMode: 'wrap'
});

/*
 * @author Garay Leonardo
 * This fix the problem with the display menu
 * @see http://www.extjs.com/forum/showthread.php?t=63677
 * @see cg-styles.css (Remove old code witch add css style for scroll bars on menus)
 */

Ext.override(Ext.menu.Menu, {
    autoWidth : function(){
        var el = this.el, ul = this.ul;
        if(!el){
            return;
        }
      /*  var w = this.width;
        if(w){
            el.setWidth(w);
        }else if(Ext.isIE && !Ext.isIE8){
            el.setWidth(this.minWidth);
            var t = el.dom.offsetWidth; // force recalc
            //el.setWidth(ul.getWidth()+el.getFrameWidth("lr"));
            el.setWidth(t + t/2);
        }*/
        
        //bug CG-1320, the calendar have it's class, so not need change it
//        if (!this.cls) {
//        	el.setWidth(el.getWidth()+12); /* 12 is the the background image's width*/ 
//        }
    
    },
    showAt : function(xy, parentMenu, /* private: */_e)
	  {
	    this.parentMenu = parentMenu;
	    if (!this.el)
	    {
	      this.render();
	    }
	    if (_e !== false)
	    {
	      this.fireEvent("beforeshow", this);
	      xy = this.el.adjustForConstraints(xy);
	    }
	    this.el.setXY(xy);
	    this.assertMenuHeight(this);
	    this.el.show();
	    this.hidden = false;
	    this.focus();
	    this.fireEvent("show", this);
	  },
	 
	  assertMenuHeight : function(m)
	  {
	  	// CG-1920 [UI] Remove menu scrollbar for New
	  	// Modify the maxHeight from 350 to 500
	    var maxHeight = 550; //Ext.getBody().getHeight() ;
	    if (m.el.getHeight() > maxHeight)
	    {
	      m.el.setHeight(maxHeight);
	      m.el.applyStyles('overflow-y:auto;');
	    }
	  }
	
});

//CG-1200: Sort data at server not client
Ext.override(Ext.data.GroupingStore, {
	applySort : function(){
		Ext.data.GroupingStore.superclass.applySort.call(this);
			if(!this.groupOnSort && !this.remoteGroup){
				var gs = this.getGroupState();
				if(gs && gs != this.sortInfo.field){
					//this.sortData(this.groupField);
				}
			}
		 }
});

//CG-1402
Ext.override(Ext.DatePicker, {
    initComponent : function(){
        Ext.DatePicker.superclass.initComponent.call(this);

        this.value = this.value ?
                 this.value.clearTime() : new Date().clearTime();
		this.setTodayDate(this.todayDate);
        this.addEvents(
            
            'select'
        );

        if(this.handler){
            this.on("select", this.handler,  this.scope || this);
        }

        this.initDisabledDays();
	},
	setTodayDate : function(tDate) {
		this.todayDate = tDate ? tDate.clearTime() : new Date().clearTime();
	},
    onRender : function(container, position){
        var m = [
             '<table cellspacing="0">',
                '<tr><td class="x-date-left"><a href="#" title="', this.prevText ,'">&#160;</a></td><td class="x-date-middle" align="center"></td><td class="x-date-right"><a href="#" title="', this.nextText ,'">&#160;</a></td></tr>',
                '<tr><td colspan="3"><table class="x-date-inner" cellspacing="0"><thead><tr>'];
        var dn = this.dayNames;
        for(var i = 0; i < 7; i++){
            var d = this.startDay+i;
            if(d > 6){
                d = d-7;
            }
            m.push("<th><span>", dn[d].substr(0,1), "</span></th>");
        }
        m[m.length] = "</tr></thead><tbody><tr>";
        for(var i = 0; i < 42; i++) {
            if(i % 7 == 0 && i != 0){
                m[m.length] = "</tr><tr>";
            }
            m[m.length] = '<td><a href="#" hidefocus="on" class="x-date-date" tabIndex="1"><em><span></span></em></a></td>';
        }
        m.push('</tr></tbody></table></td></tr>', 
                this.showToday ? '<tr><td colspan="3" class="x-date-bottom" align="center"></td></tr>' : '', 
                '</table><div class="x-date-mp"></div>');

        var el = document.createElement("div");
        el.className = "x-date-picker";
        el.innerHTML = m.join("");

        container.dom.insertBefore(el, position);

        this.el = Ext.get(el);
        this.eventEl = Ext.get(el.firstChild);

        this.leftClickRpt = new Ext.util.ClickRepeater(this.el.child("td.x-date-left a"), {
            handler: this.showPrevMonth,
            scope: this,
            preventDefault:true,
            stopDefault:true
        });

        this.rightClickRpt = new Ext.util.ClickRepeater(this.el.child("td.x-date-right a"), {
            handler: this.showNextMonth,
            scope: this,
            preventDefault:true,
            stopDefault:true
        });

        this.eventEl.on("mousewheel", this.handleMouseWheel,  this);

        this.monthPicker = this.el.down('div.x-date-mp');
        this.monthPicker.enableDisplayMode('block');
        
        var kn = new Ext.KeyNav(this.eventEl, {
            "left" : function(e){
                e.ctrlKey ?
                    this.showPrevMonth() :
                    this.update(this.activeDate.add("d", -1));
            },

            "right" : function(e){
                e.ctrlKey ?
                    this.showNextMonth() :
                    this.update(this.activeDate.add("d", 1));
            },

            "up" : function(e){
                e.ctrlKey ?
                    this.showNextYear() :
                    this.update(this.activeDate.add("d", -7));
            },

            "down" : function(e){
                e.ctrlKey ?
                    this.showPrevYear() :
                    this.update(this.activeDate.add("d", 7));
            },

            "pageUp" : function(e){
                this.showNextMonth();
            },

            "pageDown" : function(e){
                this.showPrevMonth();
            },

            "enter" : function(e){
                e.stopPropagation();
                return true;
            },

            scope : this
        });

        this.eventEl.on("click", this.handleDateClick,  this, {delegate: "a.x-date-date"});

        this.el.unselectable();
        
        this.cells = this.el.select("table.x-date-inner tbody td");
        this.textNodes = this.el.query("table.x-date-inner tbody span");

        this.mbtn = new Ext.Button({
            text: "&#160;",
            tooltip: this.monthYearText,
            renderTo: this.el.child("td.x-date-middle", true)
        });

        this.mbtn.on('click', this.showMonthPicker, this);
        this.mbtn.el.child(this.mbtn.menuClassTarget).addClass("x-btn-with-menu");

        if(this.showToday){
            this.todayKeyListener = this.eventEl.addKeyListener(Ext.EventObject.SPACE, this.selectToday,  this);
            var today = this.todayDate.dateFormat(this.format);
            this.todayBtn = new Ext.Button({
                renderTo: this.el.child("td.x-date-bottom", true),
                text: String.format(this.todayText, today),
                tooltip: String.format(this.todayTip, today),
                handler: this.selectToday,
                scope: this
            });
        }
        
        if(Ext.isIE){
            this.el.repaint();
        }
        this.update(this.value);
    },
    selectToday : function(){
        if(this.todayBtn && !this.todayBtn.disabled){
	        this.setValue(this.todayDate);
	        this.fireEvent("select", this, this.value);
        }
    },
    update : function(date, forceRefresh){
        var vd = this.activeDate;
        this.activeDate = date;
        if(!forceRefresh && vd && this.el){
            var t = date.getTime();
            if(vd.getMonth() == date.getMonth() && vd.getFullYear() == date.getFullYear()){
                this.cells.removeClass("x-date-selected");
                this.cells.each(function(c){
                   if(c.dom.firstChild.dateValue == t){
                       c.addClass("x-date-selected");
                       setTimeout(function(){
                            try{c.dom.firstChild.focus();}catch(e){}
                       }, 50);
                       return false;
                   }
                });
                return;
            }
        }
        var days = date.getDaysInMonth();
        var firstOfMonth = date.getFirstDateOfMonth();
        var startingPos = firstOfMonth.getDay()-this.startDay;

        if(startingPos <= this.startDay){
            startingPos += 7;
        }

        var pm = date.add("mo", -1);
        var prevStart = pm.getDaysInMonth()-startingPos;

        var cells = this.cells.elements;
        var textEls = this.textNodes;
        days += startingPos;

        // convert everything to numbers so it's fast
        var day = 86400000;
        var d = (new Date(pm.getFullYear(), pm.getMonth(), prevStart)).clearTime();
        var today = this.todayDate.getTime();
        var sel = date.clearTime().getTime();
        var min = this.minDate ? this.minDate.clearTime() : Number.NEGATIVE_INFINITY;
        var max = this.maxDate ? this.maxDate.clearTime() : Number.POSITIVE_INFINITY;
        var ddMatch = this.disabledDatesRE;
        var ddText = this.disabledDatesText;
        var ddays = this.disabledDays ? this.disabledDays.join("") : false;
        var ddaysText = this.disabledDaysText;
        var format = this.format;
        
        if(this.showToday){
            var td = this.todayDate;
            var disable = (td < min || td > max || 
                (ddMatch && format && ddMatch.test(td.dateFormat(format))) || 
                (ddays && ddays.indexOf(td.getDay()) != -1));
                        
            this.todayBtn.setDisabled(disable);
            this.todayKeyListener[disable ? 'disable' : 'enable']();
        }

        var setCellClass = function(cal, cell){
            cell.title = "";
            var t = d.getTime();
            cell.firstChild.dateValue = t;
            if(t == today){
                cell.className += " x-date-today";
                cell.title = cal.todayText;
            }
            if(t == sel){
                cell.className += " x-date-selected";
                setTimeout(function(){
                    try{cell.firstChild.focus();}catch(e){}
                }, 50);
            }
            // disabling
            if(t < min) {
                cell.className = " x-date-disabled";
                cell.title = cal.minText;
                return;
            }
            if(t > max) {
                cell.className = " x-date-disabled";
                cell.title = cal.maxText;
                return;
            }
            if(ddays){
                if(ddays.indexOf(d.getDay()) != -1){
                    cell.title = ddaysText;
                    cell.className = " x-date-disabled";
                }
            }
            if(ddMatch && format){
                var fvalue = d.dateFormat(format);
                if(ddMatch.test(fvalue)){
                    cell.title = ddText.replace("%0", fvalue);
                    cell.className = " x-date-disabled";
                }
            }
        };

        var i = 0;
        for(; i < startingPos; i++) {
            textEls[i].innerHTML = (++prevStart);
            d.setDate(d.getDate()+1);
            cells[i].className = "x-date-prevday";
            setCellClass(this, cells[i]);
        }
        for(; i < days; i++){
            var intDay = i - startingPos + 1;
            textEls[i].innerHTML = (intDay);
            d.setDate(d.getDate()+1);
            cells[i].className = "x-date-active";
            setCellClass(this, cells[i]);
        }
        var extraDays = 0;
        for(; i < 42; i++) {
             textEls[i].innerHTML = (++extraDays);
             d.setDate(d.getDate()+1);
             cells[i].className = "x-date-nextday";
             setCellClass(this, cells[i]);
        }
        
        if(this.format == 'y/m/d') {
        	this.mbtn.setText(date.getFullYear() + " " + this.monthNames[date.getMonth()]);
        }
        else {
        	this.mbtn.setText(this.monthNames[date.getMonth()] + " " + date.getFullYear());
        }        

        if(!this.internalRender){
            var main = this.el.dom.firstChild;
            var w = main.offsetWidth;
            this.el.setWidth(w + this.el.getBorderWidth("lr"));
            Ext.fly(main).setWidth(w);
            this.internalRender = true;
            // opera does not respect the auto grow header center column
            // then, after it gets a width opera refuses to recalculate
            // without a second pass
            if(Ext.isOpera && !this.secondPass){
                main.rows[0].cells[1].style.width = (w - (main.rows[0].cells[0].offsetWidth+main.rows[0].cells[2].offsetWidth)) + "px";
                this.secondPass = true;
                this.update.defer(10, this, [date]);
            }
        }
    }
});
Ext.override(Ext.form.DateField, {
    onTriggerClick : function(){
        if(this.disabled){
            return;
        }
        if(this.menu == null){
            this.menu = new Ext.menu.DateMenu();
        }
        Ext.apply(this.menu.picker,  {
            minDate : this.minValue,
            maxDate : this.maxValue,
            disabledDatesRE : this.disabledDatesRE,
            disabledDatesText : this.disabledDatesText,
            disabledDays : this.disabledDays,
            disabledDaysText : this.disabledDaysText,
            format : this.format,
            showToday : this.showToday,
            minText : String.format(this.minText, this.formatDate(this.minValue)),
            maxText : String.format(this.maxText, this.formatDate(this.maxValue))
        });
        this.menu.on(Ext.apply({}, this.menuListeners, {
            scope:this
        }));
        this.menu.picker.setValue(this.getValue() || this.todayDate || new Date());
        this.menu.picker.setTodayDate(this.todayDate);
        this.menu.show(this.el, "tl-bl?");
    }
});
//CG-1866
Ext.override(Ext.Resizable, {
    resizeElement : function(){
	    var box = this.proxy.getBox();
	    if(this.updateBox){
	        this.el.setBox(box, false, this.animate, this.duration, null, this.easing);
	    }else{
	        this.el.setSize(box.width, box.height, this.animate, this.duration, null, this.easing);
	    }
	    this.updateChildSize();

	    if (this.hasListener('notify')) {
	    	this.fireEvent("notify", this, box.width, box.height, null);
	    }
	    if(!this.dynamic){
	        this.proxy.hide();
	    }
	    return box;
    }
});
//CG-2541
Ext.override(Ext.TabPanel, {
    // private
    onStripMouseDown : function(e){
        if(e.button != 0){
            return;
        }
        e.preventDefault();
        var t = this.findTargets(e);
        
		// [Modified] See http://extjs.com/forum/showthread.php?t=57450
		if(t.close){
			if (t.item.fireEvent('beforeclose', t.item) !== false) {
				t.item.fireEvent('close', t.item);
				this.remove(t.item);
			}
			return;
		}
		/*
        if(t.close){
            this.remove(t.item);
            return;
        }
        */
		
        if(t.item && t.item != this.activeTab){
            this.setActiveTab(t.item);
        }
    },

    setItemTitle : function(itemId, title){
	    var item = this.getComponent(itemId);
	    item.title = title;
        item.fireEvent("titlechange", item);
    }
});
//Ext number format.
//http://www.sencha.com/forum/showthread.php?48600-Ext.util.Format.formatNumber
Ext.apply(Ext.util.Format, {
	numberFormat: {
		decimalSeparator: '.',
		decimalPrecision: 2,
		groupingSeparator: ',',
		groupingSize: 3,
		currencySymbol: '$'
	},
	formatNumber: function(value, numberFormat) {
		var format = Ext.apply(Ext.apply({}, Ext.util.Format.numberFormat), numberFormat);
		if (typeof value !== 'number') {
			value = String(value);
			if (format.currencySymbol) {
				value = value.replace(format.currencySymbol, '');
			}
			if (format.groupingSeparator) {
				value = value.replace(new RegExp(format.groupingSeparator, 'g'), '');
			}
			if (format.decimalSeparator !== '.') {
				value = value.replace(format.decimalSeparator, '.');
			}
			value = parseFloat(value);
		}
		var neg = value < 0;
		value = Math.abs(value).toFixed(format.decimalPrecision);
		var i = value.indexOf('.');
		if (i >= 0) {
			if (format.decimalSeparator !== '.') {
				value = value.slice(0, i) + format.decimalSeparator + value.slice(i + 1);
			}
		} else {
			i = value.length;
		}
		if (format.groupingSeparator) {
			while (i > format.groupingSize) {
				i -= format.groupingSize;
				value = value.slice(0, i) + format.groupingSeparator + value.slice(i);
			}
		}
		if (format.currencySymbol) {
			value = format.currencySymbol + value;
		}
		if (neg) {
			value = '-' + value;
		}
		return value;
	}
});

Ext.apply(Ext.util.CSS, {
	updateStyleSheet : function(cssText, id){
		if (Client.DEV) Ext.time("updateStyleSheet: " + id);
	    var ss;
	    var doc = document;
		var existing = doc.getElementById(id);
	    if(existing){
	    	//alert("EXIST StyleSheet: " + id + ", " + cssText);
	    	if(Ext.isIE){
	            ss = existing.styleSheet;
	            ss.cssText = cssText;
	        }else{
	            try{
	            	existing.removeChild(existing.firstChild);
	            	existing.appendChild(doc.createTextNode(cssText));
	            }catch(e){
	                rules.cssText = cssText;
	            }
	            ss = existing.styleSheet ? existing.styleSheet : (existing.sheet || doc.styleSheets[doc.styleSheets.length-1]);
	        }
	        this.cacheStyleSheet(ss);
	    } else {
	    	//alert("Create StyleSheet: " + id + ", " + cssText);
	    	this.createStyleSheet(cssText, id);
	    }
	    if (Client.DEV) Ext.timeEnd("updateStyleSheet: " + id);
	} 
});


Ext.tree.KeySelectionModel = function(config){
   this.selNode = null; //the key over node, with class x-tree-node-over
   this.selNodes = []; //the acutally selected node, with class x-tree-selected
   this.selMap = {};
   this.addEvents(
       "selectionchange"
   );
    Ext.apply(this, config);
    Ext.tree.KeySelectionModel.superclass.constructor.call(this);
};

Ext.extend(Ext.tree.KeySelectionModel, Ext.util.Observable, {
    init : function(tree){
        this.tree = tree;
        tree.getTreeEl().on("keydown", this.onKeyDown, this);
        tree.on("click", this.onNodeClick, this);
    },
    
    onNodeClick : function(node, e){
        this.select(node, false);
    },
    
    select : function(node, keepExisting){
        if(keepExisting !== true){
            if (this.selNode) {
            	this.selNode.ui.onOut();
            	this.selNode = null;
            }
            
	        if(this.isSelected(node)){
	            this.lastSelNode = node;
	            return node;
	        }
	        
	        this.clearSelections(true);
	        this.selNodes.push(node);
	        this.selMap[node.id] = node;
	        this.lastSelNode = node;
	        node.ui.onSelectedChange(true);
	        this.fireEvent("selectionchange", this, this.selNodes);
        } else {
        	if (this.selNode) {
        		this.selNode.ui.onOut();
        		this.selNode = null;
        	}        	
        	this.selNode = node;
        	if(!this.isSelected(node)){
	            this.selNode.ui.onOver();
	        }
        }
        return node;
    },
    
    
    unselect : function(node){
        if(this.selMap[node.id]){
            node.ui.onSelectedChange(false);
            var sn = this.selNodes;
            var index = sn.indexOf(node);
            if(index != -1){
                this.selNodes.splice(index, 1);
            }
            delete this.selMap[node.id];
            this.fireEvent("selectionchange", this, this.selNodes);
        }
    },


    selectPrevious : function(){
        var s = this.selNode || this.lastSelNode;
        if(!s){
            return null;
        }
        var ps = s.previousSibling;
        if(ps){
            if(!ps.isExpanded() || ps.childNodes.length < 1){
                return this.select(ps, true);
            } else{
                var lc = ps.lastChild;
                while(lc && lc.isExpanded() && lc.childNodes.length > 0){
                    lc = lc.lastChild;
                }
                return this.select(lc, true);
            }
        } else if(s.parentNode && (this.tree.rootVisible || !s.parentNode.isRoot)){
            return this.select(s.parentNode, true);
        }
        return null;
    },

    
    selectNext : function(){
        var s = this.selNode || this.lastSelNode;
        if(!s){
            return null;
        }
        if(s.firstChild && s.isExpanded()){
             return this.select(s.firstChild, true);
         }else if(s.nextSibling){
             return this.select(s.nextSibling, true);
         }else if(s.parentNode){
            var newS = null;
            s.parentNode.bubble(function(){
                if(this.nextSibling){
                    newS = this.getOwnerTree().selModel.select(this.nextSibling, true);
                    return false;
                }
            });
            return newS;
         }
        return null;
    },

    onKeyDown : function(e){
        var s = this.selNode || this.lastSelNode;
        // undesirable, but required
        var sm = this;
        if(!s){
            return;
        }
        var k = e.getKey();
        switch(k){
             case e.DOWN:
                 e.stopEvent();
                 this.selectNext();
             break;
             case e.UP:
                 e.stopEvent();
                 this.selectPrevious();
             break;
             case e.ENTER:
                 e.stopEvent();
                 if(s.hasChildNodes()){
                     if(!s.isExpanded()){
                 	     s.expand();
                     }else if(s.isExpanded){
                 	     s.collapse();
                     }
                 } else {
                	 //trigger click event
                 	 s.fireEvent("click", s, s);
                 }
             break;
        };
    },
    
    isSelected : Ext.tree.MultiSelectionModel.prototype.isSelected,
    
    getSelectedNodes : Ext.tree.MultiSelectionModel.prototype.getSelectedNodes,
    
    clearSelections : Ext.tree.MultiSelectionModel.prototype.clearSelections
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Component controller
function XSComponentController(component){
	//Force non-standard ext components (i.e., Ext.Component + autoEl) that have a label
	//to be "Form Field's". Otherwise, label is is ignored by form
	if (component.isFormField == undefined && component.fieldLabel)
		component.isFormField = true;
	//Black magic. Ia! Ia! Cthulhu fhtagn!
	component.getHeightII = function() {
		if (this.height)
			return this.height;
		if (this.getSize)
			return this.getSize().height;
		return undefined;
	}	
		
	component.getWidthII = function() {
		if (this.width)
			return this.width;
		if (this.getSize)
			return this.getSize().width;
		return undefined;
	}
	
	component.calculateWidth = function(){
	    paddingSize=60; //(20 padding for loggin x 2 -left and right- plus 20. And 20 more
	    myWidth=component.getWidthII()+paddingSize;
	    if (isNaN(myWidth)) myWidth=100; //need some special value, not just 100 (is a default value)
	    if (component.isFormField) myWidth+=100; //instead of +100 there shuld be +form.labelWidth, but i don't have the form
	    return Math.max(myWidth,0);
    }
	
	component.getTarget = function(item) {
		//Most items ignores item
		return component.getEl();
	}
	
	//Re-engineering note: controller should be merged with ext component itself
	return {
		//For submitting
		getInputWidgets: function(){
			return [];
		},
		
		getValue: function(){
			return "";
		},
		
		//Reset/reload
		resetComponent: function(){
			//NO-OP
		},
		
		//Properties setters
		setENABLED: function(enabled){
			if (typeof enabled == 'string') {
				enabled = (enabled == 'true'? true : false);
			}
			component.setDisabled(!enabled);
		},
		
		setDISABLED: function(disabled){
			if (typeof disabled == 'string') {
				disabled = (disabled == 'true'? true : false);
			}
			component.setDisabled(disabled);
		},
		
		setHIDDEN: function(hidden){
			if (typeof hidden == 'string') {
				hidden = (hidden == 'true'? true : false);
			}			
		    if (hidden)
		        component.hide();
		    else
		        component.show();
		}
	};
};

//Input controller
function XSInputController(input) {
	var xscontroller = XSComponentController(input);
	//For submitting
	xscontroller.getInputWidgets = function(){
		//If this widget has id or name to be identified, return it
        if (input.initialConfig.id || input.initialConfig.name)
            return [input];
        else
            return [];
	};
	
	xscontroller.setVALUE = function(value){
		return input.setValue(value);
	};
	
	return xscontroller;
};

//Container controller
function XSContainerController(container,noResize,noLayout) {
	var xscontroller = XSComponentController(container);
	
	//Decorate add method so "doLayout" is inmediate
	container.primitiveAdd = container.add;
	container.add = function(c) {
		this.primitiveAdd(c);
		if (!noLayout)	this.doLayout();
		this.adjust();
	};
		
    container.calculateWidth = function(){
        var myWidth=0;
        if (this.items)
            this.items.each(function(child){
                var childWidth=child.calculateWidth();
                myWidth=(myWidth>childWidth?myWidth:childWidth);
            });
        //alert("width of: "+this.id+" will be: "+myWidth);
        return Math.max(myWidth,0);
    }
    
	//To auto-adjust size
	var scrollOffset = container.initialConfig.autoScroll ? 19 : 0;
	container.adjust = function(){
		if (this.items && !noResize) {
			//Available
			var innerHeight = this.getInnerHeight() - scrollOffset;
			var innerWidth = this.getInnerWidth() - scrollOffset;
			//Percent summation
			var heightPercent = 0;
			
			//Compute available height and total height percent
			this.items.each(function(child){
				if (child.rendered) {
					if (child.heightPercent) 
						heightPercent += child.heightPercent;
					else 
						innerHeight -= child.getHeightII();
				}
			});
			
			//Set size
			this.items.each(function(child){
				if (child.rendered) {
					if (child.heightPercent && child.widthPercent) 
						child.setSize(innerWidth * child.widthPercent / 100, innerHeight * child.heightPercent / heightPercent);
					else if (child.widthPercent) 
						child.setSize(innerWidth * child.widthPercent / 100, child.getHeightII());
					else if (child.heightPercent) 
						child.setSize(child.getWidthII(), innerHeight * child.heightPercent / heightPercent);
				}
			});
		}
	};

	container.addListener("resize",function() {
		this.adjust();
	});

	//For submitting
	xscontroller.getInputWidgets = function(){
		//Collect widgets from each child
		var widgets = [];
		
		if (container.items)
			container.items.each(function(child){
    			var childwidgets = child.xscontroller.getInputWidgets();
    			for (var i = 0; i < childwidgets.length; i++) 
    				widgets.push(childwidgets[i]);
			});
        
		return widgets;
	}
	

	xscontroller.disable=function(value){			
		xscontroller.setENABLED(!(value.toLowerCase()=='true'));
	}
	
	xscontroller.setVisible=function(value){			
		container.setVisible((value.toLowerCase()=='true'));
	}
	
	//Drop subcomponents
	xscontroller.resetComponent = function(){
		if (container.items)
			container.removeAll();
	}
	
	return xscontroller;
};

////PORTAL COLUMN///

function XSPortalColumnController(container) {
	var xscontroller = XSComponentController(container);
	
	container.primitiveAdd = container.add;
	container.add = function(c) {
		this.primitiveAdd(c);
		//if (!noLayout)	this.doLayout();
		this.Portal.reAdjust();
	};
	
	container.pInsert = container.insert;
	container.insert = function(i,c){
		this.pInsert(i,c);
		this.Portal.reAdjust();
	};
	
	/*container.pRemove = container.remove;
	container.remove = function(i,a){
		this.pRemove(i,a);
		this.Portal.reAdjust();
	};*/
		
    container.calculateWidth = function(){
        var myWidth=0;
        if (this.items)
            this.items.each(function(child){
                var childWidth=child.calculateWidth();
                myWidth=(myWidth>childWidth?myWidth:childWidth);
            });
        //alert("width of: "+this.id+" will be: "+myWidth);
        return Math.max(myWidth,0);
    }
    
	//To auto-adjust size
	var scrollOffset = container.initialConfig.autoScroll ? 19 : 0;
	container.adjust = function(){
		if (this.items) {
			Ext.query('.x-column-layout-ct')[0].style.overflowX='hidden';	
			//Delete those f.. empty panels.
			if(this.getNumChilds()==1){
				it = this.items.first();
				if(!it.height){
					this.remove(it);
				}
			}
			//Available screen
			var windowHeight = document.body.clientHeight;
			var estimatedHeight = windowHeight - 133;
			var innerHeight = estimatedHeight - scrollOffset;
			
			var maxChilds = this.Portal.getMaxChilds();
			var childPercent = 100;
			if(this.getNumChilds()>1)
				childPercent = 100/maxChilds;


			//Set size
			this.items.each(function(child){
				if ((child.rendered)&&(child.height)) {
					var tmpHeight = childPercent * innerHeight / 100;
					if(tmpHeight<200) {
						tmpHeight = 200;
					}
					child.setSize(undefined, tmpHeight);
				}
			});
			this.Portal.doLayout();
		}
		
	};

	container.addListener("resize",function() {
		this.adjust();
	});
	
	container.getNumChilds = function(){
		var num = 0;
		this.items.each(function(child){
			num = num + 1;
		});
		return num;
	};

	//For submitting
	xscontroller.getInputWidgets = function(){
		//Collect widgets from each child
		var widgets = [];
		
		if (container.items)
			container.items.each(function(child){
    			var childwidgets = child.xscontroller.getInputWidgets();
    			for (var i = 0; i < childwidgets.length; i++) 
    				widgets.push(childwidgets[i]);
			});
        
		return widgets;
	}
	

	xscontroller.disable=function(value){			
		xscontroller.setENABLED(!(value.toLowerCase()=='true'));
	}
	
	xscontroller.setVisible=function(value){			
		container.setVisible((value.toLowerCase()=='true'));
	}
	
	//Drop subcomponents
	xscontroller.resetComponent = function(){
		if (container.items)
			container.removeAll();
	}
	
	return xscontroller;
};

//Portal column
function XSPortalColumn(config){
    var panel = new Ext.ux.PortalColumn(config);
	panel.xscontroller = XSPortalColumnController(panel,true);
	return panel;
}

//Portlet
function XSPortlet(config){
	var panel = new Ext.ux.Portlet(config);
	panel.xscontroller = XSContainerController(panel);
	return panel;
}

//Button
function XSButtonController(button){
	var xscontroller = XSComponentController(button);
	var msg = 'This field is required.';
	//Fix for CG-1382
	var adjust_IE7_ErrorIcon_Gap = function(button) {
		var domObj = Ext.query('#' + button.errorIcon.id)[0];
        var posLeft = domObj.style.left;
        domObj.style.left = (posLeft.substring(0, posLeft.length-2) - 7) + 'px';
	};
	
	xscontroller.setLABEL = function(label){
		button.setText(label);
	}
	//Fix for CG-1382
	xscontroller.setINVALID = function() {
		button.el.addClass("x-form-invalid");
		if (!button.errorIcon) {
            var elp = button.el.findParent('.x-form-element', 15, true);
            if (!elp) {
                button.el.dom.title = msg;
                return;
            }
            button.errorIcon = elp.createChild({cls:'x-form-invalid-icon'});
        }
        button.errorIcon.alignTo(button.el, 'tl-tr', [2, 0]);
        if (Ext.isIE7) {
        	adjust_IE7_ErrorIcon_Gap(button);
        }
        button.errorIcon.dom.qtip = msg;
        button.errorIcon.dom.qclass = 'x-form-invalid-tip';
        button.errorIcon.show();
	}
	//Fix for CG-1382
	xscontroller.setVALID = function() {
		button.el.removeClass("x-form-invalid");
		if (button.errorIcon) {
			button.errorIcon.dom.qtip = '';
			button.errorIcon.hide();
        }
	}
	return xscontroller;
};

function XSButton(config){
	var button = new Ext.Button(config);
	button.xscontroller = XSButtonController(button);
    return button;
};

//Menu items
function XSItem(config){
	var item = new Ext.menu.Item(config);
	item.xscontroller = XSComponentController(item);
    return item;
};

function XSCheckItem(config){
	var item = new Ext.menu.CheckItem(config);
	item.xscontroller = XSComponentController(item);
    return item;
};

//Timer
function XSTimer(config){
	var timer = new Ext.BoxComponent(config);
	
	//Dummy setSize method (Timer is not visual but Ext does not know)
	timer.setSize = function() {
		//NO-OP
	}
	
	timer.xscontroller = XSComponentController(timer);
    return timer;
};

function XSMonitor(config){
	var monitor = new Ext.BoxComponent(config);
	
	//Dummy setSize method (Monitor, like Timer, is not visual but Ext does not know)
	monitor.setSize = function() {
		//NO-OP
	}
	
	monitor.xscontroller = XSComponentController(monitor);
	
    return monitor;
};

function XSTextController(field) {
	var xscontroller = XSInputController(field);
	//For submitting
	xscontroller.getValue = function(){
		return field.getValue();
	};
	
	xscontroller.setVALUE = function(val){
		return field.setValue(val);
	};
	
	return xscontroller;
};

function XSTextFieldController(field) {
	var xscontroller = XSInputController(field);
	//For submitting
	xscontroller.getValue = function(){
		return field.getValue().replace(/^\s+|\s+$/g,"");
	};
	
	xscontroller.setVALUE = function(val){
		return field.setValue(val);
	};
	
	return xscontroller;
};

//CG-1661
function XSNumberFieldController(field) {
	var xscontroller = XSInputController(field);
	//For submitting
	xscontroller.getValue = function(){
		return field.getValue();
	};
	
	xscontroller.setVALUE = function(val){
		return field.setValue(val);
	};
	
	return xscontroller;
};

//Textbox
function XSTextbox(config) {
	if (config.xsNumeric) {
		var field = new Ext.form.NumberField(config);
		field.addClass("ime-disable");
		field.xscontroller = XSNumberFieldController(field);
	}
	else {
		var field = new Ext.form.TextField(config);
		field.xscontroller = XSTextFieldController(field);
	}
    return field;
};

//Calendar
function XSCalendarController(calendar) {
	var xscontroller = XSInputController(calendar);
	
	var adjustDayDefaultView = function() {
		var divId = calendar.getEl().dom.id;
		//CG-1258
		//Hidden the horizontal scrollbar in all browser.
		var divToScroll = Ext.query('.x-calendar-dayv-day')[0];
		divToScroll.style.overflowX='hidden';
		divToScroll.style.overflowY='auto';
		//CG-1258
		//Prevent the double vertical scrollbar in IE7.
		var divNotScroll = divToScroll.parentNode;
		divNotScroll.style.overflow = 'hidden';
		
		if (divToScroll != null) {
			divToScroll.scrollTop = divToScroll.scrollHeight / 4;
		}
	};
	
	var adjustWeekDefaultView = function() {
		var divId = calendar.getEl().dom.id;
		//CG-1258
		//Hidden the horizontal scrollbar in all browser.
		var divToScroll = Ext.query('#' + divId + '-weekbodydisplay')[0];
		divToScroll.style.overflowX = 'hidden';
		divToScroll.style.overflowY = 'auto';
		//CG-1258
		//Prevent the double vertical scrollbar in IE7.
		var divNotScroll = Ext.query('#' + divId + '-main-calendar-week-body')[0];
		divNotScroll.parentNode.style.overflow='hidden';
		
		if (divToScroll != null) {
			//For IE 7, if not delay for some time, the DIV will crash.
			window.setTimeout(function(){divToScroll.scrollTop = divToScroll.scrollHeight / 4;}, 200);
		}
	};
	
	var adjustDefaultView = function() {
		var cv = calendar.currentView;
		if ('day' == cv) {
			adjustDayDefaultView();
		}
		else if ('week' == cv) {
			adjustWeekDefaultView();
		}
	};
	
	xscontroller.addCalendarEvents = function(data) {
		calendar.store.loadData(data,true);
		calendar.refreshCalendarView();
		adjustDefaultView();//CG-1135
    };
	
	xscontroller.resetComponent = function() {
		calendar.store.loadData([]);
		calendar.refreshCalendarView();
		
		if (calendar.getItems)
			xscontroller.sendGetItems();
    };
	
	xscontroller.sendGetItems = function() {
		Client.sendCallback({_name:"event",name:"getitems",id:calendar.id},[]);
	};

	xscontroller.getValue = function() {
		var items = [];
		
		var selected = calendar.selected;
        for (var i = 0; i < selected.length; i++)
			items.push({_name : "item", id : selected[i].id});
                 
        return items;
    };
	
	return xscontroller;
};

function XSCalendar(config) {
	var calendar = new Ext.ECalendar(config);
    calendar.xscontroller = XSCalendarController(calendar);
    return calendar;
};

//Date Picker
function XSDatePicker(config) {
	var datePicker = new Ext.BoxComponent(config);
    datePicker.xscontroller = XSComponentController(datePicker);
    return datePicker;
};

//HTML Viewer
function XSHTMLViewer(config) {
	var iframe = new Ext.BoxComponent(config);
    iframe.xscontroller = XSComponentController(iframe);
    return iframe;
};

function XSFlexWidgetController(iframe) {
    var xscontroller = XSInputController(iframe);
    //The following arrays might be unnecesary
    xscontroller.xsharpInGoingData  = new Array();
    xscontroller.xsharpInGoingData._elementCount = 0;
    
    xscontroller.xsharpOutGoingData  = new Array();
    xscontroller.xsharpOutGoingData._elementCount = 0;
    
    xscontroller.iframe=iframe;
    
	xscontroller.getValue = function(){
	    if (typeof xscontroller.xsharpInGoingData[(xscontroller.xsharpInGoingData._elementCount-1)] != 'undefined')
	    {
            var value_to_return = xscontroller.xsharpInGoingData[(xscontroller.xsharpInGoingData._elementCount-1)];
		    return serialize(value_to_return);
        } else return "";
	};
    
    xscontroller.receiveFromPlatform = function () {
        if (xscontroller.xsharpOutGoingData._elementCount>0)
        {
            var dataToReturn = xscontroller.xsharpOutGoingData[xscontroller.xsharpOutGoingData._elementCount-1]; 
            xscontroller.xsharpOutGoingData._elementCount--;
            return dataToReturn;
        }
        return null;
    };
    
    xscontroller.setDATA = function (aJSONObject) {
		if (xscontroller.xsharpOutGoingData._elementCount>=0)
        {
            var htmlIframe=Ext.getDom(iframe.id);
			/*The following line is done in this way to avoid ifs to select the browser and get the document. It works on ie and ffox*/
			var htmlIframeDocument=htmlIframe.contentDocument || htmlIframe.contentWindow.document;
			if (htmlIframeDocument.onReceiveFromPlatform) {
			    htmlIframeDocument.onReceiveFromPlatform(aJSONObject);
			} else {            
			    xscontroller.xsharpOutGoingData[xscontroller.xsharpOutGoingData._elementCount]=aJSONObject;
			    xscontroller.xsharpOutGoingData._elementCount++;
			}
        }
    };
    
    /*
    	Function created to correct a JSON object that loses the type of the data 
    */
    function sanitizeJSON(anObject) {
    	if (anObject instanceof String || typeof anObject == 'string' || typeof anObject != 'object')
    		return anObject;
    	
    	for (var i in anObject)
			anObject[i] = sanitizeJSON(anObject[i]);
    		
    	if (anObject instanceof Array || anObject[0] == null)
    		return anObject;
    	
    	var array = [];
    	var index = 0;
    	for (i in anObject)
    		array[index++] = anObject[i];
    	return array;
    }
    
    xscontroller.sendToPlatform = function (anObject) {
    	anObject = sanitizeJSON(anObject);
        xscontroller.xsharpInGoingData[xscontroller.xsharpInGoingData._elementCount]=anObject;
        xscontroller.xsharpInGoingData._elementCount++;
        //Fire the event
		iframe.initialConfig.listeners.receive(anObject);
        //iframe.fireEvent("receive");
        return 0;//This might return 1 if an error occurs, handle this scenario
    };
    return xscontroller;
}

//(NTT)Flex Widget
function XSFlexWidget(config) {
	var iframe = new Ext.BoxComponent(config);
    iframe.xscontroller = XSFlexWidgetController(iframe);
    iframe.receiveFromPlatform = function () {
        return iframe.xscontroller.receiveFromPlatform();
    };
    iframe.getServerBasePath = function () {
        return location.protocol + "//" + location.hostname + (location.port ? (":" + location.port) : "") + JsEndpoint.contextPath;
    }
    iframe.sendToPlatform = function (anObject) {
        return iframe.xscontroller.sendToPlatform(anObject);
    };    
    return iframe;
};

function XSHTMLEditor(config,uploadUrl) {
	config.toolbarItemExcludes=['sourceedit'];
	if (uploadUrl) {
		// CG-3341    [NTTData] [Translation] Inser/Edit Image UI is not Japanese 
		if(config['localeJP'] == 'true'){
			config.plugins = new Ext.ux.JPHTMLEditorImage(uploadUrl);
		}
		else {
			config.plugins = new Ext.ux.HTMLEditorImage(uploadUrl);
		}
	}
	try{
		if(config.value)
			config.value = html_sanitize(config.value);
	}catch(err){
		config.value = '';
	}
	var editor = new Ext.ux.HTMLEditor(config);
    editor.xscontroller = XSTextController(editor);
    return editor;
};

//Text Area
function XSTextAreaController(area) {
	var xscontroller = XSInputController(area);
	//For submitting
	xscontroller.getValue = function(){
		return area.getValue();		
	};
	
	//Methods and properties
    xscontroller.setVALUE = function(content) {
        area.setValue(content);
    };
    
    xscontroller.addContent = function(content) {
        area.setValue(area.getValue() + content);
    };
	
	return xscontroller;
};

function XSTextArea(config) {
	var area = new Ext.form.TextArea(config);
    area.xscontroller = XSTextAreaController(area);
    return area;
};

function XSFormBuilderController(formBuilder) {
	var xscontroller = XSInputController(formBuilder);
	
	// For submitting
	xscontroller.getValue = function(){
		return formBuilder.exportXml();
	};
	
	return xscontroller;
};

function XSFormBuilder(config) {
	var formBuilder = new Ext.ux.FormBuilder(config);
	formBuilder.xscontroller = XSFormBuilderController(formBuilder);
	return formBuilder;
};

//Label
function XSLabelController(label) {
	var xscontroller = XSComponentController(label);	
	
	//Methods and properties
	//CG-2768 Invoice redesign
	//Add method to get value from label with the consistent name of other components
	xscontroller.getValue = function(){
		return label.autoEl.html;
	};
	
    xscontroller.setVALUE = function(content) {
    	if (content != undefined && content != '') {
    		content = labelURLShorten(content);
    	}
        var __label = label.getEl().dom;
        while (__label.hasChildNodes()) {
            __label.removeChild(__label.firstChild);
        }
        __label.appendChild(document.createTextNode(content));
    };
    
    xscontroller.addContent = function(content) {
    	if (content != undefined && content != '') {
    		content = labelURLShorten(content);
    	}
        var __label = label.getEl().dom;
        __label.appendChild(document.createTextNode(content));
    };
	
	return xscontroller;
};

function XSLabel(config) {
	var style ="";
	if (Ext.isMac) {
		style = ".ext-gecko .x-link-label-top{margin-top:2px;}";
		//CG-2730
		if (Client.variables["language-id"] == "ja"){
			style+=".ext-safari .x-link-label-top{margin-top:5px;}";
			style+=".ext-chrome .x-link-label-top{margin-top:5px;}";
		} else {
			style+=".ext-safari .x-link-label-top{margin-top:3px;}";
			style+=".ext-chrome .x-link-label-top{margin-top:3px;}";			
		}
		style+=".ext-safari .x-label-clear{margin-bottom: 2px !important;}";
		style+=".x-label-center{padding-top:4px;padding-bottom: 4px;}";
	}
	else {
		style= ".x-link-label-top{margin-top:4px;+margin-top:5px;}";
		style+=".x-label-center{margin-top:4px;+margin-top:5px;}";
	}
	
	patchStyleSheet(style, "LABEL-PATCH", false);
	
	var label = new Ext.BoxComponent(config);
	if (label.autoEl != undefined && label.autoEl.html != undefined) {
		label.autoEl.html = labelURLShorten(label.autoEl.html);
	}
	label.xscontroller = XSLabelController(label);
    return label;
};
//CG-2427
function labelURLShorten(content) {
	var url = '';
	content += '';
	var start = content.indexOf('<a');
	var end = content.indexOf('</a>');
	if (start > -1 && end > -1) {
		var end1 = content.indexOf('>');
		url = content.substring(end1 + 1, end);
		var urlDisplay = url.length <= 30 ? url : (url.substring(0, 30) + '...');
		var ourputUrl = "<a href='" + url + "' ext:qtip='" + url + "' ext:qwidth='" + parseInt(5.5 * url.length) + "'>" + urlDisplay + "</a>";
		return ourputUrl;
	}
	else {
		return content;
	}
};

function XSComboBoxController(field) {
	var xscontroller = XSInputController(field);
	
	xscontroller.getValue = function() {
	    var value;
	    if (field.initialConfig.remote)
	        value = xscontroller.id;
	    else
	        value = field.getValue();
	    // The preceding underscore is removed
		return value.substring(1);
	};
	
	xscontroller.addOption = function(id, value){
		field.store.add(new Ext.data.Record({value:'_'+id, text:value}));
	};
	
	xscontroller.clearOptions = function(){
		field.store.removeAll();
	};
	
	if (!field.initialConfig.remote) {
		xscontroller.setVALUE = function(value){
			field.setValue('_' + value);
		}
	} else {
		xscontroller.setID = function(id) {
			xscontroller.id = '_' + id;
		};
		var initialId = field.initialConfig.remoteId;
		if (!field.initialConfig.remoteId)
		    initialId = "";
		xscontroller.setID(initialId);
	};
	
	return xscontroller;
};

function XSComboBox(config) {
	if (config.pageTbConfig) {
        Ext.override(Ext.form.ComboBox, {
            // private
            initComponent : function(){
                Ext.form.ComboBox.superclass.initComponent.call(this);
                this.addEvents(
                    
                    'expand',
                    
                    'collapse',
                    
                    'beforeselect',
                    
                    'select',
                    
                    'removelink',
                    
                    'beforequery'
                );
                if(this.transform){
                    this.allowDomMove = false;
                    var s = Ext.getDom(this.transform);
                    if(!this.hiddenName){
                        this.hiddenName = s.name;
                    }
                    if(!this.store){
                        this.mode = 'local';
                        var d = [], opts = s.options;
                        for(var i = 0, len = opts.length;i < len; i++){
                            var o = opts[i];
                            var value = (Ext.isIE ? o.getAttributeNode('value').specified : o.hasAttribute('value')) ? o.value : o.text;
                            if(o.selected) {
                                this.value = value;
                            }
                            d.push([value, o.text]);
                        }
                        this.store = new Ext.data.SimpleStore({
                            'id': 0,
                            fields: ['value', 'text'],
                            data : d
                        });
                        this.valueField = 'value';
                        this.displayField = 'text';
                    }
                    s.name = Ext.id(); // wipe out the name in case somewhere else they have a reference
                    if(!this.lazyRender){
                        this.target = true;
                        this.el = Ext.DomHelper.insertBefore(s, this.autoCreate || this.defaultAutoCreate);
                        Ext.removeNode(s); // remove it
                        this.render(this.el.parentNode);
                    }else{
                        Ext.removeNode(s); // remove it
                    }
                }
                //auto-configure store from local array data
                else if(Ext.isArray(this.store)){
                    if (Ext.isArray(this.store[0])){
                        this.store = new Ext.data.SimpleStore({
                            fields: ['value','text'],
                            data: this.store
                        });
                        this.valueField = 'value';
                    }else{
                        this.store = new Ext.data.SimpleStore({
                            fields: ['text'],
                            data: this.store,
                            expandData: true
                        });
                        this.valueField = 'text';
                    }
                    this.displayField = 'text';
                    this.mode = 'local';
                }
        
                this.selectedIndex = -1;
                if(this.mode == 'local'){
                    if(this.initialConfig.queryDelay === undefined){
                        this.queryDelay = 10;
                    }
                    if(this.initialConfig.minChars === undefined){
                        this.minChars = 0;
                    }
                }
            },
            
            // private
            onKeyUp : function(e){      
                if ((this.el.dom.value == '' || this.el.dom.value == ' ' || this.el.dom.value == null) 
                    && ((e.getKey() == e.BACKSPACE) || (e.getKey() == e.DELETE) || (e.getKey() == e.SPACE))) {
                    this.fireEvent('removelink', this);
                }       
                if(this.editable !== false && !e.isSpecialKey()){
                    this.lastKey = e.getKey();
                    this.dqTask.delay(this.queryDelay);
                }
            }
        });
    }
    // To add i18n to the paging toolbar an extension of the Ext combo box is used. Note that this extension should be reviewed when updating the Ext version
	var combo = config.pageTbConfig ? new Ext.ux.ComboBox(config) : new Ext.form.ComboBox(config);
	//CG-1469
	if (config.makeGap && !Ext.isIE7) {
		combo.ctCls = 'x-form-layout-gap';
	}
	combo.xscontroller = XSComboBoxController(combo);
	//CG-2371
	if (config.pageTbConfig) {
		this.validateCombo = function() {
			combo.validateCombo();
		}; 
	}
    return combo;
};

//Multi
function XSMultiSelectController(multi) {
	var xscontroller = XSInputController(multi);
	//For submitting
	xscontroller.getValue = function(){
		//Get <select> element
		var select = multi.getEl().dom;
		
		//Collect all selected option
        var result = [];
        for (var i = 0; i < select.options.length; i++)
            if (select.options.item(i).selected)
                result.push({_name : "item", id : select.options.item(i).value});
        return result;
	};
	
	return xscontroller;
};

function XSMultiSelect(config){
	var multi = new Ext.BoxComponent(config);
	multi.xscontroller = XSMultiSelectController(multi);
    return multi;
};

//Image
function XSImage(config){
    if (config.src){
            //alert(config.src);
    	    config.src=window.location.host+config.src;
    	    //alert(config.src);
    }
	var image = new Ext.BoxComponent(config);
	image.xscontroller = XSComponentController(image);
	
	image.xscontroller.setSRC = function(value){
		var img = Ext.getDom(config.id + 'img');
		if (value.indexOf('://') != -1) {
			img.src = value;
		} else {
			img.src = location.protocol + "//" + location.hostname + (location.port ? (":" + location.port) : "") + JsEndpoint.contextPath + value + ((value.indexOf('?') != -1)?'&rd='+(new Date().getTime()):'');
		}
	};
	image.xscontroller.setWIDTH = function(value){
		var img = Ext.getDom(config.id + 'img');
		img.width = parseInt(value);
	};
	image.xscontroller.setHEIGHT = function(value){
		var img = Ext.getDom(config.id + 'img');
		img.height = parseInt(value);
	};
	image.xscontroller.setTITLE = function(value){
		var img = Ext.getDom(config.id + 'img');
		img.title = value;
	};	
	image.xscontroller.setALT = function(value){
		var img = Ext.getDom(config.id + 'img');
		img.alt = value;
	};	
    return image;
};

//Link
//Multi
function XSLinkController(link) {
	var xscontroller = XSComponentController(link);
	
	xscontroller.setLABEL = function(newLabel){
		//Get <a> element
		var _link = link.getEl().dom;
		_link.innerHTML=newLabel;
	};
	
	return xscontroller;
};

function XSLink(config){
	var link = new Ext.BoxComponent(config);
	link.xscontroller = XSLinkController(link);
    return link;
};

//Item selector
function XSItemSelectorController(selector) {
	var xscontroller = XSInputController(selector);
	
	//For submitting
	xscontroller.getValue = function(){
		var result = [];
		var idString = selector.getValue();
		if (idString != "") {
			var idArray = idString.split(",");
			for (var i = 0; i < idArray.length; i++)
				result.push({_name : "item", id : idArray[i]});
		}
		return result;
    };
	
	return xscontroller;
};

function XSItemSelector(config){
	var selector = new Ext.ux.ItemSelector(config);
	selector.xscontroller = XSItemSelectorController(selector);
    return selector;
};

//Color picker
function XSDateBoxController(datebox) {
	var xscontroller = XSInputController(datebox);
	
	//For submitting
	xscontroller.getValue = function(){
        
        try {
			//Get date string on rigth format
			if (!datebox.date.getValue().format) return "";
			else if (typeof datebox.date.getValue().format!='function') return ""; 
			var dateString = datebox.date.getValue().format("Y-m-d");
					
			//"Empty" time
			//var timeString = "00:00:00";
			var timeString = "";
			if (datebox.time) {
				var time = datebox.time.getValue();
				if (time != "")
					//Get time on right format
					timeString = Date.parseDate(time, datebox.time.initialConfig.format).format("H:i:s");
				return dateString + "T" + timeString;	
			};
			
			//Return datetime
			return dateString + "T" + "00:00:00";
        } catch(e) {
			return "";
		};
    };
    
    //Methods and properties
    xscontroller.setVALUE = function(value) {
        try {
			value = value.substring(0,19);
			
			//Parse value
			var date = Date.parseDate(value,"Y-m-d\\TH:i:s");
			if (date != undefined) {
				//Set date
            	datebox.date.setValue(date);
				
				//Set time (only if time field is present)
	            if (datebox.time)
	                datebox.time.setValue(date.format(datebox.time.initialConfig.format));
			}
        } catch (e) {
			//NO-OP
		};
    };
	return xscontroller;
};

function XSDateBox(config){
	if(config['fieldStyle'] == 'true'){
		config['layoutConfig'] = {
			panelStyle : 'x-panel-quick-add-color'
		}
	}
	var datebox = new Ext.Panel(config);
	datebox.xscontroller = XSDateBoxController(datebox);
    return datebox;
};

//Color picker
function XSColorPickerController(picker) {
	var xscontroller = XSInputController(picker);
	
	//For submitting
	xscontroller.getValue = function(){
		return picker.getValue();
    };
	
	return xscontroller;
};

function XSColorPicker(config){
	var picker = new Ext.form.ColorField(config);
	picker.xscontroller = XSColorPickerController(picker);
    return picker;
};

//Check Box
function XSCheckBoxController(check) {
	var xscontroller = XSInputController(check);
	
	//For submitting
	xscontroller.getValue = function(){
		return check.getValue() ? "1" : "0";
	};
	xscontroller.setVALUE = function(value) {
	    check.setValue((value.toLowerCase()=='true'));
	};
	return xscontroller;
};

function XSCheckBox(config){
	if(Ext.isIE7){
		config.ctCls = 'x-no-left-padding';
	}
	var check = new Ext.form.Checkbox(config);
	check.xscontroller = XSCheckBoxController(check);
    return check;
};

//Radio Button
function XSRadioButtonController(radio) {
	var xscontroller = XSContainerController(radio,true);
	
	var parent = {getInputWidgets : xscontroller.getInputWidgets};
	xscontroller.getInputWidgets = function(){
		//Look for contained subcomponents only if button is checked
		var widgets = [];
		if (radio.input.checked)
			radio.items.each(function(child) {
				//Discard the radio itself
			    if (child.xscontroller) {
	    			var childwidgets = child.xscontroller.getInputWidgets();
	    			for (var i = 0; i < childwidgets.length; i++) 
	    				widgets.push(childwidgets[i]);
				}
			});
			
		//Include the button itself (only if it is has id or name)
		if (radio.initialConfig.id || radio.initialConfig.name)
			widgets.push(radio);
        
		return widgets;
	};

	//For submitting
	xscontroller.getValue = function(){
		return radio.input.checked ? "1" : "0";
	};
	
	//Enable/disable contained components (avoid disable radio)
	xscontroller.enableRadio = function(enable) {
		var size = radio.items.getCount();				
		//Iterate from 1 (not form 0), ignoring first component (that SHOULD be the radio itself)
		for (var i = 1; i < size; i++){
			//radio.items.itemAt(i).setDisabled(!enable);
			
			//CG-357 & CG-1510
			var radioItem = radio.items.itemAt(i);
			if (radioItem.items){
				
				var radsize = radioItem.items.getCount();		
				//some radio have label attribute (rrule-edit.xsp), but some label use panel as it's label (convert-lead.xsp), so if use panel
				//not need disable the panel label, so start disable radio items from 1.
				var start=1;
				if(radio.fieldLabel != undefined && radio.fieldLabel != "" && radio.fieldLabel != " "){
					start=0;
				}
				
				for (var j = start; j < radsize; j++){	
					var item = radioItem.items.itemAt(j);		
					item.setDisabled(!enable);
				}		
			}else if(radioItem.el){
				radioItem.setDisabled(!enable);
			}
		}

	};
	
	return xscontroller;
};

function XSRadioButton(config){
	var radio = new Ext.Panel(config);
	radio.xscontroller = XSRadioButtonController(radio);
    return radio;
};

//Radio Group
function XSRadioGroupController(group) {
	var xscontroller = XSContainerController(group);
	
	var parent = {getInputWidgets : xscontroller.getInputWidgets};
	xscontroller.getInputWidgets = function(){
		//If group has id or name, add it too
		var widgets = parent.getInputWidgets();
        if (group.initialConfig.id || group.initialConfig.name)
            widgets.push(group);
        return widgets
	};
	
	//For submitting
	xscontroller.getValue = function(){
		var size = group.items.getCount();
		for (var i = 0; i < size; i++) {
			var radio = group.items.itemAt(i);
			if (radio.xscontroller.getValue() == "1" && radio.initialConfig.value)
				return radio.initialConfig.value;
		}
		return "";
	};
	
	//Enable selected radio's components only
	xscontroller.enableRadio = function(selected) {		
		group.items.each(function(radio){
			if (radio.xscontroller.enableRadio){
				radio.xscontroller.enableRadio(radio == selected);
			}
		});
	};
	
	
	//CG-357 & CG-1510
	xscontroller.maskRadio = function(){		
		group.items.each(function(radio){		
			var size = radio.items.getCount();
			var flag=false;
			for (var i = 0; i < size; i++) {
				var radioItem = radio.items.itemAt(i);
				if(radioItem.disabled){
					flag = true;
					radioItem.setDisabled(false);
					break;
				}
			}			
			if(flag){
				radio.xscontroller.enableRadio(false);
			}
	
		});		
	}	
	
	return xscontroller;
};

function XSRadioGroup(config){
	var group = new Ext.Container(config);
	group.xscontroller = XSRadioGroupController(group);
	
	//Getters
	group.getInnerHeight = function() {
		return this.getHeightII();
	}
	
	group.getInnerWidth = function() {
		return this.getWidthII();
	}
	
    return group;
};

//Separator
function XSSeparator(config) {
    var toolbar = new Ext.BoxComponent(config);
    toolbar.xscontroller = XSComponentController(toolbar);
    return toolbar;
};

//Spacer
function XSSpacer(config) {
	var toolbar = new Ext.BoxComponent(config);
    toolbar.xscontroller = XSComponentController(toolbar);
    return toolbar;
};

//Toolbar
function XSToolBar(config) {
    var toolbar = new Ext.Toolbar(config);
    toolbar.xscontroller = XSComponentController(toolbar);
    return toolbar;
};

//Menu
function XSMenu(config) {
	var button = new Ext.Button(config);
	//button.xscontroller = XSComponentController(button);
    button.show = function(target) {
    	var menu = new Ext.menu.Menu(config.menu);
    	menu.show(target);
    };
	
    return button;
};

//Add underline style for linkable cell
function textUnderLine(value, metadata) {
	if(value != ''){
		metadata.attr = 'style="text-decoration: underline; cursor: pointer;"';
	}
	return value;
}

//Grid
function XSGridController(grid) {
	var xscontroller = XSInputController(grid);
	grid.recordIds = new Array();
			
	//Handle grid selection
	var selected = {};
	
	// Prefix used to give a unique ID to each check box since rows may have repeated IDs
	var prefix = 0;
	xscontroller.getPrefix = function() {
	    return prefix++;
	};
	
	xscontroller.unCheckAllList = function(){
		grid.recordIds = new Array();	
		selected = {};
		var hdbox = Ext.getDom('grid_checkboxhd_' + xscontroller.hdindex);
		if (hdbox)
            hdbox.checked = false;
	}
	
	xscontroller.setRowState = function(id, state) {
		selected[id.substr(id.indexOf("-")+1)] = state;
		if (state) {//CG-1842
			var found = false;
			if (grid.recordIds.length > 0) {
			   for (var i = 0; i < grid.recordIds.length; i++) {
			       if (id == grid.recordIds[i]) {
			       	   found = true;  
			    	   break;
			       }
			   }
			}
			if (!found) {
			    grid.recordIds.unshift(id);     
			}
		}
		else {//CG-1842
			for (var i = 0; i < grid.recordIds.length; i++) {
			    if (id == grid.recordIds[i]) {
				    grid.recordIds.splice(i, 1);      
				    break;
			    }
		    }
		}
	};
	xscontroller.sethdState = function(state, checkbox) {
		var index = checkbox.name;
		var hdid = 'grid_checkboxhd_' + index;
		
		if (!state) {
			var box = Ext.getDom(hdid);
			box.checked = false;
		}
		else {
			setHdBoxStatus(index);
		}
	}
	// Get value
    xscontroller.getValue = function() {
		var items = [];
		if (allSelected) {
			allSelected = false;
			items.push({_name : "all"});
		} else {
			//Iterate collection selected ids
			for (id in selected)
				if (selected[id])
					items.push({_name : "item", id : id});
		}
		return items;
    };
	//Reset/Reload grid
	xscontroller.resetComponent = function() {
		grid.getStore().removeAll();
		xscontroller.unCheckAllList();
    };
    xscontroller.notifyDelete = function(ids) {
		var idList = arguments[0];
		if (idList.length > 0) {
			for (var i = 0; i < idList.length; i++) {
				selected[idList[i]] = false;
				for (var j = 0; j < grid.recordIds.length; j++) {
				    var id = grid.recordIds[j];
				    var itemId = id.substr(id.indexOf("-")+1);
				    if (idList[i] == itemId) {
					    grid.recordIds.splice(j, 1);
				    }
			    }
			}
		}
		// set the hd checkbox to unchecked if delete all rows
		if (grid.recordIds.length == 0) {
            var hdbox = Ext.getDom('grid_checkboxhd_' + xscontroller.hdindex);
            if (hdbox)
                hdbox.checked = false;
		}
    }
  //CG-1842
    grid.store.on('load', function(st, recs) {
	    if (grid.recordIds.length > 0) {
		    Ext.each(st.data.items, function(rec) {
		   	    Ext.each(grid.recordIds, function(id) {
		   	        var itemId = id.substr(id.indexOf("-")+1);
			        if (rec.get("id") == itemId) {
				        var domObj = Ext.query('#' + 'grid_checkbox_' + id)[0];
				        domObj.checked = true;
				        selected[itemId] = true;
					    return false;
				    }
			    });
		    });
	    }
        // CG-1150 set select all checkbox status
	    if (recs[0]) {
	        var hdbox = Ext.getDom('grid_checkboxhd_' + xscontroller.hdindex);
	        if (hdbox)
			    setHdBoxStatus(hdbox);
		}
	},grid);

    
	// [QUICK HACK!]
    var allSelected = false;
	xscontroller.selectAll = function() {
		allSelected = true;
    };
    if (grid.editable_grid == true) {
    	xscontroller.getInputWidgets = function() {
    		var inputWidgets = [];
    		var record = grid.store.getModifiedRecords()[0];//Submit one record one time.
    		if (record == undefined) {
    			return [grid];
    		}
    		record.commit();
    		if (record.data) {
    			for (i in record.data) {
	    			var widget = new GridRecordWidget(record.get("id"), i, record.data[i]);
					inputWidgets.push(widget);
	    		}
    		}
    		return inputWidgets;
    	}
    	xscontroller.setVALUE = function(id, name, value) {
            grid.getStore().each(function(record){
                if (record.get("id") == id) {
                    record.set(name, value);
    		        record.commit();
                }
        	});
    	}
    }
    return xscontroller;
};

GridRecordWidget = function(id, name, value) {
	this.xscontroller = {value: value, getValue: function(){return this.value;}};
	this.initialConfig = {id: id, name: name};
}
//This function creates a check box for a grid selecion cell
function stopEvent(event) {
	if (event.stopPropagation)
		//Mozilla
		event.stopPropagation();
	else
		//Explorer
		window.event.cancelBubble = true;
}

function gridCheckBoxMouseDown(event) {
	stopEvent(event);
}

function gridCheckBoxClick(event,gridID,checkbox) {
	stopEvent(event);
	//Look for grid xs controller
	if (!checkbox.xscontroller) 
		checkbox.xscontroller = Ext.getCmp(gridID).xscontroller;
	//Report new row state to grid
	var rowID=checkbox.id.replace("grid_checkbox_", "");
	checkbox.xscontroller.setRowState(rowID,checkbox.checked);
	checkbox.xscontroller.sethdState(checkbox.checked, checkbox);
}

// CG-1150 Add select all checkbox
function gridHdBoxClick(event,hdindex,hdckbox) {
	stopEvent(event);
	var ar = Ext.query('div.x-grid-panel');
	
	for (var i = 0; i < ar.length; i++) {
		var strHTML = ar[i].innerHTML;
		if (strHTML.indexOf(hdindex) > -1) {
			var girdId = ar[i].id;
		}
	}
	
	hdckbox.xscontroller = Ext.getCmp(girdId).xscontroller;

	var array = Ext.query('input');
	
    for (var i = 0; i < array.length; i++) {
        //CG-2593 Checkbox to select all records when editing teams not working.
        var yy = Ext.get(array[i]);
        var strid = yy.dom.id;
        if (strid.indexOf("grid_checkbox_") > -1) {
            var rowId = strid.replace("grid_checkbox_", "");

            if (yy.dom.name == hdindex) {
                if (hdckbox.checked) {
                    yy.dom.checked = true;
                } 
                else {
                    yy.dom.checked = false;
                }
                hdckbox.xscontroller.setRowState(rowId, yy.dom.checked);
            }           
        }
	}
}

function setHdBoxStatus(hdbox) {
	var array = Ext.query('input');
	var isAllRowSelected = true;
	var hasRows = false;	

	for (var i = 0; i < array.length; i++) {
		var strid = array[i].id;
		if (strid.indexOf("grid_checkbox_") > -1) {
			hasRows = true;
			var ckbox = Ext.getDom(strid);
			if (!ckbox.checked) {
				isAllRowSelected = false;
				break;
			}
		}
	}   
	
	hdbox.checked = hasRows && isAllRowSelected;
}

//Grid
function XSGrid(config) {
	if(config['hideFirstCellCSS']){
		Ext.override(Ext.grid.GridView, {
	    	doRender : function(g, k, s, a, q, w) {
				var b = this.templates, e = b.cell, h = b.row, l = q - 1;
				var d = "width:" + this.getTotalWidth() + ";";
				var z = [], t, A, u = {}, m = {
					tstyle : d
				}, o;
				for ( var v = 0, y = k.length; v < y; v++) {
					o = k[v];
					t = [];
					var n = (v + a);
					for ( var x = 0; x < q; x++) {
						A = g[x];
						u.id = A.id;
						u.css = x == 0 ? " "
								: (x == l ? "x-grid3-cell-last " : "");
						u.attr = u.cellAttr = "";
						u.value = A.renderer(o.data[A.name], u, o, n,
								x, s);
						u.style = A.style;
						if (u.value == undefined || u.value === "") {
							u.value = "&#160;"
						}
						if (o.dirty
								&& typeof o.modified[A.name] !== "undefined") {
							u.css += " x-grid3-dirty-cell"
						}
						t[t.length] = e.apply(u)
					}
					var B = [];
					if (w && ((n + 1) % 2 == 0)) {
						B[0] = "x-grid3-row-alt"
					}
					if (o.dirty) {
						B[1] = " x-grid3-dirty-row"
					}
					m.cols = q;
					if (this.getRowClass) {
						B[2] = this.getRowClass(o, n, m, s)
					}
					m.alt = B.join(" ");
					m.cells = t.join("");
					z[z.length] = h.apply(m)
				}
				return z.join("")
			}
	    });
	} else {
		Ext.override(Ext.grid.GridView, {
	    	doRender : function(g, k, s, a, q, w) {
				var b = this.templates, e = b.cell, h = b.row, l = q - 1;
				var d = "width:" + this.getTotalWidth() + ";";
				var z = [], t, A, u = {}, m = {
					tstyle : d
				}, o;
				for ( var v = 0, y = k.length; v < y; v++) {
					o = k[v];
					t = [];
					var n = (v + a);
					for ( var x = 0; x < q; x++) {
						A = g[x];
						u.id = A.id;
						u.css = x == 0 ? "x-grid3-cell-first "
								: (x == l ? "x-grid3-cell-last " : "");
						u.attr = u.cellAttr = "";
						u.value = A.renderer(o.data[A.name], u, o, n,
								x, s);
						u.style = A.style;
						if (u.value == undefined || u.value === "") {
							u.value = "&#160;"
						}
						if (o.dirty
								&& typeof o.modified[A.name] !== "undefined") {
							u.css += " x-grid3-dirty-cell"
						}
						t[t.length] = e.apply(u)
					}
					var B = [];
					if (w && ((n + 1) % 2 == 0)) {
						B[0] = "x-grid3-row-alt"
					}
					if (o.dirty) {
						B[1] = " x-grid3-dirty-row"
					}
					m.cols = q;
					if (this.getRowClass) {
						B[2] = this.getRowClass(o, n, m, s)
					}
					m.alt = B.join(" ");
					m.cells = t.join("");
					z[z.length] = h.apply(m)
				}
				return z.join("")
			}
	    });
	}
	if (config.editable_grid == true) {
		this.grid = new Ext.grid.EditorGridPanel(config);
	}
	else {
		this.grid = new Ext.grid.GridPanel(config);
	}
    grid.xscontroller = new XSGridController(grid);
	
	//Detect fixed and elastic columns
	var fixed = 0;
	var elastics = [];
	for (var i = 0; i < config.columns.length; i++) {
		if (!config.columns[i].hidden) {
			if (config.columns[i].width)
				fixed += config.columns[i].width;
			else 
				elastics.push(i);
		}
	};
	
	if (elastics.length > 0) {
	
		//Resize columns. I do not know why I need to do this explicitly, maybe a easier way exists
		grid.adjustColumns = function(){
			if (this.rendered) {
				//Available width. Number of elastic columns
				var available = this.getInnerWidth() - fixed - 20; //TODO: correct this 20 for the scroll bars
				
				//Ensure minimum width
				var minwidth = 30;	//TODO CHANGE THIS
				var colwidth = available / elastics.length;
				if (colwidth < minwidth)
					colwidth = minwidth;
					
				//Resize columns
				for (var i = 0; i < elastics.length; i++) 
					this.getColumnModel().setColumnWidth(elastics[i], colwidth);
			};
		};
	}
	
	//Sets row set
	grid.setRows = function(rowSet, formatter) {
		this.suspendEvents();
		this.getSelectionModel().clearSelections();
		this.getView().getRowClass = formatter;
		this.getStore().loadData(rowSet);
		this.resumeEvents();
	};
    //Put the adjustColumns() content here because always js error when dashboard is loaded.
	grid.addListener("resize",function(x,adjWidth,adjHeight,rawWidth,rawHeight){
		if (this.rendered) {
			//Available width. Number of elastic columns
			var available = this.getInnerWidth() - fixed - 20; //TODO: correct this 20 for the scroll bars
			
			//Ensure minimum width
			var minwidth = 30;	//TODO CHANGE THIS
			var colwidth = available / elastics.length;
			if (colwidth < minwidth)
				colwidth = minwidth;
				
			//Resize columns
			for (var i = 0; i < elastics.length; i++) 
				this.getColumnModel().setColumnWidth(elastics[i], colwidth);
		}
	});
	
    return grid;
};

//Tree
function XSTreeController(tree,editor,getItems) {
	var xscontroller = XSInputController(tree);
	var expandStatus=false;
	//Get value
	xscontroller.getValue = function() {
		var items = [];
		
		//Get selected records
		var nodes = tree.getSelectionModel().getSelectedNodes();
        
        //Iterate them collection ids
        for (var i = 0; i < nodes.length; i++){
        	if(nodes[i]!=undefined){
    			items.push({_name : "item", id : nodes[i].id});
        	}
        }
                 
        return items;
    };

    xscontroller.resetComponent = function() {
        //Remove top level nodes (children of root)
        var nodes = tree.root.childNodes;
        while (nodes.length)
            nodes[0].remove();

        //Simulate a expand event over root node, to get items
		if (getItems)
			getItems(tree.root);
	};
	
    xscontroller.resetAndExpandComponent = function() {
    	xscontroller.resetComponent();
    	expandStatus=true;
	};
	
	
	//Reload One Tree Node
	xscontroller.reloadNode = function(node_id, nodes){
		var node = node_id ? tree.getNodeById(node_id) : tree.root;
		//Got next node and add before it, else add to the last node.
		var next_sibling = node.nextSibling;
		var parent = node.parentNode;
		
		//Used to selection this node.
		var new_node;
		
		var isSingleExpanded = node.nextSibling == null && node.previousSibling == null && parent.isExpanded();
		parent.removeChild(node);
		if(next_sibling){
			for(var i = 0; i < nodes.length; i++){
				parent.insertBefore(nodes[i], next_sibling);
			}
			new_node = next_sibling.previousSibling;
		} else {
			parent.appendChild(nodes);
			new_node = parent.lastChild;
		}
		
		//Rollback selection/expand of current node
		if(isSingleExpanded){
			parent.expand();
		}
		if(new_node){
			new_node.select();
			if(node.isExpanded()){
				new_node.expand(true);
			}
		}
	}
    
    //Item handling
    tree.addFirst = function(parent_id,nodes,expanded) {
    	//Find parent by ID. If no ID is provided Root is used
		var parent = parent_id ? tree.getNodeById(parent_id) : tree.root;
		//Add nodes at first
		var first = parent.firstChild;
		if (first)
	        for (var i = 0; i < nodes.length; i++)
	        	parent.insertBefore(nodes[i],first);
		else
			parent.appendChild(nodes);
		//Expand?
		if (expanded)
			tree.expandAll();
    }

    tree.addBefore = function(parent_id,sibling_id,nodes,expanded) {
    	//Find parent by ID. If no ID is provided Root is used
		var parent = parent_id ? tree.getNodeById(parent_id) : tree.root;
		//Add before sibling
		var sibling = tree.getNodeById(sibling_id);
		for (var i = 0; i < nodes.length; i++)
			parent.insertBefore(nodes[i],sibling);
		//Expand?
		if (expanded)
			tree.expandAll();
    }
    
    tree.addAfter = function(parent_id,sibling_id,nodes,expanded) {
    	//Find parent by ID. If no ID is provided Root is used
		var parent = parent_id ? tree.getNodeById(parent_id) : tree.root;
		//Add after sibling
		var sibling = tree.getNodeById(sibling_id);
		var next_sibling = sibling.nextSibling;
		if (next_sibling)
	        for (var i = 0; i < nodes.length; i++)
	        	parent.insertBefore(nodes[i],next_sibling);
		else
			parent.appendChild(nodes);
		//Expand?
		if (expanded)
			tree.expandAll();
    }

    tree.addLast = function(parent_id,nodes,expanded) {
    	//Find parent by ID. If no ID is provided Root is used
		var parent = parent_id ? tree.getNodeById(parent_id) : tree.root;
		
		//if tree items has same id with new item, remove it first;
		var chns=parent.childNodes;
		if(chns.length>0){
			for (var j = 0; j < nodes.length; j++){
				for(var i = 0; i < chns.length; i++) {  			
					if(nodes[j].id == chns[i].id){
						chns[i].remove();
						break;
					}
				} 
			} 
		}
		
		//Add nodes at last
		parent.appendChild(nodes);
		//Expand?
		if (expanded || expandStatus)
			tree.expandAll();
    }
	
    xscontroller.renameItem = function(id,name) {
    	if(tree.getNodeById(id) != undefined){
    		tree.getNodeById(id).setText(name);
    	}
    }
    
    xscontroller.removeItem = function(id) {
    	if(tree.getNodeById(id) != undefined){
    		tree.getNodeById(id).remove();
    	}
    }
    
    xscontroller.newNode = function(parent_id, node) {
		var parent_node = tree.getNodeById(parent_id);
		if (parent_node != undefined) {
			parent_node.expand();
			parent_node.appendChild(node);
			parent_node.select();
		}
	}


    
	tree.getTarget = function(item) {
		if (item) {
			//Item provided, look for node
			return tree.getNodeById(item).ui.getAnchor();
		} else {
			//No item provided, return tree's position
			return tree.getEl();			
		};
	}
	
	//To start item edition
	xscontroller.editItem = function(item) {
		if (editor){
			editor.triggerEdit(item);
		}
	}
	
	return xscontroller;
};

function XSTree(treeConfig,editorConfig) {
	//Create tree
    var tree = new Ext.tree.TreePanel(treeConfig);
	
	//Create editor
	if (editorConfig)
		var editor = new Ext.tree.TreeEditor(tree,null,editorConfig);
	else
		var editor = null;

    tree.xscontroller = XSTreeController(tree,editor,treeConfig.listeners ? treeConfig.listeners.expandnode : null);
    return tree;
};
		
//Portal
function XSPortal(config) {
    var portal = new Ext.ux.Portal(config);
    
    // Set the parent to the columns
    portal.items.each(function(child){
		child.Portal = portal;
	});
    
    portal.dt = new Ext.util.DelayedTask();
    
    // Method to allow the columns know about the others
    portal.getMaxChilds = function(){
    	var maxChilds = 0;
    	portal.items.each(function(child){
    		if(child.getNumChilds()>maxChilds)
    			maxChilds = child.getNumChilds();
    	});
    	return maxChilds;
    };

    portal.doReAdjust = function(){
    	this.items.each(function(child){
    		child.fireEvent("resize");
    	});
    };
    
    portal.reAdjust = function(){
    	this.dt.delay(100,this.doReAdjust,this);
    };
    
    portal.xscontroller = new XSContainerController(portal,true);
    return portal;
};

//Tab panel
function XSTab(config) {
	config.hideMode = 'offsets';
    var tab = new Ext.TabPanel(config);
    tab.xscontroller = new XSContainerController(tab,true);
    
    tab.xscontroller.setActivityTab = function(value) {
    	tab.setActiveTab(value);
    };
    //CG-2541
    tab.xscontroller.setItemTitle = function(itemId, title) {
    	tab.setItemTitle(itemId, title);
    };
    
    tab.xscontroller.setUNHIDETAB = function(value) {
		tab.unhideTabStripItem(value);
	};

     tab.xscontroller.setHIDETAB = function(value) {
    	tab.hideTabStripItem(value);
    };
    
    //CG-2567, Force to show form items at tabchage, only at IE7
    if (Ext.isIE7) {
        tab.addListener("tabchange",function(tab,item) {
            if(item && item.rendered) {
            	item.el.select(".x-form-item").each(function(c){c.setVisible(true);});
            	item.el.select(".x-tree").each(function(c){c.setVisible(true);});
            	item.el.select(".x-btn").each(function(c){c.setVisible(true);});
            	item.el.select(".x-panel").each(function(c){c.setVisible(true);});
            }
        });
    }
    return tab;
};

//DDTab panel
function XSDDTab(config) {
	config.hideMode = 'offsets';
    var tab = new Ext.ux.panel.DDTabPanel(config);
    tab.xscontroller = new XSContainerController(tab,true);
    
    tab.xscontroller.setActivityTab = function(value) {
    	tab.setActiveTab(value);
    };
    //CG-2541
    tab.xscontroller.setItemTitle = function(itemId, title) {
    	tab.setItemTitle(itemId, title);
    };
    //CG-2567, Force to show form items at tabchage, only at IE7
    if (Ext.isIE7) {
        tab.addListener("tabchange",function(tab,item) {
            if(item && item.rendered) {
            	item.el.select(".x-form-item").each(function(c){c.setVisible(true);});
            	item.el.select(".x-tree").each(function(c){c.setVisible(true);});
            	item.el.select(".x-btn").each(function(c){c.setVisible(true);});
            	item.el.select(".x-panel").each(function(c){c.setVisible(true);});
            }
        });
    }
    return tab;
};

//Viewport
function XSViewport(config) {
	//Create viewport
    var viewport = new Ext.Viewport(config);
	
	//Viewport does not define this function, simulate it
	viewport.getInnerHeight = function() {
		return this.getHeightII();
	};
	
	viewport.getInnerWidth = function() {
		return this.getWidthII();
	};

	//Add controller
    viewport.xscontroller = XSContainerController(viewport);
    return viewport;
};

//Panel (HTML)
function XSHTMLPanelController(container) {
	var xscontroller = XSContainerController(container);
	
	container.add = function(c) {
		this.body.add(c);
	};
    
	xscontroller.getInputWidgets = function(){
		return container.body.xscontroller.getInputWidgets();
	};
	
	xscontroller.resetComponent = function(){
		container.body.xscontroller.resetComponent();
	};
	
	return xscontroller;
};

function XSHTMLPanel(config) {
	//Create config object for html wrapper
	var htmlconfig = {
		//Auto element to show HTML
		autoEl : {
			tag : "div",
			html : config.html},
		//Listener for render to show inner panel
		listeners: {
			render: function() {
				this.body = new Ext.Panel({
					//The DOM element id inside the HTML where body should appear
					renderTo: config.target,
					 
					//Subitems (should appear on inner panel)
					items: config.items,
					 
					//Events (should happen to inner panel)
					listeners: config.listeners});
					
					//Set controller
					this.body.xscontroller = XSContainerController(this.body);
				}
		}
	};
	
	//Add arguments (others than the ones already used)
	for (i in config) {
		switch (i) {
			case "target":
			case "html":
			case "items":
			case "listeners":
				break;
			default:
				htmlconfig[i] = config[i];
		};
	}
	
	//Create panel
    var panel = new Ext.Panel(htmlconfig);		
	panel.xscontroller = XSHTMLPanelController(panel);
    
	return panel;
};

//Panel (Generic)
function XSPanel(config,noResize,noLayout,dock,dockContainer) {
	if (dock) {
		// Only the main window starts docked
		if (dockContainer.indexOf("main-") == 0)
			config.dockContainer = dockContainer;
		
		var dockConfig = {constrainHeader:true,resizable:false};
		if (config.width)
			dockConfig.width = config.width;
		if (config.height)
			dockConfig.height = config.height;
		config.plugins = [new Ext.ux.DockPanel(dockConfig)];
	};
	
    var panel = new Ext.Panel(config);
	panel.xscontroller = XSContainerController(panel,noResize,noLayout);
	
	// CG-3396 [NTTData] [Usability] Clone function show the UI on the same position as the exiting UI
	if (panel.el != undefined) {
		var wins = Ext.query('.x-window-plain');
        
        var browserWinWidth = this.document.body.scrollWidth;
        var browserWinHeight = this.document.body.scrollHeight;
        var dockWinWidth = config.width;
        var dockWinHeight = config.height;
        
		if (wins.length > 1) {
			var dockwins = new Array();
			var dockwinszindex = new Array();
			for (var i = 0; i < wins.length; i++) {
				var yy = Ext.get(wins[i]);
				var yyId = yy.id;
				// select all the dock windows from the list, see Ext.ux.DockPanel-1.0a.js, line 354
				var isYyDockWindow = yyId.indexOf("_win") ? true : false;
				if (isYyDockWindow) {
					// do not care about the windows which are minimized
					if (yy.getX() > -2000) {
						dockwins[dockwins.length] = yy;
						dockwinszindex[dockwinszindex.length] = yy.zindex;
					}
				}
			}
			
			if (dockwins.length > 1) {				
				dockwinszindex.sort(sortNumber);
				var lastWinZindex = dockwinszindex[dockwinszindex.length - 2];
				var lastWinObj;
				for (var i = 0; i < dockwins.length; i++) {
					if (dockwins[i].zindex == lastWinZindex) {
						lastWinObj = dockwins[i];
						break;
					}
				}
				
				//CG-3950 New dialog should be centered when there is a maximized edit dialog
				var ss = lastWinObj.dom.className;
				var index = ss.indexOf("maximized");
				if (index != -1) {
					//The previous window is maximized so no need to adjust the position of current window
				}
				else {
					var lastDockWinX = lastWinObj.getX();
                    var lastDockWinY = lastWinObj.getY();
                    
                    var newWinLowerRightX = lastDockWinX + 25 + dockWinWidth;
                    var newWinLowerRightY = lastDockWinY + 25 + dockWinHeight;
    
                    // keep going to the lower right under the lower right hand corner of the dialog 
                    // hits the lower right hand corner of the desktop
                    //, and then start new dialogs from the upper left hand corner of the desktop. 
                    if ((browserWinWidth > newWinLowerRightX) && (browserWinHeight > newWinLowerRightY)) {
                        dockwins[dockwins.length - 1].setXY([(lastDockWinX + 25), (lastDockWinY + 25)]);
                    }
                    else {
                        dockwins[dockwins.length - 1].setXY([0, 0]);
                    }
				}												
			}
		}
	}
	if (dock && panel.rendered)
		panel.adjust();
    
	return panel;
};

function sortNumber(a, b) {
    return a - b
}

function XSFrame(config) {
	var nav = navigator.appVersion;
    var ischrome = nav.indexOf("Chrome")? true : false;
    ischrome = ischrome && !Ext.isIE;
	if(Ext.isGecko || ischrome){
	    config['height'] = config['height'] + 15;
	}
	else if (Ext.isIE) {
		config['height'] = config['height'] + 8;
	}
	
	/**Handle wrapped lines*/
	var ua = navigator.userAgent.toLowerCase();
	var isMac = (ua.indexOf("macintosh") != -1 || ua.indexOf("mac os x") != -1);
	if(config['wrapNum'] && config['wrapNum'] != ''){
		if(Ext.isIE7){
			config['height'] = config['height'] - config['wrapNum']*6;
		} else if(Ext.isIE8){
			config['height'] = config['height'] - config['wrapNum']*4;
		} else if(Ext.isSafari){
			if(isMac){
				config['height'] = config['height'] - config['wrapNum']*8;
			} else {
				config['height'] = config['height'] - config['wrapNum']*4;
			}
			
		}
	}
	
    var frame = new Ext.form.FieldSet(config);
	frame.xscontroller = XSContainerController(frame);
    return frame;
};

//Horizontal 
function XSHorizontalPanelController(container) {
	var xscontroller = XSContainerController(container);
	xscontroller.resetComponent = function(){
		if (container.items){
			container.removeAll();
		}
	}
	return xscontroller;
};

function XSHorizontalPanel(config) {
	if(config['fieldStyle'] == 'true'){
		config['layoutConfig'] = {
				panelStyle : 'x-panel-quick-add-color'
		}
	}	
    var panel = new Ext.Panel(config);
    panel.xscontroller = XSHorizontalPanelController(panel);
	
	panel.calculateWidth = function(){	
        var myWidth=0;
        if (this.items)
            this.items.each(function(child){
                var childWidth=child.calculateWidth();
                myWidth=myWidth+childWidth;
            });
        //alert("width of horizontal panel: "+this.id+" will be: "+myWidth);
        return Math.max(myWidth,0);
    }
    
	//Adjust horizontally
	var scrollOffset = panel.initialConfig.autoScroll ? 19 : 0;
	panel.adjust = function(){
		if (this.items) {
			//Available
			var innerHeight = this.getInnerHeight() - scrollOffset;
			var innerWidth = this.getInnerWidth() - scrollOffset;
			//Percent summation
			var widthPercent = 0;
			
			//Compute available width and total width percent
			this.items.each(function(child){
				
				if (child.rendered) {
				
					if (child.widthPercent) 
						widthPercent += child.widthPercent;
					else 
						innerWidth -= child.getWidthII();
				
				}
			});
			
			//Set proportional width
			this.items.each(function(child){
				if (child.rendered) {				
					if (child.heightPercent && child.widthPercent) 
						child.setSize(innerWidth * child.widthPercent / widthPercent, innerHeight * child.heightPercent / 100);
					else if (child.widthPercent) 
						child.setSize(innerWidth * child.widthPercent / widthPercent, child.getHeightII());
					else if (child.heightPercent) 
						child.setSize(child.getWidthII(), innerHeight * child.heightPercent / 100);
				}
			});
		}
	};
	
    return panel;
};

//Accordion
function XSAccordionPanel(config,dock) {
    var panel = dock ? new Ext.ux.DockAccordionPanel(config) : new Ext.Panel(config);
    panel.xscontroller = XSContainerController(panel,true);
    return panel;
};

//Form
function XSFormPanel(config) {

	
	//fix bug CG-955, not need display blank label for panel.
	if(config.fieldLabel && config.fieldLabel==" "){
		config.fieldLabel=null;
	}
	
	
	var panel = new Ext.Panel(config);
    panel.xscontroller = XSContainerController(panel,true);
    return panel;
};

//Window
function XSWindow(config) {
    var window = new Ext.Window(config);

	//More black magic ~ I锟斤浇锟斤浇? Shub-Niggurath! The Black Goat of the Woods with a Thousand Young!
	window.addListener("activate",function(){
		this.adjust();
	});
    window.xscontroller = XSContainerController(window);
    
    /*window.addListener("render",function(){
        if (Ext.isIE) {
            this.setWidth(this.calculateWidth());
            //alert("el width de: "+this.id+" sera: "+this.calculateWidth());
		}
		if (Ext.isGecko2){
			this.setWidth(this.calculateWidth());
		}
		
	});*/
	window.render= function(ct, pos) {
	    Ext.Window.superclass.render.call(this, ct, pos);
	    if (!config.width)
            //if (Ext.isIE) {
                this.setWidth(this.calculateWidth());
                //alert("width of window: "+this.id+" will be: "+this.calculateWidth());
    		/*}
    		if (Ext.isGecko2){
    			this.setWidth(this.calculateWidth());
    		}*/
	};
    
    return window;
};

var MAX_DUMP_DEPTH = 2;

function dumpObj(obj, name, indent, depth) {

       if (depth > MAX_DUMP_DEPTH) {

              return indent + name + ": <Maximum Depth Reached>\n";

       }

       if (typeof obj == "object") {

              var child = null;

              var output = indent + name + "\n";

              indent += "\t";

              for (var item in obj)

              {

                    try {

                           child = obj[item];

                    } catch (e) {

                           child = "<Unable to Evaluate>";

                    }

                    if (typeof child == "object") {

                           output += dumpObj(child, item, indent, depth + 1);

                    } else {

                           output += indent + item + ": " + child + "\n";

                    }

              }

              return output;

       } else {

              return obj;

       }

}

function XSPrompter(config) {
	var _prompter=XSWindow(config);
	
	//We are using now the ext.get because the textbox is now wrapped in a panel, and can be changed the location in further style revisions, so, this way
	//you can always get his contents.
	_prompter.xscontroller.getValue = function(){
		return Ext.get(config.jstextboxid).getValue();
	};
	_prompter.xscontroller.setVALUE = function(val){
		return Ext.get(config.jstextboxid).setValue(val);
	};
	_prompter.xscontroller.getInputWidgets = function(){
		var widgets = [_prompter];
		return widgets;
	}
	return _prompter;
};

//SetViewport
function setViewport(viewport){			
	if (Client.viewport != null){		 
		Client.viewport.destroy();
	}
	Client.viewport = viewport;
}

//This method prepares a drop item response for a callback
function prepareDropItemResponse(response,destination,data) {
	//Set target item if provided
	if (destination != "")
		response.destination = destination;
	
	//Determine source component's type
	if (data.grid) {
		//Dropped a set of grid rows
		response.source = data.grid.id;
		
		//Collect all dropped rows and add them as response's child <item>'s
		response._children = [];
		for (var i = 0; i < data.selections.length; i++)
			response._children.push({_name: 'item', id: data.selections[i].get("id")});
	} else if (data.node) {
		//Dropped a tree node
		response.source = data.node.ownerTree.id;
		response._children = [{_name: 'item', id: data.node.id}];

	} else if (data.calendar) {
		response.source = data.calendar.source;
		response.day = destination;
		response._children = [{_name: 'item', id: data.calendar.itemId}];
	}
}

//Upload
function upload_js(url, lang, filetype){
        //setup the parameters
        var dialog_config=new Object();
        dialog_config.allow_close_on_upload=true;
        dialog_config.title= lang.config_title;
        dialog_config.modal= true;
        Ext.apply(Ext.ux.UploadDialog.Dialog.prototype.i18n, lang);
        dialog_config.url=url;
        if (filetype == 'excel') {
            dialog_config.permitted_extensions=['xls', 'XLS', 'xlsx', 'XLSX'];
        } else if (filetype == 'csv') {
            dialog_config.permitted_extensions=['csv', 'CSV'];
        } else if (filetype == 'tsv') {
            dialog_config.permitted_extensions=['tsv', 'TSV'];
        }        
        // now create the object with desired config
        var dialog=new Ext.ux.UploadDialog.Dialog(dialog_config);
        //dialog.on('uploadfailed',uploadError);
        //dialog.on('uploaderror',uploadError);
        dialog.show();
}

//var __i=0;
var _stylesheet_="";
var _stylesheet_selectors_=[];
var _stylesheet_patchs_=[];
_stylesheet_selectors_.updated = true;

function patchStyleSheet(style, id, isAppend){
	if (!style || ! id) return;
	if (isAppend) {
		Ext.util.CSS.updateStyleSheet(style,id);	
	} else {
		//Don' do patch if exists
		if (!_stylesheet_patchs_[id]){
			_stylesheet_patchs_[id] = 1;
			Ext.util.CSS.updateStyleSheet(style, id);
		}
	}
}

function addNodeToStyleSheet(rules, selector){
	if (!_stylesheet_selectors_[selector]){
		_stylesheet_selectors_[selector] = 1;
		_stylesheet_=_stylesheet_+rules;

		//Avoid appending patch everytime when a selector is added,
		//Instead, patch all style at Client.processContents
		_stylesheet_selectors_.updated = true;
		//patchStyleSheet(_stylesheet_, "INTALIO-CRM", true);
	}
}

//New class to be applied on tree nodes
function getNodeCSS(rules){
	if (!rules) return;
	var name = getCSSName(rules);
	var selector = "." + name + " td";
	
	addNodeToStyleSheet(selector + " {" + rules + "} ", selector);
	
	//Return class name to be setted on components
	return name;
}

//creates a tooltip for text elements
function addTooltip(elemId, value){
	new Ext.ToolTip({
        target: elemId,
        html: value,
        trackMouse:true
    });
}

function getGenericCSS(rules,type){
	var name = getCSSName(rules);
	var selector = "." + name + " " + type;
	addNodeToStyleSheet(selector + " {" + rules + "} ", selector);
	
	//Return class name to be setted on components
	return name;
}

//New class to be applied on grid rows
function getRowCSS(rules){
	var name = getCSSName(rules) + " td";
	var selector = "." + name;
	addNodeToStyleSheet(selector + " {" + rules + "} ", selector);
	
	//Return class name to be setted on components
	return name;
}

//New class to be applied on grid cells (indexed)
function getCellCSS(index,rules){
	var name = getCSSName(rules) + index + " td";
	var selector = "." + name; 
	addNodeToStyleSheet(selector + " {" + rules + "} ", selector);
	
	//Return class name to be setted on components
	return name;
}

//New class to be applied on grid headers
function getHeaderCSS(rules){
	var name = getCSSName(rules) + " td";
	var selector = "." + name;
	addNodeToStyleSheet((selector + " {" + rules + "}"), selector);
	
	//Return class name to be setted on components
	return name;
}

//Generate a class name for the style derived from it
function getCSSName(rules){
	var name = "";
	for (var i = 0; i < rules.length; i++) {
		var c = rules.substr(i,1);//rules[i];
		if ((('a' <= c) && (c <= 'z')) || (('A' <= c) && (c <= 'Z')) || (('0' <= c) && (c <= '9')) || (c == '-')) 
			name += c;
	}
	return name;
}

//Given an Ext Keydown event, returns a character
//-Constants
var ASCII_a = 97;
var ASCII_z = 122;
var ASCII_A = 65;
var ASCII_Z = 90;
var ASCII_0 = 48;
var ASCII_9 = 57;
var ASCII_ENTER = 13;
//-Method
function keyToChar(event) {
	var code = event.getCharCode();
	
	//Upper case letters and numbers
	if ((ASCII_A <= code && code <= ASCII_Z) || (ASCII_0 <= code && code <= ASCII_9))
		return String.fromCharCode(code);
		
	//Lower case letters (need to be converted to upper case)
	if (ASCII_a <= code && code <= ASCII_z)
		return String.fromCharCode(code - ASCII_a + ASCII_A);
		
	//Specific keys
	switch (code) {
		case ASCII_ENTER:
			return "ENTER";
		default:
			//Unknown
			return "[" + code + "]";
	}
}

showEntityEditForm = function(entity_id, object_id, form_id, bpm_bo_reference_id, bpm_task_id){
	Client.sendCallback(
		{
			_name:"event",
			name:"open-editor",
			id:"layout",
			_children:[
				{
					_name:"parameters",
					entity_id:entity_id,
					object_id:object_id,
					form_id:form_id,
					bpm_bo_reference_id:bpm_bo_reference_id,
					bpm_task_id: (bpm_task_id ? bpm_task_id : "")	//Might be absent
				}
			]
		},
		[]
	);
};

// This function is used by BE integration logic
// to obtain frame document where BE application was loaded
function getBeRenderer() {
   var browser = navigator.appName;
   var container;
   if(browser == "Microsoft Internet Explorer") {
      container = beRenderer;
   }
   else {
      d = document;
      f = d.frames ? d.frames["beRenderer"] : d.getElementById("beRenderer");
      container = f.contentWindow;
   }
   return container;
}

(function(){
	var propCache = {},
		camelRe = /(-[a-z])/gi,
		classReCache = {},
		view = document.defaultView,
		propFloat = Ext.isIE ? 'styleFloat' : 'cssFloat',
		opacityRe = /alpha\(opacity=(.*)\)/i;
	function camelFn(a){
		return a.charAt(1).toUpperCase();
	};
	function chkCache(prop){
		return propCache[prop] ||
			(propCache[prop] = prop == 'float' ? propFloat : prop.replace(camelRe, camelFn));
	};
	Ext.apply(Ext, {    
        isObject: function(v) {
            return v && Object.prototype.toString.call(v) == '[object Object]';
        }
    });
	Ext.override(Ext.Element, {
		getStyle : function(){
			return view && view.getComputedStyle ?
				function(prop){
					var el = this.dom,
						v,
						cs;
					if(el == document) return null;
					prop = chkCache(prop);
					return (v = el.style[prop]) ? v :
						   (cs = view.getComputedStyle(el, "")) ? cs[prop] : null;
				} :
				function(prop){
					var el = this.dom,
						m,
						cs;
					if(el == document) return null;
					if (prop == 'opacity') {
						if (el.style.filter.match) {
							if(m = el.style.filter.match(opacityRe)){
								var fv = parseFloat(m[1]);
								if(!isNaN(fv)){
									return fv ? fv / 100 : 0;
								}
							}
						}
						return 1;
					}
					prop = chkCache(prop);
					return el.style[prop] || ((cs = el.currentStyle) ? cs[prop] : null);
				};
		}(),
		setStyle : function(prop, value){
			var tmp,
				style,
				camel;
			if (!Ext.isObject(prop)) {
				tmp = {};
				tmp[prop] = value;
				prop = tmp;
			}
			for (style in prop) {
				value = prop[style];
				style == 'opacity' ?
					this.setOpacity(value) :
					this.dom.style[chkCache(style)] = value;
			}
			return this;
		}
	})
})();
Ext.override(Ext.dd.StatusProxy, {
	update : function(html){
		if(typeof html == "string"){
			this.ghost.update(html);
		}else{
			this.ghost.update("");
			html.style.margin = "0";
			this.ghost.dom.appendChild(html);
		}
		var el = this.ghost.dom.firstChild;
		if(el){
			Ext.fly(el).setStyle('float', 'none');
		}
	}
});