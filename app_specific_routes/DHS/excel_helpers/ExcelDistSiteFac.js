/*
District selection after selecting a site/address/click on map and choosing facilities w/in half-mile

dhs_template_districtandsiteyesfacilities

This is a subset of the first bullet point, but instead of selecting PRINT under Property Info, 
they select PRINT from one of the selected districts.
*/

const ExcelBuilder = require('./ExcelBuilder');
const processDistrictPg1 = require('./processDistrictPg1');
const page2 = require('./page2');

class ExcelDistSiteFac extends ExcelBuilder{
    constructor(type,data){super(type,data)}
    build(){
        super.build();
        processDistrictPg1(this.worksheet1, this.data, type);
        page2(this.worksheet2, this.data, type);
    }
} 

module.exports = ExcelDistSiteFac;