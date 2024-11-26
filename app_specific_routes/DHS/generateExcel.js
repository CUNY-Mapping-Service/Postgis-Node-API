const xl = require('exceljs');
const path = require('path');
const fs = require("fs-extra");
const { type } = require('os');
const processDistrict = require('./processDistrict');
const processAddressBuffer = require('./processAddressBuffer')

module.exports = function (fastify, opts, next) {
  const schema = {
    body: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table to use as an overlay.'
        },
      },
    }
  }
  fastify.route({
    method: 'POST',
    url: '/generateExcel',
    schema: schema,
    handler: async (request, reply) => {

      const workbook = new xl.Workbook();
      const templateFile = path.join(__dirname, 'dhs_template.xlsx')
      let doc;
      try {
        doc = await workbook.xlsx.readFile(templateFile)
      } catch (e) {
        console.log(e)
        reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": JSON.parse(e)
        });
      }

      const worksheet1 = doc.worksheets[0]
      const worksheet2 = doc.worksheets[1]

      const _data = request.body.data;
      const isDistrict = (_data?.type !== 'property' && _data?.processedDistricts && _data?.processedDistricts[_data.type] && typeof _data?.processedDistricts[_data.type] !== 'undefined');

      try {
        if (isDistrict) {
          processDistrict(worksheet1, _data);
        } else {
          processAddressBuffer(worksheet1, _data)
        }
      } catch (e) {
        console.log(e)
        reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": JSON.parse(e)
        });
      }
      try {
        addMapImage(worksheet1, _data)
      } catch (e) {
        console.log(e)
        reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": JSON.parse(e)
        });
      }

      try {
        worksheet2.getCell('A1').value = `Facilities within 1/2 Mile of ${_data.processedData?.address}, ${_data.processedData?.propertyDetails?.zipcode}, ${isDistrict ? _data?.processedDistricts[_data.type]?.name : ''}`;
        const shelters = _data?.bufferedProperties?.shelters;
        const facs = _data?.bufferedProperties?.facilities;
        const sheltersInDistrict = _data?.containedShelters;


        if (facs && typeof facs !== 'undefined' && facs.length && facs.length > 0) {
          facs.forEach((fac, idx) => {
            worksheet2.insertRow(8, [
              idx + 1,
              fac.facname || '',
              fac.address,
              fac.factype,
              fac.capcity
            ])
          })
        }

        if (shelters && typeof shelters !== 'undefined' && shelters.length && shelters.length > 0) {
          shelters.forEach(shelter => {
            worksheet2.insertRow(8, [
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
            worksheet2.insertRow(8, [
              _data.processedDistricts[_data.type]?.name ? _data.processedDistricts[_data.type].name : '',
              shelter.facility_name,
              shelter.address,
              shelter.facility_type,
              `${shelter.designated_units_beds_number} beds`
            ])
          });
        }


      } catch (e) {
        console.log(e)
        reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": JSON.parse(e)
        });
      }
      const _date = new Date();

      const filename = `NYCDHS_SiteLocationData_${_date.getFullYear()}-${+_date.getMonth() + 1}-${_date.getDate()}-${_date.getHours()}-${_date.getMinutes()}-${_date.getSeconds()}.xlsx`
      const outputFilename = `${process.env.EXCEL_OUTPUT}\\${filename}`
      try {
        await doc.xlsx.writeFile(outputFilename);
        reply.send(filename)
      } catch (e) {
        console.log(e)
      }
    }
  })
  next();
}


module.exports.autoPrefix = '/v1'