
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
