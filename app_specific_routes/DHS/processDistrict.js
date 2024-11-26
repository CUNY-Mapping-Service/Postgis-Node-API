module.exports = function (worksheet, _data) {
    const shelters = _data?.bufferedProperties?.shelters;
    const facs = _data?.bufferedProperties?.facilities;

    if (shelters.length > 0 || facs.length > 0) {
        worksheet.getCell('A1').value = `Facilities in ${_data?.processedDistricts[_data.type]?.name}`;
    }

    worksheet.getCell('B37').value = _data?.processedDistricts[_data.type]?.name;
    if (_data?.processedData?.shelter?.lastupdated && _data?.processedData?.shelter?.lastupdated.length > 0) {
        worksheet.getCell('B38').value = `Last updated on ${_data?.processedData?.shelter?.lastupdated?.split('T')[0]}`;
    }
}