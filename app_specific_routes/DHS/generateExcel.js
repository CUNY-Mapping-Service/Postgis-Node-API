const xl = require('exceljs');
const path = require('path');
const fs = require("fs-extra");

const schema = {
    body: {
      type: 'object',
      properties: {
        table: {
        type: 'string',
        description: 'Table to use as an overlay.'
      },
      },
     // required: ['name']
    }
  }

module.exports = function (fastify, opts, next) {
fastify.route({
  method: 'POST',
  url: '/generateExcel',
  schema: schema,
  handler: async (request, reply) => {

    const workbook = new xl.Workbook();
    const templateFile = path.join(__dirname, 'dhs_template.xlsx')
    let doc;

    try{
          doc = await workbook.xlsx.readFile(templateFile)
    }catch(e){
      console.log(e)
      reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": JSON.parse(e)
        });

      return;
    }

    const worksheet1 = doc.worksheets[0]
    const worksheet2 = doc.worksheets[1]
    //////////////////////////////////////////
    const _data = request.body.data;

    worksheet1.getCell('A1').value = `Facilities within 1/2 Mile of ${_data.processedData.address}`;
     worksheet1.getCell('B36').value = _data.processedData.address;
      worksheet1.getCell('B37').value = _data.processedDistricts[_data.type] ? _data.processedDistricts[_data.type].name : '';

   ///////////////////////////////////////////
    const imgData = workbook.addImage({
        base64: _data.image,
        extension: 'png',
    });

    worksheet1.addImage(imgData, 'B3:J25');
    ////////////////////////////////////////////////
    worksheet2.getCell('A1').value = `Facilities within 1/2 Mile of ${_data.processedData.address},${_data.processedDistricts[_data.type] ? _data.processedDistricts[_data.type].name : ''}`;
      const shelters = _data.bufferedProperties?.shelters;
      const facs = _data.bufferedProperties?.facilities;

      if(facs && facs.length && shelters.length > 0){
        facs.forEach(fac=>{
        worksheet2.insertRow(8,[
            '',
            fac.properties.facname || '',
            `${fac.properties.address || ''} ${fac.properties.city || ''} NY ${fac.properties.zipcode || ''}`,
            fac.properties.factype,
            `${fac.properties.capcity > 0 ? fac.properties.capcity+fac.properties.captypedescrip:''}`
          ])
        })
      }

      if(shelters && shelters.length && shelters.length > 0){
        shelters.forEach(shelter => {
          worksheet2.insertRow(8,[
            'S',
            shelter.properties.facility_name,
            `${shelter.properties.address_line1}, ${shelter.properties.city}, NY ${shelter.properties.zip}`,
            shelter.properties.facility_type,
            `${shelter.properties.designated_units_beds_number} beds`
          ])
        });
      }

      const _date = Date.now();
      const filename = `NYCDHS_SiteLocationData_${_date}.xlsx`
      const outputFilename = `${process.env.EXCEL_OUTPUT}\\${filename}`

      try{
          await doc.xlsx.writeFile(outputFilename);
          reply.send(filename)
      }catch(e){
        console.log(e)
      }
  }
})
next();
}


module.exports.autoPrefix = '/v1'