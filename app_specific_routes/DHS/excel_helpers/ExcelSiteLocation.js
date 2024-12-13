/*
Site selection

dhs_template_sitelocation

This is the most common use case, when someone enters an address or clicks the map AND selects all facilities within ½ mile of the location.
*/

const ExcelBuilder = require('./ExcelBuilder');
const processAddressBufferPg1 = require('./processAddressBufferPg1');
const page2 = require('./page2');

 class ExcelSiteLocation extends ExcelBuilder{
    constructor(type,data){super(type,data)}
    build(){
        super.build();
        processAddressBufferPg1(this.worksheet1, this.data, type);
        page2(this.worksheet2, this.data, type);
    }
} 

module.exports = ExcelSiteLocation;