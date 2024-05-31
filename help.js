const fs = require("fs");

// Read the contents of the file
fs.readFile("./CLI_Doc.txt", "utf8", (error, data) => {
  if (error) {
    console.error("❌ Error reading the help file");
    process.exit(1);
  }

  console.log(data); // Display the contents of the file
});
