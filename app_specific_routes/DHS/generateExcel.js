const xl = require('exceljs');
const path = require('path');
const fs = require("fs-extra");
const { type } = require('os');
const processDistrictPg1 = require('./excel_helpers/processDistrictPg1');
const processAddressBufferPg1 = require('./excel_helpers/processAddressBufferPg1');
const page2 = require('./excel_helpers/page2');
const addMapImage = require('./excel_helpers/addMapImage');

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

      const worksheet1 = doc.worksheets[0];
      const worksheet2 = doc.worksheets[1];

      const _data = request.body.data;
      const isDistrict = (_data?.type !== 'property' && _data?.processedDistricts && _data?.processedDistricts[_data.type] && typeof _data?.processedDistricts[_data.type] !== 'undefined');

      try {
        if (isDistrict) {
          processDistrictPg1(worksheet1, _data);
        } else {
          processAddressBufferPg1(worksheet1, _data)
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
        addMapImage(worksheet1, _data,workbook)
      } catch (e) {
        console.log(e)
        reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": JSON.parse(e)
        });
      }

      try {
        page2(worksheet2,_data,isDistrict);
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