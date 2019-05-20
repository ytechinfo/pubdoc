$(function (){
	$('.toggle-btn').on('click', function (){
		var sel = $(this);
		var toggleSelector = sel.closest('[toggle-selector]');
		
		var selectorVal = toggleSelector.attr('toggle-selector'); 
		var targetEl = $(selectorVal);

		if(targetEl.is(':visible')){
			targetEl.addClass('hidden');
		}else{
			targetEl.removeClass('hidden');
		}
	})
})

// 옵션 셋팅 값 얻기
function getDescSettingValue(){
	var opt = {};
	var fullKey = '';
	$('.option-desc-area .item-val').each(function (i , item){
		var sel = $(this);
		fullKey = '';

		var defaultVal = sel.attr('data-default')
			,selectVal = sel.val();

		if(sel.is('input[type="radio"]')){
			if(sel.is(':checked')){
				if(defaultVal != 'Y'){
					fullKey = sel.attr('data-full-key'); 
				}
			}
			selectVal = Boolean(selectVal);
		}else{
			if(sel.is('input[type="number"]')){
				selectVal = parseInt(selectVal ,10);
			}

			if(defaultVal != selectVal){
				fullKey = sel.attr('data-full-key'); 
			}
		}

		if(fullKey != ''){
			var keyArr = fullKey.split(';');

			var tmpSubObj =opt;
			for(var j =0, len = keyArr.length; j < len; j++){
				var tmpKey = keyArr[j];
				if(j+1 >= len){
					tmpSubObj[tmpKey] = selectVal;
				}else{
					if(typeof tmpSubObj[tmpKey] === 'undefined'){
						tmpSubObj[tmpKey] = {};
					}
					
					tmpSubObj = tmpSubObj[tmpKey];
				}
			}
		}
	})

	return opt;
}


function objectMerge() {
		
	var objMergeRecursive = function (dst, src) {
			
		for (var p in src) {
			if (!src.hasOwnProperty(p)) {continue;}
			
			var srcItem = src[p] ;
			if (srcItem=== undefined) {continue;}
			
			if ( typeof srcItem!== 'object' || srcItem=== null) {
				dst[p] = srcItem;
			} else if (typeof dst[p]!=='object' || dst[p] === null) {
				dst[p] = objMergeRecursive(srcItem.constructor===Array ? [] : {}, srcItem);
			} else {
				objMergeRecursive(dst[p], srcItem);
			}
		}
		return dst;
	}

	var reval = arguments[0];
	if (typeof reval !== 'object' || reval === null) {	return reval;}
	for (var i = 1, il = arguments.length; i < il; i++) {
		objMergeRecursive(reval, arguments[i]);
	}
	return reval;
}


/* exceljs ie 처리 위해 추가. */
if (!Object.assign) {
  Object.defineProperty(Object, 'assign', {
    enumerable: false,
    configurable: true,
    writable: true,
    value: function(target) {
      'use strict';
      if (target === undefined || target === null) {
        throw new TypeError('Cannot convert first argument to object');
      }
      var to = Object(target);
      for (var i = 1; i < arguments.length; i++) {
        var nextSource = arguments[i];
        if (nextSource === undefined || nextSource === null) {
          continue;
        }
        nextSource = Object(nextSource);
        var keysArray = Object.keys(Object(nextSource));
        for (var nextIndex = 0, len = keysArray.length; nextIndex < len; nextIndex++) {
          var nextKey = keysArray[nextIndex];
          var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey);
          if (desc !== undefined && desc.enumerable) {
            to[nextKey] = nextSource[nextKey];
          }
        }
      }
      return to;
    }
  });
}
// excel style 
function getHeaderStyle(type){
	var headerStyle = {
		border : {
			top: {style:'thin', color: {argb:'FFbcbcbd'}},
			left: {style:'thin', color: {argb:'FFbcbcbd'}},
			bottom: {style:'thin', color: {argb:'FFbcbcbd'}},
			right: {style:'thin', color: {argb:'FFbcbcbd'}}
		}
		,fill : {
			type: "pattern",
			pattern: "solid",
			fgColor: {
				argb: "FFF8F8F8"
			}
		}
	}
	return headerStyle[type] || {};
}
function getExcelDownload(excelInfo) {
	
	var name = excelInfo.fileName; 
	var headers = excelInfo.header;
	var workbook = new ExcelJS.Workbook();
	var worksheet = workbook.addWorksheet(name);
	
	var columns = [];
	
	for(var i =0, len = headers.length; i < len; i++){
		var headerInfo = headers[i]; 
		
		// cell 줄바꿈 처리. wrapText: true
		var cellStyle = {alignment: {wrapText: false} ,font :{  family: 4, size: 10}};
		if(headerInfo.type=='number'){
			cellStyle = {alignment: {horizontal: 'right'},numFmt:'@',font :{  family: 4, size: 10 }};
		}
		columns.push({
			key : headerInfo.key
			,header: headerInfo.label
			,width : Math.floor(headerInfo.width/6)
			,style: cellStyle
		})
	}
	worksheet.columns = columns;
	var firstRow = worksheet.getRow(1);
	firstRow.eachCell(function(cell, rowNumber) {
		cell.fill = getHeaderStyle('fill');
		cell.border = getHeaderStyle('border');
	});
	firstRow.font = { family: 4, size: 10, bold: true, color: {argb:'FF000000'} };
	firstRow.alignment = { vertical: 'middle', horizontal: 'center'};
	firstRow.height = 20;
	
	
	worksheet.addRows(excelInfo.data);
	
	var buff = workbook.xlsx.writeBuffer().then(function (data) {
		var blob = new Blob([data], {type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
		saveAs(blob, name+".xlsx");
	});
}
