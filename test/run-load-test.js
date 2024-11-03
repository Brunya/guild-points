const { exec } = require("child_process");
const path = require("path");

const runLoadTest = () => {
  const testFile = path.join(__dirname, "load-test.yml");
  const outputFile = path.join(__dirname, `load-test-results-${Date.now()}.json`);

  console.log("Starting load test...");

  const artillery = exec(`artillery run --output ${outputFile} ${testFile}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error}`);
      return;
    }
    if (stderr) {
      console.error(`Stderr: ${stderr}`);
      return;
    }
    console.log(`Load test completed. Results saved to ${outputFile}`);

    // Generate HTML report
    exec(`artillery report ${outputFile}`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error generating report: ${error}`);
        return;
      }
      console.log("HTML report generated");
    });
  });

  artillery.stdout.on("data", (data) => {
    console.log(data.toString());
  });
};

runLoadTest();
