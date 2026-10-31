const fs = require('fs');
const path = require('path');

const apiPath = path.join(__dirname, '..', 'js', 'api.js');
const serverPath = path.join(__dirname, 'server.js');

const apiContent = fs.readFileSync(apiPath, 'utf8');

// Find the seedList array in api.js
const startIndex = apiContent.indexOf('const seedList = [');
if (startIndex === -1) {
    console.error('Could not find seedList in api.js');
    process.exit(1);
}

// Find the matching closing bracket for the array
let bracketCount = 1;
let endIndex = startIndex + 'const seedList = ['.length;
while (bracketCount > 0 && endIndex < apiContent.length) {
    if (apiContent[endIndex] === '[') bracketCount++;
    else if (apiContent[endIndex] === ']') bracketCount--;
    endIndex++;
}

const seedListText = apiContent.substring(startIndex, endIndex);
console.log('Extracted seedListText length:', seedListText.length);

// Now parse the array to clean it up and assign ids
// We can use eval safely here since it is our own codebase file
let parsedList;
const cleanedText = seedListText.replace('const seedList =', 'parsedList =');
eval(cleanedText);

console.log('Parsed seedList count:', parsedList.length);

// Format seedData for server.js
const seedData = parsedList.map((item, index) => {
    return {
        id: `default-${index + 1}`,
        name: item.name,
        category: item.category,
        price: item.price,
        stock: 999, // default stock is 999
        barcode: item.barcode || null,
        unit: item.unit || null
    };
});

const formattedSeedData = 'const seedData = ' + JSON.stringify(seedData, null, 4) + ';';

// Read server.js
let serverContent = fs.readFileSync(serverPath, 'utf8');

// Find seedData inside server.js
const serverStartSeed = serverContent.indexOf('const seedData = [');
if (serverStartSeed === -1) {
    console.error('Could not find const seedData in server.js');
    process.exit(1);
}

let serverEndSeed = serverContent.indexOf('];', serverStartSeed);
if (serverEndSeed === -1) {
    console.error('Could not find closing of seedData in server.js');
    process.exit(1);
}
serverEndSeed += 2; // include ];

// Replace the seedData array in server.js
const updatedServerContent = serverContent.substring(0, serverStartSeed) + formattedSeedData + serverContent.substring(serverEndSeed);

fs.writeFileSync(serverPath, updatedServerContent, 'utf8');
console.log('Successfully updated server.js seedData with 102 items!');
