const fs = require('fs');

const destinations = JSON.parse(fs.readFileSync('D:/Travel-Weather-Website/data/destinations.json', 'utf8'));
const districts = JSON.parse(fs.readFileSync('D:/Travel-Weather-Website/data/districts.json', 'utf8'));

// Analyze existing destinations by district
const existingByDistrict = {};
destinations.forEach(d => {
    const dist = d.district;
    if (!existingByDistrict[dist]) existingByDistrict[dist] = [];
    existingByDistrict[dist].push(d.id);
});

console.log('=== Existing destinations by district ===');
Object.keys(existingByDistrict).sort().forEach(dist => {
    const ids = existingByDistrict[dist];
    console.log(`${dist}: ${ids.length} - ${ids.join(', ')}`);
});

console.log('\n=== Districts with 0 destinations ===');
districts.forEach(dist => {
    if (dist.destinationCount === 0) {
        console.log(`  ${dist.name} (${dist.division})`);
    }
});

console.log('\n=== Total destinations:', destinations.length);
console.log('Total districts:', districts.length);

// Check for duplicates
const ids = destinations.map(d => d.id);
const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
if (duplicates.length > 0) {
    console.log('\n=== DUPLICATE IDs:', duplicates, '===');
} else {
    console.log('\n=== No duplicate IDs ===');
}

// Check coordinates
const invalidCoords = [];
destinations.forEach(d => {
    const lat = d.latitude;
    const lng = d.longitude;
    if (lat === undefined || lat === null || lng === undefined || lng === null) {
        invalidCoords.push(`${d.id}: missing coords`);
    } else if (typeof lat !== 'number' || typeof lng !== 'number') {
        invalidCoords.push(`${d.id}: invalid type`);
    } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        invalidCoords.push(`${d.id}: out of range ${lat},${lng}`);
    }
});

if (invalidCoords.length > 0) {
    console.log('\n=== INVALID COORDINATES:', invalidCoords, '===');
} else {
    console.log('\n=== All coordinates valid ===');
}

// Check required fields
const missingFields = [];
destinations.forEach(d => {
    ['id', 'name', 'district', 'division', 'category', 'latitude', 'longitude', 'shortDescription'].forEach(field => {
        if (!d[field]) missingFields.push(`${d.id}: missing ${field}`);
    });
});
if (missingFields.length > 0) {
    console.log('\n=== MISSING FIELDS:', missingFields, '===');
} else {
    console.log('\n=== All required fields present ===');
}