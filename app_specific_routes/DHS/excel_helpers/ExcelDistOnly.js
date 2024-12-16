/*
District selection / no site 

dhs_template_districtonly

This is when someone selects a single district from the drop-down search feature.
*/

const ExcelBuilder = require('./ExcelBuilder');
const page1 = require('./processDistrictPage1');
const page2 = require('./processDistrictPage2');

class ExcelDistOnly extends ExcelBuilder{
    constructor(type,data){super(type,data)}
    build(){
        super.build();
        page1(this.worksheet1, this.data, this.type);
        page2(this.worksheet2, this.data, this.type);
    }
} 

module.exports = ExcelDistOnly;