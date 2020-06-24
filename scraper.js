const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
var fs = require('fs');

const baseUrl = 'https://01.ppdbjatim.net/pengumuman/tahap2/umum/sekolah/';
const path = 'result/tahap2/';
const schoolIdStart = 1;
const schoolIdEnd = 22;

for(let schoolId=schoolIdStart; schoolId<= schoolIdEnd; schoolId++){
    const url = baseUrl + schoolId;

    const csvHeader = [
        {id: 'schoolId', title: 'School ID'},
        {id: 'no', title: 'No'},
        {id: 'noUN', title: 'No UN'},
        {id: 'nama', title: 'Nama'},
        {id: 'jarak', title: 'Jarak'},
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
            const jarak = $(this).find('td:nth-child(4)').text().replace(' Meter','');
            const url = $(this).find('td:nth-child(3) > a').attr('href');

            students.push({
                schoolId, no, noUN, nama, jarak, url
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
                min : parseInt(students[0].jarak),
                max : parseInt(students[students.length-1].jarak)
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