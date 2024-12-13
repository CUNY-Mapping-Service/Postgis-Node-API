const xl = require('exceljs');
const path = require('path');
const fs = require("fs-extra");
const { type } = require('os');

const { templateTypes } = require('./excel_helpers/templateNameKeys');
const ExcelDistSiteNoFac = require('./excel_helpers/ExcelDistSiteNoFac');
const ExcelDistSiteFac = require('./excel_helpers/ExcelDistSiteFac');
const ExcelDistOnly = require('./excel_helpers/ExcelDistOnly');
const ExcelSiteLocation = require('./excel_helpers/ExcelSiteLocation');

function createBuilder(templateType,_data){
  switch(templateType){
    case templateTypes.excelDistSiteNoFac:
      console.log('creating ExcelDistSiteNoFac')
      return new ExcelDistSiteNoFac(templateType,_data);
    case templateTypes.excelDistSiteFac:
      return new ExcelDistSiteFac(templateType,_data);
    case templateTypes.excelDistOnly:
      return new ExcelDistOnly(templateType,_data);
    case templateTypes.excelSiteLocation:
      return new ExcelSiteLocation(templateType,_data);
    default:
      return -1
  }
}

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
      const _data = request.body.data;
      const templateType = _data.reportType;
      console.log('creating builder for ',templateType)
      const excelBuilder = createBuilder(templateType,_data);
      console.log('builder created')
      await excelBuilder.init();
      console.log('builder initialized')
      if(excelBuilder === -1){
          console.log(`Invalid report selection method: ${templateType}`);
          reply.send({
            "statusCode": 500,
            "error": "Internal Server Error",
            "message": `Invalid report selection method: ${templateType}`
          });
          return
      }

      try {
        excelBuilder.build();
      } catch (e) {
        console.log('Error after build');
        console.log(e);
        reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": JSON.parse(e)
        });
      }

      try {
        const filename = await excelBuilder.writeFile();
        if(filename === -1){
          console.log('Filename not returned from writeFile');
          reply.send({
            "statusCode": 500,
            "error": "Internal Server Error",
            "message": JSON.parse(e)
          });
        }
        reply.send(filename)
      } catch (e) {
        console.log('Error after writeFile');
        console.log(e);
        reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": JSON.parse(e)
        });
      }
    }
  })
  next();
}


module.exports.autoPrefix = '/v1'