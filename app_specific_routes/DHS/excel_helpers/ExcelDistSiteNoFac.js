/*
District selection after selecting a site/address/click on map, but no facilities 

dhs_template_districtandsitenofacilities

This is when someone enters an address or clicks the map but does not select all facilities w/in half-mile.
*/


const ExcelBuilder = require('./ExcelBuilder');
const page1 = require('./processAddressPage1');
const page2 = require('./processAddressPage2');

class ExcelDistSiteNoFac extends ExcelBuilder{
    constructor(type,data){super(type,data)}
    build(){
        super.build();
        page1(this.worksheet1, this.data, this.type);
        page2(this.worksheet2, this.data, this.type);
    }
} 

module.exports = ExcelDistSiteNoFac;