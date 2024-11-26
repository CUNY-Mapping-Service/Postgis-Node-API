module.exports = function(worksheet,_data, workbook){
    if(_data && _data.image && typeof _data.image !== 'undefined'){
        const imgData = workbook.addImage({
            base64: _data?.image,
            extension: 'png',
        });
    
        const imgHeight = Math.min(+_data?.imageRatio[1],545);
        const imgWidth = imgHeight * (8.5 / 11);
        worksheet.addImage(imgData, {
          tl: { col: 2.5, row: 2.5 },
          ext: { width: imgWidth, height: imgHeight }
        });
    }
}