/**
 * pubGrid v0.0.1
 * ========================================================================
 * Copyright 2016 ytkim
 * Licensed under MIT
 * http://www.opensource.org/licenses/mit-license.php
*/

;(function($, window, document) {
"use strict";

var _initialized = false
,_$doc = $(document)
,_datastore = {}
,_defaults = {
	fixed:false
	,drag:false
	,scrollWidth : 18	// 스크롤바 넓이
	,minWidth : 38
	,rowOptions:{
		height: 22	// cell 높이
		,click : false //row(tr) click event
		,contextMenu : false // row(tr) contextmenu event
	}
	,formatter :{
		money :{prefix :'$', suffix :'원' , fixed : 0}	// money 설정 prefix 앞에 붙일 문구 , suffix : 마지막에 뭍일것 , fixed : 소수점 
		,number : {prefix :'$', suffix :'원' , fixed : 0}
	}
	,bigData : {
		enabled: true
		,gridCount : 30		// 화면에 한꺼번에 그리드 할 데이타 gridcount * 3 이 한꺼번에 그려진다.  auto 일 경우 화면 height 체크 해서 처리 한다. 
		,spaceUnitHeight : 100000	// 그리드 공백 높이 지정
		,horizontalEnableCount : 20	// 컬럼 view 카운트. 20개 이상일경우 처리. 
	}
	,autoResize : {
		enabled:true
		,threshold :150
	}
	,resizeGridWidthFixed : true	// 리사이즈시 그리드 리사이즈 여부.
	,headerOptions : {
		view : true	// header 보기 여부
		,sort : false	// 초기에 정렬할 값
		,redraw : true	// 초기에 옵션 들어오면 새로 그릴지 여부.
		,resize:{	// resize 여부
			enabled : true
			,cursor : 'col-resize'
		}
		,colWidthFixed : false  // 넓이 고정 여부.
		,colMinWidth : 50  // 컬럼 최소 넓이
	}
	,scroll :{
		lazyLoad : false // scroll 실시간으로 로드할지 여부 (속도에 영향으줌. )
		,lazyLoadTime : 30 // scroll 로드 타임. 
	}
	,height: 200
	,tColItem : [] //head item
 	,theadGroup : [] // head group 
	,tbodyItem : []  // body item
	,tbodyGroup : [] // body group 
	,tfootItem : []  // foot item
	,page : false	// paging info
	,message : {
		emtpy : 'no data'
		,pageStatus : function (status){
			return status.currStart +' - ' + status.currEnd+' of '+ status.total;
		}
	}
}
,agt = navigator.userAgent.toLowerCase()
,_broswer = ((function (){
	if (agt.indexOf("msie") != -1) return 'msie'; 
	if (agt.indexOf("chrome") != -1) return 'chrome'; 
	if (agt.indexOf("firefox") != -1) return 'firefox'; 
	if (agt.indexOf("safari") != -1) return 'safari'; 
	if (agt.indexOf("opera") != -1) return 'opera'; 
	if (agt.indexOf("mozilla/5.0") != -1) return ',ozilla';
	if (agt.indexOf("staroffice") != -1) return 'starOffice'; 
	if (agt.indexOf("webtv") != -1) return 'WebTV'; 
	if (agt.indexOf("beonex") != -1) return 'beonex'; 
	if (agt.indexOf("chimera") != -1) return 'chimera'; 
	if (agt.indexOf("netpositive") != -1) return 'netPositive'; 
	if (agt.indexOf("phoenix") != -1) return 'phoenix'; 
	if (agt.indexOf("skipstone") != -1) return 'skipStone'; 
	if (agt.indexOf("netscape") != -1) return 'netscape'; 
})())
,_broswerVersion = ((function (){
	if(_broswer != 'msie') return -1; 
	var win = window;
	var doc = win.document;
	var input = doc.createElement ("input");
  
    if (win.ActiveXObject === undefined) return null;
    if (!win.XMLHttpRequest) return 6;
    if (!doc.querySelector){
		//_defaults.scrollWidth = 21;
		return 7;
	}
    if (!doc.addEventListener){
		//_defaults.scrollWidth = 18;
		return 8;
	}
    if (!win.atob){
		//_defaults.scrollWidth = 18;
		return 9;
	}

    if (!input.dataset){
		//_defaults.scrollWidth = 18;
		return 10;
	}
    return 11;
})());


function scrollBarSize (ele) {
	var scrollInfo = {};
    	var html =
	    '<div id="_pubGrid_scrollbar_width" style="position: absolute; top: -300px; width: 100px; height: 100px; overflow-y: scroll;">'+
	    '    <div style="height: 120px">1</div>'+
	    '</div>';
	$(ele).append(html);
	var schBarW= 100 - $('#_pubGrid_scrollbar_width > div').width();
	ele.find('#_pubGrid_scrollbar_width').remove();
	//if (_broswer == 'msie') schBarW  = schBarW / 2; // need this for IE9+
	return schBarW;
} 

var util= {
	formatter : {
		'money' : function (num , fixedNum , prefix , suffix){
			return (prefix||'')+ util.formatter.number(num, fixedNum) +(suffix||'');
		}
		,'number': function (num, fixedNum){
			fixedNum = fixedNum || 0; 
			
			if (!isFinite(num)) {
				return num;
			}
			var a = num.toFixed(fixedNum).split('.');
			a[0] = a[0].replace(/\d(?=(\d{3})+$)/g, '$&,');
			return a.join('.');


		}
		,'string' : function (val){
			return val ; 
		}
	}
}

function getHashCode (str){
    var hash = 0;
    if (str.length == 0) return hash;
    for (var i = 0; i < str.length; i++) {
        var tmpChar = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+tmpChar;
        hash = hash & hash; 
    }
    return ''+hash+'99';
}


function Plugin(element, options) {
	this._initialize(element, options);
	return this; 
}

Plugin.prototype ={
	/**
     * @method _initialize
     * @description 그리드 초기화.
     */
	_initialize :function(selector,options){
		// scroll size 
		var _this = this; 
		_this.selector = selector;

		_this.prefix = 'pub'+getHashCode(_this.selector);
		_this.gridElement = $(selector);
		
		_this.element = {};
		_this.config = {
			totGridWidth : 0
			, scrollWidth :(scrollBarSize(_this.gridElement)+1)
			, body :{height : 0,width : 0}
			, header :{height : 0, width : 0}
			, footer :{height : 0, width : 0}
			, navi :{height : 0, width : 0}
			, scroll : {top :0 , left:0, startCol:0, endCol : 0,startRow : 0, endRow :0, viewIdx : 0}
		};
		
		_this.options =$.extend(true, {}, _defaults);
		_this.setOptions(options, true);
		
		_this.drag ={};
		_this.addStyleTag();

		_this._setThead();
		_this.setData(_this.options.tbodyItem , 'init');
		
		_this.config.gridXScrollFlag = false;
		_this._windowResize();

		return this;
	}
	/**
     * @method _setGridWidth
     * @description grid 넓이 구하기
     */
	,_setGridWidth : function (mode){
		var _this = this;
		
		_this.config.body.width = _this.gridElement.innerWidth()-1; // border 값 빼주기.			
	}
	/**
     * @method setOptions
     * @description 옵션 셋팅.
     */
	,setOptions : function(options , firstFlag){
		var _this = this; 
		
		if($.isArray(options.tbodyItem)){
			delete _this.options.tbodyItem;
		}

		$.extend(true, _this.options, options);
		
		this.options.tbodyItem = options.tbodyItem ? options.tbodyItem : _this.options.tbodyItem;

		//_this.config.rowHeight = _this.options.rowOptions.height+1;	// border-box 수정. 2017-08-11
		_this.config.rowHeight = _this.options.rowOptions.height+1;

		var bigDataGridCount = 0 ; 
		if(_this.options.bigData.enabled === false){
			_this.options.bigData ={ enabled :false	,gridCount : 1000 ,spaceUnitHeight : 100000	,horizontalEnableCount : 50 };
			bigDataGridCount = _this.options.bigData.gridCount; 
		}else{
			if(_this.options.bigData.gridCount=='auto'){
				var gc = parseInt((_this.gridElement.height() / _this.options.rowOptions.height), 10 ); 
				bigDataGridCount = gc + parseInt(gc/2, 10);
			}else{
				bigDataGridCount = _this.options.bigData.gridCount;
			}
		}

		_this.config.scroll = _this.initScrollData(bigDataGridCount);
		_this.config.drawBeforeData = {}; // 이전 값을 가지고 있기 위한 객체
				
		this.config.horizontalEnabled = this.options.tColItem.length > _this.options.bigData.horizontalEnableCount ? true : false; 

		var _cb = _this.options.rowOptions.contextMenu.callback; 

		if(_this.options.rowOptions.contextMenu !== false && typeof _this.options.rowOptions.contextMenu == 'object'){
			var _cb = _this.options.rowOptions.contextMenu.callback; 
			
			if(_cb){
				_this.options.rowOptions.contextMenu.callback = function(key,sObj) {
					this.gridItem = _this.getItems(this.gridElement.attr('rowInfo'));
					_cb.call(this,key,sObj);
				}
			}
		}else{
			_this.options.rowOptions.contextMenu =false; 
		}
		_this._setGridWidth();
	}
	,initScrollData : function (gridCount){
		this.config.scroll.endCol = this.options.tColItem.length-1;
		this.config.scroll.endRow = this.options.tbodyItem.length;
		this.config.scroll.totalHeight = this.options.tbodyItem.length * this.config.rowHeight; 

		return this.config.scroll; 
	}
	/**
     * @method addStyleTag
	 * @param options {Object} - 데이타 .
     * @description  add style tab
     */
	,addStyleTag : function (){
		var _this = this
			,_d = document; 
		
		var cssStr = [];
		
		var rowOptHeight = _this.options.rowOptions.height; 
		if(!isNaN(rowOptHeight)){
			cssStr.push('#'+_this.prefix+'pubGrid .pub-body-td{height:'+rowOptHeight+'px;padding: 0px;margin:0px;}');
		}

		var styleTag = _d.createElement('style');
		
		_d.getElementsByTagName('head')[0].appendChild(styleTag);
		styleTag.setAttribute('type', 'text/css');

		if (styleTag.styleSheet) {
			styleTag.styleSheet.cssText = cssStr.join('');
		} else {
			styleTag.appendChild(document.createTextNode(cssStr.join('')));
		}
		
	}
	/**
     * @method _setThead
     * @description 헤더 label 셋팅.
     */
	,_setThead : function (){
		var _this = this
			,opt = _this.options;
			
		var tci = opt.tColItem
			,thg = opt.theadGroup
			,gridElementWidth =_this.config.body.width
			,tciItem,thgItem, rowItem, headItem
			,headGroupInfo = [],groupInfo = [], rowSpanNum = {}, colSpanNum = {};
		
		if(thg.length < 1){
			thg.push(tci);
		}
		
		var tmpThgIdx=0,tmpColIdx=0,tmpThgItem , currentColSpanIdx=0  , beforeColSpanIdx=0 ;
		var sortHeaderInfo = {};
		for(var i=0,j=0 ;i <thg.length; i++ ){
			thgItem = thg[i];
			groupInfo = [];
			tmpColIdx = 0;
			tmpThgIdx = 0;
			currentColSpanIdx=0
			colSpanNum[i] = {};
			beforeColSpanIdx = -1 ; 
			
			for(j=0; j<tci.length; j++) {
				tciItem = tci[j];
				
				if(i != 0) currentColSpanIdx = colSpanNum[i-1][j]||currentColSpanIdx; 

				//console.log('====================currentColSpanIdx : ', currentColSpanIdx)
				
				if(tmpColIdx > j || tmpThgIdx >= thgItem.length){
					headItem = {r:i,c:j,view:false};
				}else{
					headItem=thgItem[tmpThgIdx];

					tmpColIdx +=(headItem['colspan'] || 1);
					headItem['r'] = i;
					headItem['c'] = j;
					headItem['view'] = true;
					headItem['sort'] = tciItem.sort===true ? true : opt.headerOptions.sort;
					headItem['colSpanIdx'] = beforeColSpanIdx+1;
					headItem['span'] = 'scope="col"';
					headItem['label'] = headItem.label ? headItem.label : tciItem.label;
					
					if(headItem.colspan){
						headItem['colSpanIdx'] = headItem['colSpanIdx']+headItem.colspan-1;
						headItem['span'] = ' scope="colgroup" colspan="'+headItem.colspan+'" ';
						
						colSpanNum[i][j]= j+headItem.colspan; 
					}

					if(currentColSpanIdx > j){
						headItem['view'] = true;	
						tmpThgIdx +=1;
					}else{
						if(rowSpanNum[j] && rowSpanNum[j] >= i){
							headItem['view'] = false;
						}else{
							tmpThgIdx +=1;		
						}
					}
					if(headItem.rowspan){
						headItem['span'] = ' scope="col" rowspan="'+headItem.rowspan+'" ';
						rowSpanNum[j] = i+ headItem.rowspan -1;
					}
					beforeColSpanIdx = headItem['colSpanIdx'];
					
				}
				
				//console.log(j+' ;; '+rowSpanNum[j] +' : '+headItem.view, headItem);

				if(headItem.view==true){
					sortHeaderInfo[j] = {r:i,key:tciItem.key}
					groupInfo.push(headItem);
				}
			}
			headGroupInfo.push(groupInfo);
		}
		
		for(var _ikey in sortHeaderInfo){
			var tmpHgi = headGroupInfo[sortHeaderInfo[_ikey].r][_ikey]; 
			if(typeof tmpHgi ==='undefined') continue; 

			tmpHgi['isSort'] =(tmpHgi.sort===true?true:false); 
			headGroupInfo[sortHeaderInfo[_ikey].r][_ikey] = tmpHgi;
		}

		_this.config.headerInfo = headGroupInfo;

		var colWidth = Math.floor(gridElementWidth/tci.length);
		
		for(var j=0; j<tci.length; j++){
			var tciItem = opt.tColItem[j];

			//console.log(tciItem.width);

			tciItem.width = isNaN(tciItem.width) ? 0 :tciItem.width; 
			tciItem.width = Math.max(tciItem.width, opt.headerOptions.colMinWidth);
			
			tciItem['_alignClass'] = tciItem.align=='right' ? 'ar' : (tciItem.align=='center'?'ac':'al');
			opt.tColItem[j] = tciItem;

			
			_this.config.totGridWidth +=tciItem.width;
		}
		
		_this._calcElementWidth();
	}
	/**
     * @method _calcElementWidth
	 * @description width 계산.
     */
	,_calcElementWidth : function (mode){

		var _this = this
			,_containerWidth ,_w
			,gridElementWidth = _this.config.body.width
			,opt = _this.options
			,tci = opt.tColItem
			,tciLen = tci.length;

		//console.log(_this.config.totGridWidth)
		
		_w = _this.config.totGridWidth;
		_containerWidth = (_w+_this.config.scrollWidth);
		tciLen = tci.length;
		var totGridWidth = 0; 
		if( _containerWidth > gridElementWidth){
			_this.config.gridXScrollFlag = true;

			if(mode=='resize'){				
 				var remainderWidth = Math.floor((_containerWidth-gridElementWidth)/tciLen);

				for(var j=0; j<tciLen; j++){
					opt.tColItem[j].width -= remainderWidth;
					totGridWidth +=opt.tColItem[j].width;
				}
				totGridWidth =totGridWidth-opt.tColItem[tciLen-1].width;
				opt.tColItem[tciLen-1].width -=( (_containerWidth-gridElementWidth)%tciLen);
				totGridWidth +=opt.tColItem[tciLen-1].width;
			}else{
				totGridWidth = _w; 
			}
		}else{
			if(opt.headerOptions.colWidthFixed !== true){
				// 동적으로 width 계산할 경우 colwidth 처리.
				var _gw = gridElementWidth- _this.config.scrollWidth; 
				var remainderWidth = Math.floor((_gw -_w)/tciLen);

				for(var j=0; j<tciLen; j++){
					opt.tColItem[j].width += remainderWidth;
					totGridWidth +=opt.tColItem[j].width;
				}

				totGridWidth = totGridWidth-opt.tColItem[tciLen-1].width;
				opt.tColItem[tciLen-1].width +=( (_gw -_w)%tciLen);
				totGridWidth +=opt.tColItem[tciLen-1].width;
			}
		}

		_this.config.totGridWidth = totGridWidth;
		_this.config.height = opt.height;
		if(opt.height=='auto'){
			_this.config.height = _this.gridElement.height();
		}
		//console.log(_this.config.gridWidth, gridElementWidth, _w );
	}
	/**
     * @method _setTbody
	 * @description 바디 데이타 셋팅
     */
	,_setTbody : function(){
		var _this = this; 
		this.options.tbodyItem = pItem;
	}
	/**
     * @method _setTfoot
     * @description foot 데이타 셋팅
     */
	,_setTfoot : function(){
		var _this = this; 
		this.options.tfootItem = pItem;

	}
	/**
     * @method _getColGroup
	 * @param type {String} - colgroup 타입
     * @description colgroup 구하기.
     */
	,_getColGroup :function (id , type){
		var _this = this
			,opt = _this.options
			,tci = opt.tColItem
			,thiItem;
		var strHtm = [];
		var startCol =0, endCol = tci.length; 
		var bodyFlag= (type == 'body'); 
		if(bodyFlag){

			if(_this._isHorizontalCheck()){
				startCol=0;
				endCol=tci.length;
			}else{
				startCol =_this.config.scroll.startCol;
				endCol =_this.config.scroll.endCol+1;
			}
		}
		
		//console.log(this.config.horizontalEnabled , this.config.scroll.hScrollMoveFlag , startCol, endCol )

		strHtm.push('<colgroup id="'+_this.prefix+'colgroup_'+type+'">');
		
		for(var i=startCol ;i <endCol; i++){
			thiItem = tci[i];
			var tmpStyle = [];
			tmpStyle.push('width:'+thiItem.width+'px;');
			if(thiItem.hidden===true){
				tmpStyle.push('display:none;');
			}
			
			strHtm.push('<col id="'+id+i+'" style="'+tmpStyle.join('')+'" />');
		}

		strHtm.push('</colgroup>');
		
		return strHtm.join('');	
	}
	/**
     * @method setData
	 * @param data {Array} - 데이타
	 * @param gridMode {String} - 그리드 모드 
     * @description 데이타 그리기
     */
	,setData :function (pdata, gridMode){
		var _this = this
			,opt = _this.options
			,tci = opt.tColItem;
		var data = pdata;
		var pageInfo = opt.page;

		gridMode = gridMode||'reDraw';
		if(!$.isArray(pdata)){
			data = pdata.items;
			pageInfo = pdata.page; 
		}

		if(gridMode=='reDraw'){
			_this.config.scroll = _this.initScrollData(_this.options.bigData.gridCount);
			_this.config.bodyScroll.scrollTop(0);
			_this.scrollColumnPosition(0, _this.config.bodyScroll.scrollLeft());

			
			_this.config.drawBeforeData = {}; // 이전 값을 가지고 있기 위한 객체
		}

		if(data){
			_this.options.tbodyItem = data
		}

		// sort 값이 있으면 초기 데이타 정렬
		if(opt.headerOptions.sort !==false){
			var _key ='', _sortType='asc', _idx = -1;
			if(typeof opt.headerOptions.sort ==='object'){
				_key = opt.headerOptions.sort.key;
				_sortType = opt.headerOptions.sort.type=='desc'?'desc':'asc';
			}else{
				_key = opt.headerOptions.sort;
			}

			for(var i=0 ;i < tci.length ; i++){
				if(tci[i].key == _key){
					_idx = i; 
					break; 
				}
			}
			
			if(_idx != -1) _this.getSortList(_idx, _sortType);
		}
		
		_this.drawGrid(gridMode,true);

		_this.setPage(_this.options.page);
		
	}
	,setPage : function (pageInfo){
		var _this =this;

		if(pageInfo === false){
			$('#'+_this.prefix+'pubGrid-footer-wrapper').hide();
			return ; 
		}

		if(typeof pageInfo ==='object'){
			_this.pageNav(pageInfo);
		}
	}
	,initStyle : function (){
	
		var _this = this
			,opt = _this.options
			,tci = opt.tColItem
			,thiItem;

		var strCss = [];
		for(var i=0 ;i <tci.length; i++){
			thiItem = tci[i];
			var tmpStyle = [];
			tmpStyle.push('width:'+thiItem.width+'px;');
			if(thiItem.hidden===true){
				tmpStyle.push('display:none;');
			}

			strCss.push('#'+_this.prefix+'pubGrid .table-column-'+i+'{'+tmpStyle.join('')+'}');
		}

		var d = document;
        var tag = d.createElement('style');

        d.getElementsByTagName('head')[0].appendChild(tag);
        tag.setAttribute('type', 'text/css');

        if (tag.styleSheet) {
            tag.styleSheet.cssText = strCss.join('');
        } else {
            tag.appendChild(document.createTextNode(strCss.join('')));
        }
	}
	/**
     * @method getTemplateHtml
     * @description header html 
     */
	,getTemplateHtml : function (){
		var _this = this;

		return '<div id="'+_this.prefix+'pubGrid" class="pub-grid" style="overflow:hidden;">'
			+' 	<div id="'+_this.prefix+'-main" class="pub-grid-main" style="overflow:hidden;">'
			+' 		<div id="'+_this.prefix+'-header" class="pub-grid-header" style="width:'+_this.config.totGridWidth+'px;">'
			+' 			<div class="pub-grid-header-left"></div>'
			+' 			<div class="pub-grid-header-cont">'
			+'				<div class="pubGrid-header-wrapper" style="position:relative;"><table id="'+_this.prefix+'pubGrid-header" style="width:'+_this.config.totGridWidth+'px;" class="pubGrid-header" onselectstart="return false">#theaderHtmlArea#</table></div>'
			+' 			</div>'
			+' 		</div>'

			+' 		<div id="'+_this.prefix+'-body" class="pub-grid-body">'
			+' 			<div class="pub-grid-body-left"></div>'
			+' 			<div class="pub-grid-body-cont">'
			+'				<div class="pub-grid-body-tbl-wrapper" style="position:relative;"><table class="pub-grid-body-tbl" style="width:'+_this.config.totGridWidth+'px;"></table></div>'
			+'			</div>'
			+' 		</div>'
					
			+' 		<div id="'+_this.prefix+'-footer" class="pub-grid-footer">'
			+' 			<div id="pubGrid-footer-left" class="pub-grid-footer-left"></div>'
			+' 			<div id="pubGrid-footer-cont" class="pub-grid-footer-cont"></div>'
			+' 		</div>'
			
			+' 		<div id="'+_this.prefix+'-vscroll" class="pub-grid-vscroll">'
			+' 			<div class="pub-grid-vscroll-up">^</div>'
			+' 			<div class="pub-grid-vscroll-bar-area"><div class="pub-grid-vscroll-bar"></div></div>'
			+' 			<div class="pub-grid-vscroll-down">V</div>'
			+' 		</div>'
			+' 		<div id="'+_this.prefix+'-hscroll" class="pub-grid-hscroll">'
			+' 			<div class="pub-grid-hscroll-left"><</div>'
			+' 			<div class="pub-grid-hscroll-bar-area"><div class="pub-grid-hscroll-bar"></div></div>'
			+' 			<div class="pub-grid-hscroll-right">></div>'
			+' 		</div> '
			+' 	</div>'
			+' 	<div id="'+_this.prefix+'navigation" class="pub-grid-navigation"><div class="pub-grid-page-navigation"></div><div id="'+_this.prefix+'-status" class="pubgGrid-count-info"></div>'

			+' 	</div>'
			+' </div>';

	}
	//body html  만들기
	,getTbodyHtml : function(tbi, tci , itemIdx, tbodyIdx){
		var strHtm = [];
		
		if(tbi.length > 0){
			var clickFlag = false;
			var startRow = 0
				,endRow = tbi.length
				, startCol=this.config.scroll.startCol 
				, endCol=this.config.scroll.endCol
				, itemVal;
			
			var tmpVal , tbiItem, thiItem;

			for(var i =0 ; i < this.config.scroll.viewCount; i++){
				tbiItem = tbi[i];
				strHtm.push('<tr class="pub-body-tr '+((i%2==0)?'tr0':'tr1')+'" rowinfo="'+i+'">');

				for(var j=startCol ;j <=endCol; j++){
					thiItem = tci[j];
					clickFlag = thiItem.colClick;
					tmpVal = this.valueFormatter( i, thiItem,tbiItem); 
					strHtm.push('<td scope="col" class="pub-body-td '+(thiItem.hidden===true ? 'pubGrid-disoff':'')+'" data-colinfo="'+i+','+j+'"><div class="pub-content-ellipsis '+ (clickFlag?'pub-body-td-click':'') +'" title="'+tmpVal+'" >'+tmpVal+'</div></td>');
				}

				strHtm.push('</tr>');
			
			}
			//console.log('startRow : '+startRow, 'endRow : '+endRow , 'startCol : '+startCol, 'endCol : '+endCol, 'itemIdx: '+itemIdx)
			
		}else{

			
		}

		return strHtm.join('');
	}
	/**
     * @method valueFormatter
	 * @param  thiItem {Object} header col info
	 * @param  item {Object} row 값
     * @description foot 데이타 셋팅
     */
	,valueFormatter : function (_idx ,thiItem, rowItem){
		
		var type = thiItem.type || 'string';
		
		var itemVal = rowItem[thiItem.key];
		var tmpFormatter={}; 		
		if(type == 'money' || type == 'number'){
			tmpFormatter = this.options.formatter[type];
		}

		if($.isFunction(thiItem.formatter)){
			itemVal = thiItem.formatter.call(null,{idx : _idx , colInfo:thiItem, item: rowItem , formatter : function (val, fixed , prefix , suffix){
				fixed = typeof fixed ==='undefined'?tmpFormatter.fixed :fixed;
				prefix = typeof prefix ==='undefined'?tmpFormatter.prefix :prefix;
				suffix = typeof suffix ==='undefined'?tmpFormatter.suffix :suffix;
				return util.formatter[type](val, fixed ,prefix, suffix); 
			}});
		}else{
			if(type == 'money'){
				itemVal = util.formatter[type](itemVal, tmpFormatter.fixed , tmpFormatter.prefix ,tmpFormatter.suffix);
			}else if(type == 'number'){
				itemVal = util.formatter[type](itemVal , tmpFormatter.fixed , tmpFormatter.prefix ,tmpFormatter.suffix);
			}
		}

		return itemVal; 
	}
	/**
     * @method _isHorizontalCheck
     * @description 가로 스크롤 체크.
     */
	,_isHorizontalCheck : function (){
		return this.config.horizontalEnabled===true ?false : (this.config.horizontalEnabled===false && this.config.scroll.hScrollMoveFlag ===true);
	}
	/**
     * @method _setTbodyAppend
     * @description tbody 추가 , 삭제 .
     */
	,_setTbodyAppend : function (mode){
		 return ; 
		
	}
	/**
     * @method drawGrid
	 * @param  type {String} 그리드 타입.
     * @description foot 데이타 셋팅
     */
	,drawGrid : function (drawMode, unconditionallyFlag){
		var _this = this
			,opt = _this.options
			,ci = _this.config
			,tci = opt.tColItem
			,tbi = opt.tbodyItem
			,hederOpt=opt.headerOptions;

		// header html 만들기
		function theadHtml(){
			var strHtm = [];

			strHtm.push(_this._getColGroup(_this.prefix+'colHeader'));

			strHtm.push('<thead>');
			if(ci.headerInfo.length > 0 && hederOpt.view){
				var ghArr, ghItem;
			
				for(var i =0,j=0 ; i <ci.headerInfo.length; i++){
					ghArr = ci.headerInfo[i];
					strHtm.push('<tr class="pub-header-tr">');
					for(j=0 ; j <ghArr.length; j++){
						ghItem = ghArr[j];
						if(ghItem.view){
							strHtm.push('	<th '+ghItem.span+' class="'+(_this.prefix+'-htd-'+(i+'_'+j))+'" '+(ghItem.style?' style="'+ghItem.style+'" ':'')+'>');
							strHtm.push('		<div class="label-wrapper">');
							strHtm.push('			<div class="pub-header-cont outer '+(ghItem.isSort===true?'sort-header':'')+'" col_idx="'+j+'"><div class="inner"><div class="centered">'+ghItem.label+'</div></div></div>');
							strHtm.push('			<div class="pub-header-resizer" colspanidx="'+ghItem.colSpanIdx+'"></div>');
							strHtm.push('		</div>');
							strHtm.push('	</th>');
						}
					}
					strHtm.push('</tr>');
				}
			}
			strHtm.push("</thead>");
			return strHtm.join('');
		}

		function tbodyHtml(itemIdx, tbodyIdx){
			return _this.getTbodyHtml(tbi, tci, itemIdx, tbodyIdx);
		}
	
		if(drawMode =='init'){
			
			_this.gridElement.empty().html(_this.getTemplateHtml().replace('#theaderHtmlArea#',theadHtml()));
			_this.element.pubGrid = $('#'+_this.prefix +'pubGrid');
			_this.element.hidden = $('#'+_this.prefix +'hiddenArea');
			
			_this.element.main = $('#'+_this.prefix+'-main');
			_this.element.header= $('#'+_this.prefix+'-header');
			_this.element.body = $('#'+_this.prefix +'-body');
			_this.element.footer = $('#'+_this.prefix +'-footer');

			_this.element.navi = $('#'+_this.prefix+'navigation');
			_this.element.status = $('#'+_this.prefix+'-status');
			_this.element.vScrollBar = $('#'+_this.prefix+'-vscroll .pub-grid-vscroll-bar');
			_this.element.hScrollBar = $('#'+_this.prefix+'-hscroll .pub-grid-hscroll-bar');
			
			_this.setElementDimension();
			_this.calcDimension();

			// resize 설정
			_this._initHeaderEvent();
			_this._headerResize(hederOpt.resize.enabled);
			_this.scroll();
			_this._initBodyEvent();
			_this._setBodyEvent();
			_this.scrollColumnPosition(0,0);
			
			_this._statusMessage(0);

			var bodyHtm = '';
			bodyHtm +=_this._getColGroup(_this.prefix+'colbody', 'body');
			bodyHtm += '<tbody class="pub-grid-body-tbody">'+tbodyHtml(1, 0)+'</tbody>';
			
			
			$('#'+_this.prefix +'-body .pub-grid-body-tbl').empty().html(bodyHtm);

		}else{
			var itemIdx = _this.config.scroll.viewIdx;
			var viewCount = _this.config.scroll.viewCount - (_this.config.scroll.endFlag ? 1:0);


			var startCol=this.config.scroll.startCol 
				, endCol=this.config.scroll.endCol;
				

			var tbiItem , thiItem;
			for(var i =0 ; i < viewCount; i++){
				tbiItem = tbi[itemIdx];
			
				for(var j=startCol ;j <= endCol; j++){
					thiItem = tci[j];
					
					var tmpVal = this.valueFormatter( i, thiItem,tbiItem); 
					document.querySelector('[data-colinfo="'+i+','+j+'"]').innerHTML = tmpVal;
				}
				itemIdx++;
			}
		}
	}
	,setElementDimension : function (){
		this.config.header.height = this.element.header.outerHeight();
		this.config.navi.height = this.element.navi.outerHeight();
		this.config.scroll.hScrollHeight =  $('#'+this.prefix+'-hscroll').outerHeight();
		
		if(false){ //todo footer 구현시 처리. 
			this.config.footer.height = this.element.footer.outerHeight();
			this.element.footer.addClass('on');
		}
	}
	, calcDimension : function (opt){
		var _this = this; 
		
		_this.config.drawBeforeData.bodyHeight = _this.config.body.height; 


		opt = opt||{height : (_this.options.height =='auto' ? _this.gridElement.parent().height() : this.config.height )}

		opt = $.extend(true, {width : _this.gridElement.innerWidth(), height : _this.gridElement.parent().height()},opt);

		_this.config.body.width = opt.width; 
		_this.config.body.height = opt.height; 
	
		//_this.gridElement.css('width',opt.width);
		_this.gridElement.css('height',_this.config.body.height);
		_this.element.header.css('width',(_this.config.totGridWidth)+'px');
		_this.element.body.css('width',(_this.config.body.width)+'px');
		

		var mainHeight = this.config.height - this.config.navi.height;
		_this.element.main.css('height',mainHeight);

		var bodyH = mainHeight - this.config.header.height - this.config.footer.height -this.config.scroll.hScrollHeight;
		
		var barHeight = (bodyH*(bodyH/(_this.options.tbodyItem.length * _this.options.rowOptions.height)*100))/100; 

		var scrollH = $('#'+_this.prefix+'-vscroll').find('.pub-grid-vscroll-bar-area').height();
		
		if(barHeight > bodyH){
			 $('#'+_this.prefix+'-vscroll').hide();
		}else{
			$('#'+_this.prefix+'-vscroll').show();

			barHeight = barHeight < 25 ? 25 :barHeight;	

			_this.config.scroll.verticalHeight = scrollH -barHeight;
			_this.config.scroll.oneRowMove = _this.config.scroll.verticalHeight/_this.options.tbodyItem.length;
			
			$('#'+_this.prefix+'-vscroll').find('.pub-grid-vscroll-bar').css('height',barHeight);
		}

		_this.config.scroll.viewCount = Math.ceil(bodyH / this.config.rowHeight);
		_this.config.scroll.viewOverflow = bodyH % this.config.rowHeight > 0 ?true :false; 
		
		if(_this.config.body.width < _this.config.totGridWidth){
			$('#'+_this.prefix+'-hscroll').show();
			var barWidth = (_this.config.body.width*(_this.config.body.width/_this.config.totGridWidth*100))/100; 
			_this.config.scroll.horizontalWidth =$('#'+_this.prefix+'-hscroll').find('.pub-grid-hscroll-bar-area').width() - barWidth;
			$('#'+_this.prefix+'-hscroll').find('.pub-grid-hscroll-bar').css('width',barWidth);
		}else{
			$('#'+_this.prefix+'-hscroll').hide();
		}		
	}
	/**
     * @method scrollColumnPosition
	 * @param  sTop {int} scroll top value
	 * @param  sLeft {int} scroll left value
	 * @param  pType {String} scroll type
     * @description foot 데이타 셋팅
     */
	,scrollColumnPosition : function (sTop, sLeft, pType){

		if(this.options.bigData.enabled === false){
			return ;
		}

		return ; 
		
		
	}
	/**
     * @method scroll
     * @description 스크롤 컨트롤.
     */
	,scroll : function (){
		var _this = this
			,_conf = _this.config;

		$('.pub-grid-body').on('mousewheel DOMMouseScroll', function(e) {
			e.preventDefault();
			var oe = e.originalEvent;
			var delta = 0;
		
			if (oe.detail) {
				delta = oe.detail * -40;
			}else{
				delta = oe.wheelDelta;
			};
			var topVal = (delta > 0?-1:1) * _this.config.scroll.oneRowMove; //delta > 0--up
			
			_this.moveVScroll(_this.config.scroll.top+topVal)
		});

		$('.pub-grid-hscroll-bar').on('touchstart.pubhscroll mousedown.pubhscroll',function (e){
			var oe = e.originalEvent.touches;
			var ele = $(this); 
			var data = {};

			data.left = _this.config.scroll.left
			data.pageX = oe ? oe[0].pageX : e.pageX; 

			$(document).on('touchmove.pubhscroll mousemove.pubhscroll', function (e){
				_this.horizontalScroll(data, e, 'move');
			}).on('touchend.pubhscroll mouseup.pubhscroll mouseleave.pubhscroll', function (e){
				_this.horizontalScroll(data,e, 'end');
			});

			return false; 
		})

		$('.pub-grid-vscroll-bar').on('touchstart.pubvscroll mousedown.pubvscroll',function (e){
			var oe = e.originalEvent.touches;
			var ele = $(this); 
			var data = {};
			data.top= _this.config.scroll.top; 
			data.pageY = oe ? oe[0].pageY : e.pageY; 
	
			$(document).on('touchmove.pubvscroll mousemove.pubvscroll', function (e){
				_this.verticalScroll( data,e , 'move');
			}).on('touchend.pubvscroll mouseup.pubvscroll mouseleave.pubvscroll', function (e){
				_this.verticalScroll(data, e , 'end');
			});

			return false; 
		})
	}
	/**
	* 세로 스크롤
	*/
	,verticalScroll : function (data,e, type){
		var oe = e.originalEvent.touches
		,oy = oe ? oe[0].pageY : e.pageY;

		oy = data.top+(oy - data.pageY);
		
		this.moveVScroll(oy);
		if(type=='end'){
			$(document).off('touchend.pubvscroll mouseup.pubvscroll').off('touchmove.pubvscroll mousemove.pubvscroll mouseleave.pubvscroll');
		}
	}
	/**
	* 세로 스크롤 이동.
	*/
	,moveVScroll : function (topVal){

		 topVal= topVal > 0 ? (topVal >= this.config.scroll.verticalHeight ? this.config.scroll.verticalHeight : topVal) : 0 ; 

		this.config.scroll.top = topVal; 
		this.element.vScrollBar.css('top', topVal);
		

		var itemIdx = ((this.options.tbodyItem.length * this.options.rowOptions.height) *(topVal/this.config.scroll.verticalHeight* 100) /100/this.options.rowOptions.height);
		itemIdx  = Math.round(itemIdx); 
		
		var beforeEndFlag = this.config.scroll.endFlag; 
		if((itemIdx +this.config.scroll.viewCount) > this.options.tbodyItem.length){
			itemIdx = this.options.tbodyItem.length -this.config.scroll.viewCount +(this.config.scroll.viewOverflow ? 1 : 0); 
			this.config.scroll.endFlag = true; 
		}else{
			this.config.scroll.endFlag = false; 
		}

		if(this.config.scroll.endFlag){
			$('[rowinfo="'+(this.config.scroll.viewCount-1)+'"]').hide();
		}else{
			if(beforeEndFlag && !this.config.scroll.endFlag){
				$('[rowinfo="'+(this.config.scroll.viewCount-1)+'"]').show();
			}
		}
		
		if(this.config.scroll.viewIdx ==itemIdx) return ;

		this.config.scroll.viewIdx = itemIdx; 

		this.drawGrid();
	}
	/**
	* 가로 스크롤
	*/
	, horizontalScroll : function (data ,e, type){
		var oe = e.originalEvent.touches
		,ox = oe ? oe[0].pageX : e.pageX;
		ox = data.left+(ox - data.pageX);
		
		this.moveHScroll(ox);

		if(type=='end'){
			$(document).off('touchend.pubhscroll mouseup.pubhscroll').off('touchmove.pubhscroll mousemove.pubhscroll mouseleave.pubhscroll');
		}
	}
	/**
	* 가로 스크롤 이동.
	*/
	,moveHScroll : function (leftVal){
		leftVal = leftVal > 0 ? (leftVal >= this.config.scroll.horizontalWidth ? this.config.scroll.horizontalWidth : leftVal) : 0 ; 
			
		var headerLeft  = ((this.config.totGridWidth - this.config.body.width)*(leftVal/this.config.scroll.horizontalWidth*100))/100; 

		this.config.scroll.left = leftVal; 
		this.element.hScrollBar.css('left',leftVal);
		
		this.calcViewCol(headerLeft);


		this.element.header.find('.pubGrid-header-wrapper').css('left','-'+headerLeft+'px');
		this.element.body.find('.pub-grid-body-tbl-wrapper').css('left','-'+headerLeft+'px');

		this.drawGrid();
	}
	,calcViewCol : function (leftVal){
		var tci = this.options.tColItem; 
		var gridW = leftVal+this.config.body.width; 
		var itemLeftVal=0;
		var startCol = 0, endCol =tci.length;
		var startFlag = true; 
		for(var i =0 ;i <tci.length ;i++){
			var thiItem = tci[i];

			itemLeftVal +=thiItem.width; 
			
			//console.log(thiItem.width, itemLeftVal)
			if(startFlag && itemLeftVal > leftVal){
				startCol = i; 
				startFlag = false; 
				continue; 
			}

			if( itemLeftVal >=gridW){
				endCol = i; 
				break; 
			}
		}

		this.config.scroll.startCol = ( startCol > 0? startCol:0 ); 
		this.config.scroll.endCol = ( endCol >= tci.length? tci.length:endCol );
	}
	,_statusMessage : function (sTop){
		this.element.status.empty().html(this.options.message.pageStatus({
			currStart : Math.round(sTop / this.config.rowHeight)
			,currEnd : Math.floor((sTop+this.config.body.height ) / this.config.rowHeight)
			,total : this.options.tbodyItem.length
		}))
	}
	,_getScrollOverHeight : function (idx , updown){
		return idx* (this.options.bigData.gridCount)* this.config.rowHeight;
	}
	/**
     * @method resizeDraw
     * @description resize 하기
     */
	,resizeDraw :function (opt){
		var _this = this;
		
		_this.calcDimension(opt);

		return ; 

		_this.scrollColumnPosition(_this.config.bodyScroll.scrollTop(),_this.config.bodyScroll.scrollLeft());
	}
	/**
     * @method resizeEnable
     * @description resize 사용
     */
	,resizeEnable :function (){
		this._headerResize(true);
	}
	/**
     * @method resizeDisable
     * @description risize 비활성.
     */
	,resizeDisable :function (){
		this._headerResize(false);
	}
	,_windowResize :function (){
		var _this = this; 
		
		if(_this.options.autoResize ===false || _this.options.autoResize.enabled === false) return false; 
		
		var _evt = $.event,
			_special,
			resizeTimeout,
			eventName =  _this.prefix+"pubgridResize"; 

		_special = _evt.special[eventName] = {
			setup: function() {
				$( this ).on( "resize.pubGrid", _special.handler );
			},
			teardown: function() {
				$( this ).off( "resize.pubGrid", _special.handler );
			},
			handler: function( event, execAsap ) {
				// Save the context
				var context = this,
					args = arguments,
					dispatch = function() {
						// set correct event type
						event.type = eventName;
						_evt.dispatch.apply( context, args );
					};

				if ( resizeTimeout ) {
					clearTimeout( resizeTimeout );
				}

				execAsap ?
					dispatch() :
					resizeTimeout = setTimeout( dispatch, _special.threshold );
			},
			threshold: _this.options.autoResize.threshold
		};
		$(window).off(eventName);
		$(window).on(eventName, function( event ) {
			_this.resizeDraw();
		});
	}
	/**
     * @method getItems
	 * @param  idx {Integer} item index
     * @description item 값 얻기.
     */
	,getItems:function (idx){
		if(idx){
			return this.options.tbodyItem[idx]
		}else{
			return this.options.tbodyItem;
		}
	}
	/**
     * @method _initHeaderEvent
     * @description 바디 이벤트 초기화.
     */
	,_initHeaderEvent : function (){
		var _this = this
			 ,headerCol =$('#'+_this.prefix+'pubGrid-container .pub-header-cont.sort-header');
		
		var beforeClickObj; 
		//headerCol.off('click.pubGridHeader.sort');
		headerCol.on('click.pubGridHeader.sort',function (e){
			var selEle = $(this)
				,col_idx = selEle.attr('col_idx')
				,sortType = selEle.attr('sort_type');
			
			if(beforeClickObj) beforeClickObj.closest('.label-wrapper').removeClass('sortasc sortdesc');

			//.removeClass('sortasc sortdesc');
			sortType = sortType =='asc' ? 'desc' : (sortType =='desc'?'asc':'asc');
			
			// col select background col setting
			if($('#'+_this.prefix+'colbody'+col_idx).attr('data-sort-flag') != 'Y'){
				$(_this.element.body.find('col[data-sort-flag]')).css('background-color','inherit').removeAttr('data-sort-flag');
				$('#'+_this.prefix+'colbody'+col_idx).attr('data-sort-flag','Y');
				$('#'+_this.prefix+'colbody'+col_idx).css('background-color','#b9dfdc !important');
			}
			
			selEle.attr('sort_type', sortType);
			
			selEle.closest('.label-wrapper').removeClass('sortasc sortdesc').addClass('sort'+sortType);

			beforeClickObj = selEle;
		
			_this.setData(_this.getSortList(col_idx, sortType) ,'sort');
		});
	}
	/**
     * @method _initBodyEvent
     * @description 바디 이벤트 초기화.
     */
	,_initBodyEvent : function (){
		var _this = this
			 ,rowClickFlag =false; 
		
		var beforeCol; 
		_this.element.body.on('click.pubgridcol','.pub-body-td',function (e){
			var sEle = $(this)
				,selCol = sEle.attr('data-colinfo').split(',')
				,selRow = selCol[0]
				,colIdx = selCol[1]
				,selItem = _this.options.tbodyItem[selRow];
			
			if(beforeCol) beforeCol.removeClass('col-active');
			sEle.addClass('col-active');

			beforeCol = sEle; 

			if($.isFunction(_this.options.tColItem[colIdx].colClick)){
				_this.options.tColItem[colIdx].colClick.call(this,colIdx,{
					r:selRow
					,c:colIdx
					,item:selItem
				});
				return false; 
			}
		});
		
		if(_this.options.rowOptions.click !== false && typeof _this.options.rowOptions.click == 'function'){
			rowClickFlag =true; 

			var beforeRow; 
			_this.element.body.on('click.pubgridrow','.pub-body-tr',function (e){
				var selRow = $(this)
					,rowinfo=selRow.attr('rowinfo')
					,selItem = _this.options.tbodyItem[rowinfo];
				
				if(beforeRow) beforeRow.removeClass('active');

				selRow.addClass('active');
				beforeRow = selRow; 
				
				_this.options.rowOptions.click.call(selRow ,rowinfo , selItem);							
			});
		}
	}
	/**
     * @method _setBodyEvent
     * @description body event setting
     */
	,_setBodyEvent : function (){
		if(this.options.rowOptions.contextMenu !== false){
			$.pubContextMenu($('#'+this.prefix+'pubGrid-container .pub-body-tr'),this.options.rowOptions.contextMenu);
		}
	}
	/**
     * @method getSortList
	 * @param  idx {Integer} item index
	 * @param  sortType {String} 정렬 타입 ex(asc,desc)
     * @description data sorting 처리.
     */
	,getSortList :function (idx, sortType){
		var _this = this
			,opt = _this.options
			,tci = opt.tColItem
			,tbi = opt.tbodyItem;
		
		if(idx < 0 || tbi.length < 1 || idx >= tci.length){
			return [];
		}
			
		var _key = tci[idx].key;

		function getItemVal(itemObj){
			return itemObj[_key];
		}
		
		if(sortType=='asc'){  // 오름차순
			tbi.sort(function (a,b){
				var v1 = getItemVal(a)
					,v2 = getItemVal(b);
				return v1 < v2 ? -1 : v1 > v2 ? 1 : 0;
			});
		}else{
			tbi.sort(function (a,b){ // 내림차순
				var v1 = getItemVal(a)
					,v2 = getItemVal(b);
				return v1 > v2 ? -1 : v1 < v2 ? 1 : 0;
			});
		}

		return tbi; 
	}
	/**
     * @method colResize
	 * @param  flag {Boolean} resize 여부
     * @description header resize 설정
     */
	,_headerResize :function (flag){
		var _this = this
			,resizeEle = $('#'+_this.prefix+'pubGrid-header .pub-header-resizer');
		if(flag===true){
			resizeEle.css('cursor',_this.options.headerOptions.resize.cursor);
			
			resizeEle.on('touchstart.pubresizer mousedown.pubresizer',function (e){
				var oe = e.originalEvent.touches;

				_this.drag = {};
				_this.drag.pageX = oe ? oe[0].pageX : e.pageX;
				_this.drag.ele = $(this);
				_this.drag.ele.addClass('pubGrid-move-header')
				_this.drag.colspanidx = _this.drag.ele.attr('colspanidx');
				_this.drag.colHeader= $('#'+_this.prefix+'colHeader'+_this.drag.colspanidx);
				
				_this.drag.colW = _this.drag.colHeader.attr('_width')?parseInt(_this.drag.colHeader.attr('_width'),10):_this.drag.colHeader.width();
				_this.drag.gridW = _this.config.totGridWidth - _this.options.tColItem[_this.drag.colspanidx].width;
				_this.drag.gridBodyW = _this.config.body.width - _this.options.tColItem[_this.drag.colspanidx].width;
								
				// resize시 select안되게 처리 . cursor처리 
				_$doc.attr("onselectstart", "return false");
				_this.element.hidden.append("<style type='text/css'>*{cursor:" + _this.options.headerOptions.resize.cursor + "!important}</style>");

				_$doc.on('touchmove.colheaderresize mousemove.colheaderresize', function (e){
					_this.onGripDrag(e,_this);
				}).on('touchend.colheaderresize mouseup.colheaderresize mouseleave.colheaderresize', function (e){
					_this.drag.ele.removeClass('pubGrid-move-header');
					_this.onGripDragEnd(e,_this);
				});

				return false; 
			})
		}else{
			resizeEle.css('cursor','auto');
			resizeEle.off('touchstart.pubresizer mousedown.pubresizer');
		}
	}
	/**
     * @method onGripDrag
	 * @param  e {Event} 이벤트
	 * @param  _this {Object} pub그리드 this
     * @description reisze 드래그 처리.
     */
	,onGripDrag : function(e, _this) { 
		_this._setHeaderResize(e,_this, 'move');	
			
		return false
	}
	/**
     * @method onGripDragOver
	 * @param  e {Event} 이벤트
	 * @param  _this {Object} pub그리드 this
     * @description reisze 드래그 end
     */
	,onGripDragEnd : function(e,_this) {
		
		
		_$doc.removeAttr("onselectstart");_$doc.off('touchend.colheaderresize mouseup.colheaderresize').off('touchmove.colheaderresize mousemove.colheaderresize mouseleave.colheaderresize');
		_this.element.hidden.empty();
		
		_this._setHeaderResize(e,_this, 'end');
		
		_this.drag=false;

		return false; 
	}
	/**
     * @method _setHeaderResize
	 * @param  e {Event} 이벤트
	 * @param  _this {Object} pub그리드 this
	 * @param  mode {String} 그리드 모드
     * @description reisze 드래그 end
     */
	,_setHeaderResize : function (e,_this , mode){

		if (!_this.drag) return false;

		var drag = _this.drag; 
		
		var oe = e.originalEvent.touches
			,ox = oe ? oe[0].pageX : e.pageX;
		
		var w = drag.colW + (ox - drag.pageX);

		
		var minFlag = false; 
		if(mode=='end'){
			if(w <= _this.options.headerOptions.colMinWidth){
				w =_this.options.headerOptions.colMinWidth;
				minFlag =true; 
			}
			
			var totalWidth = drag.gridW+w;
			
			_this.config.totGridWidth = totalWidth; 
			_this.config.body.width = drag.gridBodyW+w; 
			_this.options.tColItem[drag.colspanidx].width = w; 
			
			drag.colHeader.css('width',w+'px');
			drag.colHeader.attr('_width',w);
			$('#'+_this.prefix+'colbody'+drag.colspanidx).css('width',w+'px');
			
			drag.ele.removeAttr('style');

			_this.calcDimension();
			
		}else{
			if(w > _this.options.headerOptions.colMinWidth){
				drag.ele.css('left',w);
			}
		}
	}
	/**
     * @method pageNav
	 * @param  options {Object} 옵션
     * @description 페이징 하기.
     */
	,pageNav : function(options) {
		var _this =this; 

		var pagingInfo = _this.getPageInfo(options.totalCount , options.currPage , options.countPerPage, options.unitPage);
		
		var currP = pagingInfo.currPage;
		if (currP == "0") currP = 1;
		var preP_is = pagingInfo.prePage_is;
		var nextP_is = pagingInfo.nextPage_is;
		var currS = pagingInfo.currStartPage;
		var currE = pagingInfo.currEndPage;
		if (currE == "0") currE = 1;
		var nextO = 1 * currP + 1;
		var preO = currP - 1;
		var strHTML = new Array();
		strHTML.push('<ul>');
		if (new Boolean(preP_is) == true) {
			strHTML.push(' <li><a href="javascript:" class="page-click" pageno="'+preO+'">&laquo;</a></li>');
		} else {
			if (currP <= 1) {
				strHTML.push(' <li class="disabled"><a href="javascript:">&laquo;</a></li>');
			} else {
				strHTML.push(' <li><a href="javascript:" class="page-click" pageno="'+preO+'">&laquo;</a></li>');
			}
		}
		var no = 0;
		for (no = currS * 1; no <= currE * 1; no++) {
			if (no == currP) {
				strHTML.push(' <li class="active"><a href="javascript:">'+ no + '</a></li>');
			} else {
				strHTML.push(' <li class="page-click" pageno="'+no+'"><a href="javascript:" >'+ no + '</a></li>');
			}
		}

		if (new Boolean(nextP_is) == true) {
			strHTML.push(' <li class="page-click" pageno="'+nextO+'"><a href="javascript:" >&raquo;</a></li>');
		} else {
			if (currP == currE) {
				strHTML.push(' <li class="disabled"><a href="javascript:">&raquo;</a></li>');
			} else {
				strHTML.push(' <li class="page-click" pageno="'+nextO+'"><a href="javascript:" >&raquo;</a></li>');
			}
		}
		strHTML.push('</ul>');
		
		$('#'+_this.prefix+'pubGrid-pageNav').addClass('page-'+(options.position || 'center'))
		$('#'+_this.prefix+'pubGrid-pageNav').empty().html(strHTML.join(''));
		
		$('#'+_this.prefix+'pubGrid-pageNav .page-click').on('click', function() {
			var pageno = $(this).attr('pageno');
			
			$('#'+_this.prefix+'pubGrid-pageNav').find('li.active').removeClass('active');
			$('#'+_this.prefix+'pubGrid-pageNav').find('[pageno="'+pageno+'"]').addClass('active');

			if (typeof options.callback == 'function') {
				options.callback(pageno);
			}
		});
		
		return this; 
	}
	/**
     * @method getPageInfo
	 * @param  totalCount {int} 총카운트
	 * @param  currPage {int} 현재 페이지
	 * @param  countPerPage {int} 한페이지에 나올 row수
	 * @param  unitPage {int} 한페이지에 나올 페이번호 갯수
     * @description 페이징 하기.
     */
	,getPageInfo : function (totalCount, currPage, countPerPage, unitPage) {
		var unitCount = 100;
		countPerPage = countPerPage || 10;
		unitPage = unitPage || 10;

		if (totalCount == 0) {
			countPerPage = unitCount;
		} else if (totalCount < countPerPage) {
			countPerPage = totalCount / unitCount * unitCount;
			if (totalCount % unitCount > 0) {
				countPerPage += unitCount;
			}
		}

		function getMaxNum( allPage, list_num) {
			if (allPage % list_num == 0) {
				return allPage / list_num;
			}
			return allPage / list_num + 1;
		}

		var totalPage = getMaxNum(totalCount, countPerPage);

		if (totalPage < currPage)
			currPage = totalPage;
		var currEndCount;
		if (currPage != 1) {
			currEndCount = currPage * countPerPage;
		} else {
			currEndCount = countPerPage;
		}

		if (currEndCount > totalCount)
			currEndCount = totalCount;
		var currStartPage;
		var currEndPage;
		
		if (totalPage <= unitPage) {
			currEndPage = totalPage;
			currStartPage = 1;
		} else {
			if(currPage < (unitPage /2)){
				currEndPage = (currPage - 1) / unitPage * unitPage + unitPage;
				currStartPage = currEndPage - unitPage + 1;
			}else{
				currEndPage = (currPage + unitPage /2);
				
				if(currEndPage > totalPage){
					currEndPage =totalPage;
				}
				currStartPage = currEndPage - unitPage + 1;
			}
		}

		if (currEndPage > totalPage)
			currEndPage = totalPage;

		var prePage=0;
		var prePage_is=false;
		if (currStartPage != 1) {
			prePage_is = true;
			prePage = currStartPage - 1;
		} 

		var nextPage=0;
		var nextPage_is =false;
		if (currEndPage != totalPage) {
			nextPage_is = true;
			nextPage = currEndPage + 1;
		}

		return  {
			'currPage' :currPage ,'unitPage' : unitPage	
			,'prePage' : prePage ,'prePage_is' : prePage_is
			,'nextPage' : nextPage,'nextPage_is' : nextPage_is
			,'currStartPage' : currStartPage ,'currEndPage' : currEndPage
			,'totalCount' : totalCount ,'totalPage' : totalPage
		};
	}
	/**
     * @method excelExport
	 * @param  opt {object} excel export 타입 ()
     * @description 해제.
     */
	,excelExport : function (opt){

		var downloadInfo =this.config.headerContainerElement.html();
		
		var cssText = '<style type="text/css">';
		cssText += opt.style || '';
        cssText += 'td {border:thin   solid #524848;border-collapse: collapse;}';
        cssText += '</style>';
		
		downloadInfo = downloadInfo.replace('<tbody></tbody>', this.getTbodyHtml(this.options.tbodyItem, this.options.tColItem,'all', 0));

		console.log(downloadInfo);
		
		downloadInfo = cssText+downloadInfo;
		if(typeof opt !=='undefined'){
			if(opt.type=='download'){
				var fileName = opt.fileName || 'pubgrid-excel-data.xls',
					charset = opt.charset||"utf-8";

				if (navigator.msSaveOrOpenBlob) {
					var _blob = new Blob([downloadInfo], { type: "text/html" });
					window.navigator.msSaveOrOpenBlob(_blob, fileName);
				} else {
					if (_broswer=='msie' && typeof Blob === "undefined") {
						
						var downloadFrame = $('<iframe id="' + this.prefix+ '-excel-export" style="display:none"></iframe>');
						$(document.body).append(downloadFrame);

						 var frmTarget =downloadFrame.get(0).contentWindow.document ; // 해당 아이프레임의 문서에 접근
				 
						frmTarget.open("text/html", "replace");
						frmTarget.write(downloadInfo);
						frmTarget.execCommand("SaveAs", true, fileName);
						frmTarget.close();
						frmTarget.charset = "utf-8";
						frmTarget.focus();
					} else {
						var uri = "data:application/vnd.ms-excel;base64,"+window.btoa(unescape(encodeURIComponent(downloadInfo)))
							,anchor = document.body.appendChild(document.createElement("a"));
						
						anchor.download = fileName;
						//anchor.href = URL.createObjectURL( blob );
						anchor.href = uri;
						anchor.click();
						document.body.removeChild(anchor);
					}
				}
			}
		}else{
			return downloadInfo; 
		}
	}
	/**
     * @method destory
     * @description 해제.
     */
	,destory:function (){
		$(window).off(this.prefix+"pubgridResize")
		delete _datastore[this.selector];
		$(this.selector).empty(); 
		//this = {};
	}
	,getDataStore :function (){
		return _datastore; 
	}
};

$.pubGrid = function (selector,options, args) {
	
	if(!selector || $(selector).length < 1){
		return '['+selector + '] selector  not found '; 
	}
	
	var _cacheObject = _datastore[selector]; 

	if(typeof options === 'undefined'){
		return _cacheObject; 
	}
	
	if(typeof _cacheObject === 'undefined'){
		_cacheObject = new Plugin(selector, options);
		_datastore[selector] = _cacheObject;
		return _cacheObject; 
	}else if(typeof options==='object'){
		var headerOpt = options.headerOptions ?options.headerOptions :{}
			,reDrawFlag = typeof headerOpt.redraw==='boolean' ? headerOpt.redraw : _cacheObject.options.headerOptions.redraw; 

		if(reDrawFlag===true){
			_cacheObject.destory();
			_cacheObject = new Plugin(selector, options);
			_datastore[selector] = _cacheObject;
		}else{
			_cacheObject.setOptions(options);
			_cacheObject.setData(_this.options.tbodyItem , 'reDraw');
		}
		return _cacheObject; 
	}

	if(typeof options === 'string'){
		var callObj =_cacheObject[options]; 
		if(typeof callObj ==='undefined'){
			return options+' not found';
		}else if(typeof callObj==='function'){
			return _cacheObject[options].apply(_cacheObject,args);
		}else {
			return typeof callObj==='function'; 
		}
	}

	return _cacheObject;	
};

}(jQuery, window, document));
