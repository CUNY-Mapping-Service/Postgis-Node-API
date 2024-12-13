module.exports = function(worksheet,_data, _type){

    const shelters = _data?.bufferedProperties?.shelters;
    const facs = _data?.bufferedProperties?.facilities;
    const sheltersInDistrict = _data?.containedShelters;


    if (facs && typeof facs !== 'undefined' && facs.length && facs.length > 0) {
      for(let f=facs.length-1;f>=0;f--){
        worksheet.insertRow(8, [
          f + 1,
          facs[f].facname || '',
          facs[f].address,
          facs[f].factype,
          facs[f].capcity
        ])
      }

    }

    if (shelters && typeof shelters !== 'undefined' && shelters.length && shelters.length > 0) {
      shelters.forEach(shelter => {
        worksheet.insertRow(8, [
          'S',
          shelter.facility_name,
          shelter.address,
          shelter.facility_type,
          `${shelter.designated_units_beds_number} beds`
        ])
      });
    }
    if (sheltersInDistrict && typeof sheltersInDistrict !== 'undefined' && sheltersInDistrict.length && sheltersInDistrict.length > 0) {
      sheltersInDistrict.forEach(shelter => {
        worksheet.insertRow(8, [
          _data.processedDistricts[_data.type]?.name ? _data.processedDistricts[_data.type].name : '',
          shelter.facility_name,
          shelter.address,
          shelter.facility_type,
          `${shelter.designated_units_beds_number} beds`
        ])
      });
    }
}