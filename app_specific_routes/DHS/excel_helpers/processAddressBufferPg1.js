module.exports = function(worksheet, _data){
    
    // const shelters = _data?.bufferedProperties?.shelters;
    // const facs = _data?.bufferedProperties?.facilities;

    // if(shelters.length > 0 || facs.length > 0){
    //     worksheet.getCell('A1').value = `Facilities and shelters within 1/2 Mile of `;
    // }
    worksheet.getCell('A1').value += `${_data?.processedData?.address}, ${_data?.processedData?.propertyDetails?.zipcode}`;
    worksheet.getCell('A2').value = '';
    worksheet.getCell('B36').value = _data?.processedData?.address || '';

    worksheet.getCell('B37').value = '';
    if(_data?.processedData?.shelter?.lastupdated && _data?.processedData?.shelter?.lastupdated.length > 0){
        worksheet.getCell('B38').value = `Last updated on ${_data?.processedData?.shelter?.lastupdated?.split('T')[0]}`;
    }else{
        worksheet.getCell('B38').value =''
    }
}