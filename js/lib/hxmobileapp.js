/**
 * hxmobileapp - A UI Framework for Simple MobileApp Web
 * Use zepto、FastClick
 */
 (function( factory ) {
	if ( typeof define === "function" && define.amd ) {

		// AMD. Register as an anonymous module.
		define([
			"zepto",
			"fastclick"
		], factory);
	} else {
		// Browser globals
		factory(Zepto,FastClick);
	}
}(function($,FastClick){
	"use strict";
    var startPath = window.location.pathname + window.location.search,
    	defaultHash = window.location.hash,
    	previousTarget = defaultHash;

    var FastClick = window.FastClick||(require&&require('fastclick'));

    var HXMUI = function(){
		//init the page
		var that = this;

        var setupAFDom = function() {
        	if(FastClick)
                FastClick.attach(document.documentElement);
        }

        if (document.readyState === "complete" || document.readyState === "loaded") {
            setupAFDom();
            if(that.init)
                that.autoBoot();
            else{
                $(window).one("hxmui:init", function() {
                    that.autoBoot();
                });
            }
        } else $(document).ready(
            function() {
                setupAFDom();
                if(that.init)
                    that.autoBoot();
                else{
                    $(window).one("hxmui:init", function() {
                        that.autoBoot();
                    });
                }
            },
        false);


        window.addEventListener("orientationchange",function(){
            window.scrollTo(0, 0);
        });
    };

    HXMUI.prototype={
		init:false,
		hasLaunched: false,
		autoLaunch: true,
		useInternalRouting:true,
		//page默认动画效果
        transitionType : 'slide',
        //自定义动画时的默认动画时间(非page转场动画时间)
        transitionTime : 250,
        //自定义动画时的默认动画函数(非page转场动画函数)
        transitionTimingFunc : 'ease-in',
        //toast 持续时间,默认为3s
        toastDuration : 3000,
        //加载page模板时，是否显示遮罩
        showPageLoading : true,
        //page模板默认的相对位置，主要用于开发hybrid应用，实现page的自动装载
        basePagePath : '../html/',
        basePageSuffix : '.html',
        //page模板的远程路径{#id: href,#id: href}
        remotePage:{},
        //是否有打开的侧边菜单
	    hasMenuOpen : false,
	    //是否有打开的弹出框
	    hasPopupOpen : false,
        autoBoot: function() {
            this.hasLaunched = true;
            if (this.autoLaunch) {
                this.launch();
            }
        },
        launch : function(){
        	this.Router.init();
        	this.Menu.init();
        },
		/**
		* section 页面远程加载
		*/
        page : function(){
        	var that=this;
			var _formatHash = function(hash){
				return hash.indexOf('#') == 0 ? hash.substr(1) : hash;
			}
			/**
			* 加载section模板
			* @param {string} hash信息
			* @param {string} url参数
			*/
			var loadSectionTpl = function(hash,callback){
				var param = {},query,replaceSection = false;
				if($.type(hash) == 'object'){
					param = hash.param;
					query = hash.query;
					hash = hash.tag;
				}
				var q = $(hash).data('query');
				//已经存在则直接跳转到对应的页面
				if($(hash).length == 1){
					if(q == query){
						callback();
						return;
					}else{
						replaceSection = true;
					}
				}
				var id = _formatHash(hash);
				//当前dom中不存在，需要从服务端加载
				var url = that.remotePage[hash];
				//检查remotePage中是否有配置,没有则自动从basePagePath中装载模板
				url || (url = that.basePagePath+id+that.basePageSuffix);
				//todo 动态加载loading
				that.showPageLoading && that.Popup.loading();
				loadContent(url,param,function(html){
					that.showPageLoading && that.Popup.close();
					//添加到dom树中
					$(hash).remove();
					var $h = $(html);
					$('#section_container').append($h);
					if(replaceSection){
						$h.addClass('active');
					}
					//触发pageload事件
					$h.trigger('pageload').data('query',query);
					// //构造组件
					// J.Element.init(hash);
					callback();
					$h = null;
				});
			}
			var loadSectionRemote = function(url,section){
				var param = this.parseHash(window.location.hash).param;
				loadContent(url,param,function(html){
					$(section).html(html);
				});
			}
			/**
			* 加载文档片段
			* @param url
			*/
			var loadContent = function(url,param,callback){
				return $.ajax({
					url : url,
					timeout : 20000,
					data : param,
					success : function(html){
					callback && callback(html);
					}
				});
			}
			return {
				load : loadSectionTpl,
				loadSection : loadSectionRemote,
				loadContent : loadContent
			}
        },
        /**
        * 内部路由控制
        */
        router : function(){
        	var _history = [],that=this;
		    /**
		     * 初始化events、state
		     */
		    var init = function(){
		        $(window).on('popstate', _popstateHandler);
		        
		        $(document).on('click','a',function(e){
		        	if(that.useInternalRouting){
		            	_targetHandler(e,e.currentTarget);
		        	}
		        });
		        _initIndex();
		    }

		    //处理app页面初始化
		    var _initIndex = function(){
		        var targetHash = location.hash;
		        //取页面中第一个section作为app的起始页
		        var $first=$("#section_container section[data-default='true']");
	            if($first.length===0) {
	                $first=$("#section_container section").eq(0);

	                if($first.length===0)
	                    throw ("You need to create a section");
	            }

		        var indexHash = '#'+$first.prop('id');
		        $first.addClass("active");
		        _add2History(indexHash,true);
		        if(targetHash != '' && targetHash != indexHash){
		            _showSection(targetHash);//跳转到指定的页面
		        }else{
		            $first.trigger('pageinit').trigger('pageshow').data('init',true).find('article.active').trigger('articleshow');
		        }
		    }

		    /**
		     * 处理浏览器的后退事件
		     * 前进事件不做处理
		     * @private
		     */
		    var _popstateHandler = function(e){
		    	if(!that.useInternalRouting) return;
		        if(e.state && e.state.hash){
		            var hash = e.state.hash;
		            if(_history[1] && hash === _history[1].hash){//存在历史记录，证明是后退事件
		                that.hasMenuOpen && that.Menu.hide();//关闭当前页面的菜单
		                that.hasPopupOpen && that.Popup.close();//关闭当前页面的弹出窗口
		                back();
		            }else{//其他认为是非法后退或者前进
		                return;
		            }
		        }else{
		            return;
		        }

		    }
		    var _targetHandler = function(e,theTarget){
		        var theTarget=theTarget||e.currentTarget,
		        	_this = $(theTarget),
		            target = _this.attr('data-target'),
		            href = _this.attr('href');
		        //anchors
        		if (theTarget.tagName !== "undefined" && theTarget.tagName.toLowerCase() === "a") {
        			if (!target&&(theTarget.href.toLowerCase().indexOf("javascript:") !== -1 || theTarget.getAttribute("data-ignore"))) {
		                return;
		            }
		            //empty links
            		if (!target&&(href === "#" || (href.indexOf("#") === href.length - 1) || (href.length === 0 && theTarget.hash.length === 0))){
            			return e.preventDefault();
            		}
            		//internal links
		            //http urls
		            var urlRegex=/^((http|https|file):\/\/)/;
		            //only call prevent default on http/fileurls.  If it's a protocol handler, do not call prevent default.
		            //It will fall through to the ajax call and fail
		            if(theTarget.href.indexOf(":") !== -1 &&urlRegex.test(theTarget.href)){
		                e.preventDefault();
		            }
			        switch(target){
			            case 'section' :
			                _showSection(href);
			                break;
			            case 'article' :
			                _showArticle(href,_this);
			                break;
			            case 'menu' :
			                _toggleMenu(href);
			                break;
			            case 'back' :
			                window.history.go(-1);
			                break;
			        }
		        }
		    }

		    /**
		     * 跳转到新页面
		     * @param hash 新page的'#id'
		     */
		    var _showSection  = function(hash){
		        if(that.hasMenuOpen){//关闭菜单后再转场
		            that.Menu.hide(200,function(){
		                _showSection(hash);
		            });
		            return;
		        }
		        //读取hash信息
		        var hashObj = that.parseHash(hash);
		        var current = _history[0];
		        //同一个页面,则不重新加载
		        if(current.hash === hashObj.hash){
		            return;
		        }
		        //加载模板
		        that.Page.load(hashObj,function(){
		            var sameSection = (current.tag == hashObj.tag);
		           if(sameSection){//相同页面，触发相关事件
		               $(current.tag).trigger('pageshow').find('article.active').trigger('articlehide');
		           }else{//不同卡片页跳转动画
		               _changePage(current.tag,hashObj.tag);
		           }
		            _add2History(hash,sameSection);
		        });
		    }
		    /**
		     * 后退
		     */
		    var back = function(){
		        _changePage(_history.shift().tag,_history[0].tag,true)
		    }
		    var _changePage = function(current,target,isBack){
		        that.Transition.run(current,target,isBack);
		    }
		    /**
		     * 缓存访问记录
		     */
		    var _add2History = function(hash,noState){
		       var hashObj = that.parseHash(hash);
		        if(noState){//不添加浏览器历史记录
		            _history.shift(hashObj);
		            window.history.replaceState(hashObj,'',hash);
		        }else{
		            window.history.pushState(hashObj,'',hash);
		        }
		        _history.unshift(hashObj);
		    }

		    /**
		     * 激活href对应的article
		     * @param href #id
		     * @param el 当前锚点
		     */
		    var _showArticle = function(href,el){
		        var article = $(href);
		        if(article.hasClass('active'))return;
		        el.addClass('active').siblings('.active').removeClass('active');
		        var activeArticle = article.addClass('active').siblings('.active').removeClass('active');
		        article.trigger('articleshow');
		        activeArticle.trigger('articlehide');
		    }

		    var _toggleMenu = function(hash){
		        that.hasMenuOpen?that.Menu.hide():that.Menu.show(hash);
		    }

		    return {
		        init : init,
		        goTo : _showSection,
		        showArticle : _showArticle,
		        back : back
		    }
        },
        //动画转场
        transition : function(){
        	var isBack,$current,$target,transitionName,
		        animationClass = {
			        //[[currentOut,targetIn],[currentOut,targetIn]]
			        slide : [['slideLeftOut','slideLeftIn'],['slideRightOut','slideRightIn']],
			        cover : [['','slideLeftIn'],['slideRightOut','']],
			        slideUp : [['','slideUpIn'],['slideDownOut','']],
			        slideDown : [['','slideDownIn'],['slideUpOut','']],
			        popup : [['','scaleIn'],['scaleOut','']]
		        };

		    var _doTransition = function(){
		        //触发 beforepagehide 事件
		        $current.trigger('beforepagehide',[isBack]);
		        //触发 beforepageshow 事件
		        $target.trigger('beforepageshow',[isBack]);
		        var c_class = transitionName[0]||'empty' ,t_class = transitionName[1]||'empty';
		        $current.bind('webkitAnimationEnd.hxmui', _finishTransition).addClass('anim '+ c_class);
		        $target.addClass('anim animating '+ t_class);
		    }
		    var _finishTransition = function() {
		        $current.off('webkitAnimationEnd.hxmui');
		        $target.off('webkitAnimationEnd.hxmui');
		        //reset class
		        $current.attr('class','');
		        $target.attr('class','active');
		        //add custom events
		        !$target.data('init') && $target.trigger('pageinit').data('init',true);
		        !$current.data('init') && $current.trigger('pageinit').data('init',true);
		        //触发pagehide事件
		        $current.trigger('pagehide',[isBack]);
		        //触发pageshow事件
		        $target.trigger('pageshow',[isBack]);

		        $current.find('article.active').trigger('articlehide');
		        $target.find('article.active').trigger('articleshow');
		        $current = $target = null;//释放
		    }

		    /**
		     * 执行转场动画，动画类型取决于目标page上动画配置(返回时取决于当前page)
		     * @param current 当前page
		     * @param target  目标page
		     * @param back  是否为后退
		     */
		    var run = function(current,target,back){
		        //关闭键盘
		        $(':focus').trigger('blur');
		        isBack = back;
		        $current = $(current);
		        $target = $(target);
		        var type = isBack?$current.attr('data-transition'):$target.attr('data-transition');
		        type = type|| this.transitionType;
		        //后退时取相反的动画效果组
		        transitionName  = isBack ? animationClass[type][1] : animationClass[type][0];
		        _doTransition();
		    }

		    /**
		     * 添加自定义转场动画效果
		     * @param name  动画名称
		     * @param currentOut 正常情况下当前页面退去的动画class
		     * @param targetIn   正常情况下目标页面进入的动画class
		     * @param backCurrentOut 后退情况下当前页面退去的动画class
		     * @param backCurrentIn 后退情况下目标页面进入的动画class
		     */
		    var addAnimation = function(name,currentOut,targetIn,backCurrentOut,backCurrentIn){
		        if(animationClass[name]){
		            console.error('该转场动画已经存在，请检查你自定义的动画名称(名称不能重复)');
		            return;
		        }
		        animationClass[name] = [[currentOut,targetIn],[backCurrentOut,backCurrentIn]];
		    }
		    return {
		        run : run,
		        add : addAnimation
		    }
        },
        parseHash : function(hash){
	        var tag,query,param={};
	        var arr = hash.split('?');
	        tag = arr[0];
	        if(arr.length>1){
	            var seg,s;
	            query = arr[1];
	            seg = query.split('&');
	            for(var i=0;i<seg.length;i++){
	                if(!seg[i])continue;
	                s = seg[i].split('=');
	                param[s[0]] = s[1];
	            }
	        }
	        return {
	            hash : hash,
	            tag : tag,
	            query : query,
	            param : param
	        }
    	},
    	menu :function(){
    		var $asideContainer,$sectionContainer,$sectionMask;
    		var that=this;
    		//初始化
    		var init = function(){
		        $asideContainer = $('#aside_container');
		        $sectionContainer = $('#section_container');
		        $sectionMask = $('<div id="section_container_mask"></div>').appendTo('#section_container');
		        //添加各种关闭事件
		        $sectionMask.on('click',hideMenu);
		        //滑动关闭暂时不支持
		        // $asideContainer.on('swipeRight','aside',function(){
		        //     if($(this).data('position') == 'right'){
		        //         hideMenu();
		        //     }
		        // });
		        // $asideContainer.on('swipeLeft','aside',function(){
		        //     if($(this).data('position') != 'right'){
		        //         hideMenu();
		        //     }
		        // });
		        $asideContainer.on('click','.aside-close',hideMenu);
		    }
		    /**
		     * 打开侧边菜单
		     * @param selector css选择器或element实例
		     */
		    var showMenu = function(selector){
		        var $aside = $(selector).addClass('active'),
		            transition = $aside.data('transition'),// push overlay  reveal
		            position = $aside.data('position') || 'left',
		            width = $aside.width(),
		            translateX = position == 'left'?width+'px':'-'+width+'px';

		        //todo aside中可能需要scroll组件

		        if(transition == 'overlay'){
		            that.anim($aside,{translateX : '0%'});
		        }else if(transition == 'reveal'){
		            that.anim($sectionContainer,{translateX : translateX});
		        }else{//默认为push
		            that.anim($aside,{translateX : '0%'});
		            that.anim($sectionContainer,{translateX : translateX});
		        }
		        $('#section_container_mask').show();
		        that.hasMenuOpen = true;
		    }
		    /**
		     * 关闭侧边菜单
		     * @param duration {int} 动画持续时间
		     * @param callback 动画完毕回调函数
		     */
		    var hideMenu = function(duration,callback){
		        var $aside = $('#aside_container aside.active'),
		            transition = $aside.data('transition'),// push overlay  reveal
		            position = $aside.data('position') || 'left',
		            translateX = position == 'left'?'-100%':'100%';

		        var _finishTransition = function(){
		            $aside.removeClass('active');
		            that.hasMenuOpen = false;
		            callback && callback.call(this);
		        };

		        if(transition == 'overlay'){
		            that.anim($aside,{translateX : translateX},duration,_finishTransition);
		        }else if(transition == 'reveal'){
		            that.anim($sectionContainer,{translateX : '0'},duration,_finishTransition);
		        }else{//默认为push
		            that.anim($aside,{translateX : translateX},duration);
		            that.anim($sectionContainer,{translateX : '0'},duration,_finishTransition);
		        }

		        $('#section_container_mask').hide();
		    }
		    return {
		        init : init,
		        show : showMenu,
		        hide : hideMenu
		    }
    	},
    	//完善zepto的动画函数，让参数变为可选
    	anim : function(el,animName,duration,ease,callback){
	        var d, e,c,that=this;
	        var len = arguments.length;
	        for(var i = 2;i<len;i++){
	            var a = arguments[i];
	            var t = $.type(a);
	            t == 'number'?(d=a):(t=='string'?(e=a):(t=='function')?(c=a):null);
	        }
	        $(el).animate(animName,d|| that.transitionTime,e||that.transitionTimingFunc,c);
	    },
	    //弹框
	    popup : function(){
	    	var _popup,_mask,transition,clickMask2close,
	    		POSITION = {
	            'top':{
	                top:0,
	                left:0,
	                right:0
	            },
	            'center':{
	                top:'50%',
	                left:'5%',
	                right:'5%',
	                'border-radius' : '3px'
	            },
	            'bottom' : {
	                bottom:0,
	                left:0,
	                right:0
	            },
	        },
	        ANIM = {
	            top : ['slideDownIn','slideUpOut'],
	            bottom : ['slideUpIn','slideDownOut'],
	            defaultAnim : ['bounceIn','bounceOut']
	        },
	        TEMPLATE = {
	            loading : '<p>{title}</p>'
	        },
	        that=this;

	        /**
		     * 全局只有一个popup实例
		     * @private
		     */
		    var _init = function(){
		        $('body').append('<div id="hxm_popup"></div><div id="hxm_popup_mask"></div>');
		        _mask = $('#hxm_popup_mask');
		        _popup = $('#hxm_popup');
		        _subscribeEvents();
		    }

		    var show = function(options){
		        var settings = {
		            height : undefined,//高度
		            width : undefined,//宽度
		            opacity : 0.3,//透明度
		            html : '',//popup内容
		            pos : 'center',//位置 {@String top|center|bottom|}   {@object  css样式}
		            clickMask2Close : false,// 是否点击外层遮罩关闭popup
		            animation : true,//是否显示动画
		            timingFunc : 'linear',
		            duration : 200,//动画执行时间
		            onShow : undefined //@event 在popup内容加载完毕，动画开始前触发
		        }
		        $.extend(settings,options);
		        clickMask2close = settings.clickMask2Close;
		        _mask.css('opacity',settings.opacity);
		        //rest position and class
		        _popup.attr({'style':'','class':''});
		        settings.width && _popup.width(settings.width);
		        settings.height && _popup.height(settings.height);
		        var pos_type = $.type(settings.pos);
		        if(pos_type == 'object'){// style
		            _popup.css(settings.pos);
		            transition = ANIM['defaultAnim'];
		        }else if(pos_type == 'string'){
		            if(POSITION[settings.pos]){ //已经默认的样式
		                _popup.css(POSITION[settings.pos])
		                var trans_key = settings.pos.indexOf('top')>-1?'top':(settings.pos.indexOf('bottom')>-1?'bottom':'defaultAnim');
		                transition = ANIM[trans_key];
		            }else{// pos 为 class
		                _popup.addClass(settings.pos);
		                transition = ANIM['defaultAnim'];
		            }
		        }else{
		            console.error('错误的参数！');
		            return;
		        }
		        _mask.show();
		        var html;
		        if(settings.html){
		            html = settings.html;
		        }

		        _popup.html(html).show();
		        //执行onShow事件，可以动态添加内容
		        settings.onShow && settings.onShow.call(_popup);

		        //显示获取容器高度，调整至垂直居中
		        if(settings.pos == 'center'){
		            var height = _popup.height();
		            _popup.css('margin-top','-'+height/2+'px')
		        }
		        if(settings.animation){
		            that.anim(_popup,transition[0],settings.duration,settings.timingFunc);
		        }
		        that.hasPopupOpen = true;
		    }

		    /**
		     * 关闭弹出框
		     * @param noTransition 立即关闭，无动画
		     */
		    var hide = function(noTransition){
		        _mask.hide();
		        if(transition && !noTransition){
		            that.anim(_popup,transition[1],200,function(){
		                _popup.hide().empty();
		                that.hasPopupOpen = false;
		            });
		        }else{
		            _popup.hide().empty();
		            that.hasPopupOpen = false;
		        }

		    }
		    var _subscribeEvents = function(){
		        _mask.on('click',function(){
		            clickMask2close &&  hide();
		        });
		        _popup.on('click','[data-target="closePopup"]',function(){hide();});
		    }
		    /**
		     * loading弹框
		     * @param text 文本，默认为“加载中...”
		     */
		    var loading = function(text){
		        var markup = TEMPLATE.loading.replace('{title}',text||'加载中...');
		        show({
		            html : markup,
		            pos : 'loading',
		            opacity :.1,
		            animation : true,
		            clickMask2Close : false
		        });
		    }

		    _init();
		    return {
		        show : show,
		        close : hide,
		        loading : loading
		    }
	    },
	    toast : function(){
		    var toast_type = 'toast',_toast,timer,that=this,
		        //定义模板
		        TEMPLATE = {
		            toast : '<span>{value}</span>',
		            // success : '<a href="#"><i class="icon checkmark-circle"></i>{value}</a>',
		            // error : '<a href="#"><i class="icon cancel-circle"></i>{value}</a></div>',
		            // info : ''
		        };

		    var _init = function(){
		        //全局只有一个实例
		        $('body').append('<div id="hxm_toast"></div>');
		        _toast = $('#hxm_toast');
		        _subscribeCloseTag();
		    }

		    /**
		     * 关闭消息提示
		     */
		    var hide = function(){
		        that.anim(_toast,'scaleOut',function(){
		            _toast.hide();
		           _toast.empty();
		        });
		    }
		    /**
		     * 显示消息提示
		     * @param type 类型  toast|success|error|info  空格 + class name 可以实现自定义样式
		     * @param text 文字内容
		     * @param duration 持续时间 为0则不自动关闭,默认为3000ms
		     */
		    var show = function(text,type,duration){
		        if(timer) clearTimeout(timer);
		        type = type || 'toast';
		        var classname = type.split(/\s/);
		        toast_type = classname[0];
		        _toast.attr('class',type).html(TEMPLATE[toast_type].replace('{value}',text)).show();
		        that.anim(_toast,'scaleIn');
		        if(duration !== 0){//为0 不自动关闭
		            timer = setTimeout(hide,duration || that.toastDuration);
		        }
		    }
		    var _subscribeCloseTag = function(){
		        _toast.on('click','[data-target="close"]',function(){
		            hide();
		        })
		    }
		    _init();
		    return {
		        show : show,
		        hide : hide
		    }
		}
    };

	var utils={};
    /**
     * dao链式调用所用对象
     * @class AjaxObj
     * @namespace utils
     */
    utils.ajaxObj = function() {
        var obj = {};

        obj.done = function(callback) {
            if (callback) this._done = callback;
            return this;
        };

        obj.fail = function(callback) {
            if (callback) this._fail = callback;
            return this;
        };

        obj.empty = function(callback) {
            if (callback) this._empty = callback;
            return this;
        };

        obj.options = {
            before: function() {},
            after: function() {}
        };

        return obj;
    };

    /**
     * 数据加载
     * 直接调用zepto的ajax请求
     * @class Ajax
     * @namespace utils
     */
    utils.ajax = {

        //POST发送数据
        post: function(url, data, type) {
            type = type || 'json';
            return $.ajax({
                url: url,
                data: data || {},
                dataType: type || 'json',
                type: 'POST'
            });
        },

        //GET请求数据
        get: function(url, data, type) {
            type = type || 'json';
            return $.ajax({
                url: url,
                cache: false,
                data: data || {},
                dataType: type || 'json',
                type: 'GET'
            });
        },

        //获得jsonp格式数据
        getJsonp:function(url,data){
            return $.ajax({
                url: url,
                type: 'GET',
                data: data || {},
                dataType: 'jsonp',
                jsonpCallback: 'callback'
            });
        }
    };
    //通用的json格式接口请求
    utils.getJsonRequest = function(url, params ,type){
    	var _this=this,
    		obj = new _this.ajaxObj(),
    		requestObj = type=='post'?_this.ajax.post(url,params):_this.ajax.get(url,params);
    	requestObj.done(function (data) {
            if (data) {
                obj._done && obj._done(data);
            } else {
                obj._empty && obj._empty();
            }
        }).fail(function () {
            obj._fail && obj._fail(data);
        })
        return obj;
    };

    $.hxmui = new HXMUI();
    $.hxmui.init=true;
    $.hxmui.Page=$.hxmui.page();
    $.hxmui.Router=$.hxmui.router();
    $.hxmui.Menu=$.hxmui.menu();
    $.hxmui.Popup=$.hxmui.popup();
    $.hxmui.Toast=$.hxmui.toast();
    $.hxmui.Transition=$.hxmui.transition();

    $(window).trigger("hxmui:preinit");
    $(window).trigger("hxmui:init");

    return $.hxmui;
 }));