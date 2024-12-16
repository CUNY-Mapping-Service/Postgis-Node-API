module.exports = function (worksheet, _data, _type) {

    ///I guess this is all that needs to be done on this page
    worksheet.getCell('A1').value =
    worksheet.getCell('A1').value
    .replace('%DISTRICT%', _data?.processedDistricts[_data.type]?.name);

}