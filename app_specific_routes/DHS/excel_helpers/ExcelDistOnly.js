/*
District selection / no site 

dhs_template_districtonly

This is when someone selects a single district from the drop-down search feature.
*/

const ExcelBuilder = require('./ExcelBuilder');
const processDistrictPg1 = require('./processDistrictPg1');
const page2 = require('./page2');

class ExcelDistOnly extends ExcelBuilder{
    constructor(type,data){super(type,data)}
    build(){
        super.build();
        processDistrictPg1(this.worksheet1, this.data, type);
        page2(this.worksheet2, this.data, type);
    }
} 

module.exports = ExcelDistOnly;