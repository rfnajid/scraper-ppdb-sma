const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');

const baseUrl = 'https://01.ppdbjatim.net/pengumuman/tahap3/us/sekolah/';
const path = 'result/tahap3/sma/';
const schoolIdStart = 1;
const schoolIdEnd = 22;

for(let schoolId=schoolIdStart; schoolId<= schoolIdEnd; schoolId++){
    const url = baseUrl + schoolId;

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

    axios(url)
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
            const nilai = $(this).find('td:nth-child(4)').text();
            const url = $(this).find('td:nth-child(3) > a').attr('href');

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
                max : parseInt(students[0].nilai),
                min : parseInt(students[students.length-1].nilai)
            }
        }
        json = JSON.stringify(json);
        fs.writeFile(path + 'json/' + schoolId + '.json', json, 'utf8', () => {});
    })
    .catch(console.error);
}

let scrapeInfo = {
    time: Date(),
    baseUrl: baseUrl,
    path: path,
    schoolIdStart: schoolIdStart,
    schoolIdEnd: schoolIdEnd
}

scrapeInfo = JSON.stringify(scrapeInfo);

fs.writeFile(path + 'scrape-info.json',scrapeInfo, 'utf8', () => {
    console.log('SCRAPE INFO : ' + scrapeInfo);
});