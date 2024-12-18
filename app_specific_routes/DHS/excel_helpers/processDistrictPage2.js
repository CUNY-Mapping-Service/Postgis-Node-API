module.exports = function(worksheet,_data, _type){
  worksheet.getCell('A1').value =
  worksheet.getCell('A1').value
  .replace('%DISTRICT%', _data?.processedDistricts[_data.type]?.name);
  
    const sheltersInDistrict = _data?.sheltersContainedInDistrict;

    if (sheltersInDistrict && typeof sheltersInDistrict !== 'undefined' && sheltersInDistrict.length && sheltersInDistrict.length > 0) {
      sheltersInDistrict.forEach(shelter => {
        worksheet.insertRow(8, [
          _data.processedDistricts[_data.type]?.name ? _data.processedDistricts[_data.type].name : '',
          shelter.facility_cd,
          shelter.address,
          shelter.facility_type,
          `${shelter.designated_units_beds_number} beds`
        ])
      });
    }
}