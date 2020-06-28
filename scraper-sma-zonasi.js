const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const { resolve } = require('path');


const VAR = {
    baseUrl(type = 'umum') {
        return 'https://01.ppdbjatim.net/pengumuman/tahap2/' + type + '/sekolah/';
    },
    path(type) {
        const basePath = 'result/tahap2/';
        if (type) {
            return basePath + type + '/';
        } else {
            return basePath;
        }
    },
    schoolIdStart: 1,
    schoolIdEnd: 22,
    schoolInklusi: [ 8, 10 ],
    startTime: Date(),
    errors: []
};

function scrape(schoolId, type = 'umum') {
    const url = VAR.baseUrl(type) + schoolId;
    const path = VAR.path(type);

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

    return axios(url)
    .then(response => {
        console.log('hit ' + type + ' : ' + schoolId + ', url ' + url);
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
            ()=> console.log('school ' + schoolId + ' - ' + type + ' has been saved')
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

// scrape zonasi umum
for(let schoolId=VAR.schoolIdStart; schoolId<= VAR.schoolIdEnd; schoolId++){
    requests.push(scrape(schoolId,'umum'));
}

// scrape zonasi inklusi
VAR.schoolInklusi.forEach(schoolId => {
    requests.push(scrape(schoolId,'inklusi'));
});

console.log('TOTAL REQUEST : ', requests.length);

Promise.all(requests).then(() => {
    let scrapeInfo = {
        startTime: VAR.startTime,
        endTime: Date(),
        urlUmum: VAR.baseUrl('umum'),
        urlInklusi: VAR.baseUrl('inklusi'),
        schoolIdStart: VAR.schoolIdStart,
        schoolIdEnd: VAR.schoolIdEnd,
        schoolInklusi: VAR.schoolInklusi,
        errors: VAR.errors
    }

    scrapeInfo = JSON.stringify(scrapeInfo);

    fs.writeFile(VAR.path() + 'scrape-info.json',scrapeInfo, 'utf8', () => {
        console.log('SCRAPE INFO : ' + scrapeInfo);
    });
});