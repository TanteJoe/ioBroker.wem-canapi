'use strict';

class CanApiCSVParser {

    parse(csvContent) {
        if (!csvContent) return [];

        
        return {
            id: '',
            MI: '',  //3 field in csv
            MX: '',
            OX: '',
            OS: '',
            VS: '',
            updateInterval:  '', //10 field in csv
            deviceGroupName: '',
            deviceName: '',
            pointName: '', //15 in csv
            function:  '',
            dataType:   '',
            resolution:  '',
            unit: '',
            sCov: '',
            enumValues: '',
            canWrite:    '',
            ioType:       '',            
            treePath:      '',
            label:          '',
            readHex: '',
            respbites: ''
        };
   

    }

   
}

module.exports = CanApiCSVParser;