/*
Site selection

dhs_template_sitelocation

This is the most common use case, when someone enters an address or clicks the map AND selects all facilities within ½ mile of the location.
*/

const ExcelBuilder = require('./ExcelBuilder');
const page1 = require('./processAddressPage1');
const page2 = require('./processAddressPage2');

 class ExcelSiteLocation extends ExcelBuilder{
    constructor(type,data){super(type,data)}
    build(){
        super.build();
        page1(this.worksheet1, this.data, this.type);
        page2(this.worksheet2, this.data, this.type);
    }
} 

module.exports = ExcelSiteLocation;