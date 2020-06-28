const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const papa = require('papaparse');
const { resolve } = require('path');
const { request } = require('http');
const fileDataSMK = './data/list-smk.csv';

const VAR = {
    baseUrl(type = 'umum') {
        return 'https://01.ppdbjatim.net/pengumuman/tahap3/' + type + '/sekolah/';
    },
    path(type) {
        const basePath = 'result/tahap3/smk/';
        if (type) {
            return basePath + type + '/';
        } else {
            return basePath;
        }
    },
    schools: [],
    errors:[],
    startTime: Date()
};

papa.parse(fs.readFileSync(fileDataSMK, "utf8"), {
    header: true,
    delimiter: ",",
    complete: function(results) {
        VAR.schools = results.data;
        console.log("PapaParse Finished:", VAR.schools);
    }
});

async function createRequest(schoolId, type = 'umum'){
    const url = VAR.baseUrl(type) + schoolId;
    return await axios(url, {timeout: 120*1000})
}

async function scrape(param) {

    const type = param.type;
    const schoolId = param.schoolId;
    const request = param.request;

    const url = VAR.baseUrl(type) + schoolId;
    const path = VAR.path(type);

    const csvHeader = [
        {id: 'schoolId', title: 'School ID'},
        {id: 'no', title: 'No'},
        {id: 'noUN', title: 'No UN'},
        {id: 'nama', title: 'Nama'},
        {id: 'nilai', title: 'Nilai'},
        {id: 'url', title: 'url'}
    ];

    const csvWriter = createCsvWriter({
        path: path + 'csv/' + schoolId + '.csv',
        header: csvHeader
    });

    console.log('hit ' + type + ' : ' + schoolId + ', url ' + url);

    await request.then(response => {
        const html = response.data;
        const $ = cheerio.load(html)
        const table = $('tbody > tr');
        const students = [];
        let min = 0;
        let max = 0;

        const totalData = parseInt($(this).find('.font-tipis.text-center > strong').text());

        if(totalData > 0){
            // scrape
            table.each(function (index) {
                const no = index+1;
                const noUN = $(this).find('td:nth-child(2)').text();
                const nama = $(this).find('td:nth-child(3) > a > b').text();
                const nilai = $(this).find('td:nth-child(4)').text().replace(' Meter','');
                const url = $(this).find('td:nth-child(3) > a').attr('href');

                students.push({
                    schoolId, no, noUN, nama, nilai, url
                });
            });

            min = parseInt(students[0].nilai);
            max = parseInt(students[students.length - 1].nilai);
        }

        // write csv
        csvWriter.writeRecords(students).then(
            ()=> console.log('school ' + schoolId + ' - ' + type + ' has been saved')
        );

        // write json
        let json = {
            data: students,
            info: {
                size: students.length,
                min : min,
                max : max
            }
        }
        json = JSON.stringify(json);
        fs.writeFile(path + 'json/' + schoolId + '.json', json, 'utf8', () => {});

        resolve();
    })
    .catch((error) => {
        console.log('ERROR at school ' + schoolId);
        VAR.errors.push({
            schoolId: schoolId,
            type: type,
            message: error.message
        });

        resolve();
    });
}

const requests = [];

// scrape
VAR.schools.forEach(school => {
    requests.push({
        request: createRequest(school.id, 'umum'),
        schoolId: school.id,
        type: 'umum'
    });
    requests.push({
        request: createRequest(school.id, 'inklusi'),
        schoolId: school.id,
        type: 'inklusi'
    });
});

console.log('TOTAL REQUEST : ', requests.length);

async function requestSequentially(){
    for(let i = 0; i < requests.length; i++){
         await scrape(requests[i]);
    }
}

requestSequentially().then(()=>{
    let scrapeInfo = {
        startTime: VAR.startTime,
        endTime: Date(),
        urlUmum: VAR.baseUrl('umum'),
        urlInklusi: VAR.baseUrl('inklusi'),
        errors: VAR.errors
    }

    scrapeInfo = JSON.stringify(scrapeInfo);

    fs.writeFile(VAR.path() + 'scrape-info.json',scrapeInfo, 'utf8', () => {
        console.log('SCRAPE INFO : ' + scrapeInfo);
    });
})