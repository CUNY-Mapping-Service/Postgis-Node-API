/*
District selection after selecting a site/address/click on map, but no facilities 

dhs_template_districtandsitenofacilities

This is when someone enters an address or clicks the map but does not select all facilities w/in half-mile.
*/


const ExcelBuilder = require('./ExcelBuilder');
const processAddressBufferPg1 = require('./processAddressBufferPg1');
const page2 = require('./page2');

class ExcelDistSiteNoFac extends ExcelBuilder{
    constructor(type,data){super(type,data)}
    build(){
        super.build();
        processAddressBufferPg1(this.worksheet1, this.data, type);
        page2(this.worksheet2, this.data, type);
    }
} 

module.exports = ExcelDistSiteNoFac;