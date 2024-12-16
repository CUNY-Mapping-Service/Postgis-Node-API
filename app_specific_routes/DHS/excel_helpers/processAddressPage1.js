module.exports = function(worksheet, _data){
    const boroughCodesToNames = {
        'QN': 'Queens',
        'MN': 'Manhattan',
        'BK': 'Brooklyn',
        'BX': 'Bronx',
        'SI': 'Staten Island'
    }

    const boroughName = boroughCodesToNames[_data?.processedPropertyData?.propertyDetails?.borough];
    
    worksheet.getCell('A1').value = 
    worksheet.getCell('A1').value
    .replace('%ADDRESS%', _data?.processedPropertyData?.address)
    .replace('%BOROUGH%', boroughName)

    worksheet.getCell('B35').value =
    worksheet.getCell('B35').value.replace('%ADDRESS%', _data?.processedPropertyData?.address)
    .replace('%BOROUGH%', boroughName)


    if(_data?.processedPropertyData?.shelter?.lastupdated && _data?.processedPropertyData?.shelter?.lastupdated.length > 0){
        worksheet.getCell('B37').value = 
        worksheet.getCell('B37').value
        .replace('%DATE%',`${_data?.processedPropertyData?.shelter?.lastupdated?.split('T')[0]}`);
    }else{
        worksheet.getCell('B37').value =''
    }
}