const xl = require('exceljs');
const path = require('path');
const fs = require("fs-extra");
const addMapImage = require('./addMapImage');

module.exports = class ExcelBuilder{
    constructor(templateType,data){
        console.log('constructor for ',templateType)
        this.data = data;
        this.templateType = templateType;
        this.workbook = new xl.Workbook();
        this.templateFile = path.join(__dirname, `templates/${this.templateType}.xlsx`);
        console.log('template file: ',this.templateFile)
        this.doc;
        this.worksheet1;
        this.worksheet2;
       
    }

    async init(){
        try {
            this.doc = await this.workbook.xlsx.readFile(this.templateFile);
            //console.log(this.doc)
            this.worksheet1 = this.doc.worksheets[0];
            this.worksheet2 = this.doc.worksheets[1];
       return 0
        } catch (e) {
            return -1
        }

       
    }

    build(){
        addMapImage(this.worksheet1,this.data, this.workbook);
    }

    async writeFile(){
        const _date = new Date();
        const filename = `NYCDHS_SiteLocationData_${_date.getFullYear()}-${+_date.getMonth() + 1}-${_date.getDate()}-${_date.getHours()}-${_date.getMinutes()}-${_date.getSeconds()}.xlsx`
        const outputFilename = `${process.env.EXCEL_OUTPUT}\\${filename}`
        try {
            await this.doc.xlsx.writeFile(outputFilename);
            return filename
        } catch (e) {
            return -1
        }
    }
}