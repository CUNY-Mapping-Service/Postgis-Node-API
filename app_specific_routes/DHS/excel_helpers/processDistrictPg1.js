module.exports = function (worksheet, _data) {
    console.log('district page 1')
    const shelters = _data?.bufferedProperties?.shelters;
    const facs = _data?.bufferedProperties?.facilities;

    if (shelters.length > 0 || facs.length > 0) {
        worksheet.getCell('A1').value = `Facilities in ${_data?.processedDistricts[_data.type]?.name}`;
    }else{
        worksheet.getCell('A1').value = _data?.processedDistricts[_data.type]?.name;
    }

    worksheet.getCell('A2').value = '';

    if (_data?.processedData?.address || _data?.processedDistricts[_data.type]?.name) {
        worksheet.getCell('B36').value = _data?.processedData?.address || '';
        worksheet.getCell('B37').value = _data?.processedDistricts[_data.type]?.name || '';
    } else {
        worksheet.getCell('B36').value = ''
    }

    if (_data?.processedData?.shelter?.lastupdated && _data?.processedData?.shelter?.lastupdated.length > 0) {
        worksheet.getCell('B38').value = `Last updated on ${_data?.processedData?.shelter?.lastupdated?.split('T')[0]}`;
    }else{
        worksheet.getCell('B38').value =''
    }
}