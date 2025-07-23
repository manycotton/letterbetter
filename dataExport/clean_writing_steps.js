const fs = require('fs');
const path = require('path');

// Path to the redis.json file
const inputFile = path.join(__dirname, 'redis.json');
const outputFile = path.join(__dirname, 'redis_cleaned.json');

// Read the JSON file
fs.readFile(inputFile, 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }

  try {
    const redisData = JSON.parse(data);
    let modifiedCount = 0;

    // Process each key in the Redis data
    Object.keys(redisData).forEach(key => {
      if (key.startsWith('writing_step:')) {
        const stepData = redisData[key];
        if (stepData && stepData.highlightedItems) {
          // Remove originalText from each highlighted item
          stepData.highlightedItems = stepData.highlightedItems.map(item => {
            const { originalText, ...rest } = item;
            return rest;
          });
          modifiedCount++;
        }
      }
    });

    // Write the cleaned data to a new file
    fs.writeFile(outputFile, JSON.stringify(redisData, null, 2), 'utf8', (err) => {
      if (err) {
        console.error('Error writing cleaned file:', err);
        return;
      }
      console.log(`Successfully removed originalText from ${modifiedCount} writing steps.`);
      console.log(`Cleaned data saved to: ${outputFile}`);
    });

  } catch (err) {
    console.error('Error processing JSON:', err);
  }
});
