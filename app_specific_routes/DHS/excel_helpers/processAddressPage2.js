module.exports = function(worksheet,_data, _type){

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

    const shelters = _data?.bufferedFacilitiesAndShelters?.shelters;
    const facs = _data?.bufferedFacilitiesAndShelters?.facilities;

    if (facs && typeof facs !== 'undefined' && facs.length && facs.length > 0) {
      for(let f=facs.length-1;f>=0;f--){
        worksheet.insertRow(9, [
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
        worksheet.insertRow(9, [
          shelter.facility_cd,
          shelter.facility_name,
          shelter.address,
          shelter.facility_type,
          `${shelter.designated_units_beds_number} beds`
        ])
      });
    }
   
}