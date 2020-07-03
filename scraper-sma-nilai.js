const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const { resolve } = require('path');

const VAR = {
    baseUrl: 'https://01.ppdbjatim.net/pengumuman/tahap3/us/sekolah/',
    path: 'result/tahap3/sma/',
    schoolIdStart: 1,
    schoolIdEnd: 22,
    startTime: Date(),
    errors: []
};

function scrape(schoolId) {

    const url = VAR.baseUrl + schoolId;

    const csvHeader = [
        {id: 'schoolId', title: 'School ID'},
        {id: 'no', title: 'No'},
        {id: 'noUN', title: 'No UN'},
        {id: 'nama', title: 'Nama'},
        {id: 'nilai', title: 'Nilai'},
        {id: 'url', title: 'url'}
    ];

    const csvWriter = createCsvWriter({
        path: VAR.path + 'csv/' + schoolId + '.csv',
        header: csvHeader
    });

    return axios(url)
    .then(response => {
        console.log('hit ' + schoolId + ', url ' + url);
        const html = response.data;
        const $ = cheerio.load(html)
        const table = $('tbody > tr');
        const students = [];

        // scrape
        table.each(function (index) {
            const no = index+1;
            const noUN = $(this).find('td:nth-child(2)').text();
            const nama = $(this).find('td:nth-child(3) > a > b').text();
            const url = $(this).find('td:nth-child(3) > a').attr('href');
            let nilai = $(this).find('td:nth-child(4)').text();
            nilai = parseFloat(nilai);

            students.push({
                schoolId, no, noUN, nama, nilai, url
            });
        });

        // write csv
        csvWriter.writeRecords(students).then(
            ()=> console.log('school ' + schoolId + ' has been saved')
        );

        // write json
        let json = {
            data: students,
            info: {
                size: students.length,
                max : students[0].nilai,
                min : students[students.length-1].nilai
            }
        }
        json = JSON.stringify(json);
        fs.writeFile(VAR.path + 'json/' + schoolId + '.json', json, 'utf8', () => {});

        resolve();
    })
    .catch((error) => {
        console.log('ERROR at school ' + schoolId);
        VAR.errors.push({
            schoolId: schoolId,
            message: error.message
        });

        resolve();
    });
}

const requests = [];

for(let schoolId=VAR.schoolIdStart; schoolId<= VAR.schoolIdEnd; schoolId++){
    requests.push(scrape(schoolId));
}

console.log('TOTAL REQUEST : ', requests.length);

Promise.all(requests).then(()=>{

    let scrapeInfo = {
        startTime: VAR.startTime,
        endTime: Date(),
        baseUrl: VAR.baseUrl,
        path: VAR.path,
        schoolIdStart: VAR.schoolIdStart,
        schoolIdEnd: VAR.schoolIdEnd,
        errors: VAR.errors
    }

    scrapeInfo = JSON.stringify(scrapeInfo);

    fs.writeFile(VAR.path + 'scrape-info.json',scrapeInfo, 'utf8', () => {
        console.log('SCRAPE INFO : ' + scrapeInfo);
    });
});