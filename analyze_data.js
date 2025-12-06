const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'temp_full.json');

try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const jsonData = JSON.parse(fileContent);

    if (jsonData.data && Array.isArray(jsonData.data)) {
        const lines = {};
        jsonData.data.forEach(item => {
            const line = item['호선'];
            lines[line] = (lines[line] || 0) + 1;
        });

        console.log('Line Counts:', lines);
    } else {
        console.log('Invalid JSON structure:', Object.keys(jsonData));
    }
} catch (error) {
    console.error('Error analyzing JSON:', error);
}
